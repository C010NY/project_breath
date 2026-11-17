
const supabaseClient = window.supabase.createClient(
  "https://gvqsyscxqocnswxrfbif.supabase.co",
  "sb_publishable_wEK-1CWE2Lcmr570BOLb7w_VCggTgGd"
)
const TRIALS=5;
let mode="baseline",trial=0,times=[],baseAvg=null,breathType="",breathDesc="",timer=null,breathCountdown=null,trialTimer=null,startTime=0,waiting=false,correctCount=0,mistakeCount=0,falseStartCount=0;
let baseAccuracy=null,baseMistakes=0,baseFalseStarts=0;
let participantCode = "";

function show(id){document.querySelectorAll(".screen").forEach(x=>x.classList.remove("active"));document.getElementById(id).classList.add("active")}
function avg(a){return a.reduce((x,y)=>x+y,0)/a.length}
function startBaseline() {
  const code = prompt("参加者コードを入力してください（例：P001）");

  if (code === null) return;

  participantCode = code.trim();

  if (!/^[A-Za-z0-9_-]{1,30}$/.test(participantCode)) {
    alert("参加者コードは英数字、ハイフン、アンダースコアの1〜30文字で入力してください。");
    return;
  }

  mode = "baseline";
  times = [];
  baseAvg = null;
  breathType = "";
  breathDesc = "";

  clearInterval(timer);
  clearInterval(breathCountdown);
  clearTimeout(trialTimer);

  timer = null;
  breathCountdown = null;

  document.querySelectorAll(".option").forEach(x =>
    x.classList.remove("selected")
  );

  document.getElementById("breathDesc").textContent =
    "呼吸法を選択してください。";

  document.getElementById("introTitle").textContent = "基準測定";
  document.getElementById("introText").textContent =
    "普段どおりに呼吸しながら、同じ選択反応課題を5回行います。";

  show("measureIntro");
}
function beginTrials(){
  trial=0;times=[];correctCount=0;mistakeCount=0;falseStartCount=0;
  // 次の測定を開始するとき、「開始」ボタンを再び有効化
  document.getElementById("startButton").disabled=false;
  show("measure"); updateProgress(); resetTarget();
}
function updateProgress(){document.getElementById("trialLabel").textContent=`${trial+1} / ${TRIALS}`;document.getElementById("bar").style.width=(trial/TRIALS*100)+"%"}
function shuffleAnswerButtons(){
  const box=document.getElementById("answerButtons");
  const buttons=[...box.querySelectorAll(".answer")];
  for(let i=buttons.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [buttons[i],buttons[j]]=[buttons[j],buttons[i]];
  }
  buttons.forEach(b=>box.appendChild(b));
}

function resetTarget(){
  let t=document.getElementById("target");
  t.className=""; t.textContent="準備";
  document.getElementById("measureMessage").textContent="2秒後に次の試行が始まります";
  document.querySelectorAll(".answer").forEach(b=>b.disabled=true);
  document.getElementById("answerButtons").classList.add("hidden");
}

function registerFalseStart(){
  if(!waiting) return;
  clearTimeout(trialTimer);
  waiting=false; startTime=0;
  falseStartCount++;
  trial++;
  document.getElementById("target").className="ready";
  document.getElementById("target").textContent="フライング！";
  document.getElementById("measureMessage").textContent="色が出る前のタップをフライングとしてカウントしました。";
  document.querySelectorAll(".answer").forEach(b=>b.disabled=true);
  document.getElementById("answerButtons").classList.add("hidden");
  document.getElementById("bar").style.width=(trial/TRIALS*100)+"%";
  nextTrial();
}

document.getElementById("target").addEventListener("pointerdown", registerFalseStart);

function startTrial(){
  document.getElementById("startButton").disabled=true;
  document.querySelectorAll(".answer").forEach(b=>b.disabled=true);
  document.getElementById("answerButtons").classList.add("hidden");
  waiting=true; early=false;
  let t=document.getElementById("target");
  t.className="ready"; t.textContent="待って…";
  document.getElementById("measureMessage").textContent="色が出るまで待って！";
  let delay=2000+Math.random()*3000;//待ち時間の変更
  trialTimer=setTimeout(()=>showColor(),delay);
}

function showColor(){
  waiting=false;
  const colors=[["red","赤"],["blue","青"],["yellow","黄"]];
  const c=colors[Math.floor(Math.random()*3)];
  const t=document.getElementById("target");
  t.className=c[0]; t.textContent=c[1];
  shuffleAnswerButtons();
  document.getElementById("answerButtons").classList.remove("hidden");
  startTime=performance.now();
  document.getElementById("measureMessage").textContent="色を確認 → 対応するボタンを探す → 押して！";
  document.querySelectorAll(".answer").forEach(b=>b.disabled=false);
}

function nextTrial(){
  if(trial<TRIALS){
    setTimeout(()=>{
      updateProgress();
      resetTarget();
      setTimeout(startTrial,2000);
    },2000);
  }else{
    document.getElementById("bar").style.width="100%";
    setTimeout(finishMeasure,2000);
  }
}

function answer(selected){
  if(startTime===0)return;

  const ms=performance.now()-startTime;
  const targetClass=document.getElementById("target").className;
  startTime=0;
  trial++;
  document.querySelectorAll(".answer").forEach(b=>b.disabled=true);
  document.getElementById("answerButtons").classList.add("hidden");

  if(selected!==targetClass){
    mistakeCount++;
    document.getElementById("measureMessage").textContent="不正解としてカウントしました。";
    nextTrial();
    return;
  }

  correctCount++;
  times.push(ms);
  document.getElementById("measureMessage").textContent=`正解！ ${Math.round(ms)} ms`;
  nextTrial();
}

