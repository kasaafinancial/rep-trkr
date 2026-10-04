const EXERCISES=["Push-ups","Squats","Pull-ups","Dips","Sit-ups"];
const KEY="repTrackerDataV1";
let data=JSON.parse(localStorage.getItem(KEY)||"{}");
let view="today", calendarDate=new Date(), deferredInstall=null;

function key(d){return d.toISOString().slice(0,10)}
function getDay(k=key(new Date())){if(!data[k])data[k]=Object.fromEntries(EXERCISES.map(x=>[x,0]));return data[k]}
function save(){localStorage.setItem(KEY,JSON.stringify(data))}
function total(day){return EXERCISES.reduce((s,e)=>s+(day[e]||0),0)}
function fmtDate(d){return d.toLocaleDateString(undefined,{weekday:"long",month:"long",day:"numeric",year:"numeric"})}

document.getElementById("dateLabel").textContent=fmtDate(new Date());

function renderToday(){
 const d=getDay(); document.getElementById("todayTotal").textContent=total(d);
 document.getElementById("exerciseList").innerHTML=EXERCISES.map(e=>`
  <div class="exercise">
   <div class="exerciseTop"><span class="exerciseName">${e}</span><span class="count">${d[e]}</span></div>
   <div class="controls">
    <button class="minus" data-e="${e}" data-n="-1">−</button>
    <button data-e="${e}" data-n="5">+5</button>
    <button data-e="${e}" data-n="10">+10</button>
    <button class="plus" data-e="${e}" data-n="20">+20</button>
    <button class="plus" data-e="${e}" data-n="1">+1</button>
   </div>
  </div>`).join("");
 document.querySelectorAll("[data-e]").forEach(b=>b.onclick=()=>change(b.dataset.e,Number(b.dataset.n)));
}
function change(e,n){let d=getDay();d[e]=Math.max(0,d[e]+n);save();renderToday();if(view!=="today")renderView()}
function renderCalendar(){
 const y=calendarDate.getFullYear(),m=calendarDate.getMonth(),first=new Date(y,m,1),days=new Date(y,m+1,0).getDate();
 let html=`<div class="panel"><div class="monthNav"><button id="prev">‹</button><strong>${calendarDate.toLocaleDateString(undefined,{month:"long",year:"numeric"})}</strong><button id="next">›</button></div><div class="calendar">${["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(x=>`<div class="dow">${x}</div>`).join("")}`;
 for(let i=0;i<first.getDay();i++)html+=`<div class="day empty"></div>`;
 for(let n=1;n<=days;n++){let dt=new Date(y,m,n),k=key(dt),t=total(getDay(k)),lvl=t>=300?4:t>=200?3:t>=100?2:t>0?1:0;html+=`<div class="day level${lvl} ${k===key(new Date())?"today":""}" title="${t} reps"><div class="num">${n}</div><div class="reps">${t||""}</div></div>`}
 html+=`</div><p class="hint">Tap a day in a future version to see its exercise breakdown. Intensity: 1–99 light, 100–199 moderate, 200–299 high, 300+ very high.</p></div>`;
 document.getElementById("view").innerHTML=html;
 document.getElementById("prev").onclick=()=>{calendarDate.setMonth(calendarDate.getMonth()-1);renderCalendar()};
 document.getElementById("next").onclick=()=>{calendarDate.setMonth(calendarDate.getMonth()+1);renderCalendar()};
}
function allDays(){return Object.keys(data).sort()}
function renderStats(){
 const keys=allDays(), totals=keys.map(k=>total(getDay(k))), lifetime=totals.reduce((a,b)=>a+b,0);
 let recent=keys.slice(-30), vals=recent.map(k=>total(getDay(k))), max=Math.max(1,...vals);
 let avg=vals.length?Math.round(vals.reduce((a,b)=>a+b,0)/vals.length):0;
 let streak=0,d=new Date(); while(true){let t=total(getDay(key(d)));if(!t)break;streak++;d.setDate(d.getDate()-1)}
 let longest=0,run=0;keys.forEach(k=>{if(total(getDay(k)))run++;else run=0;longest=Math.max(longest,run)});
 let chart=recent.length?`<div class="barChart">${recent.map((k,i)=>`<div class="barWrap" title="${k}: ${vals[i]}"><div style="width:100%"><div class="bar" style="height:${Math.max(2,vals[i]/max*145)}px"></div><div class="barLabel">${k.slice(5)}</div></div></div>`).join("")}</div>`:`<p class="hint">Start logging reps and your trend will appear here.</p>`;
 document.getElementById("view").innerHTML=`<div class="panel"><h2>Overview</h2><div class="statGrid">
 <div class="stat"><label>Lifetime</label><strong>${lifetime}</strong></div><div class="stat"><label>30-day avg</label><strong>${avg}</strong></div>
 <div class="stat"><label>Current streak</label><strong>${streak} days</strong></div><div class="stat"><label>Longest streak</label><strong>${longest} days</strong></div></div>
 <div class="exerciseStats"><h2>Last 30 days</h2>${chart}</div>
 <div class="exerciseStats"><h2>Exercise totals</h2>${EXERCISES.map(e=>`<div class="row"><span>${e}</span><strong>${keys.reduce((s,k)=>s+(getDay(k)[e]||0),0)}</strong></div>`).join("")}</div>
 <button class="reset" id="reset">Reset all data</button></div>`;
 document.getElementById("reset").onclick=()=>{if(confirm("Delete all workout data?")){data={};save();renderView();renderToday()}};
}
function renderView(){document.querySelectorAll(".tab").forEach(b=>b.classList.toggle("active",b.dataset.view===view));if(view==="calendar")renderCalendar();else if(view==="stats")renderStats();else document.getElementById("view").innerHTML=`<p class="hint">Use the buttons above to log reps. Your data is saved locally on this phone/browser.</p>`}
document.querySelectorAll(".tab").forEach(b=>b.onclick=()=>{view=b.dataset.view;renderView()});
renderToday();renderView();

window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferredInstall=e;document.getElementById("installBtn").classList.remove("hidden")});
document.getElementById("installBtn").onclick=async()=>{if(!deferredInstall)return;deferredInstall.prompt();deferredInstall=null};

if("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(()=>{});
