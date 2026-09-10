"""带校验恢复的分片检查点示例。

把多 rank 训练状态保存为逐 rank 二进制分片和 JSON manifest。每个文件先
写到 <name>.tmp，再重命名为目标名称；manifest 最后写出。恢复时检查
manifest schema、world_size、分片数量和每个分片的 SHA-256，并重建
逐 rank 状态。

运行：python3 code/main.py

译注：原文称“一次重命名移动所有文件”，实际是逐文件 os.replace；
因此多个分片与 manifest 并不是单个文件系统事务。目录 fsync 降低元数据
丢失风险，但不能把示例视作跨文件完全原子提交。torch.save 使用 pickle，
只能加载可信检查点；SHA-256 也只是完整性校验，不是来源认证或签名。
"""

from __future__ import annotations

import hashlib
import json
import os
import shutil
import tempfile
from dataclasses import asdict, dataclass, field
from pathlib import Path

import torch


SCHEMA_VERSION = 1
MANIFEST_NAME = "manifest.json"


@dataclass
class ShardEntry:
    rank: int
    path: str
    sha256: str
    param_shard_offset: int
    param_shard_numel: int


@dataclass
class ShardManifest:
    world_size: int
    step: int
    wall_clock_seconds: float
    shards: list
    schema_version: int = SCHEMA_VERSION

    def to_json(self) -> str:
        return json.dumps({
            "world_size": self.world_size,
            "step": self.step,
            "wall_clock_seconds": self.wall_clock_seconds,
            "schema_version": self.schema_version,
            "shards": [asdict(s) for s in self.shards],
        }, indent=2, sort_keys=True)

    @classmethod
    def from_json(cls, text: str) -> "ShardManifest":
        data = json.loads(text)
        return cls(
            world_size=int(data["world_size"]),
            step=int(data["step"]),
            wall_clock_seconds=float(data["wall_clock_seconds"]),
            schema_version=int(data["schema_version"]),
            shards=[ShardEntry(**s) for s in data["shards"]],
        )


class CheckpointError(Exception):
    """manifest 校验或分片验证失败时抛出的异常。"""


def _sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _fsync_dir(path: Path) -> None:
    """对目录执行 fsync 以尽量持久化重命名元数据；不支持时保持原 no-op。"""
    try:
        fd = os.open(str(path), os.O_RDONLY)
    except OSError:
        return
    try:
        os.fsync(fd)
    except OSError:
        pass
    finally:
        os.close(fd)


def _serialize_state(state: dict) -> bytes:
    """使用 torch.save + pickle 4 将状态字典序列化为字节。"""
    import io
    buf = io.BytesIO()
    torch.save(state, buf, pickle_protocol=4)
    return buf.getvalue()


def _deserialize_state(data: bytes) -> dict:
    import io
    buf = io.BytesIO(data)
    return torch.load(buf, weights_only=False)


def save_sharded(per_rank_state: list, dest_dir: str, step: int,
                 wall_clock_seconds: float = 0.0) -> ShardManifest:
    """逐 rank 写入状态文件并返回 manifest。

    per_rank_state 按 rank 索引；每个状态通过 torch.save 写入 rankN.bin。
    实现使用 .tmp + 逐文件 replace，避免直接覆盖目标文件时留下半写单文件；
    但整组分片并非一个原子事务。
    """
    dest = Path(dest_dir)
    dest.mkdir(parents=True, exist_ok=True)
    world_size = len(per_rank_state)
    shards = []
    tmp_paths = []
    offset = 0
    for rank, state in enumerate(per_rank_state):
        payload = _serialize_state(state)
        sha = _sha256_bytes(payload)
        final_name = f"rank{rank}.bin"
        tmp_name = f"rank{rank}.bin.tmp"
        tmp_path = dest / tmp_name
        with open(tmp_path, "wb") as f:
            f.write(payload)
            f.flush()
            os.fsync(f.fileno())
        tmp_paths.append((tmp_path, dest / final_name))
        param_shard = state.get("param_shard")
        numel = param_shard.numel() if isinstance(param_shard, torch.Tensor) else 0
        shards.append(ShardEntry(
            rank=rank,
            path=final_name,
            sha256=sha,
            param_shard_offset=offset,
            param_shard_numel=numel,
        ))
        offset += numel
    manifest = ShardManifest(
        world_size=world_size,
        step=step,
        wall_clock_seconds=wall_clock_seconds,
        shards=shards,
    )
    manifest_tmp = dest / (MANIFEST_NAME + ".tmp")
    manifest_final = dest / MANIFEST_NAME
    with open(manifest_tmp, "w") as f:
        f.write(manifest.to_json())
        f.flush()
        os.fsync(f.fileno())
    for tmp, final in tmp_paths:
        os.replace(tmp, final)
    os.replace(manifest_tmp, manifest_final)
    _fsync_dir(dest)
    return manifest