async function finishMeasure(){
  const a=times.length ? Math.round(avg(times)) : null;
  const accuracy=Math.round(correctCount/TRIALS*100);
  const speedScore=a ? 1000/a : 0;
  const composite=Math.round(speedScore*(accuracy/100)*100)/100;

  if(mode==="baseline"){
    baseAvg=a;
    baseAccuracy=accuracy;
    baseMistakes=mistakeCount;
    baseFalseStarts=falseStartCount;
    document.getElementById("baseResult").textContent=a!==null ? a+" ms" : "測定不能";
    show("breathSelect");
  }else{
    document.getElementById("afterLabel").textContent=breathType || "選択した呼吸法";
    document.getElementById("afterResult").textContent=a!==null ? a+" ms" : "測定不能";

    const d=(baseAvg!==null && a!==null) ? baseAvg-a : null;
    const pct=(d!==null && baseAvg) ? d/baseAvg*100 : null;
    const { error } = await supabaseClient
  .from("experiment_results")
  .insert({
    participant_code: participantCode,
    breath_method: breathType,
    baseline_ms: baseAvg,
    after_ms: a,
    baseline_accuracy: baseAccuracy,
    after_accuracy: accuracy,
    baseline_mistakes: baseMistakes,
    after_mistakes: mistakeCount,
    baseline_false_starts: baseFalseStarts,
    after_false_starts: falseStartCount
  });

if (error) {
  console.error("保存エラー:", error);
  document.getElementById("resultText").textContent =
    "実験結果を表示しましたが、データの保存に失敗しました。もう一度試してください。";
} else {
  document.getElementById("resultText").textContent +=
    "\nデータベースへの保存が完了しました。";
}

    document.getElementById("change").textContent =
      d!==null ? ((d>=0?"⚡ ":"")+Math.abs(d)+" ms "+(d>=0?"速くなりました":"遅くなりました")) : "比較できません";

    document.getElementById("resultText").innerHTML =
      `<b>普通の呼吸法</b>：正解率 ${baseAccuracy}% ／ ミス ${baseMistakes}回 ／ フライング ${baseFalseStarts}回<br>` +
      `<b>${breathType}</b>：正解率 ${accuracy}% ／ ミス ${mistakeCount}回 ／ フライング ${falseStartCount}回<br>` +
      `変化率：${pct!==null?pct.toFixed(1)+"%":"比較不能"}（プラスは速くなったことを表します）<br>` +
      `参考スコア：${composite}（呼吸後の速さ×正解率。科学的な標準指標ではありません）`;

    show("result");
  }
}

function chooseBreath(name,desc){
 breathType=name;
 breathDesc=desc;
 document.querySelectorAll(".option").forEach(x=>x.classList.remove("selected"));
 [...document.querySelectorAll(".option")]
   .find(x=>x.textContent.includes(name))?.classList.add("selected");
 document.getElementById("breathDesc").textContent=desc;

 // 選択後はいったん確認画面へ進み、そこで「開始」を1回押す
 document.getElementById("breathIntroName").textContent=name;
 document.getElementById("breathIntroDesc").textContent=desc + " 1分間行ったあと、呼吸後の測定に進みます。";
 show("breathIntro");
}
function startBreathing(){
 if(!breathType){
   show("breathSelect");
   return;
 }

 clearInterval(timer);
 clearInterval(breathCountdown);
 timer=null;
 breathCountdown=null;

 show("breathing");
 document.getElementById("breathName").textContent=breathType;
 let phase=0;
 const pattern = breathType==="4-4-4"
   ? [{label:"吸う",sec:4,cls:"inhale"},{label:"止める",sec:4,cls:""},{label:"吐く",sec:4,cls:"exhale"}]
   : breathType==="4-7-8"
   ? [{label:"吸う",sec:4,cls:"inhale"},{label:"止める",sec:7,cls:""},{label:"吐く",sec:8,cls:"exhale"}]
   : [{label:"吸う",sec:4,cls:"inhale"},{label:"吐く",sec:8,cls:"exhale"}];
 const cycle=pattern.reduce((n,p)=>n+p.sec,0);

 function updateBreath(){
   const pos=phase%cycle;
   let acc=0, current=pattern[0];
   for(const p of pattern){
     if(pos<acc+p.sec){current=p;break;}
     acc+=p.sec;
   }
   document.getElementById("breathInstruction").textContent=current.label;
   document.getElementById("breathCircle").className="breath "+current.cls;
   phase++;
 }

 clearInterval(timer); clearInterval(breathCountdown);
 updateBreath();
 timer=setInterval(updateBreath,1000);
 let sec=60;
 document.getElementById("breathCount").textContent=sec;
 breathCountdown=setInterval(()=>{
   sec--;
   document.getElementById("breathCount").textContent=Math.max(sec,0);
   if(sec<=0) finishBreathing();
 },1000);
}

function finishBreathing(){
 clearInterval(timer);
 clearInterval(breathCountdown);
 timer=null;
 breathCountdown=null;
 mode="after";
 document.getElementById("afterBreathText").textContent =
   `${breathType}を1分間体験しました。これから、呼吸後の「色の認識 → ボタン位置の確認 → タップ」の選択反応課題を5回行います。`;
 show("afterBreathIntro");
}

function skipBreathing(){finishBreathing()}