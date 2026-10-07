// Compare actual upstream/localized figure functions, including asynchronous SHA-256.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {createHash,webcrypto}=require('node:crypto');
const ROOT=path.resolve(__dirname,'..');
const fixture=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/projects-zh-batch12.json'),'utf8'));
const plain=v=>JSON.parse(JSON.stringify(v));
const display=new Set(['title','caption','label','detail','question','summary','explanation','formula']);
function restore(text,record){
  let chars=Array.from(text);
  for(const e of [...record.edits].reverse()){
    const after=Array.from(e.after);
    assert.equal(chars.slice(e.afterOffset,e.afterOffset+after.length).join(''),e.after);
    chars.splice(e.afterOffset,after.length,...Array.from(e.before));
  }
  const source=chars.join('');
  assert.equal(createHash('sha256').update(source).digest('hex'),record.sourceSha256);
  return source;
}
function literalPairs(record){
  const pairs=[];
  for(const e of record.edits){
    if(!/^['"`]/.test(e.before))continue;
    try{
      const before=vm.runInNewContext('('+e.before+')',{}, {timeout:100});
      const after=vm.runInNewContext('('+e.after+')',{}, {timeout:100});
      if(typeof before==='string'&&typeof after==='string')pairs.push([before,after]);
    }catch{/* Interpolated expressions are protected by source reversal, not evaluated here. */}
  }
  return pairs;
}
function registry(source,crypto=webcrypto){
  const result=new Map();
  vm.runInNewContext(source,{TextEncoder,window:{crypto,AIFSProjectFigures:{register:(id,value)=>result.set(id,value)}}},{timeout:2000});
  return result;
}
function equalEvidence(before,after,pairs,key='',location='root'){
  if(key==='receipt'){assert.deepEqual(plain(after),plain(before),location+' complete receipt');return;}
  if(typeof before==='function'){assert.equal(typeof after,'function',location);return;}
  if(display.has(key)){assert.equal(typeof after,typeof before,location);return;}
  if(key==='columns'){
    assert.ok(Array.isArray(before)&&Array.isArray(after));assert.equal(after.length,before.length);
    for(const value of after)assert.equal(typeof value,'string');return;
  }
  if(Array.isArray(before)){
    assert.ok(Array.isArray(after),location);assert.equal(after.length,before.length,location);
    before.forEach((value,i)=>equalEvidence(value,after[i],pairs,'',location+'['+i+']'));return;
  }
  if(before&&typeof before==='object'){
    assert.ok(after&&typeof after==='object',location);
    assert.deepEqual(Object.keys(after).sort(),Object.keys(before).sort(),location);
    for(const name of Object.keys(before))equalEvidence(before[name],after[name],pairs,name,location+'.'+name);
    return;
  }
  if(before===after)return;
  // Only exact registered display literals may differ outside explicitly display fields.
  if(typeof before==='string'&&typeof after==='string'&&pairs.some(([a,b])=>a===before&&b===after))return;
  assert.deepEqual(after,before,location);
}
async function evaluate(lab,input){
  try{return {ok:true,result:await lab.calculate(Object.freeze({...input}),0)};}
  catch(error){return {ok:false,name:error.name,message:error.message};}
}
function variedInputs(lab){
  const base=Object.fromEntries(lab.controls.map(c=>[c.key,c.value]));
  const values=[base,...(lab.scenarios||[]).map(s=>({...base,...s.values}))];
  for(const c of lab.controls){
    let candidates=[];
    if(c.type==='checkbox')candidates=[false,true];
    else if(c.type==='select')candidates=c.options.map(o=>o.value);
    else if(['number','range'].includes(c.type))candidates=[c.min??c.value,c.max??c.value,c.value];
    else if(c.type==='text'){
      candidates=[c.value,'','中文测试','<b>显示为数据</b>'];
      if(c.key==='durations')candidates=[c.value,'0','10,20','1,NaN',Array(33).fill('1').join(',')];
      if(c.key==='ids')candidates=[c.value,'','a,a','中文,é','single-case'];
    }
    for(const value of candidates)values.push({...base,[c.key]:value});
  }
  return values;
}
let dataset;
for(const record of fixture.figures){
  const current=fs.readFileSync(path.join(ROOT,record.path),'utf8');
  const source=restore(current,record);const pairs=literalPairs(record);
  const before=registry(source),after=registry(current);
  assert.deepEqual([...after.keys()],[...before.keys()]);
  if(record.path.endsWith('/dataset-split-auditor.js'))dataset={before,after,current};
  for(const [id,original] of before){
    const translated=after.get(id);
    test(`${id}: labels are Chinese and all control/default contracts remain exact`,()=>{
      equalEvidence(original,translated,pairs);
      assert.match(translated.title,/[\u3400-\u9fff]/);
      for(const control of translated.lab.controls)assert.match(control.label,/[\u3400-\u9fff]/);
    });
    test(`${id}: awaited real calculations preserve all evidence and state`,async()=>{
      for(const input of variedInputs(original.lab)){
        const saved=JSON.stringify(input);
        const left=await evaluate(original.lab,input),right=await evaluate(translated.lab,input);
        assert.equal(right.ok,left.ok,JSON.stringify(input));
        if(left.ok)equalEvidence(left.result,right.result,pairs);
        else {assert.equal(right.name,left.name);assert.ok(right.message);}
        assert.equal(JSON.stringify(input),saved,'input must not change');
      }
    });
  }
}
test('dataset async calculations resolve to actual 64-character hashes, not empty promise objects',async()=>{
  const lab=dataset.after.get('pj-dataset-split-auditor-1').lab;
  const result=await lab.calculate({textA:'  Straße\t',textB:'STRASSE'});
  assert.equal(result.frames.length,6);
  const records=result.frames.at(-1).receipt.records;
  assert.equal(records.length,2);
  for(const record of records){
    assert.match(record.fingerprint,/^[a-f0-9]{64}$/);
    assert.equal(record.fingerprint,createHash('sha256').update(record.normalized).digest('hex'));
  }
  assert.equal(records[0].fingerprint,records[1].fingerprint);
});
test('missing crypto still rejects rather than manufacturing a translated fingerprint',async()=>{
  const lab=registry(dataset.current,null).get('pj-dataset-split-auditor-1').lab;
  await assert.rejects(lab.calculate({textA:'中文',textB:'中文'}),/SHA-256 requires Web Crypto/);
});