def load_sharded(src_dir: str, expected_world_size: int) -> tuple:
    """读取 manifest，验证全部分片，返回 (manifest, 逐 rank 状态列表)。"""
    src = Path(src_dir)
    manifest_path = src / MANIFEST_NAME
    if not manifest_path.exists():
        raise CheckpointError(f"manifest missing at {manifest_path}")
    manifest = ShardManifest.from_json(manifest_path.read_text())
    if manifest.world_size != expected_world_size:
        raise CheckpointError(
            f"world_size mismatch: manifest={manifest.world_size}, expected={expected_world_size}"
        )
    if manifest.schema_version != SCHEMA_VERSION:
        raise CheckpointError(
            f"schema_version mismatch: manifest={manifest.schema_version}, expected={SCHEMA_VERSION}"
        )
    if len(manifest.shards) != manifest.world_size:
        raise CheckpointError(
            f"shard count != world_size: {len(manifest.shards)} vs {manifest.world_size}"
        )
    per_rank = [None] * manifest.world_size
    seen_ranks = set()
    src_resolved = src.resolve()
    for shard in manifest.shards:
        if not (0 <= shard.rank < manifest.world_size):
            raise CheckpointError(
                f"shard rank {shard.rank} out of range [0,{manifest.world_size})"
            )
        if shard.rank in seen_ranks:
            raise CheckpointError(f"duplicate shard for rank {shard.rank}")
        seen_ranks.add(shard.rank)
        if os.path.isabs(shard.path) or os.sep in shard.path or "/" in shard.path or shard.path in ("", ".", ".."):
            raise CheckpointError(f"unsafe shard path: {shard.path!r}")
        shard_path = (src / shard.path).resolve()
        try:
            shard_path.relative_to(src_resolved)
        except ValueError as exc:
            raise CheckpointError(f"shard path escapes checkpoint dir: {shard.path!r}") from exc
        if not shard_path.exists():
            raise CheckpointError(f"shard file missing: {shard_path}")
        payload = shard_path.read_bytes()
        actual = _sha256_bytes(payload)
        if actual != shard.sha256:
            raise CheckpointError(
                f"sha256 mismatch on rank {shard.rank}: "
                f"recorded={shard.sha256[:12]}..., actual={actual[:12]}..."
            )
        per_rank[shard.rank] = _deserialize_state(payload)
    if len(seen_ranks) != manifest.world_size:
        missing = sorted(set(range(manifest.world_size)) - seen_ranks)
        raise CheckpointError(f"manifest missing ranks: {missing}")
    return manifest, per_rank


def rotate_checkpoints(parent_dir: str, keep_last: int = 5) -> list:
    """删除最旧检查点目录，只保留最近 keep_last 个。"""
    if keep_last < 0:
        raise ValueError(f"keep_last must be >= 0, got {keep_last}")
    parent = Path(parent_dir)
    if not parent.exists():
        return []
    children = sorted(
        [c for c in parent.iterdir() if c.is_dir() and c.name.startswith("step_")],
        key=lambda c: (c.stat().st_mtime, c.name),
    )
    if keep_last == 0:
        to_delete = children
    elif len(children) > keep_last:
        to_delete = children[:-keep_last]
    else:
        to_delete = []
    deleted = []
    for c in to_delete:
        shutil.rmtree(c, ignore_errors=True)
        deleted.append(c.name)
    return deleted


def make_demo_state(rank: int, world_size: int) -> dict:
    """为演示构造具有代表性的逐 rank 状态。"""
    torch.manual_seed(31 + rank)
    return {
        "rank": rank,
        "world_size": world_size,
        "param_shard": torch.randn(1024) + rank,
        "m_shard": torch.zeros(1024),
        "v_shard": torch.ones(1024) * 1e-6,
        "step": 100,
    }


def main() -> int:
    world_size = 4
    workdir = tempfile.mkdtemp(prefix="aie_ckpt_")
    print(f"工作目录：{workdir}")
    states = [make_demo_state(r, world_size) for r in range(world_size)]
    step_dir = os.path.join(workdir, "step_0100")
    print("正在保存分片检查点……")
    manifest = save_sharded(states, step_dir, step=100, wall_clock_seconds=42.0)
    print(f"manifest：world_size={manifest.world_size}，step={manifest.step}，分片数={len(manifest.shards)}")
    for entry in manifest.shards:
        print(f"  rank {entry.rank}: {entry.path} sha256={entry.sha256[:12]}... numel={entry.param_shard_numel}")
    print("\n正在恢复……")
    loaded_manifest, loaded_states = load_sharded(step_dir, expected_world_size=world_size)
    for r in range(world_size):
        before = states[r]["param_shard"]
        after = loaded_states[r]["param_shard"]
        assert torch.equal(before, after), f"rank {r} param shard differs after resume"
    print("已验证每个 rank 的序列化状态可完整往返恢复")
    print("\n测试失败模式：world size 不匹配……")
    try:
        load_sharded(step_dir, expected_world_size=8)
    except CheckpointError as e:
        print(f"  已按预期拒绝：{e}")
    print("\n测试失败模式：分片被篡改……")
    shard0 = Path(step_dir) / "rank0.bin"
    backup = shard0.read_bytes()
    shard0.write_bytes(backup + b"corruption")
    try:
        load_sharded(step_dir, expected_world_size=world_size)
    except CheckpointError as e:
        print(f"  已按预期拒绝：{e}")
    shard0.write_bytes(backup)
    print("\n测试轮转：写入 8 个检查点，保留 5 个……")
    for s in range(8):
        sd = os.path.join(workdir, f"step_{s:04d}")
        save_sharded(states, sd, step=s)
    deleted = rotate_checkpoints(workdir, keep_last=5)
    print(f"  已删除 {len(deleted)} 个最旧检查点：{deleted}")
    shutil.rmtree(workdir, ignore_errors=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
