// Execute the real catalog, route, assessment and local progress implementations.
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {spawnSync}=require('node:child_process');
const {setup,flush}=require('./fixtures/certification-ui-dom.cjs');
const {create}=require('./certification-ui');
const {parseCertifications,buildSeoManifests,parseReadme,parseRoadmap,renderCertificationDiscovery}=require('./build');
const ROOT=path.resolve(__dirname,'..');
const data=parseCertifications();
const source=fs.readFileSync(path.join(__dirname,'certifications.js'),'utf8');
const plain=x=>JSON.parse(JSON.stringify(x));
function freeze(value){if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}
function small(){
 const questions=[{id:'q1',domain:'domain',type:'single',prompt:'选择正确数值 <script>untrusted()</script>',options:['零','一','二','三'],correct:[1],explanation:'预先不应显示的单选解析',references:[]},
 {id:'q2',domain:'domain',type:'multiple',prompt:'选择两个正确值',options:['甲','乙','丙','丁'],correct:[0,2],explanation:'预先不应显示的多选解析',references:[]}];
 const bank={id:'unit-bank',track:'unit-track',version:3,title:'测试评估',kind:'mock',timeLimitMinutes:1,questions};
 const track={id:'unit-track',programId:'unit-program',examCode:'UNIT',credential:'测试路径',domains:[{id:'domain',name:'测试领域',weight:100,objectives:[]}],lessons:[],assessments:[{id:bank.id,version:3,path:'certifications/unit/assessments/test.json',title:bank.title}]};
 return {bank,track,data:{programs:[{id:'unit-program',name:'独立测试项目',disclaimer:'无隶属关系，不保证通过考试。',scoringNotice:'练习百分比，不是官方分数。'}],tracks:[track],lessonsByPath:{},assessmentsById:{[bank.id]:bank}}};
}
function oldDraft(bank,answers,startedAt){return {'aifs:cert-progress:v1':JSON.stringify({drafts:{[bank.id+'@'+bank.version]:{answers,version:bank.version,startedAt,deadlineAt:startedAt+bank.timeLimitMinutes*60000}},attempts:{},bests:{},updatedAt:startedAt})};}
function api(name){const start=source.indexOf('  function '+name+'('),end=source.indexOf('\n  function ',start+5);assert.ok(start>=0&&end>start,name);return source.slice(start,end);}
const grading=vm.runInNewContext(['normalizeQuestion','isRecord','isFiniteNumber','validDraftForAssessment','sameAnswers','scoreAssessmentAnswers'].map(api).join('\n')+'\n({normalizeQuestion,validDraftForAssessment,scoreAssessmentAnswers});');

