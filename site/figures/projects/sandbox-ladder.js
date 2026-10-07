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
      check("untrusted", "不可信代码", true),
      check("secrets", "含密钥的宿主机", true),
      check("network", "要求禁用网络", true),
      check("kernel", "要求独立内核", false),
      number("budget", "模拟成本预算", 3, 1, 5),
      check("observedReadOnly", "探针输入：根目录写入被拒绝", true),
      check("observedNoRoute", "探针输入：不存在默认路由", false),
    ],
    calculate(v) {
      const p = [
        ["process", false, false, false, 1],
        ["filesystem", true, false, false, 2],
        ["container", true, true, false, 3],
        ["microvm", true, true, true, 5],
      ];
      const rows = p.map((x) => [
        ...x,
        (!(v.untrusted || v.secrets) || x[1]) &&
          (!v.network || x[2]) &&
          (!v.kernel || x[3]),
      ]);
      const chosen = rows.find((x) => x[5] && x[4] <= v.budget);
      return {
        summary:
          stage === 4
            ? "探针观察：" +
              (v.observedReadOnly && v.observedNoRoute
                ? "两项检查通过；未证明可抵御逃逸"
                : "尚未同时观察到这两项控制")
            : chosen
              ? "成本最低且足够的模型：" + chosen[0]
              : "预算内没有足够的模型",
        metrics: [
          metric("选中配置", chosen?.[0] || "none"),
          metric(
            "操作系统强制隔离",
            stage === 4 ? "仅为探针输入" : "尚未建立",
          ),
          metric("内核需求", v.kernel),
        ],
        bars: rows.map((x) => bar(x[0] + " 成本", x[4], 5)),
        columns: [
          "配置",
          "文件系统",
          "禁用网络",
          "独立内核",
          "成本",
          "足够",
        ],
        rows,
      };
    },
  });
  window.AIFSProjectFigures.register(
    "pj-sandbox-ladder-1",
    Object.assign(
      {
        title: "解析能力需求",
        steps: [
          {
            label: "解析键",
            detail:
              "选择运行时之前，先将威胁需求写成布尔值。这里 network=true 表示要求禁用网络，host_kernel=true 表示要求独立内核。这两个名称都不表示授予访问权限。",
          },
          {
            label: "拒绝重复项",
            detail:
              "untrusted=true,secrets=true,network=true,host_kernel=false\nrequired: filesystem boundary + denied network",
          },
          {
            label: "精确布尔值",
            detail:
              "拒绝重复键，以及并非精确 true/false 的值。不要猜测 network=yes 的含义。",
          },
        ],
        caption:
          "增加哪项需求后，共享内核的容器将不再足够？ 图表边界：探针值来自手动开关，不会运行 Docker。控制模型不等同于实际配置，两个探针都为真也不能证明微型虚拟机或容器逃逸防护。",
      },
      { lab: buildLab(1) },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-sandbox-ladder-2",
    Object.assign(
      {
        title: "定义控制能力的模拟配置",
        steps: [
          {
            label: "文件系统控制",
            detail:
              "配置描述模拟能力，并使用示意成本。在这个模型中，进程边界没有文件系统或网络隔离；容器配置模拟这两种能力，但仍共享宿主机内核。",
          },
          {
            label: "网络控制",
            detail:
              "process: filesystem=false, network=false, kernel=false\ncontainer: filesystem=true, network=true, kernel=false",
          },
          {
            label: "内核控制",
            detail:
              "独立测试各项需求。只要缺少一项必需能力，低成本就没有意义。",
          },
        ],
        caption:
          "为什么这个模型不能证明实际运行的容器具有这些设置？ 图表边界：探针值来自手动开关，不会运行 Docker。控制模型不等同于实际配置，两个探针都为真也不能证明微型虚拟机或容器逃逸防护。",
      },
      { lab: buildLab(2) },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-sandbox-ladder-3",
    Object.assign(
      {
        title: "选择成本最低且足够的配置",
        steps: [
          {
            label: "筛选控制能力",
            detail:
              "足够的最低成本配置仍可能超出预算。要求内核分离时，预算 4 不能静默降级为成本 3 的容器。",
          },
          {
            label: "应用预算",
            detail:
              "kernel separation required; candidates costs 1,2,3,5\nbudget 4 -> no sufficient profile\nbudget 5 -> microvm-fixture",
          },
          {
            label: "稳定的最低成本选择",
            detail:
              "先按能力过滤，再检查成本，最后采用稳定名称排序。如果剩余集合为空，返回限额错误。",
          },
        ],
        caption:
          "两个足够的配置具有相同模拟成本时，应如何处理？ 图表边界：探针值来自手动开关，不会运行 Docker。控制模型不等同于实际配置，两个探针都为真也不能证明微型虚拟机或容器逃逸防护。",
      },
      { lab: buildLab(3) },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-sandbox-ladder-4",
    Object.assign(
      {
        title: "报告剩余假设",
        steps: [
          {
            label: "重新检查需求",
            detail:
              "可选 Docker 适配器生成可检查的参数列表，只运行调用方选择且本地已存在的镜像。其无害探针检查根目录写入被拒绝，以及不存在默认路由。项目没有包含微型虚拟机实现。",
          },
          {
            label: "标明模型",
            detail:
              "--docker-image alpine:local -> command preview\n--execute -> docker_probe with observed stdout\nshared host kernel remains a residual",
          },
          {
            label: "列出剩余风险",
            detail:
              "区分 policy_simulation 和 docker_probe 结果。探针成功仅为这些检查提供证据，不能证明可以抵御容器逃逸。",
          },
        ],
        caption:
          "如果 root_write 变为 allowed，你会先检查哪个运行时设置？ 图表边界：探针值来自手动开关，不会运行 Docker。控制模型不等同于实际配置，两个探针都为真也不能证明微型虚拟机或容器逃逸防护。",
      },
      { lab: buildLab(4) },
    ),
  );
})();
