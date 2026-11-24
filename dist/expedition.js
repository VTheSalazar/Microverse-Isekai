(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.MicroverseExpedition=api;
})(globalThis,function(){
  'use strict';
  const KEY='microverse_expedition_v1';
  const COIN='assets/materials/gold.png';
  const FRAGMENT='assets/materials/viral.webp', HEART='assets/materials/heart.webp';
  const MAX_LEVEL=100, STAGE=1, WAVE_SECONDS=55, GOLD_CAP=2000, BOSS_GOLD=1000;
  const waves=[
    {count:48,types:[...Array(23).fill('virus'),'shielded']},
    {count:68,types:[...Array(21).fill('virus'),'bacteria','shielded']},
    {boss:'virus',gold:120},
    {count:76,types:['virus','virus','bacteria','lancer','shielded']},
    {count:82,types:['virus','virus','bacteria','armored','lancer','shielded']},
    {boss:'bacteria',gold:130},
    {count:58,types:['virus','bacteria','lancer','armored','shielded']},
    {count:52,types:['virus','bacteria','virus','lancer','armored','shielded']},
    {boss:'lancer',gold:150},
    {boss:'final',gold:BOSS_GOLD}
  ];
  const openingCosts=[300,450,600,800,950,1150,1400,1700,2650];
  const amount=n=>Number.isSafeInteger(n)&&n>0?Math.min(1e9,n):0;
  function parse(storage,key){try{return JSON.parse(storage.getItem(key)||'null')}catch{return null}}
  function modifiers(hero,level){
    const n=level-1;
    return {health:Math.round(hero.hp*n*.022),damage:1+n*.018,rate:1+n*.008,speed:1+n*.003,armor:n*.0015};
  }
  function create(storage,heroIds,random=Math.random){
    const saved=parse(storage,KEY),old=saved?null:parse(storage,'microverse_laboratory_v1');
    let state={gold:amount(saved?.gold??old?.dna),crystals:amount(saved?.crystals??old?.crystals),fragments:amount(saved?.fragments),hearts:amount(saved?.hearts),levels:Object.fromEntries(heroIds.map(id=>[id,Math.max(1,Math.min(MAX_LEVEL,amount(saved?.levels?.[id])))]))};
    let run=null,dirty=false,lastWrite=0;
    function write(next){
      try{storage.setItem(KEY,JSON.stringify(next));dirty=false;lastWrite=Date.now();return true}catch{return false}
    }
    function flush(){return !dirty||write(state)}
    function snapshot(){return {...state,levels:{...state.levels}}}
    function quote(id){
      const level=state.levels[id];
      if(!level)return null;
      const next=level+1, milestone=next%10===0;
      const gold=openingCosts[next-2]??Math.round((1500+next*125+(milestone?1200:0))/50)*50;
      const fragments=milestone?next:0,hearts=milestone?1:0;
      const stageRequired=next>STAGE*10,maxed=level>=MAX_LEVEL;
      return {level,next,gold,fragments,hearts,maxed,stageRequired,available:!maxed&&!stageRequired&&state.gold>=gold&&state.fragments>=fragments&&state.hearts>=hearts};
    }
    function buy(id){
      const q=quote(id);
      if(!q?.available||run&&!run.finished)return false;
      const next=snapshot();next.levels[id]=q.next;next.gold-=q.gold;next.fragments-=q.fragments;next.hearts-=q.hearts;
      if(!write(next))return false;
      state=next;return true;
    }
    function start(practice){run={practice,finished:false,gold:0,fragments:0,hearts:0,allocated:0,seen:new WeakSet()}}
    function credit(gold=0,fragments=0,hearts=0){
      if(!run||run.practice||run.finished)return;
      gold=Math.min(amount(gold),GOLD_CAP-run.gold);
      state.gold=Math.min(1e9,state.gold+gold);state.fragments+=fragments;state.hearts+=hearts;
      run.gold+=gold;run.fragments+=fragments;run.hearts+=hearts;dirty=true;
      if(hearts||Date.now()-lastWrite>1000)flush();
    }
    function defeat(enemy){
      if(!run||run.practice||run.finished||!enemy?.expeditionWave||run.seen.has(enemy))return null;
      run.seen.add(enemy);
      if(enemy.isBoss){const fragments=1+Math.min(2,Math.floor(random()*3));credit(BOSS_GOLD,fragments,1);return {gold:0,fragments,hearts:1}}
      const gold=Math.min(enemy.expeditionGold||2,GOLD_CAP-BOSS_GOLD-run.allocated);
      run.allocated+=gold;
      if(!enemy.miniBoss)return {gold,fragments:0,hearts:0};
      const fragments=random()<.45?1:0;
      credit(gold,fragments);
      return {gold:0,fragments,hearts:0};
    }
    function summary(){return run&&{practice:run.practice,gold:run.gold,fragments:run.fragments,hearts:run.hearts}}
    function finish(){if(run)run.finished=true;return flush()}
    return {snapshot,quote,buy,start,credit,defeat,summary,finish,flush};
  }
  function createWaves(){
    let elapsed=0,index=0;
    const starts=[0], spawned=waves.map(()=>0), killed=waves.map(()=>0);
    const size=i=>waves[i].count||1;
    function defeat(enemy){
      const i=enemy.expeditionWave-1;
      if(i>=0&&i<=index&&killed[i]<spawned[i])killed[i]++;
    }
    function bossReady(){
      if(killed[index]*10<=size(index)*9)return false;
      let remaining=0;
      for(let i=0;i<=index;i++)remaining+=size(i)-killed[i];
      return remaining*10<size(index);
    }
    function advance(dt,spawn){
      elapsed+=dt;
      const finished=killed[index]===size(index);
      const timedOut=!waves[index].boss&&elapsed-starts[index]>=WAVE_SECONDS;
      if(index+1<waves.length&&(finished||timedOut)&&(!waves[index+1].boss||bossReady())){
        starts[++index]=elapsed;
      }
      let budget=4;
      for(let i=0;i<=index&&budget;i++){
        const wave=waves[i];
        const due=wave.boss?1:Math.min(size(i),1+Math.floor((elapsed-starts[i])*size(i)/43));
        while(spawned[i]<due&&budget){
          const type=wave.boss||wave.types[spawned[i]%wave.types.length];
          if(!spawn(type,i+1,wave.gold||2))break;
          spawned[i]++;budget--;
        }
      }
    }
    function status(enemies){
      const age=elapsed-starts[index];
      const waiting=index<9&&(waves[index].boss||age>=WAVE_SECONDS&&waves[index+1].boss&&!bossReady());
      const remaining=enemies.reduce((n,e)=>n+(e.expeditionWave&&e.alive!==false?1:0),0)
        +waves.slice(0,index+1).reduce((n,w,i)=>n+size(i)-spawned[i],0);
      return {wave:index+1,remaining,next:index===9?null:Math.max(0,Math.ceil(WAVE_SECONDS-age)),waiting,elapsed};
    }
    return {advance,status,defeat,get elapsed(){return elapsed}};
  }
  return {MAX_LEVEL,COIN,FRAGMENT,HEART,modifiers,create,createWaves};
});