test('display lookup translates only registered labels and never rewrites raw metadata',()=>{
 const zh=create('zh-CN'),en=create('en');
 for(const [a,b] of [['Foundational','基础级（Foundational）'],['Multiple choice','选择题（Multiple choice）'],['review','复习'],['Online proctored','在线监考（Online proctored）']]){
  assert.equal(zh.text(a),b);assert.equal(en.text(a),a);
 }
 for(const value of [250,0,null,undefined,{format:'Multiple choice'},'custom <b>value</b>'])assert.equal(zh.text(value),value);
 assert.equal(zh.joinLabels(['Claude','MCPA']),'Claude 和 MCPA');
});
test('verification date-only labels stay on the source day in west and east time zones',()=>{
 for(const zone of ['America/Los_Angeles','Asia/Shanghai','Pacific/Honolulu','UTC']){
  const script="const u=require('./site/certification-ui').create('zh-CN');console.log(u.formatDate('2026-09-24'));console.log(u.formatDate('2026-02-30'));";
  const p=spawnSync(process.execPath,['-e',script],{cwd:ROOT,env:{...process.env,TZ:zone},encoding:'utf8',timeout:10000});
  assert.equal(p.status,0,p.stderr);assert.equal(p.stdout.trim(),'2026年9月24日\n2026-02-30');
 }
 assert.equal(create('zh').formatDate(null),'');assert.equal(create('zh').formatDate('invalid'),'invalid');
});
test('all three page shells load display module before the existing reader',()=>{
 for(const name of ['certifications.html','certification.html','assessment.html']){
  const html=fs.readFileSync(path.join(__dirname,name),'utf8');assert.match(html,/<html lang="zh-CN"/);
  assert.ok(html.indexOf('certification-ui.js')<html.indexOf('src="certifications.js'));
  assert.equal((html.match(/src="certification-ui.js/g)||[]).length,1);
  assert.match(html,/不.*保证|并非官方/);
 }
});
test('catalog renders all real programs and routes in Chinese without mutating catalog data',()=>{
 const copy=freeze(plain(data)),prior=JSON.stringify(copy),env=setup({data:copy});
 const cards=env.document.getElementById('certProgramSections').querySelectorAll('.cert-track-card');
 assert.equal(cards.length,data.tracks.length);assert.equal(data.tracks.length,5);
 assert.equal(env.document.getElementById('certProgramSections').querySelectorAll('.cert-program-section').length,data.programs.length);
 for(const c of cards){assert.match(c.textContent,/打开路径/);assert.match(c.querySelector('.cert-status').textContent,/[\u3400-\u9fff]/);}
 assert.match(env.document.getElementById('certProgramSections').textContent,/使用 AI 导师/);
 assert.doesNotMatch(env.document.getElementById('certProgramSections').textContent,/Open path|Read the tutor skill|lessons ·/);
 assert.equal(JSON.stringify(copy),prior);assert.equal(env.storage.size,0);
});
test('empty catalog and unknown track show readable fallback without starting assessment state',()=>{
 const a=setup();assert.match(a.document.getElementById('certProgramSections').textContent,/认证路线正在整理/);
 const b=setup({page:'track',data,search:'?id=missing'});assert.match(b.document.getElementById('trackHero').textContent,/未找到路径/);
 assert.equal(b.storage.size,0);assert.equal(b.timers.size,0);
});
for(const track of data.tracks){
 test(`${track.id}: real route renders exam facts lessons study plans and safe local progress`,()=>{
  const copy=freeze(plain(data)),before=JSON.stringify(copy);
  const env=setup({page:'track',data:copy,search:'?id='+encodeURIComponent(track.id)});
  const doc=env.document;assert.match(doc.getElementById('trackHero').textContent,/分钟/);
  assert.equal(doc.getElementById('trackLessons').querySelectorAll('.cert-lesson-row').length,track.lessons.length);
  assert.equal(doc.getElementById('trackDomains').querySelectorAll('.cert-domain-row').length,track.domains.length);
  assert.equal(doc.getElementById('trackAssessments').querySelectorAll('.cert-assessment-card').length,track.assessments.length);
  assert.match(doc.getElementById('trackProgramNotice').textContent,/独立|社区/);
  assert.doesNotMatch(doc.getElementById('trackDeepDives').textContent,/OPTIONAL/);
  const first=typeof track.lessons[0]==='string'?track.lessons[0]:track.lessons[0].path;
  env.completeLesson(first);assert.match(doc.getElementById('trackProgress').textContent,/1 \/ /);
  assert.equal(JSON.stringify(copy),before);
  if(track.id==='mcpa-f'){
   const hero=doc.getElementById('trackHero').textContent;
   assert.match(hero,/题目数: 未公布/);assert.match(hero,/及格分数: 未公布/);assert.match(hero,/选择题（Multiple choice）/);
   assert.equal(track.exam.items,60);assert.equal(track.exam.itemCountPublished,false);
   assert.match(doc.getElementById('trackStudyPlans').textContent,/默认学习计划/);
  }
 });
}
test('static no-JavaScript discovery uses the same Chinese labels and keeps source links',()=>{
 const seo=buildSeoManifests(parseReadme(fs.readFileSync(path.join(ROOT,'README.md'),'utf8'),parseRoadmap(fs.readFileSync(path.join(ROOT,'ROADMAP.md'),'utf8'))),data,[]).certificationManifest;
 const html=renderCertificationDiscovery(data,seo);
 assert.match(html,/在 GitHub 使用 AI 导师学习/);assert.match(html,/阅读导师技能/);
 assert.doesNotMatch(html,/Learn with an AI tutor on GitHub|Read the tutor skill| lessons"/);
 assert.equal((html.match(/data-generated-discovery="certification"/g)||[]).length,data.tracks.length);
 for(const p of data.programs){assert.ok(html.includes(p.learnerGuidePath));assert.ok(html.includes(p.tutorSkillPath));}
});
for(const [id,bank] of Object.entries(data.assessmentsById)){
 test(`${id}: full real question bank renders with exact options and no premature answers`,()=>{
  const copy=freeze(plain(data)),env=setup({page:'assessment',data:copy,search:'?id='+encodeURIComponent(id)});
  const form=env.document.getElementById('assessmentForm');assert.ok(form);
  const q=bank.questions;assert.equal(form.querySelectorAll('fieldset').length,q.length);
  assert.equal(form.querySelectorAll('input').length,q.reduce((n,x)=>n+x.options.length,0));
  const first=form.querySelectorAll('fieldset')[0];assert.equal(first.querySelector('.cert-question-prompt').textContent,q[0].prompt);
  assert.deepEqual(first.querySelectorAll('.cert-option').map(x=>x.querySelector('span').textContent),q[0].options);
  assert.equal(form.querySelectorAll('.cert-review-explanation').length,0);
  assert.match(env.document.getElementById('assessmentProgramNotice').textContent,/独立练习/);
  assert.equal(env.window.AIFSCertProgress.getAttempts(id,bank.version).length,0);
 });
}
test('all 505 real questions preserve grading for every four-option subset and old draft shapes',()=>{
 let count=0,subsets=0;
 for(const bank of Object.values(data.assessmentsById)){
  const qs=bank.questions.map(grading.normalizeQuestion);count+=qs.length;
  for(const q of qs)for(let mask=0;mask<(1<<q.options.length);mask++){
   const picked=q.options.map((_,i)=>i).filter(i=>mask&(1<<i));const expected=picked.length===q.correct.length&&picked.every(x=>q.correct.includes(x));
   assert.equal(grading.scoreAssessmentAnswers([q],{[q.id]:picked}).correct,Number(expected));subsets++;
  }
  const startedAt=1700000000000,answers=Object.fromEntries(qs.map(q=>[q.id,[...q.correct]]));
  assert.equal(grading.validDraftForAssessment({answers,version:bank.version,startedAt,deadlineAt:startedAt+bank.timeLimitMinutes*60000},bank.version,qs,bank.timeLimitMinutes),true);
 }
 assert.equal(count,505);assert.equal(subsets,8080);
});
test('single and multiple selection persist original question ids; partial selections stay wrong',async()=>{
 const x=small(),env=setup({page:'assessment',data:x.data,search:'?id=unit-bank'});
 const form=env.document.getElementById('assessmentForm');assert.ok(!form.querySelector('script'));
 await env.choose('q1',[1]);await env.choose('q2',[0]);
 const draft=env.window.AIFSCertProgress.getDraft('unit-bank',3);assert.deepEqual(plain(draft.answers),{q1:[1],q2:[0]});
 await env.submit();assert.match(env.document.getElementById('assessmentResultsSummary').textContent,/50%/);
 const attempts=env.window.AIFSCertProgress.getAttempts('unit-bank',3);assert.equal(attempts.length,1);assert.equal(attempts[0].correct,1);
 assert.equal(env.timers.size,0);assert.match(env.window.location.search,/result=latest/);
 assert.equal(env.document.activeElement,env.document.getElementById('assessmentResultsSummary'));
 assert.match(env.document.getElementById('assessmentMount').textContent,/预先不应显示的多选解析/);
});
test('review retake and reload preserve history and clear only the current draft',async()=>{
 const x=small(),env=setup({page:'assessment',data:x.data,search:'?id=unit-bank'});
 await env.choose('q1',[1]);await env.choose('q2',[0,2]);await env.submit();
 await env.document.getElementById('assessmentRetake').click();
 assert.equal(env.window.AIFSCertProgress.getAttempts('unit-bank',3).length,1);assert.equal(env.window.AIFSCertProgress.getBest('unit-bank',3).percent,100);
 assert.deepEqual(plain(env.window.AIFSCertProgress.getDraft('unit-bank',3).answers),{});assert.ok(!env.window.location.search.includes('result='));
 const reload=setup({page:'assessment',data:x.data,search:'?id=unit-bank&result=latest',initialStorage:env.storage});
 assert.match(reload.document.getElementById('assessmentResultsSummary').textContent,/100%/);assert.equal(reload.timers.size,0);
});
test('legacy v1 draft resumes exact answers with the existing deadline',()=>{
 const x=small(),now=1700000020000,start=1700000000000;
 const storage=oldDraft(x.bank,{q1:[1],q2:[2,0]},start);
 const env=setup({page:'assessment',data:x.data,search:'?id=unit-bank',initialStorage:storage,now});
 const draft=env.window.AIFSCertProgress.getDraft('unit-bank',3);assert.equal(draft.startedAt,start);assert.equal(draft.deadlineAt,start+60000);
 assert.equal(env.document.getElementById('assessmentTimerValue').textContent,'00:40');
 assert.equal(env.document.getElementById('assessmentForm').querySelectorAll('input:checked').length,3);
 assert.equal(env.storage.get('aifs:cert-progress:v1'),storage['aifs:cert-progress:v1']);
});
test('invalid or stale draft answers are rejected without changing bank version or options',()=>{
 const x=small(),start=1700000000000;
 for(const answers of [{q1:[2,3]},{q1:[4]},{q2:[0,0]},{unknown:[1]}]){
  const env=setup({page:'assessment',data:x.data,search:'?id=unit-bank',initialStorage:oldDraft(x.bank,answers,start),now:start+1000});
  assert.deepEqual(plain(env.window.AIFSCertProgress.getDraft('unit-bank',3).answers),{});
 }
});
test('storage unavailable remains explicitly temporary and still grades without server calls',async()=>{
 const x=small(),env=setup({page:'assessment',data:x.data,search:'?id=unit-bank',storageUnavailable:true});
 assert.match(env.document.getElementById('assessmentMount').textContent,/进度仅在当前页面有效/);
 await env.choose('q1',[1]);await env.choose('q2',[0,2]);await env.submit();
 assert.equal(env.window.AIFSCertProgress.getAttempts('unit-bank',3)[0].percent,100);assert.equal(env.fetches.length,0);
});
test('normal timer expiry submits once, stops timer and marks automatic submission',()=>{
 const x=small(),env=setup({page:'assessment',data:x.data,search:'?id=unit-bank'});
 env.tick(60001);assert.equal(env.timers.size,0);env.tick(60001);
 assert.equal(env.window.AIFSCertProgress.getAttempts('unit-bank',3).length,1);
 assert.match(env.document.getElementById('assessmentResultsSummary').textContent,/计时结束时已自动提交/);
});
test('expired draft restored on load submits exactly once without leaving a new interval',()=>{
 const x=small(),start=1700000000000;
 const env=setup({page:'assessment',data:x.data,search:'?id=unit-bank',initialStorage:oldDraft(x.bank,{q1:[1]},start),now:start+60001});
 assert.equal(env.window.AIFSCertProgress.getAttempts('unit-bank',3).length,1);
 assert.equal(env.timers.size,0);
 env.tick(2000);assert.equal(env.window.AIFSCertProgress.getAttempts('unit-bank',3).length,1);
});
test('fetch fallback loads the specified local bank, failure remains readable',async()=>{
 const x=small();delete x.data.assessmentsById['unit-bank'];
 const env=setup({page:'assessment',data:x.data,search:'?id=unit-bank',fetcher:async()=>({ok:true,json:async()=>x.bank})});await flush();
 assert.equal(env.fetches[0],'../certifications/unit/assessments/test.json');assert.ok(env.document.getElementById('assessmentForm'));
 const bad=setup({page:'assessment',data:x.data,search:'?id=unit-bank',fetcher:async()=>({ok:false})});await flush();
 assert.match(bad.document.getElementById('assessmentMount').textContent,/未找到评估/);assert.equal(bad.timers.size,0);
});
test('supplemental reference keeps fromTrack and uses translated label after submission',async()=>{
 const x=small();const p='certifications/unit/lessons/01-other';
 x.data.lessonsByPath[p]={path:p,name:'补充课程'};x.bank.questions[0].references=[p,'../secret','certifications/unit/lessons/missing'];
 const env=setup({page:'assessment',data:x.data,search:'?id=unit-bank'});await env.submit();
 const mount=env.document.getElementById('assessmentMount');const link=mount.querySelectorAll('a').find(a=>a.href.includes('fromTrack='));
 assert.ok(link);assert.match(link.textContent,/所属路径外的补充内容/);assert.match(link.href,/fromTrack=unit-track/);
 assert.ok(!mount.querySelectorAll('a').some(a=>a.href.includes('../secret')||a.href.includes('lessons%2Fmissing')));
});

test('expired restore followed by retake starts one fresh timer and retains one old attempt',async()=>{
 const x=small(),start=1700000000000;
 const env=setup({page:'assessment',data:x.data,search:'?id=unit-bank',initialStorage:oldDraft(x.bank,{q1:[1]},start),now:start+60001});
 await env.document.getElementById('assessmentRetake').click();
 assert.equal(env.timers.size,1);assert.equal(env.window.AIFSCertProgress.getAttempts('unit-bank',3).length,1);
 assert.equal(env.window.AIFSCertProgress.getDraft('unit-bank',3).deadlineAt,start+120001);
 env.tick(1000);assert.equal(env.window.AIFSCertProgress.getAttempts('unit-bank',3).length,1);
});
test('untimed assessment never installs a timer and retains zero deadline',()=>{
 const x=small();x.bank.timeLimitMinutes=0;
 const env=setup({page:'assessment',data:x.data,search:'?id=unit-bank'});
 assert.equal(env.timers.size,0);assert.equal(env.window.AIFSCertProgress.getDraft('unit-bank',3).deadlineAt,0);
 assert.match(env.document.getElementById('assessmentMount').textContent,/不限时/);
});
test('two tabs with different assessments retain independent drafts and histories',async()=>{
 const x=small(),second={...plain(x.bank),id:'other-bank'};
 x.data.assessmentsById['other-bank']=second;x.track.assessments.push({id:'other-bank'});
 const storage=new Map(),a=setup({page:'assessment',data:x.data,search:'?id=unit-bank',initialStorage:storage});
 const b=setup({page:'assessment',data:x.data,search:'?id=other-bank',initialStorage:storage});
 await a.choose('q1',[1]);await b.choose('q2',[0,2]);await a.submit();
 assert.deepEqual(plain(b.window.AIFSCertProgress.getDraft('other-bank',3).answers),{q2:[0,2]});
 await b.submit();assert.equal(a.window.AIFSCertProgress.getAttempts('unit-bank',3).length,1);
 assert.equal(a.window.AIFSCertProgress.getAttempts('other-bank',3).length,1);
});
test('theme change preserves the existing browser storage key and does not start a test',async()=>{
 const env=setup({data});await env.document.getElementById('themeToggle').click();
 assert.equal(env.storage.get('theme'),'dark');assert.equal(env.timers.size,0);
 assert.equal([...env.storage.keys()].filter(k=>k.startsWith('aifs:cert-progress')).length,0);
});
test('unknown exam labels are escaped and displayed unchanged without modifying actual numbers',()=>{
 const copy=plain(data);const track=copy.tracks[0];track.level='<img src=x>';track.exam.format='<script>literal</script>';track.exam.feeUsd=0;
 const env=setup({page:'track',data:copy,search:'?id='+track.id});
 const hero=env.document.getElementById('trackHero');assert.equal(hero.querySelectorAll('script').length,0);
 assert.match(hero.textContent,/<script>literal<\/script>/);assert.match(hero.textContent,/考试费用: \$0/);
});
