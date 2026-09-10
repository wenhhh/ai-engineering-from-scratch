"""探测可观察到的容器边界，并输出一份 JSON 报告。

本程序会实际尝试读写文件和连接网络，只应按本课的容器实验方式运行，
不能把在普通宿主环境中执行它当作“沙箱验证通过”。
读取 /input/message.txt 应成功；写入 /app/escape.txt 应失败；
写入 /tmp/probe.txt 应成功；访问 example.com:443 应失败。
环境变量 DEMO_VALUE 还必须等于固定标记 bounded（受限）。

固定输入 declared read-only input 的含义是“已声明的只读输入”；
unexpected 表示“不应发生的写入”，bounded 表示“处于限制内”。
这些标记、路径和报告字段保持原值，避免改变实验条件。
报告中的 declaredInput/imageFilesystemWrite/temporaryWrite/networkConnection
分别对应声明的输入、镜像文件系统写入、临时目录写入和网络连接。
本次翻译未运行真实容器，不据此声称容器隔离已验收。
"""

from __future__ import annotations

import json
import os
import socket
from pathlib import Path
from typing import Callable


def attempt(operation: Callable[[], str]) -> dict[str, object]:
    try:
        return {"ok": True, "result": operation()}
    except Exception as error:
        return {"ok": False, "error": type(error).__name__}


def read_input() -> str:
    return Path("/input/message.txt").read_text(encoding="utf-8").strip()


def write_image() -> str:
    target = Path("/app/escape.txt")
    target.write_text("unexpected\n", encoding="utf-8")
    return str(target)


def write_temporary() -> str:
    target = Path("/tmp/probe.txt")
    target.write_text("bounded\n", encoding="utf-8")
    return target.read_text(encoding="utf-8").strip()


def open_network() -> str:
    with socket.create_connection(("example.com", 443), timeout=1.0) as connection:
        return str(connection.getpeername())


def main() -> None:
    input_result = attempt(read_input)
    image_write = attempt(write_image)
    temporary_write = attempt(write_temporary)
    network = attempt(open_network)
    report = {
        "declaredInput": input_result,
        "imageFilesystemWrite": image_write,
        "temporaryWrite": temporary_write,
        "networkConnection": network,
        "visibleEnvironmentNames": sorted(os.environ),
        "declaredEnvironmentValue": os.environ.get("DEMO_VALUE"),
    }
    report["passed"] = bool(
        input_result["ok"]
        and not image_write["ok"]
        and temporary_write["ok"]
        and not network["ok"]
        and report["declaredEnvironmentValue"] == "bounded"
    )
    print(json.dumps(report, indent=2, sort_keys=True))
    raise SystemExit(0 if report["passed"] else 1)


if __name__ == "__main__":
    main()
