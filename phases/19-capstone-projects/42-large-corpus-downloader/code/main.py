"""支持断点续传、MinHash + LSH 去重及分片清单的流式语料下载器。

从 URL 列表获取压缩分片，通过 Zstandard 流式解压器逐行读取文档，
用 MinHash 计算指纹，再以局部敏感哈希（LSH）分桶，丢弃近似重复项，
最后为语料写出清单。

末尾演示在磁盘上生成小型合成语料，以 Zstandard 压缩，通过 file URL
交给本模块读取，并打印清单摘要。运行：python3 code/main.py

译注：原文将输入称为 JSONL，但演示实际写入普通文本行，迭代器也不解析
JSON 对象。去重仅记录保留／重复判定，并未另外写出只含保留文档的语料。
示例使用本地文件，不验证真实 HTTP 服务的续传行为。语料中的英文参与
指纹和去重计算，保持原值；其中关于“唯一安全的检查点写入顺序”的句子
只是测试文本，不是可靠性保证。错误消息同样保留英文契约。
"""

from __future__ import annotations

import dataclasses
import hashlib
import io
import json
import os
import struct
import sys
import tempfile
import time
import urllib.parse
import urllib.request
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Callable, Iterable, Iterator

try:
    import zstandard as zstd
except ImportError as exc:
    raise SystemExit(
        # 本课需要 zstandard；安装命令：pip install zstandard。
        "zstandard is required for this lesson. Install with: pip install zstandard"
    ) from exc


CHUNK_BYTES = 1 << 16
DEFAULT_NUM_HASHES = 128
DEFAULT_BANDS = 32
DEFAULT_SHINGLE_WIDTH = 5
MAX_UINT64 = (1 << 64) - 1
MERSENNE_PRIME = (1 << 61) - 1


@dataclass
class ShardPlan:
    """计划分片列表中的一行。"""

    shard_id: str
    url: str
    expected_size: int | None = None


@dataclass
class ShardResult:
    """单个分片的下载和去重结果。"""

    shard_id: str
    url: str
    raw_bytes: int
    decompressed_bytes: int
    document_count: int
    kept_count: int
    duplicate_count: int
    sha256: str

    def to_manifest_row(self) -> dict[str, object]:
        return asdict(self)


@dataclass
class DocVerdict:
    """单个文档的去重判定。"""

    shard_id: str
    doc_index: int
    verdict: str  # "keep" 表示保留，"near_duplicate" 表示近似重复
    collided_with: str | None = None  # 被保留文档的 "shard:doc" 标识


@dataclass
class CheckpointState:
    """持久化在分片旁的续传检查点。"""

    url: str
    verified_bytes: int
    expected_size: int | None
    sha256_prefix_hex: str

    def to_json(self) -> str:
        return json.dumps(asdict(self), sort_keys=True)

    @classmethod
    def from_json(cls, text: str) -> "CheckpointState":
        data = json.loads(text)
        return cls(
            url=str(data["url"]),
            verified_bytes=int(data["verified_bytes"]),
            expected_size=(int(data["expected_size"]) if data.get("expected_size") is not None else None),
            sha256_prefix_hex=str(data["sha256_prefix_hex"]),
        )


def _hash_seed_pair(seed: int) -> tuple[int, int]:
    """从种子派生两个 64 位系数 (a, b)。

    签名使用形如 ((a * x + b) mod p) mod 2^64 的通用哈希。
    两个系数由种子确定性生成，使同一组哈希函数可跨运行和机器复现。
    """

    digest = hashlib.blake2b(seed.to_bytes(8, "little"), digest_size=16).digest()
    a = int.from_bytes(digest[:8], "little") | 1  # 确保 a 非零
    b = int.from_bytes(digest[8:], "little")
    return a, b


class MinHasher:
    """使用固定哈希种子族构造 MinHash 签名。"""

    def __init__(self, num_hashes: int = DEFAULT_NUM_HASHES, shingle_width: int = DEFAULT_SHINGLE_WIDTH) -> None:
        if num_hashes <= 0:
            # 哈希函数数量必须为正数。
            raise ValueError("num_hashes must be positive")
        if shingle_width <= 0:
            # 词元片段宽度必须为正数。
            raise ValueError("shingle_width must be positive")
        self.num_hashes = num_hashes
        self.shingle_width = shingle_width
        self._coefficients: list[tuple[int, int]] = [_hash_seed_pair(i) for i in range(num_hashes)]

    def shingles(self, text: str) -> list[str]:
        """按空白分词，返回相互重叠的词元片段（shingle）。"""

        tokens = text.split()
        if len(tokens) < self.shingle_width:
            return [" ".join(tokens)] if tokens else []
        shingles: list[str] = []
        for start in range(len(tokens) - self.shingle_width + 1):
            shingles.append(" ".join(tokens[start : start + self.shingle_width]))
        return shingles

    @staticmethod
    def _hash_shingle(shingle: str) -> int:
        digest = hashlib.blake2b(shingle.encode("utf-8"), digest_size=8).digest()
        return int.from_bytes(digest, "little")

    def signature(self, text: str) -> list[int]:
        """返回由 num_hashes 个 64 位整数组成的 MinHash 签名。"""

        shingles = self.shingles(text)
        if not shingles:
            return [MAX_UINT64] * self.num_hashes
        shingle_hashes = [self._hash_shingle(s) for s in shingles]
        sig: list[int] = []
        for a, b in self._coefficients:
            best = MAX_UINT64
            for h in shingle_hashes:
                candidate = ((a * h + b) % MERSENNE_PRIME) & MAX_UINT64
                if candidate < best:
                    best = candidate
            sig.append(best)
        return sig


class LSHIndex:
    """面向 MinHash 签名的局部敏感哈希索引。

    将每个签名分成 bands 个带，每带含 rows = num_hashes / bands 行。
    两个签名只要有一个带完全相同，就视为发生碰撞。在理想的 MinHash
    概率模型下，碰撞概率为 1 - (1 - s^r)^b，其中 s 为 Jaccard 相似度；
    概率曲线在 s = (1/b)^(1/r) 附近较陡。(b=32, r=4) 时约为 0.42，
    (b=20, r=5) 时约为 0.55。

    译注：这里只根据带碰撞选择候选，不再核验真实 Jaccard 相似度，
    不能把该近似阈值当作每个文档对必然满足的去重界限。
    """

    def __init__(self, num_hashes: int, bands: int = DEFAULT_BANDS) -> None:
        if bands <= 0 or num_hashes % bands != 0:
            # 带数 bands 必须整除签名长度 num_hashes。
            raise ValueError(f"bands ({bands}) must divide num_hashes ({num_hashes})")
        self.num_hashes = num_hashes
        self.bands = bands
        self.rows = num_hashes // bands
        self._buckets: list[dict[bytes, list[str]]] = [{} for _ in range(bands)]
        self._signatures: dict[str, list[int]] = {}

    @staticmethod
    def _band_key(band: list[int]) -> bytes:
        return hashlib.blake2b(b"".join(struct.pack("<Q", v) for v in band), digest_size=16).digest()

    def query(self, signature: list[int]) -> str | None:
        """返回与之近似重复的已保留文档 ID；未命中时返回 None。"""

        for i in range(self.bands):
            band = signature[i * self.rows : (i + 1) * self.rows]
            key = self._band_key(band)
            bucket = self._buckets[i].get(key)
            if bucket:
                return bucket[0]
        return None

    def insert(self, doc_id: str, signature: list[int]) -> None:
        self._signatures[doc_id] = signature
        for i in range(self.bands):
            band = signature[i * self.rows : (i + 1) * self.rows]
            key = self._band_key(band)
            self._buckets[i].setdefault(key, []).append(doc_id)

    def jaccard_estimate(self, doc_a: str, doc_b: str) -> float:
        """用两个已索引文档的签名一致比例估计 Jaccard 相似度。

        原文称其为无偏估计；该性质依赖 MinHash 的理想哈希假设，
        本例未证明所用有限哈希族满足所有相关条件。
        """

        sig_a = self._signatures[doc_a]
        sig_b = self._signatures[doc_b]
        agree = sum(1 for a, b in zip(sig_a, sig_b) if a == b)
        return agree / self.num_hashes


