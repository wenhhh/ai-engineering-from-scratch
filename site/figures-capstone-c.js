(function () {
  'use strict';
  var LF = window.LF;
  if (!LF) { return; }

  var el = LF.el, svgEl = LF.svgEl;
  var INK = 'var(--ink,#1a1a1a)', SOFT = 'var(--ink-soft,#555)', MUTE = 'var(--ink-mute,#777)';
  var BP = 'var(--blueprint,#3553ff)', BG = 'var(--bg,#fafaf5)', SURF = 'var(--bg-surface,#eee)';
  var RULE = 'var(--rule-soft,#ddd)', WARN = 'var(--warn,#b8870f)';

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

  // 第 32 课：嵌入查表（Embedding Lookup），按 ID 选取一行并加上位置向量。
  function embeddingLookup(host) {
    var svg = svgEl('svg', { viewBox: '0 0 520 240' });
    var tx = 40, ty = 28, rw = 96, rh = 26, rows = 6;
    svg.appendChild(txt(tx + rw / 2, ty - 8, '词元表 (V, D)', MUTE, 10));
    var i;
    for (i = 0; i < rows; i++) {
      var ry = ty + i * rh;
      svg.appendChild(svgEl('rect', { x: tx, y: ry, width: rw, height: rh - 3, rx: 3, fill: i === 3 ? 'none' : BG, stroke: RULE, 'stroke-width': '1' }));
      svg.appendChild(txt(tx - 8, ry + 16, 'id ' + i, MUTE, 8, 'end'));
    }
    // 高亮框移动到选中的第 3 行。
    var sel = svgEl('rect', { x: tx - 2, y: ty - 2, width: rw + 4, height: rh - 1, rx: 4, fill: BP, opacity: '0.14', stroke: BP, 'stroke-width': '2.4' });
    sel.appendChild(anim('y', (ty - 2) + ';' + (ty - 2 + 3 * rh) + ';' + (ty - 2 + 3 * rh), '3s', { keyTimes: '0;0.45;1' }));
    svg.appendChild(sel);
    svg.appendChild(txt(tx + rw / 2, ty + 3 * rh + 16, '第 3 行', BP, 9));
    // 箭头将选中行连接到右侧的稠密向量。
    var flow = svgEl('path', { d: 'M' + (tx + rw + 4) + ' ' + (ty + 3 * rh + 11) + ' H300', fill: 'none', stroke: BP, 'stroke-width': '2', 'stroke-dasharray': '6 5' });
    flow.appendChild(anim('stroke-dashoffset', '22;0', '1s', { begin: '1.2s' }));
    svg.appendChild(flow);
    // D 维词元向量。
    var vx = 308, vy = ty + 3 * rh - 4, cell = 18;
    var tg = svgEl('g', {});
    for (i = 0; i < 5; i++) tg.appendChild(svgEl('rect', { x: vx + i * cell, y: vy, width: cell - 2, height: 22, rx: 2, fill: BP, opacity: (0.3 + i * 0.12).toFixed(2) }));
    tg.appendChild(txt(vx + 5 * cell / 2, vy - 6, '词元向量 (D)', BP, 9));
    tg.appendChild(anim('opacity', '0;0;1;1', '3s', { keyTimes: '0;0.55;0.75;1', fill: 'freeze' }));
    svg.appendChild(tg);
    // 下方绘制位置向量，再显示加号与求和结果。
    var py = vy + 64;
    var pg = svgEl('g', {});
    for (i = 0; i < 5; i++) pg.appendChild(svgEl('rect', { x: vx + i * cell, y: py, width: cell - 2, height: 22, rx: 2, fill: WARN, opacity: (0.3 + i * 0.12).toFixed(2) }));
    pg.appendChild(txt(vx + 5 * cell / 2, py + 36, '位置向量 (D)', WARN, 9));
    svg.appendChild(pg);
    svg.appendChild(txt(vx + 5 * cell + 16, (vy + py) / 2 + 16, '+', INK, 18, 'middle'));
    var sumg = svgEl('g', {});
    for (i = 0; i < 5; i++) sumg.appendChild(svgEl('rect', { x: vx + 5 * cell + 30 + i * cell, y: (vy + py) / 2 + 4, width: cell - 2, height: 22, rx: 2, fill: INK, opacity: (0.25 + i * 0.13).toFixed(2) }));
    sumg.appendChild(txt(vx + 5 * cell + 30 + 5 * cell / 2, (vy + py) / 2 - 4, '输入 (B,T,D)', INK, 9));
    sumg.appendChild(anim('opacity', '0;0;1;1', '3s', { keyTimes: '0;0.7;0.9;1', fill: 'freeze' }));
    svg.appendChild(sumg);
    card(host, '嵌入查表（Embedding Lookup）', '选取一行 · 加上位置向量',
      svg,
      '词元 ID 用作索引（Index），不参与算术运算。它选中词元表的一行，返回一个稠密向量（Dense Vector），模型用这个向量表示该 ID 的含义。位置本身也没有内置向量，因此还要按位置查找位置嵌入（Positional Embedding），再与词元向量逐元素相加。所得 (B, T, D) 张量（Tensor）作为第一个注意力模块的输入。');
  }

  // 第 34 课：Transformer 模块，两条残差旁路分别跨过两个子层。
  function transformerBlock(host) {
    var svg = svgEl('svg', { viewBox: '0 0 520 250' });
    var sx = 200, w = 120;
    function block(y, h, label, sub, fill, stroke) {
      var g = svgEl('g', {});
      g.appendChild(svgEl('rect', { x: sx, y: y, width: w, height: h, rx: 5, fill: fill, stroke: stroke, 'stroke-width': '1.8' }));
      g.appendChild(txt(sx + w / 2, y + (sub ? h / 2 - 2 : h / 2 + 4), label, stroke === BP ? BP : SOFT, 11));
      if (sub) g.appendChild(txt(sx + w / 2, y + h / 2 + 12, sub, MUTE, 8));
      return g;
    }
    svg.appendChild(txt(sx + w / 2, 16, '输入 (B, T, D)', INK, 10));
    var ln1 = block(28, 26, '层归一化 1', '', SURF, MUTE);
    var attn = block(64, 40, '注意力', '因果 · 多头', BG, BP);
    var add1 = block(116, 24, '残差相加', '', BG, MUTE);
    var ln2 = block(150, 24, '层归一化 2', '', SURF, MUTE);
    var mlp = block(182, 38, 'MLP  D→4D→D', '', BG, BP);
    [ln1, attn, add1, ln2, mlp].forEach(function (g) { svg.appendChild(g); });
    // 沿模块向下的主路径。
    var spine = svgEl('line', { x1: sx + w / 2, y1: 28, x2: sx + w / 2, y2: 220, stroke: RULE, 'stroke-width': '2' });
    svg.appendChild(spine);
    // 第一条残差旁路从输入绕过注意力模块，进入第一次相加。
    var rp1 = svgEl('path', { d: 'M' + sx + ' 30 C 120 30, 120 128, ' + sx + ' 128', fill: 'none', stroke: BP, 'stroke-width': '2', 'stroke-dasharray': '7 5' });
    rp1.appendChild(anim('stroke-dashoffset', '120;0', '2.2s'));
    svg.appendChild(rp1);
    svg.appendChild(txt(96, 80, '残差', BP, 9, 'middle'));
    // 第二条残差旁路从第一次相加绕过 MLP，到达输出。
    var rp2 = svgEl('path', { d: 'M' + sx + ' 132 C 120 132, 120 232, ' + sx + ' 232', fill: 'none', stroke: BP, 'stroke-width': '2', 'stroke-dasharray': '7 5' });
    rp2.appendChild(anim('stroke-dashoffset', '120;0', '2.2s', { begin: '0.5s' }));
    svg.appendChild(rp2);
    // 信号点沿主路径向下穿过模块。
    var dot = svgEl('circle', { r: 5, fill: WARN });
    dot.appendChild(anim('cy', '28;220', '2.6s'));
    dot.setAttribute('cx', sx + w / 2);
    svg.appendChild(dot);
    svg.appendChild(txt(sx + w / 2, 238, '输出 (B, T, D)', INK, 10));
    // 右侧解释前置层归一化（Pre-LN）。
    svg.appendChild(txt(420, 60, '前置归一化（Pre-LN）', INK, 10, 'middle'));
    svg.appendChild(txt(420, 82, '归一化放在子层分支中，', SOFT, 9, 'middle'));
    svg.appendChild(txt(420, 98, '残差旁路不经过归一化，', SOFT, 9, 'middle'));
    svg.appendChild(txt(420, 114, '因此即使堆叠很深，', SOFT, 9, 'middle'));
    svg.appendChild(txt(420, 130, '残差路径仍能直接贯通。', BP, 9, 'middle'));
    card(host, 'Transformer 模块（Transformer Block）', '两条残差旁路',
      svg,
      '模块包含两个子层和两条残差路径（Residual Path）。输入分成两路：一路经过层归一化（LayerNorm）和注意力，另一路直接到相加节点。多层感知机（Multilayer Perceptron，MLP）周围重复同样的分支结构。这条直通旁路让梯度能够传到深层堆叠的底部；前置层归一化（Pre-LN）把归一化放在子层分支内，使堆叠模型无需依靠预热（Warmup）也能训练。');
  }

  // 第 35 课：组装 GPT，堆叠模块，输出头与词元表共享权重。
  function gptAssembly(host) {
    var svg = svgEl('svg', { viewBox: '0 0 520 310' });
    var cx = 200, w = 150;
    svg.appendChild(txt(cx + w / 2, 16, '词元 ID (B, T)', INK, 10));
    // 合并词元嵌入与位置嵌入。
    svg.appendChild(svgEl('rect', { x: cx, y: 24, width: 66, height: 30, rx: 4, fill: BG, stroke: BP, 'stroke-width': '1.8' }));
    svg.appendChild(txt(cx + 33, 43, '词元嵌入', BP, 9));
    svg.appendChild(svgEl('rect', { x: cx + 84, y: 24, width: 66, height: 30, rx: 4, fill: BG, stroke: WARN, 'stroke-width': '1.8' }));
    svg.appendChild(txt(cx + 117, 43, '位置嵌入', WARN, 9));
    svg.appendChild(txt(cx + 75, 70, '⊕', INK, 14));
    // 将 12 个模块压缩绘制为条带，自上而下依次点亮。
    var by = 84, bh = 11, n = 12, i;
    for (i = 0; i < n; i++) {
      var yy = by + i * (bh + 1);
      var r = svgEl('rect', { x: cx + 20, y: yy, width: w - 40, height: bh, rx: 2, fill: BP, opacity: '0.16', stroke: BP, 'stroke-width': '0.8' });
      r.appendChild(anim('opacity', '0.16;0.9;0.16', '3.2s', { begin: (i * 0.14) + 's' }));
      svg.appendChild(r);
    }
    svg.appendChild(txt(cx - 6, by + 6 * (bh + 1), '12 个模块', MUTE, 9, 'end'));
    var ly = by + n * (bh + 1) + 6;
    svg.appendChild(svgEl('rect', { x: cx + 20, y: ly, width: w - 40, height: 22, rx: 3, fill: SURF, stroke: MUTE, 'stroke-width': '1.4' }));
    svg.appendChild(txt(cx + w / 2, ly + 15, '最终层归一化', SOFT, 9));
    // 语言模型输出头（LM Head）。
    var hy = ly + 32;
    svg.appendChild(svgEl('rect', { x: cx + 20, y: hy, width: w - 40, height: 26, rx: 4, fill: BG, stroke: BP, 'stroke-width': '1.8' }));
    svg.appendChild(txt(cx + w / 2, hy + 17, '语言模型头 → 分数', BP, 9));
    // 权重共享（Weight Tying）弧线：输出头复用词元表。
    var tie = svgEl('path', { d: 'M' + (cx + 20) + ' ' + (hy + 13) + ' C 90 ' + (hy + 13) + ', 90 39, ' + cx + ' 39', fill: 'none', stroke: BP, 'stroke-width': '1.8', 'stroke-dasharray': '6 5' });
    tie.appendChild(anim('stroke-dashoffset', '200;0', '2.6s'));
    svg.appendChild(tie);
    svg.appendChild(txt(78, (hy + 39) / 2 + 20, '权重', BP, 9, 'middle'));
    svg.appendChild(txt(78, (hy + 39) / 2 + 32, '共享', BP, 9, 'middle'));
    // 右侧统计参数量。
    svg.appendChild(txt(440, 70, '总计 124M 参数', INK, 11, 'middle'));
    svg.appendChild(txt(440, 88, '50257 × 768', SOFT, 9, 'middle'));
    svg.appendChild(txt(440, 102, '+ 1024 × 768', SOFT, 9, 'middle'));
    svg.appendChild(txt(440, 116, '+ 12 个模块', SOFT, 9, 'middle'));
    svg.appendChild(txt(440, 132, '输出头不增加参数', BP, 9, 'middle'));
    svg.appendChild(txt(440, 146, '（共享权重）', BP, 9, 'middle'));
    card(host, '组装 GPT（GPT Assembly）', '嵌入 · 堆叠 · 共享',
      svg,
      '整个 124M 参数模型由四部分组成：相加的词元表与位置表、依次点亮的十二个同构模块、最终层归一化（LayerNorm），以及语言模型输出头（Language-model Head）。输出头不引入新权重，而是复用词元嵌入矩阵的转置；在这一规模下，权重共享（Weight Tying）节省约 38M 参数，使总参数量与参考模型一致。');
  }

  // 第 37 课：权重重映射（Weight Remapping），将预训练参数名映射到本地名称。
  function weightRemap(host) {
    var svg = svgEl('svg', { viewBox: '0 0 520 240' });
    var lx = 30, rx = 330, w = 168, rh = 34, gap = 10, y0 = 40;
    var src = ['wte', 'h.0.attn.c_attn', 'h.0.mlp.c_fc'];
    var dst = ['tok_embed', 'blocks.0.attn.qkv', 'blocks.0.mlp.fc1'];
    svg.appendChild(txt(lx + w / 2, 24, '预训练参数名', MUTE, 10));
    svg.appendChild(txt(rx + w / 2, 24, '本地模型', BP, 10));
    var i;
    for (i = 0; i < src.length; i++) {
      var y = y0 + i * (rh + gap);
      svg.appendChild(svgEl('rect', { x: lx, y: y, width: w, height: rh, rx: 4, fill: BG, stroke: RULE, 'stroke-width': '1.4' }));
      svg.appendChild(txt(lx + w / 2, y + 21, src[i], SOFT, 10));
      svg.appendChild(svgEl('rect', { x: rx, y: y, width: w, height: rh, rx: 4, fill: BP, opacity: '0.1', stroke: BP, 'stroke-width': '1.6' }));
      svg.appendChild(txt(rx + w / 2, y + 21, dst[i], BP, 10));
      // 张量沿映射连线移动，只有形状检查通过后才写入目标参数。
      var midY = y + rh / 2;
      var wire = svgEl('path', { d: 'M' + (lx + w) + ' ' + midY + ' H' + (lx + w + 60) + ' L' + (rx - 60) + ' ' + midY + ' H' + rx, fill: 'none', stroke: RULE, 'stroke-width': '1.2', 'stroke-dasharray': '4 4' });
      svg.appendChild(wire);
      var pkt = svgEl('rect', { x: lx + w, y: midY - 6, width: 14, height: 12, rx: 2, fill: i === 2 ? WARN : BP });
      pkt.appendChild(anim('x', (lx + w) + ';' + (rx - 14) + ';' + (rx - 14), '3s', { begin: (i * 0.5) + 's', keyTimes: '0;0.7;1' }));
      if (i === 2) pkt.appendChild(anim('opacity', '1;1;0.15', '3s', { begin: '1s', keyTimes: '0;0.7;1' }));
      svg.appendChild(pkt);
    }
    // 中间的形状检查门禁。
    svg.appendChild(svgEl('rect', { x: 248, y: y0, width: 24, height: 3 * (rh + gap) - gap, rx: 4, fill: SURF, stroke: MUTE, 'stroke-width': '1.4' }));
    svg.appendChild(txt(260, y0 - 6, '形状', MUTE, 8));
    svg.appendChild(txt(260, y0 + (3 * (rh + gap) - gap) / 2, '检查', MUTE, 8, 'middle'));
    svg.appendChild(txt(rx + w / 2, y0 + 3 * (rh + gap) + 8, '✗ 形状不匹配，已记录', WARN, 8, 'middle'));
    card(host, '权重重映射（Weight Remapping）', '重命名 · 检查形状 · 赋值',
      svg,
      '公开检查点（Checkpoint）使用原始实现的参数名，未必与本地模型一致。加载器先执行名称映射，再统一检查形状（Shape）：匹配的张量在 no_grad 下复制到本地参数；不匹配的项记入日志并拒绝加载。每次赋值都有记录，因此错误加载会直接出现在报告中，而不会等到生成时输出乱码才暴露。');
  }

  // 第 39 课：监督微调（SFT）的损失掩码，指令词元设为 -100，只计算回答部分的损失。
  function sftMasking(host) {
    var svg = svgEl('svg', { viewBox: '0 0 520 220' });
    var toks = ['<INST>', 'capital', 'of', 'France', '<RESP>', 'Paris', 'is', 'it'];
    var mask = [0, 0, 0, 0, 0, 1, 1, 1]; // 1 表示回答词元，计入损失。
    var bw = 56, gap = 4, x0 = 24, y = 56;
    svg.appendChild(txt(x0, 16, '一条因果序列', MUTE, 10, 'start'));
    var i;
    for (i = 0; i < toks.length; i++) {
      var x = x0 + i * (bw + gap);
      var scored = mask[i] === 1;
      svg.appendChild(svgEl('rect', { x: x, y: y, width: bw, height: 30, rx: 3, fill: scored ? BG : SURF, stroke: scored ? BP : MUTE, 'stroke-width': scored ? '1.8' : '1.2' }));
      svg.appendChild(txt(x + bw / 2, y + 20, toks[i], scored ? BP : MUTE, 9));
      // 每个词元下方的损失标签。
      var ly = y + 56;
      if (scored) {
        svg.appendChild(txt(x + bw / 2, ly, 'CE', BP, 9));
      } else {
        svg.appendChild(txt(x + bw / 2, ly, '-100', MUTE, 9));
      }
    }
    // 用括号标出被掩码的指令区域。
    var instW = 5 * (bw + gap) - gap;
    svg.appendChild(svgEl('path', { d: 'M' + x0 + ' ' + (y - 8) + ' V' + (y - 14) + ' H' + (x0 + instW) + ' V' + (y - 8), fill: 'none', stroke: MUTE, 'stroke-width': '1.4' }));
    svg.appendChild(txt(x0 + instW / 2, y - 20, '指令：掩码，不产生梯度', MUTE, 9));
    var respX = x0 + 5 * (bw + gap);
    var respW = 3 * (bw + gap) - gap;
    svg.appendChild(svgEl('path', { d: 'M' + respX + ' ' + (y - 8) + ' V' + (y - 14) + ' H' + (respX + respW) + ' V' + (y - 8), fill: 'none', stroke: BP, 'stroke-width': '1.6' }));
    svg.appendChild(txt(respX + respW / 2, y - 20, '回答：计入损失', BP, 9));
    // 示意只有回答区域贡献损失梯度。
    var gy = y + 78;
    var grad = svgEl('path', { d: 'M' + (respX + respW / 2) + ' ' + gy + ' V' + (gy + 24), fill: 'none', stroke: BP, 'stroke-width': '2', 'stroke-dasharray': '5 4' });
    grad.appendChild(anim('stroke-dashoffset', '0;18', '1s'));
    svg.appendChild(grad);
    svg.appendChild(svgEl('polygon', { points: (respX + respW / 2 - 4) + ',' + (gy + 24) + ' ' + (respX + respW / 2 + 4) + ',' + (gy + 24) + ' ' + (respX + respW / 2) + ',' + (gy + 32), fill: BP }));
    svg.appendChild(txt(respX + respW / 2, gy + 46, '更新', BP, 9));
    card(host, '监督微调损失掩码（SFT Loss Mask）', '忽略指令 · 计算回答损失',
      svg,
      '指令微调（Instruction Tuning）用边界词元将每个样本拼成一条序列，指令作为已给定的条件，不作为预测目标。批次整理函数（Collate Function）将这些位置的标签设为 ignore_index 值 -100，使交叉熵（Cross-entropy，CE）计算跳过它们。只有回答边界之后的词元贡献损失，让梯度推动模型生成答案，而非记忆提示词。');
  }

  // 第 43 课：HDF5 先缓冲再扩展，缓冲区满后调整数据集大小并写入新增区间。
  function hdf5Buffer(host) {
    var svg = svgEl('svg', { viewBox: '0 0 520 230' });
    // 左侧传入词元流。
    svg.appendChild(txt(60, 36, '已分词文档', MUTE, 10));
    var fy = 50;
    var b;
    for (b = 0; b < 4; b++) {
      var dot = svgEl('circle', { r: 4, fill: BP });
      dot.appendChild(svgEl('animateMotion', { dur: '2.4s', repeatCount: 'indefinite', path: 'M30 ' + (fy + 14) + ' H150', begin: (b * 0.6) + 's' }));
      svg.appendChild(dot);
    }
    // 内存缓冲区累积至一个数据块的大小。
    var bx = 156, by = 50, bw = 110, bh = 28;
    svg.appendChild(svgEl('rect', { x: bx, y: by, width: bw, height: bh, rx: 3, fill: 'none', stroke: MUTE, 'stroke-width': '1.6' }));
    svg.appendChild(txt(bx + bw / 2, by - 8, '缓冲区（一个块）', MUTE, 9));
    var fill = svgEl('rect', { x: bx + 1, y: by + 1, width: 0, height: bh - 2, rx: 2, fill: BP, opacity: '0.45' });
    fill.appendChild(anim('width', '0;' + (bw - 2) + ';' + (bw - 2) + ';0;0', '3.2s', { keyTimes: '0;0.5;0.6;0.62;1' }));
    svg.appendChild(fill);
    // 缓冲区满后显示刷写箭头。
    var flush = svgEl('path', { d: 'M' + (bx + bw) + ' ' + (by + bh / 2) + ' H' + (bx + bw + 40), fill: 'none', stroke: BP, 'stroke-width': '2', 'stroke-dasharray': '6 4' });
    flush.appendChild(anim('stroke-dashoffset', '20;0', '0.8s', { begin: '1.6s' }));
    flush.appendChild(anim('opacity', '0;0;1;1;0', '3.2s', { keyTimes: '0;0.48;0.52;0.9;1' }));
    svg.appendChild(flush);
    svg.appendChild(txt(bx + bw + 20, by - 8, '刷写', BP, 8));
    // 每次刷写将 HDF5 数据集扩展一个块。
    var hx = 320, hy = 46, ch = 36, chunks = 4, cyc;
    svg.appendChild(txt(hx + (chunks * (ch + 4)) / 2, hy - 12, 'HDF5 可扩展数据集', SOFT, 9));
    for (cyc = 0; cyc < chunks; cyc++) {
      var cxp = hx + cyc * (ch + 4);
      var c = svgEl('rect', { x: cxp, y: hy, width: ch, height: 40, rx: 3, fill: BP, opacity: '0.12', stroke: BP, 'stroke-width': '1.4' });
      if (cyc === chunks - 1) {
        c.setAttribute('stroke-dasharray', '4 3');
        c.appendChild(anim('opacity', '0;0.12;0.5;0.5', '3.2s', { keyTimes: '0;0.55;0.7;1', fill: 'freeze' }));
      }
      svg.appendChild(c);
    }
    svg.appendChild(txt(hx + (chunks - 1) * (ch + 4) + ch / 2, hy + 58, '新增区间', BP, 8));
    // 训练时通过 mmap 读取的标记。
    svg.appendChild(svgEl('rect', { x: hx, y: 150, width: chunks * (ch + 4) - 4, height: 26, rx: 3, fill: SURF, stroke: MUTE, 'stroke-width': '1.4' }));
    svg.appendChild(txt(hx + (chunks * (ch + 4)) / 2 - 2, 167, 'mmap 切片 → 批次缓冲区', SOFT, 9));
    var rd = svgEl('rect', { x: hx, y: 151, width: 30, height: 24, rx: 2, fill: WARN, opacity: '0.4' });
    rd.appendChild(anim('x', hx + ';' + (hx + chunks * (ch + 4) - 34) + ';' + hx, '4s'));
    svg.appendChild(rd);
    card(host, 'HDF5 语料库（HDF5 Corpus）', '缓冲 · 扩展 · mmap 读取',
      svg,
      '逐篇写入文档会造成文件碎片；等全部数据准备好再一次写入，则可能在崩溃时丢失整个分片。这里采用先缓冲再扩展（Buffer-then-extend）：累积词元，直到缓冲区达到一个数据块（Chunk）的大小，再将数据集扩展相同大小，写入新增区间。训练时通过内存映射（Memory Mapping）的切片，将超矩形数据片（Hyperslab）从页缓存（Page Cache）直接复制到批次缓冲区。');
  }

  // 第 46 课：梯度累积（Gradient Accumulation），逐个微批次累加梯度，最后统一更新。
  function gradAccum(host) {
    var svg = svgEl('svg', { viewBox: '0 0 520 230' });
    var n = 4, bw = 70, gap = 22, x0 = 36, y = 40;
    svg.appendChild(txt(260, 22, '一个有效批次 = 4 个微批次', MUTE, 10));
    // 梯度缓冲条随微批次处理逐渐填满。
    var gy = 150, gx = x0, gw = n * (bw + gap) - gap;
    svg.appendChild(svgEl('rect', { x: gx, y: gy, width: gw, height: 24, rx: 3, fill: 'none', stroke: MUTE, 'stroke-width': '1.6' }));
    svg.appendChild(txt(gx, gy - 8, '梯度累积缓冲区', MUTE, 9, 'start'));
    var fill = svgEl('rect', { x: gx + 1, y: gy + 1, width: 0, height: 22, rx: 2, fill: BP, opacity: '0.4' });
    fill.appendChild(anim('width', '0;' + (gw / 4) + ';' + (gw / 2) + ';' + (3 * gw / 4) + ';' + (gw - 2) + ';0;0', '4s', { keyTimes: '0;0.2;0.4;0.6;0.85;0.9;1' }));
    svg.appendChild(fill);
    var i;
    for (i = 0; i < n; i++) {
      var x = x0 + i * (bw + gap);
      var last = i === n - 1;
      var g = svgEl('g', {});
      g.appendChild(svgEl('rect', { x: x, y: y, width: bw, height: 40, rx: 4, fill: BG, stroke: BP, 'stroke-width': '1.6' }));
      g.appendChild(txt(x + bw / 2, y + 18, '微批次 ' + (i + 1), BP, 9));
      g.appendChild(txt(x + bw / 2, y + 32, 'loss / 4', SOFT, 8));
      g.appendChild(anim('opacity', '0.35;1;0.35', '4s', { begin: (i * 0.5) + 's', keyTimes: '0;0.5;1' }));
      svg.appendChild(g);
      // 缩放后的反向传播梯度沿箭头进入缓冲区。
      var arr = svgEl('line', { x1: x + bw / 2, y1: y + 40, x2: x + bw / 2, y2: gy, stroke: last ? WARN : BP, 'stroke-width': '1.6', 'stroke-dasharray': '5 4' });
      arr.appendChild(anim('stroke-dashoffset', '0;18', '0.9s', { begin: (i * 0.5) + 's' }));
      svg.appendChild(arr);
      if (last) svg.appendChild(txt(x + bw / 2, y + 54, '同步', WARN, 8));
    }
    // 缓冲区满后，优化器只执行一次更新。
    var sx = gx + gw + 18;
    var stepg = svgEl('g', {});
    stepg.appendChild(svgEl('rect', { x: sx, y: gy - 4, width: 86, height: 32, rx: 5, fill: WARN, opacity: '0.16', stroke: WARN, 'stroke-width': '2' }));
    stepg.appendChild(txt(sx + 43, gy + 16, '优化器更新', WARN, 9));
    stepg.appendChild(anim('opacity', '0.15;0.15;1;0.15', '4s', { keyTimes: '0;0.82;0.88;1' }));
    svg.appendChild(stepg);
    svg.appendChild(txt(sx + 43, gy + 44, '每个有效批次', MUTE, 8));
    svg.appendChild(txt(sx + 43, gy + 56, '更新一次', MUTE, 8));
    card(host, '梯度累积（Gradient Accumulation）', '逐步累积 · 最后更新',
      svg,
      '当加速器只能容纳 32 个样本，而训练需要 512 个样本的有效批次（Effective Batch）时，可以逐个微批次（Micro-batch）执行反向传播，在参数的梯度缓冲区中累加结果。每次损失除以累积次数，使累加值与一次完整批次反向传播一致。缓冲区满后，优化器仅更新一次，同步也推迟到最后一个微批次。');
  }

  // 第 47 课：原子检查点（Atomic Checkpoint），写临时文件、fsync，再重命名替换旧文件。
  function atomicCheckpoint(host) {
    var svg = svgEl('svg', { viewBox: '0 0 520 240' });
    // 左侧各项训练状态汇入一个文件。
    var px = 30, py = 36, bw = 116, bh = 18, gap = 5;
    var parts = ['模型', '优化器', '调度器', '步数 + 损失', '随机数生成器状态'];
    svg.appendChild(txt(px + bw / 2, py - 10, '检查点内容', MUTE, 9));
    var i;
    for (i = 0; i < parts.length; i++) {
      var yy = py + i * (bh + gap);
      var r = svgEl('rect', { x: px, y: yy, width: bw, height: bh, rx: 2, fill: BP, opacity: '0.12', stroke: BP, 'stroke-width': '1' });
      r.appendChild(anim('opacity', '0.12;0.6;0.12', '3.5s', { begin: (i * 0.2) + 's' }));
      svg.appendChild(r);
      svg.appendChild(txt(px + bw / 2, yy + 13, parts[i], SOFT, 8));
    }
    // 写入临时文件。
    var tx = 220, ty = 70;
    var flow = svgEl('path', { d: 'M' + (px + bw) + ' ' + (py + 50) + ' H' + tx, fill: 'none', stroke: BP, 'stroke-width': '2', 'stroke-dasharray': '6 5' });
    flow.appendChild(anim('stroke-dashoffset', '22;0', '1s'));
    svg.appendChild(flow);
    svg.appendChild(svgEl('rect', { x: tx, y: ty, width: 96, height: 46, rx: 5, fill: 'none', stroke: MUTE, 'stroke-width': '1.6', 'stroke-dasharray': '4 4' }));
    svg.appendChild(txt(tx + 48, ty + 20, 'ckpt.tmp', MUTE, 10));
    svg.appendChild(txt(tx + 48, ty + 36, '写入 + fsync', MUTE, 8));
    // 沿弧线原子重命名为最终文件名。
    var fx = 400, fy = 70;
    var ren = svgEl('path', { d: 'M' + (tx + 96) + ' ' + (ty + 23) + ' C ' + (fx - 20) + ' ' + (ty + 23) + ', ' + (fx - 20) + ' ' + (fy + 23) + ', ' + fx + ' ' + (fy + 23), fill: 'none', stroke: BP, 'stroke-width': '2', 'stroke-dasharray': '7 5' });
    ren.appendChild(anim('stroke-dashoffset', '40;0', '1.4s', { begin: '1s' }));
    svg.appendChild(ren);
    svg.appendChild(txt((tx + fx) / 2 + 48, ty + 6, 'os.replace', BP, 9, 'middle'));
    svg.appendChild(txt((tx + fx) / 2 + 48, ty - 8, '原子操作', BP, 8, 'middle'));
    var fin = svgEl('g', {});
    fin.appendChild(svgEl('rect', { x: fx, y: fy, width: 96, height: 46, rx: 5, fill: BP, opacity: '0.14', stroke: BP, 'stroke-width': '2.2' }));
    fin.appendChild(txt(fx + 48, fy + 20, 'ckpt.pt', BP, 10));
    fin.appendChild(txt(fx + 48, fy + 36, '始终有效', SOFT, 8));
    fin.appendChild(anim('opacity', '0.2;0.2;1;1', '2.4s', { keyTimes: '0;0.55;0.75;1', fill: 'freeze' }));
    svg.appendChild(fin);
    // 闪电示意崩溃发生在临时文件写入期间，最终文件不受影响。
    var bolt = svgEl('g', {});
    bolt.appendChild(svgEl('polygon', { points: (tx + 48) + ',150 ' + (tx + 40) + ',172 ' + (tx + 52) + ',172 ' + (tx + 44) + ',192', fill: 'none', stroke: WARN, 'stroke-width': '2' }));
    bolt.appendChild(txt(tx + 48, 206, '此时崩溃？', WARN, 8));
    bolt.appendChild(txt(tx + 48, 218, '旧文件仍完好', WARN, 8));
    bolt.appendChild(anim('opacity', '0;1;0', '2.4s'));
    svg.appendChild(bolt);
    card(host, '原子检查点（Atomic Checkpoint）', '写入临时文件 · 重命名替换',
      svg,
      '恢复训练需要完整状态：模型、优化器、调度器、步数计数，以及每个随机源的随机数生成器（Random Number Generator，RNG）状态；否则，恢复后的损失曲线会偏离不中断训练的结果。保存时先写入临时文件，执行 fsync，再重命名替换最终文件。由于 POSIX rename 具有原子性（Atomicity），写入中途崩溃仍会保留上一个完好的检查点，而不会留下只写了一半的最终文件。');
  }

  LF.register({
    'cc-embedding-lookup': embeddingLookup,
    'cc-transformer-block': transformerBlock,
    'cc-gpt-assembly': gptAssembly,
    'cc-weight-remap': weightRemap,
    'cc-sft-loss-mask': sftMasking,
    'cc-hdf5-corpus': hdf5Buffer,
    'cc-grad-accumulation': gradAccum,
    'cc-atomic-checkpoint': atomicCheckpoint
  });
})();
