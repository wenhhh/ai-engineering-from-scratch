window.AIFSProjectFigures.register("pj-csv-sql-question-workbench-1", {
  "title": "导入表格并明确拒绝错误",
  "steps": [
    {
      "label": "观察输入",
      "detail": "检查提供的值，说明对应契约。"
    },
    {
      "label": "计算状态",
      "detail": "load_csv(text, max_rows=10000)"
    },
    {
      "label": "检查结果",
      "detail": "改变下方一项输入，先预测结果，再解释计算出的差异。"
    }
  ],
  "caption": "原创机制示例：输入变化立即更新计算，项目测试负责验证实际实现。"
,
"lab":{controls:[{key:'cells',label:'CSV 列值（逗号分隔）',type:'text',value:'12,7,5'}],calculate(v){const values=v.cells.split(',').map(s=>s.trim()).filter(Boolean);const safe=s=>/^[+-]?(?:[0-9]+(?:\.[0-9]*)?|\.[0-9]+)(?:[eE][+-]?[0-9]+)?$/.test(s)&&!(/^[+-]?0[0-9]+$/.test(s))&&Number.isFinite(Number(s))&&Math.abs(Number(s))<=Number.MAX_SAFE_INTEGER&&!(Number(s)===0&&/[1-9]/.test(s.split(/[eE]/)[0]));const numeric=values.length>0&&values.every(safe);return {summary:numeric?'所有非空单元格都符合保守的数值契约：列类型为 REAL。':'任一单元格非数值、带前导零、过大或下溢时，保留为 TEXT。',metrics:[{label:'非空单元格',value:values.length},{label:'推断类型',value:numeric?'REAL':'TEXT'}],columns:['单元格','可安全转为数值？'],rows:values.map(s=>[s,safe(s)?'yes':'保留文本'])};}}
});

window.AIFSProjectFigures.register("pj-csv-sql-question-workbench-2", {
  "title": "将简单问题转成可检查的计划",
  "steps": [
    {
      "label": "观察输入",
      "detail": "检查提供的值，说明对应契约。"
    },
    {
      "label": "计算状态",
      "detail": "plan_question(question, data)"
    },
    {
      "label": "检查结果",
      "detail": "改变下方一项输入，先预测结果，再解释计算出的差异。"
    }
  ],
  "caption": "原创机制示例：输入变化立即更新计算，项目测试负责验证实际实现。"
,
"lab":{controls:[{key:'operation',label:'聚合',type:'select',value:'sum',options:[{value:'sum',label:'求和'},{value:'count',label:'计数'}]},{key:'field',label:'列',type:'select',value:'units',options:[{value:'units',label:'units: REAL'},{value:'region',label:'region: TEXT'}]}],calculate(v){const valid=v.operation==='count'||v.field==='units';return {summary:valid?'提案已就绪，等待独立的执行检查。':'拒绝：SUM 需要数值列。',metrics:[{label:'判断',value:valid?'propose':'reject'}],columns:['步骤','值'],rows:[['解析',v.field],['检查类型',valid?'compatible':'incompatible'],['SQL',valid?'SELECT region, '+v.operation.toUpperCase()+'('+v.field+') FROM data GROUP BY region':'未生成查询']]};}}
});

window.AIFSProjectFigures.register("pj-csv-sql-question-workbench-3", {
  "title": "在只读边界内执行提案",
  "steps": [
    {
      "label": "观察输入",
      "detail": "检查提供的值，说明对应契约。"
    },
    {
      "label": "计算状态",
      "detail": "run_query(data, sql, max_rows=100, max_steps=100000)"
    },
    {
      "label": "检查结果",
      "detail": "改变下方一项输入，先预测结果，再解释计算出的差异。"
    }
  ],
  "caption": "原创机制示例：输入变化立即更新计算，项目测试负责验证实际实现。"
,
"lab":{controls:[{key:'rows',label:'匹配行数',type:'range',value:60,min:0,max:200,step:1},{key:'limit',label:'返回行数额度',type:'range',value:40,min:1,max:100,step:1},{key:'write',label:'提案请求写入',type:'checkbox',value:false}],calculate(v){const returned=v.write?0:Math.min(v.rows,v.limit);return {summary:v.write?'授权器在任何效果发生前拒绝语句。':v.rows>v.limit?'结果明确标记为已截断。':'完整结果未超出行数额度。',metrics:[{label:'已返回',value:returned},{label:'因上限未显示',value:v.write?'查询已拒绝':Math.max(0,v.rows-v.limit)}],bars:[{label:'匹配行数',value:v.rows},{label:'返回行数',value:returned}]};}}
});

window.AIFSProjectFigures.register("pj-csv-sql-question-workbench-4", {
  "title": "发布其他开发者可复现的答案",
  "steps": [
    {
      "label": "观察输入",
      "detail": "检查提供的值，说明对应契约。"
    },
    {
      "label": "计算状态",
      "detail": "render_report(report)"
    },
    {
      "label": "检查结果",
      "detail": "改变下方一项输入，先预测结果，再解释计算出的差异。"
    }
  ],
  "caption": "原创机制示例：输入变化立即更新计算，项目测试负责验证实际实现。"
,
"lab":{controls:[{key:'west',label:'最后一条 West 记录的 units',type:'range',value:4,min:0,max:30,step:1}],calculate(v){const west=12+5+v.west;return {summary:'修改一条来源记录，会同时改变 West 聚合值和总计。',metrics:[{label:'总计',value:10+9+west}],bars:[{label:'East',value:10},{label:'South',value:9},{label:'West',value:west}],columns:['证据','值'],rows:[['West 记录','12 + 5 + '+v.west],['实际执行的聚合',west]]};}}
});