class Dedup:
    """组合 MinHasher 与 LSHIndex，实现逐文档去重。"""

    def __init__(self, hasher: MinHasher, index: LSHIndex) -> None:
        self.hasher = hasher
        self.index = index

    def evaluate(self, shard_id: str, doc_index: int, text: str) -> DocVerdict:
        sig = self.hasher.signature(text)
        keeper = self.index.query(sig)
        if keeper is not None:
            return DocVerdict(
                shard_id=shard_id,
                doc_index=doc_index,
                verdict="near_duplicate",
                collided_with=keeper,
            )
        doc_id = f"{shard_id}:{doc_index}"
        self.index.insert(doc_id, sig)
        return DocVerdict(shard_id=shard_id, doc_index=doc_index, verdict="keep")


class ZstdDocIterator:
    """从 Zstandard 压缩字节流逐行读取文档。

    用 Zstandard 流读取器包装上游输入，每行视为一个文档。
    解压器增量消费上游，不会一次缓存整个分片；但单行文本仍需完整读取。
    原文称这些行为 JSONL；本类并不执行 JSON 解析。
    """

    def __init__(self, raw_reader: io.RawIOBase | io.BufferedIOBase) -> None:
        self._dctx = zstd.ZstdDecompressor()
        self._stream = self._dctx.stream_reader(raw_reader)
        self._text = io.TextIOWrapper(self._stream, encoding="utf-8", newline="")

    def __iter__(self) -> Iterator[str]:
        for line in self._text:
            line = line.rstrip("\n")
            if line:
                yield line


