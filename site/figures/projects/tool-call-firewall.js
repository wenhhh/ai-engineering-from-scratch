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
      select("role", "可信角色", "editor", ["reader", "editor", "unknown"]),
      select("tool", "请求的工具", "write", ["read", "write", "shell"]),
      text("path", "相对路径", "notes.md"),
      text("approvedText", "已批准内容", "Release after restore"),
      text("content", "候选内容", "Release after restore"),
      check("approved", "审批凭据存在", true),
      check("used", "凭据已经使用", false),
      number("entries", "审计条数", 1, 0, 10),
      number("cap", "审计容量", 4, 1, 10),
    ],
    calculate(v) {
      const safe =
        !!v.path &&
        !v.path.startsWith(".") &&
        !v.path.startsWith("/") &&
        !v.path.includes("\\") &&
        v.path.split("/").every((p) => p && p !== "." && p !== "..");
      const policy =
        !["reader", "editor"].includes(v.role) || !safe
          ? "Deny"
          : v.tool === "read"
            ? "Allow"
            : v.role === "editor" && v.tool === "write"
              ? "ApprovalRequired"
              : "Deny";
      const authorized =
        policy === "Allow" ||
        (policy === "ApprovalRequired" &&
          v.approved &&
          !v.used &&
          v.approvedText === v.content);
      const result =
        v.entries >= v.cap
          ? "审计已达上限"
          : policy === "Deny"
            ? "策略拒绝"
            : !authorized
              ? "审批缺失、变化或已消费"
              : "可进行规范路径范围检查和分派";
      return {
        summary: result,
        metrics: [
          metric("策略", policy),
          metric("载荷匹配", v.approvedText === v.content),
          metric("可授权", authorized),
          metric(
            "写入之后",
            authorized && v.tool === "write" ? "used=true" : "未消费",
          ),
        ],
        bars: [
          bar("审计条数", v.entries, v.cap),
          bar("审计容量", v.cap),
        ],
        columns: ["边界", "结果"],
        rows: [
          ["身份", v.role],
          ["词法路径", safe],
          ["审批重放", v.used ? "denied" : "not consumed"],
          ["实际文件系统", "由原生 dispatch 检查"],
        ],
      };
    },
  });
  window.AIFSProjectFigures.register(
    "pj-tool-call-firewall-1",
    Object.assign(
      {
        title: "校验无歧义的调用封套",
        steps: [
          {
            label: "字节预算",
            detail:
              "调用方应用提供身份，模型只提出操作建议。紧凑的 Rust 消息封套携带稳定请求 ID、角色、工具和相对参数，不允许有歧义的分隔符或控制字符。",
          },
          {
            label: "封套字段",
            detail:
              "r1|reader|read|notes.md -> typed request\nr1|reader|read|notes.md|extra -> reject",
          },
          {
            label: "控制字符门禁",
            detail:
              "评估策略前校验整个有界封套。在 CLI 中，trusted-role 是操作者参数，不是从模型文本接收的字段。",
          },
        ],
        caption:
          "如果模型能把 reader 换成 editor，会破坏什么？ 图表范围：只演示角色、词法路径和布尔审批输入，不访问文件系统。审计已满时可能仍显示可授权或 used=true 的预测；真实 CLI 在审计失败时不会执行 dispatch，不能把该显示视为实际副作用证据。",
      },
      { lab: buildLab(1) },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-tool-call-firewall-2",
    Object.assign(
      {
        title: "评估角色与路径策略",
        steps: [
          {
            label: "已知角色",
            detail:
              "策略拒绝未知角色、不支持的工具和不安全路径组件。reader 可读取根目录内的便笺；editor 写入需要审批。词法判断允许后，dispatch 仍要检查实际文件系统路径是否位于根目录内。",
          },
          {
            label: "路径组件",
            detail:
              "reader + read notes.md -> Allow\nreader + write notes.md -> Deny\neditor + write notes.md -> ApprovalRequired",
          },
          {
            label: "工具权限",
            detail:
              "默认分支为 Deny。真实访问文件前检查规范路径，不要把策略判断当作操作系统隔离。",
          },
        ],
        caption:
          "相对名称不含父目录组件时，符号链接为何仍可能越界？ 图表范围：只演示角色、词法路径和布尔审批输入，不访问文件系统。审计已满时可能仍显示可授权或 used=true 的预测；真实 CLI 在审计失败时不会执行 dispatch，不能把该显示视为实际副作用证据。",
      },
      { lab: buildLab(2) },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-tool-call-firewall-3",
    Object.assign(
      {
        title: "一次性消费绑定请求的审批",
        steps: [
          {
            label: "决策门禁",
            detail:
              "真实文件分派器把审批绑定到带类型请求及写入内容，在执行写入前消费凭据。载荷变化或重放都会失败，不能再次写入。",
          },
          {
            label: "匹配身份",
            detail:
              'approved content="approved after restore"\nchanged content -> Conflict, file unchanged\nexact content -> write, used=true\nreplay -> Conflict',
          },
          {
            label: "检查未使用",
            detail:
              "消费审批前先校验载荷大小和实际路径边界。一次性凭据应与 dispatch 位于同一个可信应用边界。",
          },
        ],
        caption:
          "允许在进程重启后继续使用审批之前，需要怎样的持久化凭据存储？ 图表范围：只演示角色、词法路径和布尔审批输入，不访问文件系统。审计已满时可能仍显示可授权或 used=true 的预测；真实 CLI 在审计失败时不会执行 dispatch，不能把该显示视为实际副作用证据。",
      },
      { lab: buildLab(3) },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-tool-call-firewall-4",
    Object.assign(
      {
        title: "记录有界审计证据",
        steps: [
          {
            label: "唯一调用",
            detail:
              "紧凑审计记录结果，不复制文件内容。可执行程序返回请求 ID、相对参数、决策、输出、审批是否已消费以及重放是否被拒绝。集成时应把请求身份与应用结果一起记录。",
          },
          {
            label: "容量检查",
            detail:
              "request r1 -> one policy row\nfile write succeeds -> approval_consumed=true\nsecond dispatch -> replay_denied=true",
          },
          {
            label: "省略参数",
            detail:
              "追加前拒绝重复审计 ID 和已满日志。有界内存审计不等于持久化防篡改日志。",
          },
        ],
        caption:
          "应对哪些非秘密字段计算哈希，才能关联持久审批凭据与执行结果？ 图表范围：只演示角色、词法路径和布尔审批输入，不访问文件系统。审计已满时可能仍显示可授权或 used=true 的预测；真实 CLI 在审计失败时不会执行 dispatch，不能把该显示视为实际副作用证据。",
      },
      { lab: buildLab(4) },
    ),
  );
})();
