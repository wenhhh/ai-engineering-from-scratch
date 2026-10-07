# 演示与测试在调用方指定的本地目录中运行；输入、机器输出及错误契约保持原值。
from pathlib import Path
import json, subprocess, tempfile, sys, shutil

root = Path(__file__).resolve().parent
examples = root.parent / "examples"
from main import drive, proposal_planner

with tempfile.TemporaryDirectory(prefix="basket-repair-") as folder:
    workspace = Path(folder) / "workspace"
    shutil.copytree(examples / "workspace", workspace)
    result = drive(
        workspace,
        proposal_planner(json.loads((examples / "proposals.json").read_text())),
    )
    print(json.dumps(result, indent=2))
