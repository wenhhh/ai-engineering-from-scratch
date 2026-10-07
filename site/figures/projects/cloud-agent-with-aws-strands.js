(function () {
  "use strict";
  const controls = [
    {
      key: "reads",
      label: "请求的重复读取次数",
      type: "range",
      value: 3,
      min: 1,
      max: 10,
      step: 1,
    },
    {
      key: "steps",
      label: "步骤额度",
      type: "range",
      value: 5,
      min: 0,
      max: 10,
      step: 1,
    },
    {
      key: "bytes",
      label: "结果序列化后的字符数",
      type: "range",
      value: 60,
      min: 1,
      max: 500,
      step: 1,
    },
    {
      key: "budget",
      label: "上下文字符额度",
      type: "range",
      value: 180,
      min: 0,
      max: 2000,
      step: 1,
    },
    {
      key: "failures",
      label: "成功前的超时次数",
      type: "range",
      value: 1,
      min: 0,
      max: 4,
      step: 1,
    },
    {
      key: "retries",
      label: "允许重试次数",
      type: "range",
      value: 2,
      min: 0,
      max: 3,
      step: 1,
    },
    {
      key: "scope",
      label: "资源超出允许范围",
      type: "checkbox",
      value: false,
    },
  ];
  const calculate = function (v, stepIndex) {
    const retained = Math.min(v.reads, v.steps, Math.floor(v.budget / v.bytes)),
      success = v.failures <= v.retries;
    const calls =
      v.scope || v.steps === 0 ? 0 : Math.min(v.failures + 1, v.retries + 1);
    return {
      summary: v.scope
        ? "调用 provider 前拒绝计划"
        : !success
          ? "超时重试次数已耗尽"
          : retained < v.reads
            ? "保留部分结果：额度已耗尽"
            : "已完成，使用请求内缓存",
      metrics: [
        { label: "provider 调用次数", value: calls },
        { label: "缓存命中次数", value: success ? Math.max(0, retained - 1) : 0 },
      ],
      bars: [
        {
          label: "保留结果数",
          value: success && !v.scope ? retained : 0,
          max: v.reads,
        },
        {
          label: "保留字符数",
          value: success && !v.scope ? retained * v.bytes : 0,
          max: v.budget || 1,
        },
      ],
    };
  };
  window.AIFSProjectFigures.register(
    "pj-cloud-agent-with-aws-strands-1",
    Object.assign(
      {
        title: "校验允许范围内的云端检查计划",
        steps: [
          {
            label: "输入",
            detail:
              "模型提出意图，确定性校验器依据调用方范围决定能否放行。",
          },
          {
            label: "处理",
            detail:
              "模型提出意图，确定性校验器依据调用方范围决定能否放行。只接受明确列出的读取操作及范围内的资源 ID。拒绝未知键和过大的计划，防止模型附加的指令悄悄变成执行参数。",
          },
          {
            label: "验证",
            detail:
              "删除操作或范围外资源会在任何 provider 调用之前被拒绝。",
          },
        ],
        caption:
          "删除操作或范围外资源会在任何 provider 调用之前被拒绝。 译注：原图在资源超出范围时仍可能显示缓存命中；这是保留的上游简化模型问题，不代表实际发生了调用或复用。",
      },
      { lab: { controls, calculate } },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-cloud-agent-with-aws-strands-2",
    Object.assign(
      {
        title: "在步骤和响应额度内执行读取",
        steps: [
          {
            label: "输入",
            detail:
              "操作开始前检查步骤额度，保留结果前计算序列化输出占用。",
          },
          {
            label: "处理",
            detail:
              "操作开始前检查步骤额度，保留结果前计算序列化输出的占用。输出限制无法撤销调用成本，但能防止大结果挤满后续上下文。保留部分结果和明确终态，便于诊断因额度而停止的情况。",
          },
          {
            label: "验证",
            detail:
              "步骤额度为零时，不调用 provider，返回 budget_exhausted。",
          },
        ],
        caption:
          "步骤额度为零时，不调用 provider，返回 budget_exhausted。 译注：原图在资源超出范围时仍可能显示缓存命中；这是保留的上游简化模型问题，不代表实际发生了调用或复用。",
      },
      { lab: { controls, calculate } },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-cloud-agent-with-aws-strands-3",
    Object.assign(
      {
        title: "重试暂时失败的读取并复用已完成请求",
        steps: [
          {
            label: "输入",
            detail:
              "只重试暂时超时，并按规范化动作标识缓存成功读取。",
          },
          {
            label: "处理",
            detail:
              "仅重试暂时性的超时失败，并按规范化动作标识缓存成功读取。权限失败应立即向上传播，不能按暂时故障反复重试。这里的缓存仅在单次请求内有效；真实云状态会变化，长期缓存需要明确的 TTL 或版本，不能静默复用旧数据。",
          },
          {
            label: "验证",
            detail:
              "暂时超时触发重试，权限失败则在一次调用后直接向上传播。",
          },
        ],
        caption:
          "暂时超时触发重试，权限失败则在一次调用后直接向上传播。 译注：原图在资源超出范围时仍可能显示缓存命中；这是保留的上游简化模型问题，不代表实际发生了调用或复用。",
      },
      { lab: { controls, calculate } },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-cloud-agent-with-aws-strands-4",
    Object.assign(
      {
        title: "用本地模型驱动真实 Strands 循环",
        steps: [
          {
            label: "输入",
            detail:
              "真实 Strands Agent 消费注入的 Model 子类产生的流式事件。",
          },
          {
            label: "处理",
            detail:
              "真实 Strands Agent 消费注入的 Model 子类产生的流式事件，以便在不使用凭据、不调用云服务的情况下检验框架循环。模型仍只提出计划，其结果需要交给前面的校验器解析并检查范围。独立的 Bedrock 构造函数必须显式调用，离线演示和测试不会调用它。",
          },
          {
            label: "验证",
            detail:
              "框架通过一次模型调用输出预录的 JSON 计划，再交给独立校验器检查。",
          },
        ],
        caption:
          "框架通过一次模型调用输出预录的 JSON 计划，再交给独立校验器检查。 译注：原图在资源超出范围时仍可能显示缓存命中；这是保留的上游简化模型问题，不代表实际发生了调用或复用。",
      },
      { lab: { controls, calculate } },
    ),
  );
})();
