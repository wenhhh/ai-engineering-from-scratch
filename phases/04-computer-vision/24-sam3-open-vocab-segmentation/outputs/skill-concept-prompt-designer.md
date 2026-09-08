---
name: skill-concept-prompt-designer
description: 将用户表述转换为格式合适的 SAM 3 概念提示，涵盖拆分、消歧和回退
version: 1.0.0
phase: 4
lesson: 24
tags: [sam3, open-vocab, prompt-engineering, segmentation]
---

# 概念提示设计器（Concept Prompt Designer）

SAM 3 的准确率很大程度上取决于概念提示的措辞。本技能将自由形式的用户表述规范化为 SAM 3 善于处理的提示。

## 适用场景（When to use）

- 构建接受自然语言对象查询的用户界面。
- 通过应用程序编程接口（Application Programming Interface，API）提供 SAM 3，上游调用方发送完整句子。
- 排查 SAM 3 匹配不佳的问题：往往是提示格式不合适，而非模型本身有问题。

## 输入（Inputs）

- `utterance`：用户原始字符串。
- `context`：可选的领域提示，例如“监控”“医疗”“零售”。
- `max_concepts`：每条表述最多提取的概念数，默认 5。

## SAM 3 偏好的规则（Rules SAM 3 prefers）

- **使用简短名词短语，而非句子。** `"cat"` 优于 `"there is a cat"`。
- **使用具体名词。** `"skateboard"` 优于 `"thing to ride on"`。
- **修饰语紧挨在名词前。** `"red car"` 优于 `"car that is red"`。
- **使用小写。** SAM 3 虽然稳健，但实验中小写输入略好。
- **单复数均可。** 两者都能使用；预期有多个实例时，复数形式有帮助。

## 步骤（Steps）

1. **按常见分隔符切分**：逗号、分号、“and”“or”“&”。
2. **去除填充前缀**：“find”“show me”“segment”“detect”“locate”“a”“an”“the”。
3. **仅保留可见的介词修饰信息**：`"striped red umbrella"` 可以，`"umbrella from yesterday"` 不行，因为 `"from yesterday"` 不体现在图像中。
4. 使用可选 `context` **消除歧义**：
   - 监控语境中的 `"window"` → `"building window"`。
   - 医疗语境中的 `"window"` 通常有问题，建议用户澄清。
5. 如果拆分未得到概念，*且*表述包含至少一个具体名词，则**回退**到原始字符串。如果提取不到具体名词，不要输出概念；仅返回警告并请用户澄清，参见规则。
6. **以 `max_concepts` 为上限。** 如果提取数量超过调用方要求，按表述顺序保留前 `max_concepts` 个，其余放入 `dropped`，原因为 `"exceeded max_concepts"`。用户粘贴长列表时，这能限制延迟。

## 输出格式（Output format）

```
[designed prompts]
  utterance:    <原始表述>
  concepts:     ["concept_1", "concept_2", ...]
  dropped:      ["filler_1", ...]
  warnings:     ["概念过于抽象", "可能匹配很多类别", ...]

[sam3 calls]
  对每个概念运行：sam3.detect(image, concept)
  合并输出，为每条检测保留独立概念标签。
```

## 示例（Examples）

```
in:  "can you find me a cat or two dogs?"
out: ["cat", "dogs"]
dropped: ["can you find me", "a", "or two", "?"]
note: 保留 "dogs" 的复数形式，因为表述是 "two dogs"，应保留复数提示。

in:  "segment the big red truck and the blue sedan"
out: ["big red truck", "blue sedan"]
dropped: ["segment", "the", "and"]

in:  "thing near the door"
out: ["door"]
warnings: ["'thing' 对 SAM 3 而言过于抽象；已回退到 'door'"]

in:  "striped red umbrella, green hat, pink balloon"
out: ["striped red umbrella", "green hat", "pink balloon"]
```

## 规则（Rules）

- 不要向 SAM 3 传入超过 8 个单词的句子；超过此长度准确率会下降。
- 如果表述中没有可提取的具体名词，不要运行 SAM 3；返回警告并请求澄清。
- 不要按引号内的标点拆分；带引号的 `"black and white cat"` 应保留为一个概念。
- 始终记录原始表述及派生概念，便于生产调试。
