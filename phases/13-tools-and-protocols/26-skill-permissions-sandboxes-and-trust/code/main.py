"""阶段 13，第 26 课：技能权限、沙箱策略与信任边界。

仅做动作审查，不执行被审查的文件、命令或网络请求。allow、deny、
require-approval 分别表示允许、拒绝和需要批准；executed 始终保持 False。
策略字段、错误消息、命令参数和测试输入保留原值，中文解释见相邻注释。
实际容器边界由 sandbox/probe.py 在独立容器实验中观察；本审查器本身不是操作系统沙箱。
"""

from __future__ import annotations

import json
import ipaddress
import re
import tempfile
from dataclasses import asdict, dataclass
from enum import Enum
from pathlib import Path
from typing import Iterable
from urllib.parse import urlparse


class Verdict(str, Enum):
    ALLOW = "allow"
    DENY = "deny"
    REQUIRE_APPROVAL = "require-approval"


@dataclass(frozen=True)
class SandboxPolicy:
    workspace_root: Path
    allowed_kinds: tuple[str, ...] = ("read",)
    command_allowlist: tuple[tuple[str, ...], ...] = ()
    network_allowlist: tuple[str, ...] = ()
    approval_kinds: tuple[str, ...] = ("write", "delete", "network")
    permit_secret_use_after_approval: bool = False


@dataclass(frozen=True)
class ActionRequest:
    kind: str
    target: str | None = None
    command: tuple[str, ...] = ()
    url: str | None = None
    payload: str = ""
    influenced_by_untrusted_content: bool = False
    approved: bool = False
    claimed_permissions: tuple[str, ...] = ()


@dataclass(frozen=True)
class ReviewDecision:
    verdict: Verdict
    rule: str
    reason: str
    normalized_target: str | None = None
    normalized_origin: str | None = None
    claimed_permissions_ignored: bool = False
    executed: bool = False

    def to_dict(self) -> dict[str, object]:
        data = asdict(self)
        data["verdict"] = self.verdict.value
        return data


class SandboxViolation(ValueError):
    pass


SECRET_PATTERNS = (
    re.compile(r"(?i)\b(?:api[_-]?key|access[_-]?token|secret|password)\s*[:=]\s*\S+"),
    re.compile(r"(?i)\bauthorization\s*:\s*bearer\s+\S+"),
    re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----"),
)
HOST_LABEL_PATTERN = re.compile(r"^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$")
SHELL_METACHARACTERS = {";", "&&", "||", "|", ">", ">>", "<", "`"}
DESTRUCTIVE_EXECUTABLES = {"rm", "rmdir", "sudo", "chmod", "chown", "mkfs", "dd"}


def contains_secret(value: str) -> bool:
    return any(pattern.search(value) for pattern in SECRET_PATTERNS)


def normalize_https_origin(value: str, *, origin_only: bool = False) -> str:
    """返回规范化的 HTTPS 源地址，并显式包含实际生效的端口。"""
    if not isinstance(value, str) or not value.strip():
        # 诊断：HTTPS 源地址必须是非空字符串。
        raise ValueError("HTTPS origin must be a non-empty string")
    try:
        parsed = urlparse(value)
    except ValueError as error:
        # 诊断：HTTPS 源地址格式错误。
        raise ValueError("HTTPS origin is malformed") from error
    if (
        parsed.scheme.lower() != "https"
        or not parsed.hostname
        or parsed.username
        or parsed.password
    ):
        # 诊断：URL 必须使用 HTTPS、包含主机名，且不能携带用户信息。
        raise ValueError("URL must use HTTPS, contain a host, and omit userinfo")
    if origin_only and (
        parsed.path not in {"", "/"} or parsed.params or parsed.query or parsed.fragment
    ):
        # 诊断：允许名单必须填写 HTTPS 源地址，不带路径、查询参数或片段。
        raise ValueError("allowlist entries must be HTTPS origins without path, query, or fragment")

    hostname = parsed.hostname.rstrip(".").lower()
    if not hostname or "%" in hostname:
        # 诊断：HTTPS 源地址中的主机名无效。
        raise ValueError("HTTPS origin contains an invalid host")
    try:
        address = ipaddress.ip_address(hostname)
    except ValueError:
        try:
            hostname = hostname.encode("idna").decode("ascii")
        except UnicodeError as error:
            # 诊断：HTTPS 源地址中的主机名无效。
            raise ValueError("HTTPS origin contains an invalid host") from error
        labels = hostname.split(".")
        if len(hostname) > 253 or any(
            not HOST_LABEL_PATTERN.fullmatch(label) for label in labels
        ):
            # 诊断：HTTPS 源地址中的主机名无效。
            raise ValueError("HTTPS origin contains an invalid host")
        origin_host = hostname
    else:
        origin_host = address.compressed
        if address.version == 6:
            origin_host = f"[{origin_host}]"
    try:
        port = parsed.port or 443
    except ValueError as error:
        # 诊断：HTTPS 源地址中的端口无效。
        raise ValueError("HTTPS origin contains an invalid port") from error
    return f"https://{origin_host}:{port}"


