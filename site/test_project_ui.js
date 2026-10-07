'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {create} = require('./project-ui');
const {buildData} = require('./build-projects');
const {setup,flush,site} = require('./fixtures/project-ui-dom.cjs');
const root = path.dirname(site);
const sync = JSON.parse(fs.readFileSync(path.join(root,'i18n/zh-upstream-sync.json'),'utf8'));
const data = buildData({strict:true});
const plain = v => JSON.parse(JSON.stringify(v));
function project() {
  return {id:'test-project',title:'测试项目',summary:'检查行为',level:2,hours:4,languages:['Python'],source:'core',path:'projects/test-project',contentBase:'project-content/test-project',manifestHash:'a'.repeat(64),
    prerequisites:['先理解输入边界。',{title:'课程入口',path:'phases/00-setup-and-tooling/01-dev-environment'}],languageWhy:{Python:'标准库'},languageReasons:[{language:'Rust',why:'整数契约'}],
    stages:[{id:'01-first',number:1,title:'第一阶段',summary:'先校验',difficulty:'starter',hours:2,language:'python',doc:'projects/test-project/stages/01-first/docs/en.md',contentUrl:'project-content/test-project/first.md'},
            {id:'02-next',number:2,title:'第二阶段',summary:'后执行',difficulty:'stretch',hours:2,language:'python',doc:'projects/test-project/stages/02-next/docs/en.md',contentUrl:'project-content/test-project/second.md'}],
    demos:[{poster:'media/run.png',gif:'media/run.gif',title:'上游原始录屏',caption:'未重录'}]};
}
function projectData(p=project()) {return {levels:data.levels,projects:[p],planned:[]};}
function report(p=project()) {return {schemaVersion:1,generatedAt:'2026-10-07T00:00:00Z',projects:[{id:p.id,mode:'learner',manifestHash:p.manifestHash,allStagesPassed:true,certificateEligible:true,stages:p.stages.map(s=>({id:s.id,status:'pass',tests:5,skippedTests:0}))}]};}
async function reader(options={}) {const env=setup({data:projectData(),search:'?id=test-project',...options});await flush();return env;}
const get=(env,id)=>env.document.getElementById(id);
function deepFreeze(value) {if(value&&typeof value==='object'){Object.values(value).forEach(deepFreeze);Object.freeze(value);}return value;}

// Display catalog and completed-vs-verified distinction.
test('Chinese display labels leave unknown user text and machine values untouched',()=>{
 const ui=create('zh-CN');assert.equal(ui.text('Starter'),'入门');assert.equal(ui.text('stretch'),'进阶');assert.equal(ui.text('custom user label <img>'),'custom user label <img>');
 for(const value of ['--all --strict','test-project','aifs.projects.progress.v1','python','pass'])assert.equal(ui.text(value),value);
 assert.equal(create('en').text('Copy'),'Copy');assert.equal(create('en').text('core'),'core');
});
test('all actual level and difficulty labels have an explicit Chinese display',()=>{
 const ui=create('zh-CN');for(const l of data.levels){assert.match(ui.text(l.name),/[\u3400-\u9fff]/);assert.match(ui.text(l.summary),/[\u3400-\u9fff]/);}
 for(const d of new Set(data.projects.flatMap(p=>p.stages.map(s=>s.difficulty)).filter(Boolean)))assert.match(ui.text(d),/[\u3400-\u9fff]/,d);
});
test('translation notice does not turn content completion into verification completion',()=>{
 const ui=create('zh-CN');const text=ui.notice(sync,data.projects.map(p=>p.id));assert.match(text,/48\/48/);assert.match(text,/待译 0/);assert.match(text,/仍需单独验收/);
 const next={completedProjects:['one'],pendingProjects:['two']};assert.match(ui.notice(next,['one','two']),/1\/2，待译 1/);
});
test('missing stale duplicate or incomplete translation metadata cannot claim completion',()=>{
 const ui=create('zh-CN');for(const meta of [null,{}, {completedProjects:['a'],pendingProjects:['a']},{completedProjects:['a'],pendingProjects:[]},{completedProjects:['b'],pendingProjects:[]}]){
  assert.match(ui.notice(meta,['a','new']),/未加载或与目录不一致/);
 }
 assert.match(ui.notice({completedProjects:['a','a'],pendingProjects:[]},['a','a']),/未加载或与目录不一致/);
});
test('both pages load metadata and locale before consumers while retaining command syntax',()=>{
 for(const page of ['projects.html','project.html']){
  const html=fs.readFileSync(path.join(site,page),'utf8');assert.match(html,/<html lang="zh-CN"/);
  assert.ok(html.indexOf('src="build-meta.js"')<html.indexOf('src="project-ui.js'));
  assert.ok(html.indexOf('src="project-ui.js')<html.indexOf('src="projects.js'));
  if(page==='project.html')assert.ok(html.indexOf('src="project-ui.js')<html.indexOf('src="project-certificates.js'));
  assert.match(html,/id="pjTranslationNotice"/);assert.ok(!html.includes('相关材料仍待增量汉化'));
 }
 const h=fs.readFileSync(path.join(site,'projects.html'),'utf8');assert.match(h,/python3 scripts\/project_test\.py research-report-agent --stage 1 --path my-report-agent/);assert.match(h,/\/build-project research-report-agent/);
});

