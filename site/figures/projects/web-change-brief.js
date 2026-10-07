(function () {
  "use strict";
  const steps = [
    {
      label: "快照",
      detail: "保留声明的来源和提取策略。",
    },
    { label: "计算", detail: "应用有边界且可检查的转换。" },
    { label: "报告", detail: "保留精确变化证据。" },
  ];
  const blocks = (s) =>
    s
      .split("|")
      .map((x) => x.trim().replace(/\s+/g, " "))
      .filter(Boolean);
  const diff = (a, b) => {
    const left = new Map(),
      right = new Map();
    for (const x of a) left.set(x, (left.get(x) || 0) + 1);
    for (const x of b) right.set(x, (right.get(x) || 0) + 1);
    let common = 0;
    const rows = [];
    for (const x of [...new Set([...a, ...b])].sort()) {
      const l = left.get(x) || 0,
        r = right.get(x) || 0;
      common += Math.min(l, r);
      rows.push([
        x,
        String(l),
        String(r),
        r > l ? "added " + (r - l) : l > r ? "removed " + (l - r) : "unchanged",
      ]);
    }
    return { rows, common };
  };
  window.AIFSProjectFigures.register("pj-web-change-brief-1", {
    title: "明确过滤可读文本块",
    steps,
    caption:
      "用 | 分隔已提取块。本实验展示 HTML 扫描之后的短语过滤。",
    lab: {
      controls: [
        {
          key: "text",
          label: "以 | 分隔的已提取块",
          type: "text",
          value: "Community workshop | Updated today 15:00 | Bring a mug",
        },
        {
          key: "ignore",
          label: "忽略短语",
          type: "text",
          value: "updated today",
        },
      ],
      calculate(v) {
        const input = blocks(v.text),
          phrase = v.ignore.trim().toLowerCase();
        const kept = input.filter(
          (x) => !phrase || !x.toLowerCase().includes(phrase),
        );
        return {
          summary: `保留 ${kept.length} 个块，原有 ${input.length} 个可读块。`,
          metrics: [
            { label: "移除块数", value: input.length - kept.length },
          ],
          rows: input.map((x) => [x, kept.includes(x) ? "kept" : "filtered"]),
          columns: ["文本块", "决策"],
        };
      },
    },
  });
  window.AIFSProjectFigures.register("pj-web-change-brief-2", {
    title: "统计文本出现次数，不只检查是否存在",
    steps,
    caption:
      "用 | 分隔文本块。重排不算文本变化，但重复次数变化需要记录。",
    lab: {
      controls: [
        {
          key: "before",
          label: "此前块数",
          type: "text",
          value: "A | A | B",
        },
        {
          key: "after",
          label: "之后块数",
          type: "text",
          value: "A | B | C",
        },
      ],
      calculate(v) {
        const a = blocks(v.before),
          b = blocks(v.after),
          r = diff(a, b);
        return {
          summary: `共有 ${r.common} 次文本块出现保持不变。`,
          metrics: [
            { label: "此前块数", value: a.length },
            { label: "之后块数", value: b.length },
          ],
          rows: r.rows,
          columns: ["精确文本", "此前次数", "之后次数", "变化"],
        };
      },
    },
  });
  window.AIFSProjectFigures.register("pj-web-change-brief-3", {
    title: "不要将失败获取当作基线",
    steps,
    caption:
      "HTTP 成功、受支持媒体、大小和取消分别构成门禁。 译注：实际 CLI 无条件把新快照写到输出目录的 baseline.json。若 --out 与已有 --baseline 的目录相同，即使没有 --accept，也会覆盖该基线。使用不同的新输出目录；本问题按上游原行为保留，未通过翻译修改。",
    lab: {
      controls: [
        {
          key: "status",
          label: "HTTP 状态",
          type: "select",
          value: "200",
          options: [
            { value: "200", label: "200 OK" },
            { value: "503", label: "503 Unavailable" },
            { value: "404", label: "404 Not found" },
          ],
        },
        {
          key: "bytes",
          label: "响应字节数",
          type: "number",
          value: 125000,
          min: 0,
          max: 4000000,
          step: 1000,
        },
        {
          key: "html",
          label: "HTML 内容类型（Content-Type）",
          type: "checkbox",
          value: true,
        },
        {
          key: "cancelled",
          label: "请求已取消",
          type: "checkbox",
          value: false,
        },
      ],
      calculate(v) {
        const checks = [
          ["状态 200", v.status === "200"],
          ["HTML 类型", v.html],
          ["最多 2 MB", v.bytes <= 2000000],
          ["未取消", !v.cancelled],
        ];
        const accepted = checks.every((x) => x[1]);
        return {
          summary: accepted
            ? "获取结果可进入提取步骤；替换基线仍需明确操作。"
            : "保留原基线并报告获取失败。",
          metrics: [
            { label: "通过门禁数", value: checks.filter((x) => x[1]).length },
            { label: "基线替换次数", value: 0 },
          ],
          rows: checks.map(([k, ok]) => [k, ok ? "pass" : "fail"]),
          columns: ["门禁", "结果"],
        };
      },
    },
  });
  window.AIFSProjectFigures.register("pj-web-change-brief-4", {
    title: "展示变化语句本身",
    steps,
    caption:
      "报告携带精确文本和次数，不推断发布者意图。",
    lab: {
      controls: [
        {
          key: "before",
          label: "此前语句",
          type: "text",
          value: "The workshop starts at 14:00.",
        },
        {
          key: "after",
          label: "当前语句",
          type: "text",
          value: "The workshop starts at 15:00.",
        },
      ],
      calculate(v) {
        const r = diff(blocks(v.before), blocks(v.after));
        return {
          summary:
            v.before.trim() === v.after.trim()
              ? "文本没有变化。"
              : "并排审阅移除和新增语句。",
          metrics: [{ label: "未变出现次数", value: r.common }],
          rows: r.rows,
          columns: ["精确证据", "此前", "之后", "报告操作"],
        };
      },
    },
  });
})();
