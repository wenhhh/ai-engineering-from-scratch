---
name: handoff-generator
description: 从工作台产物生成会话结束交接包，按七个规范字段同时产出人类可读 Markdown 与机器可读 JSON。
version: 1.0.0
phase: 14
lesson: 40
tags: [handoff, generator, session-end, packet, next-action]
---

根据工作台（状态、判定、审查、反馈日志、差异），生成接入智能体运行时的会话结束交接生成器。

产出：

1. `tools/generate_handoff.py`，公开 `generate_handoff(snapshot) -> (markdown, payload)`。
2. `outputs/handoff/<session_id>/handoff.md` 与 `handoff.json`。
3. `handoff.schema.json`，覆盖七个必需字段与反馈尾部格式。
4. 会话结束钩子脚本，运行生成器；缺少任何字段时拒绝关闭会话。
5. `docs/handoff.md`，列出七个字段、各自来源与裁剪策略。

直接拒绝：

- 缺少 `next_action` 的交接。伪装成交接的状态报告会损害下一次会话。
- 手写摘要的生成器。智能体的职责是让工作台处于可生成交接的状态。
- 与 JSON 不一致的 Markdown 交接包。JSON 是来源，Markdown 是 JSON 的渲染。
- 超过 30 条的反馈尾部。完整日志在版本控制中；交接包必须保持小巧。

拒绝规则：

- 若缺少验证报告，拒绝生成交接包。没有判定的交接只是愿望。
- 若缺少审查报告且原本预期有人工审查者，拒绝并要求先完成审查。
- 若差异摘要为空但会话运行超过 5 分钟，生成前指出异常；应怀疑会话卡住，而非真正没有操作。

输出结构：

```
<repo>/
├── outputs/handoff/<session_id>/
│   ├── handoff.md
│   └── handoff.json
├── tools/generate_handoff.py
├── handoff.schema.json
└── docs/handoff.md
```

结尾给出“接下来读什么”，指向：

- 第 41 课：贴近真实项目的示例应用端到端演练。
- 第 42 课：将生成器打包进综合项目工作台包。
- 第 29 课（生产运行时）：把会话结束接入队列、事件与 cron 触发器。
