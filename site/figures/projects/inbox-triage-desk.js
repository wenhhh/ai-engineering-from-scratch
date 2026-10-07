(function () {
  "use strict";
  const steps = [
    { label: "输入", detail: "检查原始邮件数据。" },
    { label: "规则", detail: "应用明确契约。" },
    { label: "证据", detail: "让结果可以检查。" },
  ];
  window.AIFSProjectFigures.register("pj-inbox-triage-desk-1", {
    title: "邮件解析后保留哪些信息？",
    steps,
    caption:
      "编辑纯文本邮件字段。MIME 解码在 Python 中实现；本实验检查解析后的记录。",
    lab: {
      controls: [
        {
          key: "sender",
          label: "发件地址",
          type: "text",
          value: "mira@example.invalid",
        },
        {
          key: "body",
          label: "纯文本正文",
          type: "text",
          value: "Could you print six table labels?",
        },
        {
          key: "hasId",
          label: "邮件具有 ID",
          type: "checkbox",
          value: true,
        },
      ],
      calculate(v) {
        const valid = /^[^\s@]+@[^\s@]+$/.test(v.sender);
        return {
          summary: valid
            ? "保留正文及对应邮件标识。"
            : "在分类前拒绝该记录。",
          metrics: [
            {
              label: "正文字节数",
              value: new TextEncoder().encode(v.body).length,
            },
            {
              label: "标识",
              value: v.hasId
                ? "邮件提供的 Message-ID"
                : "需要摘要后备标识",
            },
          ],
          rows: [
            ["sender", v.sender],
            ["text", v.body],
            ["body_status", v.body.trim() ? "plain" : "no-plain-body"],
          ],
          columns: ["字段", "解析后的值"],
        };
      },
    },
  });
  window.AIFSProjectFigures.register("pj-inbox-triage-desk-2", {
    title: "规则命中提供证据，但不能确定结论",
    steps,
    caption:
      "类别冲突时归为 uncertain（待确认）。修改邮件，检查精确匹配短语。 图表限制：此 JavaScript 短语实验使用 ASCII 单词边界及 UTF-16 偏移量；Python 实现使用 Unicode 单词边界和字符偏移量。中文邻接或 emoji 前缀可能导致匹配或位置不同。",
    lab: {
      controls: [
        {
          key: "text",
          label: "邮件正文",
          type: "text",
          value: "Please confirm. For your information, the room changed.",
        },
      ],
      calculate(v) {
        const rules = {
          action: ["please", "can you", "could you", "confirm"],
          information: ["for your information", "newsletter", "receipt"],
        };
        const hits = [];
        for (const [category, phrases] of Object.entries(rules))
          for (const phrase of phrases) {
            const match = new RegExp("(?<!\\w)" + phrase + "(?!\\w)", "i").exec(
              v.text,
            );
            if (match) hits.push([category, match[0], String(match.index)]);
          }
        const categories = new Set(hits.map((h) => h[0]));
        const category =
          categories.size === 1 ? [...categories][0] : "uncertain";
        return {
          summary:
            category + " 队列；每项分类仍需审阅。",
          metrics: [
            { label: "命中类别数", value: categories.size },
            {
              label: "优先级",
              value: { action: 0, uncertain: 1, information: 2 }[category],
            },
          ],
          rows: hits.length ? hits : [["uncertain", "没有匹配的短语", ""]],
          columns: ["类别", "来源引文", "起点偏移量"],
        };
      },
    },
  });
  window.AIFSProjectFigures.register("pj-inbox-triage-desk-3", {
    title: "拟稿前校验引文",
    steps,
    caption:
      "具体承诺留给人工填写。虚构引文会使建议被拒绝。",
    lab: {
      controls: [
        {
          key: "source",
          label: "来源正文",
          type: "text",
          value: "Please bring two folding chairs.",
        },
        {
          key: "quote",
          label: "候选证据引文",
          type: "text",
          value: "two folding chairs",
        },
        {
          key: "sameMessage",
          label: "决策的邮件 ID 匹配",
          type: "checkbox",
          value: true,
        },
      ],
      calculate(v) {
        const found = v.quote.length > 0 && v.source.includes(v.quote);
        const valid = found && v.sameMessage;
        return {
          summary: valid
            ? "生成未发送草稿，并保留可编辑的回复占位位置。"
            : "拒绝该决策：标识和逐字证据必须同时匹配。",
          metrics: [
            { label: "找到引文", value: found ? "yes" : "no" },
            { label: "已发送邮件数", value: 0 },
          ],
          rows: [
            ["来源", v.source],
            ["草稿回复", "[请在此填写并检查回复。]"],
          ],
          columns: ["记录", "文本"],
        };
      },
    },
  });
  window.AIFSProjectFigures.register("pj-inbox-triage-desk-4", {
    title: "构建审阅队列",
    steps,
    caption:
      "数量变化会改变队列与草稿总数。类别始终与线程标识分开。",
    lab: {
      controls: [
        {
          key: "action",
          label: "行动请求邮件数",
          type: "range",
          value: 3,
          min: 0,
          max: 20,
        },
        {
          key: "uncertain",
          label: "待确认邮件数",
          type: "range",
          value: 2,
          min: 0,
          max: 20,
        },
        {
          key: "information",
          label: "信息类邮件数",
          type: "range",
          value: 5,
          min: 0,
          max: 20,
        },
      ],
      calculate(v) {
        const rows = ["action", "uncertain", "information"].map((key, i) => [
          String(i),
          key,
          String(v[key]),
        ]);
        const count = v.action + v.uncertain + v.information;
        return {
          summary: `导出 ${count} 条审阅记录和 ${count} 份未发送草稿。`,
          metrics: [
            { label: "草稿文件数", value: count },
            { label: "已发送邮件数", value: 0 },
          ],
          bars: rows.map((r) => ({
            label: r[1],
            value: Number(r[2]),
            max: 20,
          })),
          rows,
          columns: ["优先级", "类别", "邮件数"],
        };
      },
    },
  });
})();
