/* figures-misc2.js：跨阶段 15（自主系统（Autonomous systems））、
   阶段 17（基础设施与生产（Infrastructure and production））及阶段 11（大语言模型工程（LLM engineering））
   的动画课程图表。在 lesson-figures.js 之后加载，通过
   window.LF.register 注册。原生 ES5，无依赖，主题由 CSS 变量控制。动画
   仅使用 SMIL（animate / animateMotion / animateTransform）。编写时仍使用相同的
   围栏块：
       ```figure
       mx-tool-call-loop
       ```  */
(function () {
  'use strict';
  var LF = window.LF;
  if (!LF) { return; }
  var el = LF.el, svgEl = LF.svgEl;

  var BP = 'var(--blueprint,#3553ff)';
  var SOFT = 'var(--rule-soft,#ccc)';
  var MUTE = 'var(--ink-mute,#999)';
  var WARN = 'var(--warn,#b8870f)';
  var INK = 'var(--ink,#1a1a1a)';
  var BG = 'var(--bg,#fafaf5)';

  function shell(host, label, sub, svg, cap) {
    host.appendChild(el('div', { class: 'lf' }, [
      el('div', { class: 'lf-head' }, [el('span', { class: 'lf-label' }, [label]), el('span', {}, [sub])]),
      el('div', { class: 'lf-body' }, [el('div', { class: 'lf-out' }, [svg])]),
      el('div', { class: 'lf-cap' }, [cap])
    ]));
  }
  function anim(attr, vals, dur, extra) {
    var a = { attributeName: attr, values: vals, dur: dur, repeatCount: 'indefinite' };
    if (extra) for (var k in extra) a[k] = extra[k];
    return svgEl('animate', a);
  }
  function motion(path, dur, begin) {
    return svgEl('animateMotion', { path: path, dur: dur, begin: begin || '0s', repeatCount: 'indefinite' });
  }
  function box(x, y, w, h, fill, stroke) {
    return svgEl('rect', { x: x, y: y, width: w, height: h, rx: 4, fill: fill || 'none', stroke: stroke || SOFT, 'stroke-width': 1.4 });
  }
  function txt(x, y, s, size, fill, anchor) {
    return svgEl('text', { x: x, y: y, 'font-family': 'var(--font-mono,monospace)', 'font-size': size || 11, fill: fill || MUTE, 'text-anchor': anchor || 'middle' }, [document.createTextNode(s)]);
  }

  // ── mx-propose-then-commit: 持久记录（Durable record）依次经过 提议→评审→提交→验证
  // phases/15-autonomous-systems/15-propose-then-commit
  function proposeThenCommit(host) {
    var W = 520, H = 230;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var stages = [
      { x: 40, t: '提议', s: '持久化 + 幂等键' },
      { x: 170, t: '审核', s: '意图 · 影响范围' },
      { x: 300, t: '提交执行', s: '明确确认' },
      { x: 430, t: '验证', s: '实际产生效果？' }
    ];
    stages.forEach(function (st, i) {
      svg.appendChild(svgEl('rect', { x: st.x, y: 80, width: 90, height: 50, rx: 4, fill: 'none', stroke: SOFT, 'stroke-width': 1.6 }));
      var active = svgEl('rect', { x: st.x, y: 80, width: 90, height: 50, rx: 4, fill: 'none', stroke: BP, 'stroke-width': 1.6, 'stroke-opacity': 0 });
      active.appendChild(anim('stroke-opacity', '0;1;0', '6.4s', { begin: (i * 1.6) + 's' }));
      svg.appendChild(active);
      svg.appendChild(txt(st.x + 45, 102, st.t, 9, INK));
      svg.appendChild(txt(st.x + 45, 118, st.s, 7.5, MUTE));
      if (i < 3) svg.appendChild(svgEl('path', { d: 'M' + (st.x + 90) + ' 105 L' + (st.x + 130) + ' 105', fill: 'none', stroke: SOFT, 'stroke-width': 1.2 }));
    });
    // 持久记录词元在各阶段之间移动并循环
    var rec = svgEl('g', {}, [svgEl('rect', { x: -11, y: -9, width: 22, height: 18, rx: 3, fill: BP }), txt(0, 4, '记录', 7.5, BG)]);
    rec.appendChild(motion('M85 105 L215 105 L345 105 L475 105', '6.4s', '0s'));
    svg.appendChild(rec);
    // 走过场式审批（Rubber-stamp）警告：从评审快速越过提交的捷径被标记
    var stamp = txt(215, 60, '走过场式批准：跳过审核', 8, WARN);
    stamp.appendChild(anim('opacity', '0;0;0;1;1;0', '6.4s', { begin: '1.6s' }));
    svg.appendChild(stamp);
    svg.appendChild(txt(260, 175, '幂等键：重复提交返回同一条记录', 8.5, MUTE));
    svg.appendChild(txt(260, 192, '收到明确确认才提交执行，再验证实际效果是否发生', 8.5, MUTE));
    shell(host, '先提议后提交（Propose-then-commit）', '持久化提议经过四个受控阶段', svg,
      '2026 年的人在回路（Human-in-the-loop，HITL）模式不只是同步弹出“批准”提示。系统用幂等键（Idempotency Key）持久化拟执行动作，展示意图、影响范围（Blast Radius）和回滚计划（Rollback Plan）；只有收到明确确认才提交执行，随后验证副作用（Side Effect）是否实际发生。失败模式是走过场式批准（Rubber-stamp），即未经审核就点击批准。已有文档给出的缓解方式，是结合明确检查清单的质询—回应（Challenge-and-response）流程。');
  }

  // ── mx-priority-tiers: 四级解析器（Resolver），较高层级始终胜出 ──
  // phases/15-autonomous-systems/17-constitutional-ai
  function priorityTiers(host) {
    var W = 520, H = 240;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var tiers = [
      { y: 40, t: '1 · 安全与监督', c: WARN, w: 380, hard: true },
      { y: 88, t: '2 · 伦理', c: BP, w: 300, hard: false },
      { y: 136, t: '3 · Anthropic 指南', c: MUTE, w: 230, hard: false },
      { y: 184, t: '4 · 有用性', c: SOFT, w: 160, hard: false }
    ];
    tiers.forEach(function (ti, i) {
      var x = (W - ti.w) / 2;
      svg.appendChild(svgEl('rect', { x: x, y: ti.y, width: ti.w, height: 36, rx: 4, fill: 'none', stroke: ti.c, 'stroke-width': i === 0 ? 2 : 1.4 }));
      svg.appendChild(txt(W / 2, ti.y + 23, ti.t, 9.5, ti.hard ? WARN : INK));
    });
    // 请求信号逐层上升，并在最高层级得到裁决
    var probe = svgEl('circle', { cx: W / 2 + 130, cy: 202, r: 6, fill: BP });
    probe.appendChild(anim('cy', '202;202;154;106;58;58', '5s'));
    probe.appendChild(anim('cx', (W / 2 + 130) + ';' + (W / 2 + 130) + ';' + (W / 2 + 90) + ';' + (W / 2 + 40) + ';' + (W / 2) + ';' + (W / 2), '5s'));
    svg.appendChild(probe);
    var win = txt(W / 2, 30, '发生冲突 → 高层级优先', 9, WARN);
    win.appendChild(anim('opacity', '0;0;0;0;1;1', '5s'));
    svg.appendChild(win);
    svg.appendChild(txt(W / 2, 228, '第 1 层为硬编码规则，运营方和用户均不能覆盖', 8.5, MUTE));
    shell(host, '宪法式 AI 优先级（Constitutional Priority Tiers）', '四个层级，冲突时高层级优先', svg,
      '2026 年 Claude 原则章程（Claude Constitution）将行为准则分为四层：安全与支持人类监督优先，其次是伦理，再次是 Anthropic 指南，最后是有用性。层级冲突时，高层级优先，结构类似 Unix 优先级或网络服务质量（Quality of Service，QoS）。硬编码禁令高于整个层级体系，不能被覆盖；其余规则在层级内依据理由判断，以可审计性换取对未见场景的泛化能力（Generalisation）。');
  }

  // ── mx-research-loop: 假设→代码→运行→批评的循环，配有沙箱（Sandbox）与评审（Review）
  // phases/15-autonomous-systems/05-ai-scientist-v2
  function researchLoop(host) {
    var W = 520, H = 280, CX = 260, CY = 120, R = 78;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var nodes = [
      { a: -90, t: '研究想法', c: BP },
      { a: -30, t: '有新颖性？', c: MUTE },
      { a: 30, t: '设计实验', c: BP },
      { a: 90, t: '沙箱运行', c: WARN },
      { a: 150, t: '图表', c: BP },
      { a: 210, t: '撰写论文', c: BP }
    ];
    // 虚线循环环
    var ring = svgEl('circle', { cx: CX, cy: CY, r: R, fill: 'none', stroke: SOFT, 'stroke-width': 1.4, 'stroke-dasharray': '5 5' });
    ring.appendChild(anim('stroke-dashoffset', '40;0', '2.2s'));
    svg.appendChild(ring);
    nodes.forEach(function (n) {
      var rad = n.a * Math.PI / 180;
      var x = CX + R * Math.cos(rad), y = CY + R * Math.sin(rad);
      svg.appendChild(svgEl('circle', { cx: x, cy: y, r: 5, fill: n.c }));
      var lx = CX + (R + 30) * Math.cos(rad), ly = CY + (R + 30) * Math.sin(rad) + 3;
      svg.appendChild(txt(lx, ly, n.t, 8.5, n.c === WARN ? WARN : INK));
    });
    // 循环指针沿环运行
    var ptr = svgEl('circle', { cx: 0, cy: 0, r: 7, fill: BP });
    ptr.appendChild(motion('M' + CX + ' ' + (CY - R) + ' A ' + R + ' ' + R + ' 0 1 1 ' + (CX - 0.1) + ' ' + (CY - R) + ' Z', '5s', '0s'));
    svg.appendChild(ptr);
    // 中央批评标签
    svg.appendChild(txt(CX, CY - 4, 'VLM', 9, INK));
    svg.appendChild(txt(CX, CY + 10, '评议', 8, MUTE));
    svg.appendChild(txt(CX, 268, '42% 的运行因编码错误失败；循环从沙箱处重新进入', 8.5, WARN));
    shell(host, '自主研究循环（Autonomous Research Loop）', '想法 → 实验 → 沙箱 → 评议，反复迭代', svg,
      'AI Scientist v2 无需人工模板即可闭合研究循环：生成想法、检查新颖性（Novelty）、设计并在沙箱（Sandbox）中运行实验，让视觉语言模型评议图表，再撰写论文，并根据内部评审迭代。一篇生成论文通过了 ICLR 2025 研讨会评审。独立评估发现，42% 的实验因编码错误失败，新颖性检查也经常将已有方法误判为新方法。因此，循环中的沙箱执行环节决定了可靠性。');
  }

  // ── mx-speculative-tree: 草稿提出 K 个词元，目标模型验证并接受/拒绝
  // phases/17-infrastructure-and-production/05-eagle3-speculative-decoding
  function speculativeTree(host) {
    var W = 520, H = 235;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    svg.appendChild(box(30, 95, 70, 44, BG, BP));
    svg.appendChild(txt(65, 113, '草稿', 9, BP));
    svg.appendChild(txt(65, 127, '预测头', 8, MUTE));
    svg.appendChild(box(370, 95, 80, 44, BG, INK));
    svg.appendChild(txt(410, 113, '目标模型', 9, INK));
    svg.appendChild(txt(410, 127, '一次前向传播', 8, MUTE));
    // K 个草稿词元排在草稿模型与目标模型之间；最后一个被拒绝
    var ks = [{ x: 140, ok: true }, { x: 190, ok: true }, { x: 240, ok: true }, { x: 290, ok: false }];
    ks.forEach(function (k, i) {
      var tok = svgEl('rect', { x: k.x, y: 102, width: 30, height: 28, rx: 3, fill: 'none', stroke: SOFT, 'stroke-width': 1.4 });
      tok.appendChild(anim('stroke', SOFT + ';' + (k.ok ? BP : WARN) + ';' + (k.ok ? BP : WARN), '4s', { begin: (i * 0.4) + 's' }));
      svg.appendChild(tok);
      svg.appendChild(txt(k.x + 15, 120, 't' + (i + 1), 8, MUTE));
      var mark = txt(k.x + 15, 152, k.ok ? '接受' : '拒绝', 7.5, k.ok ? BP : WARN);
      mark.appendChild(anim('opacity', '0;0;1;1', '4s', { begin: (i * 0.4) + 's' }));
      svg.appendChild(mark);
    });
    // 草稿模型提出候选，词元向右流动；目标模型验证，以一次反向脉冲表示
    var prop = svgEl('circle', { cx: 0, cy: 0, r: 5, fill: BP });
    prop.appendChild(motion('M100 117 L370 117', '4s', '0s'));
    svg.appendChild(prop);
    var verify = svgEl('rect', { x: 365, y: 90, width: 90, height: 54, rx: 4, fill: 'none', stroke: INK, 'stroke-width': 1 });
    verify.appendChild(anim('opacity', '0.2;1;0.2', '4s', { begin: '1.8s' }));
    svg.appendChild(verify);
    svg.appendChild(txt(260, 185, '接受的词元无额外开销；一次拒绝需要目标模型再计算一遍', 8.5, MUTE));
    svg.appendChild(txt(260, 202, 'alpha < 约 0.55 → 推测解码的净收益为负', 8.5, WARN));
    shell(host, '推测解码（Speculative Decoding）', '草稿提出 K 个词元，目标模型一次验证', svg,
      'EAGLE-3 根据目标模型的隐藏状态训练草稿头（Draft Head），使其分布贴近目标；在通用对话中，接受率（Acceptance Rate）alpha 落在 0.6–0.8 区间。草稿提出 K 个词元，目标模型用一次前向传播验证全部 K 个词元，接受的词元摊销后没有额外开销。但每次拒绝草稿都需要目标模型再计算一遍，因此 alpha 低于约 0.55 时，该技术在高并发下的净收益为负。先在真实流量上测量 alpha，再启用功能开关。');
  }

  // ── mx-gateway-fallback: 一个 API 扇出至多个服务商（Providers），遇到 429 重新路由 ──
  // phases/17-infrastructure-and-production/19-ai-gateways
  function gatewayFallback(host) {
    var W = 520, H = 235;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    svg.appendChild(box(40, 95, 80, 46, BG, INK));
    svg.appendChild(txt(80, 113, '网关', 9, INK));
    svg.appendChild(txt(80, 128, '统一 API', 8, MUTE));
    var prov = [
      { y: 45, t: '主服务', s: '429，超出配额', c: WARN, down: true },
      { y: 110, t: '备用服务', s: '处理请求', c: BP, down: false },
      { y: 175, t: '自托管', s: '后备', c: MUTE, down: false }
    ];
    prov.forEach(function (p) {
      svg.appendChild(box(390, p.y - 20, 110, 40, BG, p.c));
      svg.appendChild(txt(445, p.y - 4, p.t, 9, p.c));
      svg.appendChild(txt(445, p.y + 10, p.s, 7.5, MUTE));
    });
    // 主链路被阻断（warn），回退链路（Fallback link）活动（蓝色虚线）
    svg.appendChild(svgEl('path', { d: 'M120 108 L388 45', fill: 'none', stroke: WARN, 'stroke-width': 1.2, 'stroke-dasharray': '3 5' }));
    var fb = svgEl('path', { d: 'M120 116 L388 110', fill: 'none', stroke: BP, 'stroke-width': 2, 'stroke-dasharray': '6 4' });
    fb.appendChild(anim('stroke-dashoffset', '20;0', '0.8s'));
    svg.appendChild(fb);
    svg.appendChild(svgEl('path', { d: 'M120 124 L388 175', fill: 'none', stroke: SOFT, 'stroke-width': 1, 'stroke-dasharray': '3 5' }));
    // 请求进入：先尝试主链路，被弹回后转向回退链路
    var i;
    for (i = 0; i < 4; i++) {
      var g = svgEl('g', {}, [svgEl('circle', { cx: 0, cy: 0, r: 5, fill: BP })]);
      g.appendChild(motion('M-20 116 L80 116 L445 110', '3s', (i * 0.55) + 's'));
      svg.appendChild(g);
    }
    var bounce = txt(250, 60, '429 → 重新路由', 8, WARN);
    bounce.appendChild(anim('opacity', '0.3;1;0.3', '1.6s'));
    svg.appendChild(bounce);
    svg.appendChild(txt(260, 212, '路由 · 故障回退 · 重试 · 限流 · 密钥 · 可观测性', 8.5, MUTE));
    shell(host, 'AI 网关故障回退（Gateway Fallback）', '统一 API 分发请求，遇到 429 转向下一服务商', svg,
      '网关（Gateway）位于应用与服务商之间，通过一个兼容 OpenAI 的 API 统一提供路由（Routing）、故障回退（Fallback）、重试、限流（Rate Limiting）、密钥引用和可观测性（Observability）。主服务返回 429 或 5xx 时，网关将请求转发给备用服务商，保证请求仍能完成。2026 年的主要区分是：LiteLLM（MIT、100 多家服务商，接近每秒 2000 请求时出现瓶颈）、Portkey（控制平面与防护机制）、Kong AI（在其自有基准测试中最快）、Bifrost（自动重试）。数据驻留（Data Residency）要求决定采用自托管还是托管服务。');
  }

  // ── mx-sequential-test: 累积效应（Cumulative effect）越过早停边界（Early-stop boundary） ──
  // phases/17-infrastructure-and-production/21-ab-testing-llm-features
  function sequentialTest(host) {
    var W = 520, H = 230, PAD = 36;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var midY = H / 2;
    function px(t) { return PAD + t * (W - 2 * PAD); }
    function py(v) { return midY - v * (midY - PAD); }
    // 漏斗形序贯边界（Sequential boundaries），始终有效（Always-valid）：前期宽、后期窄
    function bound(sign) {
      var d = '', i;
      for (i = 0; i <= 40; i++) {
        var t = i / 40;
        var b = 0.95 / Math.sqrt(0.04 + t);
        b = Math.min(b, 1.05);
        d += (i ? 'L' : 'M') + px(t).toFixed(1) + ' ' + py(sign * b).toFixed(1) + ' ';
      }
      return d;
    }
    svg.appendChild(svgEl('path', { d: bound(1), fill: 'none', stroke: SOFT, 'stroke-width': 1.4, 'stroke-dasharray': '4 4' }));
    svg.appendChild(svgEl('path', { d: bound(-1), fill: 'none', stroke: SOFT, 'stroke-width': 1.4, 'stroke-dasharray': '4 4' }));
    svg.appendChild(svgEl('line', { x1: PAD, y1: midY, x2: W - PAD, y2: midY, stroke: MUTE, 'stroke-width': 1, 'stroke-dasharray': '2 4' }));
    svg.appendChild(txt(W - PAD, py(1) - 6, '拒绝 H0（B 胜出）', 8, BP, 'end'));
    svg.appendChild(txt(W - PAD, midY + 14, '无效应', 8, MUTE, 'end'));
    // 累积检验统计量（Test statistic）随机游走上升，并越过上边界
    var walk = 'M' + px(0) + ' ' + py(0) + ' L' + px(0.12) + ' ' + py(0.18) + ' L' + px(0.24) + ' ' + py(0.1) +
      ' L' + px(0.36) + ' ' + py(0.34) + ' L' + px(0.48) + ' ' + py(0.46) + ' L' + px(0.6) + ' ' + py(0.62) +
      ' L' + px(0.7) + ' ' + py(0.78);
    var path = svgEl('path', { d: walk, fill: 'none', stroke: BP, 'stroke-width': 2 });
    var len = 600;
    path.setAttribute('stroke-dasharray', len);
    path.appendChild(anim('stroke-dashoffset', len + ';0', '4s'));
    svg.appendChild(path);
    var hit = svgEl('circle', { cx: px(0.7), cy: py(0.78), r: 6, fill: BP });
    hit.appendChild(anim('opacity', '0;0;0;1;1', '4s'));
    svg.appendChild(hit);
    var stop = txt(px(0.7), py(0.78) - 12, '提前停止', 8, BP);
    stop.appendChild(anim('opacity', '0;0;0;1;1', '4s'));
    svg.appendChild(stop);
    svg.appendChild(txt(W / 2, H - 10, '可以反复查看：边界已计入每次查看的统计代价', 8.5, MUTE));
    shell(host, '序贯 A/B 测试（Sequential A/B Test）', '累积效应跨越始终有效的边界', svg,
      '评估（Evaluation）关注模型能否完成任务，A/B 测试关注用户是否在意。固定期限检验（Fixed-horizon Test）会因中途反复查看结果而产生统计问题，因此 2026 年的平台采用序贯检验（Sequential Testing）：边界始终有效，前期较宽，随时间收紧。累积统计量随机游走，跨越边界时停止实验并发布；若始终留在边界内，则判为无明显差异。CUPED 用于降低方差，Benjamini–Hochberg 方法用于校正同时测试多个变体带来的影响。');
  }

  // ── mx-schema-funnel: 自由文本（Free text）→ 约束解码（Constrained decode）→ 经验证的有类型 JSON ──
  // phases/11-llm-engineering/03-structured-outputs
  function schemaFunnel(host) {
    var W = 520, H = 235;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    // 左侧自由文本
    svg.appendChild(box(28, 70, 120, 90, BG, MUTE));
    svg.appendChild(txt(88, 60, '自由文本', 9, MUTE));
    [82, 100, 118, 136].forEach(function (ly, i) {
      svg.appendChild(svgEl('line', { x1: 40, y1: ly, x2: 40 + [96, 80, 104, 60][i], y2: ly, stroke: SOFT, 'stroke-width': 3 }));
    });
    // 中间的约束解码语法门控（Grammar gate）
    svg.appendChild(box(210, 80, 100, 70, BG, BP));
    svg.appendChild(txt(260, 70, '语法约束关口', 9, BP));
    svg.appendChild(txt(260, 108, 'FSM / CFG', 8, MUTE));
    svg.appendChild(txt(260, 124, '屏蔽 logits', 8, MUTE));
    // 右侧有效 JSON
    svg.appendChild(box(372, 70, 120, 90, BG, INK));
    svg.appendChild(txt(432, 60, '带类型的 JSON', 9, INK));
    svg.appendChild(txt(432, 95, '{ name, price,', 8, BP, 'middle'));
    svg.appendChild(txt(432, 110, '  in_stock }', 8, BP, 'middle'));
    // 连接（Links）
    svg.appendChild(svgEl('path', { d: 'M148 115 L210 115', fill: 'none', stroke: SOFT, 'stroke-width': 1.4 }));
    var g2 = svgEl('path', { d: 'M310 115 L372 115', fill: 'none', stroke: BP, 'stroke-width': 2, 'stroke-dasharray': '6 4' });
    g2.appendChild(anim('stroke-dashoffset', '20;0', '0.8s'));
    svg.appendChild(g2);
    // 词元穿过门控落下；无效词元（warn）被掩蔽，有效词元通过
    var spec = [{ ok: true, b: '0s' }, { ok: false, b: '0.7s' }, { ok: true, b: '1.4s' }, { ok: true, b: '2.1s' }];
    spec.forEach(function (s) {
      var c = svgEl('circle', { cx: 0, cy: 0, r: 5, fill: s.ok ? BP : WARN });
      if (s.ok) {
        c.appendChild(motion('M150 115 L260 115 L432 115', '3.2s', s.b));
      } else {
        c.appendChild(motion('M150 115 L255 115 L255 175', '3.2s', s.b));
      }
      svg.appendChild(c);
    });
    var drop = txt(255, 195, '非法词元在关口被屏蔽', 8, WARN);
    svg.appendChild(drop);
    svg.appendChild(txt(260, 218, '约束解码禁止任何违反模式的词元', 8.5, MUTE));
    shell(host, '结构化输出漏斗（Structured Output Funnel）', '自由文本经语法约束生成带类型的 JSON', svg,
      'LLM 返回字符串，而应用需要带类型的 JSON。在提示词中加入“用 JSON 回答”，约 90% 的时候有效，其余情况会导致失败。约束解码（Constrained Decoding）在词元层面补上缺口：有限状态机（Finite-state Machine，FSM）或上下文无关文法（Context-free Grammar，CFG）屏蔽未归一化得分（Logits），让任何违反模式（Schema）的词元在采样前就被禁止。输出在生成时就保证为合法 JSON，无需靠后处理修补；Pydantic 层再校验类型，并对少见的失败重试。');
  }

  // ── mx-tool-call-loop: 模型发出调用 JSON → 执行 → 返回结果 → 回答
  // phases/11-llm-engineering/09-function-calling
  function toolCallLoop(host) {
    var W = 520, H = 235;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    svg.appendChild(box(60, 90, 110, 56, BG, BP));
    svg.appendChild(txt(115, 112, '模型', 9.5, BP));
    svg.appendChild(txt(115, 128, '负责思考', 8, MUTE));
    svg.appendChild(box(350, 90, 110, 56, BG, INK));
    svg.appendChild(txt(405, 112, '你的代码', 9.5, INK));
    svg.appendChild(txt(405, 128, '负责执行', 8, MUTE));
    // 上方弧线：模型向代码发出调用 JSON
    var out = svgEl('path', { d: 'M170 100 C 240 50, 290 50, 350 100', fill: 'none', stroke: BP, 'stroke-width': 1.8, 'stroke-dasharray': '6 4' });
    out.appendChild(anim('stroke-dashoffset', '20;0', '0.8s'));
    svg.appendChild(out);
    svg.appendChild(txt(260, 56, '调用：get_weather("Tokyo")', 8.5, BP));
    // 下方弧线：代码向模型返回结果
    var back = svgEl('path', { d: 'M350 136 C 290 186, 240 186, 170 136', fill: 'none', stroke: INK, 'stroke-width': 1.8, 'stroke-dasharray': '6 4' });
    back.appendChild(anim('stroke-dashoffset', '0;20', '0.8s'));
    svg.appendChild(back);
    svg.appendChild(txt(260, 182, '结果：15°C', 8.5, INK));
    // 一个词元沿出站弧线前进，随后结果词元沿返回弧线回来，循环进行
    var callTok = svgEl('rect', { x: -10, y: -7, width: 20, height: 14, rx: 2, fill: BP });
    callTok.appendChild(motion('M170 100 C 240 50, 290 50, 350 100', '2.8s', '0s'));
    callTok.appendChild(anim('opacity', '1;1;0;0', '2.8s'));
    svg.appendChild(callTok);
    var resTok = svgEl('rect', { x: -10, y: -7, width: 20, height: 14, rx: 2, fill: INK });
    resTok.appendChild(motion('M350 136 C 290 186, 240 186, 170 136', '2.8s', '1.4s'));
    resTok.appendChild(anim('opacity', '0;1;1;0', '2.8s', { begin: '1.4s' }));
    svg.appendChild(resTok);
    svg.appendChild(txt(260, 215, '循环直到模型不再请求调用，然后给出回答', 8.5, MUTE));
    shell(host, '函数调用循环（Function-calling Loop）', '模型输出调用 JSON，代码执行并回传结果', svg,
      'LLM 只生成文本，因此不能自己查询天气或数据库。函数调用（Function Calling）协议连接了这两端：模型输出结构化 JSON，指定调用哪个函数、传入哪些参数；你的代码执行函数，再把结果送回对话。模型负责思考，工具负责执行，循环负责连接两者。流程不断重复，直到模型停止请求调用并生成最终回答，同时需要防止并行调用和无限工具循环造成问题。');
  }

  LF.register({
    'mx-propose-then-commit': proposeThenCommit,
    'mx-priority-tiers': priorityTiers,
    'mx-research-loop': researchLoop,
    'mx-speculative-tree': speculativeTree,
    'mx-gateway-fallback': gatewayFallback,
    'mx-sequential-test': sequentialTest,
    'mx-schema-funnel': schemaFunnel,
    'mx-tool-call-loop': toolCallLoop
  });
})();
