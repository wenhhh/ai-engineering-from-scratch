"""将流式分词结果写入可扩展、按分片存储的 HDF5 数据集。

实现内容：
- 确定性的字节级 Tokenizer。
- HDF5ShardWriter：以块为单位缓冲词元，分块扩展数据集，并记录
  token_count 和 sha256 属性；最后一块可以不足标准块大小。
- ShardedTokenizationPipeline：每个源分片对应一个 HDF5 文件，
  并写出 shards.json 索引。
- MmapTokenStore：以 SWMR 模式打开分片，提供读取接口。
- SlidingWindowDataloader：生成固定长度的 (input, target) 对。

末尾演示构造内存语料、分词写出分片，再读取若干批次，打印每批形状
和校验值。运行：python3 code/main.py

译注：原文将读取称为 mmap，但这里实际使用 h5py 数据集切片，再复制到
NumPy 数组，并未调用 mmap 或 numpy.memmap；不能据此声称零拷贝或
只有一次复制。英文语料影响字节词元、数量和哈希，因此保持原值。
错误、数据集名称、字段及文件路径也保留原机器契约。
"""

from __future__ import annotations

import hashlib
import json
import random
import struct
import sys
import tempfile
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Iterable, Iterator

import numpy as np

try:
    import h5py
except ImportError as exc:
    raise SystemExit(
        # 本课需要 h5py；安装命令：pip install h5py。
        "h5py is required for this lesson. Install with: pip install h5py"
    ) from exc


DEFAULT_CHUNK_SIZE = 8192
DEFAULT_WINDOW_SIZE = 64
BOUNDARY_TOKEN_ID = 0
TOKEN_DTYPE = np.uint16


@dataclass
class ShardWriteResult:
    """单个分片的写入结果。"""

    shard_id: str
    path: str
    token_count: int
    document_count: int
    chunk_size: int
    sha256: str

    def to_dict(self) -> dict[str, object]:
        return asdict(self)


@dataclass
class ShardIndexEntry:
    """供读取器定位分片的索引行。"""

    shard_id: str
    path: str
    token_count: int
    document_count: int
    sha256: str
    global_start: int

    def to_dict(self) -> dict[str, object]:
        return asdict(self)


class Tokenizer:
    """确定性的字节级分词器。

    词表：
        0      边界词元（分隔符）
        1..256 原始字节词元（整体加一，将 0 留作保留值）

    实际项目常用 BPE 或 SentencePiece；本实现不引入第三方分词器，
    足以演示流式写入。原文称分隔符由 dataloader 注入，实际是在写入
    流水线中调用 add_boundary；采样器只读取已存储的词元。
    """

    BOUNDARY_TOKEN = BOUNDARY_TOKEN_ID
    BYTE_OFFSET = 1

    def __init__(self) -> None:
        self.vocab_size = 257

    def encode(self, text: str) -> list[int]:
        if not text:
            return []
        data = text.encode("utf-8")
        return [self.BYTE_OFFSET + b for b in data]

    def decode(self, ids: Iterable[int]) -> str:
        byte_ids = [int(i) - self.BYTE_OFFSET for i in ids if int(i) >= self.BYTE_OFFSET]
        return bytes(byte_ids).decode("utf-8", errors="replace")


