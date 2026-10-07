# 给定文本区域的证据库；不执行 OCR，模型提议必须经人工审阅。
import json
import tempfile
from pathlib import Path
from main import validate_manifest, export_library

fixture = Path(__file__).parent / "fixtures/manifest.json"
assets = validate_manifest(json.loads(fixture.read_text()), fixture.parent)
with tempfile.TemporaryDirectory() as directory:
    report = export_library(assets, "return dry seeds", Path(directory))
    print("使用明确给定的文本矩形检索原创标牌：")
    for row in report["matches"]:
        print(
            f"{row['asset_id']}/{row['region_id']}: {row['score']:.0%} 查询覆盖率 | {row['bbox']}"
        )
        print("  " + row["text"])
    print("没有执行 OCR。每个结果都指向给定的证据元数据。")
    print(
        '运行 python3 main.py --query "return dry seeds" --out ./visual-output，保存可移植 HTML 图库。'
    )
