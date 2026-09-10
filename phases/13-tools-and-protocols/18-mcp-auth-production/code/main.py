"""阶段 13，第 18 课：在生产环境中使用 MCP 2026-07-28 授权机制。

仅用标准库演示本课快照中的 MCP 授权流程：

  - RFC 8414 授权服务器元数据
  - 优先使用客户端 ID 元数据文档（CIMD），以已弃用的 RFC 7591 动态客户端注册（DCR）作为回退方案
  - 带有受众绑定（RFC 8707）的 PKCE（RFC 7636）授权码流程
  - RFC 9207 授权响应中的签发者校验
  - 资源服务器上的 JWT 校验
  - 定期刷新 JWKS 缓存（身份提供方 IdP 轮换密钥；资源服务器只重新获取密钥集）
  - 通过 aud 声明拒绝将令牌重放到其他受众的请求
  - 按签发者缓存客户端注册信息，按“签发者 + 资源”缓存访问令牌

系统由三种角色组成：AuthorizationServer 签发令牌并轮换签名密钥；
ResourceServer（即 MCP 服务器）缓存 JWKS 并校验每个请求；Client 注册并获取令牌。

译注：这是内存中的教学模拟，不是可直接上线的 OAuth 服务。为避免引入外部依赖，
示例使用 HS256；其 JWKS 中含有对称密钥，不能照搬为生产环境的公开密钥端点。
本课的日期与协议描述沿用固定英文快照，不表示本次翻译另行核实了现行规范。
协议键名、错误码、WWW-Authenticate 内容及被测试匹配的异常消息保留英文。
主要诊断含义：issuer mismatch 为签发者不匹配，audience mismatch 为受众不匹配，
unknown kid 为未知密钥标识，bad signature 为签名无效，expired 为已过期，
insufficient_scope 为权限范围不足；redirect URI 为重定向 URI，
absolute HTTPS URL 要求完整的 HTTPS 地址，fragment 指 URL 的片段部分。
授权码只能使用一次，且必须绑定原客户端、重定向 URI、目标资源和 PKCE 校验值。

仅需标准库。运行：python3 main.py
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import secrets
import threading
import time
from dataclasses import dataclass, field
from urllib.parse import urlparse


# ---------------------------------------------------------------------------
# JWT 辅助函数：为仅依赖标准库而使用 HS256；生产环境采用 RS256/EdDSA
# ---------------------------------------------------------------------------


def b64url(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode()


def b64url_decode(s: str) -> bytes:
    pad = "=" * (-len(s) % 4)
    return base64.urlsafe_b64decode(s + pad)


def jwt_sign(payload: dict, kid: str, secret: bytes) -> str:
    header = {"alg": "HS256", "typ": "JWT", "kid": kid}
    h = b64url(json.dumps(header, separators=(",", ":")).encode())
    p = b64url(json.dumps(payload, separators=(",", ":")).encode())
    sig = hmac.new(secret, f"{h}.{p}".encode(), hashlib.sha256).digest()
    return f"{h}.{p}.{b64url(sig)}"


def jwt_decode(token: str) -> tuple[dict, dict, str]:
    h_b64, p_b64, sig_b64 = token.split(".")
    header = json.loads(b64url_decode(h_b64))
    payload = json.loads(b64url_decode(p_b64))
    return header, payload, sig_b64


def jwt_verify(token: str, secret: bytes) -> bool:
    h_b64, p_b64, sig_b64 = token.split(".")
    expected = hmac.new(secret, f"{h_b64}.{p_b64}".encode(), hashlib.sha256).digest()
    return hmac.compare_digest(expected, b64url_decode(sig_b64))


def protected_resource_metadata_url(resource: str) -> str:
    parsed = urlparse(resource)
    if parsed.scheme != "https" or not parsed.netloc or parsed.query or parsed.fragment:
        raise ValueError("MCP resource must be an absolute HTTPS URL without query or fragment")
    suffix = "" if parsed.path in {"", "/"} else parsed.path
    return f"{parsed.scheme}://{parsed.netloc}/.well-known/oauth-protected-resource{suffix}"


MCP_RESOURCE = "https://notes.example.com"
OTHER_MCP_RESOURCE = "https://tasks.example.com"

# RFC 9728 受保护资源元数据 URL。每个 401/403 响应都会在
# WWW-Authenticate 头中标明该地址，以便客户端重新发现授权服务器。
MCP_RESOURCE_METADATA = protected_resource_metadata_url(MCP_RESOURCE)
OTHER_MCP_RESOURCE_METADATA = protected_resource_metadata_url(OTHER_MCP_RESOURCE)

# 每个工具声明所需的权限范围。破坏性工具要求更高权限的
# mcp:tools.delete；它不在 IdP 最小的 scopes_supported 集合中，
# 因此客户端只能通过权限升级流程取得该权限。
TOOL_SCOPES = {
    "notes.list": "mcp:tools.invoke",
    "notes.read": "mcp:tools.invoke",
    "notes.delete": "mcp:tools.delete",
    "tasks.list": "mcp:tools.invoke",
}
DEFAULT_TOOL_SCOPE = "mcp:tools.invoke"
AUTHORIZATION_CODE_TTL_SECONDS = 300


def parsed_absolute_redirect_uri(value: object):
    if (
        not isinstance(value, str)
        or not value
        or value != value.strip()
        or any(character.isspace() or ord(character) < 0x20 or ord(character) == 0x7F for character in value)
    ):
        return None
    try:
        parsed = urlparse(value)
        hostname = parsed.hostname
        _ = parsed.port
    except ValueError:
        return None
    if not parsed.scheme or parsed.fragment or parsed.username is not None or parsed.password is not None:
        return None
    if parsed.scheme in {"http", "https"} and (not parsed.netloc or hostname is None):
        return None
    return parsed


def valid_web_redirect_uri(value: object) -> bool:
    parsed = parsed_absolute_redirect_uri(value)
    return parsed is not None and parsed.scheme == "https" and parsed.hostname is not None


def valid_private_use_scheme(scheme: str) -> bool:
    labels = scheme.split(".")
    return len(labels) >= 2 and all(
        label
        and label.isascii()
        and label[0].isalnum()
        and label[-1].isalnum()
        and all(character.isalnum() or character == "-" for character in label)
        for label in labels
    )


def valid_native_redirect_uri(value: object) -> bool:
    parsed = parsed_absolute_redirect_uri(value)
    if parsed is None:
        return False
    if parsed.scheme == "https":
        return parsed.hostname is not None
    if parsed.scheme == "http":
        return parsed.hostname in {"localhost", "127.0.0.1", "::1"}
    return valid_private_use_scheme(parsed.scheme)


# ---------------------------------------------------------------------------
# 授权服务器：签发令牌、注册客户端、轮换签名密钥
# ---------------------------------------------------------------------------


@dataclass
class IdPKey:
    kid: str
    secret: bytes
    issued_at: float


@dataclass
class AuthorizationServer:
    issuer: str = "https://auth.example.com"
    keys: list[IdPKey] = field(default_factory=list)
    clients: dict[str, dict] = field(default_factory=dict)
    authorization_codes: dict[str, dict] = field(default_factory=dict)
    _authorization_codes_lock: threading.Lock = field(
        default_factory=threading.Lock,
        repr=False,
        compare=False,
    )

    def current_key(self) -> IdPKey:
        return self.keys[-1]

    def rotate_key(self) -> IdPKey:
        """授权服务器端的密钥轮换：加入下一把密钥，移除最旧的密钥。

        稳态下保留两把重叠有效的密钥，让上一把密钥签发的令牌在过期前仍可使用。
        译注：能否一直用到令牌过期还取决于轮换周期；本例仅保留最近两把密钥。
        """
        new_kid = f"k_{int(time.time())}_{secrets.token_hex(2)}"
        new = IdPKey(kid=new_kid, secret=secrets.token_bytes(32), issued_at=time.time())
        self.keys.append(new)
        if len(self.keys) > 2:
            self.keys = self.keys[-2:]
        return new

    def jwks(self) -> dict:
        return {
            "keys": [
                {"kid": k.kid, "kty": "oct", "alg": "HS256", "use": "sig", "k": b64url(k.secret)}
                for k in self.keys
            ]
        }

    def metadata(self) -> dict:
        """RFC 8414 授权服务器元数据。"""
        return {
            "issuer": self.issuer,
            "authorization_endpoint": f"{self.issuer}/authorize",
            "token_endpoint": f"{self.issuer}/token",
            "jwks_uri": f"{self.issuer}/.well-known/jwks.json",
            "registration_endpoint": f"{self.issuer}/register",
            "response_types_supported": ["code"],
            "grant_types_supported": ["authorization_code", "refresh_token"],
            "code_challenge_methods_supported": ["S256"],
            "scopes_supported": ["mcp:tools.read", "mcp:tools.invoke"],
            "token_endpoint_auth_methods_supported": ["none", "private_key_jwt"],
            "authorization_response_iss_parameter_supported": True,
            "client_id_metadata_document_supported": True,
        }

    def register_cimd(self, document_url: str, document: dict) -> str:
        """解析客户端 ID 元数据文档，直接使用文档地址而不新建标识符。"""
        parsed = urlparse(document_url)
        if parsed.scheme != "https" or not parsed.netloc or parsed.path in {"", "/"}:
            raise ValueError("CIMD client_id must be an absolute HTTPS URL with a path")
        if document.get("client_id") != document_url:
            raise ValueError("CIMD client_id must equal its document URL")
        client_name = document.get("client_name")
        if not isinstance(client_name, str) or not client_name.strip():
            raise ValueError("CIMD requires a non-empty client_name")
        application_type = document.get("application_type")
        if application_type is not None and application_type not in {"native", "web"}:
            raise ValueError("CIMD application_type, when present, must be native or web")
        redirect_application_type = application_type or "native"
        redirect_uris = document.get("redirect_uris", [])
        if (
            not isinstance(redirect_uris, list)
            or not redirect_uris
            or any(parsed_absolute_redirect_uri(uri) is None for uri in redirect_uris)
        ):
            raise ValueError(
                "CIMD requires absolute redirect URIs without fragments"
            )
        if redirect_application_type == "web" and any(
            not valid_web_redirect_uri(uri) for uri in redirect_uris
        ):
            raise ValueError(
                "CIMD web clients require absolute HTTPS redirect URIs "
                "with a host and no fragment"
            )
        if redirect_application_type == "native" and any(
            not valid_native_redirect_uri(uri) for uri in redirect_uris
        ):
            raise ValueError(
                "CIMD native clients require HTTPS, a loopback HTTP URI, or a "
                "domain-based private-use scheme"
            )
        self.clients[document_url] = {
            "redirect_uris": redirect_uris,
            "grant_types": document.get("grant_types", ["authorization_code"]),
            "application_type": application_type,
            "client_name": client_name,
            "enrollment": "cimd",
            "issued_at": time.time(),
        }
        return document_url

    def register_client(self, body: dict) -> dict:
        """为兼容性保留已弃用的 RFC 7591 注册方式。"""
        redirect_uris = body.get("redirect_uris", [])
        if (
            not isinstance(redirect_uris, list)
            or not redirect_uris
            or any(parsed_absolute_redirect_uri(uri) is None for uri in redirect_uris)
        ):
            return {"status": 400, "body": {"error": "invalid_redirect_uri"}}
        application_type = body.get("application_type")
        if application_type not in {"native", "web"}:
            return {"status": 400, "body": {"error": "invalid_client_metadata"}}
        if application_type == "web" and any(
            not valid_web_redirect_uri(uri) for uri in redirect_uris
        ):
            return {"status": 400, "body": {"error": "invalid_redirect_uri"}}
        if application_type == "native" and any(
            not valid_native_redirect_uri(uri) for uri in redirect_uris
        ):
            return {"status": 400, "body": {"error": "invalid_redirect_uri"}}
        if body.get("token_endpoint_auth_method", "none") not in {"none", "private_key_jwt"}:
            return {"status": 400, "body": {"error": "invalid_client_metadata"}}
        cid = f"c_{secrets.token_hex(4)}"
        reg_token = secrets.token_urlsafe(24)
        self.clients[cid] = {
            "redirect_uris": redirect_uris,
            "grant_types": body.get("grant_types", ["authorization_code"]),
            # 只保存哈希；攻击者窃取此令牌后可以改写重定向 URI。
            "registration_access_token_hash": hashlib.sha256(reg_token.encode()).hexdigest(),
            "client_name": body.get("client_name", ""),
            "application_type": application_type,
            "enrollment": "dcr",
            "issued_at": time.time(),
        }
        return {
            "status": 201,
            "body": {
                "client_id": cid,
                "client_id_issued_at": int(time.time()),
                "redirect_uris": redirect_uris,
                "grant_types": body.get("grant_types", ["authorization_code"]),
                "application_type": application_type,
                "registration_access_token": reg_token,
                "registration_client_uri": f"{self.issuer}/register/{cid}",
            },
        }

    def pre_register_client(
        self,
        client_id: str,
        *,
        redirect_uris: list[str],
        client_name: str,
        application_type: str = "native",
    ) -> str:
        if not client_id or not redirect_uris or not client_name.strip():
            raise ValueError("pre-registration requires client_id, client_name, and redirect_uris")
        if application_type not in {"native", "web"}:
            raise ValueError("pre-registration application_type must be native or web")
        if (
            not isinstance(redirect_uris, list)
            or any(parsed_absolute_redirect_uri(uri) is None for uri in redirect_uris)
        ):
            raise ValueError(
                "pre-registration requires absolute redirect URIs without fragments"
            )
        if application_type == "web" and any(
            not valid_web_redirect_uri(uri) for uri in redirect_uris
        ):
            raise ValueError(
                "pre-registered web clients require absolute HTTPS redirect URIs "
                "with a host and no fragment"
            )
        if application_type == "native" and any(
            not valid_native_redirect_uri(uri) for uri in redirect_uris
        ):
            raise ValueError(
                "pre-registered native clients require HTTPS redirect URIs, "
                "loopback HTTP redirect URIs, or a domain-based private-use scheme"
            )
        self.clients[client_id] = {
            "redirect_uris": list(redirect_uris),
            "grant_types": ["authorization_code"],
            "application_type": application_type,
            "client_name": client_name,
            "enrollment": "pre_registered",
            "issued_at": time.time(),
        }
        return client_id

    def begin_authorization(
        self,
        *,
        client_id: str,
        redirect_uri: str,
        code_challenge: str,
        code_challenge_method: str,
        scopes: set[str],
        resource: str,
        user: str,
    ) -> dict[str, str]:
        client = self.clients.get(client_id)
        if client is None:
            raise ValueError("client is not enrolled with this issuer")
        if redirect_uri not in client.get("redirect_uris", []):
            raise ValueError("authorization redirect_uri is not registered")
        if not isinstance(code_challenge, str) or not code_challenge:
            raise ValueError("authorization request requires an S256 code_challenge")
        if code_challenge_method != "S256":
            raise ValueError("authorization request requires code_challenge_method S256")
        parsed_resource = urlparse(resource)
        if parsed_resource.scheme != "https" or not parsed_resource.netloc:
            raise ValueError("resource must be an absolute HTTPS URL")
        with self._authorization_codes_lock:
            now = time.time()
            expired_codes = [
                code
                for code, record in self.authorization_codes.items()
                if record["expires_at"] <= now
            ]
            for expired_code in expired_codes:
                self.authorization_codes.pop(expired_code, None)
            code = secrets.token_urlsafe(24)
            while code in self.authorization_codes:
                code = secrets.token_urlsafe(24)
            self.authorization_codes[code] = {
                "client_id": client_id,
                "redirect_uri": redirect_uri,
                "code_challenge": code_challenge,
                "code_challenge_method": code_challenge_method,
                "scopes": set(scopes),
                "resource": resource,
                "user": user,
                "expires_at": now + AUTHORIZATION_CODE_TTL_SECONDS,
            }
        return {"code": code, "iss": self.issuer}

    def redeem_code(
        self,
        *,
        code: str,
        client_id: str,
        redirect_uri: str,
        code_verifier: str,
        resource: str,
    ) -> str:
        with self._authorization_codes_lock:
            record = self.authorization_codes.get(code)
            if record is None:
                raise ValueError("authorization code is invalid or already used")
            if record["expires_at"] <= time.time():
                self.authorization_codes.pop(code, None)
                raise ValueError("authorization code is expired")
            if record["client_id"] != client_id or record["redirect_uri"] != redirect_uri:
                raise ValueError("authorization code is not bound to this client redirect")
            if record["resource"] != resource:
                raise ValueError("token resource does not match the authorization request")
            supplied_challenge = b64url(hashlib.sha256(code_verifier.encode()).digest())
            if not hmac.compare_digest(record["code_challenge"], supplied_challenge):
                raise ValueError("PKCE code_verifier does not match the stored challenge")
            self.authorization_codes.pop(code)
        return self.issue_token(
            client_id,
            record["user"],
            record["scopes"],
            record["resource"],
        )

    def issue_token(self, client_id: str, user: str, scopes: set[str], resource: str) -> str:
        """使用当前密钥签发绑定目标受众的访问令牌。"""
        if client_id not in self.clients:
            raise ValueError("client is not enrolled with this issuer")
        key = self.current_key()
        claims = {
            "iss": self.issuer,
            "sub": user,
            "aud": resource,
            "azp": client_id,
            "scope": " ".join(sorted(scopes)),
            "iat": int(time.time()),
            "exp": int(time.time()) + 3600,
        }
        return jwt_sign(claims, kid=key.kid, secret=key.secret)


# ---------------------------------------------------------------------------
# 资源服务器（MCP 服务器）：缓存 JWKS，校验每个请求
# ---------------------------------------------------------------------------


@dataclass
class ResourceServer:
    resource: str
    auth_server: AuthorizationServer
    allowed_issuers: list[str] = field(default_factory=list)
    jwks_cache: dict[str, dict] = field(default_factory=dict)

    @property
    def resource_metadata(self) -> str:
        return protected_resource_metadata_url(self.resource)

    def refresh_jwks(self) -> dict:
        """重新获取授权服务器发布的 JWKS 并写入缓存；操作具有幂等性。

        密钥“轮换”发生在授权服务器，而不是这里。资源服务器不能生成或轮换
        授权服务器的签名密钥，只能重新拉取已发布的密钥集。定时刷新任务和
        校验器在缓存未命中时的回退逻辑都会调用本方法。它只负责获取密钥，
        因此带有随机 kid 的令牌不会触发无休止的密钥轮换；错误地把回退逻辑
        接到“轮换并生成密钥”操作上才会导致那种问题。
        译注：原文“一次无害的重新获取”针对单次校验路径，不是全局请求上限；
        重复请求仍可能反复刷新，真实服务还需限制刷新频率。
        """
        keys = self.auth_server.jwks()["keys"]
        self.jwks_cache[self.auth_server.issuer] = {"keys": keys, "fetched_at": time.time()}
        return {"refreshed": True, "kids": [k["kid"] for k in keys]}

    def cached_kids(self) -> list[str]:
        entry = self.jwks_cache.get(self.auth_server.issuer, {"keys": []})
        return [k["kid"] for k in entry["keys"]]

    def validate(self, token: str, required_scope: str | None = None) -> dict:
        rm = self.resource_metadata

        def challenge(status: int, params: str) -> dict:
            return {"valid": False, "status": status, "www_authenticate": f"Bearer {params}"}

        try:
            header, claims, _ = jwt_decode(token)
        except Exception:
            return challenge(401, f'error="invalid_token", error_description="malformed", resource_metadata="{rm}"')

        iss = claims.get("iss", "")
        # 先检查签发者允许名单：不可信的 iss 不应让我们付出刷新 JWKS 的代价，
        # 此时应返回的错误是“iss 不在允许名单中”（iss not allowed）。
        if iss not in self.allowed_issuers:
            return challenge(401, f'error="invalid_token", error_description="iss not allowed", resource_metadata="{rm}"')
        cache = self.jwks_cache.get(iss)
        if cache is None:
            self.refresh_jwks()
            cache = self.jwks_cache.get(iss)

        matching = next((k for k in cache["keys"] if k["kid"] == header.get("kid")), None) if cache else None
        if matching is None:
            # 密钥重叠窗口：令牌可能由缓存中尚不存在的新密钥签发。
            # 重新获取一次（不是轮换），然后再次检查。伪造的 kid 在一次
            # 幂等获取后仍无法匹配，会落入下面返回 401 的分支。
            self.refresh_jwks()
            cache = self.jwks_cache.get(iss)
            matching = next((k for k in cache["keys"] if k["kid"] == header.get("kid")), None) if cache else None
        if matching is None:
            return challenge(401, f'error="invalid_token", error_description="unknown kid", resource_metadata="{rm}"')

        if not jwt_verify(token, b64url_decode(matching["k"])):
            return challenge(401, f'error="invalid_token", error_description="bad signature", resource_metadata="{rm}"')
        if claims.get("aud") != self.resource:
            return challenge(401, f'error="invalid_token", error_description="audience mismatch", resource_metadata="{rm}"')
        if claims.get("exp", 0) < time.time():
            return challenge(401, f'error="invalid_token", error_description="expired", resource_metadata="{rm}"')
        if required_scope and required_scope not in set(claims.get("scope", "").split()):
            return challenge(403, f'error="insufficient_scope", scope="{required_scope}", resource_metadata="{rm}"')
        return {"valid": True, "claims": claims}

    def call_tool(self, tool: str, bearer: str) -> dict:
        required_scope = TOOL_SCOPES.get(tool, DEFAULT_TOOL_SCOPE)
        result = self.validate(bearer, required_scope=required_scope)
        if not result["valid"]:
            return {"status": result["status"], "WWW-Authenticate": result["www_authenticate"]}
        return {"status": 200, "body": {"tool": tool, "user": result["claims"]["sub"], "ok": True}}


# ---------------------------------------------------------------------------
# 客户端：发现、DCR 注册、PKCE 及绑定受众的令牌请求
# ---------------------------------------------------------------------------


@dataclass
class Client:
    name: str
    auth_server: AuthorizationServer
    client_metadata_url: str | None = None
    client_metadata: dict | None = None
    pre_registered_client_ids_by_issuer: dict[str, str] = field(default_factory=dict)
    client_ids_by_issuer: dict[str, str] = field(default_factory=dict)
    access_tokens_by_issuer_resource: dict[tuple[str, str], str] = field(default_factory=dict)
    expected_issuer: str | None = None
    require_response_issuer: bool = False

    def discover(self) -> dict:
        meta = self.auth_server.metadata()
        if meta.get("issuer") != self.auth_server.issuer:
            raise ValueError("authorization metadata issuer mismatch")
        if "S256" not in meta["code_challenge_methods_supported"]:
            raise ValueError("authorization server does not advertise S256 PKCE")
        if not (meta.get("client_id_metadata_document_supported") or "registration_endpoint" in meta):
            raise ValueError("authorization server advertises no client enrollment path")
        self.expected_issuer = meta["issuer"]
        self.require_response_issuer = bool(
            meta.get("authorization_response_iss_parameter_supported")
        )
        return meta

    def register(self) -> str:
        """使用已弃用的 DCR 回退方式，并按签发者缓存凭证。"""
        resp = self.auth_server.register_client(
            {
                "redirect_uris": ["http://127.0.0.1:7333/callback"],
                "grant_types": ["authorization_code", "refresh_token"],
                "response_types": ["code"],
                "token_endpoint_auth_method": "none",
                "application_type": "native",
                "scope": "mcp:tools.invoke",
                "client_name": self.name,
            }
        )
        if resp["status"] != 201:
            raise ValueError(f"client registration failed: {resp}")
        issuer = self.auth_server.issuer
        self.client_ids_by_issuer[issuer] = resp["body"]["client_id"]
        return self.client_ids_by_issuer[issuer]

    def enroll(self) -> str:
        """优先使用 CIMD；仅当当前签发者无法解析它时才使用 DCR。"""
        meta = self.discover()
        issuer = meta["issuer"]
        if issuer in self.client_ids_by_issuer:
            return self.client_ids_by_issuer[issuer]
        pre_registered = self.pre_registered_client_ids_by_issuer.get(issuer)
        if pre_registered is not None:
            if pre_registered not in self.auth_server.clients:
                raise ValueError("pre-registered client_id is not known to this issuer")
            self.client_ids_by_issuer[issuer] = pre_registered
            return pre_registered
        if meta.get("client_id_metadata_document_supported"):
            if not self.client_metadata_url or not self.client_metadata:
                raise ValueError("CIMD-capable issuer requires a client metadata document")
            client_id = self.auth_server.register_cimd(
                self.client_metadata_url, self.client_metadata
            )
            self.client_ids_by_issuer[issuer] = client_id
            return client_id
        return self.register()

    def validate_authorization_response_issuer(self, returned_issuer: str | None) -> None:
        if self.expected_issuer is None:
            raise ValueError("authorization server metadata was not discovered")
        if returned_issuer is None:
            if self.require_response_issuer:
                raise ValueError("authorization response omitted required iss")
            return
        if returned_issuer != self.expected_issuer:
            raise ValueError("authorization response issuer mismatch")

    def use_authorization_server(self, auth_server: AuthorizationServer) -> None:
        """切换签发者，不复制客户端标识符或访问令牌。"""
        self.auth_server = auth_server
        self.expected_issuer = None
        self.require_response_issuer = False

    def authorize(self, scopes: set[str], resource: str, user: str) -> str:
        issuer = self.auth_server.issuer
        client_id = self.client_ids_by_issuer.get(issuer)
        if client_id is None:
            raise ValueError("client must enroll separately with this issuer")
        redirect_uris = self.auth_server.clients[client_id].get("redirect_uris", [])
        if not redirect_uris:
            raise ValueError("client has no registered redirect URI")
        redirect_uri = redirect_uris[0]
        verifier = secrets.token_urlsafe(32)
        challenge = b64url(hashlib.sha256(verifier.encode()).digest())
        authorization_response = self.auth_server.begin_authorization(
            client_id=client_id,
            redirect_uri=redirect_uri,
            code_challenge=challenge,
            code_challenge_method="S256",
            scopes=scopes,
            resource=resource,
            user=user,
        )
        self.validate_authorization_response_issuer(authorization_response.get("iss"))
        token = self.auth_server.redeem_code(
            code=authorization_response["code"],
            client_id=client_id,
            redirect_uri=redirect_uri,
            code_verifier=verifier,
            resource=resource,
        )
        self.access_tokens_by_issuer_resource[(issuer, resource)] = token
        return token


# ---------------------------------------------------------------------------
# 演示：生产授权流程
# ---------------------------------------------------------------------------


def demo() -> None:
    print("=" * 72)
    print("阶段 13，第 18 课——MCP 生产环境授权")
    print("=" * 72)

    print("\n--- 第 1 步：启动授权服务器（两把重叠有效的密钥）---")
    auth = AuthorizationServer()
    auth.rotate_key()
    auth.rotate_key()
    print(f"  签发者={auth.issuer}，密钥={[k.kid for k in auth.keys]}")

    print("\n--- 第 2 步：客户端发现授权服务器（RFC 8414）---")
    cimd_url = "https://client.example.com/oauth/client.json"
    client = Client(
        name="Example native client",
        auth_server=auth,
        client_metadata_url=cimd_url,
        client_metadata={
            "client_id": cimd_url,
            "client_name": "Example native client",
            "redirect_uris": ["http://127.0.0.1:7333/callback"],
            "grant_types": ["authorization_code", "refresh_token"],
            "response_types": ["code"],
            "token_endpoint_auth_method": "none",
        },
    )
    meta = client.discover()
    print(f"  签发者={meta['issuer']}，支持 S256 PKCE")
    print(f"  支持 CIMD={meta['client_id_metadata_document_supported']}")

    print("\n--- 第 3 步：客户端通过 CIMD 注册，不使用 DCR ---")
    cid = client.enroll()
    print(f"  client_id 元数据 URL：{cid}")
    print(f"  凭证缓存中的签发者键：{list(client.client_ids_by_issuer)}")

    print("\n--- 第 4 步：客户端携带资源指示符执行 PKCE 授权流程 ---")
    bearer = client.authorize(scopes={"mcp:tools.invoke"}, resource=MCP_RESOURCE, user="alice@example.com")
    print(f"  已签发 Bearer 令牌（kid={auth.current_key().kid}，aud={MCP_RESOURCE}）")

    print("\n--- 第 5 步：MCP 服务器校验请求，首次使用时填充 JWKS 缓存 ---")
    server = ResourceServer(resource=MCP_RESOURCE, auth_server=auth, allowed_issuers=[auth.issuer])
    resp = server.call_tool("notes.list", bearer)
    print(f"  服务器响应：{resp}")
    assert resp["status"] == 200

    print("\n--- 第 6 步：IdP 轮换密钥，定时刷新任务重新获取 JWKS ---")
    print(f"  刷新前缓存的 kid：{server.cached_kids()}")
    auth.rotate_key()  # 授权服务器端的轮换，与 MCP 服务器相互独立
    server.refresh_jwks()  # 定时任务重新获取已发布的 JWKS
    print(f"  刷新后缓存的 kid：{server.cached_kids()}")

    print("\n--- 第 7 步：现有令牌仍可通过校验（密钥重叠窗口）---")
    resp = server.call_tool("notes.list", bearer)
    print(f"  服务器响应：{resp}")
    assert resp["status"] == 200

    print("\n--- 第 8 步：新密钥签发的令牌通过刷新后的 JWKS 校验 ---")
    fresh_bearer = client.authorize(scopes={"mcp:tools.invoke"}, resource=MCP_RESOURCE, user="alice@example.com")
    fresh_header, _, _ = jwt_decode(fresh_bearer)
    print(f"  新令牌的 kid：{fresh_header['kid']}")
    resp = server.call_tool("notes.read", fresh_bearer)
    print(f"  服务器响应：{resp}")
    assert resp["status"] == 200

    print("\n--- 第 9 步：尝试将令牌重放到另一个 MCP 资源 ---")
    other_server = ResourceServer(resource=OTHER_MCP_RESOURCE, auth_server=auth, allowed_issuers=[auth.issuer])
    resp = other_server.call_tool("tasks.list", bearer)
    print(f"  另一台服务器的响应：{resp}")
    assert resp["status"] == 401
    assert "audience mismatch" in resp["WWW-Authenticate"]

    print("\n--- 补充：通过权限升级流程获取更高权限范围 ---")
    elevated = client.authorize(
        scopes={"mcp:tools.invoke", "mcp:tools.delete"}, resource=MCP_RESOURCE, user="alice@example.com"
    )
    elevated_resp = server.call_tool("notes.delete", elevated)
    print(f"  服务器响应：{elevated_resp}")

    print("\n" + "=" * 72)
    print("完成——绑定签发者的注册、响应 iss 校验、受众绑定及 JWKS 刷新")
    print("=" * 72)


if __name__ == "__main__":
    demo()
