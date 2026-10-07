(function () {
  "use strict";
  const controls = [
    { key: "question", label: "问题", type: "text", value: "cache expire" },
    {
      key: "text",
      label: "来源文本",
      type: "text",
      value: "Cache entries expire after sixty seconds. Bananas are yellow.",
    },
    {
      key: "quote",
      label: "候选引文",
      type: "text",
      value: "Bananas are yellow.",
    },
    {
      key: "size",
      label: "文本块字符数",
      type: "range",
      value: 35,
      min: 10,
      max: 150,
      step: 1,
    },
    {
      key: "overlap",
      label: "文本块重叠量",
      type: "range",
      value: 5,
      min: 0,
      max: 30,
      step: 1,
    },
  ];
  const calculate = function (v, stepIndex) {
    const words = (s) => new Set(s.toLowerCase().match(/\w+/g) || []);
    const terms = words(v.question),
      qwords = words(v.quote),
      matches = [...terms].filter((x) => qwords.has(x)).length;
    const offset = v.text.indexOf(v.quote),
      valid = offset >= 0 && v.quote.trim().length > 0;
    if (v.overlap >= v.size)
      return {
        summary: "拒绝大于或等于文本块大小的重叠量",
        metrics: [],
        bars: [],
      };
    const chunks = [];
    for (let start = 0; start < v.text.length; start += v.size - v.overlap) {
      const end = Math.min(v.text.length, start + v.size);
      chunks.push([start, end, v.text.slice(start, end)]);
      if (end === v.text.length) break;
    }
    return {
      summary: !valid
        ? "拒绝缺少来源支持的引文"
        : matches === 0
          ? "存在逐字引文，但与问题的相关性仍需审阅"
          : "逐字引文与查询词存在重叠",
      metrics: [
        { label: "引文起点", value: offset },
        { label: "有对应词的查询词数", value: matches },
      ],
      bars: [
        { label: "匹配查询词数", value: matches, max: terms.size || 1 },
      ],
      columns: ["start", "end", "chunk"],
      rows: chunks,
    };
  };
  window.AIFSProjectFigures.register(
    "pj-doc-qa-with-citations-1",
    Object.assign(
      {
        title: "加载本地文档并保留稳定来源",
        steps: [
          {
            label: "输入",
            detail:
              "检索前先保留来源标识、内容哈希和精确偏移量。",
          },
          {
            label: "处理",
            detail:
              "检索前先保留来源标识、内容哈希和精确偏移量。字符窗口是刻意保持简单的基线：重叠可保留边界附近的上下文，但不会创造新证据。加载器拒绝指向根目录之外的符号链接，防止文档扫描在不知情的情况下读取其他目录。",
          },
          {
            label: "验证",
            detail:
              "size=4、overlap=1 时，abcdef 的第二个重叠文本块从偏移量 3 开始。 图表限制：此 JavaScript 示例按 UTF-16 位置切片，并使用 ASCII 词匹配；Python 正文实现按 Unicode 字符切片和分词。emoji 或中文输入时不可将两者的位置与分数直接对等。",
          },
        ],
        caption:
          "size=4、overlap=1 时，abcdef 的第二个重叠文本块从偏移量 3 开始。 图表限制：此 JavaScript 示例按 UTF-16 位置切片，并使用 ASCII 词匹配；Python 正文实现按 Unicode 字符切片和分词。emoji 或中文输入时不可将两者的位置与分数直接对等。",
      },
      { lab: { controls, calculate } },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-doc-qa-with-citations-2",
    Object.assign(
      {
        title: "用可检查的关键词分数排列文本块",
        steps: [
          {
            label: "输入",
            detail:
              "词频通过对数抑制重复增益，文档频率降低常见词权重。",
          },
          {
            label: "处理",
            detail:
              "词频通过对数抑制重复出现带来的增益，文档频率降低常见词的权重。返回分数时保留完整文本块契约，不能只返回文本，因为下一阶段需要来源偏移量。这种词汇基线会漏掉同义词；接入嵌入服务前，先测量其表现。",
          },
          {
            label: "验证",
            detail:
              "查询 socket 时选中对应文本块，遇到未知词则放弃作答。 图表限制：此 JavaScript 示例按 UTF-16 位置切片，并使用 ASCII 词匹配；Python 正文实现按 Unicode 字符切片和分词。emoji 或中文输入时不可将两者的位置与分数直接对等。",
          },
        ],
        caption:
          "查询 socket 时选中对应文本块，遇到未知词则放弃作答。 图表限制：此 JavaScript 示例按 UTF-16 位置切片，并使用 ASCII 词匹配；Python 正文实现按 Unicode 字符切片和分词。emoji 或中文输入时不可将两者的位置与分数直接对等。",
      },
      { lab: { controls, calculate } },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-doc-qa-with-citations-3",
    Object.assign(
      {
        title: "只接受检索区间能够支持的回答",
        steps: [
          {
            label: "输入",
            detail:
              "要求模型选择逐字引文和来源 id，再分别校验。",
          },
          {
            label: "处理",
            detail:
              "要求模型选择逐字引文和来源 id，然后分别校验。引文子串提供可核对的区间，但不能保证来源本身真实。检索为空时明确放弃作答，不调用模型。以后若加入改写回答的生成器，需要另行设计证据支持门禁。",
          },
          {
            label: "验证",
            detail:
              "模型回复包含被引用文本块中不存在的文字时，拒绝该回复。 图表限制：此 JavaScript 示例按 UTF-16 位置切片，并使用 ASCII 词匹配；Python 正文实现按 Unicode 字符切片和分词。emoji 或中文输入时不可将两者的位置与分数直接对等。",
          },
        ],
        caption:
          "模型回复包含被引用文本块中不存在的文字时，拒绝该回复。 图表限制：此 JavaScript 示例按 UTF-16 位置切片，并使用 ASCII 词匹配；Python 正文实现按 Unicode 字符切片和分词。emoji 或中文输入时不可将两者的位置与分数直接对等。",
      },
      { lab: { controls, calculate } },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-doc-qa-with-citations-4",
    Object.assign(
      {
        title: "使用框架切分器并保留偏移量",
        steps: [
          {
            label: "输入",
            detail:
              "适配器保留从零实现的检索器与回答校验器。",
          },
          {
            label: "处理",
            detail:
              "适配器保留从零实现的检索器与回答校验器。可选 LangChain 路径提供递归切分和模拟模型接口，再将每个文本块映射回精确来源偏移量。切分器若改写文本，应拒绝结果，不能编造来源。处理重复且重叠的子串时，搜索游标只向前移动一个位置，不能跳过整个文本块长度。",
          },
          {
            label: "验证",
            detail:
              "将框架生成的文本块转换为基础实现采用的同一来源区间契约。 图表限制：此 JavaScript 示例按 UTF-16 位置切片，并使用 ASCII 词匹配；Python 正文实现按 Unicode 字符切片和分词。emoji 或中文输入时不可将两者的位置与分数直接对等。",
          },
        ],
        caption:
          "将框架生成的文本块转换为基础实现采用的同一来源区间契约。 图表限制：此 JavaScript 示例按 UTF-16 位置切片，并使用 ASCII 词匹配；Python 正文实现按 Unicode 字符切片和分词。emoji 或中文输入时不可将两者的位置与分数直接对等。",
      },
      { lab: { controls, calculate } },
    ),
  );
})();
