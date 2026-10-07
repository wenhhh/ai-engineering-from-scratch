"""使用原子替换持久化索引

配套课程：projects/rag-freshness-pipeline/stages/03-snapshot/docs/en.md
本原创实现使用明确的本地数据契约。通过 scripts/project_test.py 运行测试。
"""

import json

import os

from pathlib import Path

import tempfile

import threading


def read_snapshot(path):
    raise NotImplementedError("Stage 3: implement read_snapshot")


def commit(path, documents, expected_version):
    raise NotImplementedError("Stage 3: implement commit")
