(function () {
  "use strict";
  const controls = [
    {
      key: "raw",
      label: "模型原始响应",
      type: "text",
      value: '{"answer":"retry","confidence":1.5}',
    },
    {
      key: "maximum",
      label: "置信度上限",
      type: "range",
      value: 1,
      min: 0,
      max: 2,
      step: 0.1,
    },
    {
      key: "attempts",
      label: "尝试预算",
      type: "range",
      value: 2,
      min: 1,
      max: 5,
      step: 1,
    },
    {
      key: "keyword",
      label: "未使用的可选结构定义包含不支持的 $ref",
      type: "checkbox",
      value: false,
    },
  ];
  const calculate = function (v, stepIndex) {
    let obj;
    try {
      obj = JSON.parse(v.raw);
    } catch (e) {
      return {
        summary: "解析失败：" + e.message,
        metrics: [
          {
            label: "UTF-8 字节数",
            value: new TextEncoder().encode(v.raw).length,
          },
        ],
        bars: [],
      };
    }
    if (v.keyword)
      return {
        summary:
          "配置错误：即使没有提供可选值，也拒绝 $ref",
        metrics: [],
        bars: [],
      };
    const issues = [];
    if (!obj || Array.isArray(obj) || typeof obj !== "object")
      issues.push("$/ 应为对象");
    else {
      if (typeof obj.answer !== "string" || !obj.answer.length)
        issues.push("$/answer 必须是非空字符串");
      if (
        typeof obj.confidence !== "number" ||
        obj.confidence < 0 ||
        obj.confidence > v.maximum
      )
        issues.push("$/confidence 超出允许范围");
      for (const key of Object.keys(obj))
        if (!["answer", "confidence"].includes(key))
          issues.push("$/" + key + " 未知属性");
    }
    return {
      summary: issues.length
        ? "已拒绝；将这些问题传给下一次预算内尝试"
        : "已接受结构化输出",
      metrics: [
        { label: "问题数量", value: issues.length },
        {
          label: "本次响应后剩余的重试次数",
          value: issues.length ? v.attempts - 1 : 0,
        },
      ],
      bars: [
        {
          label: "置信度",
          value:
            typeof obj?.confidence === "number"
              ? Math.max(0, obj.confidence)
              : 0,
          max: 2,
        },
      ],
      columns: ["问题路径与理由"],
      rows: issues.map((x) => [x]),
    };
  };
  window.AIFSProjectFigures.register(
    "pj-json-schema-output-guard-1",
    Object.assign(
      {
        title: "解析不可信输入边界",
        steps: [
          { label: "输入契约", detail: "parseJSON" },
          {
            label: "解析不可信输入边界",
            detail:
              "模型响应以字节字符串形式到达。将整个字符串作为 JSON 解析，拒绝 Markdown 包装和尾随文本，并在解析前限制 UTF-8 字节数。除对象外，也接受 JSON 基本值：基本值是否适用由结构定义决定。不要不断删除文本直到碰巧解析成功，否则会掩盖实际输出契约。",
          },
          {
            label: "观察结果",
            detail:
              "解析器对有效 JSON 返回值，对尾随指令或超大响应抛出异常。",
          },
        ],
        caption: "继续前进，在下一次副作用发生前检查边界。 图表限制：此共享计算器仅演示固定对象的简化校验，未执行完整递归、字节上限或实际修复循环，且先解析数据再检查可选关键字。完整 TypeScript 实现在读取模型输出前预检结构定义；实现行为以源码测试为准。",
      },
      { lab: { controls, calculate } },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-json-schema-output-guard-2",
    Object.assign(
      {
        title: "递归遍历结构定义",
        steps: [
          { label: "输入契约", detail: "validate" },
          {
            label: "递归遍历结构定义",
            detail:
              "实现对象、数组及基本值校验。使用自有属性语义检查必填属性；继承的属性不满足契约。将 integer 视为 number 的更严格子类型，拒绝非有限数值，并为每次失败保留路径。将递归下降深度限制为 32，防止结构定义和值无限消耗调用栈。",
          },
          {
            label: "观察结果",
            detail:
              "嵌套类型错误会产生类似 `$/a/0` 的路径，调用方可据此要求定向修正。",
          },
        ],
        caption: "继续前进，在下一次副作用发生前检查边界。 图表限制：此共享计算器仅演示固定对象的简化校验，未执行完整递归、字节上限或实际修复循环，且先解析数据再检查可选关键字。完整 TypeScript 实现在读取模型输出前预检结构定义；实现行为以源码测试为准。",
      },
      { lab: { controls, calculate } },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-json-schema-output-guard-3",
    Object.assign(
      {
        title: "拒绝含糊或不支持的契约",
        steps: [
          { label: "输入契约", detail: "validate, guard" },
          {
            label: "拒绝含糊或不支持的契约",
            detail:
              "增加数值上下界、枚举成员、Unicode 字符串最小长度、数组长度边界和禁止额外属性的对象校验。转义属性路径中的斜杠与波浪号。出现教学子集以外的关键字时，报告配置错误，不能静默视为成功。本实现不宣称完全符合 JSON Schema：引用、格式及组合关键字仍需额外实现。",
          },
          {
            label: "观察结果",
            detail:
              "守卫对无效输出返回结构化问题；不支持的结构定义特性会抛出配置错误。",
          },
        ],
        caption: "继续前进，在下一次副作用发生前检查边界。 图表限制：此共享计算器仅演示固定对象的简化校验，未执行完整递归、字节上限或实际修复循环，且先解析数据再检查可选关键字。完整 TypeScript 实现在读取模型输出前预检结构定义；实现行为以源码测试为准。",
      },
      { lab: { controls, calculate } },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-json-schema-output-guard-4",
    Object.assign(
      {
        title: "在有限预算内修复输出",
        steps: [
          { label: "输入契约", detail: "repair" },
          {
            label: "在有限预算内修复输出",
            detail:
              "只将结构化校验反馈传给生成回调。解释输出前，先计入本次调用。接受输出后立即停止；最后一次尝试仍被拒绝时，返回明确的 exhausted 状态。服务商故障向上传播，不伪装成结构校验失败。轨迹记录每次尝试，避免第三次成功掩盖之前两次契约违规。",
          },
          {
            label: "观察结果",
            detail:
              "演示拒绝置信度 1.5，将超出上限的问题传给下一次尝试，再接受置信度 0.9。",
          },
        ],
        caption: "继续前进，在下一次副作用发生前检查边界。 图表限制：此共享计算器仅演示固定对象的简化校验，未执行完整递归、字节上限或实际修复循环，且先解析数据再检查可选关键字。完整 TypeScript 实现在读取模型输出前预检结构定义；实现行为以源码测试为准。",
      },
      { lab: { controls, calculate } },
    ),
  );
})();
