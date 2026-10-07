(function () {
  "use strict";
  const steps = [
    {
      label: "来源",
      detail: "保持来源段落和作者设定的规则可见。",
    },
    { label: "决策", detail: "应用已说明的确定性契约。" },
    { label: "审阅", detail: "用证据解释结果。" },
  ];
  const norm = (s) =>
    s
      .normalize("NFKC")
      .toLocaleLowerCase("en-US")
      .trim()
      .replace(/[.!?]+$/u, "")
      .replace(/\s+/gu, " ");
  window.AIFSProjectFigures.register("pj-source-grounded-study-coach-1", {
    title: "答案需要支持引文",
    steps,
    caption:
      "提问前，题卡集先校验精确的答案证据。 图表范围：前三图分别演示局部证据、字符串匹配和一次间隔计算，第四图使用固定三张卡片到期日，不读取实际题卡与答题日志。它不替代完整去重、版本迁移或页面事件回放。",
    lab: {
      controls: [
        {
          key: "source",
          label: "来源段落",
          type: "text",
          value: "Each packet records the harvest year.",
        },
        {
          key: "answer",
          label: "标准答案",
          type: "text",
          value: "harvest year",
        },
        {
          key: "start",
          label: "证据起点",
          type: "number",
          value: 0,
          min: 0,
          max: 1000,
        },
        {
          key: "end",
          label: "证据终点",
          type: "number",
          value: 37,
          min: 0,
          max: 1000,
        },
      ],
      calculate(v) {
        const bounds =
          Number.isInteger(v.start) &&
          Number.isInteger(v.end) &&
          v.start >= 0 &&
          v.end > v.start &&
          v.end <= v.source.length;
        const quote = bounds ? v.source.slice(v.start, v.end) : "";
        const valid = bounds && v.answer.trim() && quote.includes(v.answer);
        return {
          summary: valid
            ? "标准答案具有有效的来源位置。"
            : "拒绝该卡片：修正偏移量或答案证据。",
          metrics: [
            { label: "来源 UTF-16 长度", value: v.source.length },
            { label: "偏移量有效", value: bounds ? "yes" : "no" },
          ],
          rows: [
            ["引文", quote || "（无效区间）"],
            ["预期答案", v.answer],
          ],
          columns: ["字段", "文本"],
        };
      },
    },
  });
  window.AIFSProjectFigures.register("pj-source-grounded-study-coach-2", {
    title: "按精确答案契约评分",
    steps,
    caption:
      "正确的改写也可能需要人工审阅。本基线不评判任意语义。 图表范围：前三图分别演示局部证据、字符串匹配和一次间隔计算，第四图使用固定三张卡片到期日，不读取实际题卡与答题日志。它不替代完整去重、版本迁移或页面事件回放。",
    lab: {
      controls: [
        {
          key: "answer",
          label: "标准答案",
          type: "text",
          value: "paper envelopes",
        },
        {
          key: "response",
          label: "学习者响应",
          type: "text",
          value: " PAPER   ENVELOPES! ",
        },
        {
          key: "variant",
          label: "作者批准的变体",
          type: "text",
          value: "a paper envelope",
        },
      ],
      calculate(v) {
        const response = norm(v.response);
        const correct =
          Boolean(response) &&
          (response === norm(v.answer) ||
            (Boolean(v.variant.trim()) && response === norm(v.variant)));
        return {
          summary: correct
            ? "按明确的字符串匹配策略接受。"
            : "阅读来源，再与预期答案对比。",
          metrics: [{ label: "已接受", value: correct ? "yes" : "no" }],
          rows: [
            ["预期", norm(v.answer)],
            ["响应", response],
            ["已批准变体", norm(v.variant)],
          ],
          columns: ["比较", "规范化文本"],
        };
      },
    },
  });
  window.AIFSProjectFigures.register("pj-source-grounded-study-coach-3", {
    title: "计算下次复习日期",
    steps,
    caption:
      "这是可见的教学策略。答对与否改变复习间隔，但不能证明学习质量。 图表范围：前三图分别演示局部证据、字符串匹配和一次间隔计算，第四图使用固定三张卡片到期日，不读取实际题卡与答题日志。它不替代完整去重、版本迁移或页面事件回放。",
    lab: {
      controls: [
        {
          key: "box",
          label: "当前分盒",
          type: "range",
          value: 1,
          min: 0,
          max: 5,
        },
        {
          key: "correct",
          label: "答案已接受",
          type: "checkbox",
          value: true,
        },
        {
          key: "date",
          label: "答题日期",
          type: "text",
          value: "2026-09-02",
        },
      ],
      calculate(v) {
        const time = Date.parse(v.date + "T00:00:00Z");
        const valid =
          /^\d{4}-\d{2}-\d{2}$/.test(v.date) &&
          Number.isFinite(time) &&
          new Date(time).toISOString().slice(0, 10) === v.date;
        if (!valid)
          return { summary: "拒绝无效日期。", metrics: [] };
        const box = v.correct ? Math.min(5, v.box + 1) : 0;
        const interval = v.correct ? 2 ** (box - 1) : 1;
        return {
          summary:
            "下次到期：" +
            new Date(time + interval * 86400000).toISOString().slice(0, 10),
          metrics: [
            { label: "下一分盒", value: box },
            { label: "间隔天数", value: interval },
          ],
          bars: [{ label: "复习间隔", value: interval, max: 16 }],
        };
      },
    },
  });
  window.AIFSProjectFigures.register("pj-source-grounded-study-coach-4", {
    title: "选择报告的到期队列",
    steps,
    caption:
      "每张练习卡片都能查看来源段落。页面在本地记录实际输入，下载答题日志供下一次 CLI 运行使用。 图表范围：前三图分别演示局部证据、字符串匹配和一次间隔计算，第四图使用固定三张卡片到期日，不读取实际题卡与答题日志。它不替代完整去重、版本迁移或页面事件回放。",
    lab: {
      controls: [
        {
          key: "day",
          label: "9 月报告日期",
          type: "range",
          value: 3,
          min: 1,
          max: 10,
        },
      ],
      calculate(v) {
        const rows = [
          ["sorting", 1],
          ["harvest-year", 3],
          ["storage", 4],
        ].map(([id, day]) => [
          id,
          "2026-09-" + String(day).padStart(2, "0"),
          v.day >= day ? "due" : "later",
        ]);
        const count = rows.filter((r) => r[2] === "due").length;
        return {
          summary: `显示 ${count} 张到期卡片，报告日期为 9 月 ${v.day} 日。`,
          metrics: [
            { label: "到期卡片", value: count },
            { label: "未到期卡片", value: 3 - count },
          ],
          rows,
          columns: ["卡片", "到期日期", "队列"],
        };
      },
    },
  });
})();