// Real catalog renderer, not precomputed localized snapshots.
test('catalog renders every actual project and all five translated level descriptions',async()=>{
 const env=setup({page:'catalog',data:deepFreeze(plain(data)),metadata:sync});await flush();
 assert.equal(get(env,'pjLadder').querySelectorAll('a.pj-card').length,data.projects.length);
 for(const l of data.levels)assert.ok(get(env,'pjLadder').textContent.includes(create('zh-CN').text(l.name)));
 assert.match(get(env,'pjStats').textContent,/可开始构建/);assert.match(get(env,'pjTranslationNotice').textContent,/48\/48/);
 assert.equal(get(env,'pjStartLink').href,'project.html?id='+data.projects[0].id);
});
test('source filter persists original enum and displays a Chinese empty state',async()=>{
 const env=setup({page:'catalog',data:plain(data),metadata:sync});await flush();
 const filter=get(env,'pjSourceFilter');const button=filter.querySelector('[data-source="community"]');assert.equal(button.textContent,'社区');await filter.fire('click',{target:button});
 assert.equal(JSON.parse(env.storage.get('aifs.projects.source.v1')),'community');assert.match(get(env,'pjLadder').textContent,/尚无社区项目/);
 const all=filter.querySelector('[data-source="all"]');await filter.fire('click',{target:all});assert.equal(get(env,'pjLadder').querySelectorAll('a.pj-card').length,data.projects.length);
});
test('planned and community cards preserve encoded links author handles and language keys',async()=>{
 const d=projectData();d.projects[0].source='community';d.projects[0].author={github:'author<unsafe>'};d.planned=[{id:'future',title:'将来 <img>',level:2,source:'core',languages:['Rust'],ours:true}];
 const env=setup({page:'catalog',data:d});await flush();const ladder=get(env,'pjLadder');assert.match(ladder.innerHTML,/@author&lt;unsafe&gt;/);assert.ok(!ladder.innerHTML.includes('<unsafe>'));assert.match(ladder.textContent,/规划中/);assert.match(ladder.textContent,/重建自有仓库/);
 const toggle=get(env,'pjShowPlanned');toggle.checked=false;await toggle.fire('change');assert.equal(ladder.querySelectorAll('.is-planned').length,0);assert.equal(ladder.querySelector('[data-lang="python"]').textContent,'Python');
});

