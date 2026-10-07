(function () {
  "use strict";
  const controls = [
    {
      key: "name",
      label: "姓名已填写（0/1）",
      type: "range",
      value: 0,
      min: 0,
      max: 1,
      step: 1,
    },
    {
      key: "email",
      label: "邮箱已填写（0/1）",
      type: "range",
      value: 0,
      min: 0,
      max: 1,
      step: 1,
    },
    {
      key: "budget",
      label: "观察次数额度",
      type: "range",
      value: 4,
      min: 1,
      max: 8,
      step: 1,
    },
    {
      key: "green",
      label: "每万像素中的绿色像素数",
      type: "range",
      value: 100,
      min: 0,
      max: 10000,
      step: 1,
    },
    { key: "origin", label: "来源已改变", type: "checkbox", value: false },
    {
      key: "dangerous",
      label: "提交按钮被标为危险",
      type: "checkbox",
      value: false,
    },
  ];
  const calculate = function (v, stepIndex) {
    const fills = 2 - v.name - v.email,
      observations = fills + 2;
    const safe = !v.origin && !v.dangerous;
    const state = !safe
      ? "blocked"
      : v.budget < observations
        ? "budget-exhausted"
        : v.green > 5
          ? "complete"
          : "visual-mismatch";
    return {
      summary:
        state +
        "；完成需同时满足字段值、允许来源、DOM 成功标记与测试页面像素信号。",
      metrics: [
        { label: "所需观察次数", value: observations },
        { label: "绿色像素占比", value: v.green / 10000 },
      ],
      bars: [
        { label: "填写动作", value: fills, max: 4 },
        { label: "提交与验证", value: 2, max: 4 },
        { label: "可用观察次数", value: v.budget, max: 8 },
      ],
    };
  };
  window.AIFSProjectFigures.register(
    "pj-browser-agent-1",
    Object.assign(
      {
        title: "将 DOM 状态转为受约束的动作",
        steps: [
          { label: "输入契约", detail: "parseObservation, choose" },
          {
            label: "将 DOM 状态转为受约束的动作",
            detail:
              "读取小型表单中的标签、字段值、禁用状态与稳定 id，校验 id 唯一性和字段类型。每次只选择一个动作：填写姓名、填写邮箱，再点击唯一匹配的 Save request 按钮。页面文字不被解释为执行指令。字段缺失、标签歧义、危险按钮或意外来源都会产生明确的 blocked 结果。",
          },
          {
            label: "观察结果",
            detail:
              "可执行动作限定为 fill 与 click；页面注入文字没有代码执行通道。",
          },
        ],
        caption: "继续查看下一项副作用发生前的边界。",
      },
      { lab: { controls, calculate } },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-browser-agent-2",
    Object.assign(
      {
        title: "在完成、停滞或额度耗尽时停止",
        steps: [
          { label: "输入契约", detail: "runAgent, FixtureDriver" },
          {
            label: "在完成、停滞或额度耗尽时停止",
            detail:
              "每次动作后重新观察。状态重复、策略阻止动作或步骤额度耗尽时停止。完成需要 DOM 成功标记与独立截图检查同时满足；每个选定动作在执行前写入轨迹。测试后端是明确的模拟器，只提供确定性观察来验证循环，不宣称覆盖真实浏览器。",
          },
          {
            label: "观察结果",
            detail:
              "成功轨迹记录姓名、邮箱、提交与 done；驱动无响应时以 stalled 停止，不会无限点击。",
          },
        ],
        caption: "继续查看下一项副作用发生前的边界。",
      },
      { lab: { controls, calculate } },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-browser-agent-3",
    Object.assign(
      {
        title: "用 Python 检查截图像素",
        steps: [
          { label: "输入契约", detail: "inspectPNG" },
          {
            label: "用 Python 检查截图像素",
            detail:
              "读取 PNG 签名、数据块长度与 CRC，再在大小限制内解压图像数据。逆向恢复 PNG 行滤波，统计绿色成功像素。将该视觉信号与 DOM 标记结合，任何单项都不足以证明完成。此处只检测教学测试页面的特定像素状态，不进行 OCR 或通用视觉推断。损坏、超大、交错扫描或不支持的颜色格式均明确失败。",
          },
          {
            label: "观察结果",
            detail:
              "全绿的 4×4 测试图像得到 1.0，全红图像为零；真实浏览器截图中的成功绿色区域通常只占较小比例。",
          },
        ],
        caption: "继续查看下一项副作用发生前的边界。",
      },
      { lab: { controls, calculate } },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-browser-agent-4",
    Object.assign(
      {
        title: "驱动真实测试页面并为运行评分",
        steps: [
          { label: "输入契约", detail: "GstackDriver, scoreRuns" },
          {
            label: "驱动真实测试页面并为运行评分",
            detail:
              "通过回环地址提供 fixture.html，用 gstack browse 打开。GstackDriver 读取 DOM 观察，填写对应标签的字段，点击观察到的按钮并捕获真实截图。命令通过参数数组执行，不经 shell 解释。用 --live 运行同一套有界策略，对比它与模拟后端的轨迹；模拟和真实浏览器的完成得分分开记录。",
          },
          {
            label: "观察结果",
            detail:
              "先启动 `python3 -m http.server 8877 --bind 127.0.0.1 --directory projects/browser-agent/solution`，使用 `$BROWSE_BIN goto http://127.0.0.1:8877/fixture.html` 导航，再运行 `node projects/browser-agent/solution/main.ts --live`。运行会保存 browser-result.png，并报告真实 Chromium 模式。",
          },
        ],
        caption: "继续查看下一项副作用发生前的边界。",
      },
      { lab: { controls, calculate } },
    ),
  );
})();
