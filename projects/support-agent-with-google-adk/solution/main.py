# 源码与模型提示、错误和状态保持原契约；只添加中文说明，不连接真实账户。
import argparse
import asyncio
import json
from pathlib import Path
from support import support_ticket, export_support


def main():
    p = argparse.ArgumentParser(
        description="准备脱敏支持回复或转人工结果。绝不发送消息。"
    )
    p.add_argument(
        "--ticket", type=Path, default=Path(__file__).parent / "fixtures/ticket.json"
    )
    p.add_argument("--out", type=Path, default=Path("support-output"))
    p.add_argument("--adk", action="store_true")
    p.add_argument(
        "--model",
        help="显式选择在线 ADK 模型；需要服务商凭据和 --adk",
    )
    p.add_argument("--tool", help="可选：指定需要检查的只读能力")
    args = p.parse_args()
    raw = json.loads(args.ticket.read_text())
    if args.model and not args.adk:
        p.error("--model requires --adk")
    if args.adk:
        from adk_adapter import run_adk

        result = asyncio.run(
            run_adk(
                raw["text"],
                ticket_id=raw["id"],
                requested_tool=args.tool,
                model=args.model,
            )
        )
    else:
        result = support_ticket(raw, args.tool)
    export_support(result, args.out)
    print(
        json.dumps(
            {
                "state": result["session"]["state"],
                "route": result["session"]["route"],
                "response": result["session"].get("response"),
                "output": str(args.out / "index.html"),
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