// Copy runs under the real bindCopy handler; no actual clipboard access.
test('Chinese copy preserves exact command and keyboard focus',async()=>{
 const env=setup({page:'catalog'});const button=env.main.querySelector('.pj-copy');button.focus();const command=button.getAttribute('data-copy');await env.main.fire('click',{target:button});
 assert.equal(env.copied[0],command);assert.equal(button.textContent,'已复制');assert.equal(env.document.activeElement,button);assert.equal(button.disabled,false);
 assert.equal(button.closest('.pj-cmd-wrap').querySelector('.pj-copy-status').textContent,'命令已复制。');env.timers.at(-1)();assert.equal(button.textContent,'复制');
});
test('pending copy prevents duplicates and never steals focus from another control',async()=>{
 const calls=[];let finish;const env=setup({page:'catalog',clipboard:{writeText:s=>{calls.push(s);return new Promise(r=>{finish=r;});}}});const button=env.main.querySelector('.pj-copy');
 const first=env.main.fire('click',{target:button});await env.main.fire('click',{target:button});assert.equal(calls.length,1);const next=get(env,'pjShowPlanned');next.focus();finish();await first;assert.equal(env.document.activeElement,next);
});
test('clipboard denial falls back without changing the command or focused control',async()=>{
 const env=setup({page:'catalog',clipboard:{writeText:async()=>{throw Error('denied');}}});const button=env.main.querySelector('.pj-copy');button.focus();await env.main.fire('click',{target:button});
 assert.equal(env.copied[0],button.getAttribute('data-copy'));assert.equal(env.document.activeElement,button);assert.equal(button.textContent,'已复制');assert.equal(env.main.querySelectorAll('textarea').length,0);
});
test('copy failure gives visible Chinese manual instructions and allows retry',async()=>{
 const env=setup({page:'catalog',clipboard:null,legacyCopy:false});const button=env.main.querySelector('.pj-copy');await env.main.fire('click',{target:button});assert.equal(button.textContent,'复制');
 assert.match(button.closest('.pj-cmd-wrap').querySelector('.pj-copy-status').textContent,/请选中命令后手动复制/);assert.equal(button.dataset.copyPending,undefined);
});

