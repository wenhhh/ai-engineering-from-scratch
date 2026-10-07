# 网页文本变化教学实现；不运行浏览器，不自动接受在线基线。
import subprocess
import tempfile
from pathlib import Path

with tempfile.TemporaryDirectory() as directory:
    subprocess.run(
        [
            "go",
            "run",
            ".",
            "--before",
            "fixtures/before.html",
            "--after",
            "fixtures/after.html",
            "--out",
            directory,
        ],
        cwd=Path(__file__).parent,
        check=True,
    )
    print("导航计数和页脚时间戳已过滤。")
    print(
        "运行 go run . --out ./web-change-output，保存 HTML、JSON 和基线。"
    )
