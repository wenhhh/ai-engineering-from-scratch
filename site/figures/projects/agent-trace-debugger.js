(function () {
  "use strict";
  const controls = [
    {
      key: "a",
      label: "子跨度 A 终点（起点 10）",
      type: "range",
      value: 60,
      min: 10,
      max: 100,
      step: 1,
    },
    {
      key: "start",
      label: "子跨度 B 起点",
      type: "range",
      value: 40,
      min: 0,
      max: 100,
      step: 1,
    },
    {
      key: "end",
      label: "子跨度 B 终点",
      type: "range",
      value: 90,
      min: 0,
      max: 100,
      step: 1,
    },
    {
      key: "tokens",
      label: "失败跨度词元数",
      type: "range",
      value: 300,
      min: 0,
      max: 1000,
      step: 1,
    },
  ];
  const calculate = function (v, stepIndex) {
    if (v.end < v.start)
      return {
        summary: "拒绝负时长子跨度",
        metrics: [],
        bars: [],
      };
    const overlap = Math.max(0, Math.min(v.a, v.end) - Math.max(10, v.start));
    const sum = v.a - 10 + v.end - v.start,
      union = sum - overlap;
    return {
      summary:
        "从父跨度的 100 ms 中减去子区间并集，重叠部分不重复计算。",
      metrics: [
        { label: "子跨度简单求和（ms）", value: sum },
        { label: "重叠时长（ms）", value: overlap },
        { label: "失败跨度中的词元数", value: v.tokens },
      ],
      bars: [
        { label: "子区间并集（ms）", value: union, max: 100 },
        { label: "父跨度自身耗时（ms）", value: 100 - union, max: 100 },
      ],
      columns: ["span", "start", "end"],
      rows: [
        ["parent", 0, 100],
        ["A", 10, v.a],
        ["B", v.start, v.end],
      ],
    };
  };
  window.AIFSProjectFigures.register(
    "pj-agent-trace-debugger-1",
    Object.assign(
      {
        title: "读取 JSONL 追踪记录",
        steps: [
          { label: "输入契约", detail: "parseTrace" },
          {
            label: "读取 JSONL 追踪记录",
            detail:
              "逐个非空行解析 JSON 对象。要求稳定的 ID、名称、有限的起止时间、非负词元数，以及明确的 ok 或 error 状态。遇到格式错误的行，应停止处理并报告行号；静默丢弃坏跨度会扭曲耗时和费用结论。时间采用相对毫秒，不采用绝对时钟时间戳。",
          },
          {
            label: "观察结果",
            detail:
              "合法 JSONL 转为有类型的跨度；负时长会在分析前被拒绝。",
          },
        ],
        caption: "继续查看下一步行为之前的约束边界。",
      },
      { lab: { controls, calculate } },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-agent-trace-debugger-2",
    Object.assign(
      {
        title: "校验父子关系",
        steps: [
          { label: "输入契约", detail: "validateTree" },
          {
            label: "校验父子关系",
            detail:
              "子跨度必须引用存在的父跨度，且时间区间完全位于父区间之内。检查每条祖先链中的环，并拒绝重复 ID。追踪可包含重叠的独立运行，因此允许多个根。先校验再聚合，避免损坏的关系图生成看似可信的图表。",
          },
          {
            label: "观察结果",
            detail:
              "看似合理但晚于父跨度结束的子跨度，会被关系图校验拒绝。",
          },
        ],
        caption: "继续查看下一步行为之前的约束边界。",
      },
      { lab: { controls, calculate } },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-agent-trace-debugger-3",
    Object.assign(
      {
        title: "区分自身耗时与等待时间",
        steps: [
          { label: "输入契约", detail: "unionDuration, analyze" },
          {
            label: "区分自身耗时与等待时间",
            detail:
              "包含子调用的总耗时为 end 减 start。自身耗时应减去直接子跨度区间的并集长度；并行子跨度可能重叠，因此不能减去它们的时长之和。根区间的并集给出跨多次运行的总历时。词元按跨度自身用量只累计一次。slowest 指向自身耗时最大的跨度，避免将主要在等待子调用的根误判为最慢工作。",
          },
          {
            label: "观察结果",
            detail:
              "重叠子区间只计算一次，模型调用成为自身耗时最大的工作。",
          },
        ],
        caption: "继续查看下一步行为之前的约束边界。",
      },
      { lab: { controls, calculate } },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-agent-trace-debugger-4",
    Object.assign(
      {
        title: "渲染可检查的时间线",
        steps: [
          { label: "输入契约", detail: "render" },
          {
            label: "渲染可检查的时间线",
            detail:
              "生成独立 HTML 时间线，每个跨度占一行，用按比例缩放的条形和错误颜色展示。跨度名称插入 HTML 前必须转义。报告包含自身耗时、总耗时、总历时、词元数和错误数。空追踪也应生成可读成果。输出为本地静态报告，不加载第三方脚本。",
          },
          {
            label: "观察结果",
            detail:
              "打开 trace.html，查看标红的失败模型跨度，并比较自身耗时与包含子调用的总耗时。",
          },
        ],
        caption: "继续查看下一步行为之前的约束边界。",
      },
      { lab: { controls, calculate } },
    ),
  );
})();
