---
name: fipa-mapper
description: 将任意 2026 年智能体协议规范（MCP、A2A、ACP、ANP、CA-MCP、NLIP 或新协议）映射到 FIPA-ACL 施为类型（Performative）和交互协议，判断哪些是真正创新、哪些是重新发明。
version: 1.0.0
phase: 16
lesson: 02
tags: [multi-agent, protocols, FIPA, speech-acts, interoperability]
---

给定一份新的智能体协议规范，生成 FIPA-ACL 映射，让读者区分哪些部分是重新发明、哪些是真正的新结构。

产出：

1. **信封映射（Envelope mapping）。** 为规范定义的每种消息类型，指出最接近的 FIPA 施为类型（`inform`、`request`、`query-if`、`query-ref`、`propose`、`accept-proposal`、`reject-proposal`、`cfp`、`subscribe`、`cancel`、`failure`、`not-understood`，或约 20 种类型中的其他一种）。若没有合适类型，准确描述缺口。
2. **关联模型（Correlation model）。** 规范如何关联请求与回复、取消与原始请求、流式事件与订阅？与 FIPA 的 `:conversation-id` 和 `:reply-with` 字段比较。
3. **内容语言立场（Content-language stance）。** 规范是强制内容模式（类型化交付物、JSON-Schema）、接受自然语言，还是不作限定？与 FIPA 的 SL0/SL1 和本体字段比较。
4. **交互协议库（Interaction-protocol library）。** 在该规范之上可以实现哪些 FIPA 交互协议：契约网、订阅通知、条件请求、提议接受？指出实现每种协议所用的消息。
5. **发现模型（Discovery model）。** 智能体如何找到交互方和能力（MCP `listTools`、A2A 智能体卡片、ANP DID + 元协议）？与 FIPA 的目录服务代理（Directory facilitator）和黄页服务比较。
6. **重新发明与创新。** 生成一个简短三列表格：[FIPA 概念、现代规范对应物、变化内容]。每行标为 [reinvention] 或 [novel-structure]。只有规范引入 FIPA 没有的原语时，才能标为“novel-structure”；常见候选是去中心化身份、类型化多模态交付物，以及 LLM 可解释的内容。

必须排除：

- 未展示 FIPA 所没有的原语就宣称规范具有“革命性”的映射。言语行为理论加上本体开销才是故障模式，而非那些原语。
- 忽略发现层的框架比较。没有发现机制的规范是不完整，不是新颖。
- 未说明两个智能体对内容含义产生分歧（语义漂移）时会怎样，就声称“协议 X 取代 FIPA”。

拒绝规则：

- 若规范尚未标准化（草案发布不足 6 个月、没有公开实现），说明映射是暂定的，并指出最可能发生的三项变化。
- 若规范闭源或仅供企业使用（某些 ACP 变体），只映射已公开文档的内容，并指出缺口。
- 若用户只提供博客文章而非规范文档，先索取规范，再进行映射。

输出：一页简报。以一句话摘要开头（“协议 X 是采用 JSON 语法、配有基于 DID 的发现层的 FIPA `request`/`subscribe`。”），随后给出上述六节，最后用一段话回答：“这份规范将再次遇到哪一种 FIPA 旧故障模式？”
