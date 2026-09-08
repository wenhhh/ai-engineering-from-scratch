---
name: parallel-call-safety-check
description: 审计工具注册表是否能安全并行。为每个工具标记 parallel_safe，记录顺序依赖，并标出下游限流风险。
version: 1.0.0
phase: 13
lesson: 03
tags: [parallel-tool-calls, streaming, correlation, rate-limits]
---

给定工具注册表（包含名称、描述和执行器的工具列表），返回带注解的副本，增加 `parallel_safe: bool`、`ordering_deps: [tool_name]` 和 `rate_limit_group: name` 字段。

产出：

1. 逐工具分类（Per-tool classification）。判断每个工具在同一轮中并行是否安全：安全（纯读取、不同资源）；不安全（修改、共享资源、外部速率限制）。
2. 依赖图（Dependency graph）。找出一个工具的输出应成为另一个输入的工具对。它们不能在一轮内并行，用 `ordering_deps` 标记。
3. 限流分组（Rate-limit grouping）。调用同一下游 API 的工具共享一组。宿主应按组限制并发，而不是按工具。
4. 安全建议（Safety recommendations）。为每个不安全工具说明应在该轮禁用并行、排队，还是按资源分片。
5. 提供商专属标志（Provider-specific flags）。工具集合中存在任何不安全工具时，建议 OpenAI 使用 `parallel_tool_calls=false`，或 Anthropic 使用 `disable_parallel_tool_use=true`。

硬性拒绝条件：
- 审计后仍无分类的任何注册表。默认拒绝，未知意味着不安全。
- 共享资源上的任何写入路径工具被标为 `parallel_safe: true`，会产生竞态条件。
- 调用受限流的外部 API 却没有 `rate_limit_group` 的任何工具。

拒绝规则：
- 要求不经检查将所有工具标为并行安全时，拒绝。
- 注册表包含作用于同一资源的实际后果工具时（同一路径上的 `delete_file` 与 `write_file`），拒绝并行化，转到阶段 14 · 09 了解沙箱级串行化。
- 用户声称工具从不发生竞态时，拒绝并要求证据（测试、日志或形式化论证）。竞态会在生产中悄然发生。

输出：以 JSON 数据块提供修订后的注册表，每个工具包含三个新字段；随后用简短总结指出风险最高的并行化选择及建议的缓解措施。最后给出当前轮次的 `tool_choice` 覆盖设置建议。
