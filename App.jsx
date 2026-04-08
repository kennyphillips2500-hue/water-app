import { useState, useEffect, useRef, useCallback } from "react";

const PINT_ML = 568;
const F = "Helvetica Neue, Helvetica, Arial, sans-serif";

const BG      = "#ffffff";
const FG      = "#000000";
const MID     = "#555555";
const FAINT   = "#aaaaaa";
const FAINTER = "#dddddd";

const getDayKey   = () => new Date().toISOString().split("T")[0];
const GOAL_KEY    = "water-goal-pints";
const UNIT_KEY    = "water-display-unit";
const STORAGE_KEY = () => `water-ml-${getDayKey()}`;

const UNITS = ["pints", "litres", "ml"];

const getPastDays = (n) => {
  const days = [];
  for (let i = 0; i < n; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split("T")[0]);
  }
  return days;
};

const DAY_LABELS = ["S","M","T","W","T","F","S"];
const shortDate  = (key) => {
  const d = new Date(key + "T00:00:00");
  return { dow: DAY_LABELS[d.getDay()], day: d.getDate() };
};

function Confetti({ active }) {
  const canvasRef = useRef(null);
  const animRef   = useRef(null);
  const ptRef     = useRef([]);

  const spawn = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    c.width = window.innerWidth; c.height = window.innerHeight;
    ptRef.current = Array.from({ length: 130 }, () => ({
      x: Math.random() * c.width, y: -10 - Math.random() * 120,
      r: 3 + Math.random() * 5, d: 1.5 + Math.random() * 2.5,
      color: ["#000","#333","#666","#999","#ccc","#fff"][Math.floor(Math.random()*6)],
      tiltSpeed: 0.05 + Math.random() * 0.1, tiltAngle: 0,
      shape: Math.random() > 0.5 ? "rect" : "circle",
      w: 4 + Math.random() * 8, h: 6 + Math.random() * 10, opacity: 1,
    }));
  }, []);

  useEffect(() => {
    if (!active) {
      cancelAnimationFrame(animRef.current);
      const c = canvasRef.current;
      if (c) c.getContext("2d").clearRect(0, 0, c.width, c.height);
      return;
    }
    spawn();
    const c = canvasRef.current, ctx = c.getContext("2d");
    const draw = () => {
      ctx.clearRect(0, 0, c.width, c.height);
      let alive = false;
      ptRef.current.forEach((p) => {
        if (p.opacity <= 0) return;
        alive = true;
        p.y += p.d; p.tiltAngle += p.tiltSpeed;
        const tilt = Math.sin(p.tiltAngle) * 12;
        if (p.y > c.height * 0.7) p.opacity -= 0.012;
        ctx.save(); ctx.globalAlpha = Math.max(0, p.opacity); ctx.fillStyle = p.color;
        ctx.translate(p.x + tilt, p.y); ctx.rotate(p.tiltAngle);
        if (p.shape === "rect") ctx.fillRect(-p.w/2, -p.h/2, p.w, p.h);
        else { ctx.beginPath(); ctx.arc(0,0,p.r,0,Math.PI*2); ctx.fill(); }
        ctx.restore();
      });
      if (alive) animRef.current = requestAnimationFrame(draw);
      else ctx.clearRect(0, 0, c.width, c.height);
    };
    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [active, spawn]);

  return <canvas ref={canvasRef} style={{ position:"fixed", inset:0, zIndex:9998, pointerEvents:"none", width:"100%", height:"100%" }} />;
}

