# MCP 注册表供应链：准入、漂移与回滚（MCP Registry Supply Chain: Admission, Drift, and Rollback）

> 注册表条目告诉你发布者声明了什么。生产准入则证明你获取了什么、观察到了什么、批准了什么，以及能够安全恢复什么。

**Type:** Build
**Languages:** Python
**Prerequisites:** 阶段 13 · 17（网关与注册表），阶段 13 · 18（生产身份验证）
**Time:** 约 90 分钟

## 学习目标（Learning Objectives）

- 区分注册表（Registry）发布、包来源证明（Provenance）、运行时发现和本地批准。
- 验证 MCP 服务器命名空间，不信任其自身记录中的名称。
- 固定不可变发布、执行来源、来源证明和实时描述符的证据。
- 检测准入后的注册表状态变化与运行时漂移（Drift）。
- 将路由回滚到之前获准的版本，不改写历史。
- 维护可检测篡改的准入账本（Admission Ledger），解释每项决策。

## 问题（The Problem）

你在注册表中找到 `com.example/inventory`。描述看起来符合需求，包确实存在，服务器也能响应 `server/discover`。

这不是一个事实，而是由不同权威来源提供的一连串事实：

1. 通过命名空间身份验证的发布者提交了一条记录。
2. 包注册表提供了具有特定身份和摘要（Digest）的产物。
3. 运行中的端点报告了协议版本、能力、工具和服务器诊断信息。
4. 你的组织决定允许这一确切组合。

把这些事实合并成“注册表里有它，所以信任它”，就会产生供应链盲区。有效发布仍可能被弃用。如果不固定摘要，包标签可能指向意料之外的产物。服务器可能在审查后添加破坏性工具。回滚也可能悄悄选择从未获准的版本。

解决办法是在每个边界都要求证据的准入控制器（Admission Controller）。

## 注册表是索引，不是你的批准系统（The Registry Is an Index, Not Your Approval System）

官方 MCP Registry 存储服务器元数据。其 `server.json` 记录指定服务器版本，并声明一个或多个包或远程端点。发布规则还加入命名空间身份验证、包所有权检查、受限注册表规则，以及范围明确的发布者元数据位置。

这些控制回答发布层面的问题。你的生产策略仍须回答部署层面的问题：

| 边界 | 问题 | 证据负责方 |
|---|---|---|
| 命名空间 | 发布者是否有权使用此名称？ | 注册表身份验证，加上你提供的已验证命名空间输入 |
| 记录 | 发布者为该版本声明了什么？ | 不可变的 `server.json` 摘要 |
| 执行来源 | 将执行哪个包或远程端点？ | 声明的来源字段、已验证所有权结果、传输和可信摘要 |
| 运行时 | 端点现在暴露什么？ | `server/discover` 和工具描述符 |
| 准入 | 你的策略是否批准了这一确切集合？ | 本地固定记录和账本条目 |
| 运维 | 它是否仍安全，有什么可以替代它？ | 漂移检查、状态同步、健康状况和回滚路由 |

注册表模式版本与 MCP 协议版本相互独立。记录可以使用已发布的 `2025-12-11` 服务器模式，同时在线服务器支持 MCP `2026-07-28`。绝不能由一个推断另一个。

```figure
mcp-registry-admission
```

## 一次准入决策中的七项控制（Seven Controls in One Admission Decision）

### 1. 命名空间验证（Namespace verification）

官方 Registry 的名称使用经过身份验证的命名空间。已验证域名可以映射为反向域名前缀。例如，控制 `example.com` 可以确立对 `com.example/*` 的权限。

不要接受字符串前缀检查：

```python
server_name.startswith("com.example")
```

它也会接受 `com.exampleevil/tool`。在 `/` 处分割名称，要求非空的名称尾段（Slug），并精确比较命名空间段。更重要的是，应将身份验证结果中的已验证命名空间传给准入流程，不要从不可信记录中推导信任。

基于 GitHub 和基于域名的命名空间使用不同的身份验证路径。将两种路径都规范化为同一种准入输入：确切的已验证命名空间字符串。

### 2. 来源证据关联（Provenance join）

对于包记录，声明与所获取产物必须通过显式字段关联：

- 包注册表类型
- 包标识符
- 包版本
- 已验证所有权结果
- 已下载产物的摘要