class StreamingDownloader:
    """将 URL 内容流式写入本地路径，支持 Range 续传与检查点。

    每个数据块都会推进哈希和字节计数，并通过原子替换更新检查点。
    检查点保存已记录前缀的 SHA-256；恢复前会重新检查文件长度和哈希，
    避免在不匹配的部分文件上静默续传。

    译注：当前顺序是先写检查点，再写数据并 flush，未调用 fsync。
    崩溃后若检查点领先于文件，校验将失败并重新下载；这不是无损恢复
    或断电持久性保证。expected_size 只被记录，没有用于完成校验；
    文件哈希也未与可信发布方的摘要比较。
    """

    def __init__(
        self,
        cache_dir: Path,
        opener: Callable[[urllib.request.Request], object] | None = None,
        chunk_bytes: int = CHUNK_BYTES,
    ) -> None:
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self.chunk_bytes = chunk_bytes
        self._opener = opener or urllib.request.urlopen

    def _paths_for(self, shard_id: str) -> tuple[Path, Path]:
        shard_path = self.cache_dir / f"{shard_id}.zst"
        checkpoint_path = self.cache_dir / f"{shard_id}.partial.json"
        return shard_path, checkpoint_path

    def _read_checkpoint(self, checkpoint_path: Path) -> CheckpointState | None:
        if not checkpoint_path.exists():
            return None
        try:
            return CheckpointState.from_json(checkpoint_path.read_text("utf-8"))
        except (json.JSONDecodeError, KeyError, ValueError):
            return None

    def _write_checkpoint(self, checkpoint_path: Path, state: CheckpointState) -> None:
        tmp = checkpoint_path.with_suffix(".json.tmp")
        tmp.write_text(state.to_json(), encoding="utf-8")
        os.replace(tmp, checkpoint_path)

    def _verify_partial(self, shard_path: Path, state: CheckpointState) -> bool:
        if not shard_path.exists():
            return False
        actual_size = shard_path.stat().st_size
        if actual_size != state.verified_bytes:
            return False
        hasher = hashlib.sha256()
        with shard_path.open("rb") as fh:
            remaining = state.verified_bytes
            while remaining > 0:
                buf = fh.read(min(self.chunk_bytes, remaining))
                if not buf:
                    return False
                hasher.update(buf)
                remaining -= len(buf)
        return hasher.hexdigest() == state.sha256_prefix_hex

    def download(self, plan: ShardPlan) -> ShardResult:
        parsed = urllib.parse.urlparse(plan.url)
        if parsed.scheme not in {"http", "https", "file"}:
            raise ValueError(
                # URL 协议仅允许 http、https 或 file；其他值按原错误契约拒绝。
                f"unsupported URL scheme {parsed.scheme!r} for shard {plan.shard_id}"
            )
        shard_path, checkpoint_path = self._paths_for(plan.shard_id)
        state = self._read_checkpoint(checkpoint_path)
        resume_from = 0
        rolling = hashlib.sha256()
        if state is not None and state.url == plan.url and self._verify_partial(shard_path, state):
            resume_from = state.verified_bytes
            with shard_path.open("rb") as fh:
                remaining = resume_from
                while remaining > 0:
                    buf = fh.read(min(self.chunk_bytes, remaining))
                    if not buf:
                        break
                    rolling.update(buf)
                    remaining -= len(buf)
        else:
            if shard_path.exists():
                shard_path.unlink()
            if checkpoint_path.exists():
                checkpoint_path.unlink()

        request = urllib.request.Request(plan.url)
        if resume_from > 0:
            request.add_header("Range", f"bytes={resume_from}-")
        response = self._opener(request)
        try:
            if resume_from > 0:
                status = int(getattr(response, "status", 0) or 0)
                headers = getattr(response, "headers", None)
                content_range = ""
                if headers is not None:
                    content_range = str(headers.get("Content-Range", "") or "")
                if status != 206 or not content_range.startswith(f"bytes {resume_from}-"):
                    # 服务端忽略了 Range 请求头，或错误报告了其范围。
                    # 先关闭部分响应，再重新发起完整 GET，
                    # 然后才能触碰分片文件或读取响应体。
                    try:
                        response.close()
                    except Exception:
                        pass
                    resume_from = 0
                    rolling = hashlib.sha256()
                    if shard_path.exists():
                        shard_path.unlink()
                    if checkpoint_path.exists():
                        checkpoint_path.unlink()
                    response = self._opener(urllib.request.Request(plan.url))
            mode = "ab" if resume_from > 0 else "wb"
            with shard_path.open(mode) as out:
                while True:
                    buf = response.read(self.chunk_bytes)
                    if not buf:
                        break
                    rolling.update(buf)
                    next_verified = resume_from + len(buf)
                    new_state = CheckpointState(
                        url=plan.url,
                        verified_bytes=next_verified,
                        expected_size=plan.expected_size,
                        sha256_prefix_hex=rolling.hexdigest(),
                    )
                    self._write_checkpoint(checkpoint_path, new_state)
                    out.write(buf)
                    out.flush()
                    resume_from = next_verified
        finally:
            close = getattr(response, "close", None)
            if callable(close):
                close()

        decompressed_bytes = 0
        document_count = 0
        with shard_path.open("rb") as fh:
            dctx = zstd.ZstdDecompressor()
            reader = dctx.stream_reader(fh)
            while True:
                chunk = reader.read(self.chunk_bytes)
                if not chunk:
                    break
                decompressed_bytes += len(chunk)
                document_count += chunk.count(b"\n")

        return ShardResult(
            shard_id=plan.shard_id,
            url=plan.url,
            raw_bytes=resume_from,
            decompressed_bytes=decompressed_bytes,
            document_count=document_count,
            kept_count=0,
            duplicate_count=0,
            sha256=rolling.hexdigest(),
        )


class ShardPlanner:
    """将 URL 列表转换为计划分片列表。"""

    @staticmethod
    def from_urls(urls: Iterable[str]) -> list[ShardPlan]:
        plans: list[ShardPlan] = []
        for index, url in enumerate(urls):
            shard_id = f"shard-{index:04d}"
            plans.append(ShardPlan(shard_id=shard_id, url=url))
        return plans


class ManifestWriter:
    """收集分片结果，生成带有自身内容哈希的清单。

    .lock 文件只保存清单摘要，不是互斥锁或防篡改签名。
    """

    def __init__(self) -> None:
        self._rows: list[dict[str, object]] = []
        self._verdicts: list[dict[str, object]] = []

    def add_shard(self, result: ShardResult) -> None:
        self._rows.append(result.to_manifest_row())

    def add_verdict(self, verdict: DocVerdict) -> None:
        self._verdicts.append(asdict(verdict))

    def write(self, manifest_path: Path) -> str:
        body = {
            "version": 1,
            "generated_at": int(time.time()),
            "shards": self._rows,
            "verdicts": self._verdicts,
        }
        text = json.dumps(body, sort_keys=True, indent=2)
        manifest_sha = hashlib.sha256(text.encode("utf-8")).hexdigest()
        manifest_path.write_text(text, encoding="utf-8")
        lock_path = manifest_path.with_suffix(manifest_path.suffix + ".lock")
        lock_path.write_text(json.dumps({"manifest_sha256": manifest_sha}), encoding="utf-8")
        return manifest_sha

    @property
    def shards(self) -> list[dict[str, object]]:
        return list(self._rows)

    @property
    def verdicts(self) -> list[dict[str, object]]:
        return list(self._verdicts)


