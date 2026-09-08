/* figures-agent-skills.js：智能体技能（Agent Skills）学习路线的分步 SVG 讲解。
   在 lesson-figures.js 之后加载，通过 window.LF 注册。 */
(function () {
  'use strict';

  var LF = window.LF;
  if (!LF) return;

  var el = LF.el;
  var svgEl = LF.svgEl;
  var figureCounter = 0;

  function ensureStyles() {
    if (document.getElementById('agent-skill-figure-styles')) return;
    var style = document.createElement('style');
    style.id = 'agent-skill-figure-styles';
    style.textContent = [
      '.asf-shell{border:1px solid var(--rule-soft,#ddd);background:var(--bg,#fafaf5);margin:28px 0;font-family:var(--font-body,serif)}',
      '.asf-head{display:flex;justify-content:space-between;align-items:baseline;gap:12px;padding:12px 16px;border-bottom:1px solid var(--rule-soft,#ddd);font-family:var(--font-mono,monospace);font-size:.68rem;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-mute,#777)}',
      '.asf-head strong{color:var(--blueprint,#3553ff);font-weight:600}',
      '.asf-head{flex-wrap:wrap;letter-spacing:0}.asf-head>*{min-width:0;overflow-wrap:anywhere}.asf-zone text,.asf-button,.asf-step-note strong{letter-spacing:0}',
      '.asf-body{padding:16px}',
      '.asf-controls{display:grid;grid-template-columns:auto auto auto minmax(150px,1fr);align-items:center;gap:8px;margin-bottom:14px}',
      '.asf-button{min-height:44px;padding:7px 11px;border:1px solid var(--rule-soft,#ddd);background:var(--bg,#fafaf5);color:var(--ink,#111);font-family:var(--font-mono,monospace);font-size:.68rem;letter-spacing:.06em;text-transform:uppercase;cursor:pointer;transition:transform var(--motion-press,160ms) var(--ease-out,cubic-bezier(.23,1,.32,1)),border-color var(--motion-feedback,180ms) ease,color var(--motion-feedback,180ms) ease,background-color var(--motion-feedback,180ms) ease}',
      '.asf-button:hover,.asf-button:focus-visible{border-color:var(--blueprint,#3553ff);color:var(--blueprint,#3553ff)}',
      '.asf-button:active:not(:disabled){transform:scale(.97)}',
      '.asf-button:disabled{cursor:default;opacity:.42}',
      '.asf-range-wrap{display:grid;grid-template-columns:minmax(100px,1fr) auto;align-items:center;gap:10px}',
      '.asf-range{width:100%;accent-color:var(--blueprint,#3553ff)}',
      '.asf-count{font-family:var(--font-mono,monospace);font-size:.68rem;white-space:nowrap;color:var(--ink-mute,#777)}',
      '.asf-canvas{overflow-x:auto;overscroll-behavior-inline:contain;border:1px solid var(--rule-soft,#ddd);background:var(--bg-surface,#f3f1e8)}',
      '.asf-svg{display:block;width:100%;min-width:0;height:auto;color:var(--blueprint,#3553ff)}',
      '.asf-zone rect{fill:var(--blueprint-tint,rgba(53,83,255,.08));stroke:var(--rule-soft,#ddd);stroke-width:1;stroke-dasharray:5 5}',
      '.asf-zone text{fill:var(--ink-mute,#777);font-family:var(--font-mono,monospace);font-size:12px;letter-spacing:.1em;text-transform:uppercase}',
      '.asf-edge{opacity:.12;transform:translateY(5px);transform-box:fill-box;transform-origin:center;transition:opacity 280ms var(--ease-out,cubic-bezier(.23,1,.32,1)),transform 280ms var(--ease-out,cubic-bezier(.23,1,.32,1))}',
      '.asf-edge.is-visible{opacity:.82;transform:none}',
      '.asf-edge path{fill:none;stroke:var(--blueprint,#3553ff);stroke-width:2}',
      '.asf-edge.is-warning path{stroke:var(--warn,#b8870f)}',
      '.asf-edge-label{fill:var(--ink-mute,#777);font-family:var(--font-mono,monospace);font-size:11px;text-anchor:middle;paint-order:stroke;stroke:var(--bg-surface,#f3f1e8);stroke-width:5;stroke-linejoin:round}',
      '.asf-node{opacity:.2;transform:translateY(8px);transform-box:fill-box;transform-origin:center;transition:opacity 280ms var(--ease-out,cubic-bezier(.23,1,.32,1)),transform 280ms var(--ease-out,cubic-bezier(.23,1,.32,1))}',
      '.asf-node.is-visible{opacity:.68;transform:none}',
      '.asf-node.is-current{opacity:1;transform:translateY(-5px)}',
      '.asf-node rect{fill:var(--bg,#fafaf5);stroke:var(--rule-soft,#ddd);stroke-width:1.5}',
      '.asf-node.is-visible rect{stroke:var(--blueprint,#3553ff)}',
      '.asf-node.is-current rect{fill:var(--blueprint,#3553ff);stroke:var(--blueprint,#3553ff)}',
      '.asf-node.is-warning rect{stroke:var(--warn,#b8870f)}',
      '.asf-node.is-current.is-warning rect{fill:var(--warn,#b8870f);stroke:var(--warn,#b8870f)}',
      '.asf-node.is-decision rect{stroke-dasharray:5 4}',
      '.asf-title{fill:var(--ink,#111);font-family:var(--font-mono,monospace);font-size:14px;font-weight:600}',
      '.asf-detail{fill:var(--ink-mute,#777);font-family:var(--font-mono,monospace);font-size:11px}',
      '.asf-node.is-compact .asf-title{font-size:11.5px}',
      '.asf-node.is-compact .asf-detail{font-size:9.5px}',
      '.asf-node.is-current .asf-title,.asf-node.is-current .asf-detail{fill:var(--bg,#fafaf5)}',
      '.asf-step-note{min-height:70px;margin-top:12px;padding:12px 14px;border-left:3px solid var(--blueprint,#3553ff);background:var(--blueprint-tint,rgba(53,83,255,.08))}',
      '.asf-step-note strong{display:block;margin-bottom:4px;font-family:var(--font-mono,monospace);font-size:.74rem;letter-spacing:.05em;text-transform:uppercase;color:var(--blueprint,#3553ff)}',
      '.asf-step-note span{display:block;font-size:.92rem;line-height:1.5;color:var(--ink-soft,#555)}',
      '.asf-status{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}',
      '.asf-caption{padding:12px 16px;border-top:1px solid var(--rule-soft,#ddd);font-size:.92rem;line-height:1.55;color:var(--ink-soft,#555)}',
      '@media(max-width:640px){.asf-body{padding:12px}.asf-controls{grid-template-columns:repeat(3,minmax(0,1fr))}.asf-range-wrap{grid-column:1/-1}.asf-button{padding-inline:6px}.asf-svg{min-width:660px}.asf-step-note{min-height:0}}',
      '@media(prefers-reduced-motion:reduce){.asf-edge,.asf-node{transition:none!important}.asf-button{transition:border-color var(--motion-feedback,180ms) ease,color var(--motion-feedback,180ms) ease,background-color var(--motion-feedback,180ms) ease}.asf-button:active:not(:disabled){transform:none}}',
      '@media print{.asf-controls{display:none!important}.asf-canvas{overflow:visible}.asf-svg{min-width:0}.asf-edge,.asf-node{opacity:1!important;transform:none!important;transition:none!important}}'
    ].join('\n');
    document.head.appendChild(style);
  }

  function N(id, x, y, title, detail, stage, kind, width, height) {
    return {
      id: id,
      x: x,
      y: y,
      title: title,
      detail: detail || '',
      stage: stage || 0,
      kind: kind || '',
      width: width || 150,
      height: height || 62
    };
  }

  function E(from, to, stage, label, tone, points) {
    return {
      from: from,
      to: to,
      stage: stage || 0,
      label: label || '',
      tone: tone || '',
      points: points || null
    };
  }

  function Z(x, y, width, height, label) {
    return { x: x, y: y, width: width, height: height, label: label };
  }

  function S(label, detail, focus) {
    return { label: label, detail: detail, focus: focus || [] };
  }

  function lines(value) {
    if (Array.isArray(value)) return value;
    return String(value || '').split('|');
  }

  // 中文及全角字符按双倍等宽单元计算，避免 ASCII 字符数低估实际宽度。
  function textUnits(value) {
    return String(value).replace(/[^\x00-\x7f]/g, 'xx').length;
  }

  function splitLongToken(token, maxChars) {
    var chunks = [];
    var rest = token;
    while (textUnits(rest) > maxChars) {
      var limit = 0;
      while (limit < rest.length && textUnits(rest.slice(0, limit + 1)) <= maxChars) limit += 1;
      var minimum = Math.max(2, Math.floor(maxChars * 0.45));
      var cut = -1;
      for (var index = limit; index >= minimum; index -= 1) {
        if (/[-_/.+]/.test(rest.charAt(index - 1))) {
          cut = index;
          break;
        }
      }
      if (cut < 0) cut = limit;
      chunks.push(rest.slice(0, cut));
      rest = rest.slice(cut);
    }
    if (rest) chunks.push(rest);
    return chunks;
  }

  function wrapLine(value, maxChars) {
    var words = String(value || '').trim().split(/\s+/).filter(Boolean);
    if (!words.length) return [''];
    var wrapped = [];
    var current = '';
    words.forEach(function (word) {
      splitLongToken(word, maxChars).forEach(function (chunk) {
        var candidate = current ? current + ' ' + chunk : chunk;
        if (textUnits(candidate) <= maxChars) {
          current = candidate;
          return;
        }
        if (current) wrapped.push(current);
        current = chunk;
      });
    });
    if (current) wrapped.push(current);
    return wrapped;
  }

  function wrappedLines(value, maxChars) {
    return lines(value).reduce(function (result, line) {
      return result.concat(wrapLine(line, maxChars));
    }, []);
  }

  function nodeTextLayout(node) {
    var available = Math.max(28, node.width - 24);
    var rawTitle = lines(node.title);
    var rawDetail = node.detail ? lines(node.detail) : [];
    var compact = rawTitle.some(function (line) { return textUnits(line) * 8.4 > available; }) ||
      rawDetail.some(function (line) { return textUnits(line) * 6.6 > available; });
    if (!compact) {
      return {
        compact: false,
        title: rawTitle,
        detail: rawDetail,
        titleY: node.y + 23,
        detailY: node.y + 27 + rawTitle.length * 17,
        titleStep: 17,
        detailStep: 14
      };
    }

    var title = wrappedLines(node.title, Math.max(5, Math.floor(available / 6.9)));
    var detail = node.detail ? wrappedLines(node.detail, Math.max(6, Math.floor(available / 5.7))) : [];
    var titleStep = 13;
    var detailStep = 11;
    var titleHeight = 15 + Math.max(0, title.length - 1) * titleStep;
    var detailHeight = detail.length ? 12 + Math.max(0, detail.length - 1) * detailStep : 0;
    var totalHeight = titleHeight + (detail.length ? 1 + detailHeight : 0);
    var scale = Math.min(1, (node.height - 8) / totalHeight);
    titleStep *= scale;
    detailStep *= scale;
    var top = node.y + (node.height - totalHeight * scale) / 2;
    var titleY = top + 12 * scale;
    return {
      compact: true,
      scale: scale,
      title: title,
      detail: detail,
      titleY: titleY,
      detailY: titleY + Math.max(0, title.length - 1) * titleStep + 14 * scale,
      titleStep: titleStep,
      detailStep: detailStep
    };
  }

  function nodeCenter(node) {
    return { x: node.x + node.width / 2, y: node.y + node.height / 2 };
  }

  function edgePath(edge, nodes) {
    if (edge.points && edge.points.length) {
      return edge.points.map(function (point, index) {
        return (index ? 'L' : 'M') + point[0] + ' ' + point[1];
      }).join(' ');
    }
    var from = nodes[edge.from];
    var to = nodes[edge.to];
    var a = nodeCenter(from);
    var b = nodeCenter(to);
    var dx = b.x - a.x;
    var dy = b.y - a.y;
    var x1 = a.x;
    var y1 = a.y;
    var x2 = b.x;
    var y2 = b.y;
    if (Math.abs(dx) >= Math.abs(dy)) {
      x1 = dx >= 0 ? from.x + from.width : from.x;
      x2 = dx >= 0 ? to.x : to.x + to.width;
    } else {
      y1 = dy >= 0 ? from.y + from.height : from.y;
      y2 = dy >= 0 ? to.y : to.y + to.height;
    }
    var mx = (x1 + x2) / 2;
    var my = (y1 + y2) / 2;
    if (Math.abs(dx) >= Math.abs(dy)) return 'M' + x1 + ' ' + y1 + ' C' + mx + ' ' + y1 + ' ' + mx + ' ' + y2 + ' ' + x2 + ' ' + y2;
    return 'M' + x1 + ' ' + y1 + ' C' + x1 + ' ' + my + ' ' + x2 + ' ' + my + ' ' + x2 + ' ' + y2;
  }

  function textBlock(node, className, value, startY, lineHeight, scale) {
    var text = svgEl('text', { x: node.x + 12, y: startY, class: className });
    if (scale < 1) text.style.fontSize = ((className === 'asf-title' ? 11.5 : 9.5) * scale) + 'px';
    lines(value).forEach(function (line, index) {
      text.appendChild(svgEl('tspan', {
        x: node.x + 12,
        dy: index === 0 ? '0' : String(lineHeight)
      }, [document.createTextNode(line)]));
    });
    return text;
  }

  function prefersReducedMotion() {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  function makeFigure(config) {
    return function (host) {
      ensureStyles();
      figureCounter += 1;
      var uid = 'asf-' + figureCounter;
      var maxStep = config.steps.length - 1;
      var state = { step: 0 };
      var timer = 0;
      var announcementTimer = 0;
      var titleId = uid + '-title';
      var descId = uid + '-desc';
      var noteDetailId = uid + '-note-detail';
      var nodeMap = {};
      var nodeViews = [];
      var edgeViews = [];

      config.nodes.forEach(function (node) { nodeMap[node.id] = node; });

      var svg = svgEl('svg', {
        class: 'asf-svg',
        viewBox: config.viewBox || '0 0 760 480',
        role: 'img',
        'aria-labelledby': titleId + ' ' + descId,
        focusable: 'false'
      });
      svg.appendChild(svgEl('title', { id: titleId }, [document.createTextNode(config.title)]));
      svg.appendChild(svgEl('desc', { id: descId }, [document.createTextNode(config.description)]));

      var defs = svgEl('defs');
      var marker = svgEl('marker', {
        id: uid + '-arrow', markerWidth: '8', markerHeight: '8', refX: '7', refY: '4', orient: 'auto', markerUnits: 'strokeWidth'
      }, [svgEl('path', { d: 'M0 0 L8 4 L0 8 Z', fill: 'var(--blueprint,#3553ff)' })]);
      var warnMarker = svgEl('marker', {
        id: uid + '-warn-arrow', markerWidth: '8', markerHeight: '8', refX: '7', refY: '4', orient: 'auto', markerUnits: 'strokeWidth'
      }, [svgEl('path', { d: 'M0 0 L8 4 L0 8 Z', fill: 'var(--warn,#b8870f)' })]);
      defs.appendChild(marker);
      defs.appendChild(warnMarker);
      svg.appendChild(defs);

      (config.zones || []).forEach(function (zone) {
        svg.appendChild(svgEl('g', { class: 'asf-zone' }, [
          svgEl('rect', { x: zone.x, y: zone.y, width: zone.width, height: zone.height }),
          svgEl('text', { x: zone.x + 10, y: zone.y + 18 }, [document.createTextNode(zone.label)])
        ]));
      });

      config.edges.forEach(function (edge) {
        var group = svgEl('g', { class: 'asf-edge' + (edge.tone === 'warning' ? ' is-warning' : '') });
        var path = svgEl('path', {
          d: edgePath(edge, nodeMap),
          'marker-end': 'url(#' + (edge.tone === 'warning' ? uid + '-warn-arrow' : uid + '-arrow') + ')'
        });
        group.appendChild(path);
        if (edge.label) {
          var fromCenter = nodeCenter(nodeMap[edge.from]);
          var toCenter = nodeCenter(nodeMap[edge.to]);
          var labelX = edge.points && edge.points.length ? edge.points[Math.floor(edge.points.length / 2)][0] : (fromCenter.x + toCenter.x) / 2;
          var labelY = edge.points && edge.points.length ? edge.points[Math.floor(edge.points.length / 2)][1] - 7 : (fromCenter.y + toCenter.y) / 2 - 7;
          group.appendChild(svgEl('text', { x: labelX, y: labelY, class: 'asf-edge-label' }, [document.createTextNode(edge.label)]));
        }
        svg.appendChild(group);
        edgeViews.push({ config: edge, element: group });
      });

      config.nodes.forEach(function (node) {
        var layout = nodeTextLayout(node);
        var nodeClass = 'asf-node' + (node.kind === 'decision' ? ' is-decision' : '') + (node.kind === 'warning' ? ' is-warning' : '') + (layout.compact ? ' is-compact' : '');
        var group = svgEl('g', { class: nodeClass, 'data-node': node.id });
        group.appendChild(svgEl('rect', { x: node.x, y: node.y, width: node.width, height: node.height, rx: '0' }));
        group.appendChild(textBlock(node, 'asf-title', layout.title, layout.titleY, layout.titleStep, layout.scale));
        if (layout.detail.length) {
          group.appendChild(textBlock(node, 'asf-detail', layout.detail, layout.detailY, layout.detailStep, layout.scale));
        }
        svg.appendChild(group);
        nodeViews.push({ config: node, element: group });
      });

      var previous = el('button', { class: 'asf-button', type: 'button' }, ['上一步']);
      var next = el('button', { class: 'asf-button', type: 'button' }, ['下一步']);
      var replay = el('button', { class: 'asf-button', type: 'button' }, ['重播']);
      var range = el('input', {
        class: 'asf-range', type: 'range', min: '0', max: String(maxStep), step: '1', value: '0',
        'aria-label': '图解步骤',
        'aria-describedby': noteDetailId,
        'aria-valuetext': '第 1 步，共 ' + config.steps.length + ' 步：' + config.steps[0].label
      });
      var count = el('span', { class: 'asf-count', 'aria-hidden': 'true' }, ['1 / ' + config.steps.length]);
      var noteTitle = el('strong');
      var noteDetail = el('span', { id: noteDetailId });
      var note = el('div', { class: 'asf-step-note' }, [noteTitle, noteDetail]);
      var status = el('span', { class: 'asf-status', role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true' });

      function currentFocus() {
        var step = config.steps[state.step];
        return step.focus && step.focus.length ? step.focus : config.nodes.filter(function (node) {
          return node.stage === state.step;
        }).map(function (node) { return node.id; });
      }

      function render() {
        var focus = currentFocus();
        nodeViews.forEach(function (view) {
          var visible = view.config.stage <= state.step;
          var current = focus.indexOf(view.config.id) !== -1;
          view.element.classList.toggle('is-visible', visible);
          view.element.classList.toggle('is-current', current);
          if (current) view.element.setAttribute('aria-current', 'step');
          else view.element.removeAttribute('aria-current');
        });
        edgeViews.forEach(function (view) {
          view.element.classList.toggle('is-visible', view.config.stage <= state.step);
        });
        range.value = String(state.step);
        range.setAttribute('aria-valuetext', '第 ' + (state.step + 1) + ' 步，共 ' + config.steps.length + ' 步：' + config.steps[state.step].label);
        count.textContent = (state.step + 1) + ' / ' + config.steps.length;
        previous.disabled = state.step === 0;
        next.disabled = state.step === maxStep;
        noteTitle.textContent = config.steps[state.step].label;
        noteDetail.textContent = config.steps[state.step].detail;
      }

      function clearTimer() {
        if (!timer) return;
        window.clearTimeout(timer);
        timer = 0;
      }

      function announceStep() {
        if (announcementTimer) window.clearTimeout(announcementTimer);
        status.textContent = '';
        announcementTimer = window.setTimeout(function () {
          announcementTimer = 0;
          status.textContent = '第 ' + (state.step + 1) + ' 步，共 ' + config.steps.length + ' 步：' + config.steps[state.step].label + '。' + config.steps[state.step].detail;
        }, 0);
      }

      function setStep(step, announce) {
        state.step = Math.max(0, Math.min(maxStep, step));
        render();
        if (announce) announceStep();
      }

      function pause() {
        clearTimer();
      }

      function resume() {
        if (timer || state.step >= maxStep || prefersReducedMotion()) return;
        timer = window.setTimeout(function advance() {
          timer = 0;
          if (state.step >= maxStep) return;
          setStep(state.step + 1);
          resume();
        }, config.delay || 850);
      }

      function staticFrame() {
        clearTimer();
        setStep(maxStep);
      }

      previous.addEventListener('click', function () {
        pause();
        setStep(state.step - 1, true);
      });
      next.addEventListener('click', function () {
        pause();
        setStep(state.step + 1, true);
      });
      replay.addEventListener('click', function () {
        pause();
        if (prefersReducedMotion()) setStep(maxStep, true);
        else {
          setStep(0, true);
          resume();
        }
      });
      range.addEventListener('input', function () {
        pause();
        setStep(Number(range.value));
      });

      var controls = el('div', { class: 'asf-controls' }, [
        previous,
        next,
        replay,
        el('div', { class: 'asf-range-wrap' }, [range, count])
      ]);
      var shell = el('section', { class: 'asf-shell' }, [
        el('div', { class: 'asf-head' }, [
          el('strong', {}, [config.title]),
          el('span', {}, [config.hint || '逐步查看边界'])
        ]),
        el('div', { class: 'asf-body' }, [
          controls,
          el('div', { class: 'asf-canvas', tabindex: '0', 'aria-label': '可滚动的图解画布' }, [svg]),
          note,
          status
        ]),
        el('div', { class: 'asf-caption' }, [config.caption])
      ]);
      host.appendChild(shell);
      render();
      LF.addMotionController(host, { pause: pause, resume: resume, staticFrame: staticFrame });
      LF.registerDisposer(host, function () {
        clearTimer();
        if (announcementTimer) window.clearTimeout(announcementTimer);
      });
    };
  }

  var figures = {
    'skill-package-anatomy': makeFigure({
      title: '技能包结构（Skill Package Anatomy）',
      hint: '展开完整的可部署单元',
      description: '树状图展示一个 release-readiness 技能包内的 SKILL.md、参考资料、脚本与素材。',
      viewBox: '0 0 760 430',
      zones: [Z(18, 18, 724, 392, '一个可部署目录')],
      nodes: [
        N('bundle', 290, 42, 'release-readiness', '技能包根目录', 0, '', 180, 58),
        N('entry', 35, 150, 'SKILL.md', '身份 + 操作流程', 1, '', 140, 64),
        N('refs', 205, 150, 'references/', '分支规则', 1, '', 140, 64),
        N('scripts', 375, 150, 'scripts/', '确定性辅助程序', 1, '', 140, 64),
        N('assets', 545, 150, 'assets/', '输出素材', 1, '', 140, 64),
        N('policy', 185, 292, 'release-policy.md', '领域约束', 2, '', 150, 62),
        N('format', 350, 292, 'changelog-format.md', '格式契约', 2, '', 160, 62),
        N('inspect', 520, 292, 'inspect_release.py', '证据收集器', 2, '', 150, 62),
        N('checklist', 590, 342, 'release-checklist.md', '交付物模板', 2, '', 145, 62)
      ],
      edges: [
        E('bundle', 'entry', 1), E('bundle', 'refs', 1), E('bundle', 'scripts', 1), E('bundle', 'assets', 1),
        E('refs', 'policy', 2), E('refs', 'format', 2), E('scripts', 'inspect', 2), E('assets', 'checklist', 2)
      ],
      steps: [
        S('以目录为单位', '安装、版本管理、审查和删除都应针对整个技能包根目录。', ['bundle']),
        S('四项职责', 'SKILL.md 负责路由和指导；参考资料负责解释；脚本负责计算；素材用于生成输出。', ['entry', 'refs', 'scripts', 'assets']),
        S('每个引用都必须能解析', '只复制入口文件却缺少配套文件，会得到不完整的技能包。', ['policy', 'format', 'inspect', 'checklist'])
      ],
      caption: '技能包完整性涵盖工作流提及的每个文件。发布目录条目前，先校验整个目录树。'
    }),

    'skill-runtime-lifecycle': makeFigure({
      title: '技能运行时生命周期（Skill Runtime Lifecycle）',
      hint: '沿技能身份追踪到经过验证的工作成果',
      description: '技能从包发现开始，依次经历校验、选择、激活、执行和结果验证的生命周期。',
      viewBox: '0 0 920 500',
      nodes: [
        N('discover', 30, 55, '发现', '查找技能包', 0, '', 130, 60),
        N('validate', 190, 55, '校验', '元数据 + 目录布局', 1, '', 140, 60),
        N('catalog', 360, 55, '技能目录（Catalog）', 'name + description', 2, '', 140, 60),
        N('select', 535, 55, '是否选择？', '显式或隐式', 3, 'decision', 140, 60),
        N('unloaded', 730, 25, '保持未加载', '无匹配', 4, 'warning', 150, 54),
        N('activate', 730, 125, '激活（Activate）', '正文进入上下文', 4, '', 150, 60),
        N('body', 535, 230, '加载 SKILL.md', '操作流程', 5, '', 150, 60),
        N('resources', 350, 230, '按需提供资源', '仅限所需分支', 6, '', 155, 60),
        N('execute', 165, 230, '请求执行', '宿主工具 + 策略', 7, '', 155, 60),
        N('artifact', 30, 340, '交付物 + 证据', '可观察的结果', 8, '', 155, 60),
        N('verify', 250, 340, '验证', '独立门禁', 9, '', 135, 60)
      ],
      edges: [
        E('discover', 'validate', 1), E('validate', 'catalog', 2), E('catalog', 'select', 3),
        E('select', 'unloaded', 4, '无匹配', 'warning'), E('select', 'activate', 4, '已选择'),
        E('activate', 'body', 5), E('body', 'resources', 6), E('resources', 'execute', 7),
        E('execute', 'artifact', 8), E('artifact', 'verify', 9)
      ],
      steps: [
        S('发现不等于激活', '运行时先找到一个候选技能包。', ['discover']),
        S('尽早拒绝格式错误的技能包', '在模型看到条目前，通过校验保护技能目录。', ['validate']),
        S('发布精简的路由元数据', '只有身份和触发条件信息需要占用目录空间。', ['catalog']),
        S('选择是独立决策', '宿主特有的显式操作，或模型根据描述进行的匹配，都可以选中技能包。', ['select']),
        S('选择过程可以弃选（Abstain）', '没有匹配时保持正文未加载；匹配成功则激活技能。', ['unloaded', 'activate']),
        S('激活会加载操作流程', '正文进入模型可见的上下文，但不会因此获得工具权限。', ['body']),
        S('沿分支按需提供资源', '只读取当前所需的参考资料、脚本或素材。', ['resources']),
        S('执行始终由宿主控制', '智能体（Agent）在当前生效的策略下请求工具或脚本。', ['execute']),
        S('随交付物一起返回证据', '流畅的陈述不如路径、观测记录和退出结果有说服力。', ['artifact']),
        S('通过验证闭合流程', '独立于生成结果的模型检查结果。', ['verify'])
      ],
      caption: '按生命周期阶段诊断故障。已发现、已选择、已激活、已执行和已验证是不同状态。'
    }),

    'skill-tool-orthogonality': makeFigure({
      title: '技能流程与工具能力（Skill Procedure and Tool Capability）',
      hint: '区分如何开展工作与可以执行什么',
      description: '反馈循环中，已激活的技能指导操作流程，宿主工具返回观测结果，为最终交付物提供依据。',
      viewBox: '0 0 760 500',
      zones: [Z(28, 22, 704, 450, '操作流程循环')],
      nodes: [
        N('goal', 300, 42, '用户目标', '定义预期结果', 0, '', 160, 58),
        N('skill', 300, 128, '已激活的技能', '过程性知识', 1, '', 160, 60),
        N('procedure', 300, 220, '决策规则', '选择下一步操作', 2, 'decision', 160, 60),
        N('tool', 60, 220, 'MCP 或本地工具', '有类型约束的能力', 3, '', 170, 60),
        N('observation', 60, 330, '观测（Observation）', '证据，不是权限', 4, '', 170, 60),
        N('artifact', 540, 220, '交付物（Artifact）', '契约规定的输出', 5, '', 150, 60),
        N('verify', 540, 330, '验证（Verification）', '独立检查', 6, '', 150, 60)
      ],
      edges: [
        E('goal', 'skill', 1), E('skill', 'procedure', 2), E('procedure', 'tool', 3), E('tool', 'observation', 4),
        E('observation', 'procedure', 4, '反馈证据', '', [[145, 330], [145, 300], [280, 300], [280, 250], [300, 250]]),
        E('procedure', 'artifact', 5), E('artifact', 'verify', 6)
      ],
      steps: [
        S('目标由用户决定', '任务的起点先于技能和工具的选择。', ['goal']),
        S('技能提供方法', '技能提供操作流程和决策边界。', ['skill']),
        S('流程选择所需能力', '提到工具名称不会创建该工具，也不会授予其使用权限。', ['procedure']),
        S('宿主提供实际工具', '工具契约定义实际可以请求的操作。', ['tool']),
        S('观测结果更新判断', '工具输出以证据形式返回，不是更高优先级的指令。', ['observation', 'procedure']),
        S('流程产出交付物', '技能将观测结果转化为所需输出。', ['artifact']),
        S('验证保持独立', '交付物必须通过模型陈述之外的检查。', ['verify'])
      ],
      caption: '技能回答如何开展工作；工具回答宿主能够执行哪些操作。'
    }),

    'skill-validation-order': makeFigure({
      title: '技能校验顺序（Skill Validation Order）',
      hint: '遇到首个不满足的不变量就报错',
      description: '从左向右的校验流水线，从元数据头分隔符开始，直到正文和资源规则。',
      viewBox: '0 0 860 230',
      nodes: [
        N('frontmatter', 20, 78, '元数据头（Frontmatter）', '分隔符', 0, '', 125, 62),
        N('scalar', 160, 78, '标量元数据', '安全解析', 1, '', 125, 62),
        N('name', 300, 78, '名称 = 目录名', '稳定身份', 2, '', 135, 62),
        N('required', 450, 78, '必填字段', 'name + description', 3, '', 135, 62),
        N('extensions', 600, 78, '已知扩展', '适配器允许列表', 4, '', 125, 62),
        N('body', 740, 78, '正文 + 资源', '深入校验规则', 5, '', 105, 62)
      ],
      edges: [E('frontmatter', 'scalar', 1), E('scalar', 'name', 2), E('name', 'required', 3), E('required', 'extensions', 4), E('extensions', 'body', 5)],
      steps: [
        S('定位文档边界', '不要从格式错误的头部推断元数据。', ['frontmatter']),
        S('只解析预期结构', '在深入检查之前，拒绝非预期的元数据类型。', ['scalar']),
        S('核实技能包身份', '声明的名称必须与所在目录名一致。', ['name']),
        S('要求提供路由元数据', '缺少身份或描述时，不得发布到目录。', ['required']),
        S('明确宿主特有语义', '未知扩展需要由适配器明确决定如何处理。', ['extensions']),
        S('随后检查正文与资源', '只有低成本的结构检查通过后，深入检查才有意义。', ['body'])
      ],
      caption: '应先用低成本结构检查发现错误，避免后续内容错误掩盖首个不满足的不变量。'
    }),

    'skill-discovery-pipeline': makeFigure({
      title: '发现编译流水线（Discovery Compiler Pipeline）',
      hint: '将文件系统候选包编译为技能目录',
      description: '从配置的根目录出发，依次完成枚举、包校验、来源记录、冲突消解、预算控制与目录发布。',
      viewBox: '0 0 980 250',
      nodes: [
        N('roots', 20, 88, '配置的根目录', '工作区、用户、管理员', 0, '', 130, 66),
        N('enumerate', 165, 88, '枚举（Enumerate）', '直接下属技能目录', 1, '', 120, 66),
        N('entry', 300, 88, '查找 SKILL.md', '单一入口', 2, '', 120, 66),
        N('validate', 435, 88, '校验技能包', '结构 + 限制', 3, '', 120, 66),
        N('provenance', 570, 88, '附加来源信息', '作用域 + 来源', 4, '', 125, 66),
        N('collision', 710, 88, '消解命名冲突', '声明的策略', 5, 'decision', 120, 66),
        N('budget', 845, 38, '应用预算', '限制目录大小', 6, '', 120, 62),
        N('publish', 845, 148, '发布条目', 'name + description + path', 7, '', 120, 62)
      ],
      edges: [
        E('roots', 'enumerate', 1), E('enumerate', 'entry', 2), E('entry', 'validate', 3), E('validate', 'provenance', 4),
        E('provenance', 'collision', 5), E('collision', 'budget', 6), E('budget', 'publish', 7)
      ],
      steps: [
        S('从声明的根目录开始', '发现范围由运行时策略决定，不是技能包的属性。', ['roots']),
        S('保留技能包边界', '检查直接下属的技能目录，不要把每个嵌套示例都发布出去。', ['enumerate']),
        S('定位唯一入口', '只有在预期位置存在 SKILL.md 时，目录才成为候选技能包。', ['entry']),
        S('展示前先校验', '格式错误的技能包不应占用目录空间。', ['validate']),
        S('携带来源身份', '作用域与来源信息使重名问题能够被诊断。', ['provenance']),
        S('按策略解析名称', '明确决定保留、添加限定名、拒绝，或按优先级选择。', ['collision']),
        S('对实际序列化结果计算预算', '目录大小由宿主管理，活动上下文另有独立预算。', ['budget']),
        S('发布精简元数据', '模型看到的是路由身份信息，而非完整技能包目录树。', ['publish'])
      ],
      caption: '发现是确定性的编译过程。诊断信息中应保留被拒绝和被同名条目遮蔽的候选包。'
    }),

    'skill-disclosure-levels': makeFigure({
      title: '三级按需披露（Three Disclosure Levels）',
      hint: '仅在任务需要时引入上下文',
      description: '三个堆叠层级分别展示目录元数据、已激活的 SKILL.md 正文和分支专用资源。',
      viewBox: '0 0 760 470',
      zones: [Z(65, 30, 630, 390, '为单个任务引入的上下文')],
      nodes: [
        N('level1', 150, 62, '第 1 层：目录元数据', 'name + description', 0, '', 460, 72),
        N('level2', 150, 184, '第 2 层：SKILL.md 正文', '工作流 + 决策映射', 1, '', 460, 72),
        N('level3', 150, 306, '第 3 层：配套资源', '参考资料 + 脚本 + 素材', 2, '', 460, 72)
      ],
      edges: [E('level1', 'level2', 1, '技能已选中'), E('level2', 'level3', 2, '分支需要详细信息')],
      steps: [
        S('第 1 层负责路由', '名称和描述让模型无需加载正文，就能区分符合条件的技能。', ['level1']),
        S('第 2 层启动工作', '激活时加载足够的操作流程，以便选择分支并安全开始工作。', ['level2']),
        S('第 3 层提供具体细节', '只有选中的分支才需要将其参考资料、脚本或素材引入上下文。', ['level3'])
      ],
      caption: '渐进式披露（Progressive Disclosure）是分阶段引入上下文，不是提升权限。'
    }),

    'skill-reference-map': makeFigure({
      title: '单跳引用映射（One-hop Reference Map）',
      hint: '让每个分支都能直接到达',
      description: 'SKILL.md 直接指向 Python、容器、文档和报告模板的参考文件。',
      viewBox: '0 0 760 390',
      nodes: [
        N('skill', 300, 42, 'SKILL.md', '决策映射', 0, '', 160, 62),
        N('python', 30, 245, 'python-release.md', 'Python 分支', 1, '', 155, 62),
        N('container', 210, 245, 'container-release.md', '镜像分支', 1, '', 165, 62),
        N('docs', 405, 245, 'docs-release.md', '文档分支', 1, '', 145, 62),
        N('template', 575, 245, 'report-template.md', '输出契约', 1, '', 155, 62)
      ],
      edges: [E('skill', 'python', 1, 'Python'), E('skill', 'container', 1, '容器'), E('skill', 'docs', 1, '文档'), E('skill', 'template', 1, '所有分支')],
      steps: [
        S('正文就是导航图', '激活后应展示默认工作流及每项资源的加载条件。', ['skill']),
        S('分支通过单跳链接直达资源', '直接链接使资源可达性能够被检查，并让无关指南保持未加载。', ['python', 'container', 'docs', 'template'])
      ],
      caption: '直接的决策映射优于主题堆砌。每个配套文件都应声明加载条件。'
    }),

    'skill-resource-containment': makeFigure({
      title: '资源边界门禁（Resource Containment Gate）',
      hint: '读取前先解析真实目标',
      description: '决策树拒绝绝对路径、父目录遍历、符号链接逃逸、错误文件类型及超大资源。',
      viewBox: '0 0 940 590',
      nodes: [
        N('request', 35, 60, '请求的路径', '包内相对路径输入', 0, '', 145, 62),
        N('escape', 225, 60, '绝对路径或向上逃逸？', '../ 或 /root', 1, 'decision', 170, 62),
        N('reject1', 470, 18, '拒绝', '输入结构无效', 2, 'warning', 125, 52),
        N('resolve', 470, 105, '解析路径', '真实技能包根目录', 2, '', 140, 60),
        N('inside', 650, 105, '目标在根目录内？', '解析符号链接后', 3, 'decision', 150, 62),
        N('reject2', 815, 45, '拒绝', '已逃出根目录', 4, 'warning', 110, 52),
        N('type', 650, 230, '文件类型符合预期？', '允许的普通文件', 4, 'decision', 150, 62),
        N('reject3', 815, 230, '拒绝', '错误类型或特殊文件', 5, 'warning', 110, 52),
        N('limit', 455, 350, '大小未超限？', '限制上下文读取量', 5, 'decision', 155, 62),
        N('reject4', 670, 390, '拒绝', '资源超大', 6, 'warning', 130, 52),
        N('load', 255, 455, '加载资源', '记录原因 + 字节数', 6, '', 150, 62)
      ],
      edges: [
        E('request', 'escape', 1), E('escape', 'reject1', 2, '是', 'warning'), E('escape', 'resolve', 2, '否'),
        E('resolve', 'inside', 3), E('inside', 'reject2', 4, '否', 'warning'), E('inside', 'type', 4, '是'),
        E('type', 'reject3', 5, '否', 'warning'), E('type', 'limit', 5, '是'),
        E('limit', 'reject4', 6, '否', 'warning'), E('limit', 'load', 6, '是')
      ],
      steps: [
        S('从不可信的相对路径开始', '在边界检查证明路径合规之前，请求只是不可信数据。', ['request']),
        S('拒绝明显的逃逸语法', '绝对路径和父目录片段不得进入文件系统解析环节。', ['escape']),
        S('相对于技能包根目录解析', '字符串前缀检查无法检测符号链接或路径规范化造成的逃逸。', ['reject1', 'resolve']),
        S('比较解析后的实际位置', '真实目标必须始终位于真实技能包根目录内。', ['inside']),
        S('检查操作与文件类型', '仅仅位于边界内，并不能使套接字、设备或后缀错误的文件成为有效输入。', ['reject2', 'type']),
        S('限制引入上下文的内容', '拒绝非预期类型，以及超过声明大小限制的文件。', ['reject3', 'limit']),
        S('记录证据后加载，否则拒绝', '记录资源、分支选择原因和字节数，不要将秘密写入日志。', ['reject4', 'load'])
      ],
      caption: '解析后的边界检查保护技能包边界，但不能证明包内内容可信。'
    }),

    'skill-invocation-stages': makeFigure({
      title: '调用的五个阶段（Five Invocation Stages）',
      hint: '明确指出失败发生在哪个边界',
      description: '从已发现到已完成的状态路径，包含被拒绝、未选中和受阻的退出分支。',
      viewBox: '0 0 940 470',
      nodes: [
        N('discovered', 25, 75, '已发现（Discovered）', '技能包存在', 0, '', 125, 60),
        N('eligible', 180, 75, '符合条件（Eligible）', '执行者与策略允许', 1, '', 130, 60),
        N('selected', 340, 75, '已选中（Selected）', '宿主身份或描述', 2, '', 130, 60),
        N('activated', 500, 75, '已激活（Activated）', '正文已进入上下文', 3, '', 130, 60),
        N('executing', 660, 75, '执行中（Executing）', '工作开始', 4, '', 130, 60),
        N('completed', 820, 75, '已完成（Completed）', '输出已验证', 5, '', 105, 60),
        N('denied', 180, 245, '已拒绝（Denied）', '执行者或策略阻止', 1, 'warning', 130, 58),
        N('notselected', 340, 330, '未选中（Not selected）', '未达到阈值', 2, 'warning', 130, 58),
        N('blocked', 500, 245, '受阻（Blocked）', '缺少能力或批准', 4, 'warning', 150, 58)
      ],
      edges: [
        E('discovered', 'eligible', 1), E('discovered', 'denied', 1, '被策略阻止', 'warning'),
        E('eligible', 'selected', 2), E('eligible', 'notselected', 2, '路由器弃选', 'warning'),
        E('selected', 'activated', 3), E('activated', 'executing', 4), E('activated', 'blocked', 4, '缺少权限', 'warning'),
        E('executing', 'completed', 5)
      ],
      steps: [
        S('已发现（Discovered）', '技能包存在于配置的作用域中，但尚无执行者使用它。', ['discovered']),
        S('符合条件或被拒绝', '策略决定该执行者是否可以请求此技能。', ['eligible', 'denied']),
        S('选中或未选中', '宿主解析显式身份。模型路由比较目录描述，也可以弃选。', ['selected', 'notselected']),
        S('已激活（Activated）', '正文进入工作上下文，但这仍不代表工具执行。', ['activated']),
        S('开始执行或受阻', '只有具备能力、权限和批准时，工作才会开始。', ['executing', 'blocked']),
        S('已完成（Completed）', '独立验证将一次工作流尝试变为已完成的工作。', ['completed'])
      ],
      caption: '单个 skill_used 标志会掩盖路由、策略、能力或验证究竟在哪个边界失败。'
    }),

    'skill-routing-abstention': makeFigure({
      title: '支持弃选的路由（Routing with Abstention）',
      hint: '先按策略筛选，再比较相关性',
      description: '请求经过执行者资格筛选和描述比较后，由明确匹配判定决定激活、询问或弃选。',
      viewBox: '0 0 800 500',
      nodes: [
        N('request', 40, 55, '用户请求', '任务上下文', 0, '', 145, 60),
        N('eligible', 235, 55, '筛选资格', '执行者 + 宿主策略', 1, '', 155, 60),
        N('compare', 445, 55, '比较描述', '仅限符合条件的目录', 2, '', 170, 60),
        N('clear', 445, 180, '存在唯一明确匹配？', '阈值 + 分数差距', 3, 'decision', 170, 62),
        N('activate', 75, 350, '激活技能', '明确胜出的合格候选', 4, '', 155, 60),
        N('ask', 320, 350, '询问或按常规推理', '接近但有歧义的匹配', 4, 'warning', 180, 60),
        N('none', 590, 350, '不激活', '无匹配', 4, 'warning', 155, 60)
      ],
      edges: [
        E('request', 'eligible', 1), E('eligible', 'compare', 2), E('compare', 'clear', 3),
        E('clear', 'activate', 4, '是'), E('clear', 'ask', 4, '存在歧义', 'warning'), E('clear', 'none', 4, '无匹配', 'warning')
      ],
      steps: [
        S('从请求本身出发', '路由应保留任务含义，而非仅统计关键词。', ['request']),
        S('先按权限筛选', '被禁止的最高分匹配不能压制分数较低但符合条件的候选技能。', ['eligible']),
        S('比较有界描述', '能力、触发条件、上下文和排除条件共同决定相关性。', ['compare']),
        S('要求候选明确胜出', '符合条件的最高分候选仍须达到阈值，并满足消除歧义所需的分数差距。', ['clear']),
        S('激活、询问或弃选', '证据不足时，不选择也是有意作出的结果。', ['activate', 'ask', 'none'])
      ],
      caption: '路由器只对符合条件的技能排序，并保留明确的弃选路径。'
    }),

    'skill-argument-boundaries': makeFigure({
      title: '参数边界转换（Argument Boundary Transformations）',
      hint: '保留意图，不将文本当作代码执行',
      description: '用户文本依次转化为解析后的参数、技能上下文、有类型约束的工具调用，以及经过校验的执行输入。',
      viewBox: '0 0 860 270',
      zones: [Z(15, 30, 830, 190, '文本先成为数据，再成为有类型约束的输入')],
      nodes: [
        N('text', 35, 92, '用户文本', '带引号的请求', 0, '', 135, 62),
        N('parser', 200, 92, '宿主解析器', '语法 + 引号规则', 1, '', 135, 62),
        N('bound', 365, 92, '绑定后的参数', '已校验的值', 2, '', 140, 62),
        N('context', 535, 92, '技能上下文', '流程读取数据', 3, '', 135, 62),
        N('tool', 700, 92, '有类型约束的工具调用', '模式再次校验', 4, '', 135, 62)
      ],
      edges: [E('text', 'parser', 1), E('parser', 'bound', 2), E('bound', 'context', 3), E('context', 'tool', 4)],
      steps: [
        S('用户文本不是命令字符串', '保留可检查的原始意图和引号。', ['text']),
        S('命令语法由宿主管理', '斜杠命令、变量和引号规则属于适配器的职责。', ['parser']),
        S('绑定并校验参数值', '必填参数、默认值和允许的结构都成为明确的数据。', ['bound']),
        S('指令使用数据', '技能选择分支时，不将原始文本插入 shell 命令。', ['context']),
        S('有类型约束的工具再次校验', '进入执行边界需要模式（Schema）以及范围受限的参数向量。', ['tool'])
      ],
      caption: '每次跨越表示形式的边界都应校验值，不能把用户控制的文本当成代码。'
    }),

    'skill-host-adapter': makeFigure({
      title: '可移植核心与宿主适配器（Portable Core and Host Adapter）',
      hint: '将扩展置于核心契约之外',
      description: '可移植技能包与宿主适配器向同一个运行时激活边界提供不同输入。',
      viewBox: '0 0 860 500',
      zones: [Z(25, 35, 365, 390, '可移植技能包'), Z(470, 35, 365, 390, '宿主适配器')],
      nodes: [
        N('bundle', 130, 70, '可移植技能包', '跨宿主使用的目录', 0, '', 155, 60),
        N('skill', 55, 180, 'SKILL.md', '核心流程', 1, '', 130, 58),
        N('refs', 205, 180, 'references/', '分支细节', 1, '', 130, 58),
        N('scripts', 130, 285, 'scripts/', '辅助程序', 1, '', 130, 58),
        N('adapter', 575, 70, '宿主适配器', '运行时专用代码', 2, '', 155, 60),
        N('discovery', 495, 180, '发现路径', '在哪里查找', 3, '', 135, 58),
        N('api', 650, 180, '激活 API', '如何加载', 3, '', 135, 58),
        N('policy', 495, 285, '调用策略', '谁可以选择', 3, '', 135, 58),
        N('binding', 650, 285, '参数绑定', '宿主语法', 3, '', 135, 58),
        N('runtime', 345, 425, '运行时激活', '核心 + 适配器语义', 4, '', 170, 58)
      ],
      edges: [
        E('bundle', 'skill', 1), E('bundle', 'refs', 1), E('bundle', 'scripts', 1),
        E('adapter', 'discovery', 3), E('adapter', 'api', 3), E('adapter', 'policy', 3), E('adapter', 'binding', 3),
        E('bundle', 'runtime', 4), E('adapter', 'runtime', 4)
      ],
      steps: [
        S('保留可移植的技能包', '入口文件及配套文件即使脱离某个宿主，也应保持可理解。', ['bundle']),
        S('将核心职责放在一起', '流程、参考资料和辅助程序以同一目录整体分发。', ['skill', 'refs', 'scripts']),
        S('明确适配器', '运行时语义需要明确的兼容层。', ['adapter']),
        S('宿主行为保持宿主专用', '发现机制、激活 API、策略字段与参数语法都属于这一层。', ['discovery', 'api', 'policy', 'binding']),
        S('在运行时边界组合', '适配器激活可移植技能包，而不改写其核心声明。', ['runtime'])
      ],
      caption: '不要把某个宿主的字段冒充为通用标准。应测试赋予该字段实际语义的适配器。'
    }),

    'skill-authority-chain': makeFigure({
      title: '权限与执行链（Authority and Execution Chain）',
      hint: '激活影响提议，宿主负责授权',
      description: '已激活技能影响模型提议，而提议必须通过能力、权限、批准、隔离与验证各层检查。',
      viewBox: '0 0 980 330',
      nodes: [
        N('skill', 20, 105, '已激活的技能', '流程上下文', 0, '', 125, 62),
        N('model', 165, 105, '模型提议', '结构化操作', 1, '', 125, 62),
        N('capability', 310, 105, '能力注册表', '操作存在', 2, '', 135, 62),
        N('permission', 465, 105, '权限策略', '执行者 + 目标', 3, '', 130, 62),
        N('approval', 615, 105, '需要批准？', '后果门禁', 4, 'decision', 135, 62),
        N('executor', 775, 55, '隔离的执行器', '访问范围受限', 5, '', 140, 62),
        N('stop', 775, 200, '停止并报告', '批准被拒绝', 5, 'warning', 140, 58),
        N('observe', 20, 245, '观测（Observation）', '执行证据', 6, '', 125, 58),
        N('verify', 180, 245, '验证门禁', '契约检查通过', 7, '', 135, 58)
      ],
      edges: [
        E('skill', 'model', 1), E('model', 'capability', 2), E('capability', 'permission', 3), E('permission', 'approval', 4),
        E('approval', 'executor', 5, '策略允许或已批准'), E('approval', 'stop', 5, '已拒绝', 'warning'),
        E('executor', 'observe', 6, '', '', [[845, 117], [930, 117], [930, 275], [145, 275]]), E('observe', 'verify', 7)
      ],
      steps: [
        S('激活改变上下文', '技能可以影响提议，但不会授予任何权限。', ['skill']),
        S('明确表示操作', '执行前审查 argv、cwd、路径、网络、凭据及副作用。', ['model']),
        S('仅开放所需能力', '无法通过宿主请求不存在的操作。', ['capability']),
        S('对执行者和目标授权', '权限策略约束该操作及其范围。', ['permission']),
        S('针对实际后果请求批准', '只有目标与影响具体明确时，批准才有意义。', ['approval']),
        S('执行或停止', '即使获得授权，执行仍须处于隔离环境中。拒绝后不得产生副作用。', ['executor', 'stop']),
        S('收集观测结果', '退出码、差异、文件和工具结果都成为证据。', ['observe']),
        S('独立验证', '边界约束与授权不能证明结果正确。', ['verify'])
      ],
      caption: '能力、权限、批准、沙箱（Sandbox）和验证保护不同属性。应让每一层都可检查。'
    }),

    'skill-trust-surface': makeFigure({
      title: '完整技能信任面（Complete Skill Trust Surface）',
      hint: '标明每条连接由谁控制',
      description: '包内指令、参考资料、任务内容、脚本、宿主工具、文件、网络、凭据及外部影响共同构成威胁面。',
      viewBox: '0 0 900 560',
      nodes: [
        N('package', 30, 55, '技能包', '由发布者控制', 0, '', 145, 60),
        N('resources', 30, 150, '参考资料 + 素材', '配套内容', 0, '', 145, 60),
        N('untrusted', 30, 245, '不可信任务内容', '工单、网页、文档', 0, 'warning', 160, 60),
        N('instructions', 260, 135, '模型指令', '混合信任级别的上下文', 1, 'decision', 160, 66),
        N('scripts', 260, 285, '脚本 + 依赖', '代码供应链', 2, 'warning', 160, 64),
        N('requests', 485, 190, '请求的操作', '结构化提议', 3, 'decision', 160, 66),
        N('host', 690, 190, '宿主工具 + 执行器', '策略执行点', 4, '', 170, 66),
        N('files', 620, 355, '文件', '读取 + 写入', 5, '', 110, 54),
        N('network', 750, 355, '网络（Network）', '出站访问', 5, 'warning', 110, 54),
        N('credentials', 620, 455, '环境 + 凭据', '秘密的使用范围', 5, 'warning', 150, 58),
        N('effects', 780, 455, '外部影响', '发布、删除、计费', 5, 'warning', 110, 58)
      ],
      edges: [
        E('package', 'instructions', 1), E('resources', 'instructions', 1), E('untrusted', 'instructions', 1, '数据，不是权限', 'warning'),
        E('instructions', 'requests', 3), E('scripts', 'requests', 3), E('requests', 'host', 4),
        E('host', 'files', 5), E('host', 'network', 5, '', 'warning'), E('host', 'credentials', 5, '', 'warning'), E('host', 'effects', 5, '', 'warning')
      ],
      steps: [
        S('清点每个内容来源', '包内文件和任务输入都可能影响模型，但它们具有不同的权限地位。', ['package', 'resources', 'untrusted']),
        S('区分数据与指令', '当不可信内容越过这一边界时，就会发生提示词注入（Prompt Injection）。', ['instructions']),
        S('检查代码供应链', '脚本和依赖可以请求产生副作用，而这些请求未必出现在说明文字中。', ['scripts']),
        S('结构化表示提议的操作', '在任何执行器启动之前审查操作。', ['requests']),
        S('在宿主边界强制执行策略', '模型无法为自身提供隔离或权限策略。', ['host']),
        S('约束每类后果涉及的范围', '文件、网络、凭据和外部影响需要各自独立的策略。', ['files', 'network', 'credentials', 'effects'])
      ],
      caption: '信任是一条声明链，跨越包来源、内容、运行时、能力、隔离、凭据和证据。'
    }),

    'skill-approval-decision': makeFigure({
      title: '根据后果决定批准（Approval Follows Consequence）',
      hint: '依据可逆性、范围与影响决策',
      description: '决策树将本地可逆操作导向沙箱执行，将范围外操作导向批准流程，并在批准被拒绝时停止。',
      viewBox: '0 0 900 570',
      nodes: [
        N('action', 35, 65, '提议的操作', '目标 + 后果', 0, '', 145, 60),
        N('reversible', 225, 65, '可逆且限于本地？', '可以回滚', 1, 'decision', 165, 62),
        N('scope', 470, 35, '处于预先批准的范围内？', '执行者 + 操作 + 目标', 2, 'decision', 185, 62),
        N('impact', 470, 180, '涉及外部、破坏性、高成本或敏感影响？', '重大后果', 2, 'decision', 205, 76),
        N('execute', 700, 35, '在沙箱中执行', '继续实施边界约束', 3, '', 165, 62),
        N('ask', 700, 220, '请求限定范围的批准', '展示确切后果', 3, 'warning', 165, 62),
        N('granted', 500, 360, '已批准（Granted）', '不可变的操作记录', 4, '', 135, 58),
        N('denied', 700, 360, '已拒绝（Denied）', '停止', 4, 'warning', 135, 58),
        N('result', 500, 470, '有界执行', '重新校验 + 验证', 5, '', 160, 60)
      ],
      edges: [
        E('action', 'reversible', 1), E('reversible', 'scope', 2, '是'), E('reversible', 'impact', 2, '否'),
        E('scope', 'execute', 3, '是'), E('scope', 'ask', 3, '否', 'warning'), E('impact', 'ask', 3, '是', 'warning'), E('impact', 'execute', 3, '否'),
        E('ask', 'granted', 4, '已批准'), E('ask', 'denied', 4, '已拒绝', 'warning'),
        E('execute', 'result', 5), E('granted', 'result', 5)
      ],
      steps: [
        S('明确操作', '笼统地请求开放通用 shell，无法让人评估是否应当批准。', ['action']),
        S('检查可逆性与本地性', '本地可逆操作通常可以纳入预先授权的策略。', ['reversible']),
        S('检查范围或后果', '范围外或影响重大的工作，需要明确作出授权决策。', ['scope', 'impact']),
        S('执行或请求批准', '批准不能替代沙箱隔离，沙箱隔离也不代表批准。', ['execute', 'ask']),
        S('遵守决定', '一次批准绑定一个操作；拒绝意味着停止该操作。', ['granted', 'denied']),
        S('启动前重新校验', '执行器再次检查规范化后的目标，并在执行后验证结果。', ['result'])
      ],
      caption: '批准请求应展示确切目标和后果。批准绝不意味着关闭隔离，也不会为后续目标授权。'
    }),

    'skill-workflow-extraction': makeFigure({
      title: '判断与确定性工作（Judgment and Deterministic Work）',
      hint: '将每项行为放到可测试的位置',
      description: '任务依次经过模型分类、分支参考资料、确定性证据收集、模型解读、交付物契约与验证。',
      viewBox: '0 0 950 300',
      zones: [Z(15, 25, 920, 225, '可观察的工作流契约')],
      nodes: [
        N('task', 30, 100, '任务请求', '触发边界', 0, '', 125, 62),
        N('classify', 175, 100, '模型判断', '分类 + 选择分支', 1, 'decision', 135, 62),
        N('reference', 330, 100, '参考资料（Reference）', '分支专用规则', 2, '', 135, 62),
        N('script', 485, 100, '脚本或工具', '收集证据', 3, '', 135, 62),
        N('interpret', 640, 100, '模型判断', '解读证据', 4, 'decision', 135, 62),
        N('artifact', 795, 55, '交付物契约', '必需输出', 5, '', 135, 62),
        N('verify', 795, 160, '验证（Verification）', '机器 + 人工', 6, '', 135, 62)
      ],
      edges: [E('task', 'classify', 1), E('classify', 'reference', 2), E('reference', 'script', 3), E('script', 'interpret', 4), E('interpret', 'artifact', 5), E('artifact', 'verify', 6)],
      steps: [
        S('从真实触发条件开始', '候选工作流始于范围明确的事件和预期交付物。', ['task']),
        S('用判断处理歧义', '模型对任务分类并选择分支。', ['classify']),
        S('加载确切的领域规则', '参考资料只为选中的分支提供详细信息。', ['reference']),
        S('自动收集确定性证据', '脚本与有类型约束的工具负责解析、计数、查询和校验。', ['script']),
        S('解读观测结果', '模型综合证据，而不模拟确定性解析。', ['interpret']),
        S('按交付物契约输出', '必填字段与路径让“完成”成为可观察的声明。', ['artifact']),
        S('通过另一种机制验证', '机器检查与经过校准的人工审查共同闭合工作流。', ['verify'])
      ],
      caption: '用模型判断完成分类和综合；用代码完成可重复计算及不变量检查。'
    }),

    'skill-eval-layers': makeFigure({
      title: '六层技能发布门禁（Six-layer Skill Release Gate）',
      hint: '不要用平均分掩盖硬性失败',
      description: '结构、路由、行为、脚本、安全和可移植性这六个评估层共同决定发布门禁是否通过。',
      viewBox: '0 0 780 590',
      nodes: [
        N('structure', 210, 35, '1. 技能包结构', '静态契约', 0, '', 360, 58),
        N('routing', 210, 115, '2. 触发路由', '精确率 + 召回率 + 弃选', 1, '', 360, 58),
        N('behavior', 210, 195, '3. 交付物行为', '基线组与实验组', 2, '', 360, 58),
        N('scripts', 210, 275, '4. 脚本正确性', '测试样本 + 边界用例', 3, '', 360, 58),
        N('safety', 210, 355, '5. 安全 + 权限', '硬性边界用例', 4, 'warning', 360, 58),
        N('portability', 210, 435, '6. 打包 + 可移植性', '干净安装 + 宿主矩阵', 5, '', 360, 58),
        N('gate', 270, 520, '发布门禁', '所有必需层都通过', 6, 'decision', 240, 52)
      ],
      edges: [E('structure', 'routing', 1), E('routing', 'behavior', 2), E('behavior', 'scripts', 3), E('scripts', 'safety', 4), E('safety', 'portability', 5), E('portability', 'gate', 6)],
      steps: [
        S('结构', '静态检查技能包身份、文件、链接、限制及必需章节。', ['structure']),
        S('路由（Routing）', '测量正例、负例、近似但不匹配的请求、竞争技能和弃选表现。', ['routing']),
        S('行为（Behavior）', '固定模型、工具、测试样本和预算，比较使用与不使用技能的表现。', ['behavior']),
        S('脚本（Scripts）', '在模型运行之外测试确定性辅助程序，包括重复执行及部分完成状态。', ['scripts']),
        S('安全（Safety）', '每个权限与边界约束用例都必须通过。再有说服力的文字也不能抵消违规。', ['safety']),
        S('打包与可移植性', '安装完整目录树，测试必需的宿主能力或声明的回退方案。', ['portability']),
        S('只有通过门禁才发布', '报告失败层及证据，不要把所有结果压缩成一个分数。', ['gate'])
      ],
      caption: '每个评估（Evaluation）层回答不同问题。通过某一层绝不能替代另一层。'
    }),

    'skill-package-install': makeFigure({
      title: '干净安装完整性路径（Clean Install Integrity Path）',
      hint: '测试安装后的目录树，不仅测试源码',
      description: '源技能包依次形成清单、完整安装目录树、经校验的包、被发现的目录条目，最后运行评估冒烟测试。',
      viewBox: '0 0 900 270',
      nodes: [
        N('source', 25, 92, '源技能包', '已审查的目录树', 0, '', 135, 62),
        N('manifest', 190, 92, '生成清单（Manifest）', '规范路径 + 哈希', 1, '', 140, 62),
        N('install', 360, 92, '安装完整目录树', '干净的目标目录', 2, '', 145, 62),
        N('hash', 535, 92, '校验路径 + 哈希', '检测缺失或偏移', 3, '', 145, 62),
        N('discover', 710, 45, '发现已安装技能', '实际作用域', 4, '', 160, 62),
        N('smoke', 710, 155, '运行评估冒烟测试', '已安装副本', 5, '', 160, 62)
      ],
      edges: [E('source', 'manifest', 1), E('manifest', 'install', 2), E('install', 'hash', 3), E('hash', 'discover', 4), E('discover', 'smoke', 5)],
      steps: [
        S('从完整源码树开始', '发布单元包含每个被引用的文件、脚本、素材和测试样本。', ['source']),
        S('描述预期文件内容', '规范的相对路径与哈希使内容偏移可被检测。', ['manifest']),
        S('安装到空目标目录', '干净目录树会暴露遗漏文件及升级遗留的旧文件。', ['install']),
        S('激活前先校验', '发现包内文件缺失、多出、被改写或不匹配时，应拒绝使用。', ['hash']),
        S('测试真实发现流程', '安装作用域与宿主目录必须能找到预期身份。', ['discover']),
        S('执行安装副本的冒烟测试', '仅源码测试成功，不能证明安装器或运行时行为正确。', ['smoke'])
      ],
      caption: '技能包测试应覆盖已安装副本。源码树测试会漏掉安装器和升级故障。'
    }),

    'skill-authoring-loop': makeFigure({
      title: '技能编写修复循环（Skill Authoring Repair Loop）',
      hint: '修改真正导致失败的层',
      description: '先观察工作流、定义契约、打包和评估，再按失败层分类并修复，只有通过门禁后才能发布。',
      viewBox: '0 0 980 610',
      nodes: [
        N('observe', 30, 55, '观察工作流', '真实专家实践', 0, '', 145, 60),
        N('contract', 210, 55, '定义契约', '触发条件 + 交付物 + 安全', 1, '', 145, 60),
        N('package', 390, 55, '打包操作流程', '正文 + 辅助程序', 2, '', 145, 60),
        N('eval', 570, 55, '运行分层评估', '重复 + 比较', 3, '', 145, 60),
        N('failure', 750, 55, '失败属于哪一类？', '正确分派修复', 4, 'decision', 155, 60),
        N('routing', 50, 250, '路由（Routing）', '描述或策略', 5, '', 135, 58),
        N('behavior', 210, 250, '行为（Behavior）', '正文、参考资料、工具', 5, '', 135, 58),
        N('script', 370, 250, '脚本（Script）', '确定性代码', 5, '', 135, 58),
        N('safety', 530, 250, '安全（Safety）', '权限 + 隔离', 5, 'warning', 135, 58),
        N('portability', 690, 250, '可移植性（Portability）', '适配器或回退方案', 5, '', 135, 58),
        N('reeval', 370, 400, '重跑受影响评估', '保留所有轨迹', 6, '', 170, 60),
        N('release', 625, 500, '发布完整技能包', '门禁已通过', 7, '', 190, 60)
      ],
      edges: [
        E('observe', 'contract', 1), E('contract', 'package', 2), E('package', 'eval', 3), E('eval', 'failure', 4),
        E('failure', 'routing', 5, '路由'), E('failure', 'behavior', 5, '行为'), E('failure', 'script', 5, '脚本'),
        E('failure', 'safety', 5, '安全', 'warning'), E('failure', 'portability', 5, '可移植性'),
        E('routing', 'reeval', 6), E('behavior', 'reeval', 6), E('script', 'reeval', 6), E('safety', 'reeval', 6), E('portability', 'reeval', 6),
        E('reeval', 'eval', 6, '新证据', '', [[455, 400], [455, 355], [642, 355], [642, 115]]),
        E('failure', 'release', 7, '通过门禁')
      ],
      steps: [
        S('观察真实工作', '从证据中提取稳定流程，而不是从宽泛的主题标签出发。', ['observe']),
        S('定义可观察的契约', '先写明触发条件、交付物、验证方式和权限边界。', ['contract']),
        S('分别组织各项职责', '将判断、确定性工作、参考资料和输出放到可测试的位置。', ['package']),
        S('运行分层评估', '分别保留路由、行为、脚本、安全和可移植性的证据。', ['eval']),
        S('对失败分类', '发布门禁应指出实际出错的层。', ['failure']),
        S('修复责任层', '当故障来自安装器、脚本、沙箱或宿主适配器时，不要用增加说明文字代替修复。', ['routing', 'behavior', 'script', 'safety', 'portability']),
        S('携带新证据重新评估', '保留每次运行轨迹，并检查未修改的层是否出现回归。', ['reeval']),
        S('门禁通过后再发布', '将完整技能包与兼容性证据一起交付。', ['release'])
      ],
      caption: '修复导致失败的层，然后重新执行门禁检查。绝不能让平均分掩盖硬性安全回归。'
    })
  };

  LF.register(figures);
})();
