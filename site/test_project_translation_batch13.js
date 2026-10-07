// Run real source/localized calculators and the actual approval-page event handlers.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {createHash}=require('node:crypto');
const {spawnSync}=require('node:child_process');
const ROOT=path.resolve(__dirname,'..');
const fixture=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/projects-zh-batch13.json'),'utf8'));
const plain=v=>JSON.parse(JSON.stringify(v));
const saved=new Map();
function restore(current,row){
 let chars=Array.from(current);
 for(const e of [...row.edits].reverse()){
  const after=Array.from(e.after);assert.equal(chars.slice(e.afterOffset,e.afterOffset+after.length).join(''),e.after);
  chars.splice(e.afterOffset,after.length,...Array.from(e.before));
 }
 const source=chars.join('');assert.equal(createHash('sha256').update(source).digest('hex'),row.sourceSha256);return source;
}
function registry(source){
 const result=new Map();vm.runInNewContext(source,{TextEncoder,window:{AIFSProjectFigures:{register:(id,value)=>result.set(id,value)}}},{timeout:2000});return result;
}
function pairs(row){
 return row.edits.map(e=>[e.before,e.after].map(text=>vm.runInNewContext('('+text+')',{}, {timeout:100})));
}
function compare(before,after,edits,at='root'){
 if(typeof before==='function'){assert.equal(typeof after,'function',at);return;}
 if(Array.isArray(before)){
  assert.ok(Array.isArray(after),at);assert.equal(after.length,before.length,at);
  before.forEach((v,i)=>compare(v,after[i],edits,at+'['+i+']'));return;
 }
 if(before&&typeof before==='object'){
  assert.ok(after&&typeof after==='object',at);assert.deepEqual(Object.keys(after).sort(),Object.keys(before).sort(),at);
  for(const key of Object.keys(before))compare(before[key],after[key],edits,at+'.'+key);return;
 }
 if(Object.is(before,after))return;
 if(typeof before==='string'&&typeof after==='string'&&edits.some(([a,b])=>a===before&&b===after))return;
 assert.deepEqual(after,before,at);
}
function inputs(lab){
 const base=Object.fromEntries(lab.controls.map(c=>[c.key,c.value]));
 const result=[base,...(lab.scenarios||[]).map(s=>({...base,...s.values}))];
 for(const c of lab.controls){
  const variants=c.type==='checkbox'?[false,true]:c.type==='select'?c.options.map(o=>o.value):['number','range'].includes(c.type)?[c.min??0,c.max??100,1,0,-1,1.5]:[c.value,'','中文','😀 cache','Seats,Seats','<script>literal</script>'];
  for(const value of variants)result.push({...base,[c.key]:value});
 }
 return result;
}
async function evaluate(lab,input){
 try{return {ok:true,value:await lab.calculate(Object.freeze({...input}),0)};}
 catch(error){return {ok:false,name:error.name,message:error.message};}
}
for(const row of fixture.figures){
 const current=fs.readFileSync(path.join(ROOT,row.path),'utf8'),source=restore(current,row),edits=pairs(row);
 const before=registry(source),after=registry(current);assert.deepEqual([...before.keys()],[...after.keys()]);
 saved.set(path.basename(row.path,'.js'),{before,after});
 for(const [id,original] of before){
  const localized=after.get(id);
  test(`${id}: Chinese displays preserve every key, control and default`,()=>{
   compare(original,localized,edits);
   assert.match(localized.title,/[\u3400-\u9fff]/);
   for(const control of localized.lab.controls)assert.match(control.label,/[\u3400-\u9fff]/);
  });
  test(`${id}: actual calculations retain full evidence for varied inputs`,async()=>{
   for(const input of inputs(original.lab)){
    const serialized=JSON.stringify(input);const left=await evaluate(original.lab,input),right=await evaluate(localized.lab,input);
    assert.equal(right.ok,left.ok,serialized);
    if(left.ok)compare(left.value,right.value,edits,serialized);
    else {assert.equal(right.name,left.name);assert.equal(right.message,left.message);}
    assert.equal(JSON.stringify(input),serialized);
   }
  });
 }
}
function python(script,cwd,input){
 const p=spawnSync('python3',['-c',script],{cwd,input:JSON.stringify(input),encoding:'utf8',timeout:10000});
 assert.equal(p.status,0,p.stderr);return JSON.parse(p.stdout);
}
test('QA original Unicode figure discrepancy remains demonstrable and disclosed',()=>{
 const text='😀 cache';const lab=saved.get('doc-qa-with-citations').after.get('pj-doc-qa-with-citations-1').lab;
 const web=lab.calculate({question:'cache',text,quote:'cache',size:35,overlap:5});
 const real=python('import json,sys\nfrom documents import chunk_document\nfrom answer import answer\nx=json.load(sys.stdin)\nc=chunk_document({"id":"d","text":x})\nprint(json.dumps(answer("cache",c,lambda _:json.dumps({"source":"d:0","quote":"cache"}))))',path.join(ROOT,'projects/doc-qa-with-citations/solution'),text);
 assert.equal(web.metrics[0].value,3);assert.equal(real.citations[0].start,2);
 assert.match(saved.get('doc-qa-with-citations').after.get('pj-doc-qa-with-citations-1').caption,/UTF-16/);
});
test('feedback original simplified figure omits actual NFKC normalization',async()=>{
 const actual=await import(require('node:url').pathToFileURL(path.join(ROOT,'projects/feedback-theme-board/solution/main.ts')).href);
 const found=actual.findEvidence({id:'u',source:'fixture',text:'ｏｌｄ pages'},'old pages');assert.ok(found);
 const figure=saved.get('feedback-theme-board').after.get('pj-feedback-theme-board-2');
 assert.equal(figure.lab.calculate({text:'ｏｌｄ pages',phrase:'old pages'}).rows.length,0);
 assert.match(figure.caption,/NFKC/);
});
test('translated approval page highlights Unicode spans and downloads the same decision',async()=>{
 const generated=python("import json,sys\nfrom main import extract_candidates,review_document,render_review\ntext='😀 姓名\\nSeats: 18\\nSeats: 24'\nschema=[{'name':'seats','type':'integer','required':True,'labels':['Seats']}]\nc=extract_candidates(text,schema)\nr=review_document(text,schema,c)\nchoice={'start':c[1]['start'],'end':c[1]['end']}\nd={'sourceSha256':r['sourceSha256'],'choices':{'seats':choice}}\nprint(json.dumps({'html':render_review(review_document(text,schema,c,d)),'decision':d,'quote':c[1]['quote']}))",path.join(ROOT,'projects/document-extraction-desk/solution'),null);
 const scripts=[...generated.html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)];
 const data=scripts.find(m=>m[1].includes('source-data'))[2],script=scripts.find(m=>!m[1].trim())[2];
 const chosen=generated.decision.choices.seats;const handlers={},selectionHandlers={};
 const input={name:'seats',dataset:{start:String(chosen.start),end:String(chosen.end)},addEventListener:(event,fn)=>{selectionHandlers[event]=fn;}};
 let nodes=[],blob=null,clicked=false,download=null;const status={textContent:''};
 const document={
  querySelector(selector){if(selector==='#source-data')return {textContent:data};if(selector==='#source')return {replaceChildren:(...xs)=>{nodes=xs;}};if(selector==='#status')return status;if(selector==='#download')return {addEventListener:(event,fn)=>{handlers[event]=fn;}};throw Error(selector);},
  querySelectorAll(selector){assert.ok(['input[type=radio]','input:checked'].includes(selector));return [input];},
  createTextNode:text=>({textContent:text}),
  createElement(tag){if(tag==='mark')return {textContent:''};assert.equal(tag,'a');return {set href(v){},set download(v){download=v;},click(){clicked=true;}};}
 };
 vm.runInNewContext(script,{document,Blob,URL:{createObjectURL:value=>{blob=value;return 'blob:fixture';},revokeObjectURL(){}},setTimeout:fn=>fn()},{timeout:2000});
 selectionHandlers.change();assert.equal(nodes[1].textContent,generated.quote);assert.equal(nodes.map(n=>n.textContent).join(''),JSON.parse(data).text);
 handlers.click();assert.ok(clicked);assert.equal(download,'approvals.json');assert.deepEqual(JSON.parse(await blob.text()),generated.decision);assert.match(status.textContent,/已保存/);
});