class HDF5ShardWriter:
    """以块大小缓冲词元，将它们流式写入可扩展的 HDF5 数据集。

    在 with 块中使用，退出时会尝试刷新剩余缓冲并写入 token_count、
    sha256 等属性。异常退出也会执行这一清理流程，并非事务提交标记。
    """

    def __init__(
        self,
        path: Path,
        chunk_size: int = DEFAULT_CHUNK_SIZE,
        dataset_name: str = "tokens",
    ) -> None:
        if chunk_size <= 0:
            # 块大小必须为正数。
            raise ValueError("chunk_size must be positive")
        self.path = Path(path)
        self.chunk_size = chunk_size
        self.dataset_name = dataset_name
        self._buffer: list[int] = []
        self._token_count = 0
        self._document_count = 0
        self._hasher = hashlib.sha256()
        self._file: h5py.File | None = None
        self._dataset: h5py.Dataset | None = None

    def __enter__(self) -> "HDF5ShardWriter":
        self._file = h5py.File(self.path, "w", libver="latest")
        self._dataset = self._file.create_dataset(
            self.dataset_name,
            shape=(0,),
            maxshape=(None,),
            chunks=(self.chunk_size,),
            dtype=TOKEN_DTYPE,
        )
        self._file.swmr_mode = True
        return self

    def __exit__(self, exc_type, exc, tb) -> None:
        try:
            if self._dataset is not None and self._file is not None:
                if self._buffer:
                    self._flush_buffer(final=True)
                self._dataset.attrs["token_count"] = self._token_count
                self._dataset.attrs["document_count"] = self._document_count
                self._dataset.attrs["sha256"] = self._hasher.hexdigest()
        finally:
            if self._file is not None:
                self._file.close()
                self._file = None
                self._dataset = None

    def add_document(self, token_ids: Iterable[int]) -> None:
        self._document_count += 1
        for token in token_ids:
            self._buffer.append(int(token))
            if len(self._buffer) >= self.chunk_size:
                self._flush_buffer(final=False)

    def add_boundary(self) -> None:
        """在文档之间插入分隔词元。"""

        self._buffer.append(BOUNDARY_TOKEN_ID)
        if len(self._buffer) >= self.chunk_size:
            self._flush_buffer(final=False)

    def _flush_buffer(self, final: bool) -> None:
        if self._dataset is None:
            # 写入器尚未打开。
            raise RuntimeError("writer is not open")
        if not self._buffer:
            return
        size = len(self._buffer) if final else self.chunk_size
        chunk = np.asarray(self._buffer[:size], dtype=TOKEN_DTYPE)
        new_total = self._token_count + size
        self._dataset.resize((new_total,))
        self._dataset[self._token_count : new_total] = chunk
        self._dataset.flush()
        self._hasher.update(chunk.tobytes())
        self._token_count = new_total
        self._buffer = self._buffer[size:]
        if not final and len(self._buffer) >= self.chunk_size:
            self._flush_buffer(final=False)

    @property
    def token_count(self) -> int:
        return self._token_count

    @property
    def document_count(self) -> int:
        return self._document_count

    def result(self, shard_id: str) -> ShardWriteResult:
        return ShardWriteResult(
            shard_id=shard_id,
            path=str(self.path),
            token_count=self._token_count,
            document_count=self._document_count,
            chunk_size=self.chunk_size,
            sha256=self._hasher.hexdigest(),
        )


class ShardedTokenizationPipeline:
    """将可迭代的分片输入分词写入 HDF5 文件，并生成 shards.json。"""

    def __init__(
        self,
        tokenizer: Tokenizer,
        output_dir: Path,
        chunk_size: int = DEFAULT_CHUNK_SIZE,
    ) -> None:
        self.tokenizer = tokenizer
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.chunk_size = chunk_size

    def write_shard(self, shard_id: str, documents: Iterable[str]) -> ShardWriteResult:
        shard_path = self.output_dir / f"{shard_id}.h5"
        writer = HDF5ShardWriter(shard_path, chunk_size=self.chunk_size)
        with writer:
            for text in documents:
                writer.add_document(self.tokenizer.encode(text))
                writer.add_boundary()
        return writer.result(shard_id)

    def write_corpus(self, shards: dict[str, Iterable[str]]) -> list[ShardIndexEntry]:
        entries: list[ShardIndexEntry] = []
        running_offset = 0
        for shard_id, documents in shards.items():
            result = self.write_shard(shard_id, documents)
            entries.append(
                ShardIndexEntry(
                    shard_id=result.shard_id,
                    path=result.path,
                    token_count=result.token_count,
                    document_count=result.document_count,
                    sha256=result.sha256,
                    global_start=running_offset,
                )
            )
            running_offset += result.token_count
        index_path = self.output_dir / "shards.json"
        body = {
            "version": 1,
            "chunk_size": self.chunk_size,
            "total_tokens": running_offset,
            "shards": [entry.to_dict() for entry in entries],
        }
        index_path.write_text(json.dumps(body, sort_keys=True, indent=2), encoding="utf-8")
        return entries


