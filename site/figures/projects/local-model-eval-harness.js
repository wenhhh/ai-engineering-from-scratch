(function () {
  "use strict";
  const controls = [
    {
      key: "total",
      label: "带标签用例数",
      type: "range",
      value: 10,
      min: 1,
      max: 30,
      step: 1,
    },
    {
      key: "answered",
      label: "已记录预测数",
      type: "range",
      value: 8,
      min: 0,
      max: 30,
      step: 1,
    },
    {
      key: "hits",
      label: "正确预测数",
      type: "range",
      value: 6,
      min: 0,
      max: 30,
      step: 1,
    },
    {
      key: "置信度",
      label: "共同报告的置信度",
      type: "range",
      value: 0.9,
      min: 0,
      max: 1,
      step: 0.05,
    },
    {
      key: "latencies",
      label: "延迟（毫秒）",
      type: "text",
      value: "80,100,120,300,900",
    },
  ];
  const calculate = function (v, stepIndex) {
    if (v.answered > v.total || v.hits > v.answered)
      return {
        summary: "拒绝不可能成立的预测计数",
        metrics: [],
        bars: [],
      };
    const latency = v.latencies
      .split(",")
      .map(Number)
      .sort((a, b) => a - b);
    if (latency.some((n) => !Number.isFinite(n) || n < 0))
      return { summary: "拒绝无效延迟", metrics: [], bars: [] };
    const accuracy = v.hits / v.total,
      coverage = v.answered / v.total,
      ece = v.answered ? Math.abs(v.confidence - v.hits / v.answered) : 0;
    return {
      summary:
        "缺失预测仍计入准确率分母。置信度由模型自行报告。",
      metrics: [
        { label: "准确率", value: accuracy.toFixed(3) },
        { label: "覆盖率", value: coverage.toFixed(3) },
        { label: "单分箱 ECE", value: ece.toFixed(3) },
        {
          label: "最近秩法 p95（毫秒）",
          value: latency[Math.ceil(latency.length * 0.95) - 1],
        },
      ],
      bars: [
        { label: "正确", value: v.hits, max: v.total },
        { label: "错误", value: v.answered - v.hits, max: v.total },
        { label: "未回答", value: v.total - v.answered, max: v.total },
      ],
    };
  };
  window.AIFSProjectFigures.register(
    "pj-local-model-eval-harness-1",
    Object.assign(
      {
        title: "校验预测记录",
        steps: [
          {
            label: "记录",
            detail: "同时保留答案、置信度与延迟。",
          },
          { label: "校验", detail: "拒绝非有限数值或无效字段。" },
          { label: "对齐", detail: "使用稳定 id 关联标签。" },
        ],
        caption:
          "校验 id 唯一、答案为字符串、confidence 位于 [0,1]，且 latency_ms 非负。",
      },
      { lab: { controls, calculate } },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-local-model-eval-harness-2",
    Object.assign(
      {
        title: "测量规范化精确答案准确率",
        steps: [
          { label: "关联", detail: "将预测与标签 id 匹配。" },
          { label: "比较", detail: "只规范化大小写和空白。" },
          {
            label: "分母",
            detail: "将未回答的标签计为错误。",
          },
        ],
        caption:
          "针对完整标签映射返回 correct、total、accuracy 和 coverage。",
      },
      { lab: { controls, calculate } },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-local-model-eval-harness-3",
    Object.assign(
      {
        title: "测量置信度校准",
        steps: [
          {
            label: "分箱",
            detail: "将置信度分到等宽区间。",
          },
          {
            label: "比较",
            detail: "比较平均置信度与观察到的正确率。",
          },
          { label: "加权", detail: "按样本数量对差值求加权平均。" },
        ],
        caption:
          "计算按各等宽分箱样本数加权的 ECE，并保留每箱证据。",
      },
      { lab: { controls, calculate } },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-local-model-eval-harness-4",
    Object.assign(
      {
        title: "同时发布准确率与延迟",
        steps: [
          {
            label: "质量",
            detail: "计算准确率与置信度校准。",
          },
          {
            label: "延迟",
            detail: "对有限测量值排序，求最近秩。",
          },
          { label: "报告", detail: "在评分卡旁保留来源。" },
        ],
        caption:
          "整合指标、最近秩法延迟百分位数及测量来源标签。",
      },
      { lab: { controls, calculate } },
    ),
  );
})();
