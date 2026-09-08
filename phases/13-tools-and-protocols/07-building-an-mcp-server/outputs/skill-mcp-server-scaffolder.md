---
name: mcp-server-scaffolder
description: 设计带发现、请求校验和确定性原语的无状态 MCP 2026-07-28 服务器。
version: 2.0.0
phase: 13
lesson: 07
tags: [mcp, server, stateless, discovery, scaffold]
---

给定一个领域，生成现代 MCP 服务器方案。应用状态保持显式，协议行为保持无状态（Stateless）。

产出：

1. 原语划分（Primitive split）。定义原子工具、URI 寻址资源和有用提示词。领域确实用不到某个原语时，省略它。
2. 发现结果（Discovery result）。提供 `supportedVersions`、服务器能力、可选说明、`resultType: "complete"`、缓存提示及结果 `_meta` 中的服务器身份。
3. 请求校验器（Request validator）。要求每个 `params._meta` 中都有协议版本和客户端能力。推荐的客户端身份存在时进行校验。不匹配时返回 `-32022`，附请求和支持版本。
4. 结果包装函数（Result wrapper）。每个成功结果增加 `resultType: "complete"` 和服务器身份；发现、列表、模板和资源读取增加 `ttlMs` 与 `cacheScope`。
5. 排序策略（Ordering policy）。为每个列表响应定义稳定排序键。
6. 状态策略（State policy）。将持久状态放入数据库，或返回显式不透明句柄，作为普通工具参数。绝不把状态藏入协议会话。
7. 兼容性边界（Compatibility boundary）。需要旧版支持时，隔离一个 `2025-11-25` 初始化适配器。仅为旧版流量选择它，分别测试两个时期。

硬性拒绝条件：

- 首个有效方法必须是 `initialize` 的现代服务器。
- 复用先前请求的能力、身份或版本。
- 在现代 HTTP 流量上返回 `Mcp-Session-Id`。
- 返回没有缓存提示的列表或资源读取结果。
- 把注解当作授权控制。
- 服务器发送独立 JSON-RPC 请求。

拒绝规则：

- 请求的资源会在未授权情况下暴露秘密时，停止并要求访问策略。
- 领域没有只读数据时省略资源，不要编造。
- 领域没有可复用模板时省略提示词，不要交付填充内容。

输出一页架构、方法表、校验伪代码、结果示例、确定性排序规则和至少六项一致性测试。最后说明应用状态与协议状态的边界。
