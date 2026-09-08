/* figures-infra.js：阶段 17（基础设施与生产（Infrastructure and production））
   的交互课程图表。在 lesson-figures.js 之后加载，通过 window.LF.register 注册。
   原生 ES5，无依赖，主题由 CSS 变量控制。编写时仍使用相同的围栏块：
       ```figure
       data-parallel
       ```  */
(function () {
  'use strict';
  var LF = window.LF;
  if (!LF) { return; }
  var el = LF.el, svgEl = LF.svgEl, slider = LF.slider, select = LF.select, fmtInt = LF.fmtInt;

  // ── data-parallel: 将全局批次（Global batch）切分为各 GPU 分片（Shards），执行全规约（All-reduce） ──
  function dataParallel(host) {
    var state = { gpus: 4, batch: 256 };
    var W = 520, H = 210, PAD = 24;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var num = el('span', { class: 'lf-num' });
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });
    state._render = function () {
      var g = state.gpus, B = state.batch;
      var shard = Math.ceil(B / g);
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      var colW = (W - 2 * PAD) / g, boxW = Math.min(colW - 10, 84), top = 34, boxH = 64;
      var i;
      for (i = 0; i < g; i++) {
        var cx = PAD + i * colW + (colW - boxW) / 2;
        svg.appendChild(svgEl('rect', { x: cx.toFixed(1), y: top, width: boxW.toFixed(1), height: boxH, rx: '3',
          fill: 'var(--bg-surface,#eee)', stroke: 'var(--ink-soft,#555)', 'stroke-width': '1.2' }));
        var lab = svgEl('text', { x: (cx + boxW / 2).toFixed(1), y: (top + 26).toFixed(1), 'text-anchor': 'middle',
          'font-family': 'monospace', 'font-size': '10', fill: 'var(--ink,#1a1a1a)' });
        lab.appendChild(document.createTextNode('GPU ' + (i + 1)));
        svg.appendChild(lab);
        var cp = svgEl('text', { x: (cx + boxW / 2).toFixed(1), y: (top + 44).toFixed(1), 'text-anchor': 'middle',
          'font-family': 'monospace', 'font-size': '9', fill: 'var(--ink-mute,#777)' });
        cp.appendChild(document.createTextNode('完整副本'));
        svg.appendChild(cp);
        var shB = svgEl('rect', { x: cx.toFixed(1), y: (top + boxH + 10).toFixed(1), width: boxW.toFixed(1), height: '20', rx: '2',
          fill: 'var(--blueprint,#3553ff)', opacity: '0.85' });
        svg.appendChild(shB);
        var sl = svgEl('text', { x: (cx + boxW / 2).toFixed(1), y: (top + boxH + 24).toFixed(1), 'text-anchor': 'middle',
          'font-family': 'monospace', 'font-size': '9', fill: 'var(--bg,#fafaf5)' });
        sl.appendChild(document.createTextNode(shard + ' 行'));
        svg.appendChild(sl);
      }
      var ry = top + boxH + 48;
      svg.appendChild(svgEl('line', { x1: PAD, y1: ry, x2: W - PAD, y2: ry, stroke: 'var(--warn,#b8870f)', 'stroke-width': '2' }));
      var rl = svgEl('text', { x: (W / 2).toFixed(1), y: (ry + 16).toFixed(1), 'text-anchor': 'middle',
        'font-family': 'monospace', 'font-size': '10', fill: 'var(--warn,#b8870f)' });
      rl.appendChild(document.createTextNode(g + ' 块 GPU 通过 All-Reduce 汇总梯度'));
      svg.appendChild(rl);
      num.innerHTML = g + 'x <small>理想吞吐量</small>';
      meta.textContent = '全局批次 ' + B + ' 拆为 ' + g + ' 份，每份 ' + shard + '  ·  每块 GPU 保存完整模型副本';
      formula.textContent = '每块 GPU 的批大小 = ceil(' + B + ' / ' + g + ') = ' + shard + '  ·  全归约（All-Reduce）求和梯度，保持权重同步';
    };
    var grid = el('div', { class: 'lf-grid' }, [
      slider(state, 'gpus', 'GPU 数量', 1, 8, 1),
      slider(state, 'batch', '全局批大小（Global Batch Size）', 8, 1024, 8)
    ]);
    host.appendChild(el('div', { class: 'lf' }, [
      el('div', { class: 'lf-head' }, [el('span', { class: 'lf-label' }, ['数据并行（Data Parallelism）']), el('span', {}, ['调整 GPU 数量'])]),
      el('div', { class: 'lf-body' }, [grid, el('div', { class: 'lf-out' }, [svg, num, meta, formula])]),
      el('div', { class: 'lf-cap' }, ['每块 GPU 保存完整模型副本，处理全局批次中的不同数据分片。反向传播（Backward Pass）之后，通过全归约（All-Reduce）对所有 GPU 的梯度求和，使各副本保持一致。吞吐量随 GPU 数量近似线性增长，但单卡显存占用不会下降，因为每块设备仍保存整个模型。'])
    ]));
    state._render();
  }

  // ── tensor-parallel: 按列切分矩阵乘法（Matmul），收集部分输出 ──
  function tensorParallel(host) {
    var state = { gpus: 4, dim: 4096 };
    var W = 520, H = 200, PAD = 24;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var num = el('span', { class: 'lf-num' });
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });
    state._render = function () {
      var g = state.gpus, d = state.dim;
      var colsEach = Math.ceil(d / g);
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      var mx = PAD, my = 40, mw = W - 2 * PAD, mh = 90;
      svg.appendChild(svgEl('rect', { x: mx, y: my, width: mw, height: mh, fill: 'none',
        stroke: 'var(--ink-soft,#555)', 'stroke-width': '1.4' }));
      var i;
      for (i = 0; i < g; i++) {
        var sx = mx + i * mw / g;
        svg.appendChild(svgEl('rect', { x: sx.toFixed(1), y: my, width: (mw / g - 2).toFixed(1), height: mh, rx: '2',
          fill: 'var(--blueprint,#3553ff)', opacity: (0.4 + 0.5 * (i % 2)).toFixed(2) }));
        var lab = svgEl('text', { x: (sx + mw / g / 2).toFixed(1), y: (my + mh / 2 + 4).toFixed(1), 'text-anchor': 'middle',
          'font-family': 'monospace', 'font-size': '10', fill: 'var(--bg,#fafaf5)' });
        lab.appendChild(document.createTextNode('GPU ' + (i + 1)));
        svg.appendChild(lab);
      }
      var gy = my + mh + 28;
      svg.appendChild(svgEl('line', { x1: PAD, y1: gy, x2: W - PAD, y2: gy, stroke: 'var(--warn,#b8870f)', 'stroke-width': '2' }));
      var gl = svgEl('text', { x: (W / 2).toFixed(1), y: (gy + 16).toFixed(1), 'text-anchor': 'middle',
        'font-family': 'monospace', 'font-size': '10', fill: 'var(--warn,#b8870f)' });
      gl.appendChild(document.createTextNode('通过 All-Gather 拼接局部输出，得到完整结果'));
      svg.appendChild(gl);
      num.innerHTML = colsEach + ' <small>列 / GPU</small>';
      meta.textContent = '权重矩阵 W 按列切分至 ' + g + ' 块 GPU  ·  每块保存 1/' + g + ' 的参数';
      formula.textContent = 'Y = X·W，其中 W = [W₁ | … | W' + (g > 1 ? 'ₙ' : '₁') + ']；每块 GPU 计算 X·Wᵢ，再进行全收集（All-Gather）  ·  每卡约保存 d/' + g + ' 列 = ' + colsEach;
    };
    var grid = el('div', { class: 'lf-grid' }, [
      slider(state, 'gpus', 'GPU 数量', 1, 8, 1),
      slider(state, 'dim', '输出宽度（列数）', 512, 8192, 256)
    ]);
    host.appendChild(el('div', { class: 'lf' }, [
      el('div', { class: 'lf-head' }, [el('span', { class: 'lf-label' }, ['张量并行（Tensor Parallelism）']), el('span', {}, ['调整 GPU 数量'])]),
      el('div', { class: 'lf-body' }, [grid, el('div', { class: 'lf-out' }, [svg, num, meta, formula])]),
      el('div', { class: 'lf-cap' }, ['将权重矩阵按列分块，就能把一次大型矩阵乘法（Matrix Multiplication）分配给多块 GPU。每块 GPU 用完整输入乘以自己的权重分片，生成局部输出，再通过全收集（All-Gather）拼接为完整结果。单卡参数量降至原来的 GPU 数量分之一，因此单个设备容纳不下的模型层也能运行。'])
    ]));
    state._render();
  }

  // ── pipeline-parallel: 微批次（Micro-batches）增多时，气泡比例（Bubble fraction）下降 ──
  function pipelineParallel(host) {
    var state = { micro: 4, stages: 4 };
    var W = 520, H = 210, PAD = 24;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var num = el('span', { class: 'lf-num' });
    var bar = el('i');
    var barWrap = el('div', { class: 'lf-bar' }, [bar]);
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });
    state._render = function () {
      var m = state.micro, s = state.stages;
      var totalSlots = m + s - 1;
      var bubbleFrac = (s - 1) / (m + s - 1);
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      var rowH = (H - 2 * PAD) / s, cw = (W - 2 * PAD) / totalSlots;
      var r, c;
      for (r = 0; r < s; r++) {
        var y = PAD + r * rowH + 2;
        for (c = 0; c < totalSlots; c++) {
          var x = PAD + c * cw;
          // 阶段 r 处理微批次 (c - r)；当 0 <= c-r < m 时忙碌
          var mb = c - r;
          var busy = mb >= 0 && mb < m;
          svg.appendChild(svgEl('rect', { x: x.toFixed(1), y: y.toFixed(1), width: (cw - 2).toFixed(1), height: (rowH - 4).toFixed(1), rx: '2',
            fill: busy ? 'var(--blueprint,#3553ff)' : 'var(--rule-soft,#ccc)',
            opacity: busy ? '0.85' : '0.6' }));
        }
        var sl = svgEl('text', { x: (PAD - 4).toFixed(1), y: (y + rowH / 2).toFixed(1), 'text-anchor': 'end',
          'font-family': 'monospace', 'font-size': '9', fill: 'var(--ink-mute,#777)' });
        sl.appendChild(document.createTextNode('S' + (r + 1)));
        svg.appendChild(sl);
      }
      num.innerHTML = (bubbleFrac * 100).toFixed(1) + ' <small>% 气泡占比（空闲）</small>';
      bar.style.width = (bubbleFrac * 100).toFixed(1) + '%';
      barWrap.classList.toggle('over', bubbleFrac > 0.4);
      meta.textContent = m + ' 个微批次经过 ' + s + ' 个阶段（S）  ·  灰色格表示流水线填充、排空时的空闲气泡';
      formula.textContent = '气泡占比 = (阶段数 − 1) / (微批次数 + 阶段数 − 1) = ' + (s - 1) + ' / ' + (m + s - 1) + ' = ' + (bubbleFrac * 100).toFixed(1) + '%';
    };
    var grid = el('div', { class: 'lf-grid' }, [
      slider(state, 'micro', '微批次数（Micro-Batches）', 1, 16, 1),
      slider(state, 'stages', '流水线阶段数（Pipeline Stages）', 2, 8, 1)
    ]);
    host.appendChild(el('div', { class: 'lf' }, [
      el('div', { class: 'lf-head' }, [el('span', { class: 'lf-label' }, ['流水线并行（Pipeline Parallelism）']), el('span', {}, ['调整微批次数'])]),
      el('div', { class: 'lf-body' }, [grid, el('div', { class: 'lf-out' }, [svg, num, barWrap, meta, formula])]),
      el('div', { class: 'lf-cap' }, ['将模型拆为多个阶段，每块 GPU 负责一个阶段，微批次（Micro-Batch）像流水线上的工件一样依次经过各阶段。流水线填充和排空时，部分阶段处于空闲状态，即图中的灰色气泡（Bubble）。气泡占比为“阶段数减一”除以“微批次数加阶段数减一”，因此增加微批次可以摊薄固定的填充、排空开销，使其占比趋近于零。'])
    ]));
    state._render();
  }

  // ── zero-sharding: ZeRO 各阶段依次对优化器（Optimizer）、梯度（Gradients）和参数（Params）分片 ──
  function zeroSharding(host) {
    var state = { stage: '2', gpus: 8 };
    var num = el('span', { class: 'lf-num' });
    var rows = el('div', {});
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });
    // 混合精度（Mixed precision）Adam 中每个参数占用的字节：参数 2、梯度 2、优化器状态 12
    var COMPONENTS = [
      { key: 'params', label: '参数（Parameters，fp16）', bytes: 2, shardAt: 3 },
      { key: 'grads', label: '梯度（Gradients，fp16）', bytes: 2, shardAt: 2 },
      { key: 'opt', label: '优化器状态（Optimizer States，Adam）', bytes: 12, shardAt: 1 }
    ];
    state._render = function () {
      var stage = Number(state.stage), g = state.gpus;
      var total = 0, i;
      while (rows.firstChild) rows.removeChild(rows.firstChild);
      var maxBytes = 16; // 每个参数的完整内存占用，用于条形比例尺
      for (i = 0; i < COMPONENTS.length; i++) {
        var c = COMPONENTS[i];
        var sharded = stage >= c.shardAt;
        var perGpu = sharded ? c.bytes / g : c.bytes;
        total += perGpu;
        var bw = el('i'); bw.style.width = Math.min(100, perGpu / maxBytes * 100).toFixed(1) + '%';
        if (sharded) bw.style.background = 'var(--warn,#b8870f)';
        var lab = el('label', {}, [c.label + (sharded ? ' ÷ ' + g : ''),
          el('b', {}, [perGpu.toFixed(2) + ' 字节/参数'])]);
        rows.appendChild(el('div', { class: 'lf-ctrl' }, [lab, el('div', { class: 'lf-bar' }, [bw])]));
      }
      num.innerHTML = total.toFixed(2) + ' <small>字节 / 参数 / GPU</small>';
      meta.textContent = 'ZeRO 阶段 ' + stage + '  ·  ' + g + ' 块 GPU  ·  '
        + (stage === 0 ? '不分片（普通数据并行）'
          : stage === 1 ? '优化器状态分片'
            : stage === 2 ? '优化器状态和梯度分片'
              : '优化器状态、梯度和参数均分片');
      formula.textContent = '完整占用为每参数 16 字节  →  分片部分分布在 ' + g + ' 块 GPU 上  →  每块 GPU 每参数占用 ' + total.toFixed(2) + ' 字节';
    };
    var grid = el('div', { class: 'lf-grid' }, [
      select(state, 'stage', 'ZeRO 阶段（Stage）', [['阶段 0', '0'], ['阶段 1', '1'], ['阶段 2', '2'], ['阶段 3', '3']]),
      slider(state, 'gpus', '数据并行 GPU 数量', 2, 64, 1)
    ]);
    host.appendChild(el('div', { class: 'lf' }, [
      el('div', { class: 'lf-head' }, [el('span', { class: 'lf-label' }, ['ZeRO 分片（ZeRO Sharding）']), el('span', {}, ['选择 ZeRO 阶段'])]),
      el('div', { class: 'lf-body' }, [grid, el('div', { class: 'lf-out' }, [num, rows, meta, formula])]),
      el('div', { class: 'lf-cap' }, ['普通数据并行在每块 GPU 上复制完整的优化器状态、梯度和参数。零冗余优化器（Zero Redundancy Optimizer，ZeRO）分阶段消除冗余：阶段 1 对占用较大的 Adam 优化器状态分片，阶段 2 加入梯度分片，阶段 3 再加入参数分片。每个阶段都进一步降低单卡显存占用，以少量额外通信换取训练更大模型的能力。'])
    ]));
    state._render();
  }

  // ── gpu-memory-breakdown: 堆叠的训练内存占用与 GPU 容量对比 ──
  function gpuMemoryBreakdown(host) {
    var state = { params: 7, batch: 8 };
    var GB = 1e9, REF = 80; // 一块 80 GB GPU
    var num = el('span', { class: 'lf-num' });
    var rows = el('div', {});
    var bar = el('i');
    var barWrap = el('div', { class: 'lf-bar' }, [bar]);
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });
    state._render = function () {
      var N = state.params * 1e9; // 参数量以十亿为单位
      var weights = N * 2 / GB;
      var grads = N * 2 / GB;
      var opt = N * 12 / GB;
      // 激活（Activations）：每个样本的粗略开销随批次增大，此处采用简单线性模型
      var acts = state.batch * state.params * 0.6;
      var total = weights + grads + opt + acts;
      var parts = [
        { label: '权重（Weights，2 字节）', v: weights },
        { label: '梯度（Gradients，2 字节）', v: grads },
        { label: '优化器状态（Adam，约 12 字节）', v: opt },
        { label: '激活值（Activations，批大小 ' + state.batch + '）', v: acts }
      ];
      while (rows.firstChild) rows.removeChild(rows.firstChild);
      parts.forEach(function (p) {
        var bw = el('i'); bw.style.width = Math.min(100, p.v / REF * 100).toFixed(1) + '%';
        rows.appendChild(el('div', { class: 'lf-ctrl' }, [
          el('label', {}, [p.label, el('b', {}, [p.v.toFixed(1) + ' GB'])]),
          el('div', { class: 'lf-bar' }, [bw])
        ]));
      });
      num.innerHTML = total.toFixed(total < 100 ? 1 : 0) + ' <small>GB 总计</small>';
      var pct = Math.min(100, total / REF * 100);
      bar.style.width = pct + '%';
      barWrap.classList.toggle('over', total > REF);
      meta.textContent = (total > REF ? '超出容量：' : '') + '占单块 ' + REF + ' GB GPU 的 ' + Math.round(total / REF * 100) + '%  ·  训练时优化器状态占用较大';
      formula.textContent = state.params + 'B 参数 × (2 + 2 + 12) 字节 = ' + (weights + grads + opt).toFixed(0) + ' GB 固定占用，再加 ' + acts.toFixed(1) + ' GB 激活值';
    };
    var grid = el('div', { class: 'lf-grid' }, [
      slider(state, 'params', '模型参数量（十亿）', 1, 70, 1),
      slider(state, 'batch', '批大小（Batch Size）', 1, 64, 1)
    ]);
    host.appendChild(el('div', { class: 'lf' }, [
      el('div', { class: 'lf-head' }, [el('span', { class: 'lf-label' }, ['训练显存（Training Memory）']), el('span', {}, ['调整参数量和批大小'])]),
      el('div', { class: 'lf-body' }, [grid, el('div', { class: 'lf-out' }, [num, rows, barWrap, meta, formula])]),
      el('div', { class: 'lf-cap' }, ['训练显存不只用于存放权重。混合精度（Mixed Precision）Adam 中，每个参数的 fp16 权重占 2 字节、梯度占 2 字节、优化器状态约占 12 字节；尚未计入激活值时，固定占用就约为每参数 16 字节。激活值占用又随批大小增长。因此，推理时能放入单卡的模型，训练时可能远超单卡容量。'])
    ]));
    state._render();
  }

  // ── throughput-latency: 批次大小提高吞吐量（Throughput）及单请求延迟（Latency） ──
  function throughputLatency(host) {
    var state = { batch: 16 };
    var W = 520, H = 220, PAD = 36, BMAX = 128;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var num = el('span', { class: 'lf-num' });
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });
    // 吞吐量趋于饱和（类似 Amdahl）；延迟随批次增大（排队 + 计算）
    function thru(b) { return 4000 * b / (b + 24); } // tokens/sec，趋于饱和
    function lat(b) { return 20 + 0.9 * b; }          // 每个请求的毫秒数，线性变化
    var TMAX = thru(BMAX), LMAX = lat(BMAX);
    // 拐点（Knee）：单位延迟对应的边际吞吐量下降最明显处；此处位于开始饱和附近
    var knee = 24;
    function px(b) { return PAD + b / BMAX * (W - 2 * PAD); }
    function pyT(t) { return H - PAD - t / TMAX * (H - 2 * PAD); }
    function pyL(l) { return H - PAD - l / LMAX * (H - 2 * PAD); }
    state._render = function () {
      var b = state.batch;
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      var d = '', i, x;
      for (i = 0; i <= 100; i++) { x = 1 + (BMAX - 1) * i / 100; d += (i ? 'L' : 'M') + px(x).toFixed(1) + ' ' + pyT(thru(x)).toFixed(1) + ' '; }
      svg.appendChild(svgEl('path', { d: d, fill: 'none', stroke: 'var(--blueprint,#3553ff)', 'stroke-width': '2' }));
      var d2 = '';
      for (i = 0; i <= 100; i++) { x = 1 + (BMAX - 1) * i / 100; d2 += (i ? 'L' : 'M') + px(x).toFixed(1) + ' ' + pyL(lat(x)).toFixed(1) + ' '; }
      svg.appendChild(svgEl('path', { d: d2, fill: 'none', stroke: 'var(--ink-mute,#999)', 'stroke-width': '2', 'stroke-dasharray': '4 3' }));
      var kx = px(knee);
      svg.appendChild(svgEl('line', { x1: kx, y1: PAD, x2: kx, y2: H - PAD, stroke: 'var(--warn,#b8870f)', 'stroke-width': '1.5', 'stroke-dasharray': '3 3' }));
      svg.appendChild(svgEl('circle', { cx: px(b), cy: pyT(thru(b)), r: '5', fill: 'var(--blueprint,#3553ff)' }));
      svg.appendChild(svgEl('circle', { cx: px(b), cy: pyL(lat(b)), r: '4', fill: 'var(--ink-mute,#999)' }));
      num.innerHTML = fmtInt(Math.round(thru(b))) + ' <small>词元/秒</small>';
      meta.textContent = '批大小 ' + b + '  ·  单请求延迟 ' + lat(b).toFixed(0) + ' ms  ·  拐点位于批大小 ' + knee + ' 附近（橙色）';
      formula.textContent = '增大批次 → 吞吐量逐渐饱和，延迟线性上升  ·  拐点附近的批大小可兼顾两者';
    };
    var grid = el('div', {}, [slider(state, 'batch', '批大小（Batch Size）', 1, BMAX, 1)]);
    host.appendChild(el('div', { class: 'lf' }, [
      el('div', { class: 'lf-head' }, [el('span', { class: 'lf-label' }, ['吞吐量与延迟（Throughput / Latency）']), el('span', {}, ['调整批大小'])]),
      el('div', { class: 'lf-body' }, [grid, el('div', { class: 'lf-out' }, [svg, num, meta, formula])]),
      el('div', { class: 'lf-cap' }, ['蓝线表示吞吐量（Throughput），灰色虚线表示单请求延迟（Latency）。更大的批次提高 GPU 利用率，使每秒生成的词元总量增加，但单个请求排队等待更久，延迟也随之上升。橙色拐点（Knee）附近，吞吐量增幅开始放缓，延迟仍持续上升；多数推理服务会将批大小设在这一带。'])
    ]));
    state._render();
  }

  // ── autoscaling: 副本（Replicas）跟随传入 QPS 调整，将延迟保持在目标以下 ──
  function autoscaling(host) {
    var state = { qps: 120, cap: 40 };
    var W = 520, H = 200, PAD = 26;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var num = el('span', { class: 'lf-num' });
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });
    var RMAX = 12;
    state._render = function () {
      var qps = state.qps, cap = state.cap;
      var replicas = Math.max(1, Math.ceil(qps / cap));
      var shown = Math.min(RMAX, replicas);
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      var perRow = 6, bw = 56, bh = 30, gx = 14, gy = 18, ox = PAD, oy = 36;
      var i;
      for (i = 0; i < shown; i++) {
        var col = i % perRow, row = Math.floor(i / perRow);
        var x = ox + col * (bw + gx), y = oy + row * (bh + gy);
        // 此副本上的负载（Load）
        var thisLoad = Math.min(cap, qps - i * cap);
        var fillFrac = Math.max(0, thisLoad) / cap;
        svg.appendChild(svgEl('rect', { x: x.toFixed(1), y: y.toFixed(1), width: bw, height: bh, rx: '3',
          fill: 'var(--bg-surface,#eee)', stroke: 'var(--ink-soft,#555)', 'stroke-width': '1.1' }));
        svg.appendChild(svgEl('rect', { x: x.toFixed(1), y: (y + bh - bh * fillFrac).toFixed(1), width: bw, height: (bh * fillFrac).toFixed(1), rx: '3',
          fill: 'var(--blueprint,#3553ff)', opacity: '0.85' }));
      }
      if (replicas > RMAX) {
        var more = svgEl('text', { x: (ox + 5 * (bw + gx)).toFixed(1), y: (oy + 2 * (bh + gy) + 14).toFixed(1),
          'font-family': 'monospace', 'font-size': '11', fill: 'var(--ink-mute,#777)' });
        more.appendChild(document.createTextNode('另有 ' + (replicas - RMAX) + ' 个'));
        svg.appendChild(more);
      }
      var headroom = replicas * cap - qps;
      num.innerHTML = replicas + ' <small>个副本</small>';
      meta.textContent = qps + ' QPS  ·  每副本容量 ' + cap + ' QPS  ·  剩余 ' + headroom + ' QPS 余量，供延迟目标使用';
      formula.textContent = '副本数 = ceil(QPS / 单副本容量) = ceil(' + qps + ' / ' + cap + ') = ' + replicas;
    };
    var grid = el('div', { class: 'lf-grid' }, [
      slider(state, 'qps', '请求负载（QPS）', 0, 480, 10),
      slider(state, 'cap', '单副本容量（QPS）', 10, 80, 5)
    ]);
    host.appendChild(el('div', { class: 'lf' }, [
      el('div', { class: 'lf-head' }, [el('span', { class: 'lf-label' }, ['自动伸缩（Autoscaling）']), el('span', {}, ['调整请求负载'])]),
      el('div', { class: 'lf-body' }, [grid, el('div', { class: 'lf-out' }, [svg, num, meta, formula])]),
      el('div', { class: 'lf-cap' }, ['自动伸缩器（Autoscaler）增减副本，使请求负载保持在服务容量内、延迟保持在目标以下。副本数为负载除以单个副本的服务容量，再向上取整。每秒查询数（Queries per Second，QPS）增加时启动更多副本，减少时缩容，从而同时控制延迟和成本。'])
    ]));
    state._render();
  }

  // ── cost-per-token: GPU 价格与吞吐量决定每 1M 词元（Tokens）的成本 ──
  function costPerToken(host) {
    var state = { price: 2.5, tps: 2000 };
    var num = el('span', { class: 'lf-num' });
    var bar = el('i');
    var barWrap = el('div', { class: 'lf-bar' }, [bar]);
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });
    var REF = 5; // $5 / 1M tokens 作为视觉参考
    state._render = function () {
      var price = state.price, tps = state.tps;
      var tokensPerHr = tps * 3600;
      var costPerMillion = price / tokensPerHr * 1e6;
      num.innerHTML = '$' + costPerMillion.toFixed(costPerMillion < 1 ? 3 : 2) + ' <small>/ 百万词元</small>';
      bar.style.width = Math.min(100, costPerMillion / REF * 100).toFixed(1) + '%';
      barWrap.classList.toggle('over', costPerMillion > REF);
      meta.textContent = 'GPU 每小时 $' + price.toFixed(2) + '  ·  ' + fmtInt(tps) + ' 词元/秒  ·  每小时生成 ' + (tokensPerHr / 1e6).toFixed(1) + ' 百万词元';
      formula.textContent = '百万词元成本 = 每小时价格 / (每秒词元数 × 3600) × 10⁶ = (' + price.toFixed(2) + ' / ' + fmtInt(tokensPerHr) + ') × 10⁶ = $' + costPerMillion.toFixed(3);
    };
    var grid = el('div', { class: 'lf-grid' }, [
      slider(state, 'price', 'GPU 价格（美元/小时）', 0.5, 12, 0.1),
      slider(state, 'tps', '吞吐量（词元/秒）', 100, 8000, 100)
    ]);
    host.appendChild(el('div', { class: 'lf' }, [
      el('div', { class: 'lf-head' }, [el('span', { class: 'lf-label' }, ['词元成本（Cost per Token）']), el('span', {}, ['调整价格和吞吐量'])]),
      el('div', { class: 'lf-body' }, [grid, el('div', { class: 'lf-out' }, [num, barWrap, meta, formula])]),
      el('div', { class: 'lf-cap' }, ['推理服务的成本可归结为两个数：GPU 每小时的价格，以及这一小时生成的词元数。每小时价格除以每小时词元数，再乘以一百万，就得到百万词元成本。吞吐量翻倍，单位成本就减半，因此批处理（Batching）、量化（Quantization）和更快的计算内核（Kernel）都能直接降低词元单价。'])
    ]));
    state._render();
  }

  // ── roofline: 算术强度（Arithmetic intensity）决定内存受限（Memory-bound）还是计算受限（Compute-bound） ──
  function roofline(host) {
    var state = { logAI: 1.2 };
    var W = 520, H = 230, PAD = 40;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var num = el('span', { class: 'lf-num' });
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });
    var PEAK = 1000;      // 峰值计算性能（Peak compute），GFLOP/s（任意单位）
    var BW = 8;           // 内存带宽（Memory bandwidth），单位 GB/s -> attainable = BW * AI
    var ridge = PEAK / BW; // 两种区域交汇处的算术强度
    var AIMIN = 0.5, AIMAX = 1000;
    function lx(ai) { return PAD + (Math.log10(ai) - Math.log10(AIMIN)) / (Math.log10(AIMAX) - Math.log10(AIMIN)) * (W - 2 * PAD); }
    function ly(perf) { return H - PAD - (Math.log10(perf) - Math.log10(8)) / (Math.log10(PEAK) - Math.log10(8)) * (H - 2 * PAD); }
    function attainable(ai) { return Math.min(PEAK, BW * ai); }
    state._render = function () {
      var ai = Math.pow(10, state.logAI);
      var perf = attainable(ai);
      var bound = ai < ridge ? '访存受限' : '计算受限';
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      // 屋顶线（Roofline）：先是倾斜的内存上限，再是水平的计算上限
      var d = '', i, a;
      for (i = 0; i <= 100; i++) {
        a = Math.pow(10, Math.log10(AIMIN) + (Math.log10(AIMAX) - Math.log10(AIMIN)) * i / 100);
        d += (i ? 'L' : 'M') + lx(a).toFixed(1) + ' ' + ly(attainable(a)).toFixed(1) + ' ';
      }
      svg.appendChild(svgEl('path', { d: d, fill: 'none', stroke: 'var(--blueprint,#3553ff)', 'stroke-width': '2' }));
      // 脊线（Ridge line）
      var rx = lx(ridge);
      svg.appendChild(svgEl('line', { x1: rx, y1: PAD, x2: rx, y2: H - PAD, stroke: 'var(--rule-soft,#ddd)', 'stroke-width': '1', 'stroke-dasharray': '3 3' }));
      // 内核（Kernel）标记
      svg.appendChild(svgEl('circle', { cx: lx(ai), cy: ly(perf), r: '5', fill: 'var(--warn,#b8870f)' }));
      var rl = svgEl('text', { x: (rx + 4).toFixed(1), y: (PAD + 12).toFixed(1), 'font-family': 'monospace', 'font-size': '9', fill: 'var(--ink-mute,#777)' });
      rl.appendChild(document.createTextNode('转折点 ' + ridge.toFixed(0) + ' FLOP/B'));
      svg.appendChild(rl);
      num.innerHTML = bound + ' <small>AI = ' + ai.toFixed(ai < 10 ? 1 : 0) + ' FLOP/B</small>';
      meta.textContent = '可达性能 ' + perf.toFixed(0) + ' GFLOP/s  ·  ' + (ai < ridge ? '内存带宽不足，需要增加数据复用' : '计算单元接近饱和，性能接近峰值');
      formula.textContent = '可达性能 = min(峰值算力, 带宽 × AI)  ·  转折点 AI = 峰值算力/BW = ' + ridge.toFixed(0) + ' FLOP/字节';
    };
    var grid = el('div', {}, [slider(state, 'logAI', '计算强度（10^x FLOP/字节）', -0.3, 3, 0.05)]);
    host.appendChild(el('div', { class: 'lf' }, [
      el('div', { class: 'lf-head' }, [el('span', { class: 'lf-label' }, ['屋顶线模型（Roofline Model）']), el('span', {}, ['调整计算强度'])]),
      el('div', { class: 'lf-body' }, [grid, el('div', { class: 'lf-out' }, [svg, num, meta, formula])]),
      el('div', { class: 'lf-cap' }, ['计算强度（Arithmetic Intensity，AI）是内核每搬运一个字节所执行的浮点运算次数（FLOPs）。左侧斜线表示性能受内存带宽限制，右侧水平线表示性能受峰值算力限制，两者交点即转折点（Ridge Point）。位于转折点左下方的橙色内核是访存受限（Memory-Bound）的，应增加数据复用；右侧则是计算受限（Compute-Bound）。仅换用算力更高的芯片并不能解决前者的带宽瓶颈。'])
    ]));
    state._render();
  }

  LF.register({
    'data-parallel': dataParallel,
    'tensor-parallel': tensorParallel,
    'pipeline-parallel': pipelineParallel,
    'zero-sharding': zeroSharding,
    'gpu-memory-breakdown': gpuMemoryBreakdown,
    'throughput-latency': throughputLatency,
    'autoscaling': autoscaling,
    'cost-per-token': costPerToken,
    'roofline': roofline
  });
})();
