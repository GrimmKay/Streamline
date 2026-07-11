import { useState, useEffect, useMemo } from "react";

// ── Utils ──────────────────────────────────────────────────────────────────
const fmt    = (v) => new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(isNaN(+v)?0:+v);
const parse  = (v) => { const n=parseFloat(String(v).replace(/[^0-9.]/g,"")); return isNaN(n)?0:n; };
const today  = new Date().toISOString().split("T")[0];

// ── Constants ──────────────────────────────────────────────────────────────
// Semantic status colors — used for meaning (success/danger/info), not category identity.
// Tied to the same fixed scheme so nothing "orphans" if the scheme ever changes again.
const COLOR_SUCCESS = "#3DB8A0"; // matches Savings (teal) — positive/good states
const COLOR_DANGER  = "#E5635A"; // matches Bills (coral red) — negative/error states
const COLOR_INFO    = "#4DABF7"; // matches Business (cornflower) — neutral/informational highlight
const DEFAULT_TYPE_COLORS = { bills:COLOR_DANGER, spending:"#F0A500", savings:COLOR_SUCCESS }; // fallback only — matches the fixed scheme used by every theme
// Single source of truth for the fixed accent scheme — every theme references this same
// object rather than duplicating the 5 hex values 8 times over.
const FIXED_ACCENT_PALETTE = { bills:COLOR_DANGER, spending:"#F0A500", savings:COLOR_SUCCESS, personal:"#FF6B6B", business:COLOR_INFO };
const SWATCHES    = ["#E5635A","#E0874A","#F0A500","#C8B84A","#52A67A","#3DB8A0","#4A9EE0","#6B8DE3","#9B72CF","#CF72A8","#E07090","#7A8A9A"];
const SWATCH_NAMES = {
  "#E5635A":"Coral Red", "#E0874A":"Burnt Orange", "#F0A500":"Amber", "#C8B84A":"Mustard",
  "#52A67A":"Sage Green", "#3DB8A0":"Teal", "#4A9EE0":"Sky Blue", "#6B8DE3":"Periwinkle",
  "#9B72CF":"Violet", "#CF72A8":"Magenta", "#E07090":"Rose", "#7A8A9A":"Slate Gray",
};
// Separate palette for Profile Accent Colors — deliberately distinct from the category-type
// swatches above, so the two pickers in Settings never offer the exact same set of options.
const PROFILE_SWATCHES = ["#FF6B6B","#FFA94D","#FFD43B","#69DB7C","#20C997","#22B8CF","#4DABF7","#748FFC","#9775FA","#DA77F2","#F783AC","#ADB5BD"];
const PROFILE_SWATCH_NAMES = {
  "#FF6B6B":"Watermelon", "#FFA94D":"Tangerine", "#FFD43B":"Sunflower", "#69DB7C":"Mint",
  "#20C997":"Jade", "#22B8CF":"Turquoise", "#4DABF7":"Cornflower", "#748FFC":"Indigo",
  "#9775FA":"Grape", "#DA77F2":"Orchid", "#F783AC":"Bubblegum", "#ADB5BD":"Stone",
};
const DEBT_COLORS = ["#E5635A","#E0874A","#F0A500","#6B8DE3","#9B72CF","#CF72A8","#3DB8A0","#52A67A"];
const FREQ_LABEL  = { weekly:"Weekly", biweekly:"Bi-Weekly", semimonthly:"Twice / Month", monthly:"Monthly" };
// Simplified accounting model: every month = 4 weeks. So weekly = 4x/month, biweekly = 2x/month.
// This keeps monthly-total math simple and predictable, at the cost of being ~7-8% below the
// "real" 52/26-per-year figure (which averages in the ~2 extra weekly/biweekly pay dates most
// years actually have). FREQ_DAYS below stays tied to REAL calendar days — it's only used for
// actually placing paydays/due-dates on the calendar grid, which must reflect true dates.
const FREQ_PER_YEAR = { weekly:48, biweekly:24, semimonthly:24, monthly:12 };
const FREQ_DAYS   = { weekly:7, biweekly:14, semimonthly:15.2, monthly:30.44 };
const CAT_FREQ_LABEL = { weekly:"Weekly", biweekly:"Bi-Weekly", monthly:"Monthly", quarterly:"Quarterly", biannually:"Bi-Annually", yearly:"Yearly" };
const CAT_FREQ_MULT  = { weekly:4, biweekly:2, monthly:1, quarterly:1/3, biannually:1/6, yearly:1/12 };
const PROFILE_META = { personal:{label:"Personal",icon:"🏠"}, business:{label:"Business",icon:"💼"} };

const THEMES = {
  dark:     { name:"Dark",      bg:"#12141F", card:"#1A1D2E", border:"#252840", surface:"#252836", border2:"#2E3048", muted:"#7A788E", text:"#E2DED8", sub:"#C0BEBA",
              accentPalette:FIXED_ACCENT_PALETTE },
  midnight: { name:"Midnight",  bg:"#07091A", card:"#0E1122", border:"#181C35", surface:"#141728", border2:"#20243C", muted:"#6870A0", text:"#DDD8FF", sub:"#A8A4D8",
              accentPalette:FIXED_ACCENT_PALETTE },
  carbon:   { name:"Carbon",    bg:"#141414", card:"#1E1E1E", border:"#2A2A2A", surface:"#242424", border2:"#333333", muted:"#787878", text:"#E8E8E8", sub:"#C0C0C0",
              accentPalette:FIXED_ACCENT_PALETTE },
  forest:   { name:"Forest",    bg:"#0C1810", card:"#122018", border:"#1C3022", surface:"#172818", border2:"#263C2C", muted:"#5A8060", text:"#D0ECD0", sub:"#A0C8A0",
              accentPalette:FIXED_ACCENT_PALETTE },
  paper:    { name:"Paper",     bg:"#F4F2ED", card:"#FFFFFF", border:"#E2DFD6", surface:"#F8F6F1", border2:"#D8D4C8", muted:"#8A8578", text:"#2A2722", sub:"#4A463E",
              accentPalette:FIXED_ACCENT_PALETTE },
  sage:     { name:"Sage",      bg:"#E8F0E8", card:"#F4FAF4", border:"#C4D8C4", surface:"#EDF5ED", border2:"#B0CCB0", muted:"#6A8A6A", text:"#1A2E1A", sub:"#3A5A3A",
              accentPalette:FIXED_ACCENT_PALETTE },
  mist:     { name:"Mist",      bg:"#E4E9EE", card:"#F5F8FA", border:"#C8D2DC", surface:"#EBF0F4", border2:"#B6C4D0", muted:"#6E7E8E", text:"#222B33", sub:"#3E4B57",
              accentPalette:FIXED_ACCENT_PALETTE },
  bloom:    { name:"Bloom",     bg:"#EFE2E6", card:"#FAF2F4", border:"#DCC2CA", surface:"#F4E6EA", border2:"#CCA8B4", muted:"#8C6E78", text:"#332026", sub:"#4F3940",
              accentPalette:FIXED_ACCENT_PALETTE },
};

const DEFAULT_CATS = {
  personal: [
    { id:"rent",      name:"Rent / Mortgage", type:"bills",    color:COLOR_DANGER, amount:"", target:"30", catFreq:"monthly",  dueType:"day",  dueDay:"1",  dueFreq:"monthly", dueStart:today },
    { id:"utilities", name:"Utilities",       type:"bills",    color:"#E0874A", amount:"", target:"",   catFreq:"monthly",  dueType:"day",  dueDay:"15", dueFreq:"monthly", dueStart:today },
    { id:"groceries", name:"Groceries",       type:"spending", color:"#6B8DE3", amount:"", target:"10", catFreq:"weekly",   dueType:"",     dueDay:"",   dueFreq:"weekly",  dueStart:today },
    { id:"transport", name:"Transportation",  type:"spending", color:"#9B72CF", amount:"", target:"",   catFreq:"monthly",  dueType:"",     dueDay:"",   dueFreq:"monthly", dueStart:today },
    { id:"savings",   name:"Savings",         type:"savings",  color:"#52A67A", amount:"", target:"20", catFreq:"monthly",  dueType:"",     dueDay:"",   dueFreq:"monthly", dueStart:today },
    { id:"emergency", name:"Emergency Fund",  type:"savings",  color:"#3DB8A0", amount:"", target:"",   catFreq:"monthly",  dueType:"",     dueDay:"",   dueFreq:"monthly", dueStart:today },
  ],
  business: [
    { id:"brent",      name:"Office / Rent",    type:"bills",    color:COLOR_DANGER, amount:"", target:"",  catFreq:"monthly",  dueType:"day",  dueDay:"1",  dueFreq:"monthly", dueStart:today },
    { id:"bsoftware",  name:"Software & Tools",  type:"bills",    color:"#E0874A", amount:"", target:"",  catFreq:"monthly",  dueType:"",     dueDay:"",   dueFreq:"monthly", dueStart:today },
    { id:"bpayroll",   name:"Payroll",           type:"spending", color:"#6B8DE3", amount:"", target:"",  catFreq:"biweekly", dueType:"",   dueDay:"",   dueFreq:"biweekly",dueStart:today },
    { id:"bmarketing", name:"Marketing",         type:"spending", color:"#9B72CF", amount:"", target:"",  catFreq:"monthly",  dueType:"",     dueDay:"",   dueFreq:"monthly", dueStart:today },
    { id:"bretained",  name:"Retained Earnings", type:"savings",  color:"#52A67A", amount:"", target:"20",catFreq:"monthly",  dueType:"",     dueDay:"",   dueFreq:"monthly", dueStart:today },
    { id:"btax",       name:"Tax Reserve",       type:"savings",  color:"#F0A500", amount:"", target:"25",catFreq:"quarterly",dueType:"",     dueDay:"",   dueFreq:"monthly", dueStart:today },
  ],
};

// Generates a unique ID that can never collide across sessions/reloads — unlike a simple
// incrementing counter (which resets to its starting value on every page load, even though
// existing categories/debts persist in localStorage and keep their old IDs).
let idCounter = 0;
const genId = (prefix) => `${prefix}${Date.now().toString(36)}${(++idCounter).toString(36)}${Math.random().toString(36).slice(2,6)}`;

// ── Donut Chart ────────────────────────────────────────────────────────────
function DonutChart({ segments, centerLabel, centerSub, size=180, T }) {
  const bgColor   = T ? T.bg     : "#12141F";
  const textColor = T ? T.text   : "#E2DED8";
  const mutedColor= T ? T.muted  : "#7A788E";
  const borderColor = T ? T.border2 : "#2E3048";
  const total = segments.reduce((s,g)=>s+g.value,0);
  if (total <= 0) return (
    <div style={{ width:size, height:size, borderRadius:"50%", border:`2px dashed ${borderColor}`, display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", flexShrink:0 }}>
      <span style={{ fontSize:13, color:mutedColor, textAlign:"center", padding:"0 20px" }}>Add amounts<br/>to see chart</span>
    </div>
  );
  const cx=size/2, cy=size/2, R=size*0.42, r=size*0.24;
  const visibleSegs = segments.filter(s=>s.value>0);

  // Special case: a single segment would produce a degenerate 360° arc path.
  // Draw it as two semicircle arcs instead so it renders as a full ring.
  if (visibleSegs.length === 1) {
    const seg = visibleSegs[0];
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ overflow:"visible", flexShrink:0 }}>
        <path d={`M${cx-R} ${cy} A${R} ${R} 0 1 1 ${cx+R} ${cy} A${R} ${R} 0 1 1 ${cx-R} ${cy} Z M${cx-r} ${cy} A${r} ${r} 0 1 0 ${cx+r} ${cy} A${r} ${r} 0 1 0 ${cx-r} ${cy} Z`} fill={seg.color} fillRule="evenodd" stroke={bgColor} strokeWidth="1.5" />
        <text x={cx} y={cy-6} textAnchor="middle" fill={textColor} fontSize="15" fontWeight="600" fontFamily="'DM Mono',monospace">{centerLabel}</text>
        <text x={cx} y={cy+12} textAnchor="middle" fill={mutedColor} fontSize="10" fontFamily="'DM Mono',monospace">{centerSub}</text>
      </svg>
    );
  }

  let angle = -Math.PI/2;
  const paths = visibleSegs.map(seg => {
    const a = (seg.value/total)*Math.PI*2;
    const x1=cx+R*Math.cos(angle), y1=cy+R*Math.sin(angle);
    const x2=cx+R*Math.cos(angle+a), y2=cy+R*Math.sin(angle+a);
    const ix1=cx+r*Math.cos(angle+a), iy1=cy+r*Math.sin(angle+a);
    const ix2=cx+r*Math.cos(angle), iy2=cy+r*Math.sin(angle);
    const large=a>Math.PI?1:0;
    const d=`M${x1} ${y1} A${R} ${R} 0 ${large} 1 ${x2} ${y2} L${ix1} ${iy1} A${r} ${r} 0 ${large} 0 ${ix2} ${iy2}Z`;
    angle += a;
    return { d, color:seg.color, label:seg.label, value:seg.value };
  });
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ overflow:"visible", flexShrink:0 }}>
      {paths.map((p,i)=><path key={i} d={p.d} fill={p.color} stroke={bgColor} strokeWidth="1.5" />)}
      <text x={cx} y={cy-6} textAnchor="middle" fill={textColor} fontSize="15" fontWeight="600" fontFamily="'DM Mono',monospace">{centerLabel}</text>
      <text x={cx} y={cy+12} textAnchor="middle" fill={mutedColor} fontSize="10" fontFamily="'DM Mono',monospace">{centerSub}</text>
    </svg>
  );
}

// ── Toggle ─────────────────────────────────────────────────────────────────
function Toggle({ on, onChange, label, color=COLOR_SUCCESS, T }) {
  const bg = T ? T.border2 : "#2E3048";
  return (
    <button onClick={()=>onChange(!on)} style={{ display:"flex", alignItems:"center", gap:8, background:"none", border:"none", cursor:"pointer", padding:0, fontFamily:"inherit" }}>
      <div style={{ width:40, height:22, borderRadius:99, background:on?color:bg, transition:"background 0.2s", position:"relative", flexShrink:0 }}>
        <div style={{ position:"absolute", top:3, left:on?20:3, width:16, height:16, borderRadius:99, background:"#fff", transition:"left 0.2s", boxShadow:"0 1px 4px rgba(0,0,0,0.35)" }} />
      </div>
      {label && <span style={{ fontSize:15, color:on?"#E2DED8":"#7A788E" }}>{label}</span>}
    </button>
  );
}

// ── Debt simulation ────────────────────────────────────────────────────────
function simulatePayoff(debts, strategy) {
  if (!debts.length) return [];
  const order=[...debts].sort((a,b)=>strategy==="snowball"?parse(a.balance)-parse(b.balance):parse(b.rate)-parse(a.rate));
  let state=order.map(d=>{
    const balance = parse(d.balance);
    const rate    = parse(d.rate)/100/12;
    const rawMin  = parse(d.minPayment);
    const minPmt  = rawMin > 0 ? rawMin : Math.max(1, balance * 0.01 + balance * rate);
    const extra   = parse(d.extraPayment||0);
    return { id:d.id, balance, monthlyRate:rate, min:minPmt, extra, paidOffMonth: balance<=0 ? 0 : null, totalInterest:0, totalExtra:0 };
  });
  let month=0;
  while (state.some(d=>d.balance>0.01) && month<600) {
    month++;
    // Step 1: apply interest + min payment for every debt
    let snowballFreed = 0;
    for (const d of state) {
      if (d.balance<=0) continue;
      const interest=d.balance*d.monthlyRate; d.totalInterest+=interest; d.balance+=interest;
      const pay=Math.min(d.min,d.balance); d.balance=Math.max(0,d.balance-pay);
      if (d.balance<0.01){d.balance=0;d.paidOffMonth=d.paidOffMonth||month;snowballFreed+=d.min;}
    }
    // Step 2: apply per-debt extra payments
    for (const d of state) {
      if (d.balance<=0||d.extra<=0) continue;
      const e=Math.min(d.extra,d.balance); d.balance=Math.max(0,d.balance-e); d.totalExtra+=e;
      if (d.balance<0.01){d.balance=0;d.paidOffMonth=d.paidOffMonth||month;}
    }
    // Step 3: freed minimums from paid-off debts cascade to next priority debt (avalanche/snowball)
    if (snowballFreed>0) {
      for (const d of state) {
        if (d.balance<=0||snowballFreed<=0) continue;
        const e2=Math.min(snowballFreed,d.balance); d.balance=Math.max(0,d.balance-e2); snowballFreed-=e2;
        if (d.balance<0.01){d.balance=0;d.paidOffMonth=d.paidOffMonth||month;}
      }
    }
  }
  // Mark any debt that never reached zero by the end of the simulation window as "runaway" —
  // its minimum payment doesn't cover its own monthly interest, so the balance grows
  // indefinitely. Evaluated ONCE, after the loop, using final state — not every month —
  // so a debt that simply takes a while to pay off isn't mistaken for one that never will.
  for (const d of state) {
    if (d.paidOffMonth===null) d.runaway = true;
  }
  return state;
}

// ── Date field: type it manually OR click to pick from a calendar ──────────
// Defined at module level (not inside App) so it keeps a stable identity
// across renders — otherwise React would remount it on every keystroke
// elsewhere in the app and instantly wipe its open/closed state.
function DateField({ value, onChange, min, T, accent, mono, inp }) {
  const [open, setOpen]         = useState(false);
  const toDisplay = (v) => { if(!v) return ""; const [y,m,d]=v.split("-"); return `${m}/${d}/${y}`; };
  const toStored  = (v) => { const parts=v.split("/"); if(parts.length!==3) return null; const [m,d,y]=parts; if(!m||!d||!y||y.length!==4) return null; const mm=m.padStart(2,"0"), dd=d.padStart(2,"0"); const s=`${y}-${mm}-${dd}`; return !isNaN(new Date(s+"T00:00:00").getTime()) ? s : null; };
  const [text, setText]         = useState(toDisplay(value));
  const [viewMonth, setViewMonth] = useState(()=> new Date((value||today)+"T00:00:00"));

  useEffect(()=>{ setText(toDisplay(value)); }, [value]);

  const commitStored = (stored) => {
    if (stored && (!min || stored>=min)) {
      onChange(stored);
      setViewMonth(new Date(stored+"T00:00:00"));
    }
  };

  const commit = (v) => {
    if (!v) { onChange(""); return; }
    const stored = toStored(v);
    if (stored && (!min || stored>=min)) {
      onChange(stored);
      setViewMonth(new Date(stored+"T00:00:00"));
    } else {
      setText(toDisplay(value)); // revert to last valid value
    }
  };

  const y=viewMonth.getFullYear(), m=viewMonth.getMonth();
  const dim=new Date(y,m+1,0).getDate(), fw=new Date(y,m,1).getDay();
  const cells=[]; for(let i=0;i<fw;i++) cells.push(null); for(let d=1;d<=dim;d++) cells.push(d);
  const pad=(n)=>String(n).padStart(2,"0");

  return (
    <div style={{ position:"relative" }}>
      <div style={{ display:"flex", gap:6 }}>
        <input
          type="text" inputMode="numeric" placeholder="MM/DD/YYYY" value={text}
          onChange={e=>setText(e.target.value)}
          onBlur={e=>commit(e.target.value)}
          onKeyDown={e=>{ if(e.key==="Enter") e.target.blur(); if(e.key==="Escape") setText(value||""); }}
          style={{ ...inp(), flex:1, ...mono, fontSize:16 }}
        />
        <button type="button" onClick={()=>{ setViewMonth(new Date((value||today)+"T00:00:00")); setOpen(o=>!o); }}
          style={{ background:open?`${accent}18`:T.surface, border:`1px solid ${open?accent:T.border2}`, borderRadius:8, padding:"0 12px", cursor:"pointer", color:open?accent:T.muted, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="5" width="18" height="16" rx="3" stroke="currentColor" strokeWidth="2"/>
            <path d="M3 10h18" stroke="currentColor" strokeWidth="2"/>
            <path d="M8 3v4M16 3v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>
      </div>
      {open&&(
        <div style={{ position:"absolute", top:"calc(100% + 6px)", right:0, zIndex:50, background:T.card, border:`1.5px solid ${T.border}`, borderRadius:12, padding:12, width:260, boxShadow:"0 8px 24px rgba(0,0,0,0.35)" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
            <button type="button" onClick={()=>setViewMonth(new Date(y,m-1,1))} style={{ background:"none", border:"none", color:T.text, cursor:"pointer", fontSize:17, padding:"2px 8px" }}>‹</button>
            <span style={{ ...mono, fontSize:16, color:T.text }}>{viewMonth.toLocaleString("default",{month:"long",year:"numeric"})}</span>
            <button type="button" onClick={()=>setViewMonth(new Date(y,m+1,1))} style={{ background:"none", border:"none", color:T.text, cursor:"pointer", fontSize:17, padding:"2px 8px" }}>›</button>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:2, marginBottom:4 }}>
            {["Su","Mo","Tu","We","Th","Fr","Sa"].map(d=><div key={d} style={{ textAlign:"center", ...mono, fontSize:10, color:T.muted, padding:"3px 0" }}>{d}</div>)}
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:2 }}>
            {cells.map((day,i)=>{
              if (!day) return <div key={i}/>;
              const dateStr=`${y}-${pad(m+1)}-${pad(day)}`;
              const disabled = min && dateStr<min;
              const selected = dateStr===value;
              return (
                <button key={i} type="button" disabled={disabled}
                  onClick={()=>{ commitStored(dateStr); setOpen(false); }}
                  style={{ background:selected?accent:"transparent", color:disabled?T.muted:selected?"#12141F":T.sub, border:"none", borderRadius:7, padding:"6px 0", fontSize:15, cursor:disabled?"default":"pointer", opacity:disabled?0.35:1, ...mono }}>
                  {day}
                </button>
              );
            })}
          </div>
          <button type="button" onClick={()=>setOpen(false)} style={{ width:"100%", marginTop:8, background:T.surface, border:`1px solid ${T.border2}`, color:T.muted, borderRadius:8, padding:"7px 0", fontSize:15, cursor:"pointer", fontFamily:"inherit" }}>Close</button>
        </div>
      )}
    </div>
  );
}

