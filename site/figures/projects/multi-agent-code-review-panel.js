(function () {
  "use strict";
  const controls = [
    {
      key: "votes",
      label: "不同支持者人数",
      type: "range",
      value: 2,
      min: 0,
      max: 5,
      step: 1,
    },
    {
      key: "quorum",
      label: "最低支持人数",
      type: "range",
      value: 2,
      min: 1,
      max: 5,
      step: 1,
    },
    {
      key: "budget",
      label: "评审预算",
      type: "range",
      value: 3,
      min: 0,
      max: 5,
      step: 1,
    },
    {
      key: "predicted",
      label: "去重后的预测问题数",
      type: "range",
      value: 3,
      min: 0,
      max: 10,
      step: 1,
    },
    {
      key: "expected",
      label: "预期问题数",
      type: "range",
      value: 2,
      min: 1,
      max: 10,
      step: 1,
    },
    {
      key: "hits",
      label: "真阳性数量",
      type: "range",
      value: 2,
      min: 0,
      max: 10,
      step: 1,
    },
  ];
  const calculate = function (v, stepIndex) {
    if (v.hits > Math.min(v.predicted, v.expected))
      return {
        summary: "拒绝不可能的预期集合交集",
        metrics: [],
        bars: [],
      };
    const support = Math.min(v.votes, v.budget),
      precision = v.predicted ? v.hits / v.predicted : 0,
      recall = v.hits / v.expected;
    return {
      summary:
        support >= v.quorum
          ? "已形成共识；正确与否仍需真实标签验证"
          : "需要审阅：独立支持人数不足",
      metrics: [
        { label: "获准运行的支持者", value: support },
        { label: "精确率", value: precision.toFixed(3) },
        { label: "召回率", value: recall.toFixed(3) },
      ],
      bars: [
        { label: "真阳性数量", value: v.hits, max: 10 },
        { label: "假阳性数量", value: v.predicted - v.hits, max: 10 },
        { label: "漏检问题数", value: v.expected - v.hits, max: 10 },
      ],
    };
  };
  window.AIFSProjectFigures.register(
    "pj-multi-agent-code-review-panel-1",
    Object.assign(
      {
        title: "校验评审证据",
        steps: [
          { label: "输入契约", detail: "validateFinding" },
          {
            label: "校验评审证据",
            detail:
              "要求文件存在于所提供的快照中，行号为从 1 开始的正整数，引文逐字匹配且非空，规则 ID 稳定，严重程度为 1 至 3。所有评审者共用证据校验，阻止虚构位置进入聚合流程；即使多方同意且文本有出处，也不足以证明问题判断正确。",
          },
          {
            label: "观察结果",
            detail:
              "有来源支持的引文进入评审组；即使问题看似合理，引用不存在的行也会被拒绝。",
          },
        ],
        caption: "继续前进，在下一次副作用发生前检查边界。 图表范围：仅按每位评审者成本为 1 简化计算支持人数和指标；不执行源码引文校验、不同成本调度或超时取消。零成本评审者等实际行为以 runPanel 测试为准。",
      },
      { lab: { controls, calculate } },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-multi-agent-code-review-panel-2",
    Object.assign(
      {
        title: "汇总独立评审者的支持",
        steps: [
          { label: "输入契约", detail: "aggregate" },
          {
            label: "汇总独立评审者的支持",
            detail:
              "按文件、行号和规则对有效问题分组。每位评审者在每组只计一票，拒绝重复的评审者标识，并保留所有严重程度投票。达到最低支持人数后形成共识；只有一位评审者支持的问题仍以 needs-review 显示。形成共识后也保留分歧标记，便于用户检查严重程度判断的冲突。",
          },
          {
            label: "观察结果",
            detail:
              "同一评审者重复报告仍只计一票；两位评审者给出不同严重程度时，同时显示共识与分歧。",
          },
        ],
        caption: "继续前进，在下一次副作用发生前检查边界。 图表范围：仅按每位评审者成本为 1 简化计算支持人数和指标；不执行源码引文校验、不同成本调度或超时取消。零成本评审者等实际行为以 runPanel 测试为准。",
      },
      { lab: { controls, calculate } },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-multi-agent-code-review-panel-3",
    Object.assign(
      {
        title: "预留成本并执行期限约束",
        steps: [
          { label: "输入契约", detail: "runPanel" },
          {
            label: "预留成本并执行期限约束",
            detail:
              "启动每位评审者之前先预留其成本。剩余预算不足时跳过该工作并记录决策。为每位评审者设置期限，超时后中止其信号。失败记录保留在轨迹中，已完成的评审仍可聚合。适配器必须遵守 AbortSignal 才能停止外部工作；运行器无法强制远程服务取消。",
          },
          {
            label: "观察结果",
            detail:
              "演示启动两位评审者，因预算跳过第三位，并保留严重程度分歧。",
          },
        ],
        caption: "继续前进，在下一次副作用发生前检查边界。 图表范围：仅按每位评审者成本为 1 简化计算支持人数和指标；不执行源码引文校验、不同成本调度或超时取消。零成本评审者等实际行为以 runPanel 测试为准。",
      },
      { lab: { controls, calculate } },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-multi-agent-code-review-panel-4",
    Object.assign(
      {
        title: "测量评审组的精确率与召回率",
        steps: [
          { label: "输入契约", detail: "evaluate" },
          {
            label: "测量评审组的精确率与召回率",
            detail:
              "将唯一的问题 ID 与预期集合对照。精确率衡量预测问题中有多少属于预期；召回率衡量预期集合中有多少被发现。两个集合都要去重，避免重复评审者抬高指标。没有预测时精确率记为零，避免出现误导性的满分。调整最低支持人数前，先尝试留出输入。",
          },
          {
            label: "观察结果",
            detail:
              "假阳性降低精确率，漏检降低召回率；最低支持人数门槛的取舍需要测量。",
          },
        ],
        caption: "继续前进，在下一次副作用发生前检查边界。 图表范围：仅按每位评审者成本为 1 简化计算支持人数和指标；不执行源码引文校验、不同成本调度或超时取消。零成本评审者等实际行为以 runPanel 测试为准。",
      },
      { lab: { controls, calculate } },
    ),
  );
})();
