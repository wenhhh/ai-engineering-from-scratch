/* figures-autoswarm5.js - 阶段 15（自主系统（Autonomous systems））与阶段 16（多智能体与群体（Multi-agent and swarms））
   的第五个动画图表模块，支持主题切换。
   在 lesson-figures.js 之后加载，通过 window.LF 注册。无依赖，
   仅使用 ES5，采用 SMIL 动画，主题由 CSS 变量控制。编写方式：使用一个 ```figure
   块，以以下某个组件名称为内容。 */
(function () {
  'use strict';
  var LF = window.LF;
  if (!LF) { return; }
  var el = LF.el, svgEl = LF.svgEl;

  function shell(host, label, hint, svg, cap) {
    host.appendChild(el('div', { class: 'lf' }, [
      el('div', { class: 'lf-head' }, [el('span', { class: 'lf-label' }, [label]), el('span', {}, [hint])]),
      el('div', { class: 'lf-body' }, [el('div', { class: 'lf-out' }, [svg])]),
      el('div', { class: 'lf-cap' }, [cap])
    ]));
  }
  function txt(x, y, s, size, fill, anchor) {
    var t = svgEl('text', { x: x, y: y, 'text-anchor': anchor || 'middle', 'font-family': 'var(--font-mono,monospace)', 'font-size': size || '10', fill: fill || 'var(--ink-mute,#777)' });
    t.appendChild(document.createTextNode(s));
    return t;
  }
  function anim(attr, vals, kt, dur, opts) {
    var a = { attributeName: attr, values: vals, keyTimes: kt, dur: dur + 's', repeatCount: 'indefinite' };
    if (opts) for (var k in opts) a[k] = opts[k];
    return svgEl('animate', a);
  }
  function motion(path, kp, kt, dur, begin) {
    return svgEl('animateMotion', { path: path, keyPoints: kp, keyTimes: kt, dur: dur + 's', begin: (begin || 0) + 's', repeatCount: 'indefinite', calcMode: 'linear' });
  }
  function f2(x) { return x.toFixed(3); }
  var EASE = '0.23 1 0.32 1';
  var LIN = '0 0 1 1';
  // 入场（Entry）：lo 之前隐藏，通过样条缓动（Spline easing）在 lo+rise 时完全显示，保持至 hi，
  // 到 hi+drop 时退出（保持 drop < rise，使退场看起来比入场快）
  function appear(node, lo, rise, hi, drop, period) {
    var kt = '0;' + f2(lo) + ';' + f2(lo + rise) + ';' + f2(hi) + ';' + f2(hi + drop) + ';1';
    node.appendChild(svgEl('animate', {
      attributeName: 'opacity', values: '0;0;1;1;0;0', keyTimes: kt, dur: period + 's',
      repeatCount: 'indefinite', calcMode: 'spline',
      keySplines: LIN + ';' + EASE + ';' + LIN + ';' + LIN + ';' + LIN
    }));
  }
  // 循环内标量属性（Scalar attribute）以相同缓动从 from 增长到 to
  function grow(node, attr, from, to, lo, rise, period) {
    var kt = '0;' + f2(lo) + ';' + f2(lo + rise) + ';1';
    node.appendChild(svgEl('animate', {
      attributeName: attr, values: from + ';' + from + ';' + to + ';' + to, keyTimes: kt,
      dur: period + 's', repeatCount: 'indefinite', calcMode: 'spline',
      keySplines: LIN + ';' + EASE + ';' + LIN
    }));
  }

  var BP = 'var(--blueprint,#3553ff)';
  var WARN = 'var(--warn,#b8870f)';
  var SOFT = 'var(--rule-soft,#ddd)';
  var SURF = 'var(--bg-surface,#eee)';
  var MUTE = 'var(--ink-mute,#777)';

  // ── a5-scaffold-delta: 同一个模型接入两个脚手架（Scaffolds）；在权重完全相同的情况下，
  //    评分条最终相差 16.6 分 ──
  function scaffoldDelta(host) {
    var W = 520, H = 250, period = 6;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var mx = 62, my = 122, sx = 205, sy = [72, 172], i;
    var names = ['SWE-agent v1', 'Cline 自主模式'];
    var pct = ['43.2%', '59.8%'];
    var bw = [78, 108];
    for (i = 0; i < 2; i++) {
      svg.appendChild(svgEl('line', { x1: mx + 24, y1: my, x2: sx - 52, y2: sy[i], stroke: SOFT, 'stroke-width': '1.2' }));
    }
    for (i = 0; i < 2; i++) {
      var pkt = svgEl('circle', { r: '4', fill: BP });
      appear(pkt, 0.02 + i * 0.05, 0.04, 0.2 + i * 0.05, 0.03, period);
      pkt.appendChild(motion('M' + (mx + 24) + ',' + my + ' L' + (sx - 52) + ',' + sy[i], '0;0;1;1', '0;' + f2(0.02 + i * 0.05) + ';' + f2(0.24 + i * 0.05) + ';1', period));
      svg.appendChild(pkt);
    }
    svg.appendChild(svgEl('circle', { cx: mx, cy: my, r: '24', stroke: BP, 'stroke-width': '2', fill: SURF }));
    svg.appendChild(txt(mx, my - 2, '同一个', '8', BP));
    svg.appendChild(txt(mx, my + 10, '模型', '8', BP));
    for (i = 0; i < 2; i++) {
      svg.appendChild(svgEl('rect', { x: sx - 52, y: sy[i] - 18, width: 104, height: 36, fill: SURF, stroke: (i ? WARN : MUTE), 'stroke-width': '2', rx: '3' }));
      svg.appendChild(txt(sx, sy[i] + 3, names[i], '8', i ? WARN : MUTE));
      svg.appendChild(svgEl('rect', { x: 290, y: sy[i] - 6, width: 180, height: 12, fill: SURF, stroke: SOFT, 'stroke-width': '1' }));
      var fill = svgEl('rect', { x: 290, y: sy[i] - 6, width: 0, height: 12, fill: i ? WARN : MUTE });
      grow(fill, 'width', 0, bw[i], 0.3 + i * 0.1, 0.2, period);
      svg.appendChild(fill);
      var lab = txt(290 + bw[i] + 6, sy[i] + 3, pct[i], '9', i ? WARN : MUTE, 'start');
      appear(lab, 0.5 + i * 0.1, 0.08, 0.94, 0.04, period);
      svg.appendChild(lab);
    }
    var delta = txt(380, 126, '同样的权重，相差 16.6 个百分点', '8', BP);
    appear(delta, 0.7, 0.1, 0.93, 0.05, period);
    svg.appendChild(delta);
    svg.appendChild(txt(W / 2, H - 12, '一个模型，两套执行框架；模型外围的循环至关重要', '9', MUTE));
    shell(host, '执行框架差异（Scaffold Delta）', '权重相同，外围循环不同', svg,
      'Claude Sonnet 4.5 在 SWE-agent v1 中的 SWE-bench Verified 得分为 43.2%，在 Cline 自主执行框架（Scaffold）中为 59.8%。模型权重相同，得分却相差 16.6 个百分点。模型外围的检索层、规划器、沙箱及编辑与验证循环（Edit-Verify Loop），已经与模型本身同样重要。');
  }

  // ── a5-guard-sieve: 提示词通过输入分类器（Input classifier），回答通过
  //    输出分类器（Output classifier）；一次攻击被捕获，借表情符号夹带的一次穿过 ──
  function guardSieve(host) {
    var W = 520, H = 230, period = 7, y = 100;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    svg.appendChild(svgEl('line', { x1: 30, y1: y, x2: 490, y2: y, stroke: SOFT, 'stroke-width': '1.2' }));
    svg.appendChild(svgEl('rect', { x: 235, y: y - 24, width: 76, height: 48, fill: SURF, stroke: MUTE, 'stroke-width': '2', rx: '3' }));
    svg.appendChild(txt(273, y + 4, '模型', '10', MUTE));
    var gx = [160, 372], glab = ['输入防护', '输出防护'], i;
    for (i = 0; i < 2; i++) {
      var g = svgEl('rect', { x: gx[i] - 9, y: y - 38, width: 18, height: 76, fill: SURF, stroke: BP, 'stroke-width': '2', rx: '3' });
      if (i === 0) g.appendChild(anim('stroke', BP + ';' + BP + ';' + WARN + ';' + WARN + ';' + BP + ';' + BP, '0;0.4;0.43;0.52;0.56;1', period));
      svg.appendChild(g);
      svg.appendChild(txt(gx[i], y - 46, glab[i], '8', BP));
      svg.appendChild(txt(gx[i], y + 52, 'S1-S14', '7', MUTE));
    }
    var safe = svgEl('circle', { r: '4.5', fill: BP });
    appear(safe, 0.02, 0.04, 0.3, 0.03, period);
    safe.appendChild(motion('M38,' + y + ' L482,' + y, '0;0;1;1', '0;0.02;0.32;1', period));
    svg.appendChild(safe);
    var bad = svgEl('rect', { x: -4.5, y: -4.5, width: 9, height: 9, fill: WARN, rx: '2' });
    var bg = svgEl('g', {});
    bg.appendChild(bad);
    appear(bg, 0.36, 0.03, 0.5, 0.03, period);
    bg.appendChild(motion('M38,' + y + ' L' + gx[0] + ',' + y + ' L' + gx[0] + ',' + (y + 58), '0;0;0.65;1;1', '0;0.36;0.44;0.52;1', period));
    svg.appendChild(bg);
    var blocked = txt(gx[0] + 34, y + 62, '已拦截', '8', WARN, 'start');
    appear(blocked, 0.45, 0.05, 0.56, 0.03, period);
    svg.appendChild(blocked);
    var smug = svgEl('circle', { r: '4.5', fill: 'none', stroke: MUTE, 'stroke-width': '1.6', 'stroke-dasharray': '2 2' });
    appear(smug, 0.6, 0.04, 0.93, 0.03, period);
    smug.appendChild(motion('M38,' + y + ' L482,' + y, '0;0;1;1', '0;0.6;0.94;1', period));
    svg.appendChild(smug);
    var slip = txt(440, y - 18, '夹带绕过', '8', MUTE);
    appear(slip, 0.82, 0.06, 0.93, 0.03, period);
    svg.appendChild(slip);
    svg.appendChild(txt(W / 2, H - 12, '输入输出都分类，字符级攻击仍可能穿透', '9', MUTE));
    shell(host, '防护筛网（Guard Sieve）', '输入分类，输出分类', svg,
      'Llama Guard 位于模型两侧，依据 MLCommons 的 S1–S14 危害分类体系（Hazard Taxonomy）对输入和输出分类，能以较低成本捕获明显滥用。但 Huang 等人在 2025 年测得，表情符号夹带（Emoji Smuggling）在六套防护系统上的攻击成功率均为 100%。分类器只是其中一层防御，不能单独解决问题。');
  }

  // ── a5-rsp-ladder: 能力量表升向 AI R&D-4 阈值，
  //    同时 v3.0 政策将承诺分成两级 ──
  function rspLadder(host) {
    var W = 520, H = 250, period = 8;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var gx = 100, top = 50, bot = 205;
    svg.appendChild(svgEl('rect', { x: gx - 17, y: top, width: 34, height: bot - top, fill: SURF, stroke: SOFT, 'stroke-width': '1.2' }));
    var fill = svgEl('rect', { x: gx - 17, y: bot, width: 34, height: 0, fill: BP, opacity: '0.55' });
    grow(fill, 'height', 0, 108, 0.05, 0.35, period);
    grow(fill, 'y', bot, bot - 108, 0.05, 0.35, period);
    svg.appendChild(fill);
    var th = svgEl('line', { x1: gx - 26, y1: 74, x2: gx + 26, y2: 74, stroke: WARN, 'stroke-width': '2', 'stroke-dasharray': '5 3' });
    th.appendChild(anim('opacity', '1;1;0.35;1;0.35;1;1', '0;0.45;0.52;0.6;0.68;0.76;1', period));
    svg.appendChild(th);
    svg.appendChild(txt(gx + 32, 78, 'AI R&D-4', '9', WARN, 'start'));
    var mark = txt(gx + 32, 101, '当前 Opus 4.6', '8', BP, 'start');
    appear(mark, 0.42, 0.08, 0.95, 0.04, period);
    svg.appendChild(mark);
    svg.appendChild(txt(gx, bot + 16, '能力', '8', MUTE));
    var cx = 330;
    svg.appendChild(svgEl('rect', { x: cx - 80, y: 58, width: 160, height: 52, fill: SURF, stroke: BP, 'stroke-width': '2', rx: '3' }));
    svg.appendChild(txt(cx, 78, '单方面承诺', '9', BP));
    svg.appendChild(txt(cx, 94, '训练与部署关卡', '7', MUTE));
    svg.appendChild(svgEl('rect', { x: cx - 80, y: 122, width: 160, height: 52, fill: 'none', stroke: MUTE, 'stroke-width': '1.6', 'stroke-dasharray': '5 3', rx: '3' }));
    svg.appendChild(txt(cx, 142, '行业建议', '8', MUTE));
    svg.appendChild(txt(cx, 158, 'RAND SL-4 安全等级', '7', MUTE));
    var pg = svgEl('g', {});
    pg.appendChild(svgEl('rect', { x: cx - 58, y: 186, width: 116, height: 24, fill: SURF, stroke: MUTE, 'stroke-width': '1.4', rx: '3' }));
    pg.appendChild(txt(cx, 202, '暂停条款（v2）', '8', MUTE));
    pg.appendChild(svgEl('line', { x1: cx - 52, y1: 198, x2: cx + 52, y2: 198, stroke: WARN, 'stroke-width': '1.8' }));
    appear(pg, 0.55, 0.08, 0.82, 0.04, period);
    svg.appendChild(pg);
    var drop = txt(cx, 226, 'v3.0 已移除', '8', WARN);
    appear(drop, 0.66, 0.06, 0.94, 0.03, period);
    svg.appendChild(drop);
    svg.appendChild(txt(gx, 40, '能力刻度', '8', MUTE));
    svg.appendChild(txt(cx, 46, '两层承诺', '8', MUTE));
    shell(host, '负责任扩展政策（RSP）v3.0', '能力刻度与阈值', svg,
      '负责任扩展政策（Responsible Scaling Policy，RSP）v3.0 将 AI R&D-4 设为下一能力阈值：模型能以有竞争力的成本，将相当一部分 AI 研究自动化。Claude Opus 4.6 尚低于该阈值，但 Anthropic 承认，越来越难以确信它尚未达到。承诺现分为单方面行动和行业建议，2023 年的暂停条款已移除；SaferAI 将该政策评分从 2.2 下调至 1.9。');
  }

  // ── a5-tracked-vs-research: 同一能力的两条泳道；Tracked
  //    泳道经过报告与评审门控，Research 泳道只受观察 ──
  function trackedVsResearch(host) {
    var W = 520, H = 250, period = 7;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var ty = 82, ry = 178;
    svg.appendChild(svgEl('line', { x1: 40, y1: ty, x2: 480, y2: ty, stroke: SOFT, 'stroke-width': '1.2' }));
    svg.appendChild(svgEl('line', { x1: 40, y1: ry, x2: 480, y2: ry, stroke: SOFT, 'stroke-width': '1.2' }));
    svg.appendChild(txt(42, ty - 30, '跟踪类（Tracked）', '9', BP, 'start'));
    svg.appendChild(txt(42, ry - 30, '研究类（Research）', '9', MUTE, 'start'));
    svg.appendChild(svgEl('rect', { x: 162, y: ty - 20, width: 92, height: 40, fill: SURF, stroke: BP, 'stroke-width': '2', rx: '3' }));
    svg.appendChild(txt(208, ty - 2, '能力报告 +', '8', BP));
    svg.appendChild(txt(208, ty + 10, '防护措施报告', '7', MUTE));
    svg.appendChild(svgEl('rect', { x: 292, y: ty - 20, width: 56, height: 40, fill: SURF, stroke: BP, 'stroke-width': '2', rx: '3' }));
    svg.appendChild(txt(320, ty + 4, 'SAG', '9', BP));
    var gate = svgEl('line', { x1: 388, y1: ty - 18, x2: 388, y2: ty + 18, stroke: WARN, 'stroke-width': '3' });
    gate.appendChild(anim('opacity', '1;1;0;0;1', '0;0.5;0.56;0.94;1', period));
    svg.appendChild(gate);
    var open = txt(388, ty - 26, '关卡放行', '7', WARN);
    appear(open, 0.52, 0.05, 0.9, 0.04, period);
    svg.appendChild(open);
    var tc = svgEl('circle', { r: '5', fill: BP });
    appear(tc, 0.02, 0.04, 0.9, 0.04, period);
    tc.appendChild(motion('M48,' + ty + ' L472,' + ty, '0;0;0.34;0.34;0.6;0.6;1;1', '0;0.02;0.2;0.32;0.42;0.55;0.88;1', period));
    svg.appendChild(tc);
    svg.appendChild(svgEl('circle', { cx: 300, cy: ry, r: '13', fill: 'none', stroke: MUTE, 'stroke-width': '1.6' }));
    var eye = svgEl('circle', { cx: 300, cy: ry, r: '4', fill: MUTE });
    eye.appendChild(anim('r', '4;4;5.5;4;4', '0;0.5;0.58;0.66;1', period));
    svg.appendChild(eye);
    svg.appendChild(txt(300, ry + 28, '持续观察', '7', MUTE));
    var rc = svgEl('circle', { r: '5', fill: MUTE });
    appear(rc, 0.38, 0.04, 0.9, 0.04, period);
    rc.appendChild(motion('M48,' + ry + ' L472,' + ry, '0;0;1;1', '0;0.38;0.88;1', period));
    svg.appendChild(rc);
    var nt = txt(420, ry - 12, '不自动触发措施', '7', MUTE);
    appear(nt, 0.72, 0.06, 0.92, 0.04, period);
    svg.appendChild(nt);
    svg.appendChild(txt(W / 2, H - 12, '同一种能力分入不同类别，决定它需通过关卡还是仅被观察', '8.5', MUTE));
    shell(host, '跟踪类（Tracked）与研究类（Research）', '设关卡，或持续观察', svg,
      'OpenAI 的前沿风险准备框架（Preparedness）v2 将类别分为两类。跟踪类（Tracked Categories）触发能力与防护措施报告，部署前由安全咨询小组（Safety Advisory Group，SAG）审查。研究类（Research Categories）包括长程自主性（Long-range Autonomy）和故意隐藏能力（Sandbagging），仅接受监测，并考虑可能的缓解措施。DeepMind 前沿安全框架（Frontier Safety Framework，FSF）v3 也采取类似做法，将自主性纳入机器学习研发与网络安全领域。');
  }

  // ── a5-horizon-fit: 任务点散布在对数时间轴（Log-time axis）上，一条逻辑斯蒂曲线
  //    穿过这些点，50% 交点确定时间跨度（Time horizon） ──
  function horizonFit(host) {
    var W = 520, H = 250, period = 8;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    svg.appendChild(svgEl('line', { x1: 70, y1: 195, x2: 470, y2: 195, stroke: MUTE, 'stroke-width': '1.4' }));
    svg.appendChild(svgEl('line', { x1: 70, y1: 195, x2: 70, y2: 40, stroke: MUTE, 'stroke-width': '1.4' }));
    svg.appendChild(txt(70, 212, '1 分钟', '8', MUTE));
    svg.appendChild(txt(270, 212, '1 小时', '8', MUTE));
    svg.appendChild(txt(455, 212, '8 小时以上', '8', MUTE));
    svg.appendChild(txt(58, 58, '1.0', '8', MUTE, 'end'));
    svg.appendChild(txt(58, 125, '0.5', '8', MUTE, 'end'));
    svg.appendChild(txt(58, 196, '0.0', '8', MUTE, 'end'));
    svg.appendChild(txt(40, 32, '成功概率 P(success)', '8', MUTE, 'start'));
    var dx = [95, 140, 185, 240, 300, 360, 430];
    var dy = [60, 66, 80, 108, 152, 172, 182];
    var ok = [1, 1, 1, 1, 0, 0, 0], i;
    for (i = 0; i < 7; i++) {
      var d = svgEl('circle', { cx: dx[i], cy: dy[i], r: '4.5', fill: ok[i] ? BP : 'none', stroke: ok[i] ? 'none' : MUTE, 'stroke-width': '1.6' });
      appear(d, 0.03 + i * 0.03, 0.04, 0.95, 0.04, period);
      d.appendChild(anim('r', '4.3;4.3;4.8;4.5;4.5', '0;' + f2(0.03 + i * 0.03) + ';' + f2(0.08 + i * 0.03) + ';' + f2(0.12 + i * 0.03) + ';1', period));
      svg.appendChild(d);
    }
    var curve = svgEl('path', {
      d: 'M80,56 C170,58 210,74 268,120 C320,162 380,180 460,184',
      fill: 'none', stroke: BP, 'stroke-width': '2', pathLength: '100',
      'stroke-dasharray': '100', 'stroke-dashoffset': '100'
    });
    curve.appendChild(svgEl('animate', {
      attributeName: 'stroke-dashoffset', values: '100;100;0;0', keyTimes: '0;0.28;0.55;1',
      dur: period + 's', repeatCount: 'indefinite', calcMode: 'spline',
      keySplines: LIN + ';' + EASE + ';' + LIN
    }));
    svg.appendChild(curve);
    var hl = svgEl('line', { x1: 70, y1: 121, x2: 270, y2: 121, stroke: WARN, 'stroke-width': '1.4', 'stroke-dasharray': '4 3' });
    appear(hl, 0.58, 0.06, 0.95, 0.04, period);
    svg.appendChild(hl);
    var vl = svgEl('line', { x1: 270, y1: 121, x2: 270, y2: 195, stroke: WARN, 'stroke-width': '1.4', 'stroke-dasharray': '4 3' });
    appear(vl, 0.64, 0.06, 0.95, 0.04, period);
    svg.appendChild(vl);
    var hp = svgEl('circle', { cx: 270, cy: 121, r: '5.5', fill: WARN });
    appear(hp, 0.62, 0.05, 0.95, 0.04, period);
    hp.appendChild(anim('r', '5.2;5.2;6;5.5;5.5', '0;0.62;0.68;0.74;1', period));
    svg.appendChild(hp);
    var lab = txt(282, 140, '任务时间跨度', '9', WARN, 'start');
    appear(lab, 0.7, 0.06, 0.95, 0.04, period);
    svg.appendChild(lab);
    shell(host, '任务时间跨度拟合（Time Horizon Fit）', '对任务结果拟合逻辑斯蒂曲线', svg,
      'METR 让模型执行 HCAST、RE-Bench 和 SWAA 任务，覆盖专家需花费数分钟至数小时完成的工作，再针对成功概率与专家完成时间的对数拟合逻辑斯蒂曲线（Logistic Curve）。成功率为 50% 的交点定义任务时间跨度（Time Horizon）。这是在不产生真实后果的条件下测得的理想化上界，并非部署表现预测。');
  }

  // ── a5-four-risks: CAIS 四象限依次点亮；组织
  //    风险（Organizational risk）持续高亮，因为它是实践者能够控制的一项 ──
  function fourRisks(host) {
    var W = 520, H = 250, period = 8;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var qx = [113, 293], qy = [46, 128], names = ['恶意使用', 'AI 竞赛', '组织风险', '失控 AI'];
    var i;
    for (i = 0; i < 4; i++) {
      var x = qx[i % 2], y = qy[i < 2 ? 0 : 1];
      svg.appendChild(svgEl('rect', { x: x, y: y, width: 164, height: 70, fill: SURF, stroke: SOFT, 'stroke-width': '1.4', rx: '3' }));
      svg.appendChild(txt(x + 82, y + (i === 2 ? 22 : 40), names[i], '9', i === 2 ? WARN : 'var(--ink-soft,#555)'));
      var hi = svgEl('rect', { x: x, y: y, width: 164, height: 70, fill: 'none', stroke: i === 2 ? WARN : BP, 'stroke-width': '2.5', rx: '3' });
      if (i === 2) appear(hi, 0.28, 0.06, 0.94, 0.04, period);
      else appear(hi, 0.04 + i * 0.12, 0.05, 0.14 + i * 0.12, 0.03, period);
      svg.appendChild(hi);
    }
    var chips = ['安全文化', '严格审计', '信息安全'];
    for (i = 0; i < 3; i++) {
      var c = txt(qx[0] + 82, qy[1] + 38 + i * 13, chips[i], '7.5', MUTE);
      appear(c, 0.48 + i * 0.05, 0.06, 0.93, 0.04, period);
      svg.appendChild(c);
    }
    svg.appendChild(txt(W / 2, H - 24, '四类社会层面风险，其中一类可以由你直接改善', '9', MUTE));
    shell(host, '四类风险（Four Risks）', 'CAIS 分类体系', svg,
      'AI 安全中心（Center for AI Safety，CAIS）的框架将灾难性 AI 风险分为恶意使用（Malicious Use）、AI 竞赛（AI Races）、组织风险（Organizational Risks）与失控 AI（Rogue AIs）。类别会重叠：实验室在竞赛中为抢速度而牺牲审计，最终发布失控 AI，就可能同时涉及四类风险。组织风险是从业者可以实际采取行动的领域，因此该象限持续高亮。');
  }

  // ── a5-primitive-radar: 智能体（Agent）、移交（Handoff）、共享状态（Shared state）、编排器（Orchestrator）作为四条
  //    轴；各框架在同一雷达图（Radar）上形成不同形状 ──
  function primitiveRadar(host) {
    var W = 520, H = 260, period = 9;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var cx = 260, cy = 122;
    svg.appendChild(svgEl('line', { x1: cx, y1: cy - 82, x2: cx, y2: cy + 82, stroke: SOFT, 'stroke-width': '1.2' }));
    svg.appendChild(svgEl('line', { x1: cx - 145, y1: cy, x2: cx + 145, y2: cy, stroke: SOFT, 'stroke-width': '1.2' }));
    svg.appendChild(txt(cx, cy - 90, '智能体', '9', MUTE));
    svg.appendChild(txt(cx + 152, cy + 3, '交接', '9', MUTE, 'start'));
    svg.appendChild(txt(cx, cy + 98, '共享状态', '9', MUTE));
    svg.appendChild(txt(cx - 152, cy + 3, '编排器', '9', MUTE, 'end'));
    function pts(t) {
      return cx + ',' + (cy - 82 * t[0]) + ' ' + (cx + 145 * t[1]) + ',' + cy + ' ' +
        cx + ',' + (cy + 82 * t[2]) + ' ' + (cx - 145 * t[3]) + ',' + cy;
    }
    var shapes = [
      { n: 'OpenAI Swarm', t: [0.9, 0.9, 0.22, 0.18], c: BP },
      { n: 'LangGraph', t: [0.5, 0.6, 0.9, 0.95], c: WARN },
      { n: 'CrewAI', t: [0.85, 0.4, 0.5, 0.75], c: MUTE }
    ];
    var i;
    for (i = 0; i < 3; i++) {
      var poly = svgEl('polygon', { points: pts(shapes[i].t), fill: 'none', stroke: shapes[i].c, 'stroke-width': '2' });
      appear(poly, 0.02 + i * 0.33, 0.06, 0.27 + i * 0.33, 0.03, period);
      svg.appendChild(poly);
      var nm = txt(cx, H - 22, shapes[i].n, '10', shapes[i].c);
      appear(nm, 0.02 + i * 0.33, 0.06, 0.27 + i * 0.33, 0.03, period);
      svg.appendChild(nm);
    }
    svg.appendChild(svgEl('circle', { cx: cx, cy: cy, r: '3.5', fill: 'var(--ink,#1a1a1a)' }));
    shell(host, '原语雷达图（Primitive Radar）', '用四个维度比较各类框架', svg,
      '智能体（Agent）、交接（Handoff）、共享状态（Shared State）和编排器（Orchestrator）这四个原语覆盖整个设计空间。OpenAI Swarm 侧重智能体与交接，将状态交给调用方；LangGraph 侧重 StateGraph 与确定性图编排器；CrewAI 侧重角色明确的智能体与管理进程。每个新框架都可表示为同一张雷达图上的另一种形状。');
  }

  // ── a5-og-narrator: 单独使用 LLM 只能达成少量交易；把确定性的
  //    报价生成器（Offer generator）与 LLM 叙述器（Narrator）分离，使成交率变为三倍 ──
  function ogNarrator(host) {
    var W = 520, H = 250, period = 8;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var y1 = 70, y2 = 165;
    svg.appendChild(txt(42, y1 - 32, '仅使用大语言模型（LLM）', '8', MUTE, 'start'));
    svg.appendChild(svgEl('line', { x1: 40, y1: y1, x2: 330, y2: y1, stroke: SOFT, 'stroke-width': '1.2' }));
    svg.appendChild(svgEl('rect', { x: 140, y: y1 - 18, width: 100, height: 36, fill: SURF, stroke: MUTE, 'stroke-width': '2', rx: '3' }));
    svg.appendChild(txt(190, y1 - 2, 'LLM 决定报价', '8', MUTE));
    svg.appendChild(txt(190, y1 + 10, '并生成措辞', '7', MUTE));
    var p1 = svgEl('circle', { r: '4.5', fill: MUTE });
    appear(p1, 0.02, 0.04, 0.32, 0.03, period);
    p1.appendChild(motion('M46,' + y1 + ' L324,' + y1, '0;0;1;1', '0;0.02;0.33;1', period));
    svg.appendChild(p1);
    svg.appendChild(txt(42, y2 - 32, 'OG-NARRATOR', '8', BP, 'start'));
    svg.appendChild(svgEl('line', { x1: 40, y1: y2, x2: 330, y2: y2, stroke: SOFT, 'stroke-width': '1.2' }));
    svg.appendChild(svgEl('rect', { x: 96, y: y2 - 18, width: 88, height: 36, fill: SURF, stroke: BP, 'stroke-width': '2', rx: '3' }));
    svg.appendChild(txt(140, y2 - 2, '报价生成器', '7.5', BP));
    svg.appendChild(txt(140, y2 + 10, '确定性计算', '7', MUTE));
    svg.appendChild(svgEl('rect', { x: 208, y: y2 - 18, width: 88, height: 36, fill: SURF, stroke: WARN, 'stroke-width': '2', rx: '3' }));
    svg.appendChild(txt(252, y2 - 2, 'LLM 叙述器', '7.5', WARN));
    svg.appendChild(txt(252, y2 + 10, '只负责措辞', '7', MUTE));
    var p2 = svgEl('circle', { r: '4.5', fill: BP });
    appear(p2, 0.4, 0.04, 0.78, 0.03, period);
    p2.appendChild(motion('M46,' + y2 + ' L324,' + y2, '0;0;0.33;0.33;0.72;0.72;1;1', '0;0.4;0.5;0.55;0.62;0.67;0.76;1', period));
    svg.appendChild(p2);
    svg.appendChild(svgEl('rect', { x: 360, y: y1 - 7, width: 110, height: 14, fill: SURF, stroke: SOFT, 'stroke-width': '1' }));
    var b1 = svgEl('rect', { x: 360, y: y1 - 7, width: 0, height: 14, fill: MUTE });
    grow(b1, 'width', 0, 29, 0.3, 0.14, period);
    svg.appendChild(b1);
    svg.appendChild(txt(415, y1 + 24, '成交率 26.7%', '8', MUTE));
    svg.appendChild(svgEl('rect', { x: 360, y: y2 - 7, width: 110, height: 14, fill: SURF, stroke: SOFT, 'stroke-width': '1' }));
    var b2 = svgEl('rect', { x: 360, y: y2 - 7, width: 0, height: 14, fill: BP });
    grow(b2, 'width', 0, 98, 0.76, 0.16, period);
    svg.appendChild(b2);
    svg.appendChild(txt(415, y2 + 24, '成交率 88.9%', '8', BP));
    svg.appendChild(txt(W / 2, H - 12, '先确定数值，再生成措辞；将机制与语言解耦更有效', '8.5', MUTE));
    shell(host, 'OG-Narrator 报价与叙述分离', '先数值，后文字', svg,
      '大语言模型将报价决策与表达混在一起，在参数严格限定的谈判中仅达成 26.7% 的交易，扩大模型规模也无法解决。OG-Narrator 将两者拆开：确定性的报价生成器（Offer Generator）计算每次报价，LLM 叙述器（Narrator）只编写配套消息。成交率提升至 88.9%，与契约网（Contract Net）的思路相呼应：将决策机制与通信层分离。');
  }

  // ── a5-memory-reflection: 观察记录堆叠为流，反思（Reflection）
  //    从中综合信息，再作为可检索的新记忆写回 ──
  function memoryReflection(host) {
    var W = 520, H = 250, period = 9;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var sx = 70, ey = [196, 170, 144, 118, 92], i;
    svg.appendChild(txt(sx + 60, 44, '记忆流（Memory Stream）', '8', MUTE));
    for (i = 0; i < 5; i++) {
      var g = svgEl('g', {});
      g.appendChild(svgEl('rect', { x: sx, y: ey[i], width: 120, height: 20, fill: SURF, stroke: SOFT, 'stroke-width': '1.2', rx: '2' }));
      g.appendChild(txt(sx + 60, ey[i] + 13, '观察记录', '7.5', 'var(--ink-soft,#555)'));
      appear(g, 0.03 + i * 0.055, 0.05, 0.96, 0.03, period);
      svg.appendChild(g);
    }
    var rx = 350, ry = 105;
    for (i = 2; i < 5; i++) {
      var ln = svgEl('line', { x1: sx + 120, y1: ey[i] + 10, x2: rx - 56, y2: ry, stroke: BP, 'stroke-width': '1.2', 'stroke-dasharray': '3 3' });
      appear(ln, 0.38 + (i - 2) * 0.03, 0.05, 0.62, 0.03, period);
      svg.appendChild(ln);
    }
    var refl = svgEl('g', {});
    var ell = svgEl('ellipse', { cx: rx, cy: ry, rx: '56', ry: '30', fill: SURF, stroke: WARN, 'stroke-width': '2' });
    refl.appendChild(ell);
    refl.appendChild(txt(rx, ry - 2, '反思（Reflection）', '9', WARN));
    refl.appendChild(txt(rx, ry + 12, '高阶综合', '6.5', MUTE));
    appear(refl, 0.46, 0.06, 0.96, 0.03, period);
    ell.appendChild(anim('rx', '53;53;57;56;56', '0;0.46;0.52;0.58;1', period));
    svg.appendChild(refl);
    var back = svgEl('path', { d: 'M' + (rx - 50) + ',' + (ry - 22) + ' Q250,40 ' + (sx + 120) + ',62', fill: 'none', stroke: WARN, 'stroke-width': '1.4', 'stroke-dasharray': '4 3' });
    appear(back, 0.6, 0.05, 0.96, 0.03, period);
    svg.appendChild(back);
    var ne = svgEl('g', {});
    ne.appendChild(svgEl('rect', { x: sx, y: 56, width: 120, height: 20, fill: SURF, stroke: WARN, 'stroke-width': '1.6', rx: '2' }));
    ne.appendChild(txt(sx + 60, 69, '反思', '7.5', WARN));
    appear(ne, 0.66, 0.06, 0.96, 0.03, period);
    svg.appendChild(ne);
    var pl = svgEl('g', {});
    pl.appendChild(svgEl('rect', { x: rx - 46, y: 172, width: 92, height: 34, fill: SURF, stroke: BP, 'stroke-width': '2', rx: '3' }));
    pl.appendChild(txt(rx, 186, '计划', '9', BP));
    pl.appendChild(txt(rx, 199, '天、小时、动作', '6.5', MUTE));
    appear(pl, 0.78, 0.06, 0.96, 0.03, period);
    svg.appendChild(pl);
    var pln = svgEl('line', { x1: rx, y1: ry + 32, x2: rx, y2: 170, stroke: BP, 'stroke-width': '1.4' });
    appear(pln, 0.74, 0.05, 0.96, 0.03, period);
    svg.appendChild(pln);
    svg.appendChild(txt(W / 2, H - 12, '观察、反思、规划；反思重新进入记忆流，像其他记忆一样被检索', '8.5', MUTE));
    shell(host, '生成式智能体循环（Generative Agent Loop）', '记忆流、反思、规划', svg,
      'Smallville 智能体维护仅追加的记忆流，按近期程度、重要性与相关性评分。智能体定期将近期记忆综合为反思，再写回记忆流，为从天级到动作级的自顶向下规划提供输入。消融（Ablation）三部分中的任意一个，行为可信度（Believability）都会下降。正是这套循环，让一个初始聚会想法在 24 个未预设行为脚本的智能体之间传播。');
  }

  // ── a5-retry-cascade: 一次支付失败扇出（Fan out）为不断倍增的下游重试，
  //    直到熔断器（Circuit breaker）切断这场风暴 ──
  function retryCascade(host) {
    var W = 520, H = 250, period = 8;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var bx = [90, 250, 410], by = 100, names = ['支付', '订单', '库存'], i;
    svg.appendChild(svgEl('line', { x1: bx[0], y1: by, x2: bx[2], y2: by, stroke: SOFT, 'stroke-width': '1.2' }));
    for (i = 0; i < 3; i++) {
      svg.appendChild(svgEl('rect', { x: bx[i] - 40, y: by - 20, width: 80, height: 40, fill: SURF, stroke: i === 0 ? WARN : BP, 'stroke-width': '2', rx: '3' }));
      svg.appendChild(txt(bx[i], by + 4, names[i], '9', i === 0 ? WARN : BP));
    }
    var fail = txt(bx[0], by - 30, '失败', '9', WARN);
    appear(fail, 0.03, 0.04, 0.5, 0.03, period);
    svg.appendChild(fail);
    for (i = 0; i < 2; i++) {
      var r1 = svgEl('circle', { r: '4', fill: WARN });
      appear(r1, 0.08 + i * 0.04, 0.03, 0.24 + i * 0.04, 0.03, period);
      r1.appendChild(motion('M' + (bx[0] + 42) + ',' + by + ' L' + (bx[1] - 42) + ',' + by, '0;0;1;1', '0;' + f2(0.08 + i * 0.04) + ';' + f2(0.26 + i * 0.04) + ';1', period));
      svg.appendChild(r1);
    }
    for (i = 0; i < 4; i++) {
      var r2 = svgEl('circle', { r: '4', fill: WARN });
      appear(r2, 0.24 + i * 0.035, 0.03, 0.42 + i * 0.035, 0.03, period);
      r2.appendChild(motion('M' + (bx[1] + 42) + ',' + by + ' L' + (bx[2] - 42) + ',' + by, '0;0;1;1', '0;' + f2(0.24 + i * 0.035) + ';' + f2(0.44 + i * 0.035) + ';1', period));
      svg.appendChild(r2);
    }
    svg.appendChild(svgEl('rect', { x: bx[2] - 40, y: 140, width: 80, height: 10, fill: SURF, stroke: SOFT, 'stroke-width': '1' }));
    var load = svgEl('rect', { x: bx[2] - 40, y: 140, width: 6, height: 10, fill: WARN });
    grow(load, 'width', 6, 80, 0.28, 0.24, period);
    svg.appendChild(load);
    var tenx = txt(bx[2], 168, '10 倍负载', '8', WARN);
    appear(tenx, 0.46, 0.05, 0.94, 0.03, period);
    svg.appendChild(tenx);
    var brk = svgEl('line', { x1: 330, y1: by - 26, x2: 330, y2: by + 26, stroke: WARN, 'stroke-width': '3' });
    appear(brk, 0.56, 0.05, 0.96, 0.03, period);
    svg.appendChild(brk);
    var bl = txt(330, by - 34, '熔断器', '8', WARN);
    appear(bl, 0.6, 0.05, 0.94, 0.03, period);
    svg.appendChild(bl);
    var late = svgEl('circle', { r: '4', fill: MUTE });
    appear(late, 0.68, 0.03, 0.8, 0.02, period);
    late.appendChild(motion('M' + (bx[1] + 42) + ',' + by + ' L326,' + by, '0;0;1;1', '0;0.68;0.8;1', period));
    svg.appendChild(late);
    svg.appendChild(txt(W / 2, H - 12, '1 次失败、2 次重试、4 次重试；协调故障占 MAST 轨迹的 36.9%', '8.5', MUTE));
    shell(host, '重试级联（Retry Cascade）', '重试风暴与熔断器', svg,
      'MAST 的 1642 条多智能体执行轨迹中，协调故障占 36.94%。重试风暴（Retry Storm）是典型级联：支付失败触发订单重试，每次订单重试又触发库存重试，库存服务几秒内便承受 10 倍负载。在层与层之间设置熔断器（Circuit Breaker），能将不断放大的传播链限制为一次局部故障。');
  }

  // ── a5-bench-gap: 同一前沿模型（Frontier model）的两根柱，Verified 上较高，
  //    Pro 上较低；虚线使差距可见 ──
  function benchGap(host) {
    var W = 520, H = 260, period = 7;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var base = 200;
    svg.appendChild(svgEl('line', { x1: 90, y1: base, x2: 430, y2: base, stroke: MUTE, 'stroke-width': '1.4' }));
    var vh = 127, ph = 39, vx = 150, px = 320, cw = 70;
    svg.appendChild(svgEl('rect', { x: vx, y: base - vh, width: cw, height: vh, fill: 'none', stroke: SOFT, 'stroke-width': '1' }));
    var vc = svgEl('rect', { x: vx, y: base, width: cw, height: 0, fill: BP });
    grow(vc, 'height', 0, vh, 0.05, 0.22, period);
    grow(vc, 'y', base, base - vh, 0.05, 0.22, period);
    svg.appendChild(vc);
    var vl = txt(vx + cw / 2, base - vh - 10, '70-80%', '10', BP);
    appear(vl, 0.24, 0.06, 0.95, 0.04, period);
    svg.appendChild(vl);
    svg.appendChild(svgEl('rect', { x: px, y: base - ph, width: cw, height: ph, fill: 'none', stroke: SOFT, 'stroke-width': '1' }));
    var pc = svgEl('rect', { x: px, y: base, width: cw, height: 0, fill: WARN });
    grow(pc, 'height', 0, ph, 0.35, 0.18, period);
    grow(pc, 'y', base, base - ph, 0.35, 0.18, period);
    svg.appendChild(pc);
    var pl = txt(px + cw / 2, base - ph - 10, '~23%', '10', WARN);
    appear(pl, 0.5, 0.06, 0.95, 0.04, period);
    svg.appendChild(pl);
    svg.appendChild(txt(vx + cw / 2, base + 16, 'SWE-bench Verified', '8', MUTE));
    svg.appendChild(txt(px + cw / 2, base + 16, 'SWE-bench Pro', '8', MUTE));
    svg.appendChild(txt(px + cw / 2, base + 29, '需修改 10 行以上的任务', '7', MUTE));
    var dash = svgEl('line', { x1: vx + cw, y1: base - vh, x2: px + cw, y2: base - vh, stroke: BP, 'stroke-width': '1.2', 'stroke-dasharray': '4 3' });
    appear(dash, 0.56, 0.06, 0.95, 0.04, period);
    svg.appendChild(dash);
    var gap = svgEl('line', { x1: px + cw + 12, y1: base - vh, x2: px + cw + 12, y2: base - ph, stroke: WARN, 'stroke-width': '1.4' });
    appear(gap, 0.62, 0.06, 0.95, 0.04, period);
    svg.appendChild(gap);
    var gl = txt(px + cw + 20, base - (vh + ph) / 2, '泛化差距', '8', WARN, 'start');
    appear(gl, 0.68, 0.06, 0.95, 0.04, period);
    svg.appendChild(gl);
    svg.appendChild(txt(W / 2, H - 12, '同一模型，两种任务分布；通过 Verified 不等于证明泛化能力', '8.5', MUTE));
    shell(host, '基准差距（Benchmark Gap）', 'Verified 与 Pro', svg,
      '前沿模型在 SWE-bench Verified 上得分超过 70%，在 SWE-bench Pro 上约为 23%；后者包含来自 41 个仓库的 1865 个问题，要求修改 10 行以上。Verified 接近饱和，部分受到数据污染（Data Contamination），且一批只改一两行的简单任务拉高了分数。Pro 提供未受污染的现实检验：解读任何榜单声明，都应同时对照这两组结果。');
  }

  // ── a5-orchestrator-scale: 随查询复杂度增加，主智能体依次生成 1、3、10+ 个子智能体，
  //    词元（Token）计量器展示相应开销 ──
  function orchestratorScale(host) {
    var W = 520, H = 260, period = 9;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var cx = 260, cy = 110, i;
    var win = [[0.02, 0.3], [0.35, 0.63], [0.68, 0.96]];
    var phases = ['简单查询：1 个子智能体', '中等查询：3 个子智能体', '复杂研究：10 个以上子智能体'];
    function dot(ang, r, w, stag) {
      var x = cx + r * Math.cos(ang), y = cy + r * Math.sin(ang);
      var d = svgEl('circle', { cx: x.toFixed(1), cy: y.toFixed(1), r: '6', fill: SURF, stroke: BP, 'stroke-width': '1.8' });
      appear(d, w[0] + stag, 0.04, w[1], 0.025, period);
      d.appendChild(anim('r', '5.7;5.7;6.3;6;6', '0;' + f2(w[0] + stag) + ';' + f2(w[0] + stag + 0.05) + ';' + f2(w[0] + stag + 0.09) + ';1', period));
      svg.appendChild(d);
    }
    dot(-Math.PI / 2, 55, win[0], 0);
    for (i = 0; i < 3; i++) dot(-Math.PI / 2 + i * 2.09, 68, win[1], i * 0.025);
    for (i = 0; i < 8; i++) dot(i * Math.PI / 4, 88, win[2], i * 0.02);
    svg.appendChild(svgEl('circle', { cx: cx, cy: cy, r: '26', fill: SURF, stroke: BP, 'stroke-width': '2.5' }));
    svg.appendChild(txt(cx, cy - 2, '主智能体', '9', BP));
    svg.appendChild(txt(cx, cy + 10, '规划与综合', '5.8', MUTE));
    for (i = 0; i < 3; i++) {
      var pt = txt(cx, 226, phases[i], '9', i === 2 ? WARN : BP);
      appear(pt, win[i][0], 0.05, win[i][1], 0.025, period);
      svg.appendChild(pt);
    }
    svg.appendChild(svgEl('rect', { x: 400, y: 46, width: 80, height: 10, fill: SURF, stroke: SOFT, 'stroke-width': '1' }));
    var tk = svgEl('rect', { x: 400, y: 46, width: 5, height: 10, fill: WARN });
    tk.appendChild(anim('width', '5;5;14;14;32;32;80;80', '0;0.05;0.28;0.38;0.6;0.7;0.94;1', period));
    svg.appendChild(tk);
    svg.appendChild(txt(440, 70, '15 倍词元', '8', WARN));
    svg.appendChild(txt(W / 2, H - 12, '按查询复杂度分配投入，每个子智能体获得独立上下文窗口', '8.5', MUTE));
    shell(host, '编排规模（Orchestrator Scale）', '按查询需要创建子智能体', svg,
      'Anthropic 的 Research 系统按查询复杂度分配投入：简单查询由一个智能体进行少量工具调用，中等查询使用三个，复杂研究使用十个或更多并行子智能体（Subagent）。它比单智能体 Opus 4 提升 90.2%，仅词元用量就能解释 BrowseComp 结果方差的 80%；代价是每次查询约 15 倍的词元消耗，以及为长时间运行的智能体采用彩虹部署（Rainbow Deployment）。');
  }

  LF.register({
    'a5-scaffold-delta': scaffoldDelta,
    'a5-guard-sieve': guardSieve,
    'a5-rsp-ladder': rspLadder,
    'a5-tracked-vs-research': trackedVsResearch,
    'a5-horizon-fit': horizonFit,
    'a5-four-risks': fourRisks,
    'a5-primitive-radar': primitiveRadar,
    'a5-og-narrator': ogNarrator,
    'a5-memory-reflection': memoryReflection,
    'a5-retry-cascade': retryCascade,
    'a5-bench-gap': benchGap,
    'a5-orchestrator-scale': orchestratorScale
  });
})();
