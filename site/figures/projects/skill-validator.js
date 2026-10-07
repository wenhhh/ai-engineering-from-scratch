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
      text("name", "元数据名称", "orchard-release"),
      text("directory", "目录名称", "orchard-release"),
      text("description", "描述", "Check deployment evidence"),
      text("body", "指令正文", "Read the restore log before approving."),
      text("resource", "资源路径", "references/restore.md"),
      check("activate", "加载指令正文", true),
      number("budget", "字符预算", 120, 0, 300),
    ],
    calculate(v) {
      const grammar =
          /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v.name) && v.name.length <= 64,
        identity = v.name === v.directory;
      const safe =
        !!v.resource &&
        !v.resource.startsWith("/") &&
        !v.resource.includes("\\") &&
        v.resource.split("/").every((p) => p && p !== "." && p !== "..");
      const discovery = v.name + ": " + v.description,
        context = discovery + (v.activate && v.body ? "\n\n" + v.body : "");
      const count = [...context].length;
      return {
        summary: !grammar
          ? "名称无效"
          : !identity
            ? "目录标识冲突"
            : !safe
              ? "资源路径已拒绝"
              : count > v.budget
                ? "超出限制：无法容纳完整上下文"
                : "完整上下文通过模拟检查",
        metrics: [
          metric("名称有效", grammar),
          metric("目录匹配", identity),
          metric("字符数", count),
          metric("词元数", "未测量"),
        ],
        bars: [
          bar("上下文字符数", count, v.budget),
          bar("允许字符数", v.budget),
        ],
        columns: ["边界", "值"],
        rows: [
          ["带引号的元数据", "name: " + JSON.stringify(v.name)],
          ["发现结果", discovery],
          ["上下文", context],
          [
            "资源",
            safe
              ? "词法上为相对路径，仍须检查文件系统"
              : "rejected",
          ],
        ],
      };
    },
  });
  window.AIFSProjectFigures.register(
    "pj-skill-validator-1",
    Object.assign(
      {
        title: "解析明确限定的元数据头子集",
        steps: [
          {
            label: "元数据头边界",
            detail:
              "安装器输出带引号的元数据。接受普通单行标量，以及与 JSON 兼容的双引号标量，包括转义引号和 Unicode。拒绝标签、别名和多行 YAML，避免静默改变其解释。",
          },
          {
            label: "分离键值",
            detail:
              'description: "Check \\"replicas\\" first"\nparsed description: Check "replicas" first\ndescription: | -> unsupported syntax',
          },
          {
            label: "重复键门禁",
            detail:
              "在元数据头一行的第一个冒号处分割。元数据校验前先解码带引号的值；重复键视为冲突。",
          },
        ],
        caption:
          "为什么一个兼容标准的子集解析器需要明确的不支持语法错误？ 图表范围：不解析真实元数据头，不检查描述非空及 1024 字符上限，也不访问资源文件；资源正文不计入图中预算。完整加载与路径校验由 Rust 实现执行。",
      },
      { lab: buildLab(1) },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-skill-validator-2",
    Object.assign(
      {
        title: "校验名称和描述",
        steps: [
          {
            label: "读取字段",
            detail:
              "元数据标识技能包。Orchard-release 含有大写字母，不符合可移植的小写名称语法；名为 orchard-release 的技能若放在其他名称的目录中，则无法通过身份一致性校验。",
          },
          {
            label: "名称语法",
            detail:
              "directory=orchard-release\nname=orchard-release -> valid\nname=orchard--release -> invalid name",
          },
          {
            label: "目录标识",
            detail:
              "按契约统计名称字节数和描述的 Unicode 标量值数量。解析后保留人类可读描述。",
          },
        ],
        caption:
          "为什么更改目录名时也需要更改元数据？ 图表范围：不解析真实元数据头，不检查描述非空及 1024 字符上限，也不访问资源文件；资源正文不计入图中预算。完整加载与路径校验由 Rust 实现执行。",
      },
      { lab: buildLab(2) },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-skill-validator-3",
    Object.assign(
      {
        title: "将资源路径限制在根目录内",
        steps: [
          {
            label: "相对路径输入",
            detail:
              "相对于技能目录查找资源。解析 references/restore.md，并校验规范化路径仍在该目录内；任何读取开始前，先拒绝父目录穿越。",
          },
          {
            label: "路径段门禁",
            detail:
              "resource references/restore.md -> contained file\nresource ../private.md -> invalid component\nsymlink outside root -> escapes root",
          },
          {
            label: "路径规范化",
            detail:
              "拼接前校验路径段，再进行路径规范化。这个教学加载器不能消除对抗性的路径替换竞态。",
          },
        ],
        caption:
          "为什么仅对原始路径文本使用 starts_with 不足以证明路径被限制在根目录内？ 图表范围：不解析真实元数据头，不检查描述非空及 1024 字符上限，也不访问资源文件；资源正文不计入图中预算。完整加载与路径校验由 Rust 实现执行。",
      },
      { lab: buildLab(3) },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-skill-validator-4",
    Object.assign(
      {
        title: "在字符预算内加载上下文",
        steps: [
          {
            label: "发现元数据",
            detail:
              "发现只加载元数据，激活再追加指令。若完整上下文仍能放入预算，命令行程序随后可追加一份明确指定的参考材料。计数字符，不计字节或模型词元；绝不截断半条指令。",
          },
          {
            label: "选择是否激活",
            detail:
              "metadata length=80; body=120; separators=2\nactivation needs 202 characters\nbudget 200 -> Limit",
          },
          {
            label: "统计字符",
            detail:
              "先拼接完整上下文，再将字符数与预算比较。必须计入分隔符和请求的资源文本。",
          },
        ],
        caption:
          "如何提供基于分词器的预算，同时避免与这里的字符限制混淆？ 图表范围：不解析真实元数据头，不检查描述非空及 1024 字符上限，也不访问资源文件；资源正文不计入图中预算。完整加载与路径校验由 Rust 实现执行。",
      },
      { lab: buildLab(4) },
    ),
  );
})();
