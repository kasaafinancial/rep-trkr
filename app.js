const EXERCISES=["Push-ups","Squats","Pull-ups","Dips","Sit-ups"];
const KEY="repTrackerDataV1";
const SETTINGS_KEY="repTrackerSettingsV1";
let data=JSON.parse(localStorage.getItem(KEY)||"{}");
let settings=Object.assign({dailyGoal:200, exerciseGoals:{}}, JSON.parse(localStorage.getItem(SETTINGS_KEY)||"{}"));
let view="today", calendarDate=new Date(), deferredInstall=null;

function key(d=new Date()){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`}
function dateFromKey(k){const [y,m,d]=k.split("-").map(Number);return new Date(y,m-1,d)}
function getDay(k=key()){if(!data[k])data[k]=Object.fromEntries(EXERCISES.map(x=>[x,0]));return data[k]}
function save(){localStorage.setItem(KEY,JSON.stringify(data))}
function saveSettings(){localStorage.setItem(SETTINGS_KEY,JSON.stringify(settings))}
function total(day){return EXERCISES.reduce((s,e)=>s+(day[e]||0),0)}
function fmtDate(d){return d.toLocaleDateString(undefined,{weekday:"long",month:"long",day:"numeric",year:"numeric"})}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function allDays(){return Object.keys(data).sort()}
function daysBetween(a,b){return Math.round((dateFromKey(b)-dateFromKey(a))/86400000)}

document.getElementById("dateLabel").textContent=fmtDate(new Date());

function renderToday(){
 const d=getDay(), t=total(d), goal=Math.max(1,Number(settings.dailyGoal)||1), pct=Math.min(100,Math.round(t/goal*100));
 document.getElementById("todayTotal").textContent=t;
 document.getElementById("exerciseList").innerHTML=EXERCISES.map(e=>{
   const eg=Number(settings.exerciseGoals[e]||0), ep=eg?Math.min(100,Math.round(d[e]/eg*100)):0;
   return `<div class="exercise">
    <div class="exerciseTop"><span class="exerciseName">${e}</span><span class="count">${d[e]}</span></div>
    ${eg?`<div class="miniGoal"><div><span>Goal ${eg}</span><span>${ep}%</span></div><div class="progress"><i style="width:${ep}%"></i></div></div>`:""}
    <div class="controls">
     <button class="minus" data-e="${esc(e)}" data-n="-1">−</button>
     <button data-e="${esc(e)}" data-n="5">+5</button>
     <button data-e="${esc(e)}" data-n="10">+10</button>
     <button class="plus" data-e="${esc(e)}" data-n="20">+20</button>
     <button class="plus" data-e="${esc(e)}" data-n="1">+1</button>
    </div>
   </div>`}).join("");
 document.getElementById("view").innerHTML=`<div class="panel goalPanel">
   <div class="panelHead"><h2>Daily Goal</h2><strong>${t} / ${goal}</strong></div>
   <div class="progress large"><i style="width:${pct}%"></i></div>
   <p class="hint">${t>=goal?"Goal reached 🎯":`${goal-t} reps to go today.`}</p>
 </div>`;
 document.querySelectorAll("[data-e]").forEach(b=>b.onclick=()=>change(b.dataset.e,Number(b.dataset.n)));
}
function change(e,n){let d=getDay();d[e]=Math.max(0,(d[e]||0)+n);save();renderToday();if(view!=="today")renderView()}

function renderCalendar(){
 const y=calendarDate.getFullYear(),m=calendarDate.getMonth(),first=new Date(y,m,1),days=new Date(y,m+1,0).getDate();
 let html=`<div class="panel"><div class="monthNav"><button id="prev">‹</button><strong>${calendarDate.toLocaleDateString(undefined,{month:"long",year:"numeric"})}</strong><button id="next">›</button></div><div class="calendar">${["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(x=>`<div class="dow">${x}</div>`).join("")}`;
 for(let i=0;i<first.getDay();i++)html+=`<div class="day empty"></div>`;
 for(let n=1;n<=days;n++){
   let dt=new Date(y,m,n),k=key(dt),t=total(getDay(k)),lvl=t>=300?4:t>=200?3:t>=100?2:t>0?1:0;
   html+=`<button class="day level${lvl} ${k===key(new Date())?"today":""}" data-day="${k}" title="${t} reps"><div class="num">${n}</div><div class="reps">${t||""}</div></button>`;
 }
 html+=`</div><p class="hint">Tap any day to see its exercise breakdown. Intensity: 1–99 light, 100–199 moderate, 200–299 high, 300+ very high.</p><div id="dayDetail"></div></div>`;
 document.getElementById("view").innerHTML=html;
 document.getElementById("prev").onclick=()=>{calendarDate.setMonth(calendarDate.getMonth()-1);renderCalendar()};
 document.getElementById("next").onclick=()=>{calendarDate.setMonth(calendarDate.getMonth()+1);renderCalendar()};
 document.querySelectorAll("[data-day]").forEach(b=>b.onclick=()=>showDayDetail(b.dataset.day));
}
function showDayDetail(k){
 const d=getDay(k), t=total(d);
 document.getElementById("dayDetail").innerHTML=`<div class="detail">
   <div class="panelHead"><h3>${fmtDate(dateFromKey(k))}</h3><strong>${t} reps</strong></div>
   ${EXERCISES.map(e=>`<div class="row"><span>${e}</span><strong>${d[e]||0}</strong></div>`).join("")}
 </div>`;
}

function streaks(){
 const keys=allDays(), set=new Set(keys.filter(k=>total(getDay(k))>0));
 let current=0,d=new Date();
 while(set.has(key(d))){current++;d.setDate(d.getDate()-1)}
 let longest=0,run=0,prev=null;
 keys.forEach(k=>{if(total(getDay(k))){run=(prev&&daysBetween(prev,k)===1)?run+1:1;longest=Math.max(longest,run);prev=k}else{run=0;prev=null}});
 return {current,longest};
}
function personalRecords(){
 const keys=allDays();
 const dayBest=keys.reduce((best,k)=>{const t=total(getDay(k));return t>best.value?{value:t,key:k}:best},{value:0,key:null});
 const exerciseBest={};
 EXERCISES.forEach(e=>exerciseBest[e]=keys.reduce((best,k)=>{const v=getDay(k)[e]||0;return v>best.value?{value:v,key:k}:best},{value:0,key:null}));
 return {dayBest,exerciseBest};
}
function barChart(keys, values, labelFn=(k)=>k.slice(5)){
 const max=Math.max(1,...values);
 if(!keys.length)return `<p class="hint">No data yet.</p>`;
 return `<div class="barChart">${keys.map((k,i)=>`<div class="barWrap" title="${esc(k)}: ${values[i]}"><div class="bar" style="height:${Math.max(2,values[i]/max*145)}px"></div><div class="barLabel">${esc(labelFn(k))}</div></div>`).join("")}</div>`;
}
function exerciseChart(e, keys){
 const vals=keys.map(k=>getDay(k)[e]||0), max=Math.max(1,...vals);
 return `<div class="exerciseChart"><div class="chartTitle"><span>${e}</span><strong>${vals.reduce((a,b)=>a+b,0)} total</strong></div><div class="barChart small">${keys.map((k,i)=>`<div class="barWrap" title="${esc(k)}: ${vals[i]}"><div class="bar" style="height:${Math.max(2,vals[i]/max*120)}px"></div><div class="barLabel">${esc(k.slice(5))}</div></div>`).join("")}</div></div>`;
}

function renderStats(){
 const keys=allDays(), totals=keys.map(k=>total(getDay(k))), lifetime=totals.reduce((a,b)=>a+b,0);
 const recent=keys.slice(-30), vals=recent.map(k=>total(getDay(k))), avg=vals.length?Math.round(vals.reduce((a,b)=>a+b,0)/vals.length):0;
 const {current,longest}=streaks(), records=personalRecords();
 const exerciseTotals=EXERCISES.map(e=>[e,keys.reduce((s,k)=>s+(getDay(k)[e]||0),0)]);
 const charts=EXERCISES.map(e=>exerciseChart(e,recent)).join("");
 document.getElementById("view").innerHTML=`<div class="panel"><h2>Overview</h2><div class="statGrid">
 <div class="stat"><label>Lifetime</label><strong>${lifetime}</strong></div><div class="stat"><label>30-day avg</label><strong>${avg}</strong></div>
 <div class="stat"><label>Current streak</label><strong>${current} days</strong></div><div class="stat"><label>Longest streak</label><strong>${longest} days</strong></div></div>
 <div class="exerciseStats"><h2>All reps — last 30 days</h2>${barChart(recent,vals)}</div>
 <div class="exerciseStats"><h2>Per-exercise graphs</h2>${charts||'<p class="hint">Start logging reps and your graphs will appear here.</p>'}</div>
 <div class="exerciseStats"><h2>Exercise totals</h2>${exerciseTotals.map(([e,v])=>`<div class="row"><span>${e}</span><strong>${v}</strong></div>`).join("")}</div>
 <div class="exerciseStats"><h2>Personal records</h2>
   <div class="record"><span>Best day</span><strong>${records.dayBest.value||0}${records.dayBest.key?` <small>(${records.dayBest.key})</small>`:""}</strong></div>
   ${EXERCISES.map(e=>`<div class="record"><span>${e}</span><strong>${records.exerciseBest[e].value||0}${records.exerciseBest[e].key?` <small>(${records.exerciseBest[e].key})</small>`:""}</strong></div>`).join("")}
 </div>
 <div class="buttonRow"><button id="settingsBtn">Goals</button><button id="exportJson">Backup JSON</button><button id="exportCsv">Export CSV</button><button class="reset" id="reset">Reset all data</button></div>
 <div id="settingsArea"></div></div>`;
 document.getElementById("settingsBtn").onclick=renderGoals;
 document.getElementById("exportJson").onclick=exportJSON;
 document.getElementById("exportCsv").onclick=exportCSV;
 document.getElementById("reset").onclick=()=>{if(confirm("Delete all workout data and goals?")){data={};settings={dailyGoal:200,exerciseGoals:{}};save();saveSettings();renderView();renderToday()}};
}
function renderGoals(){
 const eg=settings.exerciseGoals||{};
 document.getElementById("settingsArea").innerHTML=`<div class="settings">
   <h2>Goals</h2>
   <label>Daily total goal <input id="dailyGoal" type="number" min="0" step="1" value="${Number(settings.dailyGoal)||0}"></label>
   ${EXERCISES.map(e=>`<label>${e} goal <input class="eg" data-ex="${esc(e)}" type="number" min="0" step="1" value="${Number(eg[e]||0)}"></label>`).join("")}
   <p class="hint">Set an exercise goal to show its progress on Today. Use 0 to turn an exercise goal off.</p>
   <button id="saveGoals">Save goals</button>
 </div>`;
 document.getElementById("saveGoals").onclick=()=>{
   settings.dailyGoal=Math.max(0,Number(document.getElementById("dailyGoal").value)||0);
   settings.exerciseGoals={};
   document.querySelectorAll(".eg").forEach(i=>settings.exerciseGoals[i.dataset.ex]=Math.max(0,Number(i.value)||0));
   saveSettings();renderStats();renderToday();
 };
}
function download(name,content,type){
 const blob=new Blob([content],{type}),url=URL.createObjectURL(blob),a=document.createElement("a");
 a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),500);
}
function exportJSON(){
 download(`rep-tracker-backup-${key()}.json`,JSON.stringify({version:1,data,settings},null,2),"application/json");
}
function csvCell(v){return `"${String(v).replace(/"/g,'""')}"`}
function exportCSV(){
 const rows=[["Date",...EXERCISES,"Total"]];
 allDays().forEach(k=>{const d=getDay(k);rows.push([k,...EXERCISES.map(e=>d[e]||0),total(d)])});
 download(`rep-tracker-${key()}.csv`,rows.map(r=>r.map(csvCell).join(",")).join("\n"),"text/csv;charset=utf-8");
}

function renderView(){
 document.querySelectorAll(".tab").forEach(b=>b.classList.toggle("active",b.dataset.view===view));
 if(view==="calendar")renderCalendar();else if(view==="stats")renderStats();else document.getElementById("view").innerHTML=`<p class="hint">Your data is saved locally on this phone/browser. Nothing is sent to a server.</p>`;
}
document.querySelectorAll(".tab").forEach(b=>b.onclick=()=>{view=b.dataset.view;renderView()});
renderToday();renderView();

window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferredInstall=e;document.getElementById("installBtn").classList.remove("hidden")});
document.getElementById("installBtn").onclick=async()=>{if(!deferredInstall)return;deferredInstall.prompt();deferredInstall=null};

if("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(()=>{});
