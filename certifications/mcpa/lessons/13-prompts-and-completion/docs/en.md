# 提示词模板与参数补全（Prompt Templates and Argument Completion）

> 提示词由服务器编写成模板，用户主动选择运行。选中它的人应清楚知道这份模板会做什么。

**Type:** Reference
**Languages:** Python
**Prerequisites:** 第 12 课
**Time:** ~45 分钟

## 学习目标（Learning Objectives）

- 解释提示词为何由用户控制，并区分模型控制的工具原语与应用驱动的资源原语
- 读懂 `prompts/list` 和 `prompts/get` 的请求与结果，包括参数、分页游标和缓存提示
- 用文本及资源链接构建 `PromptMessage` 内容，并将调用方提供的参数代入模板
- 遇到未知提示词名称、缺少必需参数或无法识别的分页游标时，返回 `-32602`
- 使用带 `ref/prompt` 和 `ref/resource` 引用的 `completion/complete`，理解 `context.arguments`、100 个候选值上限和 `hasMore`

## 问题（The Problem）

允许用户输入斜杠命令的宿主，需要保存这些命令展开后的文本。它可以在客户端硬编码少数模板，但每增加一个模板都要发布客户端，不同宿主也难以共享同一套内容。它也可以让模型每次生成措辞，但团队精心编写、审阅后希望统一复用的提示词，就会在每次运行中发生不同程度的漂移。

MCP 将文本放在服务器，提供专为这类内容设计的原语：用户主动选择，并带有具名参数，宿主可据此生成表单。拥有领域知识的服务器，例如负责代码评审策略、事故操作手册或发布公告的服务器，同时负责模板措辞。任何支持 MCP 的客户端都能列出可用模板、向用户展示、收集参数，并按相同方式渲染。用户通常通过菜单或斜杠命令选择，但协议不强制具体界面。协议固定的是契约：用户决定何时运行提示词，其内容由服务器提供，无须由客户端提前打包。

紧随其后还有一个较小的问题：模板有多个参数后，手动填写既慢又容易出错。`completion/complete` 允许服务器在用户输入过程中建议候选值，并让后续建议参考之前已经填写的答案。

## 概念（The Concept）

首先理解控制模型，因为它决定了这一原语的其他行为。工具由模型控制，模型决定何时调用；资源由应用驱动，宿主决定哪些内容进入上下文；提示词由用户控制，用户显式选择一个模板，常见形式是宿主提供的斜杠命令菜单。服务器仍负责模板文字、参数及渲染出的消息。“控制”指决定运行时机的角色，与编写内容的角色不同。

支持这一原语的服务器在 `server/discover` 结果的 `capabilities` 中声明 `prompts: {"listChanged": true}`，并响应 `prompts/list`。结果包含 `resultType: "complete"` 和 `prompts` 数组。由于 `prompts/list` 属于六种可缓存操作，完整结果还包含整数 `ttlMs`，以及取值为 `"public"` 或 `"private"` 的 `cacheScope`。列表支持分页：请求携带不透明 `cursor`，尚有后续页时结果携带不透明 `nextCursor`。服务器从未签发的游标必须返回 `-32602` Invalid params，不能静默忽略；无效或缺失提示词名称同样使用这一代码。

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "prompts/list",
  "params": {
    "_meta": {
      "io.modelcontextprotocol/protocolVersion": "2026-07-28",
      "io.modelcontextprotocol/clientCapabilities": {}
    }
  }
}
```

`prompts` 中每个条目给出模板名称及其 `arguments`；每个参数含 `name`、`description` 和 `required` 标志。客户端在用户开始输入之前，就能据此生成表单。解析模板时，客户端发送 `prompts/get`，提供 `name` 和字符串值构成的 `arguments` 映射。这里需要注意与工具原语的差别：提示词不执行动作，只渲染内容，因此没有 `isError` 错误通道。未知提示词名称和缺少必需参数，都返回普通 JSON-RPC 错误 `-32602`，不能当作等待模型修补的部分结果。2026-07-28 也允许 `prompts/get` 返回 `InputRequiredResult`，在还需要一个答案才能完成渲染时，采用与 tools/call 相同的无状态多轮往返结构；本路线后续会专门介绍该机制。

成功的 `prompts/get` 返回 `messages`，每条包含取值为 `"user"` 或 `"assistant"` 的 `role` 和一个内容块。最常见的是 `text`，其中参数已经代入模板文字。消息也可以包含 `resource_link`，通过 `uri`、`name` 和 `mimeType` 指向资源而不嵌入字节，适用于评审应引用但不应重复复制的风格指南或操作手册。内容足够小时，也可以直接嵌入 `resource` 块，包含资源的 `uri`、`mimeType`，以及 `text` 或 base64 `blob`。这三类内容都接受与资源相同的 `audience` 和 `priority` 注解。

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "resultType": "complete",
    "description": "Code review request template",
    "messages": [
      {
        "role": "user",
        "content": {
          "type": "text",
          "text": "Review this python snippet for style and correctness. Follow flask community conventions where they apply."
        }
      },
      {
        "role": "user",
        "content": {
          "type": "resource_link",
          "uri": "file:///styleguides/python.md",
          "name": "python-style-guide.md",
          "mimeType": "text/markdown"
        }
      }
    ]
  }
}
```

