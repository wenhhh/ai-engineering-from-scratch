(function () {
  "use strict";
  const controls = [
    {
      key: "x",
      label: "截图 x 坐标",
      type: "range",
      value: 200,
      min: 0,
      max: 640,
      step: 1,
    },
    {
      key: "y",
      label: "截图 y 坐标",
      type: "range",
      value: 100,
      min: 0,
      max: 400,
      step: 1,
    },
    {
      key: "scale",
      label: "显示缩放倍率",
      type: "range",
      value: 2,
      min: 1,
      max: 4,
      step: 0.5,
    },
    {
      key: "captured",
      label: "已捕获的 generation",
      type: "range",
      value: 2,
      min: 0,
      max: 5,
      step: 1,
    },
    {
      key: "current",
      label: "所需 generation",
      type: "range",
      value: 2,
      min: 0,
      max: 5,
      step: 1,
    },
    {
      key: "calls",
      label: "已消耗调用数",
      type: "range",
      value: 4,
      min: 0,
      max: 8,
      step: 1,
    },
  ];
  const calculate = function (v, stepIndex) {
    const valid = v.x < 640 && v.y < 400,
      stale = v.captured !== v.current;
    return {
      summary: !valid
        ? "拒绝帧外坐标"
        : stale
          ? "拒绝过期观察"
          : v.calls >= 8
            ? "拒绝已耗尽的动作额度"
            : "允许使用转换后的逻辑坐标点击",
      metrics: [
        { label: "逻辑 x", value: Math.floor(v.x / v.scale) },
        { label: "逻辑 y", value: Math.floor(v.y / v.scale) },
        { label: "generation 一致", value: !stale },
      ],
      bars: [
        { label: "已消耗调用", value: v.calls, max: 8 },
        { label: "剩余调用", value: 8 - v.calls, max: 8 },
      ],
    };
  };
  window.AIFSProjectFigures.register(
    "pj-desktop-control-1",
    Object.assign(
      {
        title: "校验图像帧与坐标空间",
        steps: [
          {
            label: "校验输入",
            detail: "Frame.validate, Frame.logical_point",
          },
          {
            label: "执行边界检查",
            detail:
              "截图尺寸使用物理像素，原生桌面点击则可能使用逻辑坐标。先校验尺寸为有上限的正数、显示缩放为有限值，再拒绝帧外坐标，最后进行除法并向下取整。帧的 generation 标明该动作依据的是哪一次观察。",
          },
          {
            label: "检查输出",
            detail:
              "缩放倍率为 2 时，像素 (200,100) 映射到逻辑坐标 (100,50)；恰好位于右边界的点会被拒绝。",
          },
        ],
        caption: "在副作用发生前拒绝无效输入。",
      },
      { lab: { controls, calculate } },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-desktop-control-2",
    Object.assign(
      {
        title: "渲染并操作测试场景",
        steps: [
          { label: "校验输入", detail: "Backend, FixtureBackend" },
          {
            label: "执行边界检查",
            detail:
              "用一个 Backend trait 统一定义 capture、click 和 type_text。测试后端根据自身状态绘制实际 PPM 图像，包含文本框、提交区域和绿色完成场景。点击文本框改变焦点，输入要求先获得焦点，提交也只有在存在文本后才会完成。这样的夹具无需控制用户桌面，就能复现状态转换错误。",
          },
          {
            label: "检查输出",
            detail:
              "最终 PPM 是实际渲染的交付物。测试场景完成只验证后端逻辑，不证明原生操作系统控制。",
          },
        ],
        caption: "在副作用发生前拒绝无效输入。",
      },
      { lab: { controls, calculate } },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-desktop-control-3",
    Object.assign(
      {
        title: "拒绝过期观察和耗尽的额度",
        steps: [
          {
            label: "校验输入",
            detail:
              "Controller.capture, Controller.click, Controller.type_text",
          },
          {
            label: "执行边界检查",
            detail:
              "在后端外包一层 Controller。每次后端调用前先预留动作额度，点击前必须已有捕获帧，修改状态后令该帧失效。过期 generation 必须在点击前被拒绝。记录成功动作的轨迹，即使后端返回错误，也应计入已经尝试的调用次数。",
          },
          {
            label: "检查输出",
            detail:
              "第二次点击不能复用点击前的截图，调用方必须先捕获变化后的场景。",
          },
        ],
        caption: "在副作用发生前拒绝无效输入。",
      },
      { lab: { controls, calculate } },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-desktop-control-4",
    Object.assign(
      {
        title: "构建显式启用的原生操作边界",
        steps: [
          {
            label: "校验输入",
            detail: "click_argv, text_argv, png_dimensions, MacBackend",
          },
          {
            label: "执行边界检查",
            detail:
              "使用参数数组构造 macOS screencapture 和 AppleScript 调用，不经过 shell。把待输入文本作为参数传递，绝不能把它作为可执行脚本内容。读取原生截图头部中的 PNG 尺寸，并保留实际图像载荷。默认演示仍使用夹具。原生捕获必须显式提供 --native-capture、获得操作系统权限；显示缩放启用时，还需由调用方提供 DESKTOP_SCALE。原生点击和输入仅作为库方法提供，不是演示会自动执行的动作。",
          },
          {
            label: "检查输出",
            detail:
              "测试校验原生参数构造和图像元数据解析；夹具测试明确不验证原生 macOS 执行，只应对可丢弃的测试应用尝试原生功能。",
          },
        ],
        caption: "在副作用发生前拒绝无效输入。",
      },
      { lab: { controls, calculate } },
    ),
  );
})();