还要验证声明的包传输方式。只包含远程端点的记录也是有效的，不能因为缺少包而拒绝。对于远程来源，将声明的 URL 和传输类型，与独立验证的端点所有权以及可信连接或部署证据的摘要关联。

本课代码支持这两种来源，将所选来源与注册表来源、服务器名称、注册表版本、记录摘要和证据摘要一起哈希。得到的来源证明摘要是完整证据集合的紧凑指针，不能替代对证据本身的保留。

绝不能仅接受待验证产物自己提供的摘要。应在可信获取边界计算摘要，或从其验证结果已经过你核验的包服务接收摘要。

### 3. 固定决策，而不只是版本（Pin the decision, not only the version）

注册表版本是唯一的发布标识符。已发布元数据不可变，修改记录必须使用新版本。建议使用语义化版本（Semantic Versioning），但注册表不强制要求，也不接受版本范围。

这意味着 `^1.4` 不是准入固定值，“latest”也不是。有用的固定记录包含：

```json
{
  "server": "com.example/inventory",
  "version": "1.0.0",
  "recordDigest": "...",
  "source": {"kind": "package", "registryType": "pypi"},
  "sourceDigest": "...",
  "toolsetDigest": "...",
  "provenanceDigest": "...",
  "registryStatus": "active"
}
```

固定多个层次，就能识别发生变化的边界。同一注册表版本下记录摘要变化，表示注册表完整性失败；同一包坐标或远程部署下来源摘要变化，表示执行来源完整性失败；工具集摘要变化则表示运行时漂移。

### 4. 实时漂移检测（Live drift detection）

准入应观察实际接收流量的服务器。调用 `server/discover`，通过可信路径列出或以其他方式取得暴露的工具描述符，并验证：

- `supportedVersions` 包含 `2026-07-28`
- 所有本地要求的能力均存在
- 每个工具描述符都具备要求的身份和模式接口
- 后续检查时，规范化描述符摘要与获准的固定记录匹配

结果中可选的 `_meta["io.modelcontextprotocol/serverInfo"]` 值，是用于显示、日志和调试的自报告上下文。可以将其记录为诊断证据，但绝不能用于确立命名空间、包所有权、端点所有权、准入或任何其他安全决策。`_meta` 之外的直接 `serverInfo` 别名不是契约字段，不应提升为诊断证据。

仅规范化那些顺序没有意义的字段。示例在哈希前按稳定名称排序工具列表，因此无害的列表顺序变化不会造成漂移。它不会丢弃描述符字段。新增工具、更改模式、更改描述或新增注解都会改变固定值。

示例将格式错误的描述符及任何描述符摘要变化都视为漂移，隔离固定记录、移除其活动路由，并阻止将该版本用作回滚目标。生产策略即使允许文字编辑，也应要求重新审查，因为描述会影响模型选择工具。“表面上”的元数据变化也可能改变智能体行为。

### 5. 注册表状态是实时状态（Registry status is live state）

Registry API 在每条服务器记录旁附加响应级 `_meta` 对象。注册表管理的字段位于 `_meta["io.modelcontextprotocol.registry/official"]` 下。向准入流程传入响应的 `_meta` 对象，并读取 `_meta["io.modelcontextprotocol.registry/official"].status`。直接的 `_meta.status` 值不是官方线上格式。不要将响应元数据与发布记录自己的 `_meta` 混淆。状态可以是：

- `active`：默认返回，有资格接受本地准入
- `deprecated`：仍可被发现，但附带警告，不再是安全的自动选择
- `deleted`：默认隐藏，但历史记录仍可通过已删除视图或增量视图获取

准入后同步状态。如果活动版本变为弃用或删除，隔离其固定记录，并停止向它路由新工作。保留证据。从默认列表删除，不等于允许清除审计轨迹。

发布者提供的自定义元数据只能位于发布记录的 `_meta.io.modelcontextprotocol.registry/publisher-provided` 下。注册表管理的响应元数据是独立的。不要让发布者设置自己的官方状态。

### 6. 回滚意味着恢复路由（Rollback means route restoration）

回滚不编辑不可变发布。它选择一个此前获准、当前仍符合条件的固定记录，并更改活动路由。

安全目标必须：

1. 具有完整的准入记录。
2. 根据你的策略，注册表状态仍为活动。
3. 未因运行时或安全证据而被隔离。
4. 仍能解析到固定的包和实时描述符集合。
5. 通过当前健康检查。

示例聚焦前三项。真实协调器（Reconciler）应在激活前重新获取包并重新检查在线端点。