class MmapTokenStore:
    """读取分片式 HDF5 词元语料（保留原类名 MmapTokenStore）。

    每个分片以 SWMR 模式打开一次。get_slice(start, stop) 将读取范围
    分配到各分片，并返回扁平的 NumPy uint16 数组。

    译注：实现是 h5py 切片读取与数组复制，而不是真正的内存映射。
    操作系统缓存不等于应用层 mmap，也不保证原文所说的单次复制开销。
    """

    def __init__(self, shard_entries: list[ShardIndexEntry]) -> None:
        if not shard_entries:
            # 至少需要一个分片索引条目。
            raise ValueError("at least one shard entry is required")
        self._entries = shard_entries
        self._files: list[h5py.File] = []
        self._datasets: list[h5py.Dataset] = []
        try:
            for entry in shard_entries:
                self._files.append(h5py.File(entry.path, "r", swmr=True))
            self._datasets = [f["tokens"] for f in self._files]
        except Exception:
            for opened in self._files:
                try:
                    opened.close()
                except Exception:
                    pass
            self._files = []
            self._datasets = []
            raise
        self._total_tokens = sum(entry.token_count for entry in shard_entries)

    @property
    def total_tokens(self) -> int:
        return self._total_tokens

    def close(self) -> None:
        for file in self._files:
            try:
                file.close()
            except Exception:
                pass
        self._files = []
        self._datasets = []

    def __enter__(self) -> "MmapTokenStore":
        return self

    def __exit__(self, exc_type, exc, tb) -> None:
        self.close()

    def get_slice(self, start: int, stop: int) -> np.ndarray:
        if start < 0 or stop < 0 or stop < start:
            # 切片范围必须非负，且 stop 不能小于 start。
            raise ValueError(f"bad slice: start={start} stop={stop}")
        if stop > self._total_tokens:
            # 切片终点不能超过词元总数。
            raise ValueError(f"stop ({stop}) exceeds total tokens ({self._total_tokens})")
        if stop == start:
            return np.empty((0,), dtype=TOKEN_DTYPE)
        out = np.empty((stop - start,), dtype=TOKEN_DTYPE)
        cursor = 0
        for entry, dataset in zip(self._entries, self._datasets):
            shard_start = entry.global_start
            shard_stop = shard_start + entry.token_count
            if stop <= shard_start:
                break
            if start >= shard_stop:
                continue
            local_start = max(0, start - shard_start)
            local_stop = min(entry.token_count, stop - shard_start)
            length = local_stop - local_start
            if length <= 0:
                continue
            out[cursor : cursor + length] = dataset[local_start:local_stop]
            cursor += length
        if cursor != stop - start:
            raise RuntimeError(
                # 实际读取的词元数必须与请求长度一致。
                f"slice read produced {cursor} tokens, expected {stop - start}"
            )
        return out


