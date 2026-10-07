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
      text("command", "候选动作", "search Restore\trelease.md"),
      text(
        "content",
        "release.md 文本",
        "Orchard release. Restore evidence verified.",
      ),
      number("used", "已用动作数", 1, 0, 10),
      number("limit", "动作上限", 3, 1, 10),
      number("byteLimit", "文件字节预算", 64, 1, 200),
    ],
    calculate(v) {
      const match = v.command.match(
        /^(help|pwd|quit|list|read|search)(?: (.*))?$/,
      );
      let reason = "accepted",
        result = "";
      const bytes = new TextEncoder().encode(v.content).length;
      const args = match?.[2] || "";
      let file = args,
        pattern = "";
      if (match?.[1] === "search") {
        const p = args.split("\t");
        pattern = p[0];
        file = p[1] || "";
        if (p.length !== 2 || !pattern || !file)
          reason = "search needs pattern<TAB>path";
      }
      if (!match) reason = "unsupported grammar";
      else if (v.used >= v.limit) reason = "budget exhausted";
      else if (file.startsWith("/") || file.split("/").includes(".."))
        reason = "path rejected";
      else if (["read", "search"].includes(match[1]) && bytes > v.byteLimit)
        reason = "file budget exceeded";
      if (reason === "accepted")
        result =
          match[1] === "search"
            ? v.content.includes(pattern)
              ? "1:" + v.content
              : "no match"
            : match[1] === "read"
              ? v.content
              : match[1] === "quit"
                ? "session closed"
                : match[1];
      return {
        summary: reason + (result ? ": " + result : ""),
        metrics: [
          metric("输入字节数", new TextEncoder().encode(v.command).length),
          metric("文件字节数", bytes),
          metric("下个序号", Math.min(v.used + 1, v.limit)),
          metric("路径模型", "图中仅检查路径字符串；运行时还会求规范路径"),
        ],
        bars: [
          bar("已用动作数", v.used, v.limit),
          bar("动作上限", v.limit),
          bar("文件字节数", bytes, v.byteLimit),
        ],
        columns: ["边界", "值"],
        rows: [
          ["语法", match?.[1] || "rejected"],
          ["路径", file],
          ["结果", result || reason],
        ],
      };
    },
  });
  window.AIFSProjectFigures.register(
    "pj-rust-agent-shell-1",
    Object.assign(
      {
        title: "解析刻意限定的动作语言",
        steps: [
          {
            label: "校验输入",
            detail:
              "Rust 进程只接受刻意限定的工具语言。Python 适配器接收含调用方 ID 与工具参数的 JSONL，再仅转换已知命令。任何参数都不会变成操作系统 shell 命令。",
          },
          {
            label: "应用边界",
            detail:
              '{"id":"evidence","tool":"search","arguments":{"pattern":"Restore","path":"release.md"}}\nwire: search Restore<TAB>release.md',
          },
          {
            label: "检查输出",
            detail:
              "拒绝适配器参数中的控制字符，避免路径注入第二条命令。区分解析拒绝和执行失败。",
          },
        ],
        caption:
          "为什么必须在标准输入序列化之前拒绝调用方路径中的字面换行符？ 图表边界：这是单步语法与预算示意，不访问文件、不解析符号链接，也没有持久会话。它对 read 缺参或 pwd 附参的判断与真实 Rust 解析器不同；错误枚举和样本命令保留英文，实际边界以程序测试为准。",
      },
      { lab: buildLab(1) },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-rust-agent-shell-2",
    Object.assign(
      {
        title: "将文件工具限制在有界根目录内",
        steps: [
          {
            label: "校验输入",
            detail:
              "读取 release.md 前，先在工作区根目录下解析它。路径字符串可能看似无害，但符号链接可能指向工作区外的文件。这提供应用层范围约束，不构成进程沙箱。",
          },
          {
            label: "应用边界",
            detail:
              "workspace=/work/orchard\nrelease.md -> /work/orchard/release.md -> allowed\nlink.md -> /outside/credentials -> rejected",
          },
          {
            label: "检查输出",
            detail:
              "规范化根目录和目标后，比较路径组成部分。除最初元数据记录的长度外，也要限制实际读取字节数。",
          },
        ],
        caption:
          "若另一个进程在路径规范化之后替换该路径，还会存在什么竞态？ 图表边界：这是单步语法与预算示意，不访问文件、不解析符号链接，也没有持久会话。它对 read 缺参或 pwd 附参的判断与真实 Rust 解析器不同；错误枚举和样本命令保留英文，实际边界以程序测试为准。",
      },
      { lab: buildLab(2) },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-rust-agent-shell-3",
    Object.assign(
      {
        title: "跟踪预算与终止状态",
        steps: [
          {
            label: "校验输入",
            detail:
              "会话持有请求预算和终止状态。无效请求也消耗一次尝试。通过可执行程序参数和适配器 --limit 暴露预算，让调用方能够判断工作的上限。",
          },
          {
            label: "应用边界",
            detail:
              "limit=2\nrequest 1: list -> step 1\nrequest 2: rejected grammar -> step 2\nrequest 3 -> terminal budget_exhausted",
          },
          {
            label: "检查输出",
            detail:
              "每收到一个请求，在分派前增加一次计数。会话关闭后，不得继续读取文件。",
          },
        ],
        caption:
          "若输出在某个请求 ID 收到事件前就结束，客户端应怎样处理？ 图表边界：这是单步语法与预算示意，不访问文件、不解析符号链接，也没有持久会话。它对 read 缺参或 pwd 附参的判断与真实 Rust 解析器不同；错误枚举和样本命令保留英文，实际边界以程序测试为准。",
      },
      { lab: buildLab(3) },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-rust-agent-shell-4",
    Object.assign(
      {
        title: "通过实际标准输入流式输出有界 JSON 事件",
        steps: [
          {
            label: "校验输入",
            detail:
              "客户端每次读取一个 JSON 事件，并将其与适配器添加的请求 ID 对应。每行刷新让界面无须等待进程退出，就能显示观察结果。",
          },
          {
            label: "应用边界",
            detail:
              "request evidence -> {request_id:evidence, seq:2, kind:ok}\noutput: 2:Restore evidence: rehearsal completed at 09:20 UTC.",
          },
          {
            label: "检查输出",
            detail:
              "使用 BufRead 数据块，在构造命令字符串前限制分配量。工具输出必须进行 JSON 转义，不得直接拼接原始文件文本。",
          },
        ],
        caption: "文件包含引号、制表符或换行符时，会发生什么？ 图表边界：这是单步语法与预算示意，不访问文件、不解析符号链接，也没有持久会话。它对 read 缺参或 pwd 附参的判断与真实 Rust 解析器不同；错误枚举和样本命令保留英文，实际边界以程序测试为准。",
      },
      { lab: buildLab(4) },
    ),
  );
})();
