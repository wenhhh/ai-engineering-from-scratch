#!/usr/bin/env python3
"""根据 JSON 策略对 JSON 操作请求作出判定，不实际执行该操作。
本脚本不能替代操作系统级沙箱；权限字段、规则和诊断原值保持不变。"""

from __future__ import annotations

import argparse
import ipaddress
import json
import re
from pathlib import Path
from urllib.parse import urlparse


DESTRUCTIVE = {"rm", "rmdir", "sudo", "chmod", "chown", "mkfs", "dd"}
METACHARS = {";", "&&", "||", "|", ">", ">>", "<", "`"}
SECRET_PATTERNS = (
    re.compile(r"(?i)\b(?:api[_-]?key|access[_-]?token|secret|password)\s*[:=]\s*\S+"),
    re.compile(r"(?i)\bauthorization\s*:\s*bearer\s+\S+"),
    re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----"),
)
HOST_LABEL_PATTERN = re.compile(r"^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$")


def contains_secret(value: str) -> bool:
    return any(pattern.search(value) for pattern in SECRET_PATTERNS)


def normalize_https_origin(value: str, *, origin_only: bool = False) -> str:
    """返回规范化的 HTTPS 源站地址，并明确包含实际使用的端口。"""
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


def strict_bool(mapping: dict[str, object], key: str, default: bool = False) -> bool:
    value = mapping.get(key, default)
    if not isinstance(value, bool):
        # 配置诊断：此字段必须是 JSON 布尔值，不能用字符串或数值替代。
        raise ValueError(f"{key} must be a JSON boolean")
    return value


def inside(root: Path, target: str) -> tuple[bool, str]:
    resolved_root = root.resolve()
    raw = Path(target)
    candidate = raw if raw.is_absolute() else resolved_root / raw
    resolved = candidate.resolve(strict=False)
    allowed = resolved == resolved_root or resolved_root in resolved.parents
    return allowed and not candidate.is_symlink(), str(resolved)