class SlidingWindowDataloader:
    """在扁平词元流上进行随机滑动窗口采样。"""

    def __init__(
        self,
        store: MmapTokenStore,
        window_size: int = DEFAULT_WINDOW_SIZE,
        batch_size: int = 4,
        seed: int = 0,
    ) -> None:
        if window_size <= 1:
            # 窗口大小必须大于 1。
            raise ValueError("window_size must be greater than 1")
        if batch_size <= 0:
            # 批大小必须为正数。
            raise ValueError("batch_size must be positive")
        if store.total_tokens <= window_size:
            raise ValueError(
                # 存储的词元数必须严格大于窗口长度。
                f"store has only {store.total_tokens} tokens; need more than {window_size}"
            )
        self.store = store
        self.window_size = window_size
        self.batch_size = batch_size
        self._random = random.Random(seed)
        self._max_start = store.total_tokens - window_size - 1

    def _sample_window(self) -> tuple[np.ndarray, np.ndarray]:
        start = self._random.randint(0, self._max_start)
        chunk = self.store.get_slice(start, start + self.window_size + 1)
        return chunk[:-1], chunk[1:]

    def __iter__(self) -> Iterator[tuple[np.ndarray, np.ndarray]]:
        while True:
            inputs = np.empty((self.batch_size, self.window_size), dtype=TOKEN_DTYPE)
            targets = np.empty((self.batch_size, self.window_size), dtype=TOKEN_DTYPE)
            for row in range(self.batch_size):
                inputs[row], targets[row] = self._sample_window()
            yield inputs, targets

    def take(self, num_batches: int) -> list[tuple[np.ndarray, np.ndarray]]:
        iterator = iter(self)
        return [next(iterator) for _ in range(num_batches)]


class JSONLSource:
    """从 JSONL 文件指定字段中逐个提取文档的适配器。

    每行应为含有 text 字段（或配置字段）的 JSON 对象。格式错误、
    缺少字段或字段不是非空字符串的行会被跳过，并计入 dropped_lines，
    供调用方审计丢弃情况；空行直接跳过，不计入该计数。

    译注：原文声称第 42 课下载器输出这种 JSONL，但其演示实际只生成
    普通文本行。两课示例不能未经数据格式转换就直接衔接；真实流水线
    通常还应记录被丢弃的行，而不仅是总数。
    """

    def __init__(self, path: Path, text_field: str = "text") -> None:
        self.path = Path(path)
        self.text_field = text_field
        self.dropped_lines = 0

    def __iter__(self) -> Iterator[str]:
        with self.path.open("r", encoding="utf-8") as fh:
            for line in fh:
                line = line.rstrip("\n")
                if not line:
                    continue
                try:
                    record = json.loads(line)
                except json.JSONDecodeError:
                    self.dropped_lines += 1
                    continue
                if not isinstance(record, dict):
                    self.dropped_lines += 1
                    continue
                value = record.get(self.text_field)
                if not isinstance(value, str) or not value:
                    self.dropped_lines += 1
                    continue
                yield value


def pack_documents(
    tokenizer: Tokenizer,
    documents: Iterable[str],
    max_tokens: int,
) -> Iterator[list[int]]:
    """将已分词的文档打包为含边界词元的定长组。

    通常每组恰好含 max_tokens 个词元 ID。长文档跨组切分；短文档可
    共用一组，之间以 BOUNDARY_TOKEN_ID 分隔。最后一组可能不足长度，
    会原样返回。

    译注：只有当前缓冲非空才插入分隔符，恰好填满一组的文档与下一
    文档之间不会额外加入边界；本函数也没有被上面的分片流水线调用。
    """

    if max_tokens <= 1:
        # 每组词元数上限必须大于 1。
        raise ValueError("max_tokens must be greater than 1")
    buffer: list[int] = []
    for text in documents:
        token_ids = tokenizer.encode(text)
        if buffer:
            buffer.append(BOUNDARY_TOKEN_ID)
        buffer.extend(token_ids)
        while len(buffer) >= max_tokens:
            yield buffer[:max_tokens]
            buffer = buffer[max_tokens:]
    if buffer:
        yield buffer


def tokenize_jsonl_path(
    jsonl_path: Path,
    output_dir: Path,
    shard_id: str,
    chunk_size: int = DEFAULT_CHUNK_SIZE,
    text_field: str = "text",
) -> ShardWriteResult:
    """便捷封装：将一个 JSONL 文件分词写入一个 HDF5 分片。"""

    tokenizer = Tokenizer()
    pipeline = ShardedTokenizationPipeline(tokenizer, output_dir=output_dir, chunk_size=chunk_size)
    source = JSONLSource(jsonl_path, text_field=text_field)
    return pipeline.write_shard(shard_id, source)