def process_shard(
    plan: ShardPlan,
    downloader: StreamingDownloader,
    dedup: Dedup,
    manifest: ManifestWriter,
) -> ShardResult:
    """下载、解压、去重并统计一个分片。"""

    result = downloader.download(plan)
    kept = 0
    duplicates = 0
    shard_path = downloader.cache_dir / f"{plan.shard_id}.zst"
    with shard_path.open("rb") as fh:
        for doc_index, line in enumerate(ZstdDocIterator(fh)):
            verdict = dedup.evaluate(plan.shard_id, doc_index, line)
            manifest.add_verdict(verdict)
            if verdict.verdict == "keep":
                kept += 1
            else:
                duplicates += 1
    result = dataclasses.replace(result, kept_count=kept, duplicate_count=duplicates)
    manifest.add_shard(result)
    return result


def build_demo_corpus(directory: Path) -> list[str]:
    """构造含重复文档的小型合成语料，并写出 zst 分片。

    返回下载器应读取的 file URL 列表。英文语料参与哈希，保持原值。
    """

    directory.mkdir(parents=True, exist_ok=True)
    base = [
        "the alignment problem is a story about reward functions and what we miss when we write them",
        "the alignment problem is a story about reward functions and the things we forget to write down",
        "transformers replaced recurrent networks because attention scales better with sequence length",
        "attention scales better with sequence length so transformers replaced recurrent networks",
        "evaluation harnesses keep training honest by treating the test corpus as a contract",
        "a contract between training and evaluation is what an eval harness ultimately enforces",
        "deduplication is upstream of tokenization so duplicates do not pay tokenization cost twice",
        "the tokenizer is a vocabulary contract between the model and the corpus",
        "checkpointing the verified bytes before writing the buffer is the only safe resume order",
        "the manifest is the deciding edge between data is downloaded and data is verifiable",
    ]
    shards = [base[:5], base[3:9], base[6:]]
    urls: list[str] = []
    for i, group in enumerate(shards):
        payload = ("\n".join(group) + "\n").encode("utf-8")
        compressed = zstd.ZstdCompressor(level=10).compress(payload)
        path = directory / f"corpus-{i:02d}.zst"
        path.write_bytes(compressed)
        urls.append(path.as_uri())
    return urls


def run_demo() -> int:
    with tempfile.TemporaryDirectory() as raw_dir, tempfile.TemporaryDirectory() as cache_dir:
        corpus_dir = Path(raw_dir)
        cache_path = Path(cache_dir)
        urls = build_demo_corpus(corpus_dir)
        plans = ShardPlanner.from_urls(urls)
        downloader = StreamingDownloader(cache_dir=cache_path)
        hasher = MinHasher(num_hashes=128, shingle_width=3)
        index = LSHIndex(num_hashes=128, bands=32)
        dedup = Dedup(hasher=hasher, index=index)
        manifest = ManifestWriter()
        for plan in plans:
            result = process_shard(plan, downloader, dedup, manifest)
            print(
                f"[分片] {result.shard_id} 文档数={result.document_count} "
                f"保留={result.kept_count} 重复={result.duplicate_count} "
                f"sha256={result.sha256[:12]}"
            )
        manifest_path = cache_path / "manifest.json"
        manifest_sha = manifest.write(manifest_path)
        kept = sum(int(row["kept_count"]) for row in manifest.shards)
        dup = sum(int(row["duplicate_count"]) for row in manifest.shards)
        print(f"[清单] sha256={manifest_sha[:12]} 保留={kept} 重复={dup}")
    return 0


if __name__ == "__main__":
    sys.exit(run_demo())
