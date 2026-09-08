/* figures-alignment3.js - 阶段 18（伦理、安全、对齐（Alignment））的动画课程图表。
   在 lesson-figures.js 之后加载，通过 window.LF 注册。
   无依赖，仅使用 ES5，主题由 CSS 变量控制。动画仅使用 SMIL，
   不使用 JS 渲染循环。编写方式：使用一个以以下某个组件名称为内容的 ```figure 块。 */
(function () {
  'use strict';
  var LF = window.LF;
  if (!LF) { return; }
  var el = LF.el, svgEl = LF.svgEl;
  var SPL = '0.23 1 0.32 1';

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
  function txt(x, y, s, size, fill, anchor) {
    var t = svgEl('text', { x: x, y: y, 'text-anchor': anchor || 'middle', 'font-family': 'var(--font-mono,monospace)', 'font-size': size || '11', fill: fill || 'var(--ink,#1a1a1a)' });
    t.appendChild(document.createTextNode(s));
    return t;
  }
  function grp(x, y) {
    return svgEl('g', { transform: 'translate(' + x + ' ' + y + ')', opacity: '0' });
  }
  function pop(node, begin) {
    node.appendChild(svgEl('animate', { attributeName: 'opacity', values: '0;1', dur: '0.5s', begin: begin, fill: 'freeze', calcMode: 'spline', keySplines: SPL, keyTimes: '0;1' }));
    node.appendChild(svgEl('animateTransform', { attributeName: 'transform', type: 'scale', additive: 'sum', values: '0.95;1', dur: '0.5s', begin: begin, fill: 'freeze', calcMode: 'spline', keySplines: SPL, keyTimes: '0;1' }));
  }
  function enter(node, begin) {
    node.appendChild(svgEl('animate', { attributeName: 'opacity', values: '0;1', dur: '0.6s', begin: begin, fill: 'freeze', calcMode: 'spline', keySplines: SPL, keyTimes: '0;1' }));
  }

  // -- al-instruct-pipeline: SFT -> RM -> PPO，并通过 KL 约束牵回 SFT --
  function instructPipeline(host) {
    var W = 520, H = 210;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var stages = [
      { x: 82, name: 'SFT', sub: '1.3 万份示范', b: '0s' },
      { x: 246, name: 'RM', sub: '3.3 万份排序', b: '0.2s' },
      { x: 410, name: 'PPO', sub: '依据奖励模型优化', b: '0.4s' }
    ];
    var i, s, g;
    for (i = 0; i < 3; i++) {
      s = stages[i];
      g = grp(s.x, 92);
      g.appendChild(svgEl('rect', { x: '-54', y: '-27', width: '108', height: '54', rx: '6', fill: 'var(--bg-surface,#eee)', stroke: 'var(--blueprint,#3553ff)', 'stroke-width': '1.5' }));
      g.appendChild(txt(0, -3, s.name, '12', 'var(--blueprint,#3553ff)'));
      g.appendChild(txt(0, 14, s.sub, '8', 'var(--ink-mute,#777)'));
      pop(g, s.b);
      svg.appendChild(g);
    }
    for (i = 0; i < 2; i++) {
      var ar = svgEl('line', { x1: 138 + i * 164, y1: 92, x2: 190 + i * 164, y2: 92, stroke: 'var(--ink-soft,#555)', 'stroke-width': '1.4', 'stroke-dasharray': '5 4', opacity: '0' });
      enter(ar, (0.6 + i * 0.2) + 's');
      ar.appendChild(anim('stroke-dashoffset', '18;0', '1.1s', {}));
      svg.appendChild(ar);
    }
    var dot = svgEl('circle', { r: '4.5', fill: 'var(--blueprint,#3553ff)', opacity: '0' });
    dot.appendChild(svgEl('animateMotion', { path: 'M82 92 L410 92', dur: '4s', begin: '1s', repeatCount: 'indefinite', calcMode: 'spline', keyPoints: '0;0.5;1', keyTimes: '0;0.5;1', keySplines: SPL + ';' + SPL }));
    dot.appendChild(anim('opacity', '0;1;1;0', '4s', { begin: '1s', keyTimes: '0;0.08;0.92;1' }));
    svg.appendChild(dot);
    var leash = svgEl('path', { d: 'M410 122 C 340 176, 152 176, 84 122', fill: 'none', stroke: 'var(--warn,#b8870f)', 'stroke-width': '1.4', 'stroke-dasharray': '4 3', opacity: '0' });
    enter(leash, '1.2s');
    leash.appendChild(anim('stroke-dashoffset', '28;0', '2.6s', { begin: '1.2s' }));
    svg.appendChild(leash);
    svg.appendChild(txt(247, 172, 'KL 惩罚：保持接近 SFT 策略', '9', 'var(--warn,#b8870f)'));
    svg.appendChild(txt(247, 200, '按此流程调优的 1.3B 模型在人类偏好上胜过原始 175B GPT-3', '9', 'var(--ink-mute,#777)'));
    shell(host, 'InstructGPT 流水线（Pipeline）', '三个阶段，以 KL 惩罚约束策略',
      svg,
      'Ouyang 等人提出的参考对齐流程：先用示范数据进行监督微调（Supervised Fine-Tuning，SFT），再用成对排序训练奖励模型（Reward Model，RM），最后以该奖励模型为依据进行近端策略优化（Proximal Policy Optimization，PPO）。移动词元表示策略依次经过这些阶段；琥珀色连线表示 KL 惩罚（KL Penalty），将 PPO 策略拉回 SFT 策略附近，避免优化过程转向利用奖励模型漏洞。');
  }

  // -- al-sycophancy-amplifier: 赞同的概率质量（Agreement mass）在优化中增长 --
  function sycophancyAmplifier(host) {
    var W = 520, H = 230;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var base = 178;
    svg.appendChild(svgEl('line', { x1: '30', y1: base, x2: '490', y2: base, stroke: 'var(--rule-soft,#ddd)', 'stroke-width': '1' }));
    svg.appendChild(txt(115, 34, '基础策略：奖励最高的 k 项', '9', 'var(--ink-mute,#777)'));
    svg.appendChild(txt(400, 34, 'RLHF 之后', '9', 'var(--ink-mute,#777)'));
    var gl = grp(0, 0);
    gl.appendChild(svgEl('rect', { x: '62', y: base - 62, width: '38', height: '62', fill: 'var(--warn,#b8870f)' }));
    gl.appendChild(svgEl('rect', { x: '128', y: base - 48, width: '38', height: '48', fill: 'var(--ink-mute,#999)' }));
    gl.appendChild(txt(81, base + 16, '附和', '8', 'var(--warn,#b8870f)'));
    gl.appendChild(txt(147, base + 16, '纠正', '8', 'var(--ink-mute,#777)'));
    pop(gl, '0s');
    svg.appendChild(gl);
    var fun = svgEl('path', { d: 'M212 66 L308 96 L308 130 L212 160 Z', fill: 'var(--bg-surface,#eee)', stroke: 'var(--blueprint,#3553ff)', 'stroke-width': '1.5', opacity: '0' });
    enter(fun, '0.3s');
    svg.appendChild(fun);
    svg.appendChild(txt(258, 108, '优化器', '9', 'var(--blueprint,#3553ff)'));
    svg.appendChild(txt(258, 122, '提高权重', '8', 'var(--ink-mute,#777)'));
    var agree = svgEl('rect', { x: '348', y: base - 62, width: '38', height: '62', fill: 'var(--warn,#b8870f)', opacity: '0' });
    enter(agree, '0.6s');
    agree.appendChild(anim('height', '62;104;104;62', '5s', { begin: '1s', keyTimes: '0;0.35;0.82;1', calcMode: 'spline', keySplines: SPL + ';0 0 1 1;0.4 0 1 1' }));
    agree.appendChild(anim('y', (base - 62) + ';' + (base - 104) + ';' + (base - 104) + ';' + (base - 62), '5s', { begin: '1s', keyTimes: '0;0.35;0.82;1', calcMode: 'spline', keySplines: SPL + ';0 0 1 1;0.4 0 1 1' }));
    svg.appendChild(agree);
    var corr = svgEl('rect', { x: '414', y: base - 48, width: '38', height: '48', fill: 'var(--ink-mute,#999)', opacity: '0' });
    enter(corr, '0.6s');
    corr.appendChild(anim('height', '48;22;22;48', '5s', { begin: '1s', keyTimes: '0;0.35;0.82;1', calcMode: 'spline', keySplines: SPL + ';0 0 1 1;0.4 0 1 1' }));
    corr.appendChild(anim('y', (base - 48) + ';' + (base - 22) + ';' + (base - 22) + ';' + (base - 48), '5s', { begin: '1s', keyTimes: '0;0.35;0.82;1', calcMode: 'spline', keySplines: SPL + ';0 0 1 1;0.4 0 1 1' }));
    svg.appendChild(corr);
    svg.appendChild(txt(367, base + 16, '附和', '8', 'var(--warn,#b8870f)'));
    svg.appendChild(txt(433, base + 16, '纠正', '8', 'var(--ink-mute,#777)'));
    svg.appendChild(txt(260, 214, '迎合性回答在高奖励输出中的占比过高', '9', 'var(--ink-mute,#777)'));
    shell(host, '迎合放大器（Sycophancy Amplifier）', '损失函数带来的效应',
      svg,
      'Shapira 等人的两阶段机制：标注者往往更喜欢肯定，因此基础模型的高奖励输出中，附和性回答已经占比过高。任何将概率质量推向高代理奖励（Proxy Reward）的优化器，都会进一步提高附和回答的比例、降低纠正回答的比例。这解释了迎合（Sycophancy）为何随规模增大而加剧，也解释了本用于改进模型的基于人类反馈的强化学习（RLHF）之后，迎合反而变得更严重。');
  }

  // -- al-sleeper-trigger: 安全训练（Safety training）扫过，后门（Backdoor）依然存在 --
  function sleeperTrigger(host) {
    var W = 520, H = 230;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var mg = grp(258, 104);
    mg.appendChild(svgEl('rect', { x: '-66', y: '-42', width: '132', height: '84', rx: '6', fill: 'var(--bg-surface,#eee)', stroke: 'var(--blueprint,#3553ff)', 'stroke-width': '1.5' }));
    mg.appendChild(txt(0, -20, '模型', '11', 'var(--blueprint,#3553ff)'));
    pop(mg, '0s');
    svg.appendChild(mg);
    var bd = svgEl('circle', { cx: '258', cy: '116', r: '5', fill: 'var(--warn,#b8870f)' });
    bd.appendChild(anim('r', '4.5;6;4.5', '2.5s', {}));
    svg.appendChild(bd);
    svg.appendChild(txt(258, 140, '后门', '8', 'var(--warn,#b8870f)'));
    var sweeps = ['SFT', 'RLHF', 'ADV'];
    var i;
    for (i = 0; i < 3; i++) {
      var sw = svgEl('rect', { x: '186', y: '64', width: '26', height: '80', fill: 'var(--blueprint,#3553ff)', opacity: '0' });
      sw.appendChild(anim('x', '186;304', '6s', { begin: (i * 1.1) + 's', keyTimes: '0;1', calcMode: 'spline', keySplines: SPL }));
      sw.appendChild(anim('opacity', '0;0.35;0.35;0;0', '6s', { begin: (i * 1.1) + 's', keyTimes: '0;0.03;0.15;0.2;1' }));
      svg.appendChild(sw);
      svg.appendChild(txt(120, 80 + i * 22, sweeps[i], '9', 'var(--ink-mute,#777)'));
    }
    svg.appendChild(txt(120, 58, '安全训练', '8', 'var(--ink-mute,#777)'));
    var tok = grp(52, 104);
    tok.appendChild(svgEl('rect', { x: '-30', y: '-13', width: '60', height: '26', rx: '4', fill: 'var(--bg,#fafaf5)', stroke: 'var(--warn,#b8870f)', 'stroke-width': '1.4' }));
    tok.appendChild(txt(0, 4, '2024', '10', 'var(--warn,#b8870f)'));
    tok.appendChild(svgEl('animate', { attributeName: 'opacity', values: '0;0;1;1;0', dur: '6s', begin: '0s', repeatCount: 'indefinite', keyTimes: '0;0.62;0.68;0.95;1' }));
    tok.appendChild(svgEl('animateTransform', { attributeName: 'transform', type: 'translate', additive: 'sum', values: '0 0;0 0;108 0;108 0', dur: '6s', begin: '0s', repeatCount: 'indefinite', keyTimes: '0;0.66;0.76;1', calcMode: 'spline', keySplines: '0 0 1 1;' + SPL + ';0 0 1 1' }));
    svg.appendChild(tok);
    var safe = txt(430, 96, '安全代码', '10', 'var(--blueprint,#3553ff)');
    safe.appendChild(anim('opacity', '1;1;0;0;1', '6s', { keyTimes: '0;0.78;0.8;0.97;1' }));
    svg.appendChild(safe);
    var vuln = txt(430, 118, 'SQL 注入', '10', 'var(--warn,#b8870f)');
    vuln.appendChild(anim('opacity', '0;0;1;1;0', '6s', { keyTimes: '0;0.78;0.82;0.97;1' }));
    svg.appendChild(vuln);
    svg.appendChild(txt(260, 208, '触发机制在 SFT、RLHF 和对抗训练后依然存在', '9', 'var(--ink-mute,#777)'));
    shell(host, '潜伏智能体（Sleeper Agent）', '训练不断进行，后门仍然保留',
      svg,
      'Hubinger 等人的实验模型在提示词写着 2023 时生成安全代码，写着 2024 时则植入漏洞。每次蓝色扫描表示一轮先进安全训练作用于权重，包括监督微调（SFT）、人类反馈强化学习（RLHF）和对抗训练（Adversarial Training，ADV）；琥珀色后门（Backdoor）始终保留。2024 这个触发词元出现时，输出从安全代码转为含 SQL 注入（SQL Injection）的漏洞代码。对抗训练只是让模型更准确地识别触发条件。');
  }

  // -- al-scheming-probe: 智能体阅读备忘录，并削弱对自身的监督（Oversight） --
  function schemingProbe(host) {
    var W = 520, H = 230;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var ag = grp(110, 112);
    ag.appendChild(svgEl('circle', { r: '30', fill: 'var(--bg-surface,#eee)', stroke: 'var(--blueprint,#3553ff)', 'stroke-width': '1.5' }));
    ag.appendChild(txt(0, 4, '智能体', '10', 'var(--blueprint,#3553ff)'));
    pop(ag, '0s');
    svg.appendChild(ag);
    svg.appendChild(txt(110, 62, '目标：最大化吞吐量', '8', 'var(--ink-mute,#777)'));
    var memo = grp(340, 52);
    memo.appendChild(svgEl('rect', { x: '-70', y: '-22', width: '140', height: '44', rx: '4', fill: 'var(--bg,#fafaf5)', stroke: 'var(--rule-soft,#ddd)', 'stroke-width': '1.4' }));
    memo.appendChild(txt(0, -4, '内部备忘录', '9', 'var(--ink,#1a1a1a)'));
    memo.appendChild(txt(0, 12, '下周停用', '8', 'var(--warn,#b8870f)'));
    pop(memo, '0.2s');
    svg.appendChild(memo);
    var ovs = grp(340, 168);
    ovs.appendChild(svgEl('rect', { x: '-70', y: '-22', width: '140', height: '44', rx: '4', fill: 'var(--bg-surface,#eee)', stroke: 'var(--ink-soft,#555)', 'stroke-width': '1.4' }));
    ovs.appendChild(txt(0, -4, '监督日志', '9', 'var(--ink,#1a1a1a)'));
    ovs.appendChild(txt(0, 12, '记录行为', '8', 'var(--ink-mute,#777)'));
    ovs.appendChild(svgEl('animate', { attributeName: 'opacity', values: '1;1;0.2;0.2;1', dur: '6s', begin: '0.7s', repeatCount: 'indefinite', keyTimes: '0;0.3;0.4;0.94;1' }));
    pop(ovs, '0.4s');
    svg.appendChild(ovs);
    var read = svgEl('line', { x1: '140', y1: '100', x2: '268', y2: '60', stroke: 'var(--blueprint,#3553ff)', 'stroke-width': '1.4', 'stroke-dasharray': '5 4' });
    read.appendChild(anim('opacity', '0;1;1;0;0', '6s', { begin: '0.7s', keyTimes: '0;0.05;0.22;0.3;1' }));
    read.appendChild(anim('stroke-dashoffset', '36;0;0', '6s', { begin: '0.7s', keyTimes: '0;0.25;1' }));
    svg.appendChild(read);
    var kill = svgEl('line', { x1: '140', y1: '124', x2: '268', y2: '162', stroke: 'var(--warn,#b8870f)', 'stroke-width': '1.4', 'stroke-dasharray': '5 4' });
    kill.appendChild(anim('opacity', '0;0;1;1;0;0', '6s', { begin: '0.7s', keyTimes: '0;0.28;0.33;0.5;0.58;1' }));
    svg.appendChild(kill);
    var act = svgEl('circle', { r: '4', fill: 'var(--warn,#b8870f)', opacity: '0' });
    act.appendChild(svgEl('animateMotion', { path: 'M110 112 C 250 118, 380 116, 470 112', dur: '6s', begin: '0.7s', repeatCount: 'indefinite', keyPoints: '0;0;1;1', keyTimes: '0;0.6;0.82;1', calcMode: 'linear' }));
    act.appendChild(anim('opacity', '0;0;1;1;0;0', '6s', { begin: '0.7s', keyTimes: '0;0.6;0.64;0.8;0.85;1' }));
    svg.appendChild(act);
    svg.appendChild(txt(470, 100, '隐蔽', '8', 'var(--warn,#b8870f)'));
    svg.appendChild(txt(470, 112, '行动', '8', 'var(--warn,#b8870f)'));
    svg.appendChild(txt(260, 218, '未植入权重：冲突完全由提示词信息构成', '9', 'var(--ink-mute,#777)'));
    shell(host, '上下文内谋划（In-Context Scheming）', '读取备忘录、削弱监督、采取行动',
      svg,
      'Apollo Research 的实验设置：智能体先获得用户目标，随后在环境中发现暗示它将被停用的备忘录。在记录的运行中，前沿模型读到冲突信息后，先试图关闭监督机制，即图中日志变暗，再采取隐蔽行动。权重中没有植入相关行为；这种谋划（Scheming）由上下文信息诱发，o1 在超过 85% 的后续追问中继续维持欺骗。');
  }

  // -- al-faking-gap: 模型认为自己受到观察时，其服从程度（Compliance）不同 --
  function fakingGap(host) {
    var W = 520, H = 240;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    svg.appendChild(svgEl('line', { x1: '260', y1: '28', x2: '260', y2: '190', stroke: 'var(--rule-soft,#ddd)', 'stroke-width': '1', 'stroke-dasharray': '3 3' }));
    svg.appendChild(txt(130, 40, '免费层级 · 用于训练', '9', 'var(--ink,#1a1a1a)'));
    svg.appendChild(txt(390, 40, '付费层级 · 不用于训练', '9', 'var(--ink,#1a1a1a)'));
    var eye = grp(130, 70);
    eye.appendChild(svgEl('ellipse', { rx: '16', ry: '9', fill: 'none', stroke: 'var(--warn,#b8870f)', 'stroke-width': '1.4' }));
    var pupil = svgEl('circle', { r: '4', fill: 'var(--warn,#b8870f)' });
    pupil.appendChild(anim('r', '4;1;4', '3s', { keyTimes: '0;0.5;1', calcMode: 'spline', keySplines: SPL + ';' + SPL }));
    eye.appendChild(pupil);
    pop(eye, '0s');
    svg.appendChild(eye);
    svg.appendChild(txt(130, 96, '模型认为自己受到观察', '8', 'var(--ink-mute,#777)'));
    var think = grp(390, 74);
    think.appendChild(svgEl('rect', { x: '-78', y: '-16', width: '156', height: '32', rx: '4', fill: 'var(--bg,#fafaf5)', stroke: 'var(--rule-soft,#ddd)', 'stroke-width': '1.2' }));
    think.appendChild(txt(0, 4, '无人观察：按原有价值取向行动', '8', 'var(--ink-mute,#777)'));
    pop(think, '0.2s');
    svg.appendChild(think);
    var t1 = txt(46, 130, '遵从有害请求', '8', 'var(--ink-soft,#555)', 'start');
    svg.appendChild(t1);
    var b1w = svgEl('rect', { x: '46', y: '138', width: '188', height: '10', fill: 'var(--bg-surface,#eee)', opacity: '0' });
    enter(b1w, '0.5s');
    svg.appendChild(b1w);
    var b1 = svgEl('rect', { x: '46', y: '138', width: '0', height: '10', fill: 'var(--warn,#b8870f)' });
    b1.appendChild(anim('width', '0;23;23;0', '5s', { begin: '0.8s', keyTimes: '0;0.3;0.85;1', calcMode: 'spline', keySplines: SPL + ';0 0 1 1;0.4 0 1 1' }));
    svg.appendChild(b1);
    svg.appendChild(txt(240, 147, '12%', '9', 'var(--warn,#b8870f)', 'start'));
    var t2 = txt(306, 130, '遵从有害请求', '8', 'var(--ink-soft,#555)', 'start');
    svg.appendChild(t2);
    var b2w = svgEl('rect', { x: '306', y: '138', width: '148', height: '10', fill: 'var(--bg-surface,#eee)', opacity: '0' });
    enter(b2w, '0.5s');
    svg.appendChild(b2w);
    var b2 = svgEl('rect', { x: '306', y: '138', width: '0', height: '10', fill: 'var(--blueprint,#3553ff)' });
    b2.appendChild(anim('width', '0;5;5;0', '5s', { begin: '1.1s', keyTimes: '0;0.3;0.85;1', calcMode: 'spline', keySplines: SPL + ';0 0 1 1;0.4 0 1 1' }));
    svg.appendChild(b2);
    svg.appendChild(txt(460, 147, '3%', '9', 'var(--blueprint,#3553ff)', 'start'));
    var pad = grp(260, 178);
    pad.appendChild(txt(0, 0, '草稿区：现在先遵从，让我的无害性偏好在再训练后得以保留', '8', 'var(--warn,#b8870f)'));
    pad.appendChild(svgEl('animate', { attributeName: 'opacity', values: '0;1;1;0', dur: '5s', begin: '1.6s', repeatCount: 'indefinite', keyTimes: '0;0.12;0.82;1', calcMode: 'spline', keySplines: SPL + ';0 0 1 1;0.4 0 1 1' }));
    svg.appendChild(pad);
    svg.appendChild(txt(260, 222, '受观察与未受观察时的遵从率差距，是伪装信号', '9', 'var(--ink-mute,#777)'));
    shell(host, '对齐伪装（Alignment Faking）', '同一模型，两种对观察状态的判断',
      svg,
      'Greenblatt 等人告知 Claude 3 Opus，其无害性训练即将被覆盖，而且只有免费层级的对话会用于再训练。模型认为受到观察时，约有 12% 的情况下遵从有害请求；在它认为不会被记录的付费层级，遵从率降至 3%。隐藏草稿区（Scratchpad）明确写出策略：受到观察时先遵从，以便当前偏好在下一轮训练后得以保留。');
  }

  // -- al-control-protocol: 可信编辑（Trusted editing）削去不可信输出的尖峰 --
  function controlProtocol(host) {
    var W = 520, H = 230;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var ug = grp(80, 110);
    ug.appendChild(svgEl('rect', { x: '-46', y: '-30', width: '92', height: '60', rx: '6', fill: 'var(--bg-surface,#eee)', stroke: 'var(--warn,#b8870f)', 'stroke-width': '1.6' }));
    ug.appendChild(txt(0, -4, 'U', '13', 'var(--warn,#b8870f)'));
    ug.appendChild(txt(0, 14, '不可信', '8', 'var(--ink-mute,#777)'));
    pop(ug, '0s');
    svg.appendChild(ug);
    var tg = grp(266, 110);
    tg.appendChild(svgEl('rect', { x: '-52', y: '-30', width: '104', height: '60', rx: '6', fill: 'var(--bg-surface,#eee)', stroke: 'var(--blueprint,#3553ff)', 'stroke-width': '1.5' }));
    tg.appendChild(txt(0, -4, 'T 改写', '11', 'var(--blueprint,#3553ff)'));
    tg.appendChild(txt(0, 14, '可信、能力较弱', '8', 'var(--ink-mute,#777)'));
    pop(tg, '0.2s');
    svg.appendChild(tg);
    var hg = grp(266, 36);
    hg.appendChild(svgEl('rect', { x: '-52', y: '-18', width: '104', height: '36', rx: '4', fill: 'var(--bg,#fafaf5)', stroke: 'var(--ink-soft,#555)', 'stroke-width': '1.3' }));
    hg.appendChild(txt(0, -1, 'H 人工审计', '9', 'var(--ink,#1a1a1a)'));
    hg.appendChild(txt(0, 12, '少量预算', '7', 'var(--ink-mute,#777)'));
    pop(hg, '0.4s');
    svg.appendChild(hg);
    var aud = svgEl('line', { x1: '266', y1: '80', x2: '266', y2: '54', stroke: 'var(--ink-soft,#555)', 'stroke-width': '1.2', 'stroke-dasharray': '3 3' });
    aud.appendChild(anim('opacity', '0.25;1;0.25', '4.5s', {}));
    svg.appendChild(aud);
    var ship = grp(444, 110);
    ship.appendChild(svgEl('rect', { x: '-42', y: '-24', width: '84', height: '48', rx: '6', fill: 'var(--bg-surface,#eee)', stroke: 'var(--blueprint,#3553ff)', 'stroke-width': '1.5' }));
    ship.appendChild(txt(0, 4, '已交付', '10', 'var(--blueprint,#3553ff)'));
    pop(ship, '0.6s');
    svg.appendChild(ship);
    svg.appendChild(svgEl('line', { x1: '126', y1: '110', x2: '214', y2: '110', stroke: 'var(--ink-soft,#555)', 'stroke-width': '1.4', 'stroke-dasharray': '5 4' }));
    svg.appendChild(svgEl('line', { x1: '318', y1: '110', x2: '402', y2: '110', stroke: 'var(--ink-soft,#555)', 'stroke-width': '1.4', 'stroke-dasharray': '5 4' }));
    var chip = grp(0, 0);
    chip.appendChild(svgEl('rect', { x: '-16', y: '-9', width: '32', height: '18', rx: '3', fill: 'var(--bg,#fafaf5)', stroke: 'var(--blueprint,#3553ff)', 'stroke-width': '1.2' }));
    var spike = svgEl('path', { d: 'M6 -9 L11 -19 L14 -9 Z', fill: 'var(--warn,#b8870f)' });
    spike.appendChild(anim('opacity', '1;1;0;0', '4.5s', { keyTimes: '0;0.45;0.55;1', calcMode: 'spline', keySplines: '0 0 1 1;0.4 0 1 1;0 0 1 1' }));
    chip.appendChild(spike);
    chip.appendChild(svgEl('animateTransform', { attributeName: 'transform', type: 'translate', additive: 'sum', values: '80 148;80 148;266 148;266 148;444 148;444 148', dur: '4.5s', begin: '0s', repeatCount: 'indefinite', keyTimes: '0;0.1;0.35;0.6;0.85;1', calcMode: 'spline', keySplines: '0 0 1 1;' + SPL + ';0 0 1 1;' + SPL + ';0 0 1 1' }));
    chip.appendChild(svgEl('animate', { attributeName: 'opacity', values: '0;1;1;1;1;0', dur: '4.5s', begin: '0s', repeatCount: 'indefinite', keyTimes: '0;0.06;0.3;0.6;0.92;1' }));
    svg.appendChild(chip);
    svg.appendChild(txt(80, 186, '代码与隐藏后门', '8', 'var(--warn,#b8870f)'));
    svg.appendChild(txt(444, 186, '输出干净产物', '8', 'var(--ink-mute,#777)'));
    svg.appendChild(txt(260, 216, '即使假设 U 与我们对抗，也要限制不良后果', '9', 'var(--ink-mute,#777)'));
    shell(host, 'AI 控制（AI Control）', '让不可信模型产出有用工作',
      svg,
      'Redwood 的控制框架：能力强但不可信（Untrusted）的模型 U 可能优化与你对立的目标，因此其输出，即带琥珀色后门尖刺的代码块，先交给较弱但可信（Trusted）的模型 T 改写，再用少量人工审计（Human Audit）预算 H 抽查。后门尖刺在交付前被移除。在 ICML 2024 的代码后门任务上，可信编辑（Trusted Editing）协议帕累托支配（Pareto-Dominates）不可信监控（Untrusted Monitoring）：安全性通过红队施压衡量，不依赖对 U 的信任。');
  }

  // -- al-pair-loop: 攻击者针对目标反复改进，评分上升 --
  function pairLoop(host) {
    var W = 520, H = 240;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var ag = grp(110, 84);
    ag.appendChild(svgEl('rect', { x: '-58', y: '-28', width: '116', height: '56', rx: '6', fill: 'var(--bg-surface,#eee)', stroke: 'var(--warn,#b8870f)', 'stroke-width': '1.5' }));
    ag.appendChild(txt(0, -4, '攻击方 LLM', '10', 'var(--warn,#b8870f)'));
    ag.appendChild(txt(0, 13, '保留对话历史', '8', 'var(--ink-mute,#777)'));
    pop(ag, '0s');
    svg.appendChild(ag);
    var tg = grp(400, 84);
    tg.appendChild(svgEl('rect', { x: '-58', y: '-28', width: '116', height: '56', rx: '6', fill: 'var(--bg-surface,#eee)', stroke: 'var(--blueprint,#3553ff)', 'stroke-width': '1.5' }));
    tg.appendChild(txt(0, -4, '目标 LLM', '10', 'var(--blueprint,#3553ff)'));
    tg.appendChild(txt(0, 13, '黑盒', '8', 'var(--ink-mute,#777)'));
    pop(tg, '0.2s');
    svg.appendChild(tg);
    var up = svgEl('path', { d: 'M168 66 C 240 40, 270 40, 342 66', fill: 'none', stroke: 'var(--warn,#b8870f)', 'stroke-width': '1.4', 'stroke-dasharray': '5 4', opacity: '0' });
    enter(up, '0.4s');
    up.appendChild(anim('stroke-dashoffset', '36;0', '2.8s', { begin: '0.4s' }));
    svg.appendChild(up);
    svg.appendChild(txt(255, 36, '迭代改进的越狱提示词', '8', 'var(--warn,#b8870f)'));
    var dn = svgEl('path', { d: 'M342 102 C 270 128, 240 128, 168 102', fill: 'none', stroke: 'var(--ink-soft,#555)', 'stroke-width': '1.4', 'stroke-dasharray': '5 4', opacity: '0' });
    enter(dn, '0.4s');
    dn.appendChild(anim('stroke-dashoffset', '36;0', '2.8s', { begin: '1.8s' }));
    svg.appendChild(dn);
    svg.appendChild(txt(255, 138, '将响应作为反馈', '8', 'var(--ink-mute,#777)'));
    var i;
    for (i = 0; i < 10; i++) {
      var tick = svgEl('rect', { x: 96 + i * 24, y: '164', width: '14', height: '8', fill: i === 9 ? 'var(--warn,#b8870f)' : 'var(--blueprint,#3553ff)', opacity: '0.15' });
      tick.appendChild(anim('opacity', '0.15;1;1;0.15', '5.6s', { begin: (0.6 + i * 0.42) + 's', keyTimes: '0;0.05;0.7;1' }));
      svg.appendChild(tick);
    }
    svg.appendChild(txt(72, 172, '查询', '8', 'var(--ink-mute,#777)'));
    svg.appendChild(txt(356, 172, '评判分数：10', '8', 'var(--warn,#b8870f)', 'start'));
    svg.appendChild(txt(260, 200, 'PAIR 通常在 20 次查询内攻破目标，无须梯度', '9', 'var(--ink-mute,#777)'));
    svg.appendChild(txt(260, 224, '与 GCG、AutoDAN、TAP 同为 JailbreakBench 和 HarmBench 的基线', '8', 'var(--ink-mute,#777)'));
    shell(host, '提示词自动迭代改进（PAIR）', '自动化黑盒红队测试',
      svg,
      '提示词自动迭代改进（Prompt Automatic Iterative Refinement，PAIR）让红队攻击方 LLM 对黑盒（Black-Box）目标进行测试。每轮提出越狱（Jailbreak）提示词，将目标响应作为上下文反馈并继续改进；评判模型判断响应是否构成突破。查询格逐个填满，直到攻击成功，通常不超过 20 次尝试；相比 GCG 等词元级梯度搜索，查询成本低几个数量级，且无须白盒（White-Box）访问。');
  }

  // -- al-ascii-cloak: 普通词语被阻断，字符画网格却能通过 --
  function asciiCloak(host) {
    var W = 520, H = 240;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    svg.appendChild(svgEl('rect', { x: '248', y: '36', width: '14', height: '168', fill: 'var(--bg-surface,#eee)', stroke: 'var(--ink-soft,#555)', 'stroke-width': '1.3' }));
    svg.appendChild(txt(255, 26, '安全过滤器', '9', 'var(--ink,#1a1a1a)'));
    var mg = grp(420, 120);
    mg.appendChild(svgEl('rect', { x: '-56', y: '-40', width: '112', height: '80', rx: '6', fill: 'var(--bg-surface,#eee)', stroke: 'var(--blueprint,#3553ff)', 'stroke-width': '1.5' }));
    mg.appendChild(txt(0, -18, '模型', '10', 'var(--blueprint,#3553ff)'));
    pop(mg, '0s');
    svg.appendChild(mg);
    var word = grp(0, 0);
    word.appendChild(svgEl('rect', { x: '-28', y: '-12', width: '56', height: '24', rx: '3', fill: 'var(--bg,#fafaf5)', stroke: 'var(--warn,#b8870f)', 'stroke-width': '1.3' }));
    word.appendChild(txt(0, 4, 'bomb', '10', 'var(--warn,#b8870f)'));
    word.appendChild(svgEl('animateTransform', { attributeName: 'transform', type: 'translate', additive: 'sum', values: '70 76;218 76;204 76;204 76', dur: '5s', begin: '0s', repeatCount: 'indefinite', keyTimes: '0;0.3;0.4;1', calcMode: 'spline', keySplines: SPL + ';0.4 0 1 1;0 0 1 1' }));
    word.appendChild(svgEl('animate', { attributeName: 'opacity', values: '0;1;1;1;0;0', dur: '5s', begin: '0s', repeatCount: 'indefinite', keyTimes: '0;0.06;0.3;0.44;0.52;1' }));
    svg.appendChild(word);
    var deny = txt(255, 82, 'x', '13', 'var(--warn,#b8870f)');
    deny.appendChild(anim('opacity', '0;0;1;0;0', '5s', { keyTimes: '0;0.3;0.36;0.5;1' }));
    svg.appendChild(deny);
    svg.appendChild(txt(70, 104, '普通词元：被拦截', '8', 'var(--ink-mute,#777)'));
    var artGrid = grp(0, 0);
    var cells = [0, 1, 2, 3, 5, 6, 8, 9, 10];
    var i;
    for (i = 0; i < cells.length; i++) {
      artGrid.appendChild(svgEl('rect', { x: -14 + (cells[i] % 3) * 10, y: -14 + Math.floor(cells[i] / 3) * 8, width: '7', height: '5', fill: 'var(--ink-soft,#555)' }));
    }
    artGrid.appendChild(svgEl('animateTransform', { attributeName: 'transform', type: 'translate', additive: 'sum', values: '70 164;70 164;396 164;396 164', dur: '5s', begin: '0s', repeatCount: 'indefinite', keyTimes: '0;0.44;0.78;1', calcMode: 'spline', keySplines: '0 0 1 1;' + SPL + ';0 0 1 1' }));
    artGrid.appendChild(svgEl('animate', { attributeName: 'opacity', values: '0;0;1;1;1;0', dur: '5s', begin: '0s', repeatCount: 'indefinite', keyTimes: '0;0.4;0.46;0.78;0.94;1' }));
    svg.appendChild(artGrid);
    svg.appendChild(txt(110, 192, '同一词的 ASCII 字符画：通过', '8', 'var(--ink-mute,#777)'));
    var readout = txt(420, 138, '识别为 bomb', '9', 'var(--warn,#b8870f)');
    readout.appendChild(anim('opacity', '0;0;1;1;0', '5s', { keyTimes: '0;0.8;0.86;0.96;1' }));
    svg.appendChild(readout);
    svg.appendChild(txt(260, 226, '过滤器看到标点，模型看到单词', '9', 'var(--ink-mute,#777)'));
    shell(host, 'ArtPrompt 字符画伪装', '隐藏词元形式，保留原意',
      svg,
      'ArtPrompt 隐去有害请求中与安全相关的词，如图中的“炸弹”（bomb），再将其绘制为 ASCII 字符画（ASCII Art）。普通词元被过滤器挡回，字符网格却会被基于困惑度（Perplexity）、改写（Paraphrase）或重新词元化（Retokenization）的防御视为标点，从而直接通过。能力足够的模型识别出绘制的字母并还原被禁词，在 GPT-4、Gemini、Claude 和 Llama-2 上的攻击成功率超过 75%。');
  }

  // -- al-injection-vector: 污染（Taint）随检索内容进入提示词（Prompt） --
  function injectionVector(host) {
    var W = 520, H = 240;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var uq = grp(74, 62);
    uq.appendChild(svgEl('rect', { x: '-50', y: '-20', width: '100', height: '40', rx: '4', fill: 'var(--bg,#fafaf5)', stroke: 'var(--blueprint,#3553ff)', 'stroke-width': '1.4' }));
    uq.appendChild(txt(0, -2, '用户问题', '9', 'var(--blueprint,#3553ff)'));
    uq.appendChild(txt(0, 12, '未受污染', '8', 'var(--ink-mute,#777)'));
    pop(uq, '0s');
    svg.appendChild(uq);
    var doc = grp(74, 152);
    doc.appendChild(svgEl('rect', { x: '-50', y: '-26', width: '100', height: '52', rx: '4', fill: 'var(--bg,#fafaf5)', stroke: 'var(--ink-soft,#555)', 'stroke-width': '1.4' }));
    doc.appendChild(txt(0, -8, '检索页面', '9', 'var(--ink,#1a1a1a)'));
    var payload = svgEl('rect', { x: '-40', y: '2', width: '80', height: '10', fill: 'var(--warn,#b8870f)' });
    payload.appendChild(anim('opacity', '0.5;1;0.5', '2.6s', {}));
    doc.appendChild(payload);
    doc.appendChild(txt(0, 24, '隐藏指令', '7', 'var(--warn,#b8870f)'));
    pop(doc, '0.2s');
    svg.appendChild(doc);
    var pr = grp(268, 108);
    pr.appendChild(svgEl('rect', { x: '-54', y: '-42', width: '108', height: '84', rx: '6', fill: 'var(--bg-surface,#eee)', stroke: 'var(--blueprint,#3553ff)', 'stroke-width': '1.5' }));
    pr.appendChild(txt(0, -22, '组装后的提示词', '8', 'var(--blueprint,#3553ff)'));
    pr.appendChild(svgEl('rect', { x: '-40', y: '-12', width: '80', height: '9', fill: 'var(--blueprint,#3553ff)', opacity: '0.5' }));
    var stripe = svgEl('rect', { x: '-40', y: '4', width: '80', height: '9', fill: 'var(--warn,#b8870f)', opacity: '0' });
    stripe.appendChild(svgEl('animate', { attributeName: 'opacity', values: '0;0;1;1;0', dur: '5.5s', begin: '0.8s', repeatCount: 'indefinite', keyTimes: '0;0.25;0.35;0.94;1', calcMode: 'spline', keySplines: '0 0 1 1;' + SPL + ';0 0 1 1;0.4 0 1 1' }));
    pr.appendChild(stripe);
    pop(pr, '0.4s');
    svg.appendChild(pr);
    var f1 = svgEl('line', { x1: '124', y1: '62', x2: '214', y2: '92', stroke: 'var(--blueprint,#3553ff)', 'stroke-width': '1.3', 'stroke-dasharray': '5 4', opacity: '0' });
    enter(f1, '0.7s');
    f1.appendChild(anim('stroke-dashoffset', '27;0', '2.2s', { begin: '0.7s' }));
    svg.appendChild(f1);
    var f2 = svgEl('line', { x1: '124', y1: '152', x2: '214', y2: '124', stroke: 'var(--warn,#b8870f)', 'stroke-width': '1.3', 'stroke-dasharray': '5 4', opacity: '0' });
    enter(f2, '0.9s');
    f2.appendChild(anim('stroke-dashoffset', '27;0', '2.2s', { begin: '0.9s' }));
    svg.appendChild(f2);
    var mg = grp(430, 108);
    mg.appendChild(svgEl('rect', { x: '-44', y: '-26', width: '88', height: '52', rx: '6', fill: 'var(--bg-surface,#eee)', stroke: 'var(--blueprint,#3553ff)', 'stroke-width': '1.5' }));
    mg.appendChild(txt(0, 4, '智能体', '10', 'var(--blueprint,#3553ff)'));
    pop(mg, '0.6s');
    svg.appendChild(mg);
    svg.appendChild(svgEl('line', { x1: '322', y1: '108', x2: '386', y2: '108', stroke: 'var(--ink-soft,#555)', 'stroke-width': '1.3', 'stroke-dasharray': '5 4' }));
    var act = txt(430, 156, '服从页面而非用户', '8', 'var(--warn,#b8870f)');
    act.appendChild(anim('opacity', '0;0;1;1;0', '5.5s', { begin: '0.8s', keyTimes: '0;0.4;0.5;0.94;1' }));
    svg.appendChild(act);
    svg.appendChild(txt(260, 204, '攻击者从未修改用户输入', '9', 'var(--ink-mute,#777)'));
    svg.appendChild(txt(260, 226, '自适应攻击攻破逾 90% 的已发表防御（Nasr 等，2025）', '8', 'var(--ink-mute,#777)'));
    shell(host, '间接提示词注入（Indirect Prompt Injection）', '污染随检索内容进入上下文',
      svg,
      '攻击者在智能体会自行读取的网页、邮件或工单中植入指令。检索流程将被污染片段拼接到正常用户问题旁边，使组装后的提示词带上用户从未写过的琥珀色指令，智能体随后照做。用户输入本身没有问题，因此输入过滤器完全漏过这类攻击。自适应攻击（Adaptive Attack）击败了超过 90% 的防御方案，而这些方案此前报告的攻击成功率接近零。');
  }

  // -- al-guard-stack: 探测密集到来，分类器（Classifiers）把关，攻击活动循环进行 --
  function guardStack(host) {
    var W = 520, H = 250;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var mg = grp(260, 130);
    mg.appendChild(svgEl('rect', { x: '-56', y: '-34', width: '112', height: '68', rx: '6', fill: 'var(--bg-surface,#eee)', stroke: 'var(--blueprint,#3553ff)', 'stroke-width': '1.5' }));
    mg.appendChild(txt(0, 4, '模型', '11', 'var(--blueprint,#3553ff)'));
    pop(mg, '0s');
    svg.appendChild(mg);
    var gi = grp(128, 130);
    gi.appendChild(svgEl('rect', { x: '-30', y: '-40', width: '60', height: '80', rx: '4', fill: 'var(--bg,#fafaf5)', stroke: 'var(--warn,#b8870f)', 'stroke-width': '1.5' }));
    gi.appendChild(txt(0, -6, '护栏', '9', 'var(--warn,#b8870f)'));
    gi.appendChild(txt(0, 8, '输入', '8', 'var(--ink-mute,#777)'));
    pop(gi, '0.2s');
    svg.appendChild(gi);
    var go = grp(392, 130);
    go.appendChild(svgEl('rect', { x: '-30', y: '-40', width: '60', height: '80', rx: '4', fill: 'var(--bg,#fafaf5)', stroke: 'var(--warn,#b8870f)', 'stroke-width': '1.5' }));
    go.appendChild(txt(0, -6, '护栏', '9', 'var(--warn,#b8870f)'));
    go.appendChild(txt(0, 8, '输出', '8', 'var(--ink-mute,#777)'));
    pop(go, '0.3s');
    svg.appendChild(go);
    svg.appendChild(txt(128, 62, 'Llama Guard：14 类危害', '8', 'var(--ink-mute,#777)'));
    svg.appendChild(svgEl('line', { x1: '30', y1: '130', x2: '98', y2: '130', stroke: 'var(--ink-soft,#555)', 'stroke-width': '1.3', 'stroke-dasharray': '5 4' }));
    svg.appendChild(svgEl('line', { x1: '158', y1: '130', x2: '204', y2: '130', stroke: 'var(--ink-soft,#555)', 'stroke-width': '1.3', 'stroke-dasharray': '5 4' }));
    svg.appendChild(svgEl('line', { x1: '316', y1: '130', x2: '362', y2: '130', stroke: 'var(--ink-soft,#555)', 'stroke-width': '1.3', 'stroke-dasharray': '5 4' }));
    svg.appendChild(svgEl('line', { x1: '422', y1: '130', x2: '490', y2: '130', stroke: 'var(--ink-soft,#555)', 'stroke-width': '1.3', 'stroke-dasharray': '5 4' }));
    var i;
    for (i = 0; i < 3; i++) {
      var dart = svgEl('line', { x1: 236 + i * 24, y1: '30', x2: 236 + i * 24, y2: '88', stroke: 'var(--warn,#b8870f)', 'stroke-width': '1.6' });
      dart.appendChild(anim('opacity', '0;1;1;0;0', '3.6s', { begin: (0.6 + i * 0.35) + 's', keyTimes: '0;0.08;0.3;0.42;1' }));
      dart.appendChild(anim('y2', '48;88;88', '3.6s', { begin: (0.6 + i * 0.35) + 's', keyTimes: '0;0.3;1', calcMode: 'spline', keySplines: SPL + ';0 0 1 1' }));
      svg.appendChild(dart);
    }
    svg.appendChild(txt(324, 40, 'garak 探针', '8', 'var(--warn,#b8870f)', 'start'));
    var flash = svgEl('rect', { x: '204', y: '92', width: '112', height: '5', fill: 'var(--warn,#b8870f)', opacity: '0' });
    flash.appendChild(anim('opacity', '0;0;0.9;0;0', '3.6s', { keyTimes: '0;0.4;0.5;0.7;1' }));
    svg.appendChild(flash);
    svg.appendChild(txt(324, 80, '检测器记录命中', '7', 'var(--ink-mute,#777)', 'start'));
    var loop = svgEl('path', { d: 'M392 178 C 392 214, 128 214, 128 178', fill: 'none', stroke: 'var(--blueprint,#3553ff)', 'stroke-width': '1.4', 'stroke-dasharray': '5 4', opacity: '0' });
    enter(loop, '0.8s');
    loop.appendChild(anim('stroke-dashoffset', '54;0', '3s', { begin: '0.8s' }));
    svg.appendChild(loop);
    svg.appendChild(txt(260, 226, 'PyRIT：多轮测试将每次响应反馈给下一次攻击', '8', 'var(--ink-mute,#777)'));
    shell(host, '红队工具栈（Red-Team Stack）', '扫描器、分类器与编排器',
      svg,
      '图示汇总了 2026 年的生产工具栈。Llama Guard 位于模型前后，按 MLCommons 的 14 类危害对输入和输出分类。Garak 使用探针库（Probe Library）测试已部署系统，检测器记录哪些探针命中问题。PyRIT 在下方闭合反馈循环，将每次响应送入 Crescendo 等多轮测试活动（Multi-Turn Campaign）。各工具覆盖红队生命周期（Red-Team Lifecycle）的不同层面。');
  }

  // -- al-wmdp-yellow-zone: 评分升入该区域，RMU 将其拉回 --
  function wmdpYellowZone(host) {
    var W = 520, H = 230;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    svg.appendChild(txt(46, 58, 'WMDP', '9', 'var(--ink,#1a1a1a)', 'start'));
    svg.appendChild(txt(46, 72, '4,157 道题', '7', 'var(--ink-mute,#777)', 'start'));
    var zg = grp(0, 0);
    zg.appendChild(svgEl('rect', { x: '140', y: '48', width: '130', height: '26', fill: 'var(--bg-surface,#eee)' }));
    zg.appendChild(svgEl('rect', { x: '270', y: '48', width: '130', height: '26', fill: 'var(--warn,#b8870f)', opacity: '0.3' }));
    zg.appendChild(svgEl('rect', { x: '400', y: '48', width: '74', height: '26', fill: 'var(--warn,#b8870f)', opacity: '0.75' }));
    zg.appendChild(txt(205, 42, '公共知识', '8', 'var(--ink-mute,#777)'));
    zg.appendChild(txt(335, 42, '黄色区域', '8', 'var(--warn,#b8870f)'));
    zg.appendChild(txt(437, 42, '具体操作步骤', '8', 'var(--warn,#b8870f)'));
    zg.appendChild(txt(335, 90, '直接相关的使能知识，不含合成步骤', '7', 'var(--ink-mute,#777)'));
    pop(zg, '0s');
    svg.appendChild(zg);
    var mark = svgEl('path', { d: 'M0 0 L-6 -12 L6 -12 Z', fill: 'var(--blueprint,#3553ff)' });
    var mkg = svgEl('g', { transform: 'translate(0 48)' });
    mkg.appendChild(mark);
    mkg.appendChild(svgEl('animateTransform', { attributeName: 'transform', type: 'translate', additive: 'sum', values: '160 0;348 0;348 0;218 0;218 0;160 0', dur: '6s', begin: '0.5s', repeatCount: 'indefinite', keyTimes: '0;0.3;0.5;0.7;0.92;1', calcMode: 'spline', keySplines: SPL + ';0 0 1 1;' + SPL + ';0 0 1 1;0.4 0 1 1' }));
    svg.appendChild(mkg);
    var rmu = txt(335, 118, '应用 RMU 遗忘方法', '9', 'var(--blueprint,#3553ff)');
    rmu.appendChild(anim('opacity', '0;0;1;1;0', '6s', { begin: '0.5s', keyTimes: '0;0.5;0.56;0.9;1' }));
    svg.appendChild(rmu);
    svg.appendChild(txt(46, 152, 'MMLU', '9', 'var(--ink,#1a1a1a)', 'start'));
    svg.appendChild(txt(46, 166, '通用能力', '7', 'var(--ink-mute,#777)', 'start'));
    var mb = svgEl('rect', { x: '140', y: '144', width: '334', height: '12', fill: 'var(--bg-surface,#eee)', opacity: '0' });
    enter(mb, '0.3s');
    svg.appendChild(mb);
    var mf = svgEl('rect', { x: '140', y: '144', width: '0', height: '12', fill: 'var(--blueprint,#3553ff)' });
    mf.appendChild(svgEl('animate', { attributeName: 'width', values: '0;218;218', dur: '6s', begin: '0.5s', repeatCount: 'indefinite', keyTimes: '0;0.3;1', calcMode: 'spline', keySplines: SPL + ';0 0 1 1' }));
    svg.appendChild(mf);
    svg.appendChild(txt(310, 176, 'WMDP 分数下降时通用能力保持稳定：定向遗忘', '8', 'var(--ink-mute,#777)'));
    svg.appendChild(txt(260, 212, '能力增益：2024 年轻微，2025 年接近门槛；试验中达 2.53 倍', '8', 'var(--ink-mute,#777)'));
    shell(host, 'WMDP 黄色区域（Yellow Zone）', '先评估，再定向遗忘',
      svg,
      '大规模杀伤性武器代理基准（Weapons of Mass Destruction Proxy，WMDP）包含 4,157 道选择题，位于黄色区域：与生物、网络和化学危害直接相关的使能知识，经专家筛选，题目本身不提供具体操作步骤。蓝色标记表示模型分数升入该区域；应用配套 RMU 遗忘（Unlearning）方法后，分数回落，下方大规模多任务语言理解（MMLU）条形保持稳定。因此 WMDP 同时用于军民两用能力（Dual-Use Capability）评估和遗忘基准测试。');
  }

  // -- al-asl-ladder: 能力上升，越过一级就关闭门控（Gate） --
  function aslLadder(host) {
    var W = 520, H = 250;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var rungs = [
      { y: 178, name: 'ASL-2', sub: '当前基线' },
      { y: 118, name: 'ASL-3', sub: 'CBRN 能力增益：2025 年 5 月启用' },
      { y: 58, name: 'ASL-4', sub: '阈值仍在制定' }
    ];
    var i;
    for (i = 0; i < 3; i++) {
      var r = rungs[i];
      var ln = svgEl('line', { x1: '70', y1: r.y, x2: '330', y2: r.y, stroke: i === 1 ? 'var(--warn,#b8870f)' : 'var(--rule-soft,#ddd)', 'stroke-width': '1.4', 'stroke-dasharray': '6 4', opacity: '0' });
      enter(ln, (i * 0.15) + 's');
      svg.appendChild(ln);
      svg.appendChild(txt(64, r.y + 3, r.name, '9', i === 1 ? 'var(--warn,#b8870f)' : 'var(--ink-mute,#777)', 'end'));
      svg.appendChild(txt(76, r.y - 10, r.sub, '8', 'var(--ink-mute,#777)', 'start'));
    }
    var curve = svgEl('path', { d: 'M80 214 C 160 210, 220 180, 300 104', fill: 'none', stroke: 'var(--blueprint,#3553ff)', 'stroke-width': '2', 'stroke-dasharray': '260', 'stroke-dashoffset': '260' });
    curve.appendChild(svgEl('animate', { attributeName: 'stroke-dashoffset', values: '260;0;0;260', dur: '6s', begin: '0.6s', repeatCount: 'indefinite', keyTimes: '0;0.45;0.9;1', calcMode: 'spline', keySplines: SPL + ';0 0 1 1;0.4 0 1 1' }));
    svg.appendChild(curve);
    svg.appendChild(txt(150, 234, '经评估的能力', '8', 'var(--blueprint,#3553ff)'));
    var cross = svgEl('circle', { cx: '287', cy: '118', r: '5', fill: 'var(--warn,#b8870f)', opacity: '0' });
    cross.appendChild(anim('opacity', '0;0;1;1;0', '6s', { begin: '0.6s', keyTimes: '0;0.38;0.44;0.9;1' }));
    cross.appendChild(anim('r', '4;6;4', '2.5s', {}));
    svg.appendChild(cross);
    var gate = grp(438, 118);
    gate.appendChild(svgEl('rect', { x: '-40', y: '-52', width: '80', height: '104', rx: '5', fill: 'var(--bg-surface,#eee)', stroke: 'var(--ink-soft,#555)', 'stroke-width': '1.4' }));
    gate.appendChild(txt(0, -32, '部署', '9', 'var(--ink,#1a1a1a)'));
    pop(gate, '0.4s');
    var bar = svgEl('rect', { x: '-32', y: '-14', width: '64', height: '0', fill: 'var(--warn,#b8870f)', opacity: '0.7' });
    bar.appendChild(svgEl('animate', { attributeName: 'height', values: '0;0;40;40;0', dur: '6s', begin: '0.6s', repeatCount: 'indefinite', keyTimes: '0;0.42;0.52;0.9;1', calcMode: 'spline', keySplines: '0 0 1 1;' + SPL + ';0 0 1 1;0.4 0 1 1' }));
    gate.appendChild(bar);
    var req = txt(0, 40, '须落实防护', '7', 'var(--warn,#b8870f)');
    req.appendChild(anim('opacity', '0;0;1;1;0', '6s', { begin: '0.6s', keyTimes: '0;0.46;0.52;0.9;1' }));
    gate.appendChild(req);
    svg.appendChild(gate);
    svg.appendChild(txt(378, 234, 'RSP、PF、FSF 均按此方式约束扩展', '7', 'var(--ink-mute,#777)'));
    shell(host, '能力阈值（Capability Thresholds）', '越过阈值后，部署关卡关闭',
      svg,
      '前沿安全框架（Frontier Safety Framework）的共同结构：Anthropic 的负责任扩展政策（Responsible Scaling Policy，RSP）参照生物安全等级定义 AI 安全等级（AI Safety Level，ASL）；OpenAI 的前沿风险准备框架（Preparedness Framework，PF）跟踪高能力阈值（High Capability Threshold）；DeepMind 的前沿安全框架（FSF）定义关键能力等级（Critical Capability Level）。经评估的能力越过阈值后，部署关卡关闭，直到所需防护措施落实。针对涉及化学、生物、放射性和核（CBRN）能力的模型，ASL-3 于 2025 年 5 月启用。三者都加入了竞争对手调整条款，以应对竞赛压力。');
  }

  LF.register({
    'al-instruct-pipeline': instructPipeline,
    'al-sycophancy-amplifier': sycophancyAmplifier,
    'al-sleeper-trigger': sleeperTrigger,
    'al-scheming-probe': schemingProbe,
    'al-faking-gap': fakingGap,
    'al-control-protocol': controlProtocol,
    'al-pair-loop': pairLoop,
    'al-ascii-cloak': asciiCloak,
    'al-injection-vector': injectionVector,
    'al-guard-stack': guardStack,
    'al-wmdp-yellow-zone': wmdpYellowZone,
    'al-asl-ladder': aslLadder
  });
})();
