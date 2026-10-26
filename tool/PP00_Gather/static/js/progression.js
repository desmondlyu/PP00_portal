// Shared deterministic Season 2 rules; animation clocks are not authoritative.
(function(root){
  const thresholds=Object.freeze([0,100,250,450,700,1020,1420,1920,2540,3300,4200,5200,6300,7500,8800,10500,12500,14800,17300,20000]);
  const level=exp=>Math.max(1,thresholds.filter(t=>Number(exp)>=t).length);
  const change=(exp,delta)=>Math.max(0,Math.min(Number.MAX_SAFE_INTEGER,Math.trunc(Number(exp)||0)+Math.trunc(Number(delta)||0)));
  const title=lv=>`Lv.${lv} ${lv<=5?'菜逼八工程師':lv<=10?'高級打雜師':lv<=15?'資深地下處長':lv<=19?'專業老司機':'PP00之神'}`;
  const restMs=lv=>Math.max(120000,300000-(lv-1)*6000);
  const healMs=lv=>Math.max(2000,5000-(lv-1)*150);
  function speed(base,lv,e={},now=Date.now()){
    if(e.injuredUntil>now||e.lockedUntil>now||e.stunnedUntil>now||e.ghostUntil>now)return 0;
    return Math.min(8,base*(1+(lv-1)*.02+(e.loungeUntil>now?.15:0)+(e.coffeeUntil>now?.2:0)+(e.shrineSpeedUntil>now?.35:0))*(e.lightUntil>now?.7:1));
  }
  const clock=()=>{let offset=0;return {sync:(server,local=Date.now())=>{offset=server-local;},now:(local=Date.now())=>local+offset};};
  const pickupRadius=lv=>80+Math.max(0,Math.min(19,lv-1));
  root.OfficeProgression={pickupRadius,clock,thresholds,level,change,title,restMs,healMs,speed,injury:r=>r<.05?'critical':r<.20?'light':null};
})(globalThis);