function HistoryPage({ goalMl }) {
  const days = getPastDays(30);
  const history = days.map((key) => {
    let ml = 0;
    try { const s = localStorage.getItem(`water-ml-${key}`); if (s) ml = Number(s); } catch {}
    return { key, ml, met: ml >= goalMl, ...shortDate(key) };
  });

  const metCount = history.filter(d => d.met).length;
  const streak   = (() => {
    let s = 0;
    for (const d of history) { if (d.met) s++; else break; }
    return s;
  })();

  return (
    <div style={{ minHeight:"100vh", background:BG, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"flex-start", padding:"3rem 1.5rem 4rem", boxSizing:"border-box", fontFamily:F, fontWeight:700 }}>
      <div style={{ fontSize:"0.65rem", letterSpacing:"0.3em", textTransform:"uppercase", color:MID, marginBottom:"2.5rem" }}>
        30-Day History
      </div>

      <div style={{ display:"flex", gap:"2.5rem", marginBottom:"2.5rem" }}>
        <div style={{ textAlign:"center" }}>
          <div style={{ fontSize:"2.8rem", color:FG, lineHeight:1, letterSpacing:"-0.03em" }}>{metCount}</div>
          <div style={{ fontSize:"0.5rem", letterSpacing:"0.2em", textTransform:"uppercase", color:FAINT, marginTop:"0.3rem" }}>days met</div>
        </div>
        <div style={{ width:1, background:FAINTER }} />
        <div style={{ textAlign:"center" }}>
          <div style={{ fontSize:"2.8rem", color:FG, lineHeight:1, letterSpacing:"-0.03em" }}>{streak}</div>
          <div style={{ fontSize:"0.5rem", letterSpacing:"0.2em", textTransform:"uppercase", color:FAINT, marginTop:"0.3rem" }}>day streak</div>
        </div>
        <div style={{ width:1, background:FAINTER }} />
        <div style={{ textAlign:"center" }}>
          <div style={{ fontSize:"2.8rem", color:FG, lineHeight:1, letterSpacing:"-0.03em" }}>{Math.round((metCount/30)*100)}%</div>
          <div style={{ fontSize:"0.5rem", letterSpacing:"0.2em", textTransform:"uppercase", color:FAINT, marginTop:"0.3rem" }}>hit rate</div>
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(5, 1fr)", gap:"0.75rem", width:"100%", maxWidth:320 }}>
        {history.map((d, i) => {
          const isToday = i === 0;
          return (
            <div key={d.key} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:"0.25rem" }}>
              <div style={{
                width:38, height:38, borderRadius:"50%",
                border: isToday ? `2px solid ${FG}` : `1.5px solid ${d.met ? FG : FAINTER}`,
                background: d.met ? FG : BG,
                display:"flex", alignItems:"center", justifyContent:"center",
                boxSizing:"border-box",
                opacity: isToday && !d.met ? 0.6 : 1,
              }}>
                {d.met && (
                  <svg width="14" height="11" viewBox="0 0 14 11" fill="none">
                    <polyline points="1,5.5 5,9.5 13,1" stroke={BG} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
              <div style={{ fontSize:"0.45rem", letterSpacing:"0.05em", textTransform:"uppercase", color: isToday ? FG : d.met ? MID : FAINTER, textAlign:"center", lineHeight:1.3 }}>
                {d.dow}<br/>{d.day}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function App() {
  const [page,        setPage]        = useState(0);
  const [totalMl,     setTotalMl]     = useState(() => { try { const s = localStorage.getItem(STORAGE_KEY()); return s !== null ? Number(s) : 0; } catch { return 0; } });
  const [goalPints,   setGoalPints]   = useState(() => { try { const s = localStorage.getItem(GOAL_KEY); return s !== null ? Number(s) : 8; } catch { return 8; } });
  const [displayUnit, setDisplayUnit] = useState(() => { try { return localStorage.getItem(UNIT_KEY) || "pints"; } catch { return "pints"; } });
  const [customInput, setCustomInput] = useState("");
  const [showCustom,  setShowCustom]  = useState(false);
  const [showSettings,setShowSettings]= useState(false);
  const [goalInput,   setGoalInput]   = useState("");
  const [ripples,     setRipples]     = useState([]);
  const [celebrating, setCelebrating] = useState(false);
  const [showBanner,  setShowBanner]  = useState(false);

  const goalMl      = goalPints * PINT_ML;
  const prevDoneRef = useRef(totalMl >= goalMl);
  const inputRef    = useRef(null);
  const goalRef     = useRef(null);
  const touchStartX = useRef(null);

  const onTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; };
  const onTouchEnd   = (e) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 50) setPage(dx < 0 ? 1 : 0);
    touchStartX.current = null;
  };

  useEffect(() => { try { localStorage.setItem(STORAGE_KEY(), totalMl); } catch {} }, [totalMl]);
  useEffect(() => { try { localStorage.setItem(GOAL_KEY, goalPints); } catch {} }, [goalPints]);
  useEffect(() => { try { localStorage.setItem(UNIT_KEY, displayUnit); } catch {} }, [displayUnit]);
  useEffect(() => { if (showCustom)   setTimeout(() => inputRef.current?.focus(), 50); }, [showCustom]);
  useEffect(() => { if (showSettings) setTimeout(() => goalRef.current?.focus(),  50); }, [showSettings]);

  useEffect(() => {
    const isDone = totalMl >= goalMl;
    if (isDone && !prevDoneRef.current) {
      setCelebrating(true); setShowBanner(true);
      setTimeout(() => setCelebrating(false), 4500);
      setTimeout(() => setShowBanner(false),  3800);
    }
    prevDoneRef.current = isDone;
  }, [totalMl, goalMl]);

  const triggerRipple = () => {
    const id = Date.now();
    setRipples((r) => [...r, id]);
    setTimeout(() => setRipples((r) => r.filter((x) => x !== id)), 700);
  };

  const addPint    = () => { setTotalMl((m) => Math.min(m + PINT_ML, PINT_ML * 30)); triggerRipple(); };
  const removePint = () => setTotalMl((m) => Math.max(0, m - PINT_ML));
  const reset      = () => { setTotalMl(0); prevDoneRef.current = false; };

  const addCustom = () => {
    const val = parseInt(customInput, 10);
    if (!isNaN(val) && val > 0 && val <= 9999) {
      setTotalMl((m) => Math.min(m + val, PINT_ML * 30));
      triggerRipple(); setCustomInput(""); setShowCustom(false);
    }
  };

  const applyGoal = () => {
    const val = parseFloat(goalInput);
    if (!isNaN(val) && val > 0 && val <= 20) {
      const newGoalMl = Math.round(val * 1000);
      setGoalPints(newGoalMl / PINT_ML);
      prevDoneRef.current = totalMl >= newGoalMl;
    }
    setGoalInput(""); setShowSettings(false);
  };

  const cycleUnit = () => setDisplayUnit(UNITS[(UNITS.indexOf(displayUnit) + 1) % UNITS.length]);

  const fmt = (ml) => {
    if (displayUnit === "litres") return `${(ml/1000).toFixed(2).replace(/\.?0+$/,"")}L`;
    if (displayUnit === "ml")     return `${Math.round(ml)}ml`;
    const p = ml / PINT_ML;
    return Number.isInteger(p) ? `${p}` : p.toFixed(1);
  };
  const fmtGoal = () => {
    if (displayUnit === "litres") return `${(goalMl/1000).toFixed(2).replace(/\.?0+$/,"")}L`;
    if (displayUnit === "ml")     return `${goalMl}ml`;
    return `${goalPints % 1 === 0 ? goalPints : goalPints.toFixed(1)} pints`;
  };
  const unitLabel = () => displayUnit === "pints" ? "pints" : displayUnit === "litres" ? "litres" : "ml";

  const fillPct  = Math.min((totalMl / goalMl) * 100, 100);
  const over     = totalMl > goalMl;
  const done     = totalMl >= goalMl;
  const tickCount= Math.min(Math.round(goalPints), 10);

  return (
    <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} style={{ position:"relative", width:"100%", overflow:"hidden" }}>
      <Confetti active={celebrating} />

      {showBanner && (
        <div style={{ position:"fixed", inset:0, display:"flex", alignItems:"center", justifyContent:"center", zIndex:9999, pointerEvents:"none" }}>
          <div style={{ background:FG, color:BG, padding:"2rem 3rem", borderRadius:"4px", textAlign:"center", animation:"bannerPop 0.4s cubic-bezier(0.34,1.56,0.64,1) both", boxShadow:"0 8px 40px rgba(0,0,0,0.35)" }}>
            <div style={{ fontSize:"3rem", lineHeight:1, marginBottom:"0.6rem" }}>💧</div>
            <div style={{ fontSize:"1.8rem", fontFamily:F, fontWeight:700, letterSpacing:"-0.02em" }}>Goal smashed!</div>
            <div style={{ fontSize:"0.65rem", fontFamily:F, fontWeight:700, letterSpacing:"0.25em", textTransform:"uppercase", marginTop:"0.5rem", opacity:0.6 }}>
              {Math.round(goalMl/1000*100)/100}L · done
            </div>
          </div>
        </div>
      )}

      <style>{`
        * { box-sizing: border-box; }
        @keyframes ripple    { 0%{transform:translateX(-50%) scale(0.8);opacity:.5} 100%{transform:translateX(-50%) scale(2.4);opacity:0} }
        @keyframes wave      { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
        @keyframes fadeUp    { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse     { 0%,100%{box-shadow:0 0 0 0 rgba(0,0,0,.3)} 50%{box-shadow:0 0 0 12px rgba(0,0,0,0)} }
        @keyframes slideDown { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:translateY(0)} }
        @keyframes bannerPop { from{opacity:0;transform:scale(.75)} to{opacity:1;transform:scale(1)} }
        .btn-press:active { transform: scale(0.93); }
        .no-spin::-webkit-inner-spin-button,.no-spin::-webkit-outer-spin-button{-webkit-appearance:none;}
        .no-spin{-moz-appearance:textfield;} .no-spin:focus{outline:none;} .no-spin::placeholder{color:#aaa;}
        .unit-btn:hover{background:#f0f0f0;}
      `}</style>

      <div style={{
        display:"flex", width:"200%",
        transform: page === 0 ? "translateX(0)" : "translateX(-50%)",
        transition: "transform 0.35s cubic-bezier(0.4,0,0.2,1)",
      }}>

        {/* PAGE 0: Tracker */}
        <div style={{ width:"50%", minHeight:"100vh", background:BG, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", fontFamily:F, fontWeight:700, padding:"2rem 1rem 4rem", boxSizing:"border-box" }}>

          <div style={{ display:"flex", alignItems:"center", gap:"0.6rem", marginBottom:"1.8rem", animation:"fadeUp 0.5s ease both" }}>
            <div style={{ fontSize:"0.65rem", letterSpacing:"0.3em", textTransform:"uppercase", color:MID }}>Daily Water Intake</div>
            <button className="btn-press" onClick={() => { setShowSettings((v) => !v); setGoalInput(""); }}
              style={{ background:"transparent", border:"none", cursor:"pointer", padding:0, lineHeight:1, display:"flex", alignItems:"center" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={FG} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: showSettings ? 1 : 0.35 }}>
                <line x1="3" y1="6"  x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
          </div>

          {showSettings && (
            <div style={{ marginBottom:"1.5rem", padding:"1rem 1.4rem", border:`1.5px solid ${FAINTER}`, borderRadius:"8px", width:"100%", maxWidth:320, animation:"slideDown 0.2s ease both" }}>
              <div style={{ fontSize:"0.55rem", fontFamily:F, fontWeight:700, letterSpacing:"0.2em", textTransform:"uppercase", color:FAINT, marginBottom:"0.6rem" }}>Daily Goal</div>
              <div style={{ display:"flex", alignItems:"center", gap:"0.5rem", marginBottom:"1rem" }}>
                <div style={{ display:"flex", alignItems:"center", border:`2px solid ${FG}`, borderRadius:"20px", overflow:"hidden", flex:1 }}>
                  <input ref={goalRef} className="no-spin" type="number"
                    placeholder={`${(goalMl/1000).toFixed(2).replace(/\.?0+$/,"")}`}
                    value={goalInput} onChange={(e) => setGoalInput(e.target.value)}
                    onKeyDown={(e) => { if(e.key==="Enter") applyGoal(); if(e.key==="Escape"){ setShowSettings(false); setGoalInput(""); } }}
                    style={{ flex:1, padding:"0.4rem 0.7rem", background:"transparent", border:"none", color:FG, fontSize:"0.85rem", fontFamily:F, fontWeight:700 }} />
                  <span style={{ paddingRight:"0.7rem", fontSize:"0.6rem", fontFamily:F, fontWeight:700, color:FAINT }}>litres</span>
                </div>
                <button className="btn-press" onClick={applyGoal}
                  style={{ padding:"0.42rem 0.85rem", borderRadius:"20px", border:"none", background:FG, color:BG, fontSize:"0.6rem", fontFamily:F, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", cursor:"pointer", whiteSpace:"nowrap" }}>Set</button>
              </div>
              <div style={{ fontSize:"0.55rem", fontFamily:F, fontWeight:700, letterSpacing:"0.2em", textTransform:"uppercase", color:FAINT, marginBottom:"0.5rem" }}>Display Units</div>
              <div style={{ display:"flex", gap:"0.4rem" }}>
                {UNITS.map((u) => (
                  <button key={u} className="unit-btn btn-press" onClick={() => setDisplayUnit(u)}
                    style={{ flex:1, padding:"0.4rem 0", borderRadius:"20px", border:`1.5px solid ${displayUnit===u?FG:FAINTER}`, background:displayUnit===u?FG:BG, color:displayUnit===u?BG:MID, fontSize:"0.6rem", fontFamily:F, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", cursor:"pointer", transition:"all 0.15s" }}>
                    {u}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Glass */}
          <div style={{ position:"relative", width:140, height:200, zIndex:1, animation:"fadeUp 0.5s ease 0.08s both", opacity:0, flexShrink:0 }}>
            <div style={{ position:"absolute", inset:0, border:`2px solid ${done?FG:FAINTER}`, borderRadius:"3px 3px 14px 14px", background:BG, overflow:"hidden", transition:"border-color 0.4s ease" }}>
              <div style={{ position:"absolute", bottom:0, left:0, right:0, height:`${fillPct}%`, transition:"height 0.5s cubic-bezier(0.34,1.56,0.64,1)", overflow:"hidden" }}>
                <div style={{ position:"absolute", top:-8, left:0, width:"200%", animation:"wave 2s linear infinite" }}>
                  <svg viewBox="0 0 400 20" style={{ display:"block", width:"100%" }}>
                    <path d="M0,10 C50,0 100,20 150,10 C200,0 250,20 300,10 C350,0 400,20 400,10 L400,20 L0,20 Z" fill="#222" />
                  </svg>
                </div>
                <div style={{ position:"absolute", top:8, left:0, right:0, bottom:0, background:"#222" }} />
              </div>
              {ripples.map((id) => (
                <div key={id} style={{ position:"absolute", bottom:`${fillPct}%`, left:"50%", width:36, height:36, marginLeft:-18, borderRadius:"50%", border:"2px solid #000", animation:"ripple 0.7s ease-out forwards", pointerEvents:"none" }} />
              ))}
              {[...Array(tickCount)].map((_, i) => (
                <div key={i} style={{ position:"absolute", right:8, bottom:`${((i+1)/tickCount)*100}%`, width:8, height:1, background: fillPct>=((i+1)/tickCount)*100?"rgba(255,255,255,0.5)":FAINTER }} />
              ))}
            </div>
          </div>

          {/* Stats */}
          <div style={{ marginTop:"1.5rem", textAlign:"center", zIndex:1, animation:"fadeUp 0.5s ease 0.15s both", opacity:0 }}>
            <div onClick={cycleUnit} style={{ cursor:"pointer" }}>
              <div style={{ fontSize:"4.5rem", fontFamily:F, fontWeight:700, color:FG, lineHeight:1, letterSpacing:"-0.03em", fontVariantNumeric:"tabular-nums" }}>{fmt(totalMl)}</div>
              <div style={{ fontSize:"0.6rem", fontFamily:F, fontWeight:700, letterSpacing:"0.2em", textTransform:"uppercase", color:FAINT, marginTop:"0.15rem" }}>{unitLabel()}</div>
            </div>
            <div style={{ fontSize:"0.65rem", fontFamily:F, fontWeight:700, letterSpacing:"0.2em", textTransform:"uppercase", color:done?FG:MID, marginTop:"0.5rem" }}>
              {done ? (over ? `${Math.round(totalMl-goalMl)}ml over goal` : "Goal reached ✓") : `of ${fmtGoal()}`}
            </div>
            {displayUnit !== "ml" && (
              <div style={{ marginTop:"0.7rem", display:"flex", alignItems:"baseline", justifyContent:"center", gap:"0.3rem" }}>
                <span style={{ fontSize:"1.1rem", fontFamily:F, fontWeight:700, color:FG, fontVariantNumeric:"tabular-nums" }}>{Math.round(totalMl)}ml</span>
                <span style={{ fontSize:"0.6rem", fontFamily:F, fontWeight:700, color:FAINT, letterSpacing:"0.15em", textTransform:"uppercase" }}>/ {goalMl.toLocaleString()}ml</span>
              </div>
            )}
            <div style={{ marginTop:"0.2rem", fontSize:"0.5rem", fontFamily:F, fontWeight:700, color:FAINTER, letterSpacing:"0.15em", textTransform:"uppercase" }}>
              568ml · British imperial pint
            </div>
          </div>

          {/* Buttons */}
          <div style={{ display:"flex", gap:"1rem", marginTop:"1.6rem", alignItems:"center", zIndex:1, animation:"fadeUp 0.5s ease 0.22s both", opacity:0 }}>
            <button className="btn-press" onClick={removePint} disabled={totalMl===0}
              style={{ width:50, height:50, borderRadius:"50%", border:`2px solid ${totalMl===0?FAINTER:FG}`, background:BG, color:totalMl===0?FAINTER:FG, fontSize:"1.4rem", fontFamily:F, fontWeight:700, cursor:totalMl===0?"not-allowed":"pointer", transition:"all 0.2s", display:"flex", alignItems:"center", justifyContent:"center" }}>−</button>
            <button className="btn-press" onClick={addPint}
              style={{ width:68, height:68, borderRadius:"50%", border:"none", background:FG, color:BG, fontSize:"1.8rem", fontFamily:F, fontWeight:700, cursor:"pointer", transition:"all 0.2s", animation:done?"pulse 1.8s ease infinite":"none", display:"flex", alignItems:"center", justifyContent:"center" }}>+</button>
            <button className="btn-press" onClick={reset}
              style={{ width:50, height:50, borderRadius:"50%", border:`2px solid ${FAINTER}`, background:BG, color:FAINT, fontSize:"0.55rem", fontFamily:F, fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase", cursor:"pointer", transition:"all 0.2s" }}>reset</button>
          </div>

          {/* Custom ml */}
          <div style={{ marginTop:"0.9rem", zIndex:1, animation:"fadeUp 0.5s ease 0.28s both", opacity:0 }}>
            {!showCustom ? (
              <button className="btn-press" onClick={() => setShowCustom(true)}
                style={{ padding:"0.4rem 1.1rem", borderRadius:"20px", border:`1.5px solid ${FAINTER}`, background:BG, color:MID, fontSize:"0.6rem", fontFamily:F, fontWeight:700, letterSpacing:"0.18em", textTransform:"uppercase", cursor:"pointer" }}>
                + Custom ml
              </button>
            ) : (
              <div style={{ display:"flex", alignItems:"center", gap:"0.5rem", animation:"slideDown 0.2s ease both" }}>
                <div style={{ display:"flex", alignItems:"center", border:`2px solid ${FG}`, borderRadius:"24px", overflow:"hidden", background:BG }}>
                  <input ref={inputRef} className="no-spin" type="number" placeholder="200"
                    value={customInput} onChange={(e) => setCustomInput(e.target.value)}
                    onKeyDown={(e) => { if(e.key==="Enter") addCustom(); if(e.key==="Escape"){ setShowCustom(false); setCustomInput(""); } }}
                    style={{ width:90, padding:"0.45rem 0.7rem", background:"transparent", border:"none", color:FG, fontSize:"0.85rem", fontFamily:F, fontWeight:700 }} />
                  <span style={{ paddingRight:"0.7rem", fontSize:"0.6rem", fontFamily:F, fontWeight:700, color:FAINT }}>ml</span>
                </div>
                <button className="btn-press" onClick={addCustom}
                  style={{ padding:"0.45rem 0.9rem", borderRadius:"20px", border:"none", background:FG, color:BG, fontSize:"0.6rem", fontFamily:F, fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", cursor:"pointer" }}>Add</button>
                <button className="btn-press" onClick={() => { setShowCustom(false); setCustomInput(""); }}
                  style={{ width:30, height:30, borderRadius:"50%", border:`1.5px solid ${FAINTER}`, background:BG, color:FAINT, fontSize:"1rem", fontFamily:F, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>×</button>
              </div>
            )}
          </div>

          {/* Progress bar */}
          <div style={{ marginTop:"1.5rem", width:180, height:2, background:FAINTER, borderRadius:2, overflow:"hidden", zIndex:1, animation:"fadeUp 0.5s ease 0.33s both", opacity:0 }}>
            <div style={{ height:"100%", width:`${Math.min(fillPct,100)}%`, background:FG, borderRadius:2, transition:"width 0.5s ease" }} />
          </div>
          <div style={{ marginTop:"0.5rem", color:FAINT, fontSize:"0.55rem", fontFamily:F, fontWeight:700, letterSpacing:"0.2em", textTransform:"uppercase" }}>
            {Math.round(fillPct)}% of daily goal
          </div>

          <div onClick={() => setPage(1)} style={{ marginTop:"1.5rem", display:"flex", alignItems:"center", gap:"0.4rem", cursor:"pointer", opacity:0.3 }}>
            <div style={{ fontSize:"0.5rem", fontFamily:F, fontWeight:700, letterSpacing:"0.2em", textTransform:"uppercase", color:FG }}>History</div>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={FG} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9,18 15,12 9,6" />
            </svg>
          </div>
        </div>

        {/* PAGE 1: History */}
        <div style={{ width:"50%" }}>
          <HistoryPage goalMl={goalMl} />
        </div>
      </div>

      {/* Page dots */}
      <div style={{ position:"fixed", bottom:"1.2rem", left:"50%", transform:"translateX(-50%)", display:"flex", gap:"0.4rem", zIndex:100 }}>
        {[0,1].map((i) => (
          <div key={i} onClick={() => setPage(i)} style={{ width:page===i?16:6, height:6, borderRadius:3, background:FG, opacity:page===i?1:0.2, transition:"all 0.3s ease", cursor:"pointer" }} />
        ))}
      </div>
    </div>
  );
}