手动填写多个参数较为繁琐，因此声明 `completions: {}` 能力的服务器会响应 `completion/complete`。请求通过 `ref` 指明补全对象：提示词参数使用 `{"type": "ref/prompt", "name": "code_review"}`，资源模板变量使用 `{"type": "ref/resource", "uri": "file:///src/{path}"}`。请求还携带正在输入的 `argument`，其结构为 `{"name": ..., "value": ...}`，以及可选 `context.arguments` 映射，记录同一表单中此前已经填写的参数名和值。补全结果最多列出 100 个 `values`。实际匹配更多时，返回完整 `total` 并将 `hasMore` 设为 true，让客户端知道列表被截断，尚未穷尽。`prompts/get` 和 `completion/complete` 都不属于六种可缓存操作，因此结果不携带 `ttlMs` 或 `cacheScope`。这是容易混淆的考试点：此处的缓存提示适用于稳定列表，不适用于随参数变化的渲染与补全答案。

```json
{
  "jsonrpc": "2.0",
  "id": 9,
  "result": {
    "resultType": "complete",
    "completion": {
      "values": ["falcon", "fastapi"],
      "total": 2,
      "hasMore": false
    }
  }
}
```

用第一个参数缩小第二个参数的候选范围，正是 `context.arguments` 的价值。没有它，服务器只能依据当前前缀匹配字母，无论用户此前选了哪种语言，所有前缀相符的候选都可能出现。有了包含 `{"language": "python"}` 的 `context.arguments`，服务器给出框架建议时，就能排除 JavaScript 和 Java 的框架，只返回真正适用的选项。补全候选与工具注解一样只是建议，不提供访问控制。用户最终提交内容时，客户端仍需按照提示词自身规则校验。

2026-07-28 之前，`prompts/list` 等列表结果并无必需缓存字段。双时代客户端若从旧版对端收到既无 `ttlMs` 也无 `cacheScope` 的 `prompts/list`，应将它视为不缓存、仅本次使用的答案，不能自行假定默认有效期。

```figure
mcpa-13-prompt-template
```

## 交互实验（Interactive Lab）

图左侧跟踪一次 `prompts/get`：模板的 `{language}` 和 `{framework}` 占位符、本次调用提供的参数，以及最终渲染文本。右侧针对 `framework`，用相同前缀执行两次 `completion/complete`：第一次不带 `context.arguments`，第二次则告诉服务器用户已经选择的语言。第二次候选减少，因为服务器可以排除不属于该语言的框架。两侧都不显示缓存提示，因为 `prompts/get` 和 `completion/complete` 均不携带它。

## 实践实验（Practice Lab）

打开 `code/main.py`。它是仅使用标准库的提示词服务器，提供 `code_review` 和 `bug_triage` 两个模板，每页列一个，使 `prompts/list` 真正演示 cursor 和 `nextCursor` 分页。一个含 144 条源文件路径的合成目录支撑 `ref/resource` 补全，因此 100 个候选上限和 `hasMore` 来自实际超过上限的匹配数量，并非预设标志。