// Reader flows, IDs and persisted state.
test('every actual project renders prerequisites without undefined links or manifest mutation',async()=>{
 let stringItems=0;
 for(const p of data.projects){
  const one={...plain(data),projects:[plain(p)]};const before=JSON.stringify(one);deepFreeze(one);
  const env=await reader({data:one,search:'?id='+encodeURIComponent(p.id)});
  const hero=get(env,'pjProjectHero');assert.ok(!hero.innerHTML.includes('path=undefined'),p.id);
  for(const pre of p.prerequisites||[])if(typeof pre==='string'){stringItems++;assert.ok(hero.textContent.includes(pre),p.id);}
  assert.equal(JSON.stringify(one),before,p.id);assert.equal(env.fetches[0],p.stages[0].contentUrl,p.id);
 }
 assert.ok(stringItems>0);assert.equal(data.projects.length,48);
});
test('linked and text prerequisites use their respective representations',async()=>{
 const env=await reader();const hero=get(env,'pjProjectHero');assert.match(hero.textContent,/先理解输入边界/);assert.ok(hero.querySelector('a').href.includes('phases/00-setup-and-tooling/01-dev-environment'));
 assert.match(get(env,'pjStageList').textContent,/入门/);assert.match(get(env,'pjStageList').textContent,/进阶/);assert.match(get(env,'pjStage').textContent,/运行本阶段/);
});
test('progress toggle writes the existing key and never enables certificate download',async()=>{
 const env=await reader();await get(env,'pjToggleDone').fire('click');await flush();const saved=JSON.parse(env.storage.get('aifs.projects.progress.v1'));
 assert.match(saved['test-project']['01-first'],/^\d{4}-\d{2}-\d{2}$/);assert.match(get(env,'pjToggleDone').textContent,/未完成/);assert.equal(get(env,'pjCertificateDownload').disabled,true);
 await get(env,'pjToggleDone').fire('click');await flush();assert.deepEqual(JSON.parse(env.storage.get('aifs.projects.progress.v1'))['test-project'],{});
});
test('stage navigation preserves URL IDs and exact grader commands',async()=>{
 const env=await reader();const link=get(env,'pjStageList').querySelector('[data-stage-index="1"]');let prevented=false;
 await get(env,'pjWorkspace').fire('click',{target:link,preventDefault(){prevented=true;}});await flush();assert.equal(prevented,true);
 assert.equal(env.urls.at(-1).href,'project.html?id=test-project&stage=02-next');assert.equal(get(env,'pjStageTitle').textContent,'第二阶段');
 assert.ok(get(env,'pjStage').textContent.includes('python3 scripts/project_test.py test-project --stage 2 --path my-test-project'));
 env.window.location=new URL('http://127.0.0.1/site/project.html?id=test-project&stage=01-first');await env.window.fire('popstate');await flush();assert.equal(get(env,'pjStageTitle').textContent,'第一阶段');
});
test('latest stage request wins when an earlier response arrives late',async()=>{
 const pending=[];const env=await reader({fetcher:url=>new Promise(resolve=>pending.push({url,resolve}))});
 const link=get(env,'pjStageList').querySelector('[data-stage-index="1"]');await get(env,'pjWorkspace').fire('click',{target:link,preventDefault(){}});await flush();assert.equal(pending.length,2);
 pending[1].resolve({ok:true,text:async()=> '# 第二课\n\n最新内容'});await flush();pending[0].resolve({ok:true,text:async()=> '# 第一课\n\n过期内容'});await flush();assert.match(get(env,'pjDoc').textContent,/最新内容/);assert.ok(!get(env,'pjDoc').textContent.includes('过期内容'));
});
test('fetch failure is readable in Chinese and preserves the source link',async()=>{
 const env=await reader({fetcher:async()=>({ok:false,status:503})});assert.match(get(env,'pjDoc').textContent,/无法加载本课/);assert.match(get(env,'pjDoc').querySelector('a').href,/projects\/test-project\/stages\/01-first\/docs\/en.md$/);
});
test('unknown project shows Chinese navigation instead of initializing a workspace',async()=>{
 const env=await reader({search:'?id=not-present'});assert.match(get(env,'pjProjectHero').textContent,/未找到项目/);assert.equal(get(env,'pjWorkspace').hidden,true);assert.equal(env.fetches.length,0);
});
test('recording toggles change only image URL and visible Chinese playback state',async()=>{
 const env=await reader();const button=get(env,'pjOverview').querySelector('.pj-demo-play');const image=button.closest('figure').querySelector('img');const poster=image.src;
 await env.document.fire('click',{target:button});assert.equal(image.src,image.getAttribute('data-gif'));assert.equal(button.textContent,'停止录屏');assert.equal(button.getAttribute('aria-pressed'),'true');
 await env.document.fire('click',{target:button});assert.equal(image.src,poster);assert.equal(button.textContent,'播放录屏');
});
test('Chinese and duplicate headings have nonempty stable unique anchors',()=>{
 const env=setup({page:'catalog'});const md='# 文档\n\n## 检查输入\n\n## 检查输入\n\n## Check Input\n\n## Check Input\n\n## !!!\n';
 const html=env.window.AIFSProjectsMarkdown(md,'projects/example').html;const ids=Array.from(html.matchAll(/<h[234] id="([^"]*)"/g),m=>m[1]);assert.deepEqual(ids,['检查输入','检查输入-2','check-input','check-input-2','section']);
 assert.equal(env.window.AIFSProjectsMarkdown(md,'projects/example').html,html);
});
test('all project stage Markdown renders without empty or duplicate heading anchors',()=>{
 const env=setup({page:'catalog'});let stages=0;
 for(const p of data.projects)for(const stage of p.stages){const md=fs.readFileSync(path.join(root,stage.doc),'utf8');const html=env.window.AIFSProjectsMarkdown(md,path.dirname(stage.doc)).html;const ids=Array.from(html.matchAll(/<h[234] id="([^"]*)"/g),m=>m[1]);assert.ok(ids.every(Boolean),stage.doc);assert.equal(new Set(ids).size,ids.length,stage.doc);stages++;}
 assert.ok(stages>=192);
});

// Synthetic certificate UI inputs only; no user report or real credential is created.
test('certificate validator remains English API while Chinese UI displays exact rejection reason',async()=>{
 const env=await reader();const p=project();const r=report(p);r.projects[0].mode='solution';
 assert.throws(()=>env.window.AIFSProjectCertificates.validate(r,p),/own workspace/);
 const input=get(env,'pjCertificateFile');await input.fire('change',{target:{files:[{size:200,text:async()=>JSON.stringify(r)}]}});
 assert.match(get(env,'pjCertificateStatus').textContent,/自己的工作区/);assert.equal(get(env,'pjCertificateDownload').disabled,true);
});
test('Chinese proof preview escapes text and retains the unverified local-evidence disclaimer',async()=>{
 const p=project();p.title='项目 <script>text</script>';const env=await reader({data:projectData(p)});const r=report(p);
 const html=env.window.AIFSProjectCertificates.certificate(r,p,'TEST ONLY <img>');assert.match(html,/<html lang="zh-CN"/);assert.match(html,/项目完成证明/);assert.match(html,/未经监考或独立核实，也不是厂商认证/);assert.match(html,/&lt;img&gt;/);assert.ok(!html.includes('<script>text</script>'));assert.match(html,/2 个阶段 · 10 项测试通过/);
});
test('importing valid synthetic evidence enables a local HTML download with unchanged filename',async()=>{
 const env=await reader();const input=get(env,'pjCertificateFile');await input.fire('change',{target:{files:[{size:200,text:async()=>JSON.stringify(report())}]}});
 const name=get(env,'pjCertificateName');name.value='TEST ONLY';await name.fire('input');assert.equal(get(env,'pjCertificateDownload').disabled,false);
 await get(env,'pjCertificateDownload').fire('click');assert.equal(env.downloads.length,1);assert.match(await env.downloads[0].text(),/TEST ONLY/);assert.equal(env.document.created.find(x=>x.download).download,'test-project-certificate.html');
 await input.fire('change',{target:{files:[{size:2000001,text:async()=>JSON.stringify(report())}]}});assert.equal(get(env,'pjCertificateDownload').disabled,true);assert.match(get(env,'pjCertificateStatus').textContent,/小于 2 MB/);
});
test('Chinese certificate boundary still rejects zero skipped reordered stale and partial reports',async()=>{
 const env=await reader();for(const change of [r=>r.projects[0].stages[0].tests=0,r=>r.projects[0].stages[0].skippedTests=1,r=>r.projects[0].stages.reverse(),r=>r.projects[0].manifestHash='b'.repeat(64),r=>r.projects[0].stages.pop()]){
  const r=report();change(r);await get(env,'pjCertificateFile').fire('change',{target:{files:[{size:500,text:async()=>JSON.stringify(r)}]}});assert.equal(get(env,'pjCertificateDownload').disabled,true);assert.match(get(env,'pjCertificateStatus').textContent,/[\u3400-\u9fff]/);
 }
});

test('existing browser progress resumes the first incomplete stage without a migration',async()=>{
 const stored={'aifs.projects.progress.v1':JSON.stringify({'test-project':{'01-first':'2026-09-30'}})};
 const env=await reader({initialStorage:stored});assert.equal(get(env,'pjStageTitle').textContent,'第二阶段');assert.deepEqual(Object.fromEntries(env.storage),stored);assert.match(get(env,'pjProgress').textContent,/1 \/ 2/);
});
test('invalid saved source filter falls back to all without rewriting storage',async()=>{
 const stored={'aifs.projects.source.v1':JSON.stringify('obsolete')};const env=setup({page:'catalog',data:plain(data),initialStorage:stored});await flush();
 assert.equal(get(env,'pjSourceFilter').querySelector('[data-source="all"]').getAttribute('aria-pressed'),'true');assert.deepEqual(Object.fromEntries(env.storage),stored);
});
test('theme switching preserves the existing theme storage key',async()=>{
 const env=setup({page:'catalog'});await get(env,'themeToggle').fire('click');assert.equal(env.document.documentElement.getAttribute('data-theme'),'dark');assert.equal(env.storage.get('theme'),'dark');
 await get(env,'themeToggle').fire('click');assert.equal(env.storage.get('theme'),'light');
});

// Reuse the established DOM model, but mount the actual runtime with the Chinese catalog.
// The original English regression file and assertions remain unchanged.
const runtimeFixture = fs.readFileSync(path.join(site,'test_project_figure_runtime.js'),'utf8');
const split = runtimeFixture.indexOf('const controls =');assert.ok(split>0);
const boot = runtimeFixture.slice(0,split);
const insertion = '  vm.runInNewContext(source, { window, document,';
assert.equal(boot.split(insertion).length,2);
const runtimeModule = {exports:{}};
vm.runInNewContext(boot.replace(insertion,'  window.AIFSProjectUI = chineseUI;\n'+insertion)+'\nmodule.exports={environment};',{
 require:require('node:module').createRequire(path.join(site,'test_project_figure_runtime.js')),__dirname:site,module:runtimeModule,chineseUI:create('zh-CN'),console});
const runtimeEnv=runtimeModule.exports.environment;
function frameTrace(value=2){return {frames:[{label:'读取',explanation:'检查输入。',metrics:[{label:'数量',value}],lanes:[{id:'input',label:'输入',items:[{id:'x',label:'记录',value}]}]},
 {label:'输出',explanation:'保留证据。',metrics:[{label:'数量',value}],lanes:[{id:'output',label:'输出',items:[{id:'x',label:'记录',value}]}],receipt:{count:value}}]};}
const numeric=[{key:'amount',label:'数量',type:'number',value:2,min:1,max:10}];
function runtimeButton(host,text){const found=host.querySelectorAll('button').find(n=>n.textContent===text);assert.ok(found,text);return found;}
test('Chinese runtime step controls preserve records and do not recompute on navigation',()=>{
 const env=runtimeEnv();let calls=0;const {host}=env.mount({lab:{controls:numeric,calculate:v=>{calls++;return frameTrace(v.amount);}}});
 const item=host.querySelector('.pj-trace-item');assert.equal(runtimeButton(host,'上一步').disabled,true);runtimeButton(host,'下一步').dispatch('click');
 assert.equal(host.querySelector('.pj-trace-item'),item);assert.equal(item.closest('[data-lane-id]').getAttribute('data-lane-id'),'output');assert.equal(calls,1);
 assert.match(host.querySelector('.pj-trace-controls').textContent,/步骤 2 \/ 2/);assert.match(host.querySelector('.pj-trace-receipt').textContent,/检查凭据/);assert.match(host.querySelector('.pj-trace-receipt').textContent,/"count": 2/);
 runtimeButton(host,'上一步').dispatch('click');assert.equal(host.querySelector('.pj-trace-receipt').hidden,true);
});
test('Chinese runtime reset and play keep original timer and aria behavior',()=>{
 const env=runtimeEnv();const observed=[];const {host}=env.mount({lab:{controls:numeric,calculate:v=>{observed.push(v.amount);return frameTrace(v.amount);}}});
 runtimeButton(host,'播放步骤').dispatch('click');assert.equal(env.timers.size,1);assert.equal(runtimeButton(host,'暂停').getAttribute('aria-pressed'),'true');env.tick();assert.equal(env.timers.size,0);
 assert.ok(runtimeButton(host,'重播步骤'));const input=host.querySelector('input');input.value='6';input.dispatch('input');assert.equal(observed.at(-1),6);
 runtimeButton(host,'重置输入').dispatch('click');assert.equal(observed.at(-1),2);assert.equal(input.value,'2');assert.equal(env.timers.size,0);
});
test('Chinese runtime invalid input messages keep rejected calculations from executing',()=>{
 const env=runtimeEnv();let calls=0;const {host}=env.mount({lab:{controls:numeric,calculate:v=>{calls++;return frameTrace(v.amount);}}});const input=host.querySelector('input');
 for(const [value,expected] of [['',/需要填写数字/],['NaN',/需要填写有限数值/],['11',/超出声明的范围/]]){input.value=value;input.dispatch('input');assert.match(host.querySelector('.pj-lab-message').textContent,expected);assert.equal(host.querySelector('.pj-trace-state').hidden,true);assert.equal(calls,1);}
});
test('Chinese runtime rejects invalid trace identities and links without hiding errors',()=>{
 const env=runtimeEnv();const {host}=env.mount({lab:{calculate:()=>({frames:[{label:'错误输入',explanation:'引用不存在。',lanes:[],links:[{from:'a',to:'missing'}]}]})}});
 assert.match(host.querySelector('.pj-lab-message').textContent,/连接必须引用本步骤中的两条记录/);assert.equal(host.querySelector('.pj-lab-message').getAttribute('data-error'),'true');assert.equal(host.querySelector('.pj-trace-state').hidden,true);
});
test('Chinese runtime reduced motion and disposal still release timers and listeners',()=>{
 const env=runtimeEnv({reduced:true});const {host,cleanup}=env.mount({lab:{calculate:frameTrace}});assert.equal(runtimeButton(host,'播放步骤').disabled,true);assert.match(host.textContent,/已启用减少动态效果/);
 runtimeButton(host,'下一步').dispatch('click');assert.equal(host.querySelector('.pj-trace-label').textContent,'输出');env.media.matches=false;env.media.dispatch('change');runtimeButton(host,'重播步骤').dispatch('click');assert.equal(env.timers.size,1);cleanup();
 assert.equal(env.timers.size,0);assert.equal(env.document.listenerCount(),0);assert.equal(env.window.listenerCount(),0);assert.equal(env.media.listenerCount(),0);
});
test('Chinese runtime keeps stale asynchronous results out of newer input state',async()=>{
 const env=runtimeEnv();const pending=[];const {host}=env.mount({lab:{controls:numeric,calculate:()=>new Promise(resolve=>pending.push(resolve))}});const input=host.querySelector('input');input.value='7';input.dispatch('input');pending[1](frameTrace(7));await flush();pending[0](frameTrace(2));await flush();assert.equal(host.querySelector('.pj-trace-value').textContent,'7');
});

test('all 52 planned cards show translated labels but remain planned and nonclickable',async()=>{
 const before=JSON.stringify(data);const env=setup({page:'catalog',data:deepFreeze(plain(data))});await flush();const cards=get(env,'pjLadder').querySelectorAll('.is-planned');assert.equal(cards.length,52);
 const ui=create('zh-CN');for(const planned of data.planned){assert.match(ui.text(planned.title),/[\u3400-\u9fff]/);assert.match(ui.text(planned.tagline),/[\u3400-\u9fff]/);assert.ok(cards.some(c=>c.textContent.includes(ui.text(planned.title))));}
 for(const card of cards)assert.equal(card.querySelector('a'),null);assert.equal(JSON.stringify(data),before);assert.equal(data.projects.length,48);
});
test('late-mounted completion-report command is copyable without changing its argv',async()=>{
 const env=await reader();const host=get(env,'pjCertificate');const button=host.querySelector('.pj-copy');assert.ok(button);
 const expected='python3 scripts/project_test.py test-project --all --strict --path my-test-project --report completion.json';assert.equal(button.getAttribute('data-copy'),expected);await env.main.fire('click',{target:button});assert.equal(env.copied.at(-1),expected);assert.equal(button.textContent,'已复制');
});
test('malformed JSON report keeps its diagnostic with a Chinese prefix',async()=>{
 const env=await reader();await get(env,'pjCertificateFile').fire('change',{target:{files:[{size:1,text:async()=>'{'}]}});assert.match(get(env,'pjCertificateStatus').textContent,/^无法读取评分报告：/);assert.equal(get(env,'pjCertificateDownload').disabled,true);
});
function originalSource(relative){
 const fixture=JSON.parse(fs.readFileSync(path.join(site,'fixtures/project-ui-zh.json'),'utf8'));const row=fixture.files.find(r=>r.path===relative);let text=fs.readFileSync(path.join(root,relative),'utf8');
 for(const edit of [...row.edits].reverse())for(const at of [...edit.afterOffsets].reverse()){
  const chars=Array.from(text),after=Array.from(edit.after);assert.equal(chars.slice(at,at+after.length).join(''),edit.after);chars.splice(at,after.length,...Array.from(edit.before));text=chars.join('');
 }
 assert.equal(require('node:crypto').createHash('sha256').update(text).digest('hex'),row.sourceSha256);return text;
}
test('all 196 stage documents retain original rendered code payloads and figure IDs',()=>{
 const before=setup({page:'catalog',source:originalSource('site/projects.js')}),after=setup({page:'catalog'});let count=0;
 for(const project of data.projects)for(const stage of project.stages){
  const markdown=fs.readFileSync(path.join(root,stage.doc),'utf8');const old=before.window.AIFSProjectsMarkdown(markdown,path.dirname(stage.doc)),next=after.window.AIFSProjectsMarkdown(markdown,path.dirname(stage.doc));
  const code=html=>Array.from(html.matchAll(/<code>([\s\S]*?)<\/code>/g),m=>m[1]);const figures=html=>Array.from(html.matchAll(/data-figure="([^"]*)"/g),m=>m[1]);
  assert.deepEqual(code(next.html),code(old.html),stage.doc);assert.deepEqual(figures(next.html),figures(old.html),stage.doc);assert.equal(next.title,old.title);count++;
 }
 assert.equal(count,196);
});