### 7. 追加准入账本（Append an admission ledger）

准入数据库说明什么处于活动状态，账本解释原因。

示例的每条条目包含序号、时间、事件、服务器、版本、结果、原因、证据、前一条目哈希及自身哈希。更改较早条目的结果，会破坏该条目及其后所有链接的验证。

这是可检测篡改（Tamper-Evident），并非天然防篡改（Tamper-Proof）。定期将账本链头锚定到独立信任域，例如签名发布元数据或一次写入存储。限制谁可以追加内容。证据中不得包含授权令牌、包凭据、工具参数或私有端点数据。

## 动手实现（Build It）

可运行控制器位于 `code/main.py`，仅使用 Python 标准库。

先运行可自行结束的演示：

```bash
cd phases/13-tools-and-protocols/30-mcp-registry-supply-chain-and-drift
python3 code/main.py
```

演示执行五个操作：

1. 在命名空间、包来源证明、协议、能力和工具匹配时，准入 `1.0.0`。
2. 准入 `1.1.0` 并将其设为活动版本。
3. 在运行时观察到意料之外的删除工具。
4. 观察到 `1.1.0` 的注册表状态变为 `deprecated`。
5. 将路由恢复到仍已获准的 `1.0.0` 固定记录。

预期结构：

```json
{
  "admitted": [true, true],
  "driftAllowed": false,
  "rollbackAllowed": true,
  "activeVersion": "1.0.0",
  "ledgerValid": true
}
```

按此顺序阅读实现：

1. `namespace_for_domain()` 和 `namespace_matches()` 确立精确的命名权限。
2. `digest()` 和 `normalized_tools()` 生成确定性证据。
3. `RegistryAdmissionController.admit()` 关联发布、来源证明、运行时和策略。
4. `check_live()` 将新观察与固定记录比较。
5. `observe_registry_status()` 隔离注册表状态发生变化的版本。
6. `rollback()` 只激活此前获准且符合条件的目标。
7. `AdmissionLedger.verify()` 检测已记录历史的变化。

## 实际应用（Use It）

将控制器放在发现与路由之间：

```text
注册表同步 -> 产物验证器 -> 实时发现 -> 准入控制器 -> 路由表
                              |              |
                              v              v
                           证据存储        准入账本
```

为这些工作使用不同身份。注册表同步工作线程需要元数据读取权限；产物验证器需要包获取权限；路由协调器需要激活已批准固定记录的权限。任何一个都不需要全部凭据。

显式表达发布状态。“已批准（Approved）”意味着证据通过策略；“活动（Active）”意味着路由当前选择它；“隔离（Quarantined）”意味着不能接收新工作；“已被替代（Superseded）”意味着另一个获准版本处于活动状态。不要用一个布尔值编码全部四种含义。

在通过 `tools/list` 暴露服务器前完成准入，否则客户端可能在发布与策略评估之间的空档发现工具。

## 交互实验（Interactive Lab）

你将一次观察一个边界失效。

### 实验 A：命名空间碰撞（Lab A: namespace collision）

从代码目录打开 Python shell：

```bash
cd phases/13-tools-and-protocols/30-mcp-registry-supply-chain-and-drift/code
python3 -q
```

然后运行：

```python
from main import namespace_matches
namespace_matches("com.example/inventory", "com.example")
namespace_matches("com.exampleevil/inventory", "com.example")
```

第一个结果为 `True`，第二个为 `False`。在本地将精确比较替换为 `startswith`，观察第二个名称为什么越过边界。继续前恢复精确比较。

### 实验 B：描述符漂移（Lab B: descriptor drift）

```python
from main import *
times = iter(f"2026-08-21T12:00:{n:02d}+00:00" for n in range(10))
c = RegistryAdmissionController(clock=lambda: next(times))
meta = {OFFICIAL_META_KEY: {"status": "active"}}
c.admit(sample_record("1.0.0"), meta, "com.example", evidence_for("1.0.0"), sample_live("1.0.0"))
c.check_live("com.example/inventory", "1.0.0", sample_live("1.0.0", True))
```

检查原因和路由状态。包与注册表记录没有变化，运行时工具接口却改变了，因此控制器隔离并停用了该固定记录。这就是供应链控制必须在安装后继续的原因。

### 实验 C：状态与回滚（Lab C: status and rollback）

