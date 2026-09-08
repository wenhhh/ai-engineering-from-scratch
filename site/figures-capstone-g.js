(function () {
  'use strict';
  var LF = window.LF;
  if (!LF) { return; }

  var el = LF.el, svgEl = LF.svgEl;
  var INK = 'var(--ink,#1a1a1a)', SOFT = 'var(--ink-soft,#555)', MUTE = 'var(--ink-mute,#777)';
  var BP = 'var(--blueprint,#3553ff)', BG = 'var(--bg,#fafaf5)', SURF = 'var(--bg-surface,#eee)';
  var RULE = 'var(--rule-soft,#ddd)', WARN = 'var(--warn,#b8870f)';
  var SPL = '0.23 1 0.32 1';
  var SPL3 = SPL + ';' + SPL + ';' + SPL;

  function anim(attr, vals, dur, extra) {
    var a = { attributeName: attr, values: vals, dur: dur, repeatCount: 'indefinite' };
    if (extra) for (var k in extra) a[k] = extra[k];
    return svgEl('animate', a);
  }
  function animT(type, vals, dur, extra) {
    var a = { attributeName: 'transform', type: type, values: vals, dur: dur, repeatCount: 'indefinite' };
    if (extra) for (var k in extra) a[k] = extra[k];
    return svgEl('animateTransform', a);
  }
  function card(host, label, hint, svg, caption) {
    host.appendChild(el('div', { class: 'lf' }, [
      el('div', { class: 'lf-head' }, [el('span', { class: 'lf-label' }, [label]), el('span', {}, [hint])]),
      el('div', { class: 'lf-body' }, [el('div', { class: 'lf-out' }, [svg])]),
      el('div', { class: 'lf-cap' }, [caption])
    ]));
  }
  function txt(x, y, s, fill, size, anchor) {
    return svgEl('text', {
      x: x, y: y, fill: fill || SOFT, 'font-size': size || 11,
      'font-family': 'var(--font-mono,monospace)', 'text-anchor': anchor || 'middle'
    }, [svgEl('tspan', {}, [document.createTextNode(s)])]);
  }
  // 以 (cx, cy) 为中心，从透明、95% 缩放的状态淡入。
  function pop(cx, cy, dur, kt, kids) {
    var inner = svgEl('g', {}, kids);
    inner.appendChild(animT('scale', '0.95;0.95;1;1', dur, { keyTimes: kt, calcMode: 'spline', keySplines: SPL3 }));
    inner.appendChild(anim('opacity', '0;0;1;1', dur, { keyTimes: kt }));
    return svgEl('g', { transform: 'translate(' + cx + ' ' + cy + ')' }, [inner]);
  }

  // 第 24 课：规划、执行、重新规划，步骤失败后交回执行游标。
  function planReplan(host) {
    var svg = svgEl('svg', { viewBox: '0 0 520 250' });
    var D = '5s';
    svg.appendChild(txt(260, 16, '计划是结构化数据 · 执行器逐项运行', MUTE, 10));
    svg.appendChild(svgEl('rect', { x: 30, y: 44, width: 104, height: 44, rx: 5, fill: BG, stroke: BP, 'stroke-width': '1.8' }));
    svg.appendChild(txt(82, 62, '规划器', BP, 10));
    svg.appendChild(txt(82, 76, 'replan(cursor, err)', MUTE, 7));
    var steps = ['1 读取文件', '2 运行测试', '3 应用补丁', '4 重跑测试', '5 输出报告'];
    var sx = 200, sw = 128, i;
    for (i = 0; i < 3; i++) {
      svg.appendChild(svgEl('rect', { x: sx, y: 36 + i * 36, width: sw, height: 26, rx: 4, fill: BG, stroke: RULE, 'stroke-width': '1.4' }));
      svg.appendChild(txt(sx + sw / 2, 53 + i * 36, steps[i], SOFT, 9));
    }
    var stale = svgEl('g', {});
    for (i = 3; i < 5; i++) {
      stale.appendChild(svgEl('rect', { x: sx, y: 36 + i * 36, width: sw, height: 26, rx: 4, fill: BG, stroke: RULE, 'stroke-width': '1.4' }));
      stale.appendChild(txt(sx + sw / 2, 53 + i * 36, steps[i], SOFT, 9));
    }
    stale.appendChild(anim('opacity', '1;1;0.25;0.25', D, { keyTimes: '0;0.28;0.4;1' }));
    svg.appendChild(stale);
    var fail = txt(336, 202, '✗ 导入错误', WARN, 8, 'start');
    fail.appendChild(anim('opacity', '0;0;1;1', D, { keyTimes: '0;0.24;0.3;1' }));
    svg.appendChild(fail);
    var arc = svgEl('path', { d: 'M200 121 C 158 121, 158 66, 134 66', fill: 'none', stroke: WARN, 'stroke-width': '1.8', 'stroke-dasharray': '6 5' });
    arc.appendChild(anim('stroke-dashoffset', '80;80;0;0', D, { keyTimes: '0;0.3;0.44;1', calcMode: 'spline', keySplines: SPL3 }));
    arc.appendChild(anim('opacity', '0;0;1;1', D, { keyTimes: '0;0.28;0.32;1' }));
    svg.appendChild(arc);
    svg.appendChild(pop(432, 132, D, '0;0.5;0.62;1', [
      svgEl('rect', { x: -64, y: -24, width: sw, height: 26, rx: 4, fill: BG, stroke: BP, 'stroke-width': '1.6', 'stroke-dasharray': '5 4' }),
      txt(0, -7, "3' 修复导入", BP, 9),
      svgEl('rect', { x: -64, y: 12, width: sw, height: 26, rx: 4, fill: BG, stroke: BP, 'stroke-width': '1.6', 'stroke-dasharray': '5 4' }),
      txt(0, 29, "4' 重跑测试", BP, 9),
      txt(0, -34, '差异 +2 −2', BP, 8)
    ]));
    var cur = svgEl('circle', { r: 5, fill: WARN });
    cur.appendChild(anim('cx', '188;188;188;188;356;356;356;356', D, { keyTimes: '0;0.12;0.24;0.55;0.62;0.78;0.9;1' }));
    cur.appendChild(anim('cy', '49;85;121;121;121;157;157;157', D, { keyTimes: '0;0.12;0.24;0.55;0.62;0.78;0.9;1' }));
    svg.appendChild(cur);
    svg.appendChild(txt(260, 240, '预算：步骤 7/8 · 重规划 1/2 · 任一超限即终止', MUTE, 8));
    card(host, '规划、执行与重新规划（Plan / Execute / Replan）', '失败后交回规划器',
      svg,
      '计划是由带类型步骤组成的有序列表（Ordered List），执行器可直接遍历，无需解析自然语言。步骤 3 失败时，执行器将游标（Cursor）和错误交回规划器（Planner），由规划器从该位置起返回新的剩余步骤。修订以差异（Diff）形式呈现，便于追踪器展示。步骤数与重新规划次数各有硬性上限，避免循环无限规划。');
  }

  // 第 25 课：校验门禁链遇到首个 DENY 即停止，账本计量获准调用的输出。
  function gateChain(host) {
    var svg = svgEl('svg', { viewBox: '0 0 520 240' });
    var D = '5.5s';
    svg.appendChild(txt(260, 16, '每次工具调用经过门禁链 · 首个 DENY 即拒绝', MUTE, 10));
    var names = ['预算', '时效性', '允许列表', '正则检查'];
    var subs = ['词元预算够吗？', '读取结果过期吗？', '工具已登记吗？', 'argv 合规吗？'];
    var gx = [64, 172, 280, 388], gy = 56, gw = 92, gh = 40, i;
    svg.appendChild(svgEl('line', { x1: 24, y1: gy + gh / 2, x2: 504, y2: gy + gh / 2, stroke: RULE, 'stroke-width': '1.2', 'stroke-dasharray': '3 4' }));
    for (i = 0; i < 4; i++) {
      var r = svgEl('rect', { x: gx[i], y: gy, width: gw, height: gh, rx: 5, fill: BG, stroke: BP, 'stroke-width': '1.6', opacity: '0.55' });
      r.appendChild(anim('opacity', '0.55;1;0.55', D, { begin: (0.3 + i * 0.25) + 's' }));
      svg.appendChild(r);
      svg.appendChild(txt(gx[i] + gw / 2, gy + 17, names[i], BP, 10));
      svg.appendChild(txt(gx[i] + gw / 2, gy + 31, subs[i], MUTE, 7));
    }
    svg.appendChild(txt(24, gy - 10, '调用：read_file', SOFT, 8, 'start'));
    svg.appendChild(txt(504, gy - 10, 'ALLOW', BP, 9, 'end'));
    var pa = svgEl('rect', { x: 24, y: gy + gh / 2 - 6, width: 16, height: 12, rx: 2, fill: BP });
    pa.appendChild(anim('x', '24;110;218;326;434;488;488', D, { keyTimes: '0;0.09;0.18;0.27;0.36;0.44;1', calcMode: 'spline', keySplines: SPL + ';' + SPL + ';' + SPL + ';' + SPL + ';' + SPL + ';' + SPL }));
    pa.appendChild(anim('opacity', '1;1;1;1;1;1;0;0', D, { keyTimes: '0;0.09;0.18;0.27;0.36;0.5;0.56;1' }));
    svg.appendChild(pa);
    var pb = svgEl('rect', { x: 24, y: gy + gh / 2 - 6, width: 16, height: 12, rx: 2, fill: WARN });
    pb.appendChild(anim('x', '24;24;110;218;326;326;326', D, { keyTimes: '0;0.5;0.58;0.66;0.74;0.8;1', calcMode: 'spline', keySplines: SPL + ';' + SPL + ';' + SPL + ';' + SPL + ';' + SPL + ';' + SPL }));
    pb.appendChild(anim('y', '70;70;70;138;138', D, { keyTimes: '0;0.76;0.8;0.9;1' }));
    pb.appendChild(anim('opacity', '0;0;1;1;1;0;0', D, { keyTimes: '0;0.48;0.52;0.85;0.9;0.97;1' }));
    svg.appendChild(pb);
    var deny = txt(326, 168, '✗ DENY：未知工具 "shell"', WARN, 8);
    deny.appendChild(anim('opacity', '0;0;1;1;0;0', D, { keyTimes: '0;0.78;0.84;0.94;0.98;1' }));
    svg.appendChild(deny);
    var route = svgEl('path', { d: 'M488 76 V 150 H 384 V 186', fill: 'none', stroke: BP, 'stroke-width': '1.4', 'stroke-dasharray': '5 4' });
    route.appendChild(anim('stroke-dashoffset', '60;60;0;0', D, { keyTimes: '0;0.42;0.52;1', calcMode: 'spline', keySplines: SPL3 }));
    route.appendChild(anim('opacity', '0;0;1;1', D, { keyTimes: '0;0.4;0.44;1' }));
    svg.appendChild(route);
    var ly = 192;
    svg.appendChild(txt(140, ly - 8, '观察结果账本', MUTE, 8, 'start'));
    svg.appendChild(svgEl('rect', { x: 140, y: ly, width: 240, height: 14, rx: 2, fill: 'none', stroke: MUTE, 'stroke-width': '1.4' }));
    var lfill = svgEl('rect', { x: 141, y: ly + 1, width: 96, height: 12, rx: 2, fill: BP, opacity: '0.5' });
    lfill.appendChild(anim('width', '96;96;150;150', D, { keyTimes: '0;0.44;0.54;1', calcMode: 'spline', keySplines: SPL3 }));
    svg.appendChild(lfill);
    svg.appendChild(txt(388, ly + 11, '已展示 5.1K / 8K 词元', SOFT, 8, 'start'));
    card(host, '门禁链与账本（Gate Chain + Ledger）', '尽早拒绝 · 计量获准调用',
      svg,
      '门禁链包含四个确定性检查，采用短路语义（Short-circuit Semantics）：首个拒绝（DENY）立即结束检查，并记录原因供模型读取。获准（ALLOW）的调用也要计量成本，其输出计入观察结果账本（Observation Ledger）。一旦向模型展示的累计词元将超过预算，链首的预算门禁便自动拒绝后续调用。');
  }

  // 第 26 课：沙箱路径约束，在项目根目录边界阻止路径穿越。
  function pathJail(host) {
    var svg = svgEl('svg', { viewBox: '0 0 520 240' });
    var D = '5s';
    svg.appendChild(txt(260, 16, '逐个参数解析 realpath · 校验根目录前缀', MUTE, 10));
    svg.appendChild(svgEl('rect', { x: 28, y: 64, width: 104, height: 44, rx: 5, fill: BG, stroke: BP, 'stroke-width': '1.8' }));
    svg.appendChild(txt(80, 82, '沙箱', BP, 10));
    svg.appendChild(txt(80, 96, 'subprocess.run', MUTE, 7));
    svg.appendChild(svgEl('rect', { x: 250, y: 40, width: 180, height: 110, rx: 6, fill: 'none', stroke: BP, 'stroke-width': '1.8', 'stroke-dasharray': '7 5' }));
    svg.appendChild(txt(340, 32, '项目根目录约束', BP, 9));
    svg.appendChild(svgEl('rect', { x: 268, y: 56, width: 78, height: 20, rx: 3, fill: SURF, stroke: RULE, 'stroke-width': '1' }));
    svg.appendChild(txt(307, 69, 'src/main.py', SOFT, 8));
    svg.appendChild(svgEl('rect', { x: 268, y: 118, width: 78, height: 20, rx: 3, fill: SURF, stroke: RULE, 'stroke-width': '1' }));
    svg.appendChild(txt(307, 131, 'tests/', SOFT, 8));
    var okp = svgEl('path', { d: 'M132 78 C 190 78, 210 66, 264 66', fill: 'none', stroke: BP, 'stroke-width': '1.8', 'stroke-dasharray': '6 5' });
    okp.appendChild(anim('stroke-dashoffset', '80;80;0;0', D, { keyTimes: '0;0.06;0.22;1', calcMode: 'spline', keySplines: SPL3 }));
    okp.appendChild(anim('opacity', '0;0;1;1', D, { keyTimes: '0;0.05;0.1;1' }));
    svg.appendChild(okp);
    var ok = txt(352, 69, '✓ 位于根目录内', BP, 8, 'start');
    ok.appendChild(anim('opacity', '0;0;1;1', D, { keyTimes: '0;0.2;0.28;1' }));
    svg.appendChild(ok);
    var esc = svgEl('circle', { r: 5, fill: WARN });
    var mo = svgEl('animateMotion', {
      dur: D, repeatCount: 'indefinite', path: 'M132 100 L 430 100',
      keyPoints: '0;0;1;0.55;0.55', keyTimes: '0;0.3;0.55;0.8;1', calcMode: 'linear'
    });
    esc.appendChild(mo);
    svg.appendChild(esc);
    svg.appendChild(txt(180, 118, '../../etc/passwd', WARN, 8));
    var flash = svgEl('line', { x1: 430, y1: 84, x2: 430, y2: 120, stroke: WARN, 'stroke-width': '2.5' });
    flash.appendChild(anim('opacity', '0;0;1;0;0', D, { keyTimes: '0;0.52;0.56;0.68;1' }));
    svg.appendChild(flash);
    var no = txt(444, 104, '✗ 越出根目录', WARN, 8, 'start');
    no.appendChild(anim('opacity', '0;0;1;1', D, { keyTimes: '0;0.54;0.6;1' }));
    svg.appendChild(no);
    var chips = ['sudo', 'rm -rf', 'python3 -c'], cx = [116, 216, 316], i;
    for (i = 0; i < 3; i++) {
      svg.appendChild(pop(cx[i] + 40, 197, D, '0;' + (0.6 + i * 0.08).toFixed(2) + ';' + (0.7 + i * 0.08).toFixed(2) + ';1', [
        svgEl('rect', { x: -40, y: -11, width: 80, height: 22, rx: 4, fill: BG, stroke: RULE, 'stroke-width': '1.4' }),
        txt(0, 4, chips[i], SOFT, 9),
        svgEl('line', { x1: -34, y1: 0, x2: 34, y2: 0, stroke: WARN, 'stroke-width': '1.8' })
      ]));
    }
    svg.appendChild(txt(104, 200, '拒绝列表', MUTE, 8, 'end'));
    svg.appendChild(txt(260, 232, '按名称与 argv 结构匹配', MUTE, 8, 'middle'));
    card(host, '路径约束与拒绝列表（Path Jail + Denylist）', '校验前缀 · 命令名 · 参数结构',
      svg,
      '模型与操作系统之间设有两类拦截。每个路径参数都通过 realpath 解析，并要求保留项目根目录前缀，使 ../../ 路径穿越（Path Traversal）在边界处被拒绝，无法访问 /etc。同时，拒绝列表（Denylist）按名称拦截可执行文件，argv 检查器识别通过 -c 参数夹带 shell 命令的解释器调用。输出会被截断，实际经过时间（Wall-clock Time）超限时终止失控进程。');
  }

  // 第 29 课：端到端运行框架，每个执行步骤都经过四层处理。
  function harnessWeave(host) {
    var svg = svgEl('svg', { viewBox: '0 0 520 260' });
    var D = '5.5s';
    var bands = ['门禁链', '沙箱', 'OTel 追踪片段', '评估框架'], i;
    for (i = 0; i < 4; i++) {
      var b = svgEl('rect', { x: 30, y: 40 + i * 44, width: 380, height: 34, rx: 4, fill: SURF, stroke: RULE, 'stroke-width': '1', opacity: '0.5' });
      b.appendChild(anim('opacity', '0.5;0.9;0.5', D, { begin: (i * 0.22) + 's' }));
      svg.appendChild(b);
      svg.appendChild(txt(38, 61 + i * 44, bands[i], SOFT, 9, 'start'));
    }
    var labels = ['读取', '测试', '写入', '测试'], lx = [130, 210, 290, 370];
    for (i = 0; i < 4; i++) {
      var t = txt(lx[i], 30, labels[i], BP, 9);
      t.appendChild(anim('opacity', '0.3;1;0.3', D, { begin: (i * 1.3) + 's' }));
      svg.appendChild(t);
    }
    var dot = svgEl('circle', { r: 5, fill: WARN });
    dot.appendChild(svgEl('animateMotion', {
      dur: D, repeatCount: 'indefinite',
      path: 'M130 44 V 206 L 210 44 V 206 L 290 44 V 206 L 370 44 V 206'
    }));
    svg.appendChild(dot);
    svg.appendChild(pop(462, 130, D, '0;0.78;0.9;1', [
      svgEl('rect', { x: -40, y: -36, width: 80, height: 72, rx: 5, fill: BG, stroke: BP, 'stroke-width': '2' }),
      txt(0, -16, '运行报告', BP, 9),
      txt(0, 6, '通过', INK, 13),
      txt(0, 24, '9 步 · 0 次拦截', MUTE, 7)
    ]));
    svg.appendChild(txt(220, 246, '全局预算：12 步 · 8K 观察结果词元', MUTE, 8));
    card(host, '端到端运行框架（Harness End to End）', '每步经过四层处理',
      svg,
      '端到端运行的每个步骤都经过四层：门禁链（Gate Chain）判定调用是否获准，沙箱（Sandbox）执行调用，追踪片段（Span）包围整个交互，评估框架（Evaluation Harness）为完成的执行轨迹（Trajectory）评分。预算集中管理，各层读取同一本账本，避免组件间判断不一致。测试夹具中的缺陷在九步内修复，未超过十二步上限，合法工具调用未触发任何拦截。');
  }

  // 第 41 课：评估流水线，将四项指标汇总为一份报告。
  function evalQuadrant(host) {
    var svg = svgEl('svg', { viewBox: '0 0 520 260' });
    var D = '4.5s';
    svg.appendChild(txt(196, 16, '四项评估 · 覆盖不同盲区', MUTE, 10));
    var tiles = [
      ['困惑度', '留出语言建模数据', '31.4', 0.55],
      ['精确匹配', '简短事实回答', '0.45', 0.45],
      ['词元 F1', '开放式回答', '0.62', 0.62],
      ['裁判（模拟）', '1–5 分评分标准', '3.8 / 5', 0.76]
    ];
    var px = [36, 206, 36, 206], py = [36, 36, 148, 148], w = 150, h = 92, i;
    for (i = 0; i < 4; i++) {
      var x = px[i], y = py[i];
      svg.appendChild(svgEl('rect', { x: x, y: y, width: w, height: h, rx: 5, fill: BG, stroke: RULE, 'stroke-width': '1.4' }));
      svg.appendChild(txt(x + w / 2, y + 18, tiles[i][0], BP, 10));
      svg.appendChild(txt(x + w / 2, y + 31, tiles[i][1], MUTE, 7));
      svg.appendChild(txt(x + w / 2, y + 56, tiles[i][2], INK, 13));
      svg.appendChild(svgEl('rect', { x: x + 14, y: y + 68, width: w - 28, height: 8, rx: 2, fill: 'none', stroke: RULE, 'stroke-width': '1' }));
      var fw = Math.round(tiles[i][3] * (w - 30));
      var f = svgEl('rect', { x: x + 15, y: y + 69, width: 0, height: 6, rx: 2, fill: BP, opacity: '0.6' });
      f.appendChild(anim('width', '0;0;' + fw + ';' + fw, D, {
        keyTimes: '0;' + (0.08 + i * 0.06).toFixed(2) + ';' + (0.34 + i * 0.06).toFixed(2) + ';1',
        calcMode: 'spline', keySplines: SPL3
      }));
      svg.appendChild(f);
      var a = svgEl('path', { d: 'M' + (x + w) + ' ' + (y + h / 2) + ' C 372 ' + (y + h / 2) + ', 372 130, 392 130', fill: 'none', stroke: BP, 'stroke-width': '1.4', 'stroke-dasharray': '5 4' });
      a.appendChild(anim('opacity', '0;0;1;1', D, { keyTimes: '0;' + (0.4 + i * 0.04).toFixed(2) + ';' + (0.48 + i * 0.04).toFixed(2) + ';1' }));
      svg.appendChild(a);
    }
    svg.appendChild(pop(452, 130, D, '0;0.58;0.72;1', [
      svgEl('rect', { x: -56, y: -60, width: 112, height: 120, rx: 6, fill: BG, stroke: BP, 'stroke-width': '2' }),
      txt(0, -40, '报告', BP, 10),
      txt(0, -18, 'ppl 31.4', SOFT, 8),
      txt(0, -4, 'em 0.45', SOFT, 8),
      txt(0, 10, 'f1 0.62', SOFT, 8),
      txt(0, 24, '裁判 3.8', SOFT, 8),
      txt(0, 46, '综合 0.61', INK, 11)
    ]));
    card(host, '评估流水线（Evaluation Pipeline）', '困惑度 · 精确匹配 · F1 · 裁判',
      svg,
      '困惑度（Perplexity，ppl）衡量语言分布拟合程度，并不直接考查问答。精确匹配（Exact Match，em）能评估事实回答，但会惩罚改写；词元 F1（Token F1）对改写更宽容，却可能被词面重叠误导。模拟裁判（Mock Judge）无需网络调用，按评分标准评估开放式回答。单个数字不足以描述语言模型，因此流水线在适配各指标的留出子集（Held-out Subset）上运行四项评估，再汇总为便于审查的加权报告。');
  }

  // 第 48 课：DDP 集合通信，汇总梯度并返回均值。
  function allreduceRing(host) {
    var svg = svgEl('svg', { viewBox: '0 0 520 250' });
    var D = '5s';
    svg.appendChild(txt(260, 16, '初始化广播一次 · 每步执行全归约', MUTE, 10));
    var rx = [40, 164, 288, 412], i;
    for (i = 0; i < 4; i++) {
      svg.appendChild(svgEl('rect', { x: rx[i], y: 44, width: 96, height: 40, rx: 5, fill: BG, stroke: i === 0 ? BP : RULE, 'stroke-width': i === 0 ? '2' : '1.4' }));
      svg.appendChild(txt(rx[i] + 48, 61, 'rank ' + i, i === 0 ? BP : SOFT, 10));
      svg.appendChild(txt(rx[i] + 48, 75, i === 0 ? '初始模型' : '副本', MUTE, 7));
    }
    for (i = 1; i < 4; i++) {
      var bc = svgEl('path', { d: 'M96 44 C ' + (96 + (rx[i] - 48)) / 2 + ' 24, ' + (96 + (rx[i] - 48)) / 2 + ' 24, ' + (rx[i] + 40) + ' 44', fill: 'none', stroke: BP, 'stroke-width': '1.6', 'stroke-dasharray': '6 5' });
      bc.appendChild(anim('opacity', '0;1;1;0;0', D, { begin: (i * 0.1) + 's', keyTimes: '0;0.06;0.2;0.26;1' }));
      svg.appendChild(bc);
    }
    var bl = txt(260, 30, '从 rank 0 广播 θ', BP, 8);
    bl.appendChild(anim('opacity', '0;1;1;0;0', D, { keyTimes: '0;0.06;0.2;0.26;1' }));
    svg.appendChild(bl);
    svg.appendChild(svgEl('circle', { cx: 260, cy: 160, r: 22, fill: BG, stroke: BP, 'stroke-width': '1.8' }));
    var sum = txt(260, 164, 'Σ/N', BP, 10);
    svg.appendChild(sum);
    for (i = 0; i < 4; i++) {
      var g = svgEl('rect', { x: -6, y: -5, width: 12, height: 10, rx: 2, fill: WARN });
      g.appendChild(anim('opacity', '0;0;1;1;0;0', D, { keyTimes: '0;' + (0.3 + i * 0.04).toFixed(2) + ';' + (0.38 + i * 0.04).toFixed(2) + ';0.58;0.64;1' }));
      g.appendChild(svgEl('animateMotion', {
        dur: D, repeatCount: 'indefinite', path: 'M' + (rx[i] + 48) + ' 100 L 260 160',
        keyPoints: '0;0;1;1', keyTimes: '0;' + (0.42 + i * 0.04).toFixed(2) + ';' + (0.58 + i * 0.04).toFixed(2) + ';1', calcMode: 'linear'
      }));
      svg.appendChild(g);
      var m = svgEl('rect', { x: -6, y: -5, width: 12, height: 10, rx: 2, fill: BP });
      m.appendChild(anim('opacity', '0;0;1;1;0;0', D, { keyTimes: '0;0.7;0.74;0.9;0.96;1' }));
      m.appendChild(svgEl('animateMotion', {
        dur: D, repeatCount: 'indefinite', path: 'M260 160 L ' + (rx[i] + 48) + ' 100',
        keyPoints: '0;0;1;1', keyTimes: '0;0.72;0.88;1', calcMode: 'linear'
      }));
      svg.appendChild(m);
    }
    svg.appendChild(txt(352, 152, '全归约求均值', MUTE, 8, 'start'));
    svg.appendChild(txt(260, 232, '各进程用同一平均梯度更新 · 当前均为第 42 步', MUTE, 8));
    card(host, 'DDP 集合通信（DDP Collectives）', '汇总梯度 · 返回均值',
      svg,
      '数据并行（Data Parallelism）包含两类集合通信（Collective Communication）和一条更新规则。初始化时从进程（Rank）0 广播参数一次，使所有副本从相同状态出发。每次反向传播后，通过全归约（All-reduce）汇总各进程梯度，并返回相同均值，使优化器更新保持一致。全分片数据并行（Fully Sharded Data Parallel，FSDP）将这一原则延伸到内存管理：每个进程只保留各参数的一个分片，仅在相应层计算期间汇集完整张量。');
  }

  // 第 50 课：假设生成器逐轮提高温度，拒绝落入已有簇的候选。
  function noveltyRamp(host) {
    var svg = svgEl('svg', { viewBox: '0 0 520 250' });
    var D = '5s';
    svg.appendChild(txt(260, 16, '逐轮提高温度 T · 拒绝簇内近似重复项', MUTE, 10));
    var th = [22, 44, 66], tt = ['0.7', '1.0', '1.3'], i;
    for (i = 0; i < 3; i++) {
      svg.appendChild(svgEl('rect', { x: 36 + i * 48, y: 190 - th[i], width: 44, height: th[i], rx: 2, fill: BP, opacity: (0.18 + i * 0.14).toFixed(2) }));
      svg.appendChild(txt(58 + i * 48, 204, 'T ' + tt[i], MUTE, 8));
    }
    var mk = svgEl('circle', { r: 5, fill: WARN });
    mk.appendChild(anim('cx', '58;58;106;106;154;154', D, { keyTimes: '0;0.3;0.36;0.62;0.68;1' }));
    mk.appendChild(anim('cy', '162;162;140;140;118;118', D, { keyTimes: '0;0.3;0.36;0.62;0.68;1' }));
    svg.appendChild(mk);
    svg.appendChild(txt(104, 224, '逐步升温', MUTE, 8));
    var ring = svgEl('circle', { cx: 300, cy: 110, r: 34, fill: 'none', stroke: RULE, 'stroke-width': '1.4', 'stroke-dasharray': '5 4' });
    ring.appendChild(anim('opacity', '0;0;1;1', D, { keyTimes: '0;0.1;0.16;1' }));
    svg.appendChild(ring);
    svg.appendChild(txt(300, 62, '余弦距离半径', MUTE, 7));
    svg.appendChild(pop(300, 110, D, '0;0.06;0.14;1', [svgEl('circle', { r: 6, fill: BP })]));
    var dup = svgEl('circle', { cx: 322, cy: 122, r: 6, fill: WARN });
    dup.appendChild(anim('opacity', '0;0;1;1;0;0', D, { keyTimes: '0;0.38;0.44;0.52;0.58;1' }));
    svg.appendChild(dup);
    var dx = txt(338, 126, '✗ 近似重复', WARN, 8, 'start');
    dx.appendChild(anim('opacity', '0;0;1;1;0;0', D, { keyTimes: '0;0.4;0.46;0.54;0.6;1' }));
    svg.appendChild(dx);
    svg.appendChild(pop(396, 88, D, '0;0.62;0.72;1', [svgEl('circle', { r: 6, fill: BP })]));
    svg.appendChild(pop(444, 152, D, '0;0.8;0.9;1', [svgEl('circle', { r: 6, fill: BP })]));
    var qx = [300, 360, 420], ql = ['h1 .91', 'h2 .84', 'h3 .77'], qk = ['0;0.16;0.26;1', '0;0.72;0.82;1', '0;0.9;0.98;1'];
    for (i = 0; i < 3; i++) {
      svg.appendChild(pop(qx[i], 216, D, qk[i], [
        svgEl('rect', { x: -26, y: -10, width: 52, height: 20, rx: 3, fill: BG, stroke: BP, 'stroke-width': '1.4' }),
        txt(0, 4, ql[i], BP, 8)
      ]));
    }
    svg.appendChild(txt(262, 220, '队列', MUTE, 8, 'end'));
    card(host, '假设生成器（Hypothesis Generator）', '升温 · 过滤 · 排序',
      svg,
      '采样器（Sampler）每次生成一个假设，而循环需要一条有足够候选的排序队列。每轮略微提高温度（Temperature），让下一稿与上一稿拉开差异；嵌入过滤器（Embedding Filter）拒绝落在已保留假设的余弦距离半径内的候选。剩余假设按新颖性（Novelty）、具体程度（Specificity）与可检验性（Testability）评分。由于每一步都固定随机种子（Seed），相同种子会重建相同队列。');
  }

  // 第 51 课：文献检索，合并词项检索与引用图跳转的结果。
  function citationHops(host) {
    var svg = svgEl('svg', { viewBox: '0 0 520 260' });
    var D = '5s';
    svg.appendChild(txt(260, 16, '词项检索 + 图检索 · 合并后按 ID 去重', MUTE, 10));
    svg.appendChild(svgEl('rect', { x: 32, y: 30, width: 130, height: 26, rx: 4, fill: BG, stroke: BP, 'stroke-width': '1.8' }));
    svg.appendChild(txt(97, 47, '"sparse attention"', BP, 8));
    svg.appendChild(txt(32, 74, '对摘要执行 BM25 检索', MUTE, 8, 'start'));
    var hits = ['p003 · 0.81', 'p007 · 0.66', 'p011 · 0.54'], i;
    for (i = 0; i < 3; i++) {
      svg.appendChild(pop(97, 95 + i * 32, D, '0;' + (0.08 + i * 0.07).toFixed(2) + ';' + (0.2 + i * 0.07).toFixed(2) + ';1', [
        svgEl('rect', { x: -65, y: -12, width: 130, height: 24, rx: 3, fill: SURF, stroke: RULE, 'stroke-width': '1.2' }),
        txt(0, 4, hits[i], SOFT, 8)
      ]));
    }
    svg.appendChild(txt(390, 40, '从已知文献锚点出发', MUTE, 8));
    var nodes = [[350, 74, 'p007', BP], [296, 132, 'p015', SOFT], [412, 126, 'p019', SOFT], [452, 180, 'p021', SOFT]];
    var edges = [[350, 74, 296, 132, 0.3], [350, 74, 412, 126, 0.36], [412, 126, 452, 180, 0.48]];
    for (i = 0; i < 3; i++) {
      var e = svgEl('line', { x1: edges[i][0], y1: edges[i][1], x2: edges[i][2], y2: edges[i][3], stroke: BP, 'stroke-width': '1.4', 'stroke-dasharray': '4 4' });
      e.appendChild(anim('opacity', '0;0;1;1', D, { keyTimes: '0;' + edges[i][4] + ';' + (edges[i][4] + 0.08).toFixed(2) + ';1' }));
      svg.appendChild(e);
    }
    for (i = 0; i < 4; i++) {
      var kt = i === 0 ? '0;0.22;0.32;1' : '0;' + (0.3 + i * 0.09).toFixed(2) + ';' + (0.42 + i * 0.09).toFixed(2) + ';1';
      svg.appendChild(pop(nodes[i][0], nodes[i][1], D, kt, [
        svgEl('circle', { r: 15, fill: BG, stroke: nodes[i][3] === BP ? BP : RULE, 'stroke-width': nodes[i][3] === BP ? '2' : '1.4' }),
        txt(0, 3, nodes[i][2], nodes[i][3], 8)
      ]));
    }
    svg.appendChild(txt(268, 152, '第 1 跳', MUTE, 7));
    svg.appendChild(txt(448, 150, '第 2 跳', MUTE, 7));
    var f1 = svgEl('path', { d: 'M97 200 V 216 H 180', fill: 'none', stroke: RULE, 'stroke-width': '1.4', 'stroke-dasharray': '5 4' });
    f1.appendChild(anim('opacity', '0;0;1;1', D, { keyTimes: '0;0.56;0.62;1' }));
    svg.appendChild(f1);
    var f2 = svgEl('path', { d: 'M390 200 V 216 H 344', fill: 'none', stroke: RULE, 'stroke-width': '1.4', 'stroke-dasharray': '5 4' });
    f2.appendChild(anim('opacity', '0;0;1;1', D, { keyTimes: '0;0.56;0.62;1' }));
    svg.appendChild(f2);
    svg.appendChild(pop(262, 227, D, '0;0.64;0.76;1', [
      svgEl('rect', { x: -110, y: -13, width: 220, height: 26, rx: 4, fill: BG, stroke: BP, 'stroke-width': '1.8' }),
      txt(0, 4, '排序：p007 p003 p019 p015 p011 p021', BP, 7)
    ]));
    var dd = txt(384, 231, 'p007 仅保留一次', SOFT, 8, 'start');
    dd.appendChild(anim('opacity', '0;0;1;1', D, { keyTimes: '0;0.78;0.86;1' }));
    svg.appendChild(dd);
    card(host, '文献检索（Literature Retrieval）', 'BM25 + 引用图遍历',
      svg,
      '对摘要执行 BM25 检索，可以找到与查询使用相同词汇的论文，却可能漏掉用不同名称描述同一思想的奠基工作。第二轮从已知文献锚点（Anchor）出发，沿引用图（Citation Graph）在两个方向各走一到两跳，找出关键词检索未能命中的后续研究。两组结果合并，以稳定的论文 ID 去重并排序；同时出现在两组中的锚点只保留一次。图中查询 sparse attention 指稀疏注意力。');
  }

  // 第 52 课：实验执行器监测子进程的时间与内存，超限则终止。
  function runnerLimits(host) {
    var svg = svgEl('svg', { viewBox: '0 0 520 250' });
    var D = '6s';
    svg.appendChild(txt(260, 16, '运行 A 完成 · 运行 B 触发上限', MUTE, 10));
    var spec = svgEl('g', {});
    spec.appendChild(svgEl('rect', { x: 28, y: 96, width: 100, height: 40, rx: 4, fill: BG, stroke: BP, 'stroke-width': '1.8' }));
    spec.appendChild(txt(78, 112, 'ExperimentSpec', BP, 8));
    spec.appendChild(txt(78, 126, '种子 1234', MUTE, 7));
    spec.appendChild(animT('translate', '-24 0;0 0;0 0', D, { keyTimes: '0;0.08;1', calcMode: 'spline', keySplines: SPL + ';' + SPL }));
    spec.appendChild(anim('opacity', '0;1;1', D, { keyTimes: '0;0.08;1' }));
    svg.appendChild(spec);
    svg.appendChild(svgEl('rect', { x: 190, y: 80, width: 150, height: 80, rx: 6, fill: BG, stroke: BP, 'stroke-width': '1.8' }));
    svg.appendChild(txt(265, 108, '子进程', BP, 10));
    svg.appendChild(txt(265, 122, '独立地址空间', MUTE, 7));
    svg.appendChild(txt(190, 54, '实际经过时间', MUTE, 7, 'start'));
    svg.appendChild(svgEl('rect', { x: 190, y: 60, width: 150, height: 10, rx: 2, fill: 'none', stroke: MUTE, 'stroke-width': '1.2' }));
    var clk = svgEl('rect', { x: 191, y: 61, width: 0, height: 8, rx: 2, fill: BP, opacity: '0.6' });
    clk.appendChild(anim('width', '0;0;100;100;0;0;120;120', D, { keyTimes: '0;0.06;0.36;0.44;0.5;0.52;0.82;1' }));
    svg.appendChild(clk);
    svg.appendChild(svgEl('rect', { x: 352, y: 80, width: 12, height: 80, rx: 2, fill: 'none', stroke: MUTE, 'stroke-width': '1.2' }));
    var mem = svgEl('rect', { x: 353, y: 160, width: 10, height: 0, fill: WARN, opacity: '0.55' });
    mem.appendChild(anim('height', '0;0;24;24;0;0;76;76', D, { keyTimes: '0;0.06;0.36;0.44;0.5;0.52;0.82;1' }));
    mem.appendChild(anim('y', '160;160;136;136;160;160;84;84', D, { keyTimes: '0;0.06;0.36;0.44;0.5;0.52;0.82;1' }));
    svg.appendChild(mem);
    svg.appendChild(svgEl('line', { x1: 348, y1: 104, x2: 370, y2: 104, stroke: WARN, 'stroke-width': '1.6', 'stroke-dasharray': '3 3' }));
    svg.appendChild(txt(374, 140, '内存上限', MUTE, 7, 'start'));
    var kill = txt(265, 144, 'SIGKILL · 内存超限', WARN, 9);
    kill.appendChild(anim('opacity', '0;0;1;1;0;0', D, { keyTimes: '0;0.8;0.84;0.94;0.98;1' }));
    svg.appendChild(kill);
    var blob = svgEl('g', { transform: 'translate(432 100)' });
    var bi = svgEl('g', {}, [
      svgEl('rect', { x: -44, y: -16, width: 88, height: 32, rx: 4, fill: BG, stroke: BP, 'stroke-width': '1.6', 'stroke-dasharray': '5 4' }),
      txt(0, -2, '指标数据', BP, 8),
      txt(0, 11, '{"ppl": 31.4}', SOFT, 7)
    ]);
    bi.appendChild(anim('opacity', '0;0;1;1;0;0', D, { keyTimes: '0;0.36;0.44;0.52;0.58;1' }));
    bi.appendChild(animT('scale', '0.95;0.95;1;1;1;1', D, { keyTimes: '0;0.36;0.44;0.52;0.58;1', calcMode: 'spline', keySplines: SPL3 + ';' + SPL + ';' + SPL }));
    blob.appendChild(bi);
    svg.appendChild(blob);
    svg.appendChild(pop(212, 209, D, '0;0.4;0.5;1', [
      svgEl('rect', { x: -62, y: -13, width: 124, height: 26, rx: 4, fill: BG, stroke: BP, 'stroke-width': '1.6' }),
      txt(0, 4, 'exp_001 · ok · 3.1s', BP, 8)
    ]));
    svg.appendChild(pop(360, 209, D, '0;0.86;0.96;1', [
      svgEl('rect', { x: -62, y: -13, width: 124, height: 26, rx: 4, fill: BG, stroke: WARN, 'stroke-width': '1.6' }),
      txt(0, 4, 'exp_002 · oom-kill', WARN, 8)
    ]));
    svg.appendChild(txt(142, 213, '结果', MUTE, 8, 'end'));
    card(host, '实验执行器（Experiment Runner）', '超时 · 内存上限 · 指标数据',
      svg,
      '执行器将实验规格（ExperimentSpec）序列化后传给子进程，监测实际经过时间（Wall-clock Time）的硬性超时和轮询检查的内存上限。运行 A 未触及两项限制，正常退出，通过标准输出（stdout）将结构化指标写入结果记录。运行 B 内存超限，被终止，记录明确标为内存不足（Out of Memory，oom），不伪造指标值。相同种子和规格在每次重跑时得到相同数值。');
  }

  // 第 53 课：结果评估器依据每个随机种子的配对差值作出判定。
  function pairedVerdict(host) {
    var svg = svgEl('svg', { viewBox: '0 0 520 250' });
    var D = '5s';
    svg.appendChild(txt(260, 16, '按相同种子配对 · 检验差值', MUTE, 10));
    var baseH = [64, 58, 70, 61], candH = [52, 49, 60, 50], i;
    for (i = 0; i < 4; i++) {
      var x = 44 + i * 58, kt = '0;' + (0.06 + i * 0.05).toFixed(2) + ';' + (0.22 + i * 0.05).toFixed(2) + ';1';
      var b = svgEl('rect', { x: x, y: 170, width: 14, height: 0, fill: MUTE, opacity: '0.55' });
      b.appendChild(anim('height', '0;0;' + baseH[i] + ';' + baseH[i], D, { keyTimes: kt, calcMode: 'spline', keySplines: SPL3 }));
      b.appendChild(anim('y', '170;170;' + (170 - baseH[i]) + ';' + (170 - baseH[i]), D, { keyTimes: kt, calcMode: 'spline', keySplines: SPL3 }));
      svg.appendChild(b);
      var c = svgEl('rect', { x: x + 17, y: 170, width: 14, height: 0, fill: BP, opacity: '0.75' });
      c.appendChild(anim('height', '0;0;' + candH[i] + ';' + candH[i], D, { keyTimes: kt, calcMode: 'spline', keySplines: SPL3 }));
      c.appendChild(anim('y', '170;170;' + (170 - candH[i]) + ';' + (170 - candH[i]), D, { keyTimes: kt, calcMode: 'spline', keySplines: SPL3 }));
      svg.appendChild(c);
      svg.appendChild(txt(x + 15, 184, 's' + i, MUTE, 8));
    }
    svg.appendChild(txt(60, 200, '困惑度：灰色基线 · 蓝色候选', MUTE, 7, 'start'));
    svg.appendChild(svgEl('line', { x1: 300, y1: 150, x2: 494, y2: 150, stroke: SOFT, 'stroke-width': '1.4' }));
    svg.appendChild(svgEl('line', { x1: 330, y1: 144, x2: 330, y2: 156, stroke: SOFT, 'stroke-width': '1.4' }));
    svg.appendChild(txt(330, 168, '0', MUTE, 8));
    svg.appendChild(txt(494, 168, 'Δ ppl', MUTE, 7, 'end'));
    var band = svgEl('rect', { x: 316, y: 122, width: 28, height: 44, fill: WARN });
    band.appendChild(anim('opacity', '0;0;0.15;0.15', D, { keyTimes: '0;0.58;0.68;1' }));
    svg.appendChild(band);
    svg.appendChild(txt(330, 116, '噪声水平', MUTE, 7));
    var dxv = [426, 402, 410, 418], dyv = [144, 136, 140, 132];
    for (i = 0; i < 4; i++) {
      var dot = svgEl('circle', { r: 4, fill: BP });
      var kt2 = '0;' + (0.3 + i * 0.06).toFixed(2) + ';' + (0.45 + i * 0.06).toFixed(2) + ';1';
      dot.appendChild(anim('cx', (61 + i * 58) + ';' + (61 + i * 58) + ';' + dxv[i] + ';' + dxv[i], D, { keyTimes: kt2, calcMode: 'spline', keySplines: SPL3 }));
      dot.appendChild(anim('cy', (166 - candH[i]) + ';' + (166 - candH[i]) + ';' + dyv[i] + ';' + dyv[i], D, { keyTimes: kt2, calcMode: 'spline', keySplines: SPL3 }));
      dot.appendChild(anim('opacity', '0;0;1;1', D, { keyTimes: kt2 }));
      svg.appendChild(dot);
    }
    svg.appendChild(pop(414, 122, D, '0;0.68;0.78;1', [
      svgEl('polygon', { points: '0,-6 6,0 0,6 -6,0', fill: BP }),
      txt(0, -12, '平均差值 Δ', BP, 8)
    ]));
    svg.appendChild(pop(396, 216, D, '0;0.8;0.9;1', [
      svgEl('rect', { x: -100, y: -15, width: 200, height: 30, rx: 5, fill: BG, stroke: BP, 'stroke-width': '2' }),
      txt(0, 4, '有改进 · t 5.9 · p < 0.01', BP, 9)
    ]));
    card(host, '结果评估器（Result Evaluator）', '配对差值 · t 检验 · 判定',
      svg,
      '每种配置只运行一次不足以证明改进；相同规格换一个随机种子，结果就可能变化。评估器按相同种子配对候选（Candidate）与基线（Baseline），比较各对差值。差值均值表示效应（Effect），离散程度反映噪声水平（Noise Floor）；从零实现的配对 t 检验（Paired t-test）判断均值是否显著偏离噪声。判定结果写回假设队列，相同输入始终得到相同判定。');
  }

  LF.register({
    'cg-plan-replan': planReplan,
    'cg-gate-chain': gateChain,
    'cg-path-jail': pathJail,
    'cg-harness-weave': harnessWeave,
    'cg-eval-quadrant': evalQuadrant,
    'cg-allreduce-ring': allreduceRing,
    'cg-novelty-ramp': noveltyRamp,
    'cg-citation-hops': citationHops,
    'cg-runner-limits': runnerLimits,
    'cg-paired-verdict': pairedVerdict
  });
})();
