window.AIFSProjectFigures.register("pj-feedback-theme-board-1", {
  "title": "导入具有稳定标识的反馈",
  "steps": [
    {
      "label": "观察输入",
      "detail": "检查提供的值，说明适用契约。"
    },
    {
      "label": "计算状态",
      "detail": "parseFeedback(text); validateThemes(value)"
    },
    {
      "label": "检查结果",
      "detail": "修改下方一项输入，预测结果，再解释实际计算差异。"
    }
  ],
  "caption": "原创机制示例，修改输入会立即更新计算；项目测试负责验证实际实现。 图表限制：本示例只转小写，未执行实际 TypeScript 实现的 NFKC 规范化；全角等兼容字符可能得到不同匹配结果。"
,
"lab":{controls:[{key:'ids',label:'记录 ID（以逗号分隔）',type:'text',value:'f-1,f-2,f-3'}],calculate(v){const ids=v.ids.split(',').map(x=>x.trim());const unique=new Set(ids);const valid=ids.every(Boolean)&&ids.length===unique.size;return {summary:valid?'记录标识稳定且唯一，可以匹配证据。':'拒绝空的或重复的记录标识。',metrics:[{label:'记录数',value:ids.length},{label:'不同 ID 数',value:unique.size}],columns:['ID','出现次数'],rows:[...unique].map(id=>[id,ids.filter(x=>x===id).length])};}}
});

window.AIFSProjectFigures.register("pj-feedback-theme-board-2", {
  "title": "匹配短语并保留原文区间",
  "steps": [
    {
      "label": "观察输入",
      "detail": "检查提供的值，说明适用契约。"
    },
    {
      "label": "计算状态",
      "detail": "findEvidence(row, phrase)"
    },
    {
      "label": "检查结果",
      "detail": "修改下方一项输入，预测结果，再解释实际计算差异。"
    }
  ],
  "caption": "原创机制示例，修改输入会立即更新计算；项目测试负责验证实际实现。 图表限制：本示例只转小写，未执行实际 TypeScript 实现的 NFKC 规范化；全角等兼容字符可能得到不同匹配结果。"
,
"lab":{controls:[{key:'text',label:'反馈文本',type:'text',value:'Search shows old pages after updates.'},{key:'phrase',label:'主题短语',type:'text',value:'old pages'}],calculate(v){const tokens=[...v.text.matchAll(/[\p{L}\p{N}]+/gu)],needle=[...v.phrase.matchAll(/[\p{L}\p{N}]+/gu)].map(x=>x[0].toLowerCase());let found=null;if(needle.length)for(let i=0;i<=tokens.length-needle.length;i++)if(needle.every((word,j)=>word===tokens[i+j][0].toLowerCase())){found=[tokens[i].index,tokens[i+needle.length-1].index+tokens[i+needle.length-1][0].length];break;}return {summary:found?'规则已匹配精确来源词语；含义解释仍需审阅。':'没有连续词匹配，保留为未匹配记录。',metrics:[{label:'匹配',value:found?'yes':'no'}],columns:['起点','终点','引文'],rows:found?[[found[0],found[1],v.text.slice(...found)]]:[]};}}
});

window.AIFSProjectFigures.register("pj-feedback-theme-board-3", {
  "title": "统计证据并避免夸大来源支持",
  "steps": [
    {
      "label": "观察输入",
      "detail": "检查提供的值，说明适用契约。"
    },
    {
      "label": "计算状态",
      "detail": "buildBoard(rows, themes)"
    },
    {
      "label": "检查结果",
      "detail": "修改下方一项输入，预测结果，再解释实际计算差异。"
    }
  ],
  "caption": "原创机制示例，修改输入会立即更新计算；项目测试负责验证实际实现。 图表限制：本示例只转小写，未执行实际 TypeScript 实现的 NFKC 规范化；全角等兼容字符可能得到不同匹配结果。"
,
"lab":{controls:[{key:'sources',label:'匹配记录的来源',type:'text',value:'interview-a,interview-a,support-b'}],calculate(v){const sources=v.sources.split(',').map(x=>x.trim()).filter(Boolean),unique=new Set(sources);return {summary:'同一来源的重复反馈不会增加新的来源标签。',metrics:[{label:'匹配记录数',value:sources.length},{label:'不同来源数',value:unique.size}],bars:[{label:'记录数量',value:sources.length},{label:'不同来源数量',value:unique.size}],columns:['来源','记录数'],rows:[...unique].map(s=>[s,sources.filter(x=>x===s).length])};}}
});

window.AIFSProjectFigures.register("pj-feedback-theme-board-4", {
  "title": "发布证据与可审阅的调查草稿",
  "steps": [
    {
      "label": "观察输入",
      "detail": "检查提供的值，说明适用契约。"
    },
    {
      "label": "计算状态",
      "detail": "draftIssue(theme); renderBoard(board)"
    },
    {
      "label": "检查结果",
      "detail": "修改下方一项输入，预测结果，再解释实际计算差异。"
    }
  ],
  "caption": "原创机制示例，修改输入会立即更新计算；项目测试负责验证实际实现。 图表限制：本示例只转小写，未执行实际 TypeScript 实现的 NFKC 规范化；全角等兼容字符可能得到不同匹配结果。"
,
"lab":{controls:[{key:'matched',label:'有证据的记录数',type:'range',value:4,min:0,max:20,step:1},{key:'unmatched',label:'未匹配记录数',type:'range',value:2,min:0,max:20,step:1}],calculate(v){const total=v.matched+v.unmatched,coverage=total?v.matched/total:0;return {summary:total?'将未匹配记录与主题并列展示，使覆盖缺口保持可见。':'没有记录时，不能报告完美覆盖。',metrics:[{label:'覆盖率',value:(coverage*100).toFixed(1)+'%'},{label:'待审阅',value:v.unmatched}],bars:[{label:'已匹配',value:v.matched},{label:'未匹配',value:v.unmatched}]};}}
});
