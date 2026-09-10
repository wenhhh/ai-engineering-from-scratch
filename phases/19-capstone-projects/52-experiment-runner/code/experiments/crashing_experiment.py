"""以非零状态退出、不提供所需指标的模拟实验。

运行器测试用它验证 crash 终态。诊断原值保留，供测试匹配；本脚本故意返回 3。"""

from __future__ import annotations

import json
import sys


def main() -> int:
    # 即将失败；保留诊断载荷原值。
    print(json.dumps({"step": 0, "note": "about to fail"}))
    # 跟踪信息：模拟失败。测试会匹配 simulated failure。
    print("trace: simulated failure", file=sys.stderr)
    return 3


if __name__ == "__main__":
    sys.exit(main())
