/* figures-infra4.js - 阶段 17（基础设施与生产（Infrastructure and production））的动画课程图表：
   托管平台（Managed platforms）、可观测性接线（Observability wiring）、金丝雀发布（Canary rollout）、
   AI SRE、混沌防护机制（Chaos guardrails）、密钥轮换（Secrets rotation）、合规映射（Compliance mapping）、FinOps。
   在 lesson-figures.js 之后加载，通过 window.LF 注册。动态效果仅使用 SMIL，
   不使用 JS 循环或 rAF。使用 ES5，无依赖，主题由 CSS 变量控制。 */
(function () {
  'use strict';
  var LF = window.LF;
  if (!LF) { return; }
  var el = LF.el, svgEl = LF.svgEl;

  var BP = 'var(--blueprint,#3553ff)';
  var SOFT = 'var(--rule-soft,#ddd)';
  var MUTE = 'var(--ink-mute,#777)';
  var INKS = 'var(--ink-soft,#555)';
  var WARN = 'var(--warn,#b8870f)';
  var INK = 'var(--ink,#1a1a1a)';
  var BG = 'var(--bg,#fafaf5)';
  var SURF = 'var(--bg-surface,#eee)';
  var EASE = '0.23 1 0.32 1';
  var SPL4 = '0 0 1 1;' + EASE + ';0 0 1 1;0.4 0 1 1';

  function svg(h) { return svgEl('svg', { viewBox: '0 0 520 ' + h }); }
  function shell(host, label, sub, node, cap) {
    host.appendChild(el('div', { class: 'lf' }, [
      el('div', { class: 'lf-head' }, [el('span', { class: 'lf-label' }, [label]), el('span', {}, [sub])]),
      el('div', { class: 'lf-body' }, [el('div', { class: 'lf-out' }, [node])]),
      el('div', { class: 'lf-cap' }, [cap])
    ]));
  }
  function txt(x, y, s, size, fill, anchor) {
    var t = svgEl('text', { x: x, y: y, 'text-anchor': anchor || 'middle', 'font-family': 'var(--font-mono,monospace)', 'font-size': size || '10', fill: fill || INK });
    t.appendChild(document.createTextNode(s));
    return t;
  }
  function rect(x, y, w, h, fill, stroke) {
    return svgEl('rect', { x: x, y: y, width: w, height: h, rx: '4', fill: fill || BG, stroke: stroke || SOFT, 'stroke-width': '1.4' });
  }
  function anim(attr, vals, dur, extra) {
    var a = { attributeName: attr, values: vals, dur: dur, repeatCount: 'indefinite' };
    if (extra) { for (var k in extra) { a[k] = extra[k]; } }
    return svgEl('animate', a);
  }
  function motion(path, dur, begin) {
    return svgEl('animateMotion', { path: path, dur: dur, begin: begin || '0s', repeatCount: 'indefinite' });
  }
  // 淡入并放大的入场效果：在 a..b 相位窗口内，从不透明度 0、尺寸 95% 开始进入，
  // 在 0.94..1 更快退出。内容相对于 (cx, cy) 绘制。
  function entry(cx, cy, dur, begin, a, b) {
    a = a || 0.02; b = b || 0.12;
    var kt = '0;' + a + ';' + b + ';0.94;1';
    var g = svgEl('g', { transform: 'translate(' + cx + ' ' + cy + ')', opacity: '0' });
    g.appendChild(svgEl('animateTransform', { attributeName: 'transform', type: 'scale', additive: 'sum', values: '0.95;0.95;1;1;0.97', keyTimes: kt, calcMode: 'spline', keySplines: SPL4, dur: dur, begin: begin || '0s', repeatCount: 'indefinite' }));
    g.appendChild(svgEl('animate', { attributeName: 'opacity', values: '0;0;1;1;0', keyTimes: kt, calcMode: 'spline', keySplines: SPL4, dur: dur, begin: begin || '0s', repeatCount: 'indefinite' }));
    return g;
  }

  // ── i4-platform-lanes: PTU 预留泳道（Reserved lane）与共享按需泳道（On-demand lane）对比 ──
  // 01-managed-llm-platforms
  function platformLanes(host) {
    var s = svg(230);
    s.appendChild(txt(40, 40, 'PTU 预留通道', '9', BP, 'start'));
    s.appendChild(svgEl('rect', { x: 40, y: 50, width: 330, height: 34, rx: '4', fill: 'none', stroke: BP, 'stroke-width': '1.6' }));
    s.appendChild(rect(390, 44, 100, 46, BG, BP));
    s.appendChild(txt(440, 63, '专用容量', '9', BP));
    s.appendChild(txt(440, 77, '中位数约 50 ms', '8', MUTE));
    var i;
    for (i = 0; i < 4; i++) {
      var d = svgEl('circle', { cx: 0, cy: 0, r: 5, fill: BP });
      d.appendChild(motion('M20 67 L440 67', '1.6s', (i * 0.4) + 's'));
      s.appendChild(d);
    }
    s.appendChild(txt(40, 128, '按需共享通道', '9', WARN, 'start'));
    s.appendChild(svgEl('rect', { x: 40, y: 138, width: 330, height: 34, rx: '4', fill: 'none', stroke: WARN, 'stroke-width': '1.6' }));
    s.appendChild(rect(390, 132, 100, 46, BG, WARN));
    s.appendChild(txt(440, 151, '共享资源池', '9', WARN));
    s.appendChild(txt(440, 165, '中位数约 75 ms', '8', MUTE));
    // 共享泳道：其他租户（Tenants）的灰色流量挤占管道，我们的流量等待
    for (i = 0; i < 3; i++) {
      var o = svgEl('rect', { x: -5, y: -5, width: 10, height: 10, rx: '2', fill: MUTE, opacity: '0.5' });
      o.appendChild(motion('M60 155 L440 155', '2.6s', (i * 0.85) + 's'));
      s.appendChild(o);
    }
    for (i = 0; i < 2; i++) {
      var m = svgEl('circle', { cx: 0, cy: 0, r: 5, fill: WARN });
      m.appendChild(motion('M20 155 L120 155 L120 155 L440 155', '3.2s', (i * 1.6) + 's'));
      s.appendChild(m);
    }
    var q = entry(150, 155, '3.2s', '0.3s', 0.05, 0.2);
    q.appendChild(txt(0, -16, '排在其他租户之后', '8', MUTE));
    s.appendChild(q);
    s.appendChild(txt(260, 208, '同一模型、不同容量协议：预留通道比共享通道快约 25 ms', '9', MUTE));
    shell(host, '平台容量通道（Platform Lanes）', 'PTU 预留容量与按需共享容量', s,
      '大型云平台的延迟差距源于容量安排，而非模型本身。Azure 的预配吞吐量单元（Provisioned Throughput Unit，PTU）预留吞吐量，请求走专用通道，中位延迟约 50 ms。Bedrock 按需模式与其他租户共享资源池，词元需要排队，同等规模模型的延迟约为 75 ms。根据模型目录和云成本管理（FinOps）能力选择平台，再决定哪些工作负载值得使用预留通道。');
  }

  // ── i4-otel-glue: 网关跨度（Gateway spans）通过 OTel 扇出至两个后端 ──
  // 13-llm-observability
  function otelGlue(host) {
    var s = svg(240);
    s.appendChild(rect(30, 96, 74, 44, BG, INK));
    s.appendChild(txt(67, 114, '应用', '10', INK));
    s.appendChild(txt(67, 128, 'LLM 调用', '8', MUTE));
    s.appendChild(rect(170, 96, 84, 44, BG, INKS));
    s.appendChild(txt(212, 114, '网关', '10', INKS));
    s.appendChild(txt(212, 128, 'Helicone', '8', MUTE));
    s.appendChild(rect(300, 96, 70, 44, SURF, BP));
    s.appendChild(txt(335, 114, 'OTel', '10', BP));
    s.appendChild(txt(335, 128, '收集器', '8', MUTE));
    s.appendChild(rect(410, 34, 96, 44, BG, BP));
    s.appendChild(txt(458, 52, '遥测', '9', BP));
    s.appendChild(txt(458, 66, '追踪与成本', '8', MUTE));
    s.appendChild(rect(410, 158, 96, 44, BG, WARN));
    s.appendChild(txt(458, 176, '评估平台', '9', WARN));
    s.appendChild(txt(458, 190, '漂移与 RAG', '8', MUTE));
    s.appendChild(svgEl('path', { d: 'M104 118 L170 118', fill: 'none', stroke: SOFT, 'stroke-width': '1.2' }));
    s.appendChild(svgEl('path', { d: 'M254 118 L300 118', fill: 'none', stroke: SOFT, 'stroke-width': '1.2' }));
    var up = svgEl('path', { d: 'M370 108 L408 62', fill: 'none', stroke: BP, 'stroke-width': '1.4', 'stroke-dasharray': '4 4' });
    up.appendChild(anim('stroke-dashoffset', '16;0', '0.8s'));
    s.appendChild(up);
    var dn = svgEl('path', { d: 'M370 128 L408 174', fill: 'none', stroke: WARN, 'stroke-width': '1.4', 'stroke-dasharray': '4 4' });
    dn.appendChild(anim('stroke-dashoffset', '16;0', '0.8s'));
    s.appendChild(dn);
    // 一个请求变为跨度（Span）；收集器（Collector）将其复制到两个接收端（Sinks）
    var i;
    for (i = 0; i < 3; i++) {
      var b = (i * 1.4) + 's';
      var c = svgEl('circle', { cx: 0, cy: 0, r: 5, fill: INKS });
      c.appendChild(motion('M0 118 L67 118 L212 118 L335 118', '4.2s', b));
      c.appendChild(anim('opacity', '1;1;0;0', '4.2s', { keyTimes: '0;0.6;0.62;1', begin: b }));
      s.appendChild(c);
      var t1 = svgEl('rect', { x: -5, y: -4, width: 10, height: 8, rx: '2', fill: BP });
      t1.appendChild(motion('M335 118 L335 118 L458 56', '4.2s', b));
      t1.appendChild(anim('opacity', '0;0;1;1;0', '4.2s', { keyTimes: '0;0.6;0.66;0.9;1', begin: b }));
      s.appendChild(t1);
      var t2 = svgEl('rect', { x: -5, y: -4, width: 10, height: 8, rx: '2', fill: WARN });
      t2.appendChild(motion('M335 118 L335 118 L458 180', '4.2s', b));
      t2.appendChild(anim('opacity', '0;0;1;1;0', '4.2s', { keyTimes: '0;0.6;0.66;0.9;1', begin: b }));
      s.appendChild(t2);
    }
    s.appendChild(txt(260, 228, '一个追踪跨度、两个接收端：工具分别承担各自职责', '9', MUTE));
    shell(host, 'OTel 连接模式（OTel Glue Pattern）', '网关遥测分别写入指标接收端与评估接收端', s,
      '没有单一可观测性（Observability）工具能同时在这两类工作上占优，因此生产系统将职责拆开。网关将每次 LLM 调用记录为 OpenTelemetry 追踪跨度（Span）；收集器（Collector）将其复制到两个接收端（Sink）：遥测（Telemetry）后端负责追踪、延迟和成本，评估平台负责漂移（Drift）与检索增强生成（RAG）质量。以后替换任一后端只需改配置，无须重新埋点。');
  }

  // ── i4-canary-ramp: 先镜像影子流量（Shadow mirror），再通过门控逐级增加流量 ──
  // 20-shadow-canary-progressive
  function canaryRamp(host) {
    var s = svg(250);
    s.appendChild(rect(30, 30, 70, 40, BG, INK));
    s.appendChild(txt(65, 47, '流量', '9', INK));
    s.appendChild(txt(65, 61, '分配器', '8', MUTE));
    s.appendChild(rect(150, 20, 90, 36, BG, INKS));
    s.appendChild(txt(195, 35, '生产模型', '9', INKS));
    s.appendChild(txt(195, 48, '响应用户', '7.5', MUTE));
    s.appendChild(rect(150, 74, 90, 36, BG, BP));
    s.appendChild(txt(195, 89, '候选模型', '9', BP));
    s.appendChild(txt(195, 102, '影子模式：只记录', '7.5', MUTE));
    s.appendChild(svgEl('path', { d: 'M100 42 L150 38', fill: 'none', stroke: SOFT, 'stroke-width': '1.2' }));
    var mir = svgEl('path', { d: 'M100 56 L150 88', fill: 'none', stroke: BP, 'stroke-width': '1.2', 'stroke-dasharray': '3 4' });
    mir.appendChild(anim('stroke-dashoffset', '14;0', '0.9s'));
    s.appendChild(mir);
    var i;
    for (i = 0; i < 3; i++) {
      var r1 = svgEl('circle', { cx: 0, cy: 0, r: 4, fill: INKS });
      r1.appendChild(motion('M10 50 L65 50 L195 38', '2s', (i * 0.7) + 's'));
      s.appendChild(r1);
      var r2 = svgEl('circle', { cx: 0, cy: 0, r: 4, fill: BP, opacity: '0.55' });
      r2.appendChild(motion('M10 50 L65 50 L195 92', '2s', (i * 0.7) + 's'));
      s.appendChild(r2);
    }
    s.appendChild(txt(120, 128, '镜像响应丢弃，不返回用户', '8', MUTE, 'start'));
    // 金丝雀流量份额量表：依次 10 -> 25 -> 50 -> 100，各级之间设门控
    var mx = 300, mw = 190, my = 40, mh = 130;
    s.appendChild(txt(mx + mw / 2, 28, '灰度版本的线上流量占比', '9', INKS));
    s.appendChild(svgEl('rect', { x: mx, y: my, width: mw, height: mh, rx: '3', fill: 'none', stroke: SOFT, 'stroke-width': '1.2' }));
    var fill = svgEl('rect', { x: mx, y: my + mh, width: mw, height: 0, fill: BP, opacity: '0.3' });
    fill.appendChild(anim('height', '13;13;33;33;65;65;130;130;13', '6s', { keyTimes: '0;0.16;0.24;0.4;0.48;0.64;0.72;0.94;1', calcMode: 'spline', keySplines: '0 0 1 1;' + EASE + ';0 0 1 1;' + EASE + ';0 0 1 1;' + EASE + ';0 0 1 1;0.4 0 1 1' }));
    fill.appendChild(anim('y', (my + mh - 13) + ';' + (my + mh - 13) + ';' + (my + mh - 33) + ';' + (my + mh - 33) + ';' + (my + mh - 65) + ';' + (my + mh - 65) + ';' + (my + mh - 130) + ';' + (my + mh - 130) + ';' + (my + mh - 13), '6s', { keyTimes: '0;0.16;0.24;0.4;0.48;0.64;0.72;0.94;1', calcMode: 'spline', keySplines: '0 0 1 1;' + EASE + ';0 0 1 1;' + EASE + ';0 0 1 1;' + EASE + ';0 0 1 1;0.4 0 1 1' }));
    s.appendChild(fill);
    var steps = [[13, '10%'], [33, '25%'], [65, '50%'], [130, '100%']];
    for (i = 0; i < steps.length; i++) {
      s.appendChild(svgEl('line', { x1: mx, y1: my + mh - steps[i][0], x2: mx + mw, y2: my + mh - steps[i][0], stroke: SOFT, 'stroke-width': '0.7', 'stroke-dasharray': '2 3' }));
      s.appendChild(txt(mx + mw + 6, my + mh - steps[i][0] + 3, steps[i][1], '8', MUTE, 'start'));
    }
    var gate = entry(mx + mw / 2, my + mh + 20, '6s', '0s', 0.16, 0.22);
    gate.appendChild(txt(0, 3, '关卡：延迟、成本、拒绝率、长度、反馈', '7', WARN));
    s.appendChild(gate);
    s.appendChild(txt(260, 238, '每步通过指标关卡后才放量；回滚只需切换策略', '9', MUTE));
    shell(host, '先影子验证，再灰度发布（Shadow then Canary）', '先镜像请求，再逐级放量并检查指标', s,
      '影子模式（Shadow Mode）把生产请求复制给候选模型并丢弃其回答，在不让用户承担风险的情况下捕获成本激增和分布偏移（Distribution Shift）。之后才开始灰度发布（Canary Rollout）：依次放量至 10%、25%、50%、100%，每步检查延迟分位数、单请求成本、拒绝率、输出长度分布及用户反馈。回滚只需切换策略，耗时以秒计，无须重新部署。');
  }

  // ── i4-incident-agents: 监督者（Supervisor）扇出至各智能体，人工门控（Human gate）决定行动 ──
  // 23-sre-for-ai
  function incidentAgents(host) {
    var s = svg(250);
    var agents = [[52, '日志'], [118, '指标'], [184, '操作手册']];
    s.appendChild(rect(30, 96, 80, 44, BG, INK));
    s.appendChild(txt(70, 114, '监督者', '9', INK));
    s.appendChild(txt(70, 128, '故障分诊', '8', MUTE));
    var alert = svgEl('g', {}, [svgEl('circle', { cx: 0, cy: 0, r: 6, fill: WARN }), txt(0, 3, '!', '9', BG)]);
    alert.appendChild(motion('M-20 118 L30 118', '5.4s', '0s'));
    alert.appendChild(anim('opacity', '1;1;0;0', '5.4s', { keyTimes: '0;0.09;0.11;1' }));
    s.appendChild(alert);
    var i;
    for (i = 0; i < agents.length; i++) {
      var ax = 220, ay = agents[i][0];
      s.appendChild(rect(ax, ay - 16, 86, 34, BG, BP));
      s.appendChild(txt(ax + 43, ay + 4, agents[i][1] + '智能体', '8.5', BP));
      s.appendChild(svgEl('path', { d: 'M110 112 L' + ax + ' ' + ay, fill: 'none', stroke: SOFT, 'stroke-width': '1', 'stroke-dasharray': '3 4' }));
      // 发出查询，返回证据
      var qd = svgEl('circle', { cx: 0, cy: 0, r: 4, fill: BP });
      qd.appendChild(motion('M70 118 L' + (ax + 43) + ' ' + ay + ' L70 118', '5.4s', (0.6 + i * 0.25) + 's'));
      qd.appendChild(anim('opacity', '0;1;1;0;0', '5.4s', { keyTimes: '0;0.12;0.5;0.55;1', begin: (0.6 + i * 0.25) + 's' }));
      s.appendChild(qd);
    }
    var hyp = entry(70, 178, '5.4s', '0s', 0.55, 0.64);
    hyp.appendChild(svgEl('rect', { x: -55, y: -14, width: 110, height: 28, rx: '4', fill: SURF, stroke: BP, 'stroke-width': '1.2' }));
    hyp.appendChild(txt(0, -1, '假设：', '8', BP));
    hyp.appendChild(txt(0, 10, 'vLLM OOM，KV 激增', '8', INKS));
    s.appendChild(hyp);
    s.appendChild(rect(350, 96, 66, 44, BG, WARN));
    s.appendChild(txt(383, 114, '人工', '9', WARN));
    s.appendChild(txt(383, 128, '是否批准？', '8', MUTE));
    s.appendChild(rect(440, 96, 66, 44, BG, INKS));
    s.appendChild(txt(473, 114, '处置', '9', INKS));
    s.appendChild(txt(473, 128, '重启 Pod', '7.5', MUTE));
    var toGate = svgEl('circle', { cx: 0, cy: 0, r: 4.5, fill: BP });
    toGate.appendChild(motion('M125 178 L383 178 L383 118 L383 118 L473 118', '5.4s', '0s'));
    toGate.appendChild(anim('opacity', '0;0;1;1;1;0', '5.4s', { keyTimes: '0;0.66;0.7;0.82;0.95;1' }));
    s.appendChild(toGate);
    var ok = entry(383, 78, '5.4s', '0s', 0.8, 0.86);
    ok.appendChild(txt(0, 3, '已批准', '8', WARN));
    s.appendChild(ok);
    s.appendChild(txt(260, 238, '智能体并行收集证据，判断仍由人负责', '9', MUTE));
    shell(host, 'AI SRE 故障分诊（Triage）', '监督者并行分派，汇总证据，人工审批修复', s,
      '告警首先交给监督者智能体（Supervisor Agent），由它向专用智能体分发查询：一个检索日志，一个关联指标与部署，一个匹配操作手册（Runbook）。值班人员还没打开看板，证据就已汇总为故障假设，例如 KV 缓存激增导致 vLLM 内存不足（Out of Memory，OOM）。补救措施仍需人工批准，自动处置范围保持有限：重启 Pod、回退部署，不在凌晨三点自主重构服务架构。这是面向 AI 的站点可靠性工程（Site Reliability Engineering，SRE）流程。');
  }

  // ── i4-chaos-guard: 故障注入（Fault injections）持续生效，直到消耗速率防护（Burn-rate guard）中止 ──
  // 24-chaos-engineering-llm
  function chaosGuard(host) {
    var s = svg(240);
    s.appendChild(rect(40, 40, 110, 44, BG, INKS));
    s.appendChild(txt(95, 58, '控制平面', '9', INKS));
    s.appendChild(txt(95, 72, '调度器', '8', MUTE));
    s.appendChild(rect(230, 90, 130, 60, BG, INK));
    s.appendChild(txt(295, 112, '目标：LLM 服务', '9', INK));
    s.appendChild(txt(295, 128, 'KV 缓存、网关', '8', MUTE));
    // 向目标发送三个故障：两个生效，第三个被中止
    var faults = [['429 风暴', '0s', BP], ['KV 驱逐', '1.8s', BP], ['网络丢包', '3.6s', WARN]];
    var i;
    for (i = 0; i < faults.length; i++) {
      var g = svgEl('g', { opacity: 0 }, [
        svgEl('rect', { x: -26, y: -9, width: 52, height: 18, rx: '3', fill: BG, stroke: faults[i][2], 'stroke-width': '1.2' }),
        txt(0, 3, faults[i][0], '7.5', faults[i][2])
      ]);
      var land = i < 2;
      g.appendChild(motion(land ? 'M95 84 L95 120 L226 120' : 'M95 84 L95 120 L180 120 L180 120', '5.4s', faults[i][1]));
      g.appendChild(anim('opacity', land ? '0;1;1;0;0' : '0;1;1;1;0;0', '5.4s',
        { keyTimes: land ? '0;0.05;0.3;0.34;1' : '0;0.05;0.28;0.32;0.36;1', begin: faults[i][1] }));
      s.appendChild(g);
    }
    // 安全平面（Safety plane）：错误预算（Error-budget）消耗量表填满，越过 2x，中止信号落下
    var bx = 410, by = 40, bh = 110;
    s.appendChild(txt(bx + 20, 30, '预算消耗速率', '8.5', INKS));
    s.appendChild(svgEl('rect', { x: bx, y: by, width: 40, height: bh, rx: '3', fill: 'none', stroke: SOFT, 'stroke-width': '1.2' }));
    s.appendChild(svgEl('line', { x1: bx - 4, y1: by + 36, x2: bx + 44, y2: by + 36, stroke: WARN, 'stroke-width': '1', 'stroke-dasharray': '3 3' }));
    s.appendChild(txt(bx + 58, by + 39, '2x', '8', WARN, 'start'));
    var burn = svgEl('rect', { x: bx + 3, y: by + bh - 3, width: 34, height: 0, fill: BP, opacity: '0.45' });
    burn.appendChild(anim('height', '0;20;44;80;80;0', '5.4s', { keyTimes: '0;0.2;0.45;0.68;0.94;1', calcMode: 'spline', keySplines: EASE + ';' + EASE + ';' + EASE + ';0 0 1 1;0.4 0 1 1' }));
    burn.appendChild(anim('y', (by + bh - 3) + ';' + (by + bh - 23) + ';' + (by + bh - 47) + ';' + (by + bh - 83) + ';' + (by + bh - 83) + ';' + (by + bh - 3), '5.4s', { keyTimes: '0;0.2;0.45;0.68;0.94;1', calcMode: 'spline', keySplines: EASE + ';' + EASE + ';' + EASE + ';0 0 1 1;0.4 0 1 1' }));
    burn.appendChild(anim('fill', BP + ';' + BP + ';' + BP + ';' + WARN + ';' + WARN + ';' + BP, '5.4s', { keyTimes: '0;0.2;0.45;0.68;0.94;1' }));
    s.appendChild(burn);
    var abort = entry(260, 190, '5.4s', '0s', 0.66, 0.72);
    abort.appendChild(svgEl('rect', { x: -92, y: -13, width: 184, height: 26, rx: '4', fill: SURF, stroke: WARN, 'stroke-width': '1.4' }));
    abort.appendChild(txt(0, 4, '消耗速率 > 2 倍，暂停实验', '8.5', WARN));
    s.appendChild(abort);
    s.appendChild(txt(260, 228, '故障注入受调度约束，安全平面随时可以终止实验', '9', MUTE));
    shell(host, '受控混沌实验（Guarded Chaos）', '故障注入持续到消耗速率护栏触发终止', s,
      '控制平面（Control Plane）安排针对目标服务的故障注入（Fault Injection）：429 风暴、KV 缓存驱逐、网络丢包。安全平面（Safety Plane）全程监测错误预算（Error Budget）的消耗速率。日消耗速率超过预期的两倍时，护栏立即中止正在运行的实验，最后一次故障不会作用于目标。缺少这道约束，混沌工程（Chaos Engineering）就成了主动制造事故。');
  }

  // ── i4-vault-rotation: 密钥在保险库（Vault）中轮换，网关实时获取新密钥 ──
  // 25-security-secrets-audit
  function vaultRotation(host) {
    var s = svg(240);
    s.appendChild(rect(40, 80, 90, 70, BG, INK));
    s.appendChild(txt(85, 72, '凭证库', '9', INK));
    // 已存储的密钥标签：旧密钥淡出，新密钥原地放大出现
    var oldKey = svgEl('g', { transform: 'translate(85 115)' }, [
      svgEl('rect', { x: -30, y: -10, width: 60, height: 20, rx: '3', fill: WARN, opacity: '0.8' }),
      txt(0, 4, '密钥 v1', '8.5', BG)
    ]);
    oldKey.appendChild(anim('opacity', '1;1;0;0;1', '5.6s', { keyTimes: '0;0.3;0.36;0.96;1' }));
    s.appendChild(oldKey);
    var newKey = entry(85, 115, '5.6s', '0s', 0.36, 0.46);
    newKey.appendChild(svgEl('rect', { x: -30, y: -10, width: 60, height: 20, rx: '3', fill: BP }));
    newKey.appendChild(txt(0, 4, '密钥 v2', '8.5', BG));
    s.appendChild(newKey);
    var rot = entry(85, 166, '5.6s', '0s', 0.3, 0.38);
    rot.appendChild(txt(0, 3, '轮换周期 ≤90 天', '8', MUTE));
    s.appendChild(rot);
    s.appendChild(rect(220, 85, 100, 60, BG, INKS));
    s.appendChild(txt(270, 107, 'AI 网关', '9', INKS));
    s.appendChild(txt(270, 122, '运行时获取密钥', '7.5', MUTE));
    var pull = svgEl('path', { d: 'M130 115 L220 115', fill: 'none', stroke: BP, 'stroke-width': '1.4', 'stroke-dasharray': '4 4' });
    pull.appendChild(anim('stroke-dashoffset', '16;0', '0.8s'));
    s.appendChild(pull);
    // 密钥材料仅沿 vault -> gateway 传送；轮换后变色
    var kd = svgEl('rect', { x: -7, y: -5, width: 14, height: 10, rx: '2', fill: WARN });
    kd.appendChild(motion('M115 115 L215 115', '2.8s', '0s'));
    kd.appendChild(anim('fill', WARN + ';' + WARN + ';' + BP + ';' + BP, '5.6s', { keyTimes: '0;0.35;0.44;1' }));
    s.appendChild(kd);
    // 应用通过网关调用，从不持有凭据（Credential）
    var apps = [[55, '应用 A'], [115, '应用 B'], [175, '应用 C']];
    var i;
    for (i = 0; i < apps.length; i++) {
      s.appendChild(rect(400, apps[i][0] - 14, 76, 30, BG, SOFT));
      s.appendChild(txt(438, apps[i][0] + 5, apps[i][1], '8.5', MUTE));
      s.appendChild(svgEl('path', { d: 'M400 ' + apps[i][0] + ' L324 ' + (100 + i * 12), fill: 'none', stroke: SOFT, 'stroke-width': '1' }));
      var rq = svgEl('circle', { cx: 0, cy: 0, r: 3.5, fill: INKS });
      rq.appendChild(motion('M438 ' + (apps[i][0] + 12) + ' L270 130', '2.2s', (i * 0.7) + 's'));
      s.appendChild(rq);
    }
    s.appendChild(txt(430, 206, '环境文件与 VCS 不存密钥', '8', MUTE));
    s.appendChild(txt(260, 228, '凭证库轮换一次，应用数分钟内更新，无须重新部署', '9', MUTE));
    shell(host, '凭证库密钥轮换（Vault-Backed Rotation）', '集中更换密钥，网关在运行时获取新版本', s,
      '凭证仅保存在凭证库（Vault）中。应用调用 AI 网关（AI Gateway），网关在运行时获取当前密钥，服务不持有静态凭证，环境文件和版本控制系统（Version Control System，VCS）也不保存密钥。密钥从 v1 轮换为 v2 时，只改一个位置，所有调用者便可在数分钟内使用新版本：无须重新部署、修改 40 份配置文件，也无须询问谁持有新密钥。90 天轮换策略由一次迁移任务变为日常操作。');
  }

  // ── i4-control-matrix: 一项控制措施（Control）点亮各框架行中的对应单元 ──
  // 26-compliance-frameworks
  function controlMatrix(host) {
    var s = svg(250);
    var rows = [['SOC 2 II', 1], ['GDPR', 1], ['HIPAA', 1], ['EU AI Act', 0], ['ISO 42001', 0]];
    var cols = [['访问控制', 140], ['PII 脱敏', 250], ['审计日志', 360]];
    // 哪些控制措施满足哪些框架（1 = 单元点亮）
    var map = [[1, 1, 1], [1, 1, 1], [1, 1, 1], [0, 1, 1], [1, 0, 1]];
    var i, j;
    for (j = 0; j < cols.length; j++) { s.appendChild(txt(cols[j][1] + 40, 38, cols[j][0], '8.5', INKS)); }
    for (i = 0; i < rows.length; i++) {
      var ry = 54 + i * 34;
      s.appendChild(txt(126, ry + 15, rows[i][0], '8.5', MUTE, 'end'));
      for (j = 0; j < cols.length; j++) {
        s.appendChild(svgEl('rect', { x: cols[j][1], y: ry, width: 80, height: 24, rx: '2', fill: 'none', stroke: SOFT, 'stroke-width': '1' }));
        if (map[i][j]) {
          var c = svgEl('rect', { x: cols[j][1] + 2, y: ry + 2, width: 76, height: 20, rx: '2', fill: BP, opacity: '0' });
          c.appendChild(anim('opacity', '0;0;0.35;0.35;0', '5.2s', { keyTimes: '0;' + (0.1 + j * 0.22).toFixed(2) + ';' + (0.16 + j * 0.22).toFixed(2) + ';0.94;1', calcMode: 'spline', keySplines: SPL4, begin: (i * 0.05).toFixed(2) + 's' }));
          s.appendChild(c);
        }
      }
    }
    // 一项已实施控制措施扫过自己的列，点亮所有映射到的行
    var chip = svgEl('g', {}, [
      svgEl('rect', { x: -38, y: -10, width: 76, height: 20, rx: '3', fill: BG, stroke: BP, 'stroke-width': '1.4' }),
      txt(0, 4, '实现一次', '8', BP)
    ]);
    chip.appendChild(motion('M180 24 L180 24 L290 24 L290 24 L400 24 L400 24', '5.2s', '0s'));
    s.appendChild(chip);
    s.appendChild(txt(260, 238, '一项控制措施映射多个框架，复用已有实现填补矩阵', '9', MUTE));
    shell(host, '控制措施交叉映射（Control Cross-Mapping）', '一项控制措施点亮其覆盖的各框架单元格', s,
      '采购评审要求按框架逐行列出合规矩阵，交叉映射可以减少重复工作。一套访问控制（Access Control）实现可同时映射到 SOC 2、通用数据保护条例（GDPR）第 32 条、健康保险流通与责任法案（HIPAA）164.312(a) 及 ISO 要求；个人身份信息脱敏（PII Redaction）和审计日志（Audit Logging）分别覆盖另外两列。每项控制措施只实现一次，就可用于多项合规说明，因此覆盖五个框架的成本远低于五次独立审计；剩余缺口也清楚地归属于特定框架。图中还列出欧盟人工智能法案（EU AI Act）与 ISO 42001。');
  }

  // ── i4-spend-ladder: 各租户量表填满，其中一个触及上限并触发紧急停止开关（Kill switch） ──
  // 27-finops-llms
  function spendLadder(host) {
    var s = svg(250);
    s.appendChild(txt(40, 24, '请求创建时标记 tenant_id，词元成本按租户计量', '9', INKS, 'start'));
    var tens = [
      { x: 70, name: '租户 A', fills: '0;44;56;62;62;0', ok: true },
      { x: 220, name: '租户 B', fills: '0;30;38;44;44;0', ok: true },
      { x: 370, name: '租户 C', fills: '0;60;104;118;118;0', ok: false }
    ];
    var by = 60, bh = 120, i;
    for (i = 0; i < tens.length; i++) {
      var t = tens[i];
      s.appendChild(svgEl('rect', { x: t.x, y: by, width: 56, height: bh, rx: '3', fill: 'none', stroke: t.ok ? SOFT : WARN, 'stroke-width': '1.2' }));
      s.appendChild(svgEl('line', { x1: t.x - 4, y1: by + 24, x2: t.x + 60, y2: by + 24, stroke: WARN, 'stroke-width': '1', 'stroke-dasharray': '3 3' }));
      s.appendChild(txt(t.x + 28, by + bh + 16, t.name, '8.5', t.ok ? MUTE : WARN));
      var kt = '0;0.25;0.5;0.72;0.94;1';
      var f = svgEl('rect', { x: t.x + 3, y: by + bh - 3, width: 50, height: 0, fill: t.ok ? BP : WARN, opacity: '0.45' });
      f.appendChild(anim('height', t.fills, '5.6s', { keyTimes: kt, calcMode: 'spline', keySplines: EASE + ';' + EASE + ';' + EASE + ';0 0 1 1;0.4 0 1 1' }));
      f.appendChild(anim('y', t.fills.split(';').map(function (v) { return by + bh - 3 - Number(v); }).join(';'), '5.6s', { keyTimes: kt, calcMode: 'spline', keySplines: EASE + ';' + EASE + ';' + EASE + ';0 0 1 1;0.4 0 1 1' }));
      s.appendChild(f);
      // 词元（Token）落入各量表
      var d = svgEl('circle', { cx: 0, cy: 0, r: 3.5, fill: t.ok ? BP : WARN });
      d.appendChild(motion('M' + (t.x + 28) + ' 40 L' + (t.x + 28) + ' ' + (by + 20), '1.1s', (i * 0.3) + 's'));
      s.appendChild(d);
    }
    s.appendChild(txt(36, by + 27, '上限', '8', WARN, 'start'));
    // 租户 C 越过每日上限：触发紧急停止开关，切断输入
    var kill = entry(398, 44, '5.6s', '0s', 0.52, 0.6);
    kill.appendChild(svgEl('rect', { x: -62, y: -12, width: 124, height: 24, rx: '4', fill: SURF, stroke: WARN, 'stroke-width': '1.4' }));
    kill.appendChild(txt(0, 4, 'z > 4：切断调用，429', '8', WARN));
    s.appendChild(kill);
    s.appendChild(txt(260, 238, '依次限流、限制支出、紧急切断：A、B 不受 C 影响', '9', MUTE));
    shell(host, '租户支出计量（Tenant Spend Meters）', '逐租户累积支出，超限时逐级执行约束', s,
      '每次调用创建时就带上 tenant_id，成本发生后立即计入对应租户，无须事后补标签。租户 A、B 正常累积支出，均低于每日上限。租户 C 的支出突增并超过上限，其支出标准分数（Z-Score）超过 4，紧急切断开关（Kill Switch）开始返回 429，同时通知值班人员。约束依次为速率限制（Rate Limit）、支出上限（Spend Cap）、紧急切断，影响范围（Blast Radius）始终限定在一个租户内。');
  }

  LF.register({
    'i4-platform-lanes': platformLanes,
    'i4-otel-glue': otelGlue,
    'i4-canary-ramp': canaryRamp,
    'i4-incident-agents': incidentAgents,
    'i4-chaos-guard': chaosGuard,
    'i4-vault-rotation': vaultRotation,
    'i4-control-matrix': controlMatrix,
    'i4-spend-ladder': spendLadder
  });
})();