// ── Edit panel for category/debt due date ───────────────────────────────────
// ── Buffered number input ───────────────────────────────────────────────
// Debt fields (Balance/Rate/Min. Pmt/Extra) feed a full payoff simulation that
// re-runs on every character typed if bound directly to global state — on a
// real phone that's enough lag per keystroke to drop or misplace characters
// mid-type. This component holds its OWN local value while typing (instant,
// never blocked by re-renders) and only commits upward — triggering the
// expensive recalculation — once typing pauses, on blur.
function BufferedInput({ value, onCommit, style, placeholder, min="0" }) {
  const [local, setLocal] = useState(value ?? "");
  useEffect(()=>{ setLocal(value ?? ""); }, [value]);
  return (
    <input
      type="number" min={min} placeholder={placeholder}
      value={local}
      onChange={e=>setLocal(e.target.value)}
      onBlur={()=>{ if (String(local)!==String(value ?? "")) onCommit(local); }}
      onKeyDown={e=>{ if (e.key==="Enter") e.target.blur(); }}
      style={style}
    />
  );
}


// Native selects hand their popup rendering off to the OS (a wheel picker on
// iOS, a system dialog on Android, a system-styled list on desktop) — CSS has
// little to no control over that popup's colors or corner-rounding, which is
// exactly why white could show through at the edges no matter how the select
// itself was styled. This component is 100% app-drawn, so there's nothing
// OS-native left to leak through.
function Dropdown({ value, options, onChange, T, accent, mono, fontSize=16, align="left" }) {
  const [open, setOpen] = useState(false);
  const label = options.find(([v])=>v===value)?.[1] ?? value;
  return (
    <div style={{ position:"relative" }}>
      <button type="button" onClick={()=>setOpen(o=>!o)} style={{ background:"none", border:"none", color:T.text, fontFamily:"inherit", fontSize, width:"100%", cursor:"pointer", padding:0, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <span>{label}</span>
        <span style={{ color:T.muted, fontSize:15, transform:open?"rotate(180deg)":"none", transition:"transform 0.15s", flexShrink:0, marginLeft:6 }}>▾</span>
      </button>
      {open&&(<>
        <div style={{ position:"absolute", top:"calc(100% + 6px)", ...(align==="right"?{right:0}:{left:0}), minWidth:"100%", width:"max-content", maxWidth:"min(70vw, 260px)", background:T.card, border:`1px solid ${T.border}`, borderRadius:10, overflow:"hidden", zIndex:20, boxShadow:"0 8px 24px rgba(0,0,0,0.4)", maxHeight:240, overflowY:"auto" }}>
          {options.map(([v,l])=>(
            <button key={v} type="button" onClick={()=>{ onChange(v); setOpen(false); }} style={{ display:"block", width:"100%", textAlign:"left", background:value===v?`${accent}18`:"none", border:"none", color:value===v?accent:T.text, fontFamily:"inherit", fontSize:16, padding:"11px 14px", cursor:"pointer", whiteSpace:"nowrap" }}>{l}</button>
          ))}
        </div>
        <div onClick={()=>setOpen(false)} style={{ position:"fixed", inset:0, zIndex:15 }}/>
      </>)}
    </div>
  );
}

// ── Edit panel for category/debt due date ───────────────────────────────────
function DueDateEditor({ cat, onChange, isDebt, T, TC, mono, inp, accent }) {
  const color = (TC && TC[cat.type]) || accent || COLOR_INFO;
  return (
    <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
      <span style={{ ...mono, fontSize:11, color:T.muted, letterSpacing:"0.06em", flexShrink:0 }}>DUE</span>
      <div style={{ display:"flex", gap:4, flexShrink:0 }}>
        {[["","None"],["day","Day"]].map(([v,l])=>(
          <button key={v} onClick={()=>onChange({dueType:v})} style={{ padding:"4px 10px", borderRadius:99, border:`1.5px solid ${cat.dueType===v?color:T.border2}`, background:cat.dueType===v?`${color}18`:"transparent", color:cat.dueType===v?color:T.muted, fontSize:13, cursor:"pointer", fontFamily:"inherit" }}>{l}</button>
        ))}
      </div>
      {cat.dueType==="day" && (<>
        <input type="number" min="1" max="31" placeholder="1–31" value={cat.dueDay||""} onChange={e=>onChange({dueDay:e.target.value})}
          style={{ ...inp(), width:52, ...mono, fontSize:17, padding:"5px 6px", textAlign:"center", flexShrink:0 }} />
        {!isDebt&&(
          <div style={{ flex:1, minWidth:150 }}>
            <DateField value={cat.dueStart||today} onChange={v=>onChange({dueStart:v})} T={T} accent={accent} mono={mono} inp={inp} />
          </div>
        )}
      </>)}
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────
export default function App() {
  const [activeProfile, setActiveProfile] = useState("personal");
  const [businessEnabled, setBusinessEnabled] = useState(false);
  const [combineFinances, setCombineFinances] = useState(false); // Income tab: merge Business into Personal totals?
  const [tab, setTab] = useState("budget");

  // Per-profile
  const [paycheckRaw,  setPaycheckRaw]  = useState({ personal:"", business:"" });
  const [paycheckInput,setPaycheckInput]= useState({ personal:"", business:"" });
  const [frequency,    setFrequency]    = useState({ personal:"biweekly", business:"monthly" });
  const [startDate,    setStartDate]    = useState({ personal:today, business:today });
  const [categories,   setCategories]   = useState({ personal:DEFAULT_CATS.personal, business:DEFAULT_CATS.business });
  const [debts,        setDebts]        = useState({ personal:[], business:[] });

  // UI state
  const [editId,     setEditId]     = useState(null);
  const [showAddCat, setShowAddCat] = useState(false);
  const [newCat,     setNewCat]     = useState({ name:"", type:"spending", color:"#6B8DE3", target:"", catFreq:"monthly", dueType:"", dueDay:"", dueFreq:"monthly", dueStart:today });
  const [strategy,   setStrategy]   = useState("avalanche");
  const [addingDebt, setAddingDebt] = useState(false);
  const [newDebt,    setNewDebt]    = useState({ name:"", balance:"", rate:"", minPayment:"", extraPayment:"", dueType:"", dueDay:"", dueFreq:"monthly", dueStart:today });
  const [editDebtId, setEditDebtId] = useState(null);
  const [logState,     setLogState]     = useState({}); // { [debtId]: { open, amt, note } }
  const [confirmState, setConfirmState] = useState(null); // { type, id, name }
  const [payoffState,  setPayoffState]  = useState({}); // { [debtId]: { open, date } }
  const getLog = (id) => logState[id] || { open:false, amt:"", note:"" };
  const setLog = (id, patch) => setLogState(prev=>({ ...prev, [id]:{ ...getLog(id), ...patch } }));
  const getPayoff = (id) => payoffState[id] || { open:false, date:"" };
  const setPayoff = (id, patch) => setPayoffState(prev=>({ ...prev, [id]:{ ...getPayoff(id), ...patch } }));
  const [calMonth,   setCalMonth]   = useState(new Date());

  // Calculator
  const [calcSource,    setCalcSource]    = useState("auto"); // "auto" | "manual"
  const [calcItems,     setCalcItems]     = useState([{ id:"ci1", name:"", amount:"" }]);
  const [calcFreq,      setCalcFreq]      = useState("biweekly");
  const [justApplied,   setJustApplied]   = useState(false);

  // Theme & personalization
  const [themeName,      setThemeName]      = useState(()=>{
    // First-ever load only (no saved data yet) — match the device's system light/dark
    // setting rather than always forcing Dark. Once a saved theme exists, the load
    // effect below overrides this with whatever the person actually picked.
    try {
      if (typeof window!=="undefined" && window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches) return "paper";
    } catch {}
    return "dark";
  });
  const [typeColors,     setTypeColors]     = useState({ bills:COLOR_DANGER, spending:"#F0A500", savings:"#3DB8A0" });
  const [profileAccents, setProfileAccents] = useState({ personal:"#FF6B6B", business:"#4DABF7" });

  const [loaded, setLoaded] = useState(false);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(true); // assume returning user until load proves otherwise
  const [onboardingStep, setOnboardingStep] = useState(null); // "welcome"|"tour"|"paycheck"|"debt"|null
  const [tourCard, setTourCard] = useState(0);
  const [onbCombineDemo, setOnbCombineDemo] = useState(false);
  const [onbThemeDemo, setOnbThemeDemo] = useState("dark");
  const [onbPaycheck, setOnbPaycheck] = useState({ amount:"", freq:"biweekly", date:today });
  const [onbDebt, setOnbDebt] = useState({ name:"", balance:"", rate:"", minPayment:"", dueDay:"" });
  const [onbDebts, setOnbDebts] = useState([]); // debts added so far during onboarding
  const [onbFreqOpen, setOnbFreqOpen] = useState(false);
  const p  = activeProfile;
  const T  = THEMES[themeName] || THEMES.dark;
  const TC = typeColors;
  const accent = profileAccents[p];

  // ── Helpers ───────────────────────────────────────────────────────────
  const toMonthly   = (amt, cf) => parse(amt)*(CAT_FREQ_MULT[cf||"monthly"]);
  const toPerPeriod = (mo, pf)  => mo/(FREQ_PER_YEAR[pf]/12);
  const card = (ex={}) => ({ background:T.card, borderRadius:12, border:`1.5px solid ${T.border}`, padding:16, ...ex });
  const mono = { fontFamily:"'DM Mono',monospace" };
  const inp  = (ex={}) => ({ background:T.surface, border:`1px solid ${T.border2}`, borderRadius:8, padding:"8px 10px", color:T.text, fontFamily:"inherit", fontSize:17, ...ex });

  // ── Persistence ───────────────────────────────────────────────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem("v4_data");
      if (raw) {
        const d = JSON.parse(raw);
        if (d.hasCompletedOnboarding !== undefined) setHasCompletedOnboarding(d.hasCompletedOnboarding);
        else { setHasCompletedOnboarding(false); setOnboardingStep("welcome"); }
        if (d.paycheckRaw)    setPaycheckRaw(d.paycheckRaw);
        if (d.paycheckInput)  setPaycheckInput(d.paycheckInput);
        if (d.frequency)      setFrequency(d.frequency);
        if (d.startDate)      setStartDate(d.startDate);
        if (d.categories)     setCategories(d.categories);
        if (d.debts)          setDebts(d.debts);
        if (d.strategy)       setStrategy(d.strategy);
        if (d.businessEnabled !== undefined) setBusinessEnabled(d.businessEnabled);
        if (d.combineFinances !== undefined) setCombineFinances(d.combineFinances);
        if (d.activeProfile)  setActiveProfile(d.activeProfile);
        if (d.themeName)      setThemeName(d.themeName);
        if (d.typeColors)     setTypeColors(d.typeColors);
        if (d.profileAccents) setProfileAccents(d.profileAccents);
        if (d.calcFreq)       setCalcFreq(d.calcFreq);
        if (d.calcSource)     setCalcSource(d.calcSource);
        if (d.calcItems)      setCalcItems(d.calcItems);
        if (d.payoffState) {
          // Restore goal dates only — never restore panels as "open", that's transient UI state
          const restored = {};
          Object.entries(d.payoffState).forEach(([id,v])=>{ if (v?.date) restored[id] = { open:false, date:v.date }; });
          setPayoffState(restored);
        }
      } else {
        // No saved data whatsoever — true first-ever launch
        setHasCompletedOnboarding(false);
        setOnboardingStep("welcome");
      }
    } catch {}
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem("v4_data", JSON.stringify({ paycheckRaw, paycheckInput, frequency, startDate, categories, debts, strategy, businessEnabled, combineFinances, activeProfile, themeName, typeColors, profileAccents, calcFreq, calcSource, calcItems, payoffState, hasCompletedOnboarding }));
    } catch {}
  }, [paycheckRaw,paycheckInput,frequency,startDate,categories,debts,strategy,businessEnabled,combineFinances,activeProfile,themeName,typeColors,profileAccents,calcFreq,calcSource,calcItems,payoffState,hasCompletedOnboarding,loaded]);

  // ── Derived budget values ─────────────────────────────────────────────
  const pcVal   = parse(paycheckRaw[p]);
  const freq    = frequency[p];
  const cats    = categories[p] || [];
  const dts     = debts[p] || [];
  const catMonthlyTotal = cats.reduce((s,c)=>s+toMonthly(c.amount,c.catFreq),0);
  const billsMonthlyTotal = cats.filter(c=>c.type==="bills").reduce((s,c)=>s+toMonthly(c.amount,c.catFreq),0);
  const debtMinMonthlyTotal = dts.reduce((s,d)=>s+parse(d.minPayment),0);
  const catPerPeriod    = toPerPeriod(catMonthlyTotal, freq);
  const remaining       = pcVal - catPerPeriod;
  const isOver          = catPerPeriod > pcVal && pcVal > 0;
  const monthlyIncome   = pcVal*(FREQ_PER_YEAR[freq]/12);

  // ── Category helpers ──────────────────────────────────────────────────
  const updateCat = (id, patch) => setCategories(prev=>({
    ...prev,
    [p]: prev[p].map(c => {
      if (c.id!==id) return c;
      const updated = {...c,...patch};
      // Always keep color in sync with type
      if (patch.type) updated.color = TC[patch.type];
      return updated;
    })
  }));
  const removeCat = (id) => {
    const cat = (categories[p]||[]).find(c=>c.id===id);
    if (!cat) return;
    setConfirmState({ type:"cat", id, name:cat.name });
  };
  const confirmRemoveCat = (id) => {
    setCategories(prev=>({...prev,[p]:prev[p].filter(c=>c.id!==id)}));
    setEditId(null);
    setConfirmState(null);
  };
  const addCat    = () => {
    if (!newCat.name.trim()) return;
    setCategories(prev=>({...prev,[p]:[...prev[p],{...newCat, id:genId("c"), color:TC[newCat.type], amount:newCat.amount||""}]}));
    setNewCat({ name:"", type:"spending", color:TC.spending, target:"", catFreq:"monthly", dueType:"", dueDay:"", dueFreq:"monthly", dueStart:today, amount:"" });
    setShowAddCat(false);
  };

  // ── Debt helpers (with auto-sync to Budget categories) ────────────────
  const updateDebt = (id, patch) => {
    // Editing the balance directly here (e.g. correcting a typo) has two different
    // effects depending on whether any real payment has been logged yet:
    // - No real payments logged (only the auto-created "Initial balance" entry exists):
    //   this IS the starting point, so we update that entry too — "Started" and the
    //   current figure move together, progress bar correctly stays at 0%.
    // - Real payments already logged: history is real and shouldn't be rewritten, so
    //   editing Balance here only changes the live number, same as before.
    setDebts(prev => ({
      ...prev, [p]: prev[p].map(d => {
        if (d.id!==id) return d;
        const next = { ...d, ...patch };
        if (patch.balance!==undefined && (d.balanceHistory||[]).length<=1) {
          next.balanceHistory = [{ date:today, balance:String(patch.balance), note:"Initial balance" }];
        }
        return next;
      })
    }));
    // Sync name/amount to linked budget category separately
    if (patch.name!==undefined || patch.minPayment!==undefined) {
      const debt = (debts[p]||[]).find(d=>d.id===id);
      if (debt?.linkedCatId) {
        const updatedName   = patch.name       !== undefined ? patch.name       : debt.name;
        const updatedAmount = patch.minPayment !== undefined ? patch.minPayment : debt.minPayment;
        setCategories(prev => ({
          ...prev, [p]: prev[p].map(c => c.id===debt.linkedCatId
            ? { ...c, name:updatedName, amount:String(parse(updatedAmount)||0) }
            : c
          )
        }));
      }
    }
  };

  const removeDebt = (id) => {
    const debt = (debts[p]||[]).find(d=>d.id===id);
    if (!debt) return;
    setConfirmState({ type:"debt", id, name:debt.name });
  };

  const confirmRemoveDebt = (id) => {
    const debt = (debts[p]||[]).find(d=>d.id===id);
    setCategories(prev=>({
      ...prev,
      [p]: prev[p].filter(c => c.id !== debt?.linkedCatId)
    }));
    setDebts(prev=>({...prev,[p]:prev[p].filter(d=>d.id!==id)}));
    setConfirmState(null);
  };

  const addDebt = () => {
    if (!newDebt.name.trim()) return;
    const debtId = genId("d");
    const catId  = genId("c");
    const newDebtEntry = {
      ...newDebt, id:debtId, color:DEBT_COLORS[(debts[p]||[]).length % DEBT_COLORS.length],
      linkedCatId: catId,
      balanceHistory: [{ date: today, balance: newDebt.balance, note:"Initial balance" }],
    };
    // Auto-create linked Bills category
    const linkedCat = {
      id: catId, name: newDebt.name, type:"bills", color: newDebtEntry.color,
      amount: String(parse(newDebt.minPayment)||0), target:"", catFreq:"monthly",
      dueType: newDebt.dueType||"", dueDay: newDebt.dueDay||"",
      dueFreq: newDebt.dueFreq||"monthly", dueStart: newDebt.dueStart||today,
      isDebtLinked: true, linkedDebtId: debtId,
    };
    setDebts(prev=>({...prev,[p]:[...prev[p], newDebtEntry]}));
    setCategories(prev=>({...prev,[p]:[...prev[p], linkedCat]}));
    setNewDebt({ name:"", balance:"", rate:"", minPayment:"", extraPayment:"", dueType:"", dueDay:"", dueFreq:"monthly", dueStart:today });
    setAddingDebt(false);
  };

  // ── Savings accelerator: auto-populate debt extraPayment from savings ──
  const payoffResults = useMemo(()=>simulatePayoff(debts[p]||[], strategy),[debts, p, strategy]);
  // Priority order follows the strategy's actual definition directly (rate for avalanche,
  // balance for snowball) — NOT the simulated payoff month, which can lag behind or tie
  // when there's no extra payment yet, making rate/balance edits look like they do nothing.
  const priorityOrder = useMemo(()=>{
    const order = strategy==="snowball"
      ? [...(debts[p]||[])].sort((a,b)=>parse(a.balance)-parse(b.balance))
      : [...(debts[p]||[])].sort((a,b)=>parse(b.rate)-parse(a.rate));
    return order.map(d=>d.id);
  },[debts, p, strategy]);
  const logDebtPayment = (debtId, newBalance, note="Payment") => {
    setDebts(prev=>({
      ...prev, [p]: prev[p].map(d => {
        if (d.id!==debtId) return d;
        const history = [...(d.balanceHistory||[]), { date:today, balance:String(newBalance), note }];
        return { ...d, balance:String(newBalance), balanceHistory:history };
      })
    }));
    // Sync to linked budget category
    const debt = (debts[p]||[]).find(d=>d.id===debtId);
    if (debt?.linkedCatId) {
      setCategories(cats=>({...cats,[p]:cats[p].map(c=>c.id===debt.linkedCatId?{...c,amount:String(parse(debt.minPayment)||0)}:c)}));
    }
  };

  // Switching themes brings its own curated, complementary accent palette along with it —
  // category colors and profile accents are chosen per-theme so they always read well
  // against that theme's specific background, and profile accents never collide with
  // category type colors.
  const applyTheme = (key) => {
    setThemeName(key);
    const palette = THEMES[key]?.accentPalette;
    if (palette) {
      setTypeColors({ bills:palette.bills, spending:palette.spending, savings:palette.savings });
      setProfileAccents({ personal:palette.personal, business:palette.business });
    }
  };

  const resetAllData = () => {
    try { localStorage.removeItem("v4_data"); } catch {}
    setPaycheckRaw({ personal:"", business:"" });
    setPaycheckInput({ personal:"", business:"" });
    setFrequency({ personal:"biweekly", business:"monthly" });
    setStartDate({ personal:today, business:today });
    setCategories({ personal:DEFAULT_CATS.personal, business:DEFAULT_CATS.business });
    setDebts({ personal:[], business:[] });
    setStrategy("avalanche");
    setPayoffState({});
    setBusinessEnabled(false);
    setCombineFinances(false);
    setActiveProfile("personal");
    setThemeName("dark");
    setTypeColors({ bills:THEMES.dark.accentPalette.bills, spending:THEMES.dark.accentPalette.spending, savings:THEMES.dark.accentPalette.savings });
    setProfileAccents({ personal:THEMES.dark.accentPalette.personal, business:THEMES.dark.accentPalette.business });
    setCalcFreq("biweekly");
    setCalcSource("auto");
    setCalcItems([{ id:"ci1", name:"", amount:"" }]);
    setEditId(null);
    setEditDebtId(null);
    setShowAddCat(false);
    setAddingDebt(false);
    setLogState({});
    setTab("budget");
    setConfirmState(null);
    setHasCompletedOnboarding(false);
    setOnboardingStep("welcome");
    setTourCard(0);
    setOnbPaycheck({ amount:"", freq:"biweekly", date:today });
    setOnbDebt({ name:"", balance:"", rate:"", minPayment:"", dueDay:"" });
    setOnbDebts([]);
  };

  const applyCalcToBudget = () => {
    const net = Math.round(calcTotals.perPeriod * 100) / 100;
    if (net <= 0) return;
    setPaycheckRaw(prev=>({...prev,[p]:String(net)}));
    setPaycheckInput(prev=>({...prev,[p]:String(net)}));
    setFrequency(prev=>({...prev,[p]:calcFreq}));
    setJustApplied(true);
    setTimeout(()=>setJustApplied(false), 2200);
  };

  const convergedResults = payoffResults.filter(r=>r.paidOffMonth!==null);
  const maxPayoffMonth = convergedResults.length>0 ? Math.max(...convergedResults.map(r=>r.paidOffMonth)) : null;
  const hasRunawayDebt = payoffResults.some(r=>r.runaway);
  const monthsToDate   = (m) => { if(!m)return"—"; const d=new Date(); d.setMonth(d.getMonth()+m); return d.toLocaleDateString("en-US",{month:"short",year:"numeric"}); };

  // ── Per-debt "pay off by date" calculator (pure function, no shared state) ──
  const calcPayoffByDate = (debt, dateStr, payFreq) => {
    if (!dateStr) return null;
    const target=new Date(dateStr+"T00:00:00");
    const now=new Date(); now.setHours(0,0,0,0);
    if (target<=now) return { error:"Date must be after today" };
    const daysUntil=Math.ceil((target-now)/86400000);
    const periods=Math.floor(daysUntil/FREQ_DAYS[payFreq]);
    const months=daysUntil/30.44;
    if (periods<1) return { error:"Not enough pay periods before that date" };
    const bal=parse(debt.balance), r=parse(debt.rate)/100/12;
    const monthlyNeeded=r===0?bal/months:(r*bal)/(1-Math.pow(1+r,-months));
    const perPeriod=toPerPeriod(monthlyNeeded,payFreq);
    const totalInterest=Math.max(0,monthlyNeeded*months-bal);
    const feasible=monthlyNeeded>=parse(debt.minPayment);
    return { periods, daysUntil, monthlyNeeded, perPeriod, totalInterest, feasible };
  };

  // Frequency-independent version of the math above — used anywhere we just need
  // "what monthly payment does this debt's goal require," without a pay-period context
  // (e.g. feeding into Earnings Needed to Breakeven). Never returns less than the minimum payment.
  const monthlyNeededForGoal = (debt, dateStr) => {
    if (!dateStr) return null;
    const target=new Date(dateStr+"T00:00:00");
    const now=new Date(); now.setHours(0,0,0,0);
    if (target<=now) return null;
    const months=Math.ceil((target-now)/86400000)/30.44;
    if (months<1) return null;
    const bal=parse(debt.balance), r=parse(debt.rate)/100/12;
    const monthlyNeeded=r===0?bal/months:(r*bal)/(1-Math.pow(1+r,-months));
    return Math.max(monthlyNeeded, parse(debt.minPayment));
  };

  // ── Income calculator ─────────────────────────────────────────────────
  const calcTotals = useMemo(()=>{
    const other = p==="personal" ? "business" : "personal";
    const shouldCombine = businessEnabled && combineFinances;
    // ── Income ────────────────────────────────────────────────────────
    let totalMonthly, incomeLines;
    if (calcSource === "auto") {
      const primaryInc = parse(paycheckRaw[p]) * (FREQ_PER_YEAR[frequency[p]] / 12);
      const otherInc = shouldCombine ? parse(paycheckRaw[other]) * (FREQ_PER_YEAR[frequency[other]] / 12) : 0;
      totalMonthly = primaryInc + otherInc;
      incomeLines = [
        ...(primaryInc > 0 ? [{ name:`${PROFILE_META[p].icon} ${PROFILE_META[p].label} (${FREQ_LABEL[frequency[p]]})`, monthly: primaryInc }] : []),
        ...(otherInc > 0 ? [{ name:`${PROFILE_META[other].icon} ${PROFILE_META[other].label} (${FREQ_LABEL[frequency[other]]})`, monthly: otherInc }] : []),
      ];
    } else {
      totalMonthly = calcItems.reduce((s,i) => s+parse(i.amount), 0);
      incomeLines = calcItems.filter(i=>parse(i.amount)>0).map(i=>({ name:i.name||"Income", monthly:parse(i.amount) }));
    }
    const perPeriod = toPerPeriod(totalMonthly,calcFreq);

    // ── Expenses broken down (exclude debt-linked budget lines to prevent double-counting) ──
    const allCats  = [...(categories[p]||[]), ...(shouldCombine?(categories[other]||[]):[])].filter(c=>!c.isDebtLinked);
    const allDebts = [...(debts[p]||[]),      ...(shouldCombine?(debts[other]||[]):[])];
    const catsByType = {
      bills:    allCats.filter(c=>c.type==="bills"  &&parse(c.amount)>0).map(c=>({ name:c.name, color:TC.bills, amount:parse(c.amount), monthly:toMonthly(c.amount,c.catFreq), catFreq:c.catFreq })),
      spending: allCats.filter(c=>c.type==="spending"&&parse(c.amount)>0).map(c=>({ name:c.name, color:TC.spending, amount:parse(c.amount), monthly:toMonthly(c.amount,c.catFreq), catFreq:c.catFreq })),
      savings:  allCats.filter(c=>c.type==="savings" &&parse(c.amount)>0).map(c=>({ name:c.name, color:TC.savings, amount:parse(c.amount), monthly:toMonthly(c.amount,c.catFreq), catFreq:c.catFreq })),
    };
    const debtLines  = allDebts.filter(d=>parse(d.minPayment)>0||parse(d.extraPayment||0)>0).map(d=>{
      const goalDate = payoffState[d.id]?.date;
      const goalMonthly = goalDate ? monthlyNeededForGoal(d, goalDate) : null;
      const baseMonthly = parse(d.minPayment)+parse(d.extraPayment||0);
      const monthly = goalMonthly!==null ? Math.max(goalMonthly, baseMonthly) : baseMonthly;
      return { name:d.name, color:d.color, monthly, minPayment:parse(d.minPayment), extraPayment:parse(d.extraPayment||0), goalDate, goalDriven: goalMonthly!==null && goalMonthly>baseMonthly };
    });
    const totalCats  = allCats.reduce((s,c)=>s+toMonthly(c.amount,c.catFreq), 0);
    const totalDebts = debtLines.reduce((s,ln)=>s+ln.monthly, 0);
    const totalNeededMonthly    = totalCats + totalDebts;
    const totalNeededPerPeriod  = toPerPeriod(totalNeededMonthly, calcFreq);
    const surplus = perPeriod - totalNeededPerPeriod;
    return { totalMonthly, perPeriod, totalCats, totalDebts, totalNeededMonthly, totalNeededPerPeriod, surplus, incomeLines, catsByType, debtLines };
  },[calcSource,calcItems,calcFreq,paycheckRaw,frequency,debts,categories,businessEnabled,combineFinances,payoffState,typeColors,p]);

  // ── Calendar data ─────────────────────────────────────────────────────
  const calData = useMemo(()=>{
    const yr=calMonth.getFullYear(), mo=calMonth.getMonth();
    const paydaySet=new Set();
    const mStart=new Date(yr,mo,1), mEnd=new Date(yr,mo+1,0);
    if (freq==="semimonthly") {
      // Use startDate as first pay day; second pay day is 15 or 16 days later,
      // both anchored to and walked into the current month from the ref date.
      const ref=new Date(startDate[p]);
      const firstDay=ref.getDate();
      const secondDay=firstDay+15<=28?firstDay+15:firstDay+16;
      // Walk both anchor days into this month
      [firstDay, secondDay].forEach(d=>{
        const candidate=new Date(yr,mo,d);
        if(candidate>=mStart&&candidate<=mEnd) paydaySet.add(d);
      });
    } else if (freq==="monthly") {
      paydaySet.add(new Date(startDate[p]).getDate());
    } else {
      const interval=FREQ_DAYS[freq], ref=new Date(startDate[p]);
      let cur=new Date(ref);
      while(cur>mStart) cur=new Date(cur-interval*86400000);
      while(cur<mStart) cur=new Date(cur.getTime()+interval*86400000);
      while(cur<=mEnd){ if(cur.getMonth()===mo) paydaySet.add(cur.getDate()); cur=new Date(cur.getTime()+interval*86400000); }
    }
    // Bill due days — dueType:"day" uses dueDay for specific date, catFreq+dueStart for recurrence
    const billsByDay = {};
    const addBill = (day, item) => { if(day>=1&&day<=31){ if(!billsByDay[day]) billsByDay[day]=[]; billsByDay[day].push(item); }};
    const collectDue = (items, isDebt) => {
      items.forEach(c=>{
        if (c.dueType==="day" && c.dueDay) {
          const freq = isDebt ? (c.dueFreq||"monthly") : (c.catFreq||"monthly");
          // For monthly or longer: show on that fixed day
          if (!freq || freq==="monthly" || freq==="quarterly" || freq==="biannually" || freq==="yearly") {
            addBill(parseInt(c.dueDay), { ...c, isDebt, amount: isDebt ? c.minPayment : c.amount });
          } else {
            // For weekly/biweekly: walk from dueStart using catFreq interval
            const interval = FREQ_DAYS[freq] || 30;
            const ref = new Date(c.dueStart||today);
            const mStart=new Date(yr,mo,1), mEnd=new Date(yr,mo+1,0);
            let cur=new Date(ref);
            while(cur>mStart) cur=new Date(cur-interval*86400000);
            while(cur<mStart) cur=new Date(cur.getTime()+interval*86400000);
            while(cur<=mEnd){ if(cur.getMonth()===mo) addBill(cur.getDate(), { ...c, isDebt, amount: isDebt ? c.minPayment : c.amount }); cur=new Date(cur.getTime()+interval*86400000); }
          }
        }
      });
    };
    collectDue(cats.filter(c=>c.type==="bills"&&!c.isDebtLinked), false);
    collectDue(dts, true);
    const fw=new Date(yr,mo,1).getDay(), dim=new Date(yr,mo+1,0).getDate();
    const tn=new Date(), cells=[];
    for(let i=0;i<fw;i++) cells.push(null);
    for(let d=1;d<=dim;d++) cells.push({ day:d, isPayday:paydaySet.has(d), bills:billsByDay[d]||[], isToday:d===tn.getDate()&&mo===tn.getMonth()&&yr===tn.getFullYear() });
    return cells;
  },[calMonth,freq,startDate,p,cats,dts]);

  // ── Donut segments ────────────────────────────────────────────────────
  const donutSegments = useMemo(()=>{
    const byType = { bills:0, spending:0, savings:0 };
    cats.forEach(c=>{ byType[c.type]=(byType[c.type]||0)+toMonthly(c.amount,c.catFreq); });
    return Object.entries(byType).filter(([,v])=>v>0).map(([type,value])=>({ label:type, value, color:TC[type] }));
  },[cats,TC]);

  const donutTotal = donutSegments.reduce((s,g)=>s+g.value,0);

  // ── Monthly outlook data ──────────────────────────────────────────────
  const outlookData = useMemo(()=>{
    const yr=calMonth.getFullYear(), mo=calMonth.getMonth();
    const paydaySet=new Set();
    const mStart=new Date(yr,mo,1), mEnd=new Date(yr,mo+1,0);
    if(freq==="semimonthly") {
      const ref=new Date(startDate[p]);
      const firstDay=ref.getDate();
      const secondDay=firstDay+15<=28?firstDay+15:firstDay+16;
      [firstDay, secondDay].forEach(d=>{
        const candidate=new Date(yr,mo,d);
        if(candidate>=mStart&&candidate<=mEnd) paydaySet.add(d);
      });
    } else if(freq==="monthly") {
      paydaySet.add(new Date(startDate[p]).getDate());
    } else {
      const interval=FREQ_DAYS[freq], ref=new Date(startDate[p]);
      let cur=new Date(ref);
      while(cur>mStart) cur=new Date(cur-interval*86400000);
      while(cur<mStart) cur=new Date(cur.getTime()+interval*86400000);
      while(cur<=mEnd){ if(cur.getMonth()===mo) paydaySet.add(cur.getDate()); cur=new Date(cur.getTime()+interval*86400000); }
    }
    const paycheckCount=paydaySet.size;
    const projectedIncome=pcVal*paycheckCount;
    const totalDebtMin=dts.reduce((s,d)=>s+parse(d.minPayment),0);
    const nonDebtCatMonthlyTotal = cats.filter(c=>!c.isDebtLinked).reduce((s,c)=>s+toMonthly(c.amount,c.catFreq),0);
    const projectedExpenses=nonDebtCatMonthlyTotal+totalDebtMin;
    const net=projectedIncome-projectedExpenses;
    // Bills + debts with due dates this month — catFreq drives recurrence for weekly/biweekly
    const billEvents=[];
    cats.filter(c=>parse(c.amount)>0&&c.dueType==="day"&&c.dueDay&&!c.isDebtLinked).forEach(c=>{
      const cf=c.catFreq||"monthly";
      if (!cf||cf==="monthly"||cf==="quarterly"||cf==="biannually"||cf==="yearly") {
        billEvents.push({ day:parseInt(c.dueDay), name:c.name, color:TC[c.type], exactAmount:parse(c.amount), catFreq:cf, isDebt:false });
      } else {
        const interval=FREQ_DAYS[cf]||30, ref=new Date(c.dueStart||today);
        let cur=new Date(ref);
        while(cur>mStart) cur=new Date(cur-interval*86400000);
        while(cur<mStart) cur=new Date(cur.getTime()+interval*86400000);
        while(cur<=mEnd){ if(cur.getMonth()===mo) billEvents.push({ day:cur.getDate(), name:c.name, color:TC[c.type], exactAmount:parse(c.amount), catFreq:cf, isDebt:false }); cur=new Date(cur.getTime()+interval*86400000); }
      }
    });
    dts.filter(d=>parse(d.minPayment)>0&&d.dueType==="day"&&d.dueDay).forEach(d=>{
      billEvents.push({ day:parseInt(d.dueDay), name:d.name, color:d.color, exactAmount:parse(d.minPayment), catFreq:"monthly", isDebt:true });
    });
    billEvents.sort((a,b)=>a.day-b.day);
    return { paycheckCount, projectedIncome, projectedExpenses, totalDebtMin, net, billEvents, paycheckDays:[...paydaySet].sort((a,b)=>a-b) };
  },[calMonth,freq,startDate,p,cats,dts,pcVal,catMonthlyTotal]);

  const switchProfile=(prof)=>{ setActiveProfile(prof); setEditId(null); setEditDebtId(null); setShowAddCat(false); setAddingDebt(false); setTab("budget"); };

  // ── Reusable date field: type it manually OR click to pick from a calendar ──
  // (DateField and DueDateEditor are defined at module level below, outside App,
  //  so they keep a stable identity across renders and never lose internal state.)


  // ── Onboarding tour content ─────────────────────────────────────────
  const TOUR_CARDS = [
    {
      title: <>Your <span style={{ color:"#E5635A", fontFamily:"'Dancing Script', cursive", fontSize:"1.3em", fontWeight:700 }}>Bills</span> don't care about your paycheck schedule</>,
      body: "Your paycheck arrives biweekly. But a category — rent, insurance, a subscription — can be set to weekly, monthly, quarterly, even yearly, independent of your paycheck.",
      example: "",
      mockup: (
        <div style={{ background:"#252836", border:"1px solid #2E3048", borderRadius:16, padding:"16px 16px", width:"100%" }}>
          <div style={{ ...mono, fontSize:13, color:"#7A788E", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:10 }}>Bills</div>
          {[
            ["Rent","Monthly","1,450","MO","#E5635A"],
            ["Car Insurance","Quarterly","600","QT","#E5635A"],
            ["Streaming","Weekly","12","WK","#E5635A"],
          ].map(([name,freq,amt,abbr,color])=>(
            <div key={name} style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 0", borderTop:name!=="Rent"?"1px solid #2E3048":"none" }}>
              <div style={{ width:8, height:8, borderRadius:99, background:color, flexShrink:0 }}/>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:16, color:"#E2DED8" }}>{name}</div>
                <div style={{ fontSize:11, color:"#7A788E" }}>{freq}</div>
              </div>
              <span style={{ ...mono, fontSize:16, color:"#E2DED8" }}>${amt}</span>
              <span style={{ ...mono, fontSize:10, color:"#7A788E" }}>{abbr}</span>
            </div>
          ))}
        </div>
      ),
    },
    {
      title: <>Same numbers, your choice of <span style={{ color:"#4DABF7", fontFamily:"'Dancing Script', cursive", fontSize:"1.3em", fontWeight:700 }}>Vibe</span></>,
      body: "The Income tab has its own frequency, completely separate from your paycheck.",
      example: "",
      mockup: (
        <div style={{ background:"#252836", border:"1px solid #2E3048", borderRadius:16, padding:"16px 16px", width:"100%" }}>
          <div style={{ display:"flex", gap:10 }}>
            <div style={{ flex:1 }}>
              <div style={{ ...mono, fontSize:11, color:"#7A788E", marginBottom:6 }}>BUDGET · PAYCHECK</div>
              <div style={{ background:"#1A1D2E", borderRadius:9, padding:"10px 12px", border:"1px solid #2E3048" }}>
                <span style={{ fontSize:16, color:"#E2DED8" }}>Bi-Weekly</span>
              </div>
            </div>
            <div style={{ flex:1 }}>
              <div style={{ ...mono, fontSize:11, color:"#4DABF7", marginBottom:6 }}>INCOME · VIEW AS</div>
              <div style={{ background:"#1A1D2E", borderRadius:9, padding:"10px 12px", border:"1px solid #4DABF7" }}>
                <span style={{ fontSize:16, color:"#4DABF7" }}>Monthly</span>
              </div>
            </div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:12 }}>
            <span style={{ fontSize:16 }}>↔</span>
            <span style={{ fontSize:13, color:"#7A788E" }}>Change one without touching the other</span>
          </div>
        </div>
      ),
    },
    {
      title: <>Math, not <span style={{ color:"#F0A500", fontFamily:"'Dancing Script', cursive", fontSize:"1.3em", fontWeight:700 }}>Magic</span></>,
      body: "Every debt card has a 📅 icon. Tap it, pick a payoff date, and the app runs the math.",
      example: "",
      mockup: (
        <div style={{ background:"#252836", border:"1px solid #2E3048", borderRadius:16, padding:"16px 16px", width:"100%" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
            <div style={{ width:28, height:28, borderRadius:99, background:"#E5635A1A", border:"1.5px solid #E5635A", display:"flex", alignItems:"center", justifyContent:"center", ...mono, fontSize:15, fontWeight:700, color:"#E5635A" }}>1</div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:17, color:"#E2DED8", fontWeight:600 }}>Visa</div>
              <div style={{ fontSize:13, color:"#7A788E" }}>Goal: Dec 2026</div>
            </div>
            <div style={{ width:26, height:26, borderRadius:7, background:"#E5635A18", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="5" width="18" height="16" rx="3" stroke="#E5635A" strokeWidth="2"/>
                <path d="M3 10h18" stroke="#E5635A" strokeWidth="2"/>
                <path d="M8 3v4M16 3v4" stroke="#E5635A" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
          </div>
          <div style={{ marginBottom:12 }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
              <span style={{ ...mono, fontSize:10, color:"#7A788E" }}>Started: $3,000</span>
              <span style={{ ...mono, fontSize:10, color:"#E5635A", fontWeight:600 }}>28% paid</span>
            </div>
            <div style={{ height:6, borderRadius:99, background:"#1A1D2E", overflow:"hidden" }}>
              <div style={{ height:"100%", width:"28%", background:"#E5635A", borderRadius:99 }}/>
            </div>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
            <div style={{ background:"#1A1D2E", borderRadius:9, padding:"10px 12px" }}>
              <div style={{ ...mono, fontSize:11, color:"#7A788E" }}>PER PERIOD</div>
              <div style={{ ...mono, fontSize:17, fontWeight:700, color:"#E5635A" }}>$212</div>
            </div>
            <div style={{ background:"#1A1D2E", borderRadius:9, padding:"10px 12px" }}>
              <div style={{ ...mono, fontSize:11, color:"#7A788E" }}>PERIODS LEFT</div>
              <div style={{ ...mono, fontSize:17, fontWeight:700, color:"#E2DED8" }}>11</div>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: <>We keep <span style={{ color:"#3DB8A0", fontFamily:"'Dancing Script', cursive", fontSize:"1.3em", fontWeight:700 }}>Receipts</span></>,
      body: "The ✎ icon on a debt opens more than an edit form.",
      example: "",
      mockup: (
        <div style={{ background:"#252836", border:"1px solid #2E3048", borderRadius:16, padding:"16px 16px", width:"100%" }}>
          <div style={{ ...mono, fontSize:13, color:"#7A788E", marginBottom:10 }}>LOG BALANCE UPDATE</div>
          <div style={{ background:"#1A1D2E", borderRadius:9, border:"1px solid #2E3048", padding:"10px 12px", marginBottom:10 }}>
            <div style={{ ...mono, fontSize:11, color:"#7A788E", marginBottom:3 }}>NEW BALANCE</div>
            <div style={{ display:"flex", alignItems:"center", gap:5 }}>
              <span style={{ ...mono, fontSize:17, color:"#F0A500" }}>$</span>
              <span style={{ ...mono, fontSize:20, color:"#E2DED8" }}>2,150</span>
            </div>
          </div>
          <div style={{ ...mono, fontSize:13, color:"#7A788E", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:6 }}>Balance History</div>
          {[
            ["March payment","-$250","2,150"],
            ["February payment","-$200","2,400"],
            ["Initial balance","","2,600"],
          ].map(([note,change,bal])=>(
            <div key={note} style={{ display:"flex", alignItems:"center", gap:8, padding:"7px 8px", background:"#1A1D2E", borderRadius:7, marginBottom:4 }}>
              <div style={{ width:6, height:6, borderRadius:99, background:change?"#3DB8A0":"#7A788E" }}/>
              <span style={{ fontSize:15, color:"#C0BEBA", flex:1 }}>{note}</span>
              {change&&<span style={{ ...mono, fontSize:13, color:"#3DB8A0" }}>{change}</span>}
              <span style={{ ...mono, fontSize:15, fontWeight:600, color:"#E2DED8" }}>${bal}</span>
            </div>
          ))}
        </div>
      ),
    },
    {
      title: <>Nothing to set up <span style={{ color:"#DA77F2", fontFamily:"'Dancing Script', cursive", fontSize:"1.3em", fontWeight:700 }}>Twice</span></>,
      body: "Paydays, bills, and debts with due dates show up on the Calendar automatically.",
      example: "",
      mockup: (
        <div style={{ background:"#252836", border:"1px solid #2E3048", borderRadius:16, padding:"16px 16px", width:"100%" }}>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:3, marginBottom:3 }}>
            {["Su","Mo","Tu","We","Th","Fr","Sa"].map(d=><div key={d} style={{ textAlign:"center", ...mono, fontSize:8, color:"#7A788E" }}>{d}</div>)}
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:3, marginBottom:12 }}>
            {[
              { day:10, badge:null, chip:null },
              { day:11, badge:null, chip:null },
              { day:12, badge:null, chip:{ label:"Rent", color:"#E5635A" } },
              { day:13, badge:"PAY", chip:null },
              { day:14, badge:null, chip:{ label:"Visa", color:"#F0A500" } },
              { day:15, badge:null, chip:null },
              { day:16, badge:null, chip:{ label:"Netflix", color:"#4DABF7" } },
            ].map((cell,i)=>(
              <div key={i} style={{ minHeight:50, borderRadius:7, padding:"4px 3px", background:"#1A1D2E", border:`1px solid ${cell.badge?"#52A67A":"#2E3048"}` }}>
                <div style={{ ...mono, fontSize:10, color:cell.badge?"#52A67A":"#7A788E", textAlign:"center", marginBottom:2 }}>{cell.day}</div>
                {cell.badge&&<div style={{ background:"#52A67A", borderRadius:3, padding:"1px 2px", fontSize:6, fontWeight:700, color:"#0A1A12", textAlign:"center", ...mono }}>{cell.badge}</div>}
                {cell.chip&&(
                  <div style={{ background:`${cell.chip.color}28`, borderRadius:3, padding:"1px 2px" }}>
                    <div style={{ fontSize:6, color:cell.chip.color, overflow:"hidden", whiteSpace:"nowrap" }}>{cell.chip.label}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div style={{ ...mono, fontSize:13, color:"#7A788E", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:8 }}>Legend</div>
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <div style={{ background:"#52A67A", borderRadius:3, padding:"2px 6px", fontSize:8, fontWeight:700, color:"#0A1A12", ...mono }}>PAY</div>
              <span style={{ fontSize:13, color:"#C0BEBA" }}>Paycheck · Bi-Weekly</span>
            </div>
            {[["Rent","Day 12","#E5635A"],["Visa","Day 14","#F0A500"]].map(([name,due,color])=>(
              <div key={name} style={{ display:"flex", alignItems:"center", gap:8 }}>
                <div style={{ width:10, height:10, borderRadius:3, background:color, flexShrink:0 }}/>
                <span style={{ fontSize:13, color:"#C0BEBA", flex:1 }}>{name}</span>
                <span style={{ ...mono, fontSize:11, color:"#7A788E" }}>{due}</span>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      title: <>What happens in <span style={{ color:"#FF6B6B", fontFamily:"'Dancing Script', cursive", fontSize:"1.3em", fontWeight:700 }}>Business</span>, stays in <span style={{ color:"#FF6B6B", fontFamily:"'Dancing Script', cursive", fontSize:"1.3em", fontWeight:700 }}>Business</span></>,
      body: "If you want to track your business budget, the income, bills, and debts are kept separate — only if that's how you like it.",
      example: "",
      mockup: (
        <div style={{ background:"#252836", border:"1px solid #2E3048", borderRadius:16, padding:"16px 16px", width:"100%" }}>
          <div style={{ display:"flex", gap:8, marginBottom:14 }}>
            <div style={{ display:"flex", alignItems:"center", gap:6, padding:"6px 12px", borderRadius:99, border:"1.5px solid #FF6B6B", background:"#FF6B6B18" }}>
              <span style={{ fontSize:12 }}>🏠</span>
              <span style={{ fontSize:13, color:"#FF6B6B", fontWeight:500 }}>Personal</span>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:6, padding:"6px 12px", borderRadius:99, border:`1.5px solid ${onbCombineDemo?"#4DABF7":"#2E3048"}`, background:onbCombineDemo?"#4DABF718":"transparent" }}>
              <span style={{ fontSize:12 }}>💼</span>
              <span style={{ fontSize:13, color:onbCombineDemo?"#4DABF7":"#7A788E", fontWeight:500 }}>Business</span>
            </div>
          </div>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <span style={{ ...mono, fontSize:15, color:"#7A788E", textTransform:"uppercase", letterSpacing:"0.06em" }}>Combine Finances</span>
            <button onClick={()=>setOnbCombineDemo(v=>!v)} style={{ display:"flex", alignItems:"center", gap:8, background:"none", border:"none", cursor:"pointer", padding:0 }}>
              <div style={{ width:44, height:24, borderRadius:99, background:onbCombineDemo?"#4DABF7":"#2E3048", position:"relative", transition:"background 0.2s" }}>
                <div style={{ position:"absolute", top:3, left:onbCombineDemo?22:3, width:18, height:18, borderRadius:99, background:"#fff", boxShadow:"0 1px 4px rgba(0,0,0,0.35)", transition:"left 0.2s" }}/>
              </div>
            </button>
          </div>
          <div style={{ fontSize:13, color:"#7A788E", marginTop:8 }}>{onbCombineDemo?"Merged — go ahead, tap it back off.":"Try tapping the switch."}</div>
        </div>
      ),
    },
    {
      title: <><span style={{ color:"#9B72CF", fontFamily:"'Dancing Script', cursive", fontSize:"1.3em", fontWeight:700 }}>Vibes</span> matter too</>,
      body: "Pick from our many themes.",
      example: "",
      mockup: (
        <div style={{ width:"100%" }}>
          <div style={{ display:"flex", gap:8, marginBottom:12 }}>
            {[
              ["dark","Dark","#12141F","#2E3048","#7A788E"],
              ["midnight","Midnight","#07091A","#20243C","#6870A0"],
              ["paper","Paper","#F4F2ED","#D8D4C8","#8A8578"],
              ["sage","Sage","#E8F0E8","#B0CCB0","#6A8A6A"],
            ].map(([key,name,bg,border,muted])=>(
              <button key={key} onClick={()=>setOnbThemeDemo(key)} style={{ flex:1, background:bg, border:`2px solid ${onbThemeDemo===key?"#4DABF7":border}`, borderRadius:10, padding:"10px 6px", display:"flex", flexDirection:"column", alignItems:"center", gap:5, cursor:"pointer" }}>
                <div style={{ display:"flex", gap:3 }}>
                  <div style={{ width:9, height:9, borderRadius:99, background:"#E5635A" }}/>
                  <div style={{ width:9, height:9, borderRadius:99, background:"#F0A500" }}/>
                  <div style={{ width:9, height:9, borderRadius:99, background:"#3DB8A0" }}/>
                </div>
                <span style={{ fontSize:10, color:muted }}>{name}</span>
              </button>
            ))}
          </div>
          <div style={{ fontSize:13, color:"#7A788E", textAlign:"center" }}>Tap one — same colors, every time.</div>
        </div>
      ),
    },
  ];

  const onbTourNext = () => {
    if (tourCard < TOUR_CARDS.length-1) setTourCard(c=>c+1);
    else { setOnboardingStep("paycheck"); setTourCard(0); }
  };
  const onbTourBack = () => {
    if (tourCard>0) setTourCard(c=>c-1);
    else setOnboardingStep("welcome");
  };

  if (onboardingStep) {
    const obAccent = "#4DABF7";
    const obBg = "#12141F", obCard="#1A1D2E", obBorder="#252840", obText="#E2DED8", obMuted="#7A788E", obSurface="#252836";
    return (
      <div style={{ height:"100vh", background:obBg, color:obText, fontFamily:"'Inter',system-ui,sans-serif", display:"flex", flexDirection:"column", position:"relative", overflow:"hidden" }}>
        <style>{`*{box-sizing:border-box;-webkit-tap-highlight-color:transparent;} html,body{background:${obBg};} input{outline:none;font-size:16px;} input[type=number]::-webkit-inner-spin-button,input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none;margin:0;} input[type=number]{-moz-appearance:textfield;} button:active{transform:scale(0.96);opacity:0.8;transition:transform .08s,opacity .08s;} @keyframes cardIn{from{opacity:0;transform:translateX(16px);}to{opacity:1;transform:translateX(0);}} .tour-card-in{animation:cardIn 0.28s ease-out;} @keyframes streamFlow{from{transform:translateX(0);}to{transform:translateX(-50%);}} @keyframes streamColor0{0%{stroke:#4DABF7;}33%{stroke:#E5635A;}66%{stroke:#F0A500;}100%{stroke:#4DABF7;}} @keyframes streamColor1{0%{stroke:#4DABF7;}33%{stroke:#9B72CF;}66%{stroke:#3DB8A0;}100%{stroke:#4DABF7;}} @keyframes streamColor2{0%{stroke:#F0A500;}33%{stroke:#E5635A;}66%{stroke:#4DABF7;}100%{stroke:#F0A500;}} @keyframes streamColor3{0%{stroke:#3DB8A0;}33%{stroke:#4DABF7;}66%{stroke:#FF6B6B;}100%{stroke:#3DB8A0;}} @keyframes streamColor4{0%{stroke:#DA77F2;}33%{stroke:#4DABF7;}66%{stroke:#3DB8A0;}100%{stroke:#DA77F2;}} @keyframes streamColor5{0%{stroke:#FF6B6B;}33%{stroke:#9B72CF;}66%{stroke:#F0A500;}100%{stroke:#FF6B6B;}} @keyframes streamColor6{0%{stroke:#9B72CF;}33%{stroke:#FF6B6B;}66%{stroke:#3DB8A0;}100%{stroke:#9B72CF;}}`}</style>

        {/* Soft background depth shapes — carried through every onboarding screen */}
        <div style={{ position:"absolute", top:"-10%", left:"-15%", width:260, height:260, borderRadius:"50%", background:"#4DABF7", opacity:0.08, filter:"blur(50px)" }}/>
        <div style={{ position:"absolute", bottom:"5%", right:"-10%", width:220, height:220, borderRadius:"50%", background:"#E5635A", opacity:0.08, filter:"blur(50px)" }}/>
        <div style={{ position:"absolute", top:"30%", right:"5%", width:140, height:140, borderRadius:"50%", background:"#3DB8A0", opacity:0.06, filter:"blur(40px)" }}/>

        {onboardingStep==="welcome"&&(
          <div style={{ flex:1, position:"relative", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"40px 28px", textAlign:"center", paddingTop:"calc(40px + env(safe-area-inset-top,0px))", paddingBottom:"calc(40px + env(safe-area-inset-bottom,0px))", overflow:"hidden" }}>
            <div style={{ width:88, height:88, borderRadius:24, background:"#1A1D2E", border:"1px solid #252840", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:28, position:"relative" }}>
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                <path d="M24 40V29M24 29C24 23 18 20 14 12" stroke="#4DABF7" strokeWidth="4" strokeLinecap="round" fill="none"/>
                <path d="M24 29C24 23 30 20 34 12" stroke="#E5635A" strokeWidth="4" strokeLinecap="round" fill="none"/>
                <circle cx="24" cy="41" r="3.2" fill="#3DB8A0"/>
              </svg>
            </div>
            <div style={{ fontSize:26, fontWeight:600, marginBottom:10, position:"relative" }}>Welcome to Streamline</div>
            <div style={{ fontSize:17, color:obMuted, lineHeight:1.5, marginBottom:36, maxWidth:320, position:"relative" }}>
              Plan your paycheck. Pay down debt. See where your money goes.
            </div>
            <button onClick={()=>setOnboardingStep("tour")} style={{ background:obAccent, color:"#0C1C2E", border:"none", borderRadius:12, padding:"14px 40px", fontSize:17, fontWeight:600, cursor:"pointer", fontFamily:"inherit", width:"100%", maxWidth:300, position:"relative" }}>Get Started</button>
          </div>
        )}

        {onboardingStep==="tour"&&(()=>{
          const c = TOUR_CARDS[tourCard];
          const isLast = tourCard===TOUR_CARDS.length-1;
          return (
            <div style={{ flex:1, display:"flex", flexDirection:"column", padding:"24px 24px", paddingTop:"calc(24px + env(safe-area-inset-top,0px))", paddingBottom:"calc(24px + env(safe-area-inset-bottom,0px))" }}
              onTouchStart={e=>{ e.currentTarget.dataset.sx = e.touches[0].clientX; }}
              onTouchEnd={e=>{ const sx=parseFloat(e.currentTarget.dataset.sx||0); const dx=e.changedTouches[0].clientX-sx; if(dx<-50) onbTourNext(); else if(dx>50) onbTourBack(); }}>
              <div style={{ display:"flex", gap:6, justifyContent:"center", marginBottom:"auto", paddingBottom:20 }}>
                {TOUR_CARDS.map((_,i)=>(
                  <div key={i} style={{ width:tourCard===i?18:6, height:6, borderRadius:99, background:tourCard===i?obAccent:obBorder, transition:"all 0.2s" }}/>
                ))}
              </div>
              <div key={tourCard} className="tour-card-in" style={{ flex:1, display:"flex", flexDirection:"column", justifyContent:"center", maxWidth:420, margin:"0 auto", width:"100%", overflowY:"auto" }}>
                <div style={{ fontSize:26, fontWeight:700, marginBottom:12, lineHeight:1.25 }}>{c.title}</div>
                {(()=>{
                  const colorAnim = `streamColor${tourCard} 6s linear infinite`;
                  return (
                    <div style={{ width:"100%", overflow:"hidden", height:22, marginBottom:14 }}>
                      <div style={{ display:"flex", width:"200%", animation:"streamFlow 9s linear infinite" }}>
                        <svg width="50%" height="22" viewBox="0 0 400 22" preserveAspectRatio="none" style={{ flexShrink:0, display:"block" }}>
                          <path d="M0 11 Q50 1 100 11 T200 11 T300 11 T400 11" fill="none" strokeWidth="3" strokeLinecap="round" style={{ animation:colorAnim }}/>
                        </svg>
                        <svg width="50%" height="22" viewBox="0 0 400 22" preserveAspectRatio="none" style={{ flexShrink:0, display:"block" }}>
                          <path d="M0 11 Q50 1 100 11 T200 11 T300 11 T400 11" fill="none" strokeWidth="3" strokeLinecap="round" style={{ animation:colorAnim }}/>
                        </svg>
                      </div>
                    </div>
                  );
                })()}
                {c.body&&<div style={{ fontSize:16, color:obText, lineHeight:1.55, marginBottom:16 }}>{c.body}</div>}
                {c.example&&<div style={{ fontSize:15, color:obMuted, lineHeight:1.5, marginBottom:10 }}>{c.example}</div>}
                {c.mockup&&<div style={{ display:"flex" }}>{c.mockup}</div>}
              </div>
              <div style={{ display:"flex", gap:10, maxWidth:420, margin:"20px auto 0", width:"100%" }}>
                <button onClick={onbTourBack} style={{ background:"none", border:`1.5px solid ${obBorder}`, color:obMuted, borderRadius:12, padding:"14px 20px", fontSize:16, fontWeight:500, cursor:"pointer", fontFamily:"inherit" }}>Back</button>
                <button onClick={onbTourNext} style={{ flex:1, background:obAccent, color:"#0C1C2E", border:"none", borderRadius:12, padding:"14px 20px", fontSize:17, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>{isLast?"Let's go!":"Next"}</button>
              </div>
            </div>
          );
        })()}

        {onboardingStep==="paycheck"&&(
          <div style={{ flex:1, display:"flex", flexDirection:"column", justifyContent:"center", padding:"24px 24px", paddingTop:"calc(24px + env(safe-area-inset-top,0px))", paddingBottom:"calc(24px + env(safe-area-inset-bottom,0px))", minHeight:0, overflow:"hidden" }}>
            <div style={{ maxWidth:380, margin:"0 auto", width:"100%" }}>
              <div style={{ width:64, height:64, borderRadius:18, background:obCard, border:`1px solid ${obBorder}`, display:"flex", alignItems:"center", justifyContent:"center", marginBottom:20 }}>
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                  <circle cx="16" cy="16" r="13" fill="#F0A500" opacity="0.16"/>
                  <circle cx="16" cy="16" r="13" stroke="#F0A500" strokeWidth="2"/>
                  <path d="M16 10v12M12.5 12.5c0-1.4 1.5-2.5 3.5-2.5s3.5 1.1 3.5 2.4c0 3-7 1.4-7 4.4 0 1.3 1.6 2.4 3.5 2.4s3.5-1 3.5-2.4" stroke="#F0A500" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
                </svg>
              </div>
              <div style={{ fontSize:24, fontWeight:600, marginBottom:8 }}>What's your paycheck?</div>
              <div style={{ fontSize:16, color:obMuted, lineHeight:1.5, marginBottom:24 }}>Powers every number in the app. Change it anytime.</div>

              <div style={{ display:"flex", flexDirection:"column", gap:12, marginBottom:24 }}>
                <div style={{ background:obSurface, borderRadius:10, border:`1.5px solid ${parse(onbPaycheck.amount)>0?obAccent:obBorder}`, padding:"12px 14px" }}>
                  <div style={{ ...mono, fontSize:11, color:obMuted, marginBottom:4 }}>AMOUNT</div>
                  <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                    <span style={{ ...mono, fontSize:22, color:obAccent }}>$</span>
                    <input type="number" min="0" placeholder="0.00" value={onbPaycheck.amount} onChange={e=>setOnbPaycheck(o=>({...o,amount:e.target.value}))} style={{ background:"none", border:"none", color:obText, ...mono, fontSize:24, fontWeight:500, width:"100%", padding:0 }} />
                  </div>
                </div>
                <div style={{ background:obSurface, borderRadius:10, border:`1.5px solid ${obBorder}`, padding:"12px 14px", position:"relative" }}>
                  <div style={{ ...mono, fontSize:11, color:obMuted, marginBottom:4 }}>FREQUENCY</div>
                  <button type="button" onClick={()=>setOnbFreqOpen(v=>!v)} style={{ background:"none", border:"none", color:obText, fontFamily:"inherit", fontSize:17, width:"100%", cursor:"pointer", padding:0, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                    <span>{FREQ_LABEL[onbPaycheck.freq]}</span>
                    <span style={{ color:obMuted, fontSize:15, transform:onbFreqOpen?"rotate(180deg)":"none", transition:"transform 0.15s" }}>▾</span>
                  </button>
                  {onbFreqOpen&&(
                    <div style={{ position:"absolute", top:"calc(100% + 6px)", left:0, right:0, background:obCard, border:`1px solid ${obBorder}`, borderRadius:10, overflow:"hidden", zIndex:10, boxShadow:"0 8px 24px rgba(0,0,0,0.4)" }}>
                      {Object.entries(FREQ_LABEL).map(([v,l])=>(
                        <button key={v} type="button" onClick={()=>{ setOnbPaycheck(o=>({...o,freq:v})); setOnbFreqOpen(false); }} style={{ display:"block", width:"100%", textAlign:"left", background:onbPaycheck.freq===v?`${obAccent}18`:"none", border:"none", color:onbPaycheck.freq===v?obAccent:obText, fontFamily:"inherit", fontSize:16, padding:"11px 14px", cursor:"pointer" }}>{l}</button>
                      ))}
                    </div>
                  )}
                </div>
                {onbFreqOpen&&<div onClick={()=>setOnbFreqOpen(false)} style={{ position:"fixed", inset:0, zIndex:5 }}/>}
              </div>

              <button onClick={()=>{
                if (parse(onbPaycheck.amount)>0) {
                  setPaycheckRaw(prev=>({...prev, personal:String(parse(onbPaycheck.amount))}));
                  setPaycheckInput(prev=>({...prev, personal:String(parse(onbPaycheck.amount))}));
                  setFrequency(prev=>({...prev, personal:onbPaycheck.freq}));
                  setStartDate(prev=>({...prev, personal:onbPaycheck.date}));
                }
                setOnboardingStep("debt");
              }} style={{ width:"100%", background:obAccent, color:"#0C1C2E", border:"none", borderRadius:12, padding:"14px", fontSize:17, fontWeight:600, cursor:"pointer", fontFamily:"inherit", marginBottom:12 }}>Continue</button>
              <button onClick={()=>setOnboardingStep("debt")} style={{ width:"100%", background:"none", border:"none", color:obMuted, fontSize:16, cursor:"pointer", fontFamily:"inherit", padding:"6px" }}>Skip for now</button>
            </div>
          </div>
        )}

        {onboardingStep==="debt"&&(
          <div style={{ flex:1, display:"flex", flexDirection:"column", padding:"24px 24px", paddingTop:"calc(24px + env(safe-area-inset-top,0px))", paddingBottom:"calc(24px + env(safe-area-inset-bottom,0px))", minHeight:0, overflow:"hidden" }}>
            <div style={{ maxWidth:380, margin:"0 auto", width:"100%", display:"flex", flexDirection:"column", minHeight:0, flex:1 }}>
              <div style={{ width:64, height:64, borderRadius:18, background:obCard, border:`1px solid ${obBorder}`, display:"flex", alignItems:"center", justifyContent:"center", marginBottom:20, flexShrink:0 }}>
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                  <rect x="4" y="8" width="24" height="17" rx="3.5" fill="#E5635A" opacity="0.16"/>
                  <rect x="4" y="8" width="24" height="17" rx="3.5" stroke="#E5635A" strokeWidth="2"/>
                  <path d="M4 13.5h24" stroke="#E5635A" strokeWidth="2"/>
                </svg>
              </div>
              <div style={{ fontSize:24, fontWeight:600, marginBottom:8, flexShrink:0 }}>Tracking a debt?</div>
              <div style={{ fontSize:16, color:obMuted, lineHeight:1.5, marginBottom:20, flexShrink:0 }}>Optional — add as many as you like. You can always add more later from Debts.</div>

              <div style={{ flex:1, overflowY:"auto", minHeight:0 }}>
                {onbDebts.length>0&&(
                  <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:16 }}>
                    {onbDebts.map((d,i)=>(
                      <div key={i} style={{ display:"flex", alignItems:"center", gap:10, background:obSurface, border:`1px solid ${obBorder}`, borderRadius:10, padding:"10px 12px" }}>
                        <div style={{ width:22, height:22, borderRadius:99, background:"#E5635A1A", border:"1.5px solid #E5635A", display:"flex", alignItems:"center", justifyContent:"center", ...mono, fontSize:11, fontWeight:700, color:"#E5635A", flexShrink:0 }}>{i+1}</div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:16, color:obText, fontWeight:500 }}>{d.name}</div>
                          <div style={{ fontSize:13, color:obMuted }}>${d.balance||0} · {d.rate||0}%</div>
                        </div>
                        <button onClick={()=>setOnbDebts(list=>list.filter((_,idx)=>idx!==i))} style={{ background:"none", border:"none", color:obMuted, fontSize:17, cursor:"pointer", padding:"2px 4px", lineHeight:1 }}>×</button>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                  <input placeholder="Debt name (Visa, Student Loan…)" value={onbDebt.name} onChange={e=>setOnbDebt(o=>({...o,name:e.target.value}))} style={{ background:obSurface, border:`1.5px solid ${obBorder}`, borderRadius:10, padding:"12px 14px", color:obText, fontFamily:"inherit", fontSize:17, width:"100%" }} />
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
                    {[["Balance","$","balance"],["Rate","%","rate"],["Min. Pmt","$","minPayment"]].map(([label,pre,field])=>(
                      <div key={field} style={{ background:obSurface, borderRadius:10, border:`1.5px solid ${obBorder}`, padding:"10px 12px" }}>
                        <div style={{ ...mono, fontSize:10, color:obMuted, marginBottom:3 }}>{label}</div>
                        <div style={{ display:"flex", alignItems:"center", gap:2 }}>
                          <span style={{ fontSize:13, color:obMuted }}>{pre}</span>
                          <input type="number" min="0" value={onbDebt[field]} onChange={e=>setOnbDebt(o=>({...o,[field]:e.target.value}))} style={{ background:"none", border:"none", color:obText, ...mono, fontSize:17, width:"100%", padding:0 }} />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ background:obSurface, borderRadius:10, border:`1.5px solid ${obBorder}`, padding:"10px 12px" }}>
                    <div style={{ ...mono, fontSize:10, color:obMuted, marginBottom:3 }}>DUE DAY OF MONTH (OPTIONAL) · SHOWS ON CALENDAR</div>
                    <div style={{ display:"flex", alignItems:"center", gap:2 }}>
                      <input type="number" min="1" max="31" placeholder="e.g. 15" value={onbDebt.dueDay} onChange={e=>setOnbDebt(o=>({...o,dueDay:e.target.value}))} style={{ background:"none", border:"none", color:obText, ...mono, fontSize:17, width:"100%", padding:0 }} />
                    </div>
                  </div>
                  {onbDebt.name.trim()&&(
                    <button onClick={()=>{
                      setOnbDebts(list=>[...list, onbDebt]);
                      setOnbDebt({ name:"", balance:"", rate:"", minPayment:"", dueDay:"" });
                    }} style={{ width:"100%", background:"none", border:`1.5px dashed ${obBorder}`, color:obMuted, borderRadius:10, padding:"11px", fontSize:16, cursor:"pointer", fontFamily:"inherit" }}>+ Add another debt</button>
                  )}
                </div>
              </div>

              <div style={{ flexShrink:0, paddingTop:16 }}>
                <button onClick={()=>{
                  const allDebts = onbDebt.name.trim() ? [...onbDebts, onbDebt] : onbDebts;
                  allDebts.forEach((entry,idx)=>{
                    const debtId = genId("d"); const catId = genId("c");
                    const debtColor = DEBT_COLORS[idx % DEBT_COLORS.length];
                    const hasDue = entry.dueDay && parse(entry.dueDay)>=1 && parse(entry.dueDay)<=31;
                    const nd = { ...entry, id:debtId, color:debtColor, linkedCatId:catId, dueType:hasDue?"day":"", dueDay:hasDue?entry.dueDay:"", dueFreq:"monthly", dueStart:today, extraPayment:"", balanceHistory:[{date:today, balance:entry.balance, note:"Initial balance"}] };
                    const linkedCat = { id:catId, name:entry.name, type:"bills", color:debtColor, amount:String(parse(entry.minPayment)||0), target:"", catFreq:"monthly", dueType:hasDue?"day":"", dueDay:hasDue?entry.dueDay:"", dueFreq:"monthly", dueStart:today, isDebtLinked:true, linkedDebtId:debtId };
                    setDebts(prev=>({...prev, personal:[...(prev.personal||[]), nd]}));
                    setCategories(prev=>({...prev, personal:[...(prev.personal||[]), linkedCat]}));
                  });
                  setHasCompletedOnboarding(true); setOnboardingStep(null);
                }} style={{ width:"100%", background:obAccent, color:"#0C1C2E", border:"none", borderRadius:12, padding:"14px", fontSize:17, fontWeight:600, cursor:"pointer", fontFamily:"inherit", marginBottom:12 }}>Finish</button>
                {onbDebts.length===0&&!onbDebt.name.trim()&&(
                  <button onClick={()=>{ setHasCompletedOnboarding(true); setOnboardingStep(null); }} style={{ width:"100%", background:"none", border:"none", color:obMuted, fontSize:16, cursor:"pointer", fontFamily:"inherit", padding:"6px" }}>Skip for now</button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ minHeight:"100vh", background:T.bg, color:T.text, fontFamily:"'Inter',system-ui,sans-serif", paddingBottom:"calc(90px + env(safe-area-inset-bottom, 0px))", overscrollBehaviorY:"contain" }}>
      <style>{`
        *{box-sizing:border-box; -webkit-tap-highlight-color:transparent;}
        /* Absolutely-positioned dropdowns (calendar, frequency pickers) don't count
           toward their container's height. If one pops open near the bottom of a long
           scrollable page, it can render past where the app's own dark background
           naturally ends — exposing the raw white page background underneath. Setting
           the true page background to match the theme means nothing can ever bleed
           through to white, regardless of the exact popup's position. */
        html, body{background:${T.bg};}
        input,select{outline:none; font-size:16px;}
        input[type=number]::-webkit-inner-spin-button,input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none;margin:0;}
        input[type=number]{-moz-appearance:textfield;}
        .fill{transition:width 0.35s cubic-bezier(.4,0,.2,1);}
        /* Edit button: hidden-until-hover ONLY on devices with a real mouse/trackpad.
           Touch devices (no true hover) always show it, since there's no hover state
           to reveal it otherwise. */
        @media (hover: hover) and (pointer: fine) {
          .cat-card .ha{opacity:0;transition:opacity 0.12s;} .cat-card:hover .ha{opacity:1;}
          .sw:hover{transform:scale(1.15);}
          .da:hover{border-color:${accent}!important;color:${accent}!important;}
          .tb:hover{color:${T.sub}!important;}
        }
        .sw{transition:transform 0.1s;cursor:pointer;}
        select option{background:${T.card};}
        /* Touch-press feedback — the "haptic-adjacent" visual response since real haptics
           aren't available in a web view. Applies on all devices; harmless on desktop too. */
        button{-webkit-tap-highlight-color:transparent;}
        button:active, .sw:active, .cat-card .ha:active{transform:scale(0.94); opacity:0.75; transition:transform 0.08s, opacity 0.08s;}
        /* Momentum scrolling + no rubber-band overscroll bleeding into the page */
        .scroll-touch{-webkit-overflow-scrolling:touch; overscroll-behavior:contain;}
        /* Expands the tappable area of small icon buttons to the ~44px minimum touch target
           recommended by Apple/Google, without changing how the button visually looks or
           affecting the tight row layouts it sits in — the extra hit area is an invisible,
           absolutely-positioned overlay that doesn't take up space in the normal flow. */
        .tap-target{position:relative;}
        .tap-target::before{content:'';position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:44px;height:44px;}
        /* Phones get the original comfortable single-column width (640px). iPads and Android
           tablets get progressively more room instead of sitting in a narrow centered column
           with large empty margins on either side. */
        .app-container{max-width:640px;margin:0 auto;}
        @media (min-width:768px){.app-container{max-width:820px;}}
        @media (min-width:1024px){.app-container{max-width:960px;}}
      `}</style>

      {/* ── HEADER ─────────────────────────────────────────────────────── */}
      <div style={{ background:T.card, borderBottom:`1px solid ${T.border}`, padding:"14px 0 0", paddingTop:"calc(14px + env(safe-area-inset-top, 0px))" }}>
        <div className="app-container" style={{ padding:"0 18px" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
            <div>
              <div style={{ ...mono, fontSize:13, letterSpacing:"0.14em", color:"#F0A500", textTransform:"uppercase" }}>Streamline</div>
              {pcVal>0&&<div style={{ fontSize:15, color:T.muted, marginTop:2 }}>{fmt(monthlyIncome)}/mo est. · {FREQ_LABEL[freq]}</div>}
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              <Toggle on={businessEnabled} onChange={v=>{setBusinessEnabled(v);if(!v&&activeProfile==="business")switchProfile("personal");}} label="Business" color="#F0A500" T={T} />
            </div>
          </div>
          {businessEnabled&&(
            <div style={{ display:"flex", gap:6, marginBottom:12, flexWrap:"wrap" }}>
              {["personal","business"].map(prof=>{
                const m=PROFILE_META[prof], active=activeProfile===prof, a=profileAccents[prof];
                return <button key={prof} onClick={()=>switchProfile(prof)} style={{ display:"flex", alignItems:"center", gap:6, padding:"6px 14px", borderRadius:99, border:`1.5px solid ${active?a:T.border2}`, background:active?`${a}18`:"transparent", color:active?a:T.muted, cursor:"pointer", fontFamily:"inherit", fontSize:15, fontWeight:500, transition:"all 0.15s" }}><span>{m.icon}</span><span>{m.label}</span>{active&&<span style={{ width:6,height:6,borderRadius:99,background:a }}/>}</button>;
              })}
              {combineFinances&&(
                <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:6 }}>
                  <span style={{ fontSize:13, color:T.muted }}>Combined:</span>
                  <span style={{ ...mono, fontSize:15, color:T.text }}>{fmt((parse(paycheckRaw.personal)*(FREQ_PER_YEAR[frequency.personal]/12))+(parse(paycheckRaw.business)*(FREQ_PER_YEAR[frequency.business]/12)))}/mo</span>
                </div>
              )}
            </div>
          )}
          <div style={{ display:"flex", borderTop:`1px solid ${T.border}`, overflowX:"auto", WebkitOverflowScrolling:"touch" }} className="scroll-touch">
            {[["budget","Budget"],["debts","Debts"],["calculator","Income"],["calendar","Calendar"],["settings","Settings"]].map(([key,label])=>(
              <button key={key} className="tb" onClick={()=>setTab(key)} style={{ background:"none", border:"none", borderBottom:`2px solid ${tab===key?accent:"transparent"}`, color:tab===key?accent:T.muted, fontFamily:"inherit", fontSize:16, fontWeight:500, padding:"13px 14px", cursor:"pointer", transition:"color 0.15s", whiteSpace:"nowrap", flexShrink:0 }}>{label}</button>
            ))}
          </div>
          {/* Live per-tab summary strip */}
          {(()=>{
            let content = null;
            if (tab==="budget" && pcVal>0) content = (
              <><span style={{ color:T.muted }}>Unallocated:</span> <span style={{ ...mono, color:isOver?COLOR_DANGER:remaining===0?COLOR_SUCCESS:accent, fontWeight:600 }}>{fmt(Math.abs(remaining))}</span>{isOver?" over":""}</>
            );
            else if (tab==="calendar" && pcVal>0) content = (
              <><span style={{ color:T.muted }}>This month:</span> <span style={{ ...mono, color:outlookData.net>=0?COLOR_SUCCESS:COLOR_DANGER, fontWeight:600 }}>{fmt(Math.abs(outlookData.net))}</span> {outlookData.net>=0?"surplus":"shortfall"}</>
            );
            else if (tab==="debts" && dts.length>0) content = (
              <><span style={{ color:T.muted }}>Debt-free in:</span> <span style={{ ...mono, color:COLOR_SUCCESS, fontWeight:600 }}>{maxPayoffMonth?`${maxPayoffMonth} mo`:"—"}</span> <span style={{ color:T.muted }}>·</span> <span style={{ ...mono, color:COLOR_DANGER }}>{fmt((debts[p]||[]).reduce((s,d)=>s+parse(d.balance),0))}</span> <span style={{ color:T.muted }}>owed</span></>
            );
            else if (tab==="calculator" && calcTotals.totalMonthly>0) content = (
              <><span style={{ color:T.muted }}>{calcTotals.surplus>=0?"Surplus":"Shortfall"}:</span> <span style={{ ...mono, color:calcTotals.surplus>=0?COLOR_SUCCESS:COLOR_DANGER, fontWeight:600 }}>{fmt(Math.abs(calcTotals.surplus))}</span> <span style={{ color:T.muted }}>per {FREQ_LABEL[calcFreq].toLowerCase()}</span></>
            );
            if (!content) return null;
            return <div style={{ padding:"8px 0", fontSize:15, borderTop:`1px solid ${T.border}` }}>{content}</div>;
          })()}
        </div>
      </div>

      <div className="app-container" style={{ padding:"20px 18px 0" }}>
        {/* Profile pill */}
        {businessEnabled&&<div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:16, padding:"7px 14px", background:`${accent}10`, borderRadius:99, border:`1px solid ${accent}28`, width:"fit-content" }}><span style={{ fontSize:14 }}>{PROFILE_META[p].icon}</span><span style={{ fontSize:15, color:accent, fontWeight:500 }}>{PROFILE_META[p].label} View</span></div>}

        {/* ══════════════ BUDGET TAB ══════════════════════════════════════ */}
        {tab==="budget"&&(<>
          {/* Paycheck setup */}
          <div style={{ ...card(), marginBottom:20 }}>
            <div style={{ ...mono, fontSize:13, letterSpacing:"0.12em", textTransform:"uppercase", color:T.muted, marginBottom:12 }}>Paycheck Setup · {PROFILE_META[p].label}</div>
            <div style={{ display:"flex", gap:10, marginBottom:(freq==="weekly"||freq==="biweekly")?10:0 }}>
              <div style={{ flex:1, background:T.surface, borderRadius:10, border:`1.5px solid ${pcVal>0?accent:T.border2}`, padding:"10px 14px" }}>
                <div style={{ ...mono, fontSize:11, color:T.muted, marginBottom:3 }}>AMOUNT</div>
                <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                  <span style={{ ...mono, fontSize:22, color:accent }}>$</span>
                  <input type="number" min="0" placeholder="0.00" value={paycheckInput[p]}
                    onChange={e=>setPaycheckInput(prev=>({...prev,[p]:e.target.value}))}
                    onBlur={()=>{ const n=parse(paycheckInput[p]); const v=n>0?String(n):""; setPaycheckRaw(prev=>({...prev,[p]:v})); setPaycheckInput(prev=>({...prev,[p]:v})); }}
                    style={{ background:"none", border:"none", color:T.text, ...mono, fontSize:24, fontWeight:500, width:"100%", padding:0 }} />
                </div>
              </div>
              <div style={{ background:T.surface, borderRadius:10, border:`1.5px solid ${T.border2}`, padding:"10px 14px", minWidth:150 }}>
                <div style={{ ...mono, fontSize:11, color:T.muted, marginBottom:3 }}>FREQUENCY</div>
                <Dropdown value={freq} onChange={v=>setFrequency(prev=>({...prev,[p]:v}))} options={Object.entries(FREQ_LABEL)} T={T} accent={accent} mono={mono} />
              </div>
            </div>
            <div style={{ background:T.surface, borderRadius:10, border:`1.5px solid ${T.border2}`, padding:"10px 14px" }}>
              <div style={{ ...mono, fontSize:11, color:T.muted, marginBottom:3 }}>NEXT PAYCHECK DATE</div>
              <DateField value={startDate[p]} onChange={v=>setStartDate(prev=>({...prev,[p]:v}))} T={T} accent={accent} mono={mono} inp={inp} />
            </div>
          </div>

          {/* Allocation bar */}
          {pcVal>0&&(
            <div style={{ marginBottom:22 }}>
              <div style={{ height:6, borderRadius:99, background:T.surface, overflow:"hidden", display:"flex", marginBottom:8 }}>
                {["bills","spending","savings"].map(type=>{ const tot=cats.filter(c=>c.type===type).reduce((s,c)=>s+toMonthly(c.amount,c.catFreq),0); const pp=toPerPeriod(tot,freq); const w=Math.min(100,(pp/pcVal)*100); return w>0?<div key={type} className="fill" style={{ height:"100%", background:TC[type], width:`${w}%` }}/>:null; })}
              </div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:12 }}>
                {["bills","spending","savings"].map(type=>{ const tot=cats.filter(c=>c.type===type).reduce((s,c)=>s+toMonthly(c.amount,c.catFreq),0); const pp=toPerPeriod(tot,freq); return <div key={type} style={{ display:"flex", alignItems:"center", gap:5 }}><div style={{ width:7,height:7,borderRadius:99,background:TC[type] }}/><span style={{ fontSize:13, color:T.muted }}>{type}</span><span style={{ ...mono, fontSize:13, color:T.sub }}>{fmt(pp)}</span></div>; })}
              </div>
            </div>
          )}

          {/* Category groups */}
          {["bills","spending","savings"].map(type=>{
            const tc=cats.filter(c=>c.type===type);
            if (!tc.length) return null;
            const typeMonthly=tc.reduce((s,c)=>s+toMonthly(c.amount,c.catFreq),0);
            const typePerPeriod=toPerPeriod(typeMonthly,freq);
            return (
              <div key={type} style={{ marginBottom:24 }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                    <div style={{ width:8, height:8, borderRadius:99, background:TC[type] }}/>
                    <span style={{ ...mono, fontSize:13, letterSpacing:"0.1em", textTransform:"uppercase", color:T.muted }}>{type}</span>
                  </div>
                  {typeMonthly>0&&<span style={{ ...mono, fontSize:13, color:TC[type] }}>{fmt(typePerPeriod)}/period</span>}
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  {tc.map(cat=>{
                    const monthly=toMonthly(cat.amount,cat.catFreq);
                    const pp=toPerPeriod(monthly,freq);
                    const ppPct=pcVal>0?Math.min(100,(pp/pcVal)*100):0;
                    const tgt=parseFloat(cat.target)||0;
                    const tgtAmt=monthlyIncome*tgt/100;
                    const metTgt=monthly>=tgtAmt&&tgt>0;
                    const isEditing=editId===cat.id;
                    const cfLabel=CAT_FREQ_LABEL[cat.catFreq||"monthly"];
                    return (
                      <div key={cat.id} className="cat-card" style={{ ...card({ padding:isEditing?14:"12px 14px", border:`1.5px solid ${isEditing?TC[cat.type]:T.border}`, overflow:isEditing?"visible":"hidden", position:"relative" }) }}>
                        {!isEditing&&ppPct>0&&<div className="fill" style={{ position:"absolute", left:0, top:0, bottom:0, width:`${ppPct}%`, background:`${TC[cat.type]}10`, borderRight:`1.5px solid ${TC[cat.type]}25`, pointerEvents:"none" }}/>}
                        {isEditing?(
                          <div>
                            <div style={{ display:"flex", gap:8, marginBottom:10 }}>
                              <input value={cat.name} onChange={e=>updateCat(cat.id,{name:e.target.value})} style={{ ...inp(), flex:1 }} />
                              <div style={{ ...inp() }}>
                                <Dropdown value={cat.type} onChange={v=>updateCat(cat.id,{type:v,color:TC[v]})} options={["bills","spending","savings"].map(v=>[v, v[0].toUpperCase()+v.slice(1)])} T={T} accent={accent} mono={mono} fontSize={14} align="right" />
                              </div>
                            </div>
                            {/* Amount + frequency */}
                            <div style={{ display:"flex", gap:8, marginBottom:10 }}>
                              <div style={{ flex:1, background:T.surface, borderRadius:8, border:`1px solid ${T.border2}`, padding:"8px 10px" }}>
                                <div style={{ ...mono, fontSize:11, color:T.muted, marginBottom:3 }}>AMOUNT</div>
                                <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                                  <span style={{ ...mono, fontSize:16, color:"#F0A500" }}>$</span>
                                  <input type="number" min="0" value={cat.amount} onChange={e=>updateCat(cat.id,{amount:e.target.value})} style={{ background:"none", border:"none", color:T.text, ...mono, fontSize:17, width:"100%", padding:0 }} />
                                </div>
                              </div>
                              <div style={{ flex:1, background:T.surface, borderRadius:8, border:`1px solid ${T.border2}`, padding:"8px 10px" }}>
                                <div style={{ ...mono, fontSize:11, color:T.muted, marginBottom:3 }}>FREQUENCY</div>
                                <Dropdown value={cat.catFreq||"monthly"} onChange={v=>updateCat(cat.id,{catFreq:v})} options={Object.entries(CAT_FREQ_LABEL)} T={T} accent={accent} mono={mono} align="right" />
                              </div>
                            </div>
                            {/* Target % */}
                            <div style={{ background:T.surface, borderRadius:8, border:`1px solid ${T.border2}`, padding:"8px 10px", marginBottom:10 }}>
                              <div style={{ ...mono, fontSize:11, color:T.muted, marginBottom:3 }}>TARGET % OF MONTHLY INCOME</div>
                              <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                                <input type="number" min="0" max="100" placeholder="—" value={cat.target} onChange={e=>updateCat(cat.id,{target:e.target.value})} style={{ background:"none", border:"none", color:T.text, ...mono, fontSize:17, flex:1, padding:0 }} />
                                <span style={{ color:T.muted, fontSize:12 }}>%</span>
                              </div>
                            </div>
                            {/* Due date editor (bills only) */}
                            {cat.type==="bills"&&<div style={{ marginBottom:12 }}><DueDateEditor cat={cat} onChange={patch=>updateCat(cat.id,patch)} T={T} TC={TC} mono={mono} inp={inp} accent={accent} /></div>}
                            <div style={{ display:"flex", gap:8 }}>
                              <button onClick={()=>setEditId(null)} style={{ flex:1, background:TC[cat.type], border:"none", borderRadius:8, padding:"9px", fontSize:16, fontWeight:600, cursor:"pointer", fontFamily:"inherit", color:"#12141F" }}>Done</button>
                              <button onClick={()=>removeCat(cat.id)} style={{ background:"rgba(229,99,90,0.12)", border:"1px solid rgba(229,99,90,0.3)", color:COLOR_DANGER, borderRadius:8, padding:"9px 14px", fontSize:16, cursor:"pointer", fontFamily:"inherit" }}>Remove</button>
                            </div>
                          </div>
                        ):(
                          cat.isDebtLinked ? (
                            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                              <div style={{ width:10,height:10,borderRadius:99,background:TC[cat.type],flexShrink:0 }}/>
                              <div style={{ flex:1, minWidth:0 }}>
                                <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
                                  <span style={{ fontSize:16, color:T.sub, fontWeight:500 }}>{cat.name}</span>
                                  <span style={{ background:`${TC[cat.type]}22`, color:TC[cat.type], fontSize:10, ...mono, padding:"2px 6px", borderRadius:4, fontWeight:700 }}>💳 DEBT</span>
                                </div>
                                <div style={{ fontSize:13, color:T.muted, marginTop:1 }}>{pcVal>0&&monthly>0&&<span>{fmt(pp)}/period</span>}</div>
                              </div>
                              <div style={{ display:"flex", alignItems:"center", background:T.surface, borderRadius:8, padding:"5px 10px", gap:4, border:`1px solid ${T.border2}`, flexShrink:0 }}>
                                <span style={{ ...mono, fontSize:15, color:TC[cat.type] }}>$</span>
                                <span style={{ ...mono, fontSize:17, fontWeight:500, color:T.text, width:76, textAlign:"right" }}>{cat.amount}</span>
                              </div>
                              <span style={{ ...mono, fontSize:10, color:T.muted, flexShrink:0 }}>{cfLabel.slice(0,2).toUpperCase()}</span>
                              <span aria-hidden="true" style={{ background:"none", border:"none", fontSize:17, padding:"2px 4px", lineHeight:1, opacity:0, pointerEvents:"none" }}>✎</span>
                            </div>
                          ) : (
                            <div style={{ position:"relative", display:"flex", alignItems:"center", gap:10 }}>
                              <div style={{ width:10,height:10,borderRadius:99,background:TC[cat.type],flexShrink:0 }}/>
                              <div style={{ flex:1, minWidth:0 }}>
                                <div style={{ fontSize:16, color:T.sub, fontWeight:500 }}>{cat.name}</div>
                                <div style={{ fontSize:13, color:T.muted, marginTop:1 }}>
                                  {tgt>0&&(metTgt?<span style={{ color:COLOR_SUCCESS, fontWeight:700 }}>✓</span>:monthly>0&&monthly<tgtAmt?<span>{fmt(tgtAmt-monthly)} short</span>:null)}
                                  {pcVal>0&&monthly>0&&<span>{tgt>0&&(metTgt||( monthly>0&&monthly<tgtAmt))&&" · "}{fmt(pp)}/period</span>}
                                </div>
                              </div>
                              <div style={{ display:"flex", alignItems:"center", background:T.surface, borderRadius:8, padding:"5px 10px", gap:4, border:`1px solid ${T.border2}`, flexShrink:0 }}>
                                <span style={{ ...mono, fontSize:15, color:"#F0A500" }}>$</span>
                                <input type="number" min="0" placeholder="0" value={cat.amount} onChange={e=>updateCat(cat.id,{amount:e.target.value})} style={{ background:"none", border:"none", color:T.text, ...mono, fontSize:17, fontWeight:500, width:76, textAlign:"right", padding:0 }} />
                              </div>
                              <span style={{ ...mono, fontSize:10, color:T.muted, flexShrink:0 }}>{cfLabel.slice(0,2).toUpperCase()}</span>
                              <button className="ha tap-target" onClick={()=>setEditId(cat.id)} style={{ background:"none", border:"none", color:T.muted, cursor:"pointer", fontSize:17, padding:"2px 4px", lineHeight:1 }}>✎</button>
                            </div>
                          )
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Add category */}
          {showAddCat?(
            <div style={{ ...card(), border:`1.5px solid ${accent}` }}>
              <input autoFocus placeholder="Category name" value={newCat.name} onChange={e=>setNewCat(n=>({...n,name:e.target.value}))} onKeyDown={e=>{if(e.key==="Enter")addCat();if(e.key==="Escape")setShowAddCat(false);}} style={{ ...inp(), width:"100%", marginBottom:10 }} />
              <div style={{ display:"flex", gap:8, marginBottom:10 }}>
                {["bills","spending","savings"].map(v=><button key={v} onClick={()=>setNewCat(n=>({...n,type:v,color:TC[v]}))} style={{ flex:1, border:`1.5px solid ${newCat.type===v?TC[v]:T.border2}`, background:newCat.type===v?`${TC[v]}20`:"transparent", color:newCat.type===v?TC[v]:T.muted, borderRadius:99, padding:"6px 0", fontSize:15, fontFamily:"inherit", cursor:"pointer", textTransform:"capitalize" }}>{v}</button>)}
              </div>
              <div style={{ display:"flex", gap:8, marginBottom:10 }}>
                <div style={{ flex:1, ...inp(), display:"flex", alignItems:"center", gap:4 }}>
                  <span style={{ ...mono, fontSize:15, color:"#F0A500" }}>$</span>
                  <input type="number" min="0" placeholder="Amount" value={newCat.amount||""} onChange={e=>setNewCat(n=>({...n,amount:e.target.value}))} style={{ background:"none", border:"none", color:T.text, ...mono, fontSize:17, flex:1, padding:0 }} />
                </div>
                <div style={{ ...inp(), flex:1 }}>
                  <Dropdown value={newCat.catFreq} onChange={v=>setNewCat(n=>({...n,catFreq:v}))} options={Object.entries(CAT_FREQ_LABEL)} T={T} accent={accent} mono={mono} fontSize={14} align="right" />
                </div>
              </div>
              <input type="number" min="0" max="100" placeholder="% target of monthly income (optional)" value={newCat.target} onChange={e=>setNewCat(n=>({...n,target:e.target.value}))} style={{ ...inp(), ...mono, width:"100%", marginBottom:10, fontSize:16 }} />
              {newCat.type==="bills"&&<div style={{ marginBottom:12 }}><DueDateEditor cat={newCat} onChange={patch=>setNewCat(n=>({...n,...patch}))} T={T} TC={TC} mono={mono} inp={inp} accent={accent} /></div>}
              <div style={{ display:"flex", gap:8 }}>
                <button onClick={addCat} style={{ flex:1, background:accent, color:"#12141F", border:"none", borderRadius:8, padding:"10px", fontSize:16, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>Add Category</button>
                <button onClick={()=>setShowAddCat(false)} style={{ background:T.surface, color:T.muted, border:"none", borderRadius:8, padding:"10px 16px", fontSize:16, cursor:"pointer", fontFamily:"inherit" }}>Cancel</button>
              </div>
            </div>
          ):(
            <button className="da" onClick={()=>setShowAddCat(true)} style={{ width:"100%", background:"transparent", border:`1.5px dashed ${T.border2}`, color:T.muted, borderRadius:12, padding:"13px", fontSize:16, cursor:"pointer", fontFamily:"inherit", transition:"all 0.15s" }}>+ Add Category</button>
          )}

          {pcVal>0&&(
            <div style={{ marginTop:24, padding:"16px 20px", background:isOver?"rgba(229,99,90,0.08)":remaining===0?"rgba(82,166,122,0.08)":`${accent}08`, border:`1.5px solid ${isOver?"rgba(229,99,90,0.3)":remaining===0?"rgba(82,166,122,0.25)":`${accent}28`}`, borderRadius:12, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <div>
                <div style={{ fontSize:16, color:isOver?COLOR_DANGER:remaining===0?COLOR_SUCCESS:accent }}>{isOver?"Over budget":remaining===0?"Fully allocated ✓":"Unallocated per period"}</div>
                {pcVal>0&&<div style={{ fontSize:13, color:T.muted, marginTop:2 }}>Categories total: {fmt(catPerPeriod)}/period · {fmt(catMonthlyTotal)}/mo</div>}
              </div>
              <span style={{ ...mono, fontSize:24, fontWeight:500, color:isOver?COLOR_DANGER:remaining===0?COLOR_SUCCESS:accent }}>{fmt(Math.abs(remaining))}</span>
            </div>
          )}
        </>)}

        {/* ══════════════ CALENDAR TAB ════════════════════════════════════ */}
        {tab==="calendar"&&(<>
          {/* Donut chart */}
          <div style={{ ...card(), marginBottom:20 }}>
            <div style={{ textAlign:"center", marginBottom:16 }}>
              <div style={{ ...mono, fontSize:11, textTransform:"uppercase", letterSpacing:"0.12em", color:T.muted, marginBottom:4 }}>Total Monthly Budget</div>
              <div style={{ ...mono, fontSize:22, fontWeight:700, color:T.text }}>{fmt(donutTotal)}<span style={{ fontSize:13, color:T.muted, fontWeight:400 }}> /mo</span></div>
            </div>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:24, flexWrap:"wrap" }}>
              <DonutChart segments={donutSegments} centerLabel="" centerSub="" size={170} T={T} />
              <div style={{ flex:1, minWidth:150 }}>
                <div style={{ ...mono, fontSize:11, textTransform:"uppercase", letterSpacing:"0.12em", color:T.muted, marginBottom:12 }}>Budget Breakdown</div>
                {donutSegments.length>0?(
                  <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                    {donutSegments.map(seg=>{
                      const pct=donutTotal>0?((seg.value/donutTotal)*100).toFixed(0):0;
                      return (
                        <div key={seg.label}>
                          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                              <div style={{ width:8,height:8,borderRadius:99,background:seg.color }}/>
                              <span style={{ fontSize:12, color:T.sub, textTransform:"capitalize" }}>{seg.label}</span>
                            </div>
                            <div style={{ display:"flex", gap:8 }}>
                              <span style={{ ...mono, fontSize:12, color:T.muted }}>{pct}%</span>
                              <span style={{ ...mono, fontSize:12, color:seg.color }}>{fmt(seg.value)}</span>
                            </div>
                          </div>
                          <div style={{ height:4, borderRadius:99, background:T.surface }}>
                            <div className="fill" style={{ height:"100%", borderRadius:99, background:seg.color, width:`${pct}%` }}/>
                          </div>
                        </div>
                      );
                    })}
                </div>
              ):<span style={{ fontSize:12, color:T.muted }}>Add amounts to categories to see your breakdown</span>}
              </div>
            </div>
          </div>

          {/* CALENDAR VIEW ─────────────────────────────────────────────── */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
            <button onClick={()=>setCalMonth(m=>new Date(m.getFullYear(),m.getMonth()-1,1))} style={{ background:T.card, border:`1px solid ${T.border}`, color:T.text, borderRadius:8, padding:"7px 16px", cursor:"pointer", fontFamily:"inherit", fontSize:18, lineHeight:1 }}>‹</button>
            <span style={{ ...mono, fontSize:15, color:T.text }}>{calMonth.toLocaleString("default",{month:"long",year:"numeric"})}</span>
            <button onClick={()=>setCalMonth(m=>new Date(m.getFullYear(),m.getMonth()+1,1))} style={{ background:T.card, border:`1px solid ${T.border}`, color:T.text, borderRadius:8, padding:"7px 16px", cursor:"pointer", fontFamily:"inherit", fontSize:18, lineHeight:1 }}>›</button>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:4, marginBottom:4 }}>
            {["Su","Mo","Tu","We","Th","Fr","Sa"].map(d=><div key={d} style={{ textAlign:"center", ...mono, fontSize:12, color:T.muted, padding:"4px 0" }}>{d}</div>)}
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:4, marginBottom:20 }}>
            {calData.map((cell,i)=>(
              <div key={i} style={{ minHeight:95, borderRadius:9, padding:"6px 5px", background:cell?(cell.isToday?`${accent}14`:T.card):"transparent", border:cell?`1.5px solid ${cell.isToday?accent:T.border}`:"none" }}>
                {cell&&(<>
                  <div style={{ ...mono, fontSize:14, color:cell.isToday?accent:T.muted, textAlign:"center", marginBottom:4 }}>{cell.day}</div>
                  {cell.isPayday&&<div style={{ background:COLOR_SUCCESS, borderRadius:4, padding:"2px 4px", fontSize:10, fontWeight:700, color:"#0A1A12", textAlign:"center", marginBottom:3, ...mono }}>PAY</div>}
                  {cell.bills.slice(0,3).map((b,bi)=>(
                    <div key={bi} style={{ background:`${b.color}28`, borderRadius:4, padding:"2px 4px", marginBottom:2 }}>
                      <div style={{ fontSize:10, color:b.color, overflow:"hidden", whiteSpace:"nowrap", textOverflow:"ellipsis" }}>{b.isDebt?"💳 ":""}{b.name.split(" ")[0]}</div>
                      {parse(b.amount)>0&&<div style={{ ...mono, fontSize:9, color:b.color }}>{fmt(parse(b.amount))}</div>}
                    </div>
                  ))}
                  {cell.bills.length>3&&<div style={{ fontSize:9, color:T.muted, textAlign:"center" }}>+{cell.bills.length-3}</div>}
                </>)}
              </div>
            ))}
          </div>
          {/* Legend */}
          <div style={{ ...card() }}>
            <div style={{ ...mono, fontSize:11, textTransform:"uppercase", letterSpacing:"0.12em", color:T.muted, marginBottom:12 }}>Legend · {PROFILE_META[p].label}</div>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
              <div style={{ background:COLOR_SUCCESS, borderRadius:3, padding:"2px 7px", fontSize:9, fontWeight:700, color:"#0A1A12", ...mono }}>PAY</div>
              <span style={{ fontSize:13, color:T.sub }}>Paycheck · {FREQ_LABEL[freq]}</span>
            </div>
            {(cats.filter(c=>c.type==="bills"&&c.dueType==="day"&&!c.isDebtLinked).length>0 || dts.filter(d=>d.dueType==="day").length>0)?(
              <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
                {cats.filter(c=>c.type==="bills"&&c.dueType==="day"&&!c.isDebtLinked).map(c=>(
                  <div key={c.id} style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <div style={{ width:10,height:10,borderRadius:3,background:TC[c.type],flexShrink:0 }}/>
                    <span style={{ fontSize:13, color:T.sub, flex:1 }}>{c.name}</span>
                    <span style={{ ...mono, fontSize:11, color:T.muted }}>Day {c.dueDay} · {CAT_FREQ_LABEL[c.catFreq]||"Monthly"}</span>
                    {parse(c.amount)>0&&<span style={{ ...mono, fontSize:12, color:TC[c.type] }}>{fmt(parse(c.amount))}</span>}
                  </div>
                ))}
                {dts.filter(d=>d.dueType==="day").map(d=>(
                  <div key={d.id} style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <div style={{ width:10,height:10,borderRadius:3,background:d.color,flexShrink:0 }}/>
                    <span style={{ fontSize:13, color:T.sub, flex:1 }}>💳 {d.name}</span>
                    <span style={{ ...mono, fontSize:11, color:T.muted }}>Day {d.dueDay}</span>
                    {parse(d.minPayment)>0&&<span style={{ ...mono, fontSize:12, color:d.color }}>{fmt(parse(d.minPayment))}</span>}
                  </div>
                ))}
              </div>
            ):<div style={{ fontSize:12, color:T.muted }}>Edit a bill or debt and set a due date to see it on the calendar.</div>}
          </div>
        </>)}

        {/* ══════════════ DEBTS TAB ════════════════════════════════════════ */}
        {tab==="debts"&&(<>
          {/* Slim strategy row */}
          <div style={{ ...card(), marginBottom:16, padding:"12px 16px" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                <span style={{ ...mono, fontSize:13, textTransform:"uppercase", letterSpacing:"0.1em", color:T.muted }}>Strategy</span>
                {[["avalanche","🔥 Avalanche","Highest interest first"],["snowball","❄️ Snowball","Lowest balance first"]].map(([val,label,tip])=>(
                  <button key={val} title={tip} onClick={()=>setStrategy(val)} style={{ padding:"5px 12px", borderRadius:99, border:`1.5px solid ${strategy===val?accent:T.border2}`, background:strategy===val?`${accent}18`:"transparent", color:strategy===val?accent:T.muted, fontSize:15, fontWeight:600, cursor:"pointer", fontFamily:"inherit", transition:"all 0.15s" }}>{label}</button>
                ))}
              </div>
              <div style={{ fontSize:13, color:T.muted }}>{strategy==="avalanche"?"High rate first":"Low balance first"}</div>
            </div>
          </div>

          {dts.length>0&&(
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:16 }}>
              {[
                ["Total Debt",     fmt((debts[p]||[]).reduce((s,d)=>s+parse(d.balance),0)),    COLOR_DANGER],
                ["Min. Monthly",   fmt((debts[p]||[]).reduce((s,d)=>s+parse(d.minPayment),0)), COLOR_INFO],
                ["Months to Free", maxPayoffMonth ? `${maxPayoffMonth} mo` : "—",              COLOR_SUCCESS],
                ["Projected Payoff", monthsToDate(maxPayoffMonth),                               "#F0A500"],
              ].map(([label,val,color])=>(
                <div key={label} style={{ ...card({ padding:"14px 16px" }) }}>
                  <div style={{ ...mono, fontSize:13, textTransform:"uppercase", letterSpacing:"0.1em", color:T.muted, marginBottom:6 }}>{label}</div>
                  <div style={{ ...mono, fontSize:20, fontWeight:700, color }}>{val}</div>
                </div>
              ))}
            </div>
          )}

          {hasRunawayDebt&&(
            <div style={{ ...card({ marginBottom:16, border:"1.5px solid rgba(229,99,90,0.35)", background:"rgba(229,99,90,0.06)" }) }}>
              <div style={{ display:"flex", gap:10, alignItems:"flex-start" }}>
                <span style={{ fontSize:20, lineHeight:1 }}>⚠</span>
                <div>
                  <div style={{ fontSize:16, fontWeight:600, color:COLOR_DANGER, marginBottom:3 }}>One or more debts won't pay off at their current minimum</div>
                  <div style={{ fontSize:15, color:T.muted, lineHeight:1.5 }}>The minimum payment is lower than the monthly interest, so the balance grows every month instead of shrinking. Increase the minimum payment or add an Extra/mo amount to fix this — check each debt card below for a red "runaway" flag.</div>
                </div>
              </div>
            </div>
          )}

          {/* Add Debt + Extra Payment inline */}
          {addingDebt?(
            <div style={{ ...card(), border:`1.5px solid ${accent}`, marginBottom:20 }}>
              <input autoFocus placeholder="Debt name (Visa, Student Loan…)" value={newDebt.name} onChange={e=>setNewDebt(n=>({...n,name:e.target.value}))} onKeyDown={e=>{if(e.key==="Escape")setAddingDebt(false);}} style={{ ...inp(), width:"100%", marginBottom:10 }} />
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:8, marginBottom:12 }}>
                {[["Balance","$","balance"],["Interest %","%","rate"],["Min. Pmt","$","minPayment"],["Extra/mo","$","extraPayment"]].map(([label,pre,field])=>(
                  <div key={field} style={{ background:T.surface, borderRadius:8, padding:"8px 10px" }}>
                    <div style={{ ...mono, fontSize:11, color:T.muted, marginBottom:4 }}>{label}</div>
                    <div style={{ display:"flex", alignItems:"center", gap:2 }}>
                      <span style={{ fontSize:13, color:T.muted }}>{pre}</span>
                      <input type="number" min="0" value={newDebt[field]} onChange={e=>setNewDebt(n=>({...n,[field]:e.target.value}))} style={{ background:"none", border:"none", color:T.text, ...mono, fontSize:17, width:"100%", padding:0 }} />
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginBottom:12 }}><DueDateEditor cat={newDebt} onChange={patch=>setNewDebt(n=>({...n,...patch}))} isDebt T={T} TC={TC} mono={mono} inp={inp} accent={accent} /></div>
              <div style={{ display:"flex", gap:8 }}>
                <button onClick={addDebt} style={{ flex:1, background:accent, color:"#12141F", border:"none", borderRadius:8, padding:"10px", fontSize:16, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>Add Debt</button>
                <button onClick={()=>setAddingDebt(false)} style={{ background:T.surface, color:T.muted, border:"none", borderRadius:8, padding:"10px 16px", fontSize:16, cursor:"pointer", fontFamily:"inherit" }}>Cancel</button>
              </div>
            </div>
          ):(
            <div style={{ display:"flex", gap:10, marginBottom:20 }}>
              <button className="da" onClick={()=>setAddingDebt(true)} style={{ flex:1, background:"transparent", border:`1.5px dashed ${T.border2}`, color:T.muted, borderRadius:12, padding:"13px", fontSize:16, cursor:"pointer", fontFamily:"inherit", transition:"all 0.15s" }}>+ Add Debt</button>
            </div>
          )}
          {dts.length===0&&!addingDebt&&<div style={{ textAlign:"center", padding:"24px 0", color:T.muted, fontSize:16, marginBottom:16 }}>Add your {PROFILE_META[p].label.toLowerCase()} debts above<br/><span style={{ fontSize:11 }}>credit cards · loans · medical · anything</span></div>}

          {dts.length>1&&<div style={{ fontSize:13, color:T.muted, marginBottom:10 }}>Priority: {strategy==="avalanche"?"highest rate → lowest":"lowest balance → highest"}</div>}
          <div style={{ display:"flex", flexDirection:"column", gap:12, marginBottom:16 }}>
            {[...dts].sort((a,b)=>priorityOrder.indexOf(a.id)-priorityOrder.indexOf(b.id)).map(debt=>{
              const result       = payoffResults.find(r=>r.id===debt.id);
              const priority     = priorityOrder.indexOf(debt.id);
              const isED         = editDebtId===debt.id;
              const history      = debt.balanceHistory||[];
              const initialBal   = parse(history[0]?.balance||debt.balance);
              // Progress bar deliberately reads the last LOGGED balance, not debt.balance
              // directly — so editing Balance in the field above (a correction, a typo fix)
              // never moves the bar. Only Log Balance Update, which appends to history, can.
              const currentBal   = history.length>0 ? parse(history[history.length-1].balance) : parse(debt.balance);
              const paidOff      = initialBal>0 ? Math.min(100,((initialBal-currentBal)/initialBal)*100) : 0;
              const totalMonthly = parse(debt.minPayment) + parse(debt.extraPayment||0);
              const log          = getLog(debt.id);
              const logAmt       = log.amt;
              const logNote      = log.note;
              const payoff       = getPayoff(debt.id);
              const payoffOpen   = payoff.open;
              const payoffCalc   = payoffOpen && payoff.date ? calcPayoffByDate(debt, payoff.date, freq) : null;

              return (
                <div key={debt.id} style={{ ...card({ border:`1.5px solid ${isED?debt.color:T.border}` }) }}>
                  {/* Header */}
                  <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
                    <div style={{ width:26,height:26,borderRadius:99,background:`${debt.color}1A`,border:`1.5px solid ${debt.color}`,display:"flex",alignItems:"center",justifyContent:"center",...mono,fontSize:15,fontWeight:700,color:debt.color,flexShrink:0 }}>{priority+1}</div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:17, fontWeight:600, color:T.text }}>{debt.name}</div>
                      <div style={{ fontSize:13, color:T.muted, marginTop:1 }}>
                        {result?.paidOffMonth===0 ? "✓ Paid off" : result?.runaway ? <span style={{ color:COLOR_DANGER, fontWeight:600 }}>⚠ Won't pay off — min. below interest</span> : result?.paidOffMonth ? `Payoff: ${monthsToDate(result.paidOffMonth)} · ${result.paidOffMonth} mo` : "—"}
                      </div>
                    </div>
                    <button className="tap-target" onClick={()=>{ setPayoff(debt.id,{open:!payoffOpen}); if(!payoffOpen) setEditDebtId(null); }} title="Set a payoff goal date" style={{ background:"none", border:"none", color:payoffOpen?debt.color:T.muted, cursor:"pointer", padding:"2px 4px", display:"flex", alignItems:"center" }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <rect x="3" y="5" width="18" height="16" rx="3" stroke="currentColor" strokeWidth="2"/>
                        <path d="M3 10h18" stroke="currentColor" strokeWidth="2"/>
                        <path d="M8 3v4M16 3v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    </button>
                    <button className="tap-target" onClick={()=>{ setEditDebtId(isED?null:debt.id); if(!isED) setPayoff(debt.id,{open:false}); }} title="Edit & log payment" style={{ background:"none", border:"none", color:isED?debt.color:T.muted, cursor:"pointer", fontSize:17, padding:"2px 4px" }}>✎</button>
                    <button className="tap-target" onClick={()=>removeDebt(debt.id)} style={{ background:"none", border:"none", color:COLOR_DANGER, cursor:"pointer", fontSize:20, padding:"2px 4px", lineHeight:1 }}>×</button>
                  </div>

                  {/* Progress bar */}
                  <div style={{ marginBottom:10 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                      <span style={{ ...mono, fontSize:11, color:T.muted }}>Started: {fmt(initialBal)}</span>
                      <span style={{ ...mono, fontSize:11, color:debt.color, fontWeight:600 }}>{paidOff.toFixed(1)}% paid off</span>
                      <span style={{ ...mono, fontSize:11, color:T.muted }}>Remaining: {fmt(currentBal)}</span>
                    </div>
                    <div style={{ height:8, borderRadius:99, background:T.surface, overflow:"hidden" }}>
                      <div className="fill" style={{ height:"100%", borderRadius:99, background:`linear-gradient(90deg, ${debt.color}CC, ${debt.color})`, width:`${paidOff}%`, transition:"width 0.5s ease" }}/>
                    </div>
                  </div>

                  {/* Fields */}
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:8 }}>
                    {[["Balance","$","balance"],["Rate","%","rate"],["Min. Pmt","$","minPayment"],["Extra/mo","$","extraPayment"]].map(([label,pre,field])=>(
                      <div key={field} style={{ background:field==="extraPayment"?`${debt.color}10`:T.surface, borderRadius:8, padding:"8px 10px", border:field==="extraPayment"?`1px solid ${debt.color}30`:"none" }}>
                        <div style={{ ...mono, fontSize:11, color:field==="extraPayment"?debt.color:T.muted, marginBottom:3 }}>{label}</div>
                        <div style={{ display:"flex", alignItems:"center", gap:2 }}>
                          <span style={{ fontSize:13, color:field==="extraPayment"?debt.color:T.muted }}>{pre}</span>
                          {isED ? (
                            <BufferedInput value={debt[field]||""} onCommit={v=>updateDebt(debt.id,{[field]:v})} placeholder="0" style={{ background:"none", border:"none", color:T.text, ...mono, fontSize:17, width:"100%", padding:0, cursor:"text" }} />
                          ) : (
                            <span style={{ color:T.sub, ...mono, fontSize:17, width:"100%" }}>{debt[field]||"0"}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Combined total + due date — always visible now, not gated behind edit mode */}
                  <div style={{ marginTop:8, padding:"6px 10px", background:`${debt.color}0E`, borderRadius:8, border:`1px solid ${debt.color}25`, display:"flex", alignItems:"center", justifyContent:"space-between", gap:10, flexWrap:"wrap" }}>
                    <DueDateEditor cat={debt} onChange={patch=>updateDebt(debt.id,patch)} isDebt T={T} TC={TC} mono={mono} inp={inp} accent={accent} />
                    {totalMonthly>0&&<span style={{ ...mono, fontSize:15, fontWeight:700, color:debt.color, flexShrink:0 }}>{fmt(totalMonthly)}/mo</span>}
                  </div>

                  {/* Payoff goal panel — user-set target date, distinct from the projected payoff stat above */}
                  {payoffOpen&&(
                    <div style={{ marginTop:10, background:T.surface, borderRadius:10, border:`1px solid ${debt.color}30`, padding:"12px 14px" }}>
                      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
                        <div style={{ ...mono, fontSize:11, color:debt.color, letterSpacing:"0.08em" }}>PAYOFF GOAL</div>
                        {payoff.date&&<button className="tap-target" onClick={()=>setPayoff(debt.id,{date:""})} style={{ background:"none", border:"none", color:T.muted, cursor:"pointer", fontSize:17, lineHeight:1, padding:"2px 4px" }}>×</button>}
                      </div>
                      <DateField value={payoff.date} onChange={v=>setPayoff(debt.id,{date:v})} min={new Date(Date.now()+86400000).toISOString().split("T")[0]} T={T} accent={accent} mono={mono} inp={inp} />
                      {payoffCalc?.error&&<div style={{ marginTop:8, padding:"8px 12px", background:"rgba(229,99,90,0.1)", borderRadius:8, fontSize:13, color:COLOR_DANGER }}>{payoffCalc.error}</div>}
                      {payoffCalc&&!payoffCalc.error&&(
                        <div style={{ marginTop:10 }}>
                          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:8 }}>
                            <div style={{ background:T.card, borderRadius:8, padding:"8px 10px" }}>
                              <div style={{ ...mono, fontSize:10, color:T.muted, marginBottom:3 }}>PER {FREQ_LABEL[freq].toUpperCase()}</div>
                              <div style={{ ...mono, fontSize:20, fontWeight:700, color:payoffCalc.feasible?debt.color:COLOR_DANGER }}>{fmt(payoffCalc.perPeriod)}</div>
                            </div>
                            <div style={{ background:T.card, borderRadius:8, padding:"8px 10px" }}>
                              <div style={{ ...mono, fontSize:11, color:T.muted, marginBottom:3 }}>PAY PERIODS LEFT</div>
                              <div style={{ ...mono, fontSize:20, fontWeight:700, color:T.text }}>{payoffCalc.periods}</div>
                            </div>
                          </div>
                          <div style={{ display:"flex", justifyContent:"space-between", padding:"7px 10px", background:`${debt.color}0E`, borderRadius:8, fontSize:13, color:T.muted }}>
                            <span>{fmt(payoffCalc.monthlyNeeded)}/mo needed</span>
                            <span>Est. interest: {fmt(payoffCalc.totalInterest)}</span>
                          </div>
                          {!payoffCalc.feasible&&<div style={{ marginTop:6, fontSize:11, color:"#F0A500" }}>⚠ This is below your current minimum payment — consider a longer timeline.</div>}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Edit & log payment panel (combined) */}
                  {isED&&(
                    <div style={{ marginTop:10, display:"flex", flexDirection:"column", gap:10 }}>
                      <div style={{ background:T.surface, borderRadius:10, border:`1px solid ${T.border2}`, padding:"12px 14px" }}>
                        <div style={{ ...mono, fontSize:11, color:T.muted, marginBottom:10 }}>LOG BALANCE UPDATE</div>
                        <div style={{ display:"flex", gap:8, marginBottom:8 }}>
                          <div style={{ flex:1, background:T.card, borderRadius:8, border:`1px solid ${T.border2}`, padding:"8px 10px" }}>
                            <div style={{ ...mono, fontSize:11, color:T.muted, marginBottom:3 }}>NEW BALANCE</div>
                            <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                              <span style={{ ...mono, fontSize:16, color:"#F0A500" }}>$</span>
                              <input type="number" min="0" placeholder={debt.balance} value={logAmt} onChange={e=>setLog(debt.id,{amt:e.target.value})} style={{ background:"none", border:"none", color:T.text, ...mono, fontSize:17, width:"100%", padding:0 }} />
                            </div>
                          </div>
                          <input placeholder="Note (e.g. Jan payment)" value={logNote} onChange={e=>setLog(debt.id,{note:e.target.value})} style={{ ...inp(), flex:2, fontSize:16 }} />
                        </div>
                        <button onClick={()=>{
                          if (!logAmt) return;
                          logDebtPayment(debt.id, logAmt, logNote||"Balance update");
                          setLog(debt.id,{amt:"",note:""});
                        }} style={{ width:"100%", background:debt.color, color:"#12141F", border:"none", borderRadius:8, padding:"9px", fontSize:16, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
                          Save Balance
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Balance history */}
                  {history.length>1&&(
                    <div style={{ marginTop:10 }}>
                      <div style={{ ...mono, fontSize:13, textTransform:"uppercase", letterSpacing:"0.1em", color:T.muted, marginBottom:6 }}>Balance History</div>
                      <div className="scroll-touch" style={{ display:"flex", flexDirection:"column", gap:4, maxHeight:140, overflowY:"auto" }}>
                        {[...history].reverse().map((h,i)=>{
                          const prev = history[history.length-2-i];
                          const change = prev ? parse(h.balance)-parse(prev.balance) : 0;
                          return (
                            <div key={i} style={{ display:"flex", alignItems:"center", gap:8, padding:"5px 8px", background:T.surface, borderRadius:7 }}>
                              <div style={{ width:6,height:6,borderRadius:99,background:change<0?debt.color:T.muted,flexShrink:0 }}/>
                              <span style={{ fontSize:13, color:T.sub, flex:1 }}>{h.note||"Update"}</span>
                              <span style={{ ...mono, fontSize:11, color:T.muted }}>{h.date}</span>
                              {change!==0&&<span style={{ ...mono, fontSize:11, color:change<0?COLOR_SUCCESS:COLOR_DANGER }}>{change<0?"-":"+"}{ fmt(Math.abs(change)) }</span>}
                              <span style={{ ...mono, fontSize:13, fontWeight:600, color:T.text }}>{fmt(parse(h.balance))}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

        </>)}

        {/* ══════════════ INCOME TAB ══════════════════════════════════════ */}
        {tab==="calculator"&&(<>

          {/* ── SECTION 1: Monthly Income ──────────────────────────────── */}
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
            <div style={{ width:3, height:20, borderRadius:99, background:accent }}/>
            <span style={{ fontSize:16, fontWeight:600, color:T.text }}>Monthly Income</span>
            <div style={{ flex:1, height:1, background:T.border }}/>
          </div>

          <div style={{ ...card(), marginBottom:8 }}>
            <div style={{ display:"flex", gap:6, marginBottom:14 }}>
              {[["auto","📊 From Budget"],["manual","✏️ Enter Manually"]].map(([v,l])=>(
                <button key={v} onClick={()=>setCalcSource(v)} style={{ flex:1, padding:"8px 0", borderRadius:9, border:`1.5px solid ${calcSource===v?accent:T.border2}`, background:calcSource===v?`${accent}16`:"transparent", color:calcSource===v?accent:T.muted, cursor:"pointer", fontFamily:"inherit", fontSize:15, fontWeight:500, transition:"all 0.15s" }}>{l}</button>
              ))}
            </div>

            {calcSource==="auto"&&(
              <div style={{ background:T.surface, borderRadius:10, border:`1px solid ${T.border2}`, padding:"10px 14px", marginBottom:14 }}>
                <div style={{ ...mono, fontSize:11, color:T.muted, marginBottom:8 }}>SYNCED FROM BUDGET ✓</div>
                {calcTotals.incomeLines.length>0?(
                  <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                    {calcTotals.incomeLines.map((ln,i)=>(
                      <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                        <span style={{ fontSize:15, color:T.sub }}>{ln.name}</span>
                        <span style={{ ...mono, fontSize:16, color:COLOR_SUCCESS }}>{fmt(ln.monthly)}/mo</span>
                      </div>
                    ))}
                  </div>
                ):<div style={{ fontSize:15, color:T.muted }}>Enter a paycheck in the Budget tab first.</div>}
              </div>
            )}

            {calcSource==="manual"&&(
              <>
                <div style={{ ...mono, fontSize:13, textTransform:"uppercase", letterSpacing:"0.1em", color:T.muted, marginBottom:8 }}>NET INCOME STREAMS (MONTHLY)</div>
                <div style={{ display:"flex", flexDirection:"column", gap:6, marginBottom:10 }}>
                  {calcItems.map((item,i)=>(
                    <div key={item.id} style={{ display:"flex", gap:8, alignItems:"center" }}>
                      <input placeholder={`Source ${i+1} (e.g. Salary)`} value={item.name} onChange={e=>setCalcItems(ci=>ci.map(c=>c.id===item.id?{...c,name:e.target.value}:c))} style={{ ...inp(), flex:2, fontSize:16 }} />
                      <div style={{ display:"flex", alignItems:"center", ...inp(), flex:1, gap:4 }}>
                        <span style={{ ...mono, fontSize:16, color:"#F0A500" }}>$</span>
                        <input type="number" min="0" placeholder="0" value={item.amount} onChange={e=>setCalcItems(ci=>ci.map(c=>c.id===item.id?{...c,amount:e.target.value}:c))} style={{ background:"none", border:"none", color:T.text, ...mono, fontSize:17, width:"100%", padding:0 }} />
                      </div>
                      {calcItems.length>1&&<button className="tap-target" onClick={()=>setCalcItems(ci=>ci.filter(c=>c.id!==item.id))} style={{ background:"none", border:"none", color:COLOR_DANGER, cursor:"pointer", fontSize:20, padding:"2px 4px", lineHeight:1, flexShrink:0 }}>×</button>}
                    </div>
                  ))}
                </div>
                <button className="da" onClick={()=>setCalcItems(ci=>[...ci,{id:genId("ci"),name:"",amount:""}])} style={{ width:"100%", background:"transparent", border:`1.5px dashed ${T.border2}`, color:T.muted, borderRadius:10, padding:"9px", fontSize:16, cursor:"pointer", fontFamily:"inherit", transition:"all 0.15s" }}>+ Add Stream</button>
              </>
            )}

            {/* Frequency */}
            <div style={{ display:"flex", gap:8, marginTop:14 }}>
              <div style={{ flex:1, background:T.surface, borderRadius:10, border:`1.5px solid ${T.border2}`, padding:"10px 12px" }}>
                <div style={{ ...mono, fontSize:11, color:T.muted, marginBottom:3 }}>PER PERIOD</div>
                <Dropdown value={calcFreq} onChange={setCalcFreq} options={Object.entries(FREQ_LABEL)} T={T} accent={accent} mono={mono} />
              </div>
            </div>
          </div>

          {/* Income results */}
          {calcTotals.totalMonthly>0&&(
            <div style={{ ...card({ marginBottom:20 }) }}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <div>
                  <div style={{ ...mono, fontSize:13, textTransform:"uppercase", letterSpacing:"0.1em", color:T.muted, marginBottom:6 }}>Per {FREQ_LABEL[calcFreq]}</div>
                  <div style={{ ...mono, fontSize:20, fontWeight:700, color:accent }}>{fmt(calcTotals.perPeriod)}</div>
                </div>
                <div style={{ textAlign:"right" }}>
                  <div style={{ ...mono, fontSize:13, textTransform:"uppercase", letterSpacing:"0.1em", color:T.muted, marginBottom:6 }}>Annual Estimate</div>
                  <div style={{ ...mono, fontSize:20, fontWeight:700, color:accent }}>{fmt(calcTotals.totalMonthly*12)}</div>
                </div>
              </div>
              <div style={{ fontSize:13, color:T.muted, marginTop:10 }}>{fmt(calcTotals.totalMonthly)}/mo</div>
            </div>
          )}

          {/* ── SECTION 2: Monthly Obligations ─────────────────────────── */}
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
            <div style={{ width:3, height:20, borderRadius:99, background:COLOR_DANGER }}/>
            <span style={{ fontSize:16, fontWeight:600, color:T.text }}>Monthly Obligations</span>
            <div style={{ flex:1, height:1, background:T.border }}/>
            <span style={{ ...mono, fontSize:15, color:COLOR_DANGER }}>{fmt(calcTotals.totalNeededMonthly)}/mo</span>
          </div>

          <div style={{ ...card(), marginBottom:20 }}>
            {calcTotals.totalNeededMonthly>0?(
              <>
                {["bills","spending","savings"].map(type=>{
                  const lines=calcTotals.catsByType[type];
                  if (!lines||!lines.length) return null;
                  const typeTotal=lines.reduce((s,l)=>s+l.monthly,0);
                  return (
                    <div key={type} style={{ marginBottom:12 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                          <div style={{ width:7,height:7,borderRadius:99,background:TC[type] }}/>
                          <span style={{ ...mono, fontSize:13, textTransform:"uppercase", letterSpacing:"0.1em", color:TC[type] }}>{type}</span>
                        </div>
                        <span style={{ ...mono, fontSize:13, color:TC[type] }}>{fmt(typeTotal)}/mo</span>
                      </div>
                      {lines.map((ln,i)=>(
                        <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"5px 0", borderTop:`1px solid ${T.border}` }}>
                          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                            <div style={{ width:6,height:6,borderRadius:99,background:ln.color,flexShrink:0 }}/>
                            <div style={{ fontSize:16, color:T.sub }}>{ln.name}</div>
                          </div>
                          <div style={{ textAlign:"right" }}>
                            <span style={{ ...mono, fontSize:16, color:T.text }}>{fmt(ln.monthly)}/mo</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
                {calcTotals.debtLines.length>0&&(
                  <div style={{ marginBottom:4 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                        <div style={{ width:7,height:7,borderRadius:99,background:"#E0874A" }}/>
                        <span style={{ ...mono, fontSize:13, textTransform:"uppercase", letterSpacing:"0.1em", color:"#E0874A" }}>{calcTotals.debtLines.some(l=>l.goalDriven)?"Debt (incl. goals)":"Debt"}</span>
                      </div>
                      <span style={{ ...mono, fontSize:13, color:"#E0874A" }}>{fmt(calcTotals.totalDebts)}/mo</span>
                    </div>
                    {calcTotals.debtLines.map((ln,i)=>(
                      <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"5px 0", borderTop:`1px solid ${T.border}` }}>
                        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                          <div style={{ width:6,height:6,borderRadius:99,background:ln.color,flexShrink:0 }}/>
                          <div>
                            <div style={{ fontSize:15, color:T.sub }}>{ln.name}</div>
                            {ln.goalDriven?
                              <div style={{ ...mono, fontSize:11, color:"#F0A500" }}>📅 goal by {new Date(ln.goalDate+"T00:00:00").toLocaleDateString("en-US",{month:"short",year:"numeric"})} (above {fmt(ln.minPayment)} min)</div>
                            :ln.extraPayment>0&&<div style={{ ...mono, fontSize:11, color:ln.color }}>{fmt(ln.minPayment)} min + {fmt(ln.extraPayment)} extra</div>}
                          </div>
                        </div>
                        <span style={{ ...mono, fontSize:15, color:ln.goalDriven?"#F0A500":T.text }}>{fmt(ln.monthly)}/mo</span>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ borderTop:`1.5px solid ${T.border2}`, paddingTop:10, marginTop:4, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <span style={{ fontSize:16, fontWeight:600, color:T.sub }}>Total Monthly Obligations</span>
                  <span style={{ ...mono, fontSize:17, fontWeight:700, color:COLOR_DANGER }}>{fmt(calcTotals.totalNeededMonthly)}</span>
                </div>
              </>
            ):<div style={{ fontSize:15, color:T.muted, textAlign:"center", padding:"16px 0" }}>Add amounts in Budget and Debts to see your obligations.</div>}
          </div>

          {/* ── SECTION 3: Monthly Net ─────────────────────────────────── */}
          {calcTotals.totalMonthly>0&&calcTotals.totalNeededMonthly>0&&(<>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
              <div style={{ width:3, height:20, borderRadius:99, background:calcTotals.surplus>=0?COLOR_SUCCESS:COLOR_DANGER }}/>
              <span style={{ fontSize:16, fontWeight:600, color:T.text }}>Monthly Net</span>
              <div style={{ flex:1, height:1, background:T.border }}/>
            </div>

            <div style={{ ...card({ border:`1.5px solid ${calcTotals.surplus>=0?"rgba(82,166,122,0.3)":"rgba(229,99,90,0.3)"}`, marginBottom:14 }) }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                <span style={{ fontSize:16, fontWeight:600, color:calcTotals.surplus>=0?COLOR_SUCCESS:COLOR_DANGER }}>
                  {calcTotals.surplus>=0?"✓ Surplus":"⚠ Shortfall"} per {FREQ_LABEL[calcFreq].toLowerCase()}
                </span>
                <span style={{ ...mono, fontSize:20, fontWeight:700, color:calcTotals.surplus>=0?COLOR_SUCCESS:COLOR_DANGER }}>
                  {calcTotals.surplus<0?"-":""}{fmt(Math.abs(calcTotals.surplus))}
                </span>
              </div>
              <div style={{ fontSize:15, color:T.muted, lineHeight:1.6 }}>
                {calcTotals.surplus>=0
                  ?`Your ${FREQ_LABEL[calcFreq].toLowerCase()} income of ${fmt(calcTotals.perPeriod)} covers all obligations with ${fmt(calcTotals.surplus)} to spare.`
                  :`You need ${fmt(Math.abs(calcTotals.surplus))} more per ${FREQ_LABEL[calcFreq].toLowerCase()} period to cover everything.`}
              </div>
            </div>
            {calcSource==="manual"&&(
              <button onClick={applyCalcToBudget} style={{ width:"100%", background:justApplied?"rgba(82,166,122,0.12)":`${accent}10`, border:`1px solid ${justApplied?COLOR_SUCCESS:accent}`, color:justApplied?COLOR_SUCCESS:accent, borderRadius:9, padding:"10px", fontSize:16, fontWeight:600, cursor:"pointer", fontFamily:"inherit", marginBottom:20, transition:"all 0.15s" }}>
                {justApplied?"✓ Applied to Budget":"↻ Apply Income to Budget"}
              </button>
            )}
          </>)}

          {/* ── SECTION 4: Earnings Needed to Breakeven ────────────────── */}
          {calcTotals.totalNeededMonthly>0&&(<>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
              <div style={{ width:3, height:20, borderRadius:99, background:"#F0A500" }}/>
              <span style={{ fontSize:16, fontWeight:600, color:T.text }}>Earnings Needed to Breakeven</span>
              <div style={{ flex:1, height:1, background:T.border }}/>
            </div>

            <div style={{ ...card({ marginBottom:20 }) }}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
                <div>
                  <div style={{ ...mono, fontSize:13, textTransform:"uppercase", letterSpacing:"0.1em", color:T.muted, marginBottom:6 }}>Bi-Weekly</div>
                  <div style={{ ...mono, fontSize:20, fontWeight:700, color:"#F0A500" }}>{fmt(toPerPeriod(calcTotals.totalNeededMonthly,"biweekly"))}</div>
                </div>
                <div style={{ textAlign:"right" }}>
                  <div style={{ ...mono, fontSize:13, textTransform:"uppercase", letterSpacing:"0.1em", color:T.muted, marginBottom:6 }}>Monthly</div>
                  <div style={{ ...mono, fontSize:20, fontWeight:700, color:"#F0A500" }}>{fmt(calcTotals.totalNeededMonthly)}</div>
                </div>
              </div>
              <div style={{ fontSize:15, color:T.muted, lineHeight:1.5, marginBottom:calcTotals.debtLines.some(l=>l.goalDriven)?10:0 }}>
                To cover all bills, spending, savings, and debts — {fmt(calcTotals.totalNeededMonthly*12)}/yr
              </div>
              {calcTotals.debtLines.some(l=>l.goalDriven)&&(
                <div style={{ display:"flex", alignItems:"center", gap:6, padding:"6px 10px", background:"rgba(240,165,0,0.1)", borderRadius:8, width:"fit-content" }}>
                  <span style={{ fontSize:12 }}>📅</span>
                  <span style={{ fontSize:13, color:"#F0A500" }}>Includes payoff goal dates, not just minimums</span>
                </div>
              )}
            </div>
          </>)}

          {calcTotals.totalMonthly===0&&calcTotals.totalNeededMonthly===0&&(
            <div style={{ textAlign:"center", padding:"40px 0", color:T.muted }}>
              <div style={{ fontSize:32, marginBottom:12 }}>💰</div>
              <div style={{ fontSize:16, marginBottom:6 }}>Add income in Budget or enter it manually above</div>
              <div style={{ fontSize:12 }}>This tab shows your full income picture — what you earn, owe, and need</div>
            </div>
          )}
        </>)}

        {/* ══════════════ SETTINGS TAB ════════════════════════════════════ */}
        {tab==="settings"&&(<>
          {/* Theme presets */}
          <div style={{ ...card(), marginBottom:20 }}>
            <div style={{ ...mono, fontSize:13, letterSpacing:"0.12em", textTransform:"uppercase", color:T.muted, marginBottom:14 }}>App Theme</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8 }}>
              {Object.entries(THEMES).map(([key,theme])=>(
                <button key={key} onClick={()=>applyTheme(key)} style={{ background:theme.bg, border:`2px solid ${themeName===key?accent:theme.border}`, borderRadius:10, padding:"10px 6px", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:6 }}>
                  <div style={{ display:"flex", gap:3 }}>
                    <div style={{ width:10,height:10,borderRadius:99,background:COLOR_DANGER }}/>
                    <div style={{ width:10,height:10,borderRadius:99,background:"#F0A500" }}/>
                    <div style={{ width:10,height:10,borderRadius:99,background:"#3DB8A0" }}/>
                  </div>
                  <div style={{ ...mono, fontSize:10, color:theme.muted, textAlign:"center" }}>{theme.name}</div>
                  {themeName===key&&<div style={{ width:6,height:6,borderRadius:99,background:accent }}/>}
                </button>
              ))}
            </div>
          </div>

          {/* Business combination */}
          <div style={{ ...card(), marginBottom:20 }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:6 }}>
              <div style={{ ...mono, fontSize:13, letterSpacing:"0.12em", textTransform:"uppercase", color:T.muted }}>Combine Finances</div>
              <Toggle on={combineFinances} onChange={setCombineFinances} label={combineFinances?"On":"Off"} color={accent} T={T} />
            </div>
            <div style={{ fontSize:15, color:T.muted, lineHeight:1.5 }}>
              {combineFinances
                ? "Business and Personal are combined on the Income tab."
                : "Business and Personal stay separate on the Income tab."}
            </div>
          </div>

          {/* Profile accent colors */}
          <div style={{ ...card(), marginBottom:20 }}>
            <div style={{ ...mono, fontSize:13, letterSpacing:"0.12em", textTransform:"uppercase", color:T.muted, marginBottom:14 }}>Profile Accent Colors</div>
            {["personal","business"].map(prof=>(
              <div key={prof} style={{ marginBottom:prof==="personal"?16:0 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                  <span style={{ fontSize:14 }}>{PROFILE_META[prof].icon}</span>
                  <span style={{ fontSize:16, color:T.sub, fontWeight:500 }}>{PROFILE_META[prof].label}</span>
                  <div style={{ width:14,height:14,borderRadius:99,background:profileAccents[prof],marginLeft:"auto",border:"2px solid rgba(255,255,255,0.2)" }}/>
                  <span style={{ fontSize:13, color:T.muted }}>{PROFILE_SWATCH_NAMES[profileAccents[prof]]||profileAccents[prof]}</span>
                </div>
                <div style={{ display:"flex", gap:7, flexWrap:"wrap" }}>
                  {PROFILE_SWATCHES.map(sw=><div key={sw} className="sw" title={PROFILE_SWATCH_NAMES[sw]} onClick={()=>setProfileAccents(pa=>({...pa,[prof]:sw}))} style={{ width:24,height:24,borderRadius:99,background:sw,border:profileAccents[prof]===sw?"2.5px solid #fff":"2px solid transparent",boxShadow:profileAccents[prof]===sw?`0 0 0 1.5px ${sw}`:"none" }}/>)}
                </div>
              </div>
            ))}
          </div>

          {/* Category type colors */}
          <div style={{ ...card(), marginBottom:20 }}>
            <div style={{ ...mono, fontSize:13, letterSpacing:"0.12em", textTransform:"uppercase", color:T.muted, marginBottom:14 }}>Category Type Colors</div>
            {["bills","spending","savings"].map(type=>(
              <div key={type} style={{ marginBottom:14 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                  <div style={{ width:10,height:10,borderRadius:99,background:TC[type] }}/>
                  <span style={{ fontSize:16, color:T.sub, fontWeight:500, textTransform:"capitalize" }}>{type}</span>
                  <span style={{ ...mono, fontSize:13, color:T.muted, marginLeft:"auto" }}>{SWATCH_NAMES[TC[type]]||TC[type]}</span>
                </div>
                <div style={{ display:"flex", gap:7, flexWrap:"wrap" }}>
                  {SWATCHES.map(sw=><div key={sw} className="sw" title={SWATCH_NAMES[sw]} onClick={()=>setTypeColors(tc=>({...tc,[type]:sw}))} style={{ width:22,height:22,borderRadius:99,background:sw,border:TC[type]===sw?"2.5px solid #fff":"2px solid transparent",boxShadow:TC[type]===sw?`0 0 0 1.5px ${sw}`:"none" }}/>)}
                </div>
              </div>
            ))}
          </div>

          {/* Reset all data */}
          <div style={{ ...card() }}>
            <div style={{ ...mono, fontSize:13, letterSpacing:"0.12em", textTransform:"uppercase", color:T.muted, marginBottom:8 }}>Data</div>
            <div style={{ fontSize:16, color:T.muted, marginBottom:14 }}>Clear all saved data and reset the app to its default state.</div>
            <button onClick={()=>setConfirmState({ type:"reset", id:"reset", name:"all data" })} style={{ background:"rgba(229,99,90,0.1)", border:"1.5px solid rgba(229,99,90,0.3)", color:COLOR_DANGER, borderRadius:8, padding:"10px 20px", fontSize:16, cursor:"pointer", fontFamily:"inherit", fontWeight:500 }}>Reset All Data</button>
          </div>
        </>)}

      </div>

      {/* ── Inline confirm dialog (replaces window.confirm which is blocked in iframes) ── */}
      {confirmState&&(
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:9999, padding:"0 24px" }}>
          <div style={{ background:T.card, borderRadius:16, border:`1.5px solid ${T.border}`, padding:24, maxWidth:340, width:"100%" }}>
            <div style={{ fontSize:17, fontWeight:600, color:T.text, marginBottom:8 }}>
              {confirmState.type==="reset" ? "Reset all data?" : `Remove "${confirmState.name}"?`}
            </div>
            <div style={{ fontSize:16, color:T.muted, marginBottom:20, lineHeight:1.5 }}>
              {confirmState.type==="debt"
                ? "This will also remove its linked Budget line. This can't be undone."
                : confirmState.type==="reset"
                  ? "All budgets, debts, and settings will be cleared. This can't be undone."
                  : "This can't be undone."}
            </div>
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={()=>setConfirmState(null)} style={{ flex:1, background:T.surface, border:`1px solid ${T.border2}`, color:T.muted, borderRadius:10, padding:"11px", fontSize:16, cursor:"pointer", fontFamily:"inherit", fontWeight:500 }}>Cancel</button>
              <button onClick={()=>{
                if (confirmState.type==="debt")  confirmRemoveDebt(confirmState.id);
                if (confirmState.type==="cat")   confirmRemoveCat(confirmState.id);
                if (confirmState.type==="reset") { resetAllData(); }
              }} style={{ flex:1, background:COLOR_DANGER, border:"none", color:"#fff", borderRadius:10, padding:"11px", fontSize:16, cursor:"pointer", fontFamily:"inherit", fontWeight:600 }}>
                {confirmState.type==="reset" ? "Reset" : "Remove"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
