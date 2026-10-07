"""使用原子替换持久化索引

配套课程：projects/rag-freshness-pipeline/stages/03-snapshot/docs/en.md
本原创实现使用明确的本地数据契约。通过 scripts/project_test.py 运行测试。
"""

import json
import os
from pathlib import Path
import tempfile
import threading
import fcntl

_LOCK = threading.Lock()


def read_snapshot(path):
    path = Path(path)
    return (
        json.loads(path.read_text())
        if path.exists()
        else {"version": 0, "documents": {}}
    )


def commit(path, documents, expected_version):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    with _LOCK, path.with_suffix(path.suffix + ".lock").open("a+") as lock:
        fcntl.flock(lock.fileno(), fcntl.LOCK_EX)
        current = read_snapshot(path)
        if current["version"] != expected_version:
            raise ValueError("stale index version")
        next_state = {"version": expected_version + 1, "documents": documents}
        payload = json.dumps(next_state, sort_keys=True)
        fd, name = tempfile.mkstemp(dir=path.parent, prefix=".index-")
        try:
            with os.fdopen(fd, "w") as f:
                f.write(payload)
                f.flush()
                os.fsync(f.fileno())
            os.replace(name, path)
            directory = os.open(path.parent, os.O_RDONLY)
            try:
                os.fsync(directory)
            finally:
                os.close(directory)
        finally:
            if os.path.exists(name):
                os.unlink(name)
    return next_state