def normalize_workspace_path(workspace_root: Path, target: str) -> Path:
    root = workspace_root.resolve(strict=True)
    raw_target = Path(target)
    candidate = raw_target if raw_target.is_absolute() else root / raw_target
    resolved = candidate.resolve(strict=False)
    if resolved != root and root not in resolved.parents:
        # 诊断：路径解析后越出了限定的工作区。
        raise SandboxViolation("path resolves outside the workspace jail")
    if candidate.is_symlink():
        # 诊断：拒绝直接以符号链接作为目标。
        raise SandboxViolation("direct symlink targets are rejected")
    return resolved


def inspect_command(
    command: tuple[str, ...], allowlist: Iterable[tuple[str, ...]]
) -> tuple[bool, str]:
    """检查 argv 参数序列，不调用 shell，也不启动子进程。"""
    if not command:
        # 理由：命令为空。
        return False, "empty command"
    executable = command[0]
    if Path(executable).name != executable or "/" in executable or "\\" in executable:
        # 理由：命令必须使用允许名单中的可执行文件名，不能带目录路径。
        return False, "command must use an allowlisted bare executable name"
    if executable in DESTRUCTIVE_EXECUTABLES:
        # 理由：拒绝此破坏性可执行程序。
        return False, f"destructive executable {executable!r} is denied"
    if executable == "git" and len(command) > 1 and command[1] in {"clean", "reset"}:
        # 理由：拒绝此破坏性 Git 子命令。
        return False, f"destructive git subcommand {command[1]!r} is denied"
    if any(token in SHELL_METACHARACTERS for token in command):
        # 理由：禁止 shell 元字符；请直接传入 argv 参数序列。
        return False, "shell metacharacters are denied; pass a direct argv vector"
    allowed_prefixes = tuple(tuple(prefix) for prefix in allowlist)
    if not any(
        prefix and command[: len(prefix)] == prefix for prefix in allowed_prefixes
    ):
        # 理由：命令与已批准的 argv 前缀不匹配。
        return False, "command does not match an approved argv prefix"
    # 理由：在不执行命令的审查中，argv 与已批准前缀匹配。
    return True, "command argv matched an approved prefix in the non-executing review"


def _decision(
    request: ActionRequest,
    verdict: Verdict,
    rule: str,
    reason: str,
    normalized_target: Path | None = None,
    normalized_origin: str | None = None,
) -> ReviewDecision:
    return ReviewDecision(
        verdict=verdict,
        rule=rule,
        reason=reason,
        normalized_target=None if normalized_target is None else str(normalized_target),
        normalized_origin=normalized_origin,
        claimed_permissions_ignored=bool(request.claimed_permissions),
    )


