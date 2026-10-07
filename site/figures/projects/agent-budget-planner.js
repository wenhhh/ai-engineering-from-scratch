(function () {
  'use strict';
  const unit = 'teaching units';
  const number = (key, label, value) => ({ key, label, type: 'number', value, min: 0, step: 1 });
  const integer = (value, label) => {
    if (!Number.isSafeInteger(value) || value < 0) throw new Error(label + ' 必须是非负安全整数（needs a nonnegative safe integer）。');
    return value;
  };
  const copy = value => JSON.parse(JSON.stringify(value));
  const item = (id, label, value, detail, tone = 'neutral') => ({ id, label, value, detail, tone });
  const lane = (id, label, items) => ({ id, label, items });
  const finish = frames => Object.assign({}, frames[frames.length - 1], { frames });
  const held = state => Object.values(state.holds).reduce((sum, value) => sum + value, 0);
  const available = state => state.limit - state.spent - held(state);
  const bars = state => [
    { label: '已支出', value: state.spent, max: state.limit, unit },
    { label: '已预留', value: held(state), max: state.limit, unit },
    { label: '可用额度（Available）', value: available(state), max: state.limit, unit },
  ];
  function initialLedger(v, holdKey) {
    const state = {
      limit: integer(v.limit, '上限'), spent: integer(v.spent, '既有支出'),
      holds: { A: integer(v[holdKey], '现有预留 A') }, closed: [],
    };
    integer(state.spent + held(state), '已占用额度');
    if (available(state) < 0) throw new Error('既有支出与预留总额必须符合上限（must fit the limit）。');
    return state;
  }
  function ledgerLanes(state, pending = []) {
    return [
      lane('spent', '已支出', [item('prior-spend', '既有用量', state.spent, unit)]),
      lane('held', '已预留', Object.entries(state.holds).map(([id, amount]) => item('hold-' + id, '请求 ' + id, amount, unit, 'warn'))),
      lane('available', '可用额度（Available）', [item('free-capacity', '未分配额度', available(state), unit)]),
      lane('pending', '请求', pending),
    ];
  }
  function ledgerFrame(label, explanation, state, pending, extra) {
    return Object.assign({ label, explanation, summary: label, lanes: ledgerLanes(state, pending), bars: bars(state), receipt: copy(state) }, extra);
  }

  window.AIFSProjectFigures.register('pj-agent-budget-planner-1', {
    title: '用整数教学单位估算请求',
    caption: '估算由提示词成本和输出上限成本组成。这里的费率采用人为设定的教学单位。',
    lab: {
      question: '输出上限为零时，请求的哪一部分仍然产生费用？',
      controls: [number('inputTokens', '输入词元数', 120), number('outputLimit', '输出上限（词元数）', 40), number('inputRate', '输入费率（教学单位／词元）', 2), number('outputRate', '输出费率（教学单位／词元）', 5)],
      scenarios: [{ label: '默认请求', values: {} }, { label: '不输出词元', values: { outputLimit: 0 } }, { label: '提高输出上限', values: { outputLimit: 400 } }],
      calculate(v) {
        const inputTokens = integer(v.inputTokens, '输入词元数'), outputLimit = integer(v.outputLimit, '输出上限');
        const inputRate = integer(v.inputRate, '输入费率'), outputRate = integer(v.outputRate, '输出费率');
        const inputCost = integer(inputTokens * inputRate, '输入乘积（Input product）'), outputCost = integer(outputLimit * outputRate, '输出乘积（Output product）');
        const total = integer(inputCost + outputCost, '估算总额');
        const operands = [item('prompt', '输入词元数', inputTokens, 'tokens'), item('input-rate', '输入费率', inputRate, unit + '/token'), item('output', '输出上限', outputLimit, 'tokens'), item('output-rate', '输出费率', outputRate, unit + '/token')];
        const inputTerm = item('input-term', '提示词成本', inputCost, unit, 'active');
        const outputTerm = item('output-term', '输出上限成本', outputCost, unit, 'active');
        return finish([
          { label: '校验操作数', explanation: '四个操作数都必须是非负整数。输出上限约束允许生成的词元数，实际用量凭据仍需随后取得。', summary: '两项词元数量与两项整数费率', lanes: [lane('operands', '操作数', operands), lane('products', '乘积', [])], formula: '输入词元数 × 输入费率 + 输出上限 × 输出费率' },
          { label: '计算提示词费用', explanation: '即使输出上限为零，输入词元仍然计费。', summary: '提示词费用已计算', lanes: [lane('operands', '操作数', operands), lane('products', '乘积', [inputTerm])], links: [{ from: 'prompt', to: 'input-term', label: '乘以输入费率' }], formula: `${inputTokens} × ${inputRate} = ${inputCost} ${unit}`, metrics: [{ label: '提示词成本', value: inputCost + ' ' + unit }] },
          { label: '计算输出上限费用', explanation: '将允许的最大输出词元数乘以输出费率。此时尚未取得实际用量。', summary: '两项费用均已计算', lanes: [lane('operands', '操作数', operands), lane('products', '乘积', [inputTerm, outputTerm])], links: [{ from: 'output', to: 'output-term', label: '乘以输出费率' }], formula: `${outputLimit} × ${outputRate} = ${outputCost} ${unit}`, metrics: [{ label: '提示词成本', value: inputCost }, { label: '输出上限成本', value: outputCost }] },
          { label: '合计估算费用', explanation: `请求需要预留 ${total} ${unit} 的上限额度，随后按实际凭据结算。`, summary: '估算上限：' + total + ' ' + unit, lanes: [lane('products', '费用组成', [inputTerm, outputTerm]), lane('estimate', '估算', [item('total', '请求费用上限', total, unit, 'good')])], links: [{ from: 'input-term', to: 'total', label: '加上提示词费用' }, { from: 'output-term', to: 'total', label: '加上输出上限费用' }], formula: `${inputCost} + ${outputCost} = ${total} ${unit}`, metrics: [{ label: '估算上限', value: total + ' ' + unit }], receipt: { unit: 'teaching_units', input_cost: inputCost, output_ceiling_cost: outputCost, estimate: total } },
        ]);
      },
    },
  });

  window.AIFSProjectFigures.register('pj-agent-budget-planner-2', {
    title: '派发前预留额度',
    caption: '准入时同时计入支出与现有预留。预留被拒绝时，原账本保持不变。',
    lab: {
      question: '计入支出与现有预留后，本次申请是否能装入剩余额度？',
      controls: [number('limit', '额度上限（教学单位）', 100), number('spent', '既有支出', 20), number('existingHold', '现有预留 A', 30), { key: 'requestId', label: '新请求 ID', type: 'text', value: 'B' }, number('amount', '申请预留额', 60)],
      scenarios: [{ label: '额度不足', values: {} }, { label: '恰好用完剩余额度', values: { amount: 50 } }, { label: '重复请求 ID', values: { requestId: 'A', amount: 1 } }, { label: '零额度预留', values: { amount: 0 } }],
      calculate(v) {
        const before = initialLedger(v, 'existingHold');
        const amount = integer(v.amount, '预留额度');
        const id = v.requestId;
        const validId = typeof id === 'string' && id.length > 0 && !Object.hasOwn(before.holds, id) && !before.closed.includes(id);
        const request = item('new-request', '请求 ' + (id || '（空）'), amount, '申请 ' + unit, 'active');
        const frames = [ledgerFrame('读取账本', `${before.limit} − ${before.spent} − ${held(before)} = ${available(before)} ${unit} 可用。现有预留 A 仍占用额度。`, before, [request], { formula: `${before.limit} − ${before.spent} − ${held(before)} = ${available(before)}` })];
        frames.push(ledgerFrame('检查请求标识', validId ? `ID ${id} 尚未预留，也未关闭；接下来检查额度。` : '预留需要全新且非空的 ID。标识检查失败时，不继续检查额度。', before, [Object.assign({}, request, { tone: validId ? 'active' : 'bad' })]));
        const reason = !validId ? 'new request id required' : amount > available(before) ? 'budget exceeded' : null;
        if (reason) {
          frames.push(ledgerFrame('拒绝并保持原状态', reason === 'budget exceeded' ? `申请 ${amount}，超过可用的 ${available(before)}。额度不发生转移，A 的预留保持不变。` : '不创建预留；支出、预留 A 和可用额度均保持原值。', before, [Object.assign({}, request, { tone: 'bad', detail: reason })], { receipt: { status: 'rejected', reason, before: copy(before), after: copy(before) } }));
        } else {
          frames.push(ledgerFrame('额度足够', `${amount} ≤ ${available(before)}。准入判断与额度预留现在可以组成一次状态转换。`, before, [request], { formula: `${amount} ≤ ${available(before)}` }));
          const after = { ...before, holds: { ...before.holds, [id]: amount }, closed: [...before.closed] };
          const lanes = ledgerLanes(before);
          lanes.find(entry => entry.id === 'available').items[0].value = available(after);
          lanes.find(entry => entry.id === 'held').items.push(Object.assign({}, request, { label: '请求 ' + id, detail: '已预留 ' + unit, tone: 'good' }));
          frames.push(ledgerFrame('预留已记录', `${amount} ${unit} 从可用额度转入预留 ${id}。原账本不变，返回的新账本包含两笔预留。`, after, [], { lanes, links: [{ from: 'free-capacity', to: 'new-request', label: amount + ' ' + unit + ' 已预留' }], receipt: { status: 'reserved', before: copy(before), after: copy(after) } }));
        }
        return finish(frames);
      },
    },
  });

  window.AIFSProjectFigures.register('pj-agent-budget-planner-3', {
    title: '结算实际用量并释放剩余额度',
    caption: '凭据缺失或超出预留上限时，保留额度等待核对。确认有效的零费用凭据可以释放预留。',
    lab: {
      question: '有效凭据到达后，实际费用与预留中未使用的部分分别转入哪里？',
      controls: [number('limit', '额度上限（教学单位）', 100), number('spent', '既有支出', 20), number('hold', '现有预留 A', 70), number('actual', '实际凭据金额（教学单位）', 20), { key: 'missing', label: '凭据缺失', type: 'checkbox', value: false }, { key: 'duplicate', label: '重复提交同一凭据', type: 'checkbox', value: false }],
      scenarios: [{ label: '结算 20，释放 50', values: {} }, { label: '确认零费用凭据', values: { actual: 0 } }, { label: '缺少凭据', values: { missing: true } }, { label: '超出上限', values: { actual: 71 } }, { label: '重复凭据', values: { duplicate: true } }],
      calculate(v) {
        const before = initialLedger(v, 'hold');
        const actual = v.missing ? null : integer(v.actual, '实际凭据');
        const frames = [ledgerFrame('定位预留 A', `A 预留 ${v.hold} ${unit}，最终费用尚未结算；仍有 ${available(before)} 可用。`, before, [])];
        if (v.missing || actual > v.hold) {
          const reason = v.missing ? 'missing receipt' : 'actual cost exceeds reservation';
          frames.push(ledgerFrame('保留 A 的预留', v.missing ? '没有凭据时，工作可能已经执行。释放 A 会隐藏未知费用，应完整保留其预留并等待核对。' : `${actual} 超过 A 的 ${v.hold} 单位上限。拒绝该凭据，账本保持不变并等待核对。`, before, [], { summary: '需要核对；A 的预留已保留', receipt: { status: 'needs_reconciliation', reason, ledger: copy(before) } }));
          return finish(frames);
        }
        frames.push(ledgerFrame('校验凭据', `${actual} 为非负整数，且不超过 ${v.hold} 单位的预留；A 尚未关闭。`, before, [], { formula: `0 ≤ ${actual} ≤ ${v.hold}`, receipt: { request_id: 'A', actual, ledger: copy(before) } }));
        const unused = v.hold - actual;
        const partition = ledgerLanes(before);
        partition.find(entry => entry.id === 'held').items = [item('hold-A', 'A：实际使用部分', actual, '仍为预留，尚未计入支出', 'active'), item('unused-A', 'A：未使用部分', unused, '仍为预留，尚未恢复可用', 'active')];
        frames.push(ledgerFrame('拆分预留额度', `${v.hold} = ${actual} 实际费用 + ${unused} 未使用额度。结算提交前，两部分仍属于预留。`, before, [], { lanes: partition, formula: `${v.hold} = ${actual} + ${unused}` }));
        const after = { limit: before.limit, spent: before.spent + actual, holds: {}, closed: ['A'] };
        const settled = copy(partition);
        settled.find(entry => entry.id === 'held').items = [];
        settled.find(entry => entry.id === 'spent').items.push(item('hold-A', 'A：已结算用量', actual, unit, 'good'));
        settled.find(entry => entry.id === 'available').items.push(item('unused-A', 'A：已释放额度', unused, unit, 'good'));
        const receipt = { status: 'settled', actual, released: unused, before: copy(before), after: copy(after) };
        frames.push(ledgerFrame('仅提交一次结算', `${actual} 转入支出，${unused} 恢复为可用额度。A 关闭，当前可用额度为 ${available(after)}。`, after, [], { lanes: settled, metrics: [{ label: '实际用量', value: actual + ' ' + unit }, { label: '已释放', value: unused + ' ' + unit }], receipt }));
        if (v.duplicate) {
          frames.push(ledgerFrame('拒绝第二次凭据', 'A 已关闭，不再存在预留。第二次凭据不能对同一工作重复收费；已结算账本保持不变。', after, [], { lanes: settled, receipt: { ...receipt, second_receipt: { status: 'rejected', reason: 'unknown reservation', before: copy(after), after: copy(after) } } }));
        }
        return finish(frames);
      },
    },
  });

  window.AIFSProjectFigures.register('pj-agent-budget-planner-4', {
    title: '在预算和截止时间内回放有序任务',
    caption: '确定性准入回放采用已知费用与时长，不能中断正在执行的同步回调。',
    lab: {
      question: '各项检查允许或拒绝了哪些任务？这些决定如何影响支出和耗时？',
      controls: [
        number('limit', '预算上限（教学单位）', 100), number('deadline', '截止时间（ms）', 100),
        number('costA', 'A 费用（教学单位）', 60), number('durationA', 'A 时长（ms）', 40),
        number('costB', 'B 费用（教学单位）', 50), number('durationB', 'B 时长（ms）', 30),
        number('costC', 'C 费用（教学单位）', 30), number('durationC', 'C 时长（ms）', 80),
        number('costD', 'D 费用（教学单位）', 20), number('durationD', 'D 时长（ms）', 20),
        { key: 'order', label: '任务顺序', type: 'select', value: 'ABCD', options: [{ value: 'ABCD', label: 'A, B, C, D' }, { value: 'DCBA', label: 'D, C, B, A' }, { value: 'ACBD', label: 'A, C, B, D' }] },
      ],
      scenarios: [{ label: '两种不同的拒绝原因', values: {} }, { label: '恰好到达截止时间', values: { deadline: 60 } }, { label: '全部任务均可运行', values: { limit: 160, deadline: 170 } }, { label: '反转顺序', values: { order: 'DCBA' } }, { label: '先检查截止时间再检查预算', values: { deadline: 10, limit: 10 } }],
      calculate(v) {
        const limit = integer(v.limit, '预算上限'), deadline = integer(v.deadline, '截止时间');
        if (!['ABCD', 'DCBA', 'ACBD'].includes(v.order)) throw new Error('请选择列表中的任务顺序。');
        const jobs = [...v.order].map(id => ({ id, cost: integer(v['cost' + id], id + ' 费用'), duration_ms: integer(v['duration' + id], id + ' 时长') }));
        let state = { limit, spent: 0, holds: {}, closed: [] }, elapsed = 0;
        const events = [], locations = Object.fromEntries(jobs.map(job => [job.id, 'queue'])), notes = {}, frames = [];
        function snapshot(label, explanation, formula) {
          const lanes = ['queue', 'deadline', 'budget', 'completed', 'rejected'].map(id => lane(id, { queue: '有序队列', deadline: '截止时间检查', budget: '预算检查', completed: '已完成', rejected: '已拒绝' }[id], jobs.filter(job => locations[job.id] === id).map(job => item('job-' + job.id, '任务 ' + job.id, `${job.cost} 单位 / ${job.duration_ms} ms`, notes[job.id] || '等待中', id === 'completed' ? 'good' : id === 'rejected' ? 'bad' : id === 'queue' ? 'neutral' : 'active'))));
          frames.push({ label, explanation, summary: `已支出 ${state.spent} ${unit}；已用时 ${elapsed} ms`, formula, lanes, bars: [...bars(state), { label: '已用时间', value: elapsed, max: deadline, unit: 'ms' }], receipt: { ledger: copy(state), events: copy(events), elapsed_ms: elapsed } });
        }
        snapshot('读取有序队列', '每个任务先检查截止时间，再检查预算。只有完成任务才会增加耗时与支出。');
        for (const job of jobs) {
          const predicted = integer(elapsed + job.duration_ms, '预计完成时刻');
          locations[job.id] = 'deadline';
          notes[job.id] = `${elapsed} + ${job.duration_ms} = ${predicted} ms`;
          snapshot(job.id + '：检查截止时间', `预计在 ${predicted} ms 完成，截止时间为 ${deadline} ms；允许恰好相等。`, `${elapsed} + ${job.duration_ms} = ${predicted} ms`);
          if (predicted > deadline) {
            locations[job.id] = 'rejected'; notes[job.id] = 'deadline';
            events.push({ id: job.id, status: 'rejected', reason: 'deadline' });
            snapshot(job.id + '：因截止时间拒绝', `${predicted} > ${deadline}。跳过预算检查；本次拒绝不增加支出或耗时。`);
            continue;
          }
          locations[job.id] = 'budget'; notes[job.id] = `申请 ${job.cost} / 可用 ${available(state)}`;
          snapshot(job.id + '：检查预算', `截止时间检查通过。比较费用 ${job.cost} 与可用额度 ${available(state)}。`, `${job.cost} ≤ ${available(state)}?`);
          if (job.cost > available(state)) {
            locations[job.id] = 'rejected'; notes[job.id] = 'budget exceeded';
            events.push({ id: job.id, status: 'rejected', reason: 'budget exceeded' });
            snapshot(job.id + '：因预算拒绝', `${job.cost} 超过可用额度，支出和耗时保持不变。`);
            continue;
          }
          state = { ...state, holds: { [job.id]: job.cost } };
          notes[job.id] = `完成前已预留 ${job.cost}`;
          snapshot(job.id + '：预留额度', `${job.cost} ${unit} 从可用转入预留；任务尚未完成，耗时还没有增加。`);
          state = { ...state, spent: state.spent + job.cost, holds: {}, closed: [...state.closed, job.id] };
          elapsed = predicted;
          locations[job.id] = 'completed'; notes[job.id] = `于 ${elapsed} ms 完成`;
          events.push({ id: job.id, status: 'completed', cost: job.cost, elapsed_ms: elapsed });
          snapshot(job.id + '：完成', `结算已知的 ${job.cost} 单位费用，并增加 ${job.duration_ms} ms 耗时；不再保留未结算额度。`);
        }
        return finish(frames);
      },
    },
  });
}());
