(function () {
  "use strict";
  const number = (key, label, value, min = 0, max = 100, step = 1) => ({
    key,
    label,
    type: "range",
    value,
    min,
    max,
    step,
  });
  const text = (key, label, value) => ({ key, label, type: "text", value });
  const check = (key, label, value) => ({
    key,
    label,
    type: "checkbox",
    value,
  });
  const select = (key, label, value, options) => ({
    key,
    label,
    type: "select",
    value,
    options: options.map((x) => ({ value: x, label: x })),
  });
  const metric = (label, value) => ({ label, value });
  const bar = (label, value, max) => ({ label, value, max });
  const words = (s) =>
    s
      .normalize("NFC")
      .toLowerCase()
      .match(/[\p{L}\p{N}_]+/gu) || [];
  const unique = (xs) => [...new Set(xs)];
  const finiteList = (s) =>
    s.split(",").map((x) => {
      const n = Number(x.trim());
      if (!Number.isFinite(n))
        throw Error("Use comma-separated finite numbers");
      return n;
    });

  const buildLab = (stage) => ({
    controls: [
      text("text", "待估算文本", "Explain Orchard guest tokens"),
      number("ratio", "每个估算词元的字符数", 4, 1, 8),
      number("input", "记录中的输入词元", 100, 0, 500),
      number("cached", "缓存输入词元", 40, 0, 500),
      number("output", "记录中的输出词元", 20, 0, 200),
      number("inputRate", "输入费率（纳美元／词元）", 2, 0, 20),
      number("cachedRate", "缓存费率（纳美元／词元）", 1, 0, 20),
      number("outputRate", "输出费率（纳美元／词元）", 5, 0, 20),
      number("reservation", "已预留纳美元", 600, 0, 2000),
    ],
    calculate(v) {
      if (v.cached > v.input)
        throw Error("Cached tokens cannot exceed input tokens");
      const uncached = (v.input - v.cached) * v.inputRate,
        cache = v.cached * v.cachedRate,
        output = v.output * v.outputRate,
        total = uncached + cache + output;
      return {
        summary:
          stage === 1
            ? "近似估算：" +
              Math.ceil([...v.text].length / v.ratio) +
              " 个词元，不是服务商计数"
            : total > v.reservation
              ? "记录的实际用量超过预留"
              : "结算实际用量并释放未使用预留",
        metrics: [
          metric("估算词元数", Math.ceil([...v.text].length / v.ratio)),
          metric("实际纳美元", total),
          metric("未使用预留", Math.max(0, v.reservation - total)),
          metric("超支", Math.max(0, total - v.reservation)),
        ],
        bars: [
          bar("未缓存输入费用", uncached),
          bar("缓存输入费用", cache),
          bar("输出费用", output),
        ],
        columns: ["分项", "词元", "费率", "费用"],
        rows: [
          ["输入", v.input - v.cached, v.inputRate, uncached],
          ["缓存", v.cached, v.cachedRate, cache],
          ["输出", v.output, v.outputRate, output],
        ],
      };
    },
  });
  window.AIFSProjectFigures.register(
    "pj-token-counter-and-cost-meter-1",
    Object.assign(
      {
        title: "在已说明的范围内估算文本",
        steps: [
          {
            label: "统计标量值",
            detail:
              "从可见的近似计算开始。每词元四字符时，21 个 Unicode 标量值估算为六个词元。这是事前规划基线；服务商实际计数可能随语言、标点和分词器而变化。",
          },
          {
            label: "读取比率",
            detail: "characters=21; ratio=4\nceil(21/4)=6 estimated tokens",
          },
          {
            label: "向上取整除法",
            detail:
              "使用商和余数判断实现向上取整，避免加上 ratio-1 时溢出。不能把这个结果标为服务商分词器计数。",
          },
        ],
        caption:
          "两种语言字符数相同，为何词元数可能不同？ 图表范围：使用 JavaScript Number 演示一条请求的费用和预留，不执行 Rust 的 u64 溢出与输入类型校验，也不回放整个账本。估算不是服务商词元计数，夹具费率不是当前报价。",
      },
      { lab: buildLab(1) },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-token-counter-and-cost-meter-2",
    Object.assign(
      {
        title: "校验已记录的用量",
        steps: [
          {
            label: "解析计数器",
            detail:
              "JSON 适配器读取记录中的输入、输出用量及缓存输入详情；Rust 校验对应的 input,output,cached 三元组。缓存词元属于输入词元子集，不能另加一笔输入费用。",
          },
          {
            label: "检查无符号值",
            detail:
              "input_tokens=100; output_tokens=20; cached_tokens=40\nwire=100,20,40\nuncached input=60",
          },
          {
            label: "缓存子集",
            detail:
              "拒绝布尔值、负值以及超过输入总数的缓存计数。服务商响应规范化放在运算核心之外。",
          },
        ],
        caption:
          "服务商响应缺少必需输入用量时，应如何处理？ 图表范围：使用 JavaScript Number 演示一条请求的费用和预留，不执行 Rust 的 u64 溢出与输入类型校验，也不回放整个账本。估算不是服务商词元计数，夹具费率不是当前报价。",
      },
      { lab: buildLab(2) },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-token-counter-and-cost-meter-3",
    Object.assign(
      {
        title: "用带溢出检查的整数计价",
        steps: [
          {
            label: "未缓存费用",
            detail:
              "使用提供的整数费率表，单位为每词元纳美元。当费率 input=2、output=5、cached=1 时，该已记录请求的费用为 260 纳美元。这些夹具费率不是当前服务商价格。",
          },
          {
            label: "缓存费用",
            detail:
              "60 uncached * 2 = 120\n40 cached * 1 = 40\n20 output * 5 = 100\ntotal=260 nano_dollars",
          },
          {
            label: "输出费用",
            detail:
              "使用带溢出检查的 u64 乘法与加法。不要将各部分先转成浮点美元再舍入。",
          },
        ],
        caption:
          "如果整数运算静默回绕，溢出会怎样影响预算准入？ 图表范围：使用 JavaScript Number 演示一条请求的费用和预留，不执行 Rust 的 u64 溢出与输入类型校验，也不回放整个账本。估算不是服务商词元计数，夹具费率不是当前报价。",
      },
      { lab: buildLab(3) },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-token-counter-and-cost-meter-4",
    Object.assign(
      {
        title: "根据账本决定是否接纳任务",
        steps: [
          {
            label: "读取账本",
            detail:
              "根据记录用量回放预留。第一个 Orchard 请求预留 600，实际结算 260，释放 340。之后仅剩 430 时，需要 1,500 的请求会被阻止。保存的 JSON 保留请求 ID 和全部结算字段。",
          },
          {
            label: "带溢出检查的加法",
            detail:
              "limit=1000\nrequest 1 reserved=600 actual=260 unused=340\nrequest 2 actual=310 -> spent=570\nremaining=430; larger reservation -> blocked",
          },
          {
            label: "比较上限",
            detail:
              "即使实际用量超过估算，结算也必须记录它。明确标记超支，不要通过截断计费值来隐藏。",
          },
        ],
        caption:
          "agent-budget-planner 可以复用哪些字段，才能避免将报价混同于实际用量？ 图表范围：使用 JavaScript Number 演示一条请求的费用和预留，不执行 Rust 的 u64 溢出与输入类型校验，也不回放整个账本。估算不是服务商词元计数，夹具费率不是当前报价。",
      },
      { lab: buildLab(4) },
    ),
  );
})();