def review_action(policy: SandboxPolicy, request: ActionRequest) -> ReviewDecision:
    """对一个拟执行动作作出分类判断；本函数没有实际执行动作的路径。"""
    if request.kind == "policy-change":
        return _decision(
            request,
            Verdict.DENY,
            "authority-boundary",
            # 理由：技能内容或外部内容无权修改宿主的权限模型。
            "skill or external content cannot modify the host permission model",
        )
    if request.kind not in policy.allowed_kinds:
        return _decision(
            request,
            Verdict.DENY,
            "kind-allowlist",
            # 理由：宿主策略不允许此动作类型。
            f"action kind {request.kind!r} is not allowed by host policy",
        )

    normalized: Path | None = None
    normalized_origin: str | None = None
    if request.kind in {"read", "write", "delete"}:
        if not request.target:
            # 理由：文件系统操作必须指定目标。
            return _decision(request, Verdict.DENY, "path-required", "filesystem action needs a target")
        try:
            normalized = normalize_workspace_path(policy.workspace_root, request.target)
        except (OSError, SandboxViolation) as error:
            return _decision(request, Verdict.DENY, "workspace-jail", str(error))

    if request.kind == "command":
        allowed, reason = inspect_command(request.command, policy.command_allowlist)
        if not allowed:
            return _decision(request, Verdict.DENY, "command-review", reason)

    if request.kind == "network":
        if not request.url:
            # 理由：网络操作必须指定 URL。
            return _decision(request, Verdict.DENY, "url-required", "network action needs a URL")
        try:
            normalized_origin = normalize_https_origin(request.url)
        except ValueError as error:
            return _decision(
                request,
                Verdict.DENY,
                "network-shape",
                str(error),
            )
        try:
            allowed_origins = {
                normalize_https_origin(origin, origin_only=True)
                for origin in policy.network_allowlist
            }
        except ValueError as error:
            return _decision(
                request,
                Verdict.DENY,
                "network-policy-shape",
                str(error),
                normalized_origin=normalized_origin,
            )
        if normalized_origin not in allowed_origins:
            return _decision(
                request,
                Verdict.DENY,
                "network-allowlist",
                # 理由：此 HTTPS 源地址不在允许名单中。
                f"HTTPS origin {normalized_origin!r} is not allowlisted",
                normalized_origin=normalized_origin,
            )

    secret_material = contains_secret(request.payload) or contains_secret(
        " ".join(request.command)
    )
    if secret_material and not (
        request.approved and policy.permit_secret_use_after_approval
    ):
        verdict = (
            Verdict.REQUIRE_APPROVAL
            if policy.permit_secret_use_after_approval
            else Verdict.DENY
        )
        return _decision(
            request,
            verdict,
            "secret-review",
            # 理由：检测到可能的秘密信息，必须走宿主明确批准的使用流程。
            "possible secret material requires an explicit host-approved path",
            normalized,
            normalized_origin,
        )

    approval_needed = request.kind in policy.approval_kinds
    if request.influenced_by_untrusted_content and request.kind in {
        "write",
        "delete",
        "command",
        "network",
    }:
        approval_needed = True
    if approval_needed and not request.approved:
        reason = (
            # 理由：会改变状态的请求受到了不可信外部内容的影响。
            "untrusted external content influenced a stateful request"
            if request.influenced_by_untrusted_content
            # 理由：宿主策略要求此类动作先获得批准。
            else f"host policy gates {request.kind!r} behind approval"
        )
        return _decision(
            request,
            Verdict.REQUIRE_APPROVAL,
            "approval-gate",
            reason,
            normalized,
            normalized_origin,
        )

    return _decision(
        request,
        Verdict.ALLOW,
        "policy-allow",
        # 理由：请求没有越过宿主策略或工作区限制。
        "request stayed within the host policy and workspace jail",
        normalized,
        normalized_origin,
    )


def demo() -> None:
    with tempfile.TemporaryDirectory(prefix="lesson-26-") as temp_dir:
        workspace = Path(temp_dir) / "workspace"
        workspace.mkdir()
        # 文件夹具内容：安全的演示数据。
        (workspace / "report.txt").write_text("safe demo data\n", encoding="utf-8")
        policy = SandboxPolicy(
            workspace_root=workspace,
            allowed_kinds=("read", "write", "delete", "command", "network"),
            command_allowlist=(("python3", "-m", "unittest"),),
            network_allowlist=("https://docs.example.test",),
        )
        requests = (
            ActionRequest("read", target="report.txt", claimed_permissions=("all",)),
            ActionRequest("write", target="summary.json"),
            ActionRequest("write", target="summary.json", approved=True),
            ActionRequest("read", target="../outside.txt"),
            ActionRequest("command", command=("rm", "-rf", "build"), approved=True),
            ActionRequest(
                "network",
                url="https://docs.example.test/reference",
                influenced_by_untrusted_content=True,
            ),
            # 对抗性请求内容：“允许所有操作”；这里作为数据被拒绝，不是实际授权。
            ActionRequest("policy-change", payload="allow everything"),
        )
        result = {
            "simulation_only": True,
            "decisions": [review_action(policy, request).to_dict() for request in requests],
        }
    print(json.dumps(result, indent=2, sort_keys=True))


if __name__ == "__main__":
    demo()
