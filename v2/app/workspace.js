/* Report workspace v2. Uses the immutable inline demo definitions; no network API or persistence. */
const sum=xs=>xs.reduce((a,x)=>a+x,0);
const mergeNumbers=xs=>{const o={};xs.forEach(x=>Object.entries(x||{}).forEach(([k,v])=>{o[k]=(o[k]||0)+v;}));return o;};
function personPeriod(id){
 if(S.period==='weekly')return personWeek(id,S.wi);
 const ws=[0,1,2].map(i=>personWeek(id,i)),base={...ws[0]};
 ['dh','min','eps','aiDh','afterMin','aiAssistDh'].forEach(k=>base[k]=sum(ws.map(w=>w[k])));
 ['sw','frag','aiShare'].forEach(k=>base[k]=sum(ws.map(w=>w[k]*w.dh))/base.dh);
 base.apps=mergeNumbers(ws.map(w=>w.apps));base.days=ws.flatMap((w,i)=>w.days.map(d=>({...d,d:WEEKS[i].short+' · '+d.d})));base.longest=Math.max(...ws.map(w=>w.longest));
 base.cats=ws[0].cats.map(c=>{const cs=ws.map(w=>w.cats.find(x=>x.id===c.id));return {...c,dh:sum(cs.map(c=>c.dh)),min:sum(cs.map(c=>c.min)),eps:sum(cs.map(c=>c.eps)),aiDh:sum(cs.map(c=>c.aiDh)),tasks:c.tasks.map(t=>({...t,min:sum(cs.flatMap(c=>c.tasks.filter(x=>x.t===t.t).map(x=>x.min)))}))};});
 return base;
}
function teamPeriod(id){
 if(S.period==='weekly')return teamWeek(id,S.wi);
 const ws=[0,1,2].map(i=>teamWeek(id,i)),o={...ws[0]},ppl=TEAM[id].members.map(p=>personPeriod(p.id));o.ppl=ppl;
 ['dh','eps','aiDh','afterMin','aiAssistDh'].forEach(k=>o[k]=sum(ws.map(w=>w[k])));
 ['sw','frag'].forEach(k=>o[k]=sum(ppl.map(p=>p[k]*p.dh))/o.dh);
 o.apps=mergeNumbers(ws.map(w=>w.apps));o.types=mergeNumbers(ws.map(w=>w.types));o.adopters=ppl.filter(p=>p.aiShare>0).length;o.longestMed=median(ppl.map(p=>p.longest));
 const keys=[...new Set(ws.flatMap(w=>w.cats.map(c=>c.id)))];o.cats=keys.map(id=>{const cs=ws.flatMap(w=>w.cats.filter(c=>c.id===id));return {...cs[0],dh:sum(cs.map(c=>c.dh)),aiDh:sum(cs.map(c=>c.aiDh)),eps:sum(cs.map(c=>c.eps)),tasks:mergeNumbers(cs.map(c=>c.tasks))};}).sort((a,b)=>b.dh-a.dh);return o;
}
function companyPeriod(){
 if(S.period==='weekly')return companyWeek(S.wi);
 const tw=TEAMS.map(t=>teamPeriod(t.id)),o={...companyWeek(0),tw};['dh','eps','aiDh','afterMin','aiAssistDh'].forEach(k=>o[k]=sum(tw.map(t=>t[k])));o.adopters=sum(tw.map(t=>t.adopters));o.types=mergeNumbers(tw.map(t=>t.types));o.apps=mergeNumbers(tw.map(t=>t.apps));['sw','frag'].forEach(k=>o[k]=sum(tw.map(t=>t[k]*t.dh))/o.dh);return o;
}
function companyAverage(){const all=[0,1,2].map(companyWeek);return {dh:sum(all.map(w=>w.dh))/3,tw:TEAMS.map((t,i)=>({dh:sum(all.map(w=>w.tw[i].dh))/3}))};}
function dupPeriod(t,d){const ws=(S.period==='weekly'?[S.wi]:[0,1,2]).map(i=>dupHours(t,i,d));return {h:sum(ws.map(w=>w.h)),people:Math.max(...ws.map(w=>w.people))};}
function periodControls(){return `<div class="period-controls"><div class="seg" role="group" aria-label="Report period"><button data-period="all" class="${S.period==='all'?'on':''}" aria-pressed="${S.period==='all'}">All period</button><button data-period="weekly" class="${S.period==='weekly'?'on':''}" aria-pressed="${S.period==='weekly'}">Weekly</button></div>${S.period==='weekly'?`<label>Week <select data-period-week aria-label="Week">${WEEKS.map((w,i)=>`<option value="${i}" ${i===S.wi?'selected':''}>${w.label}</option>`).join('')}</select></label>`:`<span class="meta">All recorded observations</span>`}</div>`;}
function workspacePeriod(){
 if(['home','directory','teams'].includes(S.view)||(S.view==='plan'&&!S.procDetail))return;
 const root=$('#v-'+S.view),page=root.querySelector('.page');if(!page)return;
 const control=document.createElement('div');control.className='workspace-period';control.innerHTML=periodControls();page.prepend(control);
 const select=root.querySelector('[data-period-week]');if(select)select.onchange=()=>{S.wi=+select.value;render();};
 let c=null,n=null;
 if(S.view==='cases'){const parts=(S.ch||'').split(/[/?]/);c=CX.cases.find(c=>c.id===parts[1]);if(parts[2]==='step')n=+parts[3];}
 if(S.view==='plan'&&S.procDetail)c=CX.procCase(S.proc);
 if(c){const holder=document.createElement('div');holder.innerHTML=CX.periodPanel(c,n);control.after(holder);}
 if(S.view==='cases'&&/^(department\/|cohort-team\/|participant\/)/.test(S.ch||'')){
  const [type,id]=(S.ch||'').split(/[/?]/);let ids=[];
  if(type==='department')ids=PEOPLE.filter(p=>CX.departments[id]?.teams.includes(p.team)).map(p=>p.id);
  if(type==='cohort-team')ids=PEOPLE.filter(p=>p.team===id).map(p=>p.id);
  if(type==='participant'&&PERSON[id])ids=[id];
  const panel=document.createElement('div');panel.className='period-evidence card';
  if(ids.length){const weekTotals=[0,1,2].map(i=>sum(ids.map(id=>personWeek(id,i).dh))),value=S.period==='weekly'?weekTotals[S.wi]:sum(weekTotals),avg=sum(weekTotals)/3;panel.innerHTML=`<b>${H(value)} recorded · ${ids.length} people with full reports</b><p>${S.period==='weekly'?delta(value,avg)+' vs whole-period weekly average ('+H(avg)+')':'Sum of all three recorded weeks.'}</p><p class="note">Process-only participants and unobserved approvers are excluded from recorded hours. Process cards retain whole-period cohort references.</p>`;}else panel.innerHTML='<b>Process evidence only</b><p class="note">No dated personal/team recording totals available for this cohort. No hours or weekly deviations are inferred.</p>';
  control.after(panel);
 }
 if(S.view==='person'||S.view==='team'||S.view==='company'){
  const content=root.querySelector('.page');const walker=document.createTreeWalker(content,NodeFilter.SHOW_TEXT);let node;while(node=walker.nextNode()){
   if(node.parentElement.closest('.workspace-period'))continue;
   if(S.period==='all')node.textContent=node.textContent.replace(/of the week\b/g,'of the period').replace(/of week\b/g,'of period').replace(/this week\b/g,'in the selected period').replace(/The week, hour by hour/g,'All recorded days, hour by hour');
  }
 }
 // Period is URL state, preserving deep links, reloads and browser history.
 const [path,q]=(location.hash||'#home').split('?'),params=new URLSearchParams(q||'');params.set('period',S.period);if(S.period==='weekly')params.set('week',S.wi);else params.delete('week');history.replaceState(null,'',location.pathname+location.search+path+'?'+params);
}
function rDirectory(){
 const seen=new Set(PEOPLE.map(p=>p.id)),cohort=CX.people.filter(p=>!seen.has(p.id));
 $('#v-directory').innerHTML=`<div class="page"><h1>Personal reports</h1><p class="lede">Find a person in the department → team → person directory. Full reports and process-only participants are kept distinct; each identity has one canonical profile.</p><label class="directory-search">${ic('search')}<input id="directory-search" aria-label="Search people" placeholder="Search people, roles or teams"></label>${Object.entries(CX.departments).map(([id,d])=>`<section class="sec"><h2><a href="#department/${id}">${d.name}</a></h2>${d.teams.map(t=>{const ps=PEOPLE.filter(p=>p.team===t),xs=cohort.filter(p=>CX.ownerTeam(p.id)===t);if(!ps.length&&!xs.length)return '';return `<div class="card" style="margin:12px 0"><h3><a data-team="${t}" class="nlink">${TEAM[t]?.name||t}</a></h3><div class="directory-grid">${ps.map(p=>`<a class="directory-person" href="#person/${p.id}" data-search="${esc([nm(p),ROLES[p.role].title,TEAM[t].name].join(' ').toLowerCase())}">${av(p)}<span><b>${esc(nm(p))}</b><small>${ROLES[p.role].title}</small><small>Full personal report</small></span>${ic('right')}</a>`).join('')}${xs.map(p=>`<a class="directory-person" href="#participant/${p.id}" data-search="${esc([p.pseudonym,p.role,t].join(' ').toLowerCase())}"><span class="av anon">•</span><span><b>${esc(p.pseudonym)}</b><small>${esc(p.role)}</small><small>${p.id==='svp'?'Unobserved approver · no personal report':'Process-only profile'}</small></span>${ic('right')}</a>`).join('')}</div></div>`;}).join('')}</section>`).join('')}</div>`;
 $('#directory-search').oninput=e=>{const q=e.target.value.trim().toLowerCase();$$('[data-search]').forEach(a=>a.hidden=!a.dataset.search.includes(q));};
}
function rTeams(){
 $('#v-teams').innerHTML=`<div class="page"><h1>Teams</h1><p class="lede">Teams belong to one department. Open a full team report or the process evidence for a limited cohort.</p>${Object.entries(CX.departments).map(([id,d])=>`<section class="sec"><h2><a href="#department/${id}">${d.name}</a></h2><div class="directory-grid">${d.teams.map(t=>`<a class="card" href="${TEAM[t]?'#team/'+t:'#cohort-team/'+encodeURIComponent(t)}"><h3>${TEAM[t]?.name||t}</h3><p class="note">${TEAM[t]?TEAM[t].members.length+' people · full team report':'Process participants · limited evidence'}</p></a>`).join('')}</div></section>`).join('')}</div>`;
}
function homeLinks(){
 const top=PLAN.map(s=>({s,e:evidence(s.id)})).sort((a,b)=>b.e.back-a.e.back)[0],slow=[...CX.cases].sort((a,b)=>b.steps.find(s=>s.n===b.bottleneck.step_n).median_s_per_cohort_run-a.steps.find(s=>s.n===a.bottleneck.step_n).median_s_per_cohort_run)[0],b=slow.steps.find(s=>s.n===slow.bottleneck.step_n),change=TEAMS.map(t=>{const h=[0,1,2].map(i=>teamWeek(t.id,i).dh),avg=sum(h)/3;return {t,dev:(h[2]-avg)/avg};}).sort((a,b)=>Math.abs(b.dev)-Math.abs(a.dev))[0];
 return `<section class="home-start"><h2>Start here</h2><p class="note">Direct page links · not chat prompts</p><div class="home-links"><a class="card" href="#plan"><span class="kk">Biggest modeled opportunity</span><h3>${top.s.t}</h3><p>${top.e.back.toFixed(1)} h/week · ${money(top.e.back*4.33*S.cost)}/month</p><span class="nlink">Open automation plan →</span></a><a class="card" href="#case/${slow.id}/step/${b.n}"><span class="kk">Slowest cohort step</span><h3>${slow.title}</h3><p>Step ${b.n} · ${b.name}</p><span class="nlink">Open step evidence →</span></a><a class="card" href="#team/${change.t.id}?period=weekly&week=2"><span class="kk">Largest team change · week 3</span><h3>${change.t.name}</h3><p>${(change.dev>=0?'+':'')+(change.dev*100).toFixed(1)}% recorded hours vs whole-period weekly average</p><span class="nlink">Open team report →</span></a></div><div class="home-shortcuts"><a class="btn" href="#company">Company overview</a><a class="btn" href="#departments">Departments</a><a class="btn" href="#directory">Find a personal report</a></div></section>`;
}
function rHome(){
 rLegacyAsk();const chat=$('#v-ask .chat');$('#v-home').replaceChildren(chat);
 if(!S.msgs.length){const hero=chat.querySelector('.ask-hero');hero.querySelector('h1').textContent='What would you like to understand?';hero.querySelector('p').textContent='Explore Harbor Mutual’s work, ask a question, or open a report below.';hero.querySelector('p').after(chat.querySelector('.composer-wrap'));hero.insertAdjacentHTML('afterend',homeLinks());}
 else{chat.querySelector('.chat-col').insertAdjacentHTML('beforeend',`<div class="home-shortcuts"><a href="#plan">Automation plan</a><a href="#plan/maps">Process maps</a><a href="#directory">Personal reports</a></div>`);}
 $('#sbody').scrollTop=S.msgs.length?$('#sbody').scrollHeight:0;
}
function rPlan(){
 if(S.tab==='maps'&&S.procDetail){rPlanDetail();const b=$('#tab-maps');b.onclick=()=>navigate('#plan/maps');return;}
 const head=`<h1>Processes &amp; automation</h1><p class="lede">Understand the process, choose the step to improve, then review the automation blueprint. Modeled returns use the existing three-week evidence.</p><div class="seg main-tabs" role="tablist" aria-label="Processes and automation"><button id="tab-plan" role="tab" aria-selected="${S.tab==='plan'}" class="${S.tab==='plan'?'on':''}">Automation plan</button><button id="tab-maps" role="tab" aria-selected="${S.tab==='maps'}" class="${S.tab==='maps'?'on':''}">Process maps</button></div>`;
 let body='';
 if(S.tab==='plan'){
  const owned=TEAMS.map(t=>({t,items:PLAN.filter(s=>s.src[0][0]===t.id)}));
  body=costCtl()+owned.map(({t,items})=>`<section class="sec"><h2><a data-team="${t.id}" class="nlink">${t.name}</a></h2>${[...new Set(items.map(s=>s.proc||'other'))].map(pid=>{const xs=items.filter(s=>(s.proc||'other')===pid),back=sum(xs.map(s=>evidence(s.id).back)),c=CX.procCase(pid);return `<div class="card automation-group"><h3>${PROC[pid]?.n||'Other team workflows'}</h3><p class="note">${back.toFixed(1)} modeled h/week · ${money(back*4.33*S.cost)}/month${c?` · <a href="#case/${c.id}">Full process board →</a>`:''}</p>${xs.map(s=>{const e=evidence(s.id);return `<div class="row"><div class="grow"><button class="nlink" data-sug="${s.id}">${s.t}</button><p class="note">${s.what}</p><p class="note">${s.src.map(([t])=>TEAM[t].name).filter((x,i,a)=>a.indexOf(x)===i).join(' + ')} · Approver: ${s.approver}</p></div><div class="v"><b>${e.back.toFixed(1)} h/wk</b><div class="d">${money(e.back*4.33*S.cost)}/mo</div></div></div>`;}).join('')}</div>`;}).join('')}</section>`).join('');
 }else{
  body=`<section class="sec"><h2>Process maps</h2><p class="note">Each process keeps all of its steps. Expand the list or open the complete interactive board.</p>${CX.cases.map(c=>`<div class="card map-group"><h3><a href="#case/${c.id}">${c.title}</a></h3><p>${PROC[c.proc]?.d||c.bottleneck.why}</p><p class="note">${CX.org(c).route.join(' → ')} · ${c.steps.length} steps · ${c.people_ids.length} participants</p><details><summary>All ${c.steps.length} steps</summary><ol class="complete-steps">${(c.x.typical_order||c.steps.map(s=>s.n)).concat(c.steps.map(s=>s.n)).filter((n,i,a)=>a.indexOf(n)===i).map(n=>{const s=c.steps[n-1];return `<li value="${n}"><a href="#case/${c.id}/step/${n}">${s.name}</a><small>${s.department} / ${s.team_label}</small></li>`;}).join('')}</ol></details><div class="home-shortcuts"><a class="btn solid" href="#case/${c.id}">Open full board →</a>${c.proc?`<button class="btn" data-proc="${c.proc}">Stage overview</button>`:''}<a class="btn" href="#case/${c.id}/brief">Automation blueprint</a></div></div>`).join('')}</section>`;
 }
 $('#v-plan').innerHTML=`<div class="page">${head}${body}<p class="note">Sample data · fictional. Modeled returns are not measured savings. Cross-team suggestions are listed once, under their primary source team; contributors remain named.</p></div>`;
 $('#tab-plan').onclick=()=>navigate('#plan');$('#tab-maps').onclick=()=>navigate('#plan/maps');if(S.tab==='plan')bindCost();
}