def load_index(index_path: Path) -> list[ShardIndexEntry]:
    """读取 shards.json，返回 ShardIndexEntry 列表。"""

    data = json.loads(Path(index_path).read_text("utf-8"))
    entries: list[ShardIndexEntry] = []
    for row in data["shards"]:
        entries.append(
            ShardIndexEntry(
                shard_id=str(row["shard_id"]),
                path=str(row["path"]),
                token_count=int(row["token_count"]),
                document_count=int(row.get("document_count", 0)),
                sha256=str(row["sha256"]),
                global_start=int(row["global_start"]),
            )
        )
    return entries


def validate_corpus(index_entries: list[ShardIndexEntry]) -> list[str]:
    """根据磁盘词元重新计算各分片的 SHA-256，报告摘要不匹配项。

    此处一次读取每个分片记录范围内的全部词元，并非流式校验；
    也未独立核验索引偏移、完整数据集长度等结构条件。
    """

    failures: list[str] = []
    for entry in index_entries:
        with h5py.File(entry.path, "r", swmr=True) as fh:
            dataset = fh["tokens"]
            recorded_count = int(dataset.attrs.get("token_count", entry.token_count))
            tokens = np.asarray(dataset[:recorded_count], dtype=TOKEN_DTYPE)
            recomputed = hashlib.sha256(tokens.tobytes()).hexdigest()
            if recomputed != entry.sha256:
                failures.append(entry.shard_id)
    return failures


def build_demo_corpus() -> dict[str, list[str]]:
    """构造两个足够长的合成文档分片，用于演示跨分片读取。"""

    base = [
        "the alignment problem is a story about reward functions and the things they fail to write down",
        "attention scales better with sequence length so transformers replaced recurrent networks during the language modeling era",
        "an evaluation harness keeps training honest by treating the test corpus as a contract that cannot drift",
        "deduplication is upstream of tokenization because every duplicate token costs the trainer twice in compute",
        "checkpoints record the optimizer state and the random seed so that a restart resumes exactly where it stopped",
    ]
    long_repeat = " ".join(base * 4)
    shards: dict[str, list[str]] = {
        "shard-0000": [long_repeat, long_repeat, long_repeat],
        "shard-0001": [long_repeat, long_repeat, long_repeat],
    }
    return shards


def run_demo() -> int:
    """构建演示语料，分词、校验，然后运行数据加载器。

    流水线写入临时目录，数据加载器只取固定的少量批次，
    无须外部输入即可自行结束。
    """

    with tempfile.TemporaryDirectory() as tmp:
        out = Path(tmp)
        tokenizer = Tokenizer()
        pipeline = ShardedTokenizationPipeline(tokenizer, output_dir=out, chunk_size=512)
        shards = build_demo_corpus()
        entries = pipeline.write_corpus(shards)
        for entry in entries:
            print(
                f"[分片] {entry.shard_id} 词元数={entry.token_count} "
                f"sha256={entry.sha256[:12]} 全局起点={entry.global_start}"
            )
        validation_failures = validate_corpus(entries)
        if validation_failures:
            print(f"[校验] 失败：{validation_failures}")
            return 1
        print(f"[校验] 全部 {len(entries)} 个分片与记录的 SHA-256 一致")
        with MmapTokenStore(entries) as store:
            loader = SlidingWindowDataloader(store, window_size=64, batch_size=4, seed=7)
            for batch_index, (inputs, targets) in enumerate(loader.take(10)):
                checksum = int(hashlib.blake2b(inputs.tobytes(), digest_size=4).hexdigest(), 16)
                print(
                    f"[批次] 步数={batch_index} 形状={tuple(inputs.shape)} "
                    f"校验值={checksum:08x}"
                )
    return 0


if __name__ == "__main__":
    sys.exit(run_demo())