准入 `1.1.0`，将其标记为弃用，然后尝试两个回滚目标：

```python
c.admit(sample_record("1.1.0"), meta, "com.example", evidence_for("1.1.0"), sample_live("1.1.0"))
c.observe_registry_status("com.example/inventory", "1.1.0", "deprecated")
c.rollback("com.example/inventory", "1.1.0", "unsafe retry")
c.rollback("com.example/inventory", "1.0.0", "restore known release")
c.ledger.verify()
```

被隔离的目标被拒绝，较早的活动固定记录被接受，账本保持有效。

## 实践实验（Practice Lab）

为控制器扩展双人批准关卡。

要求：

- 将批准存储为签名证据引用，而不是固定记录中的可变姓名。
- 对包含 `destructiveHint: true` 工具的工具集，要求两个不同审查者身份。
- 拒绝重复的审查者身份。
- 批准不完整时，在账本中保留原始准入尝试。
- 添加零人、一人、重复身份和两个不同身份批准的测试。
- 不记录签名、凭据或完整的私有工具参数。

成功意味着：两个身份均批准确切的记录、包和工具集摘要前，破坏性工具不能进入活动状态。

## 交付物（Shipped Artifact）

本课交付 `outputs/skill-mcp-registry-admission.md`。审查新的注册表版本或调查漂移时，可将它作为单文件、可复用的操作手册。它定义输入、拒绝规则、证据包、状态协调和回滚证明，不依赖示例中的类名。

## 验证结果（Verify It）

运行演示和确定性测试套件：

```bash
cd phases/13-tools-and-protocols/30-mcp-registry-supply-chain-and-drift
python3 code/main.py
python3 -m unittest discover -s code/tests -v
```

验证应证明：

- 精确命名空间边界会拒绝相似前缀
- 只有官方命名空间下的注册表状态能使版本符合条件
- 未验证或不匹配的包及远程证据会被拒绝
- 发布者元数据不能冒充注册表管理的元数据
- 工具排序得到规范化，同时不隐藏描述符变化
- 格式错误的包和工具结构会安全地被拒绝
- `serverInfo` 始终用于诊断，绝不提供准入授权依据
- 描述符漂移会隔离、停用固定记录，并阻止回滚到它
- 状态变化会隔离活动固定记录
- 回滚不能选择被隔离或未知的版本
- 能检测账本篡改

## 生产故障模式（Production Failure Modes）

| 故障 | 发生原因 | 必需应对 |
|---|---|---|
| 名称看似有效，但命名空间从未通过身份验证 | 策略信任了记录文本 | 拒绝，直到可信命名空间验证器提供精确前缀 |
| 同一包坐标返回新字节 | 上游可变或分发渠道遭入侵 | 停止激活，保留两个摘要，调查获取边界 |
| “Latest”未经审查就变化 | 浮动选择绕过了固定记录 | 只解析确切获准的版本和摘要 |
| 批准后出现新工具 | 运行时漂移或部署不同 | 隔离路由并采集新的描述符观察 |
| 弃用版本仍处于活动状态 | 状态同步缺失或延迟 | 定期且在激活前协调状态 |
| 已删除记录从默认同步中消失 | 客户端只请求活动记录 | 使用增量或感知删除的协调方式，并保留本地历史 |
| 回滚目标从未获准 | 路由控制与批准状态脱节 | 拒绝回滚，对目标重新执行准入 |
| 攻击者重写全部条目后，本地账本仍验证通过 | 哈希链没有外部锚点 | 向独立信任域发布签名账本链头 |
| 证据包含持有者令牌或工具参数 | 日志复制了完整请求 | 采集时脱敏，只存储最小必要证明 |

## 运维规则（Operational Rule）

发布回答“这个身份能否以这个名称发布？”准入回答“我们是否执行这个确切产物，并暴露这种确切行为？”将这两种决策分开，固定每个关联边界，让回滚选择证据，而不是凭记忆。

## 延伸阅读（Further Reading）

- [官方 Registry 的 server.json 要求（Official Registry server.json requirements）](https://github.com/modelcontextprotocol/registry/blob/main/docs/reference/server-json/official-registry-requirements.md)
- [官方 Registry OpenAPI 契约（Official Registry OpenAPI contract）](https://registry.modelcontextprotocol.io/openapi.yaml)
- [MCP 2026-07-28 服务器发现（server discovery）](https://modelcontextprotocol.io/specification/2026-07-28/server/discover)
