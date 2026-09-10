"""文档 AI 技术栈简化示例：LayoutLMv3 风格输入、Donut 结构定义与词元预算。

仅使用标准库。为一个模拟页面生成三路 LayoutLM 输入（文本、边界框、图块 ID），
生成 Donut 风格的 JSON 结构定义，并比较 OCR 流水线、Donut、Nougat
和原生 VLM 方案的输入词元总数。

译注：页面文本参与 hash(t.text)，故保留英文样本及金额不变。INVOICE、
Item、Widget A、Price、Total 依次表示发票、项目、部件 A、价格、合计。
JSON 的 invoice/form 为任务标识；vendor、invoice_number、line_items、
description、quantity、price、total、currency 分别表示供应商、发票编号、
明细项、描述、数量、价格、合计、币种；form_id、fields、name、value、
confidence 表示表单 ID、字段列表、名称、值、置信度，字段名与类型占位符均不翻译。
"""

from __future__ import annotations

import json
from dataclasses import dataclass


@dataclass
class Token:
    text: str
    bbox: tuple[int, int, int, int]


def mock_page() -> list[Token]:
    """一个合成的发票页面。"""
    return [
        Token("INVOICE",      (100, 50,  300, 80)),
        Token("ACME Co.",     (100, 100, 250, 130)),
        Token("Item",         (100, 200, 200, 230)),
        Token("Widget A",     (100, 240, 250, 270)),
        Token("Price",        (400, 200, 500, 230)),
        Token("$120.00",      (400, 240, 500, 270)),
        Token("Total",        (400, 400, 500, 430)),
        Token("$1,245.00",    (400, 440, 550, 470)),
    ]


def layoutlm_input(tokens: list[Token], patch_grid: tuple[int, int] = (16, 16)) -> dict:
    """生成三路输入：文本 ID、边界框和图块 ID。"""
    text_ids = [hash(t.text) % 10000 for t in tokens]
    bbox_stream = [t.bbox for t in tokens]
    n_patches = patch_grid[0] * patch_grid[1]
    patch_ids = list(range(n_patches))
    return {"text_ids": text_ids, "bbox_stream": bbox_stream,
            "patch_ids": patch_ids}


def donut_schema(task: str = "invoice") -> dict:
    schemas = {
        "invoice": {
            "vendor": "<string>",
            "invoice_number": "<string>",
            "line_items": [
                {"description": "<string>", "quantity": "<int>", "price": "<float>"}
            ],
            "total": "<float>",
            "currency": "<string>",
        },
        "form": {
            "form_id": "<string>",
            "fields": [
                {"name": "<string>", "value": "<string>", "confidence": "<float>"}
            ],
        },
    }
    return schemas.get(task, {})


def token_budget() -> None:
    print("\n每页输入词元预算（A4，300 DPI，约 2500x3500 像素）")
    print("-" * 60)
    rows = [
        ("OCR 流水线 + LayoutLMv3", 512, "文本 + 边界框 + 小图像"),
        ("Donut（无需 OCR）",          4096, "Swin 编码器，约 4k 个图块"),
        ("Nougat（论文页面）",      4096, "896x896，4 块 AnyRes"),
        ("VLM AnyRes 4 分块（LLaVA）", 2916, "336 像素分块 + 缩略图"),
        ("VLM 原生 2048（Qwen2.5-VL）", 8192, "原生分辨率"),
        ("VLM 原生 2576（Claude 4.7）", 12000, "前沿方案，准确率最佳"),
    ]
    print(f"  {'技术栈':<28}{'词元数':<10}  说明")
    for name, toks, note in rows:
        print(f"  {name:<28}{toks:<10}  {note}")


def demo_pipeline_output() -> None:
    print("\nLayoutLMv3 风格的输入（发票页面）")
    print("-" * 60)
    tokens = mock_page()
    data = layoutlm_input(tokens)
    print(f"  text_ids[0:4]    : {data['text_ids'][:4]}...")
    print(f"  bbox_stream[0:2] : {data['bbox_stream'][:2]}")
    print(f"  patch_ids 数量  ：{len(data['patch_ids'])}")

    print("\nDonut 结构定义（invoice：发票）")
    print("-" * 60)
    schema = donut_schema("invoice")
    print(json.dumps(schema, indent=2))


def eras_table() -> None:
    print("\n文档 AI 的三个时代")
    print("-" * 60)
    rows = [
        ("时代 1：OCR 流水线",    "Tesseract, TrOCR, LayoutLMv3", "确定性强"),
        ("时代 2：无需 OCR",        "Donut, Nougat, DocLLM",         "通用性较弱"),
        ("时代 3：原生 VLM",      "Qwen2.5-VL, PaliGemma 2, Claude 4.7", "2026 年前沿方案"),
    ]
    for era, examples, trait in rows:
        print(f"  {era:<20}{examples:<36}{trait}")


def main() -> None:
    print("=" * 60)
    print("文档与图表理解（阶段 12，第 22 课）")
    print("=" * 60)

    demo_pipeline_output()
    token_budget()
    eras_table()

    print("\n方案选择")
    print("-" * 60)
    print("  每天 10M 张发票   ：OCR 流水线 + LayoutLMv3，成本低")
    print("  科研论文          ：用 Nougat 处理数学内容，用 VLM 处理图表")
    print("  混合内容 + 手写   ：原生 VLM（PaliGemma 2 或 Qwen2.5-VL）")
    print("  受监管场景        ：OCR + VLM 交叉核验，便于审计")


if __name__ == "__main__":
    main()
