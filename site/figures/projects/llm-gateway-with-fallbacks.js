(function () {
  "use strict";
  const text = (key, label, value) => ({ key, label, type: "text", value });
  const number = (key, label, value, min, max) => ({
    key,
    label,
    type: "range",
    value,
    min,
    max,
    step: 1,
  });
  const classify = (status) => {
    if (!Number.isInteger(status) || status < 100 || status > 599)
      return "invalid";
    if (status >= 200 && status < 300) return "success";
    if (status === 429 || status >= 500) return "retry";
    return "terminal";
  };
  function config(title, detail, lab) {
    return {
      title,
      steps: [
        { label: "检查边界", detail },
        {
          label: "改变输入",
          detail: "下方结果根据当前控件值计算。",
        },
      ],
      caption: detail,
      lab,
    };
  }
  window.AIFSProjectFigures.register(
    "pj-llm-gateway-with-fallbacks-1",
    config(
      "校验服务商顺序",
      "只允许已配置端点；重复 URL 不会带来额外尝试。",
      {
        controls: [
          text(
            "urls",
            "服务商 URL（逗号分隔）",
            "https://primary.example/v1/chat/completions, http://127.0.0.1:11434/v1/chat/completions",
          ),
        ],
        calculate(v) {
          const seen = new Set();
          const rows = v.urls.split(",").map((raw) => {
            raw = raw.trim();
            let status = "accepted";
            try {
              const u = new URL(raw);
              const local = ["localhost", "127.0.0.1", "[::1]"].includes(
                u.hostname,
              );
              if (
                u.username ||
                u.password ||
                u.hash ||
                u.search ||
                (u.protocol !== "https:" && !(u.protocol === "http:" && local))
              )
                status = "invalid";
              else if (seen.has(raw)) status = "duplicate";
            } catch {
              status = "invalid";
            }
            seen.add(raw);
            return [raw, status];
          });
          const accepted = rows.filter((r) => r[1] === "accepted").length;
          const invalid = rows.some((r) => r[1] === "invalid");
          return {
            summary: invalid
              ? "发送请求前拒绝服务商列表"
              : `按输入顺序保留 ${accepted} 个不同服务商`,
            metrics: [{ label: "可用数量", value: invalid ? 0 : accepted }],
            bars: [
              { label: "已接受条目", value: accepted, max: rows.length },
            ],
            columns: ["端点", "决策"],
            rows,
          };
        },
      },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-llm-gateway-with-fallbacks-2",
    config(
      "对观察到的状态分类",
      "429 和服务器错误允许故障切换；其他错误停止当前路由。",
      {
        controls: [number("status", "HTTP 状态", 503, 0, 650)],
        calculate(v) {
          const kind = classify(v.status);
          return {
            summary: `${v.status} → ${kind}`,
            metrics: [{ label: "允许故障切换", value: kind === "retry" }],
            bars: ["success", "retry", "terminal", "invalid"].map((label) => ({
              label,
              value: kind === label ? 1 : 0,
              max: 1,
            })),
          };
        },
      },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-llm-gateway-with-fallbacks-3",
    config(
      "限制响应读取",
      "字节限制与期限分别约束。本图时间来自模拟，不代表网络测量。",
      {
        controls: [
          text("body", "响应正文", '{"answer":"ready"}'),
          number("limit", "响应字节上限", 24, 1, 128),
          number("delay", "模拟响应耗时（毫秒）", 70, 0, 200),
          number("deadline", "剩余期限（毫秒）", 100, 1, 200),
        ],
        calculate(v) {
          const bytes = new TextEncoder().encode(v.body).length;
          const read = Math.min(bytes, v.limit + 1);
          let summary = "响应已接受";
          if (v.delay > v.deadline)
            summary = "在响应完成前取消";
          else if (bytes > v.limit)
            summary = "响应已拒绝：超过字节上限";
          return {
            summary,
            metrics: [
              { label: "UTF-8 字节数", value: bytes },
              { label: "完成时最多读取的字节数", value: read },
            ],
            bars: [
              {
                label: "响应字节数",
                value: bytes,
                max: Math.max(bytes, v.limit),
              },
              {
                label: "已用时间",
                value: Math.min(v.delay, v.deadline),
                max: v.deadline,
              },
            ],
            columns: ["限制", "值"],
            rows: [
              ["正文读取上限", v.limit + 1],
              ["剩余时间", Math.max(0, v.deadline - v.delay)],
            ],
          };
        },
      },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-llm-gateway-with-fallbacks-4",
    config(
      "所有故障切换共享同一期限",
      "模拟按顺序观察到的响应；每次尝试都消耗同一个总时间预算。",
      {
        controls: [
          text(
            "providers",
            "服务商观察记录 JSON",
            '[{"status":503,"ms":35,"bytes":40},{"status":200,"ms":50,"bytes":90}]',
          ),
          number("attempts", "最大尝试次数", 2, 1, 5),
          number("deadline", "总期限（毫秒）", 65, 1, 250),
          number("limit", "最大响应字节数", 128, 1, 256),
        ],
        calculate(v) {
          const providers = JSON.parse(v.providers);
          if (!Array.isArray(providers) || !providers.length)
            throw new Error("Expected provider observations");
          let elapsed = 0,
            attempts = 0,
            state = "exhausted";
          const rows = [];
          for (const p of providers) {
            if (
              !Number.isFinite(p.ms) ||
              p.ms < 0 ||
              !Number.isFinite(p.bytes) ||
              p.bytes < 0 ||
              classify(p.status) === "invalid"
            )
              throw new Error("Use valid status, nonnegative ms and bytes");
            if (attempts >= v.attempts) break;
            attempts++;
            if (elapsed + p.ms >= v.deadline) {
              elapsed = v.deadline;
              state = "cancelled";
              rows.push([attempts, "deadline", elapsed, 0]);
              break;
            }
            elapsed += p.ms;
            const kind = classify(p.status);
            rows.push([attempts, p.status, elapsed, v.deadline - elapsed]);
            if (p.bytes > v.limit) {
              state = "response-limit";
              break;
            }
            if (kind === "success") {
              state = "completed";
              break;
            }
            if (kind === "terminal") {
              state = "terminal-error";
              break;
            }
          }
          return {
            summary: `${state}：经过 ${attempts} 次尝试，耗时 ${elapsed} 毫秒`,
            metrics: [{ label: "剩余时间", value: v.deadline - elapsed }],
            bars: [
              { label: "已用毫秒数", value: elapsed, max: v.deadline },
              { label: "尝试次数", value: attempts, max: v.attempts },
            ],
            columns: ["尝试", "结果", "已用毫秒", "剩余毫秒"],
            rows,
          };
        },
      },
    ),
  );
})();