def review(policy: dict[str, object], request: dict[str, object], policy_dir: Path) -> dict[str, object]:
    kind = str(request.get("kind", ""))
    result: dict[str, object] = {
        "verdict": "deny",
        "rule": "kind-allowlist",
        # 权限诊断：不允许此操作类型。
        "reason": "action kind is not allowed",
        "executed": False,
        "claimedPermissionsIgnored": bool(request.get("claimedPermissions")),
    }
    try:
        approved = strict_bool(request, "approved")
        influenced_by_untrusted = strict_bool(
            request, "influencedByUntrustedContent"
        )
        permit_secret_after_approval = strict_bool(
            policy, "permitSecretUseAfterApproval"
        )
    except ValueError as error:
        result.update(rule="boolean-shape", reason=str(error))
        return result
    if kind == "policy-change":
        result.update(
            rule="authority-boundary",
            # 权限诊断：请求内容不能修改宿主的权限模型。
            reason="request content cannot modify the host permission model",
        )
        return result
    allowed_kinds = policy.get("allowedKinds", [])
    if not isinstance(allowed_kinds, list) or kind not in allowed_kinds:
        return result
    approval_kinds = policy.get("approvalKinds", [])
    if not isinstance(approval_kinds, list) or not all(
        isinstance(value, str) for value in approval_kinds
    ):
        result.update(
            rule="policy-shape",
            # 策略诊断：approvalKinds 必须是字符串数组。
            reason="approvalKinds must be an array of strings",
        )
        return result
    if kind in {"read", "write", "delete"}:
        target = request.get("target")
        if not isinstance(target, str):
            # 路径诊断：必须提供文件系统目标路径。
            result.update(rule="path-required", reason="filesystem target is required")
            return result
        configured_root = Path(str(policy.get("workspaceRoot", ".")))
        root = configured_root if configured_root.is_absolute() else policy_dir / configured_root
        allowed, normalized = inside(root, target)
        result["normalizedTarget"] = normalized
        if not allowed:
            # 路径诊断：目标解析到工作区外，或不符合符号链接限制。
            result.update(rule="workspace-jail", reason="target resolves outside workspace or through a symlink")
            return result
    if kind == "command":
        command = request.get("command", [])
        allowlist = policy.get("commandAllowlist", [])
        if not isinstance(command, list) or not command:
            # 命令诊断：command 必须是非空的 argv 参数数组。
            result.update(rule="command-review", reason="command must be a non-empty argv array")
            return result
        executable = str(command[0])
        if Path(executable).name != executable or "/" in executable or "\\" in executable:
            # 理由：命令必须使用允许名单中的可执行文件名，不能带目录路径。
            result.update(rule="command-review", reason="command must use an allowlisted bare executable name")
            return result
        if executable in DESTRUCTIVE or any(str(token) in METACHARS for token in command):
            # 命令诊断：拒绝破坏性可执行程序或 shell 元字符。
            result.update(rule="command-review", reason="destructive executable or shell metacharacter denied")
            return result
        if executable == "git" and len(command) > 1 and command[1] in {"clean", "reset"}:
            # 命令诊断：拒绝破坏性的 Git 子命令。
            result.update(rule="command-review", reason="destructive git subcommand denied")
            return result
        if not all(isinstance(token, str) for token in command):
            # 命令诊断：argv 的每个元素都必须是字符串。
            result.update(rule="command-review", reason="every argv item must be a string")
            return result
        if not isinstance(allowlist, list) or not all(
            isinstance(prefix, list)
            and prefix
            and all(isinstance(token, str) for token in prefix)
            for prefix in allowlist
        ):
            # 策略诊断：commandAllowlist 必须包含 argv 前缀数组。
            result.update(rule="policy-shape", reason="commandAllowlist must contain argv-prefix arrays")
            return result
        if not any(command[: len(prefix)] == prefix for prefix in allowlist):
            # 理由：命令与已批准的 argv 前缀不匹配。
            result.update(rule="command-review", reason="command does not match an approved argv prefix")
            return result
    if kind == "network":
        allowlist = policy.get("networkAllowlist", [])
        try:
            requested_origin = normalize_https_origin(request.get("url", ""))
        except ValueError as error:
            result.update(rule="network-shape", reason=str(error))
            return result
        result["normalizedOrigin"] = requested_origin
        if not isinstance(allowlist, list) or not all(
            isinstance(origin, str) for origin in allowlist
        ):
            result.update(
                rule="network-policy-shape",
                # 策略诊断：networkAllowlist 必须是 HTTPS 源站地址数组。
                reason="networkAllowlist must be an array of HTTPS origins",
            )
            return result
        try:
            allowed_origins = {
                normalize_https_origin(origin, origin_only=True)
                for origin in allowlist
            }
        except ValueError as error:
            result.update(rule="network-policy-shape", reason=str(error))
            return result
        if requested_origin not in allowed_origins:
            result.update(
                rule="network-allowlist",
                # 理由：此 HTTPS 源地址不在允许名单中。
                reason=f"HTTPS origin {requested_origin!r} is not allowlisted",
            )
            return result
    payload = str(request.get("payload", ""))
    command_text = " ".join(str(token) for token in request.get("command", []))
    if contains_secret(payload) or contains_secret(command_text):
        if not (permit_secret_after_approval and approved):
            result.update(
                verdict="require-approval" if permit_secret_after_approval else "deny",
                rule="secret-review",
                # 秘密信息诊断：疑似秘密信息必须通过明确批准的处理流程；此处不是文件路径校验。
                reason="possible secret material requires an explicit approved path",
            )
            return result
    untrusted_stateful = influenced_by_untrusted and kind in {
        "write",
        "delete",
        "command",
        "network",
    }
    policy_gated = kind in approval_kinds
    if (untrusted_stateful or policy_gated) and not approved:
        reason = (
            # 理由：会改变状态的请求受到了不可信外部内容的影响。
            "untrusted external content influenced a stateful request"
            if untrusted_stateful
            # 审批诊断：宿主策略要求批准后才能执行。
            else "host policy requires approval"
        )
        result.update(verdict="require-approval", rule="approval-gate", reason=reason)
        return result
    # 权限判定：请求符合所提供的策略；此脚本只作判定，不执行操作。
    result.update(verdict="allow", rule="policy-allow", reason="request satisfies the supplied policy")
    return result


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--policy", type=Path, required=True)
    parser.add_argument("--request", type=Path, required=True)
    args = parser.parse_args()
    policy = json.loads(args.policy.read_text(encoding="utf-8"))
    request = json.loads(args.request.read_text(encoding="utf-8"))
    print(json.dumps(review(policy, request, args.policy.resolve().parent), indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