```bash
python3 code/main.py
```

将交互输出与概念部分对照。找到前两次 `prompts/list`：第二次使用第一次的 `nextCursor`，返回剩余模板且不再包含 `nextCursor`，表示列表结束。第三次 `prompts/list` 发送从未签发的游标，得到 `-32602`。再找针对 `code_review` 的 `prompts/get`：结果含两条消息，一条 `text` 已代入 `python` 和 `flask`，另一条 `resource_link` 指向评审应引用的风格指南。之后两个失败 `prompts/get` 调用分别完全不提供参数、指定不存在的模板，均返回 `-32602`。最后比较两次 `framework` 补全：不带 `context` 时返回三个匹配，其中一个属于 JavaScript；将 `context.arguments` 设为 `{"language": "python"}` 后，只剩两个 Python 框架。末尾两次补全 `ref/resource` 的路径参数：空前缀返回 144 条路径中的 100 条，`hasMore` true；前缀 `auth/` 返回全部 18 条，`hasMore` false。修改前缀或增加第三个模板后重跑，观察分页与补全随数据变化。

## 交付物（Shipped Artifact）

`outputs/prompt-and-completion-reference.md` 提供提示词与补全的一页参考：请求及结果结构、`PromptMessage` 可携带的内容类型、错误表，以及补全引用类型和数量上限。审查服务器时，可快速检查 `prompts/get` 错误处理，以及 `completion/complete` 的上限和 `hasMore` 行为。

## 验证结果（Verify It）

在本课目录运行测试：

```bash
python3 -m unittest discover code/tests
```

测试验证以下主张：`prompts/list` 支持分页并携带缓存提示；无法识别的游标被拒；`prompts/get` 将参数代入文本并附加资源链接；缺少必需参数与未知模板名都返回 `-32602`；补全最多返回 100 个值，有更多候选时设置 `hasMore`；缩小前缀后匹配数量降至上限以下；`context.arguments` 确实减少候选集合；场景中的每个请求都携带协议元数据。仓库报文检查器还依据 2026-07-28 规则验证同一记录：

```bash
python3 scripts/check_mcpa_wire.py certifications/mcpa/lessons/13-prompts-and-completion
```

## 与综合实践的联系（Capstone Connection）

综合实践会发现服务器、调用工具并处理同意授权。更贴近实际的宿主，还应让用户选择审阅过的模板，减少自由输入，并在填写时提供补全。当需要解释某次交互为何使用提示词而非工具时，应从控制方出发：用户主动选择，服务器负责编写措辞，渲染本身不承担工具调用那样的动作与状态变更。

## 关键术语（Key Terms）

| 术语（Term） | 含义（Meaning） |
|------|---------|
| 提示词（Prompt） | 由服务器编写、用户选择，包含具名参数的消息模板 |
| `prompts/list` | 返回当前调用方可见提示词的可缓存分页请求 |
| `prompts/get` | 将参数代入并渲染指定提示词消息的请求 |
| `PromptMessage` | 一个 `role` 加一个内容块，可为文本、图像、音频、资源链接或嵌入资源 |
| `resource_link` | 通过 URI 指向资源，不内联资源字节的内容块 |
| `completion/complete` | 为某个提示词参数或资源模板参数返回排序建议的请求 |
| `ref/prompt` | 按提示词名称指明待补全参数所属模板的引用 |
| `ref/resource` | 按资源 URI 或模板指明补全对象的引用 |
| `context.arguments` | 客户端提交的已确定参数值，用于缩小后续补全范围 |
| `hasMore` | 实际 `total` 超过 100 个候选上限时设为 true 的补全标志 |

## 延伸阅读（Further Reading）

- [MCP 规范 2026-07-28：提示词（Prompts）](https://modelcontextprotocol.io/specification/2026-07-28/server/prompts)
- [MCP 规范 2026-07-28：补全（Completion）](https://modelcontextprotocol.io/specification/2026-07-28/server/utilities/completion)
- `certifications/mcpa/research/mcp-2026-07-28-brief.md`，第 10 节
- `phases/13-tools-and-protocols/10-mcp-resources-and-prompts`，深入实现资源与提示词原语
