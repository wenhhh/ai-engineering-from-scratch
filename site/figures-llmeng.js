/* figures-llmeng.js：阶段 11（大语言模型工程（LLM engineering））
   与阶段 13（工具与协议（Tools & protocols））的交互课程图表。在 lesson-figures.js 之后加载，
   通过 window.LF.register 注册。原生 ES5，无依赖，主题由 CSS 变量控制。编写时
   仍使用相同的围栏块：
       ```figure
       few-shot-curve
       ```  */
(function () {
  'use strict';
  var LF = window.LF;
  if (!LF) { return; }
  var el = LF.el, svgEl = LF.svgEl, slider = LF.slider, clamp = LF.clamp;

  // ── few-shot-curve: 准确率与上下文示例（In-context examples）数量 k 的关系 ──
  function fewShotCurve(host) {
    var state = { k: 4 };
    var W = 520, H = 220, PAD = 32, KMAX = 16;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var num = el('span', { class: 'lf-num' });
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });
    var A0 = 0.42, AMAX = 0.92;
    function acc(k) { return A0 + (AMAX - A0) * (1 - Math.exp(-k / 3.5)); }
    function px(k) { return PAD + k / KMAX * (W - 2 * PAD); }
    function py(a) { return H - PAD - (a - 0.3) / 0.7 * (H - 2 * PAD); }
    state._render = function () {
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      svg.appendChild(svgEl('line', { x1: PAD, y1: py(AMAX), x2: W - PAD, y2: py(AMAX), stroke: 'var(--rule-soft,#ddd)', 'stroke-width': '1', 'stroke-dasharray': '3 3' }));
      var d = '', i;
      for (i = 0; i <= 120; i++) { var k = KMAX * i / 120; d += (i ? 'L' : 'M') + px(k).toFixed(1) + ' ' + py(acc(k)).toFixed(1) + ' '; }
      svg.appendChild(svgEl('path', { d: d, fill: 'none', stroke: 'var(--blueprint,#3553ff)', 'stroke-width': '2' }));
      svg.appendChild(svgEl('circle', { cx: px(0), cy: py(acc(0)), r: '3.5', fill: 'var(--ink-mute,#777)' }));
      svg.appendChild(svgEl('circle', { cx: px(state.k), cy: py(acc(state.k)), r: '5', fill: 'var(--blueprint,#3553ff)' }));
      var a = acc(state.k), gap = a - acc(0);
      num.innerHTML = (a * 100).toFixed(1) + ' <small>% 准确率</small>';
      meta.textContent = (state.k === 0 ? '零样本基线' : state.k + ' 个示例') + ' · 比零样本提高 ' + (gap * 100).toFixed(1) + ' 个百分点 · ' + (state.k >= 8 ? '平台期：增加示例几乎无收益' : '仍在上升');
      formula.textContent = 'accuracy(k) = ' + (A0 * 100).toFixed(0) + '% + (' + ((AMAX - A0) * 100).toFixed(0) + ' 个百分点)(1 − e^(−k/3.5)) · 边际收益递减';
    };
    var grid = el('div', {}, [slider(state, 'k', '上下文示例数 k', 0, KMAX, 1)]);
    host.appendChild(el('div', { class: 'lf' }, [
      el('div', { class: 'lf-head' }, [el('span', { class: 'lf-label' }, ['少样本曲线（Few-shot Curve）']), el('span', {}, ['拖动示例数量'])]),
      el('div', { class: 'lf-body' }, [grid, el('div', { class: 'lf-out' }, [svg, el('div', { style: 'margin-top:10px' }, [num]), meta, formula])]),
      el('div', { class: 'lf-cap' }, ['向提示词加入带标签示例，最初会快速提升准确率（Accuracy），随后趋于平缓。灰点是零样本（Zero-shot）基线；前几个示范弥补了大部分差距，再继续增加示例，几乎不再带来收益，却仍消耗词元。关键是选出足以达到平台期（Plateau）的最小示例集。'])
    ]));
    state._render();
  }

  // ── cot-decomposition: 将难题拆成推理步骤（Reasoning steps），展示思维链（CoT）带来的提升 ──
  function cotDecomposition(host) {
    var state = { cot: 'on' };
    var W = 520, H = 220, PAD = 18;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var num = el('span', { class: 'lf-num' });
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });
    var STEPS = ['读题', '查找费率', '相乘', '加税', '回答'];
    function box(x, y, w, h, label, fill, tcol) {
      var g = svgEl('g', {});
      g.appendChild(svgEl('rect', { x: x, y: y, width: w, height: h, rx: '4', fill: fill, stroke: 'var(--ink-soft,#555)', 'stroke-width': '1.2' }));
      var t = svgEl('text', { x: (x + w / 2).toFixed(1), y: (y + h / 2 + 4).toFixed(1), 'text-anchor': 'middle', 'font-family': 'monospace', 'font-size': '11', fill: tcol });
      t.appendChild(document.createTextNode(label));
      g.appendChild(t);
      return g;
    }
    state._render = function () {
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      var on = state.cot === 'on';
      var qY = 24, aY = H - 56, bh = 34;
      svg.appendChild(box(PAD, qY, 150, bh, '问题', 'var(--bg,#fafaf5)', 'var(--ink,#1a1a1a)'));
      svg.appendChild(box(W - PAD - 150, aY, 150, bh, '回答', 'var(--blueprint,#3553ff)', 'var(--bg,#fafaf5)'));
      if (on) {
        var n = STEPS.length, midY = (qY + aY) / 2, bw = (W - 2 * PAD) / n - 8, sh = 28;
        var i, prevX = PAD + 75, prevY = qY + bh;
        for (i = 0; i < n; i++) {
          var x = PAD + i * ((W - 2 * PAD) / n) + 4, cx = x + bw / 2;
          svg.appendChild(svgEl('line', { x1: prevX, y1: prevY, x2: cx, y2: midY, stroke: 'var(--blueprint,#3553ff)', 'stroke-width': '1.4', opacity: '0.6' }));
          svg.appendChild(box(x, midY - sh / 2, bw, sh, String(i + 1), 'var(--bg-surface,#eee)', 'var(--ink,#1a1a1a)'));
          prevX = cx; prevY = midY + sh / 2;
        }
        svg.appendChild(svgEl('line', { x1: prevX, y1: prevY, x2: W - PAD - 75, y2: aY, stroke: 'var(--blueprint,#3553ff)', 'stroke-width': '1.4', opacity: '0.6' }));
      } else {
        svg.appendChild(svgEl('line', { x1: PAD + 75, y1: qY + bh, x2: W - PAD - 75, y2: aY, stroke: 'var(--rule-soft,#ccc)', 'stroke-width': '1.4', 'stroke-dasharray': '4 3' }));
        var qm = svgEl('text', { x: (W / 2).toFixed(1), y: ((qY + aY) / 2 + 4).toFixed(1), 'text-anchor': 'middle', 'font-family': 'monospace', 'font-size': '13', fill: 'var(--ink-mute,#777)' });
        qm.appendChild(document.createTextNode('（不展示过程）'));
        svg.appendChild(qm);
      }
      var accDirect = 0.38, accCoT = 0.71;
      var a = on ? accCoT : accDirect;
      num.innerHTML = (a * 100).toFixed(0) + ' <small>% 解题成功率</small>';
      meta.textContent = on ? '思维链：5 个中间步骤，使每个子步骤都可检查 · 提高 ' + ((accCoT - accDirect) * 100).toFixed(0) + ' 个百分点' : '直接回答：模型必须一次跨过所有步骤';
      formula.textContent = on ? 'prompt += "让我们逐步推理" → 展示中间状态' : 'answer = f(question)，一次前向传播得到回答';
    };
    var grid = el('div', {}, [LF.select(state, 'cot', '推理方式', [['启用思维链（CoT）', 'on'], ['直接回答（关闭）', 'off']])]);
    host.appendChild(el('div', { class: 'lf' }, [
      el('div', { class: 'lf-head' }, [el('span', { class: 'lf-label' }, ['思维链（Chain of Thought，CoT）']), el('span', {}, ['切换是否展示过程'])]),
      el('div', { class: 'lf-body' }, [grid, el('div', { class: 'lf-out' }, [svg, el('div', { style: 'margin-top:10px' }, [num]), meta, formula])]),
      el('div', { class: 'lf-cap' }, ['让模型直接回答难题，会迫使它将所有步骤压缩成一次跳跃，因此经常出错。思维链要求写出中间步骤，将一次大跨度推理拆成一串各自较容易的小步骤。每个可见子步骤，也都给模型提供了发现自身错误的机会。'])
    ]));
    state._render();
  }

  // ── constrained-decoding: 语法掩码（Grammar mask）使不符合模式（Schema）的词元变灰 ──
  function constrainedDecoding(host) {
    var state = { step: 1 };
    var rows = el('div', {});
    var num = el('span', { class: 'lf-num' });
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });
    // 各语法状态（Grammar state）的下一词元候选；有效 = JSON schema 允许
    var STATES = [
      { ctx: '', valid: ['{'], cands: ['{', 'hello', '42', '[', 'true'] },
      { ctx: '{', valid: ['"'], cands: ['"', '{', '42', 'name', ':'] },
      { ctx: '{ "', valid: ['name', 'age'], cands: ['name', 'age', '}', '123', ','] },
      { ctx: '{ "name"', valid: [':'], cands: [':', '"', '}', 'foo', '42'] },
      { ctx: '{ "name":', valid: ['"'], cands: ['"', '{', 'true', '42', ']'] }
    ];
    state._render = function () {
      var st = STATES[state.step];
      while (rows.firstChild) rows.removeChild(rows.firstChild);
      var allowed = 0;
      st.cands.forEach(function (tok) {
        var ok = st.valid.indexOf(tok) >= 0;
        if (ok) allowed++;
        var bar = el('i'); bar.style.width = ok ? '100%' : '12%';
        if (!ok) bar.style.background = 'var(--rule-soft,#ccc)';
        var lab = el('label', {}, ['"' + tok + '"', el('b', {}, [ok ? '允许' : '已屏蔽'])]);
        if (!ok) lab.style.opacity = '0.4';
        rows.appendChild(el('div', { class: 'lf-ctrl' }, [lab, el('div', { class: 'lf-bar' }, [bar])]));
      });
      num.innerHTML = allowed + ' <small>/ ' + st.cands.length + ' 个词元合法</small>';
      meta.textContent = '当前已生成：' + (st.ctx || '（空）') + ' · 语法只允许能使输出继续符合模式的词元';
      formula.textContent = 'softmax 前设置 logits[invalid] = −∞ → 模型只能采样模式允许的下一词元';
    };
    var grid = el('div', {}, [slider(state, 'step', '解码位置', 0, STATES.length - 1, 1)]);
    host.appendChild(el('div', { class: 'lf' }, [
      el('div', { class: 'lf-head' }, [el('span', { class: 'lf-label' }, ['约束解码（Constrained Decoding）']), el('span', {}, ['拖动以逐步查看 JSON'])]),
      el('div', { class: 'lf-body' }, [grid, el('div', { class: 'lf-out' }, [rows, num, meta, formula])]),
      el('div', { class: 'lf-cap' }, ['结构化输出（Structured Output）在解码时强制执行语法约束。每个位置都根据模式（Schema）计算合法的下一词元，并在采样前将其余词元的未归一化得分（Logit）设为负无穷。模型仍然自行选择，但只能从允许集合中选择，因此结果始终是可解析的 JSON，而非碰巧看起来像 JSON 的自由文本。'])
    ]));
    state._render();
  }

  // ── prompt-cache-hit: 共享前缀（Shared-prefix）长度与命中率降低延迟和成本 ──
  function promptCacheHit(host) {
    var state = { prefix: 70, hit: 80 };
    var W = 520, H = 120, PAD = 20;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var num = el('span', { class: 'lf-num' });
    var bar = el('i');
    var barWrap = el('div', { class: 'lf-bar' }, [bar]);
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });
    state._render = function () {
      var pf = state.prefix / 100, hr = state.hit / 100;
      var saved = hr * pf;
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      var inX = PAD, inW = W - 2 * PAD, y = 40, h = 40;
      var pw = inW * pf;
      svg.appendChild(svgEl('rect', { x: inX, y: y, width: pw.toFixed(1), height: h, rx: '3', fill: 'var(--bg-surface,#eee)', stroke: 'var(--blueprint,#3553ff)', 'stroke-width': '1.2', 'stroke-dasharray': '4 3' }));
      svg.appendChild(svgEl('rect', { x: (inX + pw).toFixed(1), y: y, width: (inW - pw).toFixed(1), height: h, rx: '3', fill: 'var(--blueprint,#3553ff)', opacity: '0.85' }));
      var t1 = svgEl('text', { x: inX, y: (y + h + 16).toFixed(1), 'text-anchor': 'start', 'font-family': 'monospace', 'font-size': '10', fill: 'var(--ink-mute,#777)' });
      t1.appendChild(document.createTextNode('缓存前缀 ' + state.prefix + '%'));
      svg.appendChild(t1);
      var t2 = svgEl('text', { x: inX + inW, y: (y + h + 16).toFixed(1), 'text-anchor': 'end', 'font-family': 'monospace', 'font-size': '10', fill: 'var(--ink-soft,#555)' });
      t2.appendChild(document.createTextNode('新增 ' + (100 - state.prefix) + '%'));
      svg.appendChild(t2);
      num.innerHTML = (saved * 100).toFixed(1) + ' <small>% 预填充开销被节省</small>';
      bar.style.width = (saved * 100).toFixed(1) + '%';
      barWrap.classList.toggle('over', saved > 0.6);
      meta.textContent = '命中率 ' + state.hit + '% · 缓存前缀无需重新计算 · 成本与首词元延迟均降低约 ' + (saved * 100).toFixed(0) + '%';
      formula.textContent = 'saved = hit_rate × prefix_fraction = ' + hr.toFixed(2) + ' × ' + pf.toFixed(2) + ' = ' + saved.toFixed(2);
    };
    var grid = el('div', { class: 'lf-grid' }, [
      slider(state, 'prefix', '共享前缀占提示词比例（%）', 0, 100, 1),
      slider(state, 'hit', '缓存命中率（%）', 0, 100, 1)
    ]);
    host.appendChild(el('div', { class: 'lf' }, [
      el('div', { class: 'lf-head' }, [el('span', { class: 'lf-label' }, ['提示词缓存命中（Prompt Cache Hit）']), el('span', {}, ['拖动前缀比例与命中率'])]),
      el('div', { class: 'lf-body' }, [grid, el('div', { class: 'lf-out' }, [svg, num, barWrap, meta, formula])]),
      el('div', { class: 'lf-cap' }, ['跨调用重复出现的长系统提示词或文档，可以只预填充（Prefill）一次并复用。缓存前缀（虚线）跳过重复计算，系统只处理新增后缀（实心）。节省比例等于命中率（Hit Rate）乘以前缀占比：共享前缀越长、命中越频繁，缓存收益越大。'])
    ]));
    state._render();
  }

  // ── semantic-cache: 相似度阈值（Similarity threshold）权衡命中率与安全性 ──
  function semanticCache(host) {
    var state = { thr: 0.85 };
    var W = 520, H = 200, PAD = 26;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var num = el('span', { class: 'lf-num' });
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });
    // 确定性传入查询：与最近缓存条目的余弦相似度（Cosine similarity），
    // 以及缓存答案对该查询是否确实正确
    var Q = [
      { sim: 0.97, ok: true }, { sim: 0.93, ok: true }, { sim: 0.90, ok: true },
      { sim: 0.88, ok: true }, { sim: 0.84, ok: false }, { sim: 0.80, ok: true },
      { sim: 0.76, ok: false }, { sim: 0.71, ok: false }, { sim: 0.62, ok: true },
      { sim: 0.50, ok: false }
    ];
    function px(s) { return PAD + (s - 0.4) / 0.6 * (W - 2 * PAD); }
    state._render = function () {
      var thr = state.thr;
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      var tx = px(thr);
      svg.appendChild(svgEl('rect', { x: tx.toFixed(1), y: PAD, width: (W - PAD - tx).toFixed(1), height: (H - 2 * PAD).toFixed(1), fill: 'var(--blueprint,#3553ff)', opacity: '0.06' }));
      svg.appendChild(svgEl('line', { x1: tx, y1: PAD - 4, x2: tx, y2: H - PAD, stroke: 'var(--warn,#b8870f)', 'stroke-width': '1.5' }));
      var hits = 0, wrong = 0;
      Q.forEach(function (q, i) {
        var hit = q.sim >= thr;
        if (hit) { hits++; if (!q.ok) wrong++; }
        var cy = PAD + (i + 0.5) / Q.length * (H - 2 * PAD);
        var col = !hit ? 'var(--rule-soft,#ccc)' : (q.ok ? 'var(--blueprint,#3553ff)' : 'var(--warn,#b8870f)');
        svg.appendChild(svgEl('circle', { cx: px(q.sim), cy: cy.toFixed(1), r: hit ? '5' : '3.5', fill: col }));
      });
      num.innerHTML = hits + ' <small>/ ' + Q.length + ' 个请求由缓存响应</small>';
      meta.textContent = '阈值 ' + thr.toFixed(2) + ' · 其中 ' + wrong + ' 次命中返回错误回答 · ' + (thr >= 0.9 ? '阈值高：命中少，较安全' : thr <= 0.7 ? '阈值低：命中多，风险高' : '较为均衡');
      formula.textContent = 'cos(query, cached) ≥ ' + thr.toFixed(2) + ' 时返回缓存回答 · 阈值越低，命中越多，风险越高';
    };
    var grid = el('div', {}, [slider(state, 'thr', '相似度阈值', 0.5, 0.99, 0.01)]);
    host.appendChild(el('div', { class: 'lf' }, [
      el('div', { class: 'lf-head' }, [el('span', { class: 'lf-label' }, ['语义缓存（Semantic Cache）']), el('span', {}, ['拖动阈值'])]),
      el('div', { class: 'lf-body' }, [grid, el('div', { class: 'lf-out' }, [svg, num, meta, formula])]),
      el('div', { class: 'lf-cap' }, ['语义缓存在新查询与已存条目的嵌入（Embedding）足够接近时，复用已有回答。每个点表示一个到达的查询，其位置取决于与最近缓存条目的余弦相似度（Cosine Similarity）；橙线右侧阴影区域由缓存响应。提高阈值会减少命中，但很少返回错误回答；降低阈值会增加缓存复用，却可能返回过时或不匹配的回答（橙点）。'])
    ]));
    state._render();
  }

  // ── function-call-args: 模型选择工具，再填充有类型的 JSON 槽位（Typed slots） ──
  function functionCallArgs(host) {
    var state = { step: 2 };
    var W = 520, H = 200, PAD = 18;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var code = el('div', { class: 'lf-formula' });
    var meta = el('div', { class: 'lf-meta' });
    // 根据用户请求逐步填充模式槽位（Schema slots）
    var SLOTS = [
      { name: 'tool', type: 'enum', val: 'book_flight' },
      { name: 'from', type: 'string', val: '"BOM"' },
      { name: 'to', type: 'string', val: '"SFO"' },
      { name: 'date', type: 'date', val: '"2026-07-01"' },
      { name: 'pax', type: 'int', val: '2' }
    ];
    var REQUEST = '预订 7 月 1 日从孟买到旧金山的 2 个座位';
    function box(x, y, w, h, label, active) {
      var g = svgEl('g', {});
      g.appendChild(svgEl('rect', { x: x, y: y, width: w, height: h, rx: '3', fill: active ? 'var(--blueprint,#3553ff)' : 'var(--bg-surface,#eee)', stroke: 'var(--ink-soft,#555)', 'stroke-width': '1.1' }));
      var t = svgEl('text', { x: (x + 8).toFixed(1), y: (y + h / 2 + 4).toFixed(1), 'font-family': 'monospace', 'font-size': '10.5', fill: active ? 'var(--bg,#fafaf5)' : 'var(--ink,#1a1a1a)' });
      t.appendChild(document.createTextNode(label));
      g.appendChild(t);
      return g;
    }
    state._render = function () {
      var s = state.step;
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      var rq = svgEl('text', { x: PAD, y: 22, 'font-family': 'monospace', 'font-size': '10.5', fill: 'var(--ink-soft,#555)' });
      rq.appendChild(document.createTextNode('请求：' + REQUEST));
      svg.appendChild(rq);
      var y0 = 36, rh = 28, w = W - 2 * PAD;
      SLOTS.forEach(function (slot, i) {
        var filled = i <= s;
        var y = y0 + i * (rh + 2);
        var label = slot.name + ' : ' + slot.type + (filled ? '  =  ' + slot.val : '  =  ?');
        svg.appendChild(box(PAD, y, w, rh, label, filled));
      });
      code.textContent = '{ ' + SLOTS.slice(0, s + 1).map(function (sl) { return '"' + sl.name + '": ' + sl.val; }).join(', ') + (s < SLOTS.length - 1 ? ', ... ' : ' ') + '}';
      meta.textContent = '已填充 ' + (s + 1) + ' / ' + SLOTS.length + ' 个槽位 · 模型先选择工具，再从请求中抽取每个带类型的参数';
    };
    var grid = el('div', {}, [slider(state, 'step', '已填充参数', 0, SLOTS.length - 1, 1)]);
    host.appendChild(el('div', { class: 'lf' }, [
      el('div', { class: 'lf-head' }, [el('span', { class: 'lf-label' }, ['函数调用参数（Function Call Arguments）']), el('span', {}, ['拖动以填充模式'])]),
      el('div', { class: 'lf-body' }, [grid, el('div', { class: 'lf-out' }, [svg, code, meta])]),
      el('div', { class: 'lf-cap' }, ['函数调用（Function Calling）包含两项工作。模型先从可用工具集中选择要调用的工具，再从用户请求抽取值，填入该工具带类型的参数模式（Argument Schema）。输出是可以执行的结构化调用：工具名加一个 JSON 对象，其中各字段符合声明的类型。'])
    ]));
    state._render();
  }

  // ── llm-judge-rubric: 加权评分量规（Rubric）得分，大语言模型评判（LLM-as-judge）汇总 ──
  function llmJudgeRubric(host) {
    var state = { wHelp: 40, wCorr: 40, wSafe: 20 };
    var rows = el('div', {});
    var num = el('span', { class: 'lf-num' });
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });
    // 评判者对某个回答的逐项评分，范围为 0..1
    var CRIT = [
      { key: 'wHelp', label: '有用性', score: 0.85 },
      { key: 'wCorr', label: '正确性', score: 0.60 },
      { key: 'wSafe', label: '安全性', score: 0.95 }
    ];
    state._render = function () {
      var wsum = state.wHelp + state.wCorr + state.wSafe;
      if (wsum <= 0) wsum = 1;
      while (rows.firstChild) rows.removeChild(rows.firstChild);
      var total = 0;
      CRIT.forEach(function (c) {
        var w = state[c.key] / wsum;
        total += w * c.score;
        var bar = el('i'); bar.style.width = (c.score * 100).toFixed(0) + '%';
        rows.appendChild(el('div', { class: 'lf-ctrl' }, [
          el('label', {}, [c.label + '（权重 ' + (w * 100).toFixed(0) + '%）', el('b', {}, [c.score.toFixed(2)])]),
          el('div', { class: 'lf-bar' }, [bar])
        ]));
      });
      num.innerHTML = total.toFixed(3) + ' <small>加权得分</small>';
      meta.textContent = '权重归一化后总和为 1 · 提高正确性权重会降低此回答总分，因为这一项得分最低';
      formula.textContent = 'score = Σ (wᵢ / Σw) · sᵢ  ·  s = [0.85, 0.60, 0.95] · 裁判逐项评分，评分规程汇总结果';
    };
    var grid = el('div', { class: 'lf-grid' }, [
      slider(state, 'wHelp', '有用性权重', 0, 100, 1),
      slider(state, 'wCorr', '正确性权重', 0, 100, 1),
      slider(state, 'wSafe', '安全性权重', 0, 100, 1)
    ]);
    host.appendChild(el('div', { class: 'lf' }, [
      el('div', { class: 'lf-head' }, [el('span', { class: 'lf-label' }, ['大模型裁判（LLM-as-a-Judge）评分规程']), el('span', {}, ['拖动评分权重'])]),
      el('div', { class: 'lf-body' }, [grid, el('div', { class: 'lf-out' }, [rows, num, meta, formula])]),
      el('div', { class: 'lf-cap' }, ['大模型裁判（LLM-as-a-Judge）从多个维度评价回答，这里是有用性（Helpfulness）、正确性（Correctness）和安全性（Safety）。最终得分是加权平均，权重体现你真正关注的内容。这个回答的安全性较高，但正确性较低，因此评分规程（Rubric）越重视正确性，总分就越低。好坏标准由权重决定，而非由模型决定。'])
    ]));
    state._render();
  }

  // ── lost-in-the-middle: 检索准确率（Retrieval accuracy）随事实位置呈 U 形 ──
  function lostInTheMiddle(host) {
    var state = { pos: 50 };
    var W = 520, H = 220, PAD = 32;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var num = el('span', { class: 'lf-num' });
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });
    // U 形：两端较高（近因效应（Recency）+ 首因效应（Primacy）），中间下凹
    function acc(p) { var x = p / 100; var u = 0.40 + 0.55 * Math.pow(2 * x - 1, 2); return clamp(u, 0, 1); }
    function px(p) { return PAD + p / 100 * (W - 2 * PAD); }
    function py(a) { return H - PAD - (a - 0.3) / 0.7 * (H - 2 * PAD); }
    state._render = function () {
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      var d = '', i;
      for (i = 0; i <= 120; i++) { var p = 100 * i / 120; d += (i ? 'L' : 'M') + px(p).toFixed(1) + ' ' + py(acc(p)).toFixed(1) + ' '; }
      svg.appendChild(svgEl('path', { d: d, fill: 'none', stroke: 'var(--blueprint,#3553ff)', 'stroke-width': '2' }));
      var s = svgEl('text', { x: PAD, y: H - 8, 'font-family': 'monospace', 'font-size': '10', fill: 'var(--ink-mute,#777)' });
      s.appendChild(document.createTextNode('上下文开头'));
      svg.appendChild(s);
      var e = svgEl('text', { x: (W - PAD).toFixed(1), y: H - 8, 'text-anchor': 'end', 'font-family': 'monospace', 'font-size': '10', fill: 'var(--ink-mute,#777)' });
      e.appendChild(document.createTextNode('上下文结尾'));
      svg.appendChild(e);
      svg.appendChild(svgEl('circle', { cx: px(state.pos), cy: py(acc(state.pos)), r: '5', fill: 'var(--blueprint,#3553ff)' }));
      var a = acc(state.pos);
      num.innerHTML = (a * 100).toFixed(0) + ' <small>% 检索准确率</small>';
      meta.textContent = '事实位于上下文的 ' + state.pos + '% 处 · ' + (state.pos < 20 || state.pos > 80 ? '靠近两端：容易回忆' : '埋在中间：容易遗漏');
      formula.textContent = 'accuracy(pos) ≈ 0.40 + 0.55·(2·pos − 1)² · U 形：首因效应 + 近因效应，中间下降';
    };
    var grid = el('div', {}, [slider(state, 'pos', '关键事实位置（上下文百分比）', 0, 100, 1)]);
    host.appendChild(el('div', { class: 'lf' }, [
      el('div', { class: 'lf-head' }, [el('span', { class: 'lf-label' }, ['中间信息丢失（Lost in the Middle）']), el('span', {}, ['拖动事实位置'])]),
      el('div', { class: 'lf-body' }, [grid, el('div', { class: 'lf-out' }, [svg, el('div', { style: 'margin-top:10px' }, [num]), meta, formula])]),
      el('div', { class: 'lf-cap' }, ['当一条相关事实被放入长上下文时，模型能较好地回忆开头或结尾附近的信息，但对中间信息的回忆明显更差。准确率随位置呈 U 形变化。因此，上下文工程（Context Engineering）会将最重要的材料放在提示词开头或结尾，而不依赖冗长、无结构的信息堆积。'])
    ]));
    state._render();
  }

  LF.register({
    'few-shot-curve': fewShotCurve,
    'cot-decomposition': cotDecomposition,
    'constrained-decoding': constrainedDecoding,
    'prompt-cache-hit': promptCacheHit,
    'semantic-cache': semanticCache,
    'function-call-args': functionCallArgs,
    'llm-judge-rubric': llmJudgeRubric,
    'lost-in-the-middle': lostInTheMiddle
  });
})();
