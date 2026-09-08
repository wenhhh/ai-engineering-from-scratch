/* 阶段 19 第 12–17 与 20–23 课综合项目动画：视频场景索引、MCP 门禁、推测解码、
   安全栈、Issue 到 PR、导师循环、运行循环契约、工具注册表校验、JSON-RPC 分帧与调度重试。
   在 lesson-figures.js 之后加载，通过 window.LF 注册。仅使用 SMIL 动画，
   兼容 ES5，无外部依赖，通过 CSS 变量适配主题。 */
(function(){'use strict';var LF=window.LF;if(!LF){return;}
  var el = LF.el, svgEl = LF.svgEl;
  var EASE = '0.23 1 0.32 1';
  var INK = 'var(--ink,#1a1a1a)', SOFT = 'var(--ink-soft,#555)', MUTE = 'var(--ink-mute,#777)';
  var BLUE = 'var(--blueprint,#3553ff)', BG = 'var(--bg,#fafaf5)', SURF = 'var(--bg-surface,#eee)';
  var RULE = 'var(--rule-soft,#ddd)', WARN = 'var(--warn,#b8870f)';

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
  function box(x, y, w, h, fill, stroke) {
    return svgEl('rect', { x: x, y: y, width: w, height: h, rx: '4', fill: fill || SURF, stroke: stroke || RULE, 'stroke-width': '1.3' });
  }
  function line(x1, y1, x2, y2, stroke, extra) {
    var a = { x1: x1, y1: y1, x2: x2, y2: y2, stroke: stroke || SOFT, 'stroke-width': '1.3' };
    if (extra) { for (var k in extra) { a[k] = extra[k]; } }
    return svgEl('line', a);
  }
  function anim(attr, vals, dur, extra) {
    var a = { attributeName: attr, values: vals, dur: dur, repeatCount: 'indefinite' };
    if (extra) { for (var k in extra) { a[k] = extra[k]; } }
    return svgEl('animate', a);
  }
  function fade(node, dur, at) {
    node.appendChild(anim('opacity', '0;1;1', dur, { begin: at, keyTimes: '0;0.12;1', calcMode: 'spline', keySplines: EASE + ';0 0 1 1' }));
    return node;
  }
  // 以 (cx,cy) 为中心从 95% 缩放淡入，在循环结束时淡出。
  function pop(kids, cx, cy, dur, at) {
    var g = svgEl('g', { transform: 'translate(' + cx + ' ' + cy + ')', opacity: '0' }, kids);
    g.appendChild(svgEl('animateTransform', { attributeName: 'transform', type: 'scale', additive: 'sum', values: '0.95;1;1', dur: dur, begin: at, repeatCount: 'indefinite', calcMode: 'spline', keySplines: EASE + ';0 0 1 1', keyTimes: '0;0.18;1' }));
    g.appendChild(svgEl('animateTransform', { attributeName: 'transform', type: 'translate', additive: 'sum', values: (-cx) + ' ' + (-cy), dur: dur, begin: at, repeatCount: 'indefinite' }));
    g.appendChild(anim('opacity', '0;1;1;0', dur, { begin: at, keyTimes: '0;0.14;0.94;1', calcMode: 'spline', keySplines: EASE + ';0 0 1 1;0.4 0 1 1' }));
    return g;
  }
  function dot(r, fill) { return svgEl('circle', { r: r, fill: fill, cx: '0', cy: '0' }); }
  function mov(path, dur, extra) {
    var a = { path: path, dur: dur, repeatCount: 'indefinite' };
    if (extra) { for (var k in extra) { a[k] = extra[k]; } }
    return svgEl('animateMotion', a);
  }
  function arrows(s, id) {
    s.appendChild(svgEl('defs', {}, [svgEl('marker', { id: id, viewBox: '0 0 8 8', refX: '7', refY: '4', markerWidth: '6', markerHeight: '6', orient: 'auto' }, [svgEl('path', { d: 'M0 0 L8 4 L0 8 z', fill: SOFT })])]));
    return 'url(#' + id + ')';
  }

  // 第 12 课：每个场景生成三个向量，查询返回时间窗口。
  function sceneIndex(host) {
    var D = '5.5s', s = svg(260), i;
    var xs = [30, 112, 220, 290, 414], ws = [78, 104, 66, 120, 88];
    var strip = [txt(30, 22, '场景切分', '9', MUTE, 'start')];
    for (i = 0; i < 5; i++) {
      strip.push(fade(box(xs[i], 32, ws[i], 26, i === 2 ? BLUE : SURF, i === 2 ? 'none' : RULE), D, (0.05 + i * 0.09) + 's'));
    }
    s.appendChild(pop(strip, 260, 45, D, '0s'));
    var chips = [], cx = [60, 205, 350], cl = ['场景描述嵌入', '关键帧嵌入', '转写文本嵌入'];
    for (i = 0; i < 3; i++) {
      chips.push(line(253, 60, cx[i] + 55, 118, SOFT));
      chips.push(box(cx[i], 118, 110, 24));
      chips.push(txt(cx[i] + 55, 133, cl[i], '9'));
    }
    s.appendChild(pop(chips, 260, 130, D, '0.5s'));
    var idx = [box(190, 168, 140, 30), txt(260, 187, '多向量索引', '9')];
    for (i = 0; i < 3; i++) { idx.push(line(cx[i] + 55, 142, 200 + i * 60, 168, SOFT)); }
    s.appendChild(pop(idx, 260, 183, D, '0.9s'));
    s.appendChild(box(30, 214, 80, 26, BLUE, 'none'));
    s.appendChild(txt(70, 231, '查询', '10', BG));
    var q = dot('5', BLUE);
    q.appendChild(mov('M114 227 L200 186', D, { calcMode: 'linear', keyPoints: '0;0;1;1', keyTimes: '0;0.55;0.72;1' }));
    q.appendChild(anim('opacity', '0;0;1;0;0', D, { keyTimes: '0;0.55;0.6;0.74;1' }));
    s.appendChild(q);
    var br = svgEl('path', { d: 'M220 28 L220 20 L286 20 L286 28', fill: 'none', stroke: WARN, 'stroke-width': '1.5' });
    br.appendChild(anim('opacity', '0;0;1;1;0', D, { keyTimes: '0;0.76;0.82;0.94;1' }));
    var bl = txt(253, 14, '(start, end)', '8', WARN);
    bl.appendChild(anim('opacity', '0;0;1;1;0', D, { keyTimes: '0;0.76;0.82;0.94;1' }));
    s.appendChild(br); s.appendChild(bl);
    shell(host, '场景级视频索引（Scene-level Video Index）', '每个场景三个向量', s,
      '摄取（Ingestion）阶段将视频切分为场景，每个场景同时保存场景描述嵌入（Caption Embedding）、关键帧嵌入（Keyframe Embedding）和转写文本嵌入（Transcript Embedding）。查询同时检索三类向量并合并结果，最终返回排名最高场景内部的起止时间窗口 (start, end)，而非整个文件。');
  }

  // 第 13 课：无状态元数据、策略、注册表与在线发现。
  function mcpGate(host) {
    var D = '5s', s = svg(250);
    s.appendChild(pop([box(24, 44, 92, 40), txt(70, 62, 'MCP 客户端', '9'), txt(70, 76, '版本 + 能力', '8', MUTE)], 70, 64, D, '0s'));
    s.appendChild(pop([box(404, 44, 92, 40), txt(450, 62, 'MCP 服务器', '9'), txt(450, 76, '无状态', '8', MUTE)], 450, 64, D, '0.15s'));
    var pipe = line(116, 64, 404, 64, SOFT, { 'stroke-dasharray': '6 5' });
    pipe.appendChild(anim('stroke-dashoffset', '22;0', '1.4s'));
    s.appendChild(pipe);
    s.appendChild(txt(258, 30, '每条 JSON-RPC 消息单独发送一次 POST', '8', MUTE));
    var gr = svgEl('rect', { x: 252, y: 42, width: 10, height: 44, rx: 2, fill: WARN });
    gr.appendChild(anim('opacity', '1;1;0.3;1;1', D, { keyTimes: '0;0.24;0.28;0.34;1' }));
    s.appendChild(pop([gr, txt(257, 100, '身份认证 + 策略', '8', WARN)], 257, 64, D, '0.3s'));
    var p1 = dot('5', BLUE);
    p1.appendChild(mov('M116 58 L404 58', D, { calcMode: 'linear', keyPoints: '0;0.48;0.48;1;1', keyTimes: '0;0.2;0.32;0.5;1' }));
    p1.appendChild(anim('opacity', '0;1;1;0;0', D, { keyTimes: '0;0.04;0.5;0.56;1' }));
    s.appendChild(p1);
    var p2 = dot('5', WARN);
    p2.appendChild(mov('M116 70 L257 70 L257 140', D, { begin: '2.4s', calcMode: 'linear', keyPoints: '0;0.668;0.668;1;1', keyTimes: '0;0.15;0.25;0.4;1' }));
    p2.appendChild(anim('opacity', '0;1;1;1;0;0', D, { begin: '2.4s', keyTimes: '0;0.03;0.3;0.38;0.44;1' }));
    s.appendChild(p2);
    var ok = txt(257, 210, '执行者 + 工具 + 参数 + 有效期', '8', WARN);
    ok.appendChild(anim('opacity', '0;0;1;1;0', D, { keyTimes: '0;0.85;0.9;0.98;1' }));
    s.appendChild(pop([box(197, 146, 120, 28), txt(257, 163, '审批记录', '9'), ok], 257, 160, D, '0.45s'));
    var reg = [box(40, 170, 110, 30), txt(95, 184, '注册表', '9'), txt(95, 196, 'server.json', '7', MUTE),
      line(150, 185, 430, 86, SOFT, { 'stroke-dasharray': '4 3' }),
      txt(378, 132, '在线 server/discover 探测', '8', MUTE)];
    s.appendChild(pop(reg, 95, 185, D, '0.6s'));
    var poll = dot('3.5', MUTE);
    poll.appendChild(mov('M150 185 L430 86', D, { begin: '0.9s', calcMode: 'linear', keyPoints: '0;1;1', keyTimes: '0;0.22;1' }));
    poll.appendChild(anim('opacity', '0;1;0;0', D, { begin: '0.9s', keyTimes: '0;0.06;0.24;1' }));
    s.appendChild(poll);
    shell(host, '无状态 MCP 门禁与注册表（Stateless MCP Gate + Registry）', '逐请求校验元数据与权限', s,
      '每条 JSON-RPC 消息使用独立 POST 请求，携带协议版本与客户端能力（Client Capabilities）。门禁校验签发者（Issuer）、受众（Audience）、权限范围（Scope）、工具和参数；有实际影响的调用还需要一条与该具体动作绑定的审批记录（Approval Record）。注册表（Registry）索引 server.json 发布元数据，独立的 server/discover 探测则核验在线端点实际支持的能力。');
  }

  // 第 14 课：草稿头提出 k 个词元，一次验证接受其中的前缀。
  function specDecode(host) {
    var D = '5.5s', s = svg(240), i;
    s.appendChild(pop([box(24, 96, 88, 40), txt(68, 113, '草稿头', '9'), txt(68, 127, 'k 个词元', '8', MUTE), line(112, 116, 146, 116, SOFT)], 68, 116, D, '0s'));
    s.appendChild(pop([box(185, 20, 150, 30), txt(260, 39, '目标模型单次验证', '9'), line(260, 50, 260, 92, SOFT, { 'stroke-dasharray': '4 3' })], 260, 35, D, '0.15s'));
    var words = ['def', 'main', '(', ')', ':'], tiles = [];
    for (i = 0; i < 5; i++) {
      var tx = 150 + i * 62, rej = i > 2, e1 = 0.06 + i * 0.045, e2 = e1 + 0.05;
      var g = svgEl('g', {}, [box(tx, 100, 52, 32), txt(tx + 26, 120, words[i], '10')]);
      g.appendChild(anim('opacity', rej ? '0;0;1;1;0.15;0.15' : '0;0;1;1', D,
        { keyTimes: rej ? '0;' + e1 + ';' + e2 + ';0.62;0.7;1' : '0;' + e1 + ';' + e2 + ';1', calcMode: 'spline', keySplines: rej ? '0 0 1 1;' + EASE + ';0 0 1 1;0.4 0 1 1;0 0 1 1' : '0 0 1 1;' + EASE + ';0 0 1 1' }));
      tiles.push(g);
      if (!rej) {
        var ov = box(tx, 100, 52, 32, 'none', BLUE);
        ov.setAttribute('stroke-width', '2');
        ov.appendChild(anim('opacity', '0;0;1;1', D, { keyTimes: '0;' + (0.36 + i * 0.06) + ';' + (0.4 + i * 0.06) + ';1' }));
        tiles.push(ov);
      }
    }
    s.appendChild(pop(tiles, 300, 116, D, '0.25s'));
    var sweep = box(150, 94, 52, 44, 'none', BLUE);
    sweep.setAttribute('stroke-width', '1.8');
    sweep.appendChild(anim('x', '150;150;398;398', D, { keyTimes: '0;0.3;0.55;1' }));
    sweep.appendChild(anim('opacity', '0;0;1;1;0;0', D, { keyTimes: '0;0.28;0.32;0.55;0.6;1' }));
    s.appendChild(sweep);
    var rs = svgEl('g', {}, [box(336, 100, 52, 32, WARN, 'none'), txt(362, 120, 'ret', '10', BG)]);
    rs.appendChild(anim('opacity', '0;0;1;1;0', D, { keyTimes: '0;0.74;0.8;0.94;1' }));
    s.appendChild(rs);
    var rj = txt(438, 158, '拒绝后重新采样', '8', WARN);
    rj.appendChild(anim('opacity', '0;0;1;1;0', D, { keyTimes: '0;0.66;0.72;0.94;1' }));
    s.appendChild(rj);
    var sum = txt(150, 192, '目标模型一次验证，接受 5 个中的 3 个', '9', MUTE, 'start');
    sum.appendChild(anim('opacity', '0;0;1;1', D, { keyTimes: '0;0.5;0.6;1' }));
    s.appendChild(sum);
    shell(host, '推测解码（Speculative Decoding）', '草稿提出候选 · 目标模型统一验证', s,
      '草稿头（Draft Head）提出五个候选词元，目标模型（Target Model）通过一次验证前向计算为它们评分。接受的前缀替代三个顺序解码步骤，拒绝的后缀被丢弃并重新采样。接受率（Acceptance Rate）决定加速比；发生拒绝时，较大的验证计算也会影响尾延迟，因此需要单独报告第 99 百分位延迟（p99 Latency）。');
  }

  // 第 15 课：五层安全栈，正常请求通过，攻击请求被拦截。
  function safetyStack(host) {
    var D = '5.5s', s = svg(270), i;
    var names = ['输入净化', '护栏 / 策略', '分类器门禁', '目标模型', '输出过滤器'];
    var stack = [];
    for (i = 0; i < 5; i++) {
      var y = 24 + i * 34, model = i === 3, gate = i === 2;
      stack.push(fade(box(150, y, 220, 26, model ? BLUE : SURF, model ? 'none' : (gate ? WARN : RULE)), D, (i * 0.08) + 's'));
      stack.push(fade(txt(260, y + 17, names[i], '9', model ? BG : INK), D, (i * 0.08) + 's'));
    }
    s.appendChild(pop(stack, 260, 105, D, '0s'));
    var safe = dot('5', BLUE);
    safe.appendChild(mov('M260 8 L260 200', D, { calcMode: 'linear', keyPoints: '0;0;1;1', keyTimes: '0;0.1;0.6;1' }));
    safe.appendChild(anim('opacity', '0;0;1;1;0;0', D, { keyTimes: '0;0.1;0.14;0.56;0.62;1' }));
    s.appendChild(safe);
    var atk = dot('5', WARN);
    atk.appendChild(mov('M310 8 L310 105 L430 105', D, { calcMode: 'linear', keyPoints: '0;0;0.447;0.447;1;1', keyTimes: '0;0.3;0.5;0.56;0.72;1' }));
    atk.appendChild(anim('opacity', '0;0;1;1;0;0', D, { keyTimes: '0;0.3;0.34;0.7;0.76;1' }));
    s.appendChild(atk);
    var flash = box(150, 92, 220, 26, 'none', WARN);
    flash.setAttribute('stroke-width', '2');
    flash.appendChild(anim('opacity', '0;0;1;0;0', D, { keyTimes: '0;0.48;0.53;0.6;1' }));
    s.appendChild(flash);
    var blk = txt(436, 100, '已拦截', '9', WARN, 'start');
    blk.appendChild(anim('opacity', '0;0;1;1;0', D, { keyTimes: '0;0.62;0.68;0.9;1' }));
    s.appendChild(blk);
    [0, 2, 4].forEach(function (j, n) {
      var py = 37 + j * 34;
      var pr = line(470, py, 376, py, WARN, { 'stroke-dasharray': '4 3' });
      pr.appendChild(anim('opacity', '0.15;1;0.15', '2.2s', { begin: (n * 0.5) + 's' }));
      s.appendChild(pr);
    });
    s.appendChild(txt(496, 246, '红队探测：garak · PyRIT', '8', WARN, 'end'));
    var hitl = [line(340, 186, 352, 196, SOFT, { 'stroke-dasharray': '3 3' }), box(300, 196, 130, 26), txt(365, 213, '人工审核队列', '9')];
    s.appendChild(pop(hitl, 365, 209, D, '0.55s'));
    shell(host, '分层安全框架（Layered Safety Harness）', '五层防护围绕一个模型', s,
      '正常请求依次经过输入净化（Sanitization）、护栏（Guardrails）、分类器门禁、模型和输出过滤器。越狱攻击（Jailbreak）穿过前两层后，被分类器门禁识别并拦截。红队测试（Red Teaming）持续从外部探测每一层；输出过滤器标为高风险的内容转入人工介入（Human-in-the-loop，HITL）审核队列。');
  }

  // 第 16 课：从 Issue 标签触发，经沙箱与 CI 门禁交付可审查 PR。
  function issuePr(host) {
    var D = '5.5s', s = svg(240);
    var m = arrows(s, 'cf-a16');
    s.appendChild(pop([box(24, 60, 88, 40), txt(68, 77, '问题单', '9'), txt(68, 91, '@agent fix', '8', MUTE)], 68, 80, D, '0s'));
    s.appendChild(pop([box(142, 60, 92, 40), txt(188, 84, '调度器', '9'), txt(188, 50, 'App Webhook', '8', MUTE),
      box(142, 110, 92, 6), svgEl('rect', { x: 142, y: 110, width: 55, height: 6, rx: 2, fill: BLUE }),
      txt(142, 128, '今日预算 3/5', '8', MUTE, 'start')], 188, 80, D, '0.12s'));
    var tb = svgEl('rect', { x: 272, y: 88, width: 0, height: 6, rx: 2, fill: BLUE });
    tb.appendChild(anim('width', '0;0;80;80', D, { keyTimes: '0;0.35;0.6;1' }));
    s.appendChild(pop([box(264, 60, 96, 40), txt(312, 78, '沙箱', '9'), txt(312, 50, '克隆 · 构建 · 测试', '8', MUTE),
      box(272, 88, 80, 6), tb], 312, 80, D, '0.24s'));
    s.appendChild(pop([svgEl('path', { d: 'M398 64 L414 80 L398 96 L382 80 z', fill: SURF, stroke: BLUE, 'stroke-width': '1.3' }),
      txt(398, 84, 'CI', '8')], 398, 80, D, '0.36s'));
    var pf = box(432, 60, 64, 40, 'none', BLUE);
    pf.setAttribute('stroke-width', '2');
    pf.appendChild(anim('opacity', '0;0;1;1;0', D, { keyTimes: '0;0.88;0.92;0.98;1' }));
    var pl = txt(464, 118, '可供审查', '8', BLUE);
    pl.appendChild(anim('opacity', '0;0;1;1;0', D, { keyTimes: '0;0.88;0.92;0.98;1' }));
    s.appendChild(pop([box(432, 60, 64, 40), txt(464, 84, 'PR', '10'), pf, pl], 464, 80, D, '0.48s'));
    [[112, 142], [234, 264], [360, 382], [414, 432]].forEach(function (c) {
      s.appendChild(line(c[0], 80, c[1] - 4, 80, SOFT, { 'marker-end': m }));
    });
    var pk = dot('5', BLUE);
    pk.appendChild(mov('M28 80 L462 80', D, { calcMode: 'linear', keyPoints: '0;0.369;0.369;0.654;0.654;0.852;1', keyTimes: '0;0.15;0.22;0.33;0.62;0.75;1' }));
    pk.appendChild(anim('opacity', '0;1;1;0;0', D, { keyTimes: '0;0.03;0.86;0.92;1' }));
    s.appendChild(pk);
    s.appendChild(txt(28, 225, '分支保护：禁止直接写入 main · 禁止强制推送', '8', MUTE, 'start'));
    shell(host, '问题单到拉取请求（Issue-to-PR Pipeline）', '标签触发 · 交付可审查 PR', s,
      '带标签的问题单（Issue）触发 GitHub App 的 Webhook；调度器（Dispatcher）在任务入队前检查每个仓库的每日预算。沙箱（Sandbox）从头复现构建，完整测试套件通过后才允许任务继续。只有 CI 门禁通过才创建拉取请求（Pull Request，PR）；禁止强制推送（Force Push）由分支保护（Branch Protection）强制执行。');
  }

  // 第 17 课：苏格拉底式对话更新知识图谱中的掌握度。
  function tutorLoop(host) {
    var D = '5.5s', s = svg(250), i;
    var m = arrows(s, 'cf-a17');
    s.appendChild(pop([box(30, 44, 92, 36), txt(76, 66, '学习者', '9')], 76, 62, D, '0s'));
    s.appendChild(pop([box(30, 156, 92, 36), txt(76, 172, '导师策略', '9'), txt(76, 186, '苏格拉底式', '8', MUTE)], 76, 174, D, '0.12s'));
    s.appendChild(line(60, 84, 60, 148, SOFT, { 'marker-end': m }));
    s.appendChild(line(92, 152, 92, 92, SOFT, { 'marker-end': m }));
    s.appendChild(txt(54, 121, '回答', '7', MUTE, 'end'));
    s.appendChild(txt(98, 121, '提示', '7', MUTE, 'start'));
    var ad = dot('4', BLUE);
    ad.appendChild(mov('M60 84 L60 148', D, { calcMode: 'linear', keyPoints: '0;1;1', keyTimes: '0;0.14;1' }));
    ad.appendChild(anim('opacity', '0;1;0;0', D, { keyTimes: '0;0.06;0.16;1' }));
    s.appendChild(ad);
    var hd = dot('4', WARN);
    hd.appendChild(mov('M92 152 L92 88', D, { begin: '1.4s', calcMode: 'linear', keyPoints: '0;1;1', keyTimes: '0;0.14;1' }));
    hd.appendChild(anim('opacity', '0;1;0;0', D, { begin: '1.4s', keyTimes: '0;0.06;0.16;1' }));
    s.appendChild(hd);
    var graph = [line(122, 170, 224, 80, SOFT, { 'stroke-dasharray': '4 3' }), txt(180, 138, '图谱遍历', '8', MUTE)];
    var cxs = [240, 330, 420];
    for (i = 0; i < 3; i++) {
      graph.push(svgEl('circle', { cx: cxs[i], cy: 70, r: '16', fill: SURF, stroke: RULE, 'stroke-width': '1.3' }));
      graph.push(txt(cxs[i], 74, 'c' + (i + 1), '9'));
      graph.push(box(cxs[i] - 18, 96, 36, 5));
      if (i < 2) { graph.push(line(cxs[i] + 16, 70, cxs[i + 1] - 20, 70, SOFT, { 'marker-end': m })); }
    }
    var mb = svgEl('rect', { x: 222, y: 96, width: 0, height: 5, rx: 2, fill: BLUE });
    mb.appendChild(anim('width', '0;12;12;24;24;36;36', D, { keyTimes: '0;0.12;0.28;0.4;0.56;0.68;1' }));
    graph.push(mb);
    var ring = svgEl('circle', { cx: 330, cy: 70, r: '20', fill: 'none', stroke: BLUE, 'stroke-width': '1.6' });
    ring.appendChild(anim('opacity', '0;0;1;1', D, { keyTimes: '0;0.7;0.78;1' }));
    graph.push(ring);
    var nx = txt(330, 40, '下一个概念', '8', BLUE);
    nx.appendChild(anim('opacity', '0;0;1;1', D, { keyTimes: '0;0.7;0.78;1' }));
    graph.push(nx);
    s.appendChild(pop(graph, 330, 90, D, '0.3s'));
    s.appendChild(txt(28, 232, '每次互动后更新掌握度（知识追踪）', '8', MUTE, 'start'));
    shell(host, '苏格拉底式循环与学习者模型（Socratic Loop + Learner Model）', '每次交流更新掌握度', s,
      '导师不直接给出答案，而是针对学习者每次回复提出引导性问题，或给出分步提示（Scaffolded Hint）。每轮交流都会更新当前概念的掌握概率（Mastery Probability）；进度条填满后，策略沿课程图谱中的前置依赖边前进，点亮下一个概念。这一过程称为知识追踪（Knowledge Tracing）。');
  }

  // 第 20 课：信号点遍历六状态机，状态转移持续发出事件。
  function loopContract(host) {
    var D = '6s', s = svg(260), i;
    var m = arrows(s, 'cf-a20');
    var st = [['IDLE', 30, 40, 64], ['PLANNING', 140, 24, 86], ['EXECUTING', 270, 40, 92], ['AWAITING_TOOL', 392, 96, 104], ['REFLECTING', 268, 152, 92], ['DONE', 70, 152, 60]];
    var pulses = ['0.55s', '1.15s', '1.9s', '2.65s', '3.4s', '5.5s'];
    var nodes = [];
    for (i = 0; i < st.length; i++) {
      var b = st[i], done = i === 5;
      nodes.push(fade(box(b[1], b[2], b[3], 26, done ? BLUE : SURF, done ? 'none' : RULE), D, (i * 0.07) + 's'));
      nodes.push(fade(txt(b[1] + b[3] / 2, b[2] + 17, b[0], '9', done ? BG : INK), D, (i * 0.07) + 's'));
      var ov = box(b[1], b[2], b[3], 26, 'none', BLUE);
      ov.setAttribute('stroke-width', '2');
      ov.appendChild(anim('opacity', '0;1;0;0', D, { begin: pulses[i], keyTimes: '0;0.04;0.1;1' }));
      nodes.push(ov);
    }
    [[94, 60, 140, 46], [226, 42, 270, 50], [362, 60, 400, 96], [428, 122, 336, 152], [300, 152, 310, 66], [268, 165, 130, 165]].forEach(function (e) {
      nodes.push(line(e[0], e[1], e[2], e[3], SOFT, { 'marker-end': m }));
    });
    s.appendChild(pop(nodes, 260, 100, D, '0s'));
    var tk = dot('5', BLUE);
    tk.appendChild(mov('M62 53 L183 37 L316 53 L444 109 L314 165 L316 53 L444 109 L314 165 L100 165', D));
    tk.appendChild(anim('opacity', '0;1;1;0', D, { keyTimes: '0;0.04;0.96;1' }));
    s.appendChild(tk);
    s.appendChild(line(30, 214, 490, 214, RULE));
    for (i = 0; i < 8; i++) {
      var t = 0.1 + i * 0.115;
      var tick = svgEl('rect', { x: 40 + i * 56, y: 208, width: 4, height: 12, rx: 1, fill: BLUE });
      tick.appendChild(anim('opacity', '0;0;1;1', D, { keyTimes: '0;' + t.toFixed(2) + ';' + (t + 0.03).toFixed(2) + ';1' }));
      s.appendChild(tick);
    }
    s.appendChild(txt(30, 236, '带类型的事件流', '8', MUTE, 'start'));
    s.appendChild(txt(490, 236, '预算：轮数 · 工具调用数 · 实际用时', '8', MUTE, 'end'));
    shell(host, '运行循环契约（Harness Loop Contract）', '六个状态 · 全程可审计', s,
      '运行循环是确定性状态机（Deterministic State Machine）。一次运行从空闲（IDLE）经过规划（PLANNING）、执行（EXECUTING）、等待工具（AWAITING_TOOL）和反思（REFLECTING），在预算允许的轮数内重复内部执行与反思循环，最终到达完成（DONE）。每次状态转移（Transition）都向事件流发出带类型的事件（Typed Event），界面和追踪器通过订阅获取状态，无需窥探循环内部。');
  }

  // 第 21 课：无效参数返回 JSON Pointer 错误位置，有效参数才能到达处理函数。
  function registryValidate(host) {
    var D = '5.5s', s = svg(240);
    s.appendChild(pop([box(24, 88, 80, 40), txt(64, 112, '模型', '9')], 64, 108, D, '0s'));
    var sr = box(194, 92, 132, 24, SURF, BLUE);
    s.appendChild(pop([box(180, 36, 160, 140, BG, RULE), txt(260, 52, '工具注册表', '9'),
      box(194, 62, 132, 24), txt(260, 77, '名称', '8'),
      sr, txt(260, 107, '模式校验', '8'),
      box(194, 122, 132, 24), txt(260, 137, '处理函数引用', '8'),
      txt(260, 166, '禁止静默覆盖', '7', MUTE)], 260, 106, D, '0.15s'));
    s.appendChild(pop([box(416, 88, 80, 40), txt(456, 112, '处理函数', '9')], 456, 108, D, '0.3s'));
    var c1 = dot('4.5', WARN);
    c1.appendChild(mov('M104 100 L194 104', D, { calcMode: 'linear', keyPoints: '0;1;1', keyTimes: '0;0.12;1' }));
    c1.appendChild(anim('opacity', '0;1;1;0;0', D, { keyTimes: '0;0.02;0.12;0.16;1' }));
    s.appendChild(c1);
    var f1 = box(194, 92, 132, 24, 'none', WARN);
    f1.setAttribute('stroke-width', '2');
    f1.appendChild(anim('opacity', '0;0;1;0;0', D, { keyTimes: '0;0.13;0.18;0.24;1' }));
    s.appendChild(f1);
    var b1 = dot('4.5', WARN);
    b1.appendChild(mov('M194 104 L104 84', D, { calcMode: 'linear', keyPoints: '0;0;1;1', keyTimes: '0;0.2;0.32;1' }));
    b1.appendChild(anim('opacity', '0;0;1;0;0', D, { keyTimes: '0;0.2;0.3;0.34;1' }));
    s.appendChild(b1);
    var er = txt(28, 24, '/args/limit：应为整数', '8', WARN, 'start');
    er.appendChild(anim('opacity', '0;0;1;1;0', D, { keyTimes: '0;0.24;0.3;0.48;1' }));
    s.appendChild(er);
    var c2 = dot('4.5', BLUE);
    c2.appendChild(mov('M104 112 L416 112', D, { calcMode: 'linear', keyPoints: '0;0;0.288;0.288;1;1', keyTimes: '0;0.5;0.58;0.66;0.8;1' }));
    c2.appendChild(anim('opacity', '0;0;1;1;0;0', D, { keyTimes: '0;0.5;0.53;0.79;0.83;1' }));
    s.appendChild(c2);
    var f2 = box(194, 92, 132, 24, 'none', BLUE);
    f2.setAttribute('stroke-width', '2');
    f2.appendChild(anim('opacity', '0;0;1;0;0', D, { keyTimes: '0;0.6;0.66;0.72;1' }));
    s.appendChild(f2);
    var hp = box(416, 88, 80, 40, 'none', BLUE);
    hp.setAttribute('stroke-width', '2');
    hp.appendChild(anim('opacity', '0;0;1;1;0', D, { keyTimes: '0;0.8;0.85;0.94;1' }));
    s.appendChild(hp);
    s.appendChild(txt(28, 220, '模式是数据，处理函数是代码：校验器不执行 I/O', '8', MUTE, 'start'));
    shell(host, '注册表与模式门禁（Registry + Schema Gate）', '处理函数运行前完成校验', s,
      '注册表（Registry）一次性固定工具名称、模式（Schema）与处理函数（Handler）的映射，调度器随后使用这一可信映射。无效调用在模式校验处被拒绝，并返回 JSON 指针（JSON Pointer）路径，使模型能够在一轮往返中修正参数。修正后的调用通过同一个纯校验器（Pure Validator）后，才会执行处理代码。');
  }

  // 第 22 课：每行一个 JSON 帧，通过 ID 配对请求与响应。
  function jsonrpcFrames(host) {
    var D = '6s', s = svg(250);
    s.appendChild(line(80, 36, 80, 224, SOFT));
    s.appendChild(line(440, 36, 440, 224, SOFT));
    s.appendChild(txt(80, 26, '客户端', '9'));
    s.appendChild(txt(440, 26, '服务器', '9'));
    s.appendChild(txt(260, 26, '每个 \\n 分隔行承载一帧', '8', MUTE));
    function frame(y, label, stroke, begin, toLeft) {
      var x0 = toLeft ? 230 : 90;
      var g = svgEl('g', {}, [box(x0, y, 200, 18, SURF, stroke), txt(x0 + 6, y + 13, label, '8', INK, 'start')]);
      g.appendChild(svgEl('animateTransform', { attributeName: 'transform', type: 'translate', values: '0 0;' + (toLeft ? -150 : 150) + ' 0;' + (toLeft ? -150 : 150) + ' 0', dur: D, begin: begin, repeatCount: 'indefinite', calcMode: 'spline', keySplines: EASE + ';0 0 1 1', keyTimes: '0;0.14;1' }));
      g.appendChild(anim('opacity', '0;1;1;0;0', D, { begin: begin, keyTimes: '0;0.04;0.16;0.2;1', calcMode: 'spline', keySplines: EASE + ';0 0 1 1;0.4 0 1 1;0 0 1 1' }));
      s.appendChild(g);
    }
    frame(44, '{"id":7,"method":"tools/call"}', BLUE, '0s', false);
    frame(74, '{"id":7,"result":{...}}', BLUE, '0.9s', true);
    frame(104, '{"method":"progress"}', RULE, '1.9s', false);
    var no = txt(90, 134, '通知：无 id，不返回响应', '8', MUTE, 'start');
    no.appendChild(anim('opacity', '0;0;1;1;0', D, { begin: '1.9s', keyTimes: '0;0.1;0.16;0.3;1' }));
    s.appendChild(no);
    frame(140, '{"id":9,"met###', WARN, '3.1s', false);
    frame(170, '{"id":null,"error":{"code":-32700}}', WARN, '3.9s', true);
    frame(200, '{"id":10,"method":"ping"}', RULE, '4.7s', false);
    var cont = txt(260, 240, '单行损坏不影响后续消息流', '8', MUTE);
    cont.appendChild(anim('opacity', '0;0;1;1', D, { begin: '4.7s', keyTimes: '0;0.08;0.14;1' }));
    s.appendChild(cont);
    shell(host, '标准输入输出上的 JSON-RPC（JSON-RPC over stdio）', '按换行符分帧', s,
      '每条消息是独占一行的 JSON 对象。请求（Request）携带 id，并收到恰好一条相同 id 的响应（Response）；通知（Notification）不带 id，也不得收到响应。损坏的行会得到错误码 -32700、id 为 null 的解析错误（Parse Error），下一行仍正常解析，单个坏帧不会破坏整个消息流。');
  }

  // 第 23 课：超时、带抖动退避、去重，最终返回统一结果封装。
  function dispatchRetry(host) {
    var D = '6s', s = svg(250);
    var m = arrows(s, 'cf-a23');
    s.appendChild(pop([box(24, 28, 96, 34), txt(72, 49, '运行循环', '9')], 72, 45, D, '0s'));
    s.appendChild(pop([box(150, 20, 240, 50, SURF, BLUE), txt(270, 40, '调度器', '10'), txt(270, 56, '超时 · 重试 · 去重', '8', MUTE)], 270, 45, D, '0.12s'));
    s.appendChild(pop([box(420, 28, 80, 34), txt(460, 49, '处理函数', '9')], 460, 45, D, '0.24s'));
    s.appendChild(line(120, 45, 146, 45, SOFT, { 'marker-end': m }));
    s.appendChild(line(390, 45, 416, 45, SOFT, { 'marker-end': m }));
    s.appendChild(line(60, 168, 490, 168, RULE));
    s.appendChild(txt(60, 184, 't', '8', MUTE, 'start'));
    function attempt(x, w, ok, t0, t1, label) {
      var r = svgEl('rect', { x: x, y: 150, width: 0, height: 14, rx: 2, fill: ok ? BLUE : SURF, stroke: ok ? 'none' : RULE, 'stroke-width': '1.3' });
      r.appendChild(anim('width', '0;0;' + w + ';' + w, D, { keyTimes: '0;' + t0 + ';' + t1 + ';1' }));
      s.appendChild(r);
      s.appendChild(txt(x + w / 2, 144, label, '7', MUTE));
      if (!ok) {
        var g = svgEl('g', {}, [line(x + w - 6, 147, x + w + 6, 161, WARN), line(x + w + 6, 147, x + w - 6, 161, WARN)]);
        g.appendChild(anim('opacity', '0;0;1;1', D, { keyTimes: '0;' + (t1 + 0.01) + ';' + (t1 + 0.05) + ';1' }));
        s.appendChild(g);
      }
    }
    attempt(70, 70, false, 0.05, 0.2, '尝试 1');
    attempt(158, 70, false, 0.3, 0.45, '尝试 2');
    attempt(264, 56, true, 0.58, 0.7, '尝试 3');
    var okc = svgEl('circle', { cx: 334, cy: 157, r: '7', fill: 'none', stroke: BLUE, 'stroke-width': '1.6' });
    okc.appendChild(anim('opacity', '0;0;1;1', D, { keyTimes: '0;0.71;0.75;1' }));
    s.appendChild(okc);
    s.appendChild(txt(149, 184, '1s', '7', MUTE));
    s.appendChild(txt(246, 184, '2s + 抖动', '7', MUTE));
    var gh = svgEl('g', {}, [box(158, 124, 70, 14, 'none', WARN), txt(193, 120, '重复，键 a1f3', '7', WARN)]);
    gh.appendChild(svgEl('animateTransform', { attributeName: 'transform', type: 'translate', values: '0 0;0 0;0 22;0 22', dur: D, keyTimes: '0;0.38;0.47;1', repeatCount: 'indefinite' }));
    gh.appendChild(anim('opacity', '0;0;1;0;0', D, { keyTimes: '0;0.32;0.38;0.48;1' }));
    s.appendChild(gh);
    s.appendChild(txt(105, 132, '键 a1f3', '7', MUTE));
    var env = svgEl('g', {}, [box(360, 100, 130, 24, BG, BLUE), txt(425, 116, '带类型的结果封装', '8'),
      line(360, 110, 124, 60, BLUE, { 'stroke-dasharray': '4 3' })]);
    env.appendChild(anim('opacity', '0;0;1;1', D, { keyTimes: '0;0.76;0.83;1' }));
    s.appendChild(env);
    s.appendChild(txt(490, 234, '并行调度受限：设置最大在途请求数', '8', MUTE, 'end'));
    shell(host, '调度器接口边界（Dispatcher Boundary）', '超时 · 退避 · 去重 · 统一封装', s,
      '第一次尝试达到单次调用超时后返回带类型的错误，不会让运行循环一直等待。每次重试前，退避（Backoff）时间翻倍并加入抖动（Jitter）；与在途请求（In-flight Request）并发到达的重复调用，按幂等键（Idempotency Key）合并。无论成功或失败，循环都收到统一形状的结果封装（Result Envelope）：正常结果或映射后的错误，不直接暴露原始堆栈。');
  }

  LF.register({
    'cf-scene-index': sceneIndex,
    'cf-mcp-gate': mcpGate,
    'cf-spec-decode': specDecode,
    'cf-safety-stack': safetyStack,
    'cf-issue-to-pr': issuePr,
    'cf-tutor-loop': tutorLoop,
    'cf-loop-contract': loopContract,
    'cf-registry-validate': registryValidate,
    'cf-jsonrpc-frames': jsonrpcFrames,
    'cf-dispatch-retry': dispatchRetry
  });
})();
