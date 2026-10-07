window.AIFSProjectFigures.register("pj-document-extraction-desk-1", {
  "title": "抽取前先定义字段",
  "steps": [
    {
      "label": "观察输入",
      "detail": "检查提供的值，说明适用契约。"
    },
    {
      "label": "计算状态",
      "detail": "validate_schema(schema)"
    },
    {
      "label": "检查结果",
      "detail": "修改下方一项输入，预测结果，再解释实际计算差异。"
    }
  ],
  "caption": "原创机制示例，修改输入会立即更新计算；项目测试负责验证实际实现。"
,
"lab":{controls:[{key:'labels',label:'分配给两个字段的标签',type:'text',value:'Seats,Attendees'}],calculate(v){const labels=v.labels.split(',').map(x=>x.trim().toLowerCase()).filter(Boolean);const unique=new Set(labels);const valid=labels.length===unique.size&&labels.length>0;return {summary:valid?'每个规范化标签只对应一个目标。':'拒绝：标签重复或为空会使模式含义不明确。',metrics:[{label:'标签数',value:labels.length},{label:'不同标签数',value:unique.size}],columns:['标签','出现次数'],rows:[...unique].map(label=>[label,labels.filter(x=>x===label).length])};}}
});

window.AIFSProjectFigures.register("pj-document-extraction-desk-2", {
  "title": "抽取候选值并保留证据",
  "steps": [
    {
      "label": "观察输入",
      "detail": "检查提供的值，说明适用契约。"
    },
    {
      "label": "计算状态",
      "detail": "extract_candidates(text, schema)"
    },
    {
      "label": "检查结果",
      "detail": "修改下方一项输入，预测结果，再解释实际计算差异。"
    }
  ],
  "caption": "原创机制示例，修改输入会立即更新计算；项目测试负责验证实际实现。"
,
"lab":{controls:[{key:'source',label:'来源文本',type:'text',value:'Seats: 18; revised Seats: 24'},{key:'quote',label:'候选引文',type:'text',value:'24'}],calculate(v){const text=Array.from(v.source),quote=Array.from(v.quote);const matches=[];if(quote.length)for(let i=0;i<=text.length-quote.length;i++)if(quote.every((c,j)=>c===text[i+j]))matches.push(i);return {summary:matches.length===1?'一个精确字符区间支持该引文。':matches.length?'存在多个区间：应明确保留歧义。':'没有精确区间：拒绝编造或缺失的引文。',metrics:[{label:'匹配数',value:matches.length}],columns:['起点','终点','引文'],rows:matches.map(start=>[start,start+quote.length,v.quote])};}}
});

window.AIFSProjectFigures.register("pj-document-extraction-desk-3", {
  "title": "将审批绑定到单个文档版本",
  "steps": [
    {
      "label": "观察输入",
      "detail": "检查提供的值，说明适用契约。"
    },
    {
      "label": "计算状态",
      "detail": "typed_value(quote, kind); review_document(text, schema, candidates, decisions=None)"
    },
    {
      "label": "检查结果",
      "detail": "修改下方一项输入，预测结果，再解释实际计算差异。"
    }
  ],
  "caption": "原创机制示例，修改输入会立即更新计算；项目测试负责验证实际实现。"
,
"lab":{controls:[{key:'quote',label:'整数候选',type:'text',value:'18'},{key:'approved',label:'审阅者已选中该区间',type:'checkbox',value:false},{key:'changed',label:'批准后来源发生变化',type:'checkbox',value:false}],calculate(v){const valid=/^[+-]?\d+$/.test(v.quote);const state=!valid?'invalid':v.changed&&v.approved?'stale approval':v.approved?'approved':'proposed';return {summary:state==='approved'?'有效且与来源绑定的值可以导出。':'解决失败的校验项之前，不将该值加入已批准输出。',metrics:[{label:'状态',value:state},{label:'导出值',value:state==='approved'?Number(v.quote):'none'}],columns:['校验项','结果'],rows:[['整数',valid?'valid':'invalid'],['来源版本',v.changed?'changed':'same'],['决定',v.approved?'selected':'pending']]};}}
});

window.AIFSProjectFigures.register("pj-document-extraction-desk-4", {
  "title": "展示证据并导出已审阅值",
  "steps": [
    {
      "label": "观察输入",
      "detail": "检查提供的值，说明适用契约。"
    },
    {
      "label": "计算状态",
      "detail": "render_review(report)"
    },
    {
      "label": "检查结果",
      "detail": "修改下方一项输入，预测结果，再解释实际计算差异。"
    }
  ],
  "caption": "原创机制示例，修改输入会立即更新计算；项目测试负责验证实际实现。"
,
"lab":{controls:[{key:'required',label:'必需字段数',type:'range',value:3,min:1,max:6,step:1},{key:'approved',label:'已批准的必需字段数',type:'range',value:2,min:0,max:6,step:1}],calculate(v){const accepted=Math.min(v.approved,v.required),missing=v.required-accepted;return {summary:missing?'审阅尚未完成；可选字段不能抵补必需字段。':'全部必需字段都有与来源绑定的决定。',metrics:[{label:'状态',value:missing?'needs_review':'approved'},{label:'剩余数量',value:missing}],bars:[{label:'必需字段数',value:v.required},{label:'已批准的必需字段数',value:accepted}]};}}
});
