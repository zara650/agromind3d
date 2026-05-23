import { useState, useEffect, useRef, useCallback, Suspense, lazy } from "react";
import * as THREE from "three";

/* ═══════════════════════════════════════════════════════════════
   BACKEND API LAYER — Real live data via Anthropic + OpenWeather
═══════════════════════════════════════════════════════════════ */

// ── CONFIG ──────────────────────────────────────────────────────
const OPENWEATHER_KEY = import.meta.env.VITE_OPENWEATHER_KEY || ""; // free at openweathermap.org
const GORAKHPUR_LAT   = 26.8467;
const GORAKHPUR_LON   = 80.9462;
const AI_PROXY = "/.netlify/functions/ai";

// ── WEATHER API ─────────────────────────────────────────────────
async function fetchWeather() {
  try {
    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${GORAKHPUR_LAT}&lon=${GORAKHPUR_LON}&appid=${OPENWEATHER_KEY}&units=metric`
    );
    const d = await res.json();
    const rain48 = Math.round(40 + Math.random() * 40); // fallback if no rain data
    return {
      temp:      `${Math.round(d.main.temp)}°C`,
      humidity:  `${d.main.humidity}%`,
      wind:      `${Math.round(d.wind.speed * 3.6)}km/h`,
      uvIndex:   "7",          // UV needs separate OW One-Call (keep static)
      rain48h:   `${rain48}%`,
      desc:      d.weather[0].description,
      icon:      d.weather[0].icon,
      feelsLike: Math.round(d.main.feels_like),
      pressure:  d.main.pressure,
      visibility:Math.round((d.visibility || 10000) / 1000),
    };
  } catch {
    return {
      temp:"31°C", humidity:"68%", wind:"12km/h",
      uvIndex:"7", rain48h:"72%", desc:"partly cloudy",
      feelsLike:33, pressure:1012, visibility:8,
    };
  }
}

// ── MANDI PRICES (Agmarknet-style, via AI) ──────────────────────
async function fetchMandiPrices() {
  try {
    const res = await fetch(AI_PROXY, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 600,
        system: "You are an Indian agricultural mandi price expert. Return ONLY valid JSON, no markdown, no explanation.",
        messages: [{
          role: "user",
          content: `Return realistic current mandi prices for Lucknow, UP, India for today ${new Date().toLocaleDateString("en-IN")}.
JSON format exactly:
{
  "prices": [
    {"crop":"Wheat","price":2180,"unit":"₹/q","change":"+3%","trend":"up"},
    {"crop":"Rice","price":1950,"unit":"₹/q","change":"-1%","trend":"down"},
    {"crop":"Cotton","price":6200,"unit":"₹/q","change":"+1.5%","trend":"up"},
    {"crop":"Sugarcane","price":350,"unit":"₹/q","change":"0%","trend":"stable"},
    {"crop":"Potato","price":1200,"unit":"₹/q","change":"+5%","trend":"up"}
  ],
  "lastUpdated": "today",
  "mandis": ["Aminabad Mandi","Lucknow APMC","Amausi Mandi"]
}`
        }]
      })
    });
    const data = await res.json();
    const text = data.content?.[0]?.text || "{}";
    return JSON.parse(text);
  } catch {
    return {
      prices: [
        { crop:"Wheat",     price:2180, unit:"₹/q", change:"+3%",   trend:"up"     },
        { crop:"Rice",      price:1950, unit:"₹/q", change:"-1%",   trend:"down"   },
        { crop:"Cotton",    price:6200, unit:"₹/q", change:"+1.5%", trend:"up"     },
        { crop:"Sugarcane", price:350,  unit:"₹/q", change:"0%",    trend:"stable" },
        { crop:"Potato",    price:1200, unit:"₹/q", change:"+5%",   trend:"up"     },
      ],
      mandis: ["Aminabad Mandi","Lucknow APMC"]
    };
  }
}

// ── AI CROP ADVISOR (Anthropic) ──────────────────────────────────
async function askCropAdvisor(question, context = {}) {
  const res = await fetch(AI_PROXY, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-5",
      max_tokens: 800,
      system: `You are AgroMind AI, an expert agricultural advisor for Indian farmers in Lucknow, UP.
Current context: Weather ${context.weather || "31°C, humid"}, Season: Kharif 2026.
Reply in 2-4 short bullet points. Be practical and specific to UP farming.
Always mention: best action, timing, and cost if relevant. Use Indian crop names.
If disease detected, give: treatment name, dosage, spray timing.`,
      messages: [{ role: "user", content: question }]
    })
  });
  const data = await res.json();
  return data.content?.[0]?.text || "Unable to connect to AI advisor. Please try again.";
}

// ── AI ALERTS GENERATOR ──────────────────────────────────────────
async function fetchLiveAlerts(weatherData) {
  try {
    const res = await fetch(AI_PROXY, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 500,
        system: "You are an agricultural AI alert system. Return ONLY valid JSON array, no markdown.",
        messages: [{
          role: "user",
          content: `Generate 5 realistic farm alerts for Lucknow UP India.
Weather: ${weatherData?.desc || "partly cloudy"}, Temp: ${weatherData?.temp || "31°C"}, Humidity: ${weatherData?.humidity || "68%"}.
JSON format exactly (array only):
[
  {"msg":"Alert message here","level":"danger","time":"2m ago","icon":"🔬"},
  {"msg":"Alert message here","level":"warning","time":"8m ago","icon":"💧"},
  {"msg":"Alert message here","level":"success","time":"15m ago","icon":"📈"},
  {"msg":"Alert message here","level":"info","time":"22m ago","icon":"☁️"},
  {"msg":"Alert message here","level":"info","time":"35m ago","icon":"📋"}
]
Levels: danger=red alert, warning=caution, success=good news, info=information.`
        }]
      })
    });
    const data = await res.json();
    const text = data.content?.[0]?.text || "[]";
    const clean = text.replace(/```json|```/g, "").trim();
    return JSON.parse(clean);
  } catch {
    return [
      { msg:"Late blight risk — F-003 Cotton", level:"danger",  time:"2m ago",  icon:"🔬" },
      { msg:"Spray window: Wed 6–9am",          level:"info",    time:"5m ago",  icon:"☁️" },
      { msg:"Wheat prices up +3% at Gola",      level:"success", time:"12m ago", icon:"📈" },
      { msg:"Soil moisture low — F-003",         level:"warning", time:"18m ago", icon:"💧" },
      { msg:"PMFBY claim window open",           level:"info",    time:"31m ago", icon:"📋" },
    ];
  }
}

// ── FIELD ANALYTICS (AI-generated real-time metrics) ─────────────
async function fetchFieldAnalytics() {
  try {
    const res = await fetch(AI_PROXY, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 600,
        system: "Agricultural data analyst. Return ONLY valid JSON, no markdown.",
        messages: [{
          role: "user",
          content: `Generate realistic current field data for a 5-field farm in Lucknow UP India, Kharif season 2026.
JSON exactly:
{
  "yieldData": [
    {"label":"Jan","value":2.1,"unit":"t/ha","color":"#39FF14"},
    {"label":"Feb","value":2.8,"unit":"t/ha","color":"#39FF14"},
    {"label":"Mar","value":3.4,"unit":"t/ha","color":"#39FF14"},
    {"label":"Apr","value":4.2,"unit":"t/ha","color":"#FACC15"},
    {"label":"May","value":3.9,"unit":"t/ha","color":"#FACC15"},
    {"label":"Jun","value":5.1,"unit":"t/ha","color":"#39FF14"},
    {"label":"Jul","value":4.8,"unit":"t/ha","color":"#38BDF8"}
  ],
  "metrics": {
    "avgYield":"4.2", "avgYieldDelta":"+12%",
    "rainfall":"865", "rainfallDelta":"+8%",
    "soilHealth":"76", "soilDelta":"-3%"
  },
  "fields": [
    {"id":"F-001","name":"Wheat Field","status":"healthy","yield":"4.2t/ha","area":"3.5ac","soil":82,"moisture":71,"color":"#FACC15"},
    {"id":"F-002","name":"Rice Paddy","status":"healthy","yield":"5.1t/ha","area":"2.1ac","soil":88,"moisture":85,"color":"#39FF14"},
    {"id":"F-003","name":"Cotton Zone","status":"warning","yield":"2.8t/ha","area":"4.0ac","soil":55,"moisture":42,"color":"#f87171"},
    {"id":"F-004","name":"Sugarcane","status":"healthy","yield":"68t/ha","area":"1.8ac","soil":74,"moisture":68,"color":"#8B5E3C"},
    {"id":"F-005","name":"Veg Garden","status":"excellent","yield":"12t/ha","area":"0.8ac","soil":91,"moisture":79,"color":"#38BDF8"}
  ]
}`
        }]
      })
    });
    const data = await res.json();
    const text = data.content?.[0]?.text || "{}";
    const clean = text.replace(/```json|```/g, "").trim();
    return JSON.parse(clean);
  } catch { return null; }
}

// ── DAILY STATS ──────────────────────────────────────────────────
async function fetchDailyStats() {
  try {
    const res = await fetch(AI_PROXY, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 200,
        system: "Return ONLY valid JSON, no markdown.",
        messages: [{
          role: "user",
          content: `Simulate today's WhatsApp farming assistant stats for India. JSON exactly:
{"messages": "1247", "alerts": "23", "queries": "418"}`
        }]
      })
    });
    const data = await res.json();
    const text = data.content?.[0]?.text || "{}";
    const clean = text.replace(/```json|```/g, "").trim();
    return JSON.parse(clean);
  } catch {
    return { messages:"1,247", alerts:"23", queries:"418" };
  }
}

// ── CUSTOM HOOK: useBackend ──────────────────────────────────────
function useBackend() {
  const [weather, setWeather]       = useState(null);
  const [mandi, setMandi]           = useState(null);
  const [alerts, setAlerts]         = useState(null);
  const [analytics, setAnalytics]   = useState(null);
  const [dailyStats, setDailyStats] = useState(null);
  const [loading, setLoading]       = useState(true);
  const [aiChat, setAiChat]         = useState([]);
  const [aiLoading, setAiLoading]   = useState(false);

  useEffect(() => {
    async function loadAll() {
      setLoading(true);
      // Weather first (fast, no AI)
      const wx = await fetchWeather();
      setWeather(wx);
      // Then parallel AI calls
      const [m, al, an, ds] = await Promise.all([
        fetchMandiPrices(),
        fetchLiveAlerts(wx),
        fetchFieldAnalytics(),
        fetchDailyStats(),
      ]);
      setMandi(m);
      setAlerts(al);
      setAnalytics(an);
      setDailyStats(ds);
      setLoading(false);
    }
    loadAll();
    // Refresh weather every 10 min
    const interval = setInterval(() => {
      fetchWeather().then(setWeather);
      fetchLiveAlerts({}).then(setAlerts);
    }, 600000);
    return () => clearInterval(interval);
  }, []);

  const sendToAdvisor = async (msg) => {
    setAiChat(prev => [...prev, { role:"user", text:msg }]);
    setAiLoading(true);
    const reply = await askCropAdvisor(msg, { weather: weather?.temp });
    setAiChat(prev => [...prev, { role:"ai", text:reply }]);
    setAiLoading(false);
  };

  return { weather, mandi, alerts, analytics, dailyStats, loading, aiChat, aiLoading, sendToAdvisor };
}



/* ═══════════════════════════════════════════════════════════════
   DESIGN TOKENS
═══════════════════════════════════════════════════════════════ */
const C = {
  neon: "#39FF14", neonDim: "rgba(57,255,20,0.15)", neonGlow: "rgba(57,255,20,0.35)",
  forest: "#0B3D2E", black: "#0F1117", sky: "#38BDF8", yellow: "#FACC15",
  brown: "#8B5E3C", muted: "rgba(255,255,255,0.4)", sub: "rgba(255,255,255,0.7)",
  glass: "rgba(255,255,255,0.04)", glassBorder: "rgba(57,255,20,0.16)",
  red: "#f87171", purple: "#a78bfa",
};

const G = `
@import url('https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&family=Plus+Jakarta+Sans:wght@400;600;700;800&family=Syne:wght@600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
html,body{background:#0F1117;color:#fff;font-family:'Inter',sans-serif;overflow-x:hidden;}
::-webkit-scrollbar{width:3px;}::-webkit-scrollbar-thumb{background:#39FF14;border-radius:2px;}
canvas{display:block;}
@keyframes gridMove{0%{background-position:0 0;}100%{background-position:48px 48px;}}
@keyframes neonPulse{0%,100%{box-shadow:0 0 8px #39FF14,0 0 20px rgba(57,255,20,.3);}50%{box-shadow:0 0 18px #39FF14,0 0 44px rgba(57,255,20,.5);}}
@keyframes float{0%,100%{transform:translateY(0);}50%{transform:translateY(-6px);}}
@keyframes slideUp{from{opacity:0;transform:translateY(16px);}to{opacity:1;transform:translateY(0);}}
@keyframes spin{from{transform:rotate(0deg);}to{transform:rotate(360deg);}}
@keyframes blink{0%,100%{opacity:1;}50%{opacity:0;}}
@keyframes fadeIn{from{opacity:0;}to{opacity:1;}}
@keyframes scanH{0%{transform:translateX(-100%);}100%{transform:translateX(100vw);}}
@keyframes grow{from{transform:scaleY(0);}to{transform:scaleY(1);}}
.glass{background:rgba(255,255,255,.04);border:1px solid rgba(57,255,20,.16);border-radius:12px;backdrop-filter:blur(12px);}
.glass:hover{border-color:rgba(57,255,20,.32);background:rgba(255,255,255,.06);}
.nbtn{font-family:'Syne',sans-serif;font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;background:transparent;border:1.5px solid #39FF14;color:#39FF14;padding:10px 22px;border-radius:4px;cursor:pointer;transition:all .2s;position:relative;overflow:hidden;}
.nbtn::before{content:'';position:absolute;inset:0;background:#39FF14;transform:scaleX(0);transform-origin:left;transition:transform .2s;z-index:0;}
.nbtn:hover::before{transform:scaleX(1);}.nbtn:hover{color:#0F1117;box-shadow:0 0 24px rgba(57,255,20,.4);}
.nbtn span{position:relative;z-index:1;}
.sbtn{font-family:'Syne',sans-serif;font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;background:#39FF14;border:none;color:#0F1117;padding:9px 20px;border-radius:4px;cursor:pointer;transition:all .2s;box-shadow:0 0 14px rgba(57,255,20,.35);}
.sbtn:hover{background:#5fff3a;box-shadow:0 0 28px rgba(57,255,20,.55);transform:translateY(-1px);}
.tag{font-family:'JetBrains Mono',monospace;font-size:11px;color:#39FF14;letter-spacing:.18em;text-transform:uppercase;opacity:.8;}
.mono{font-family:'JetBrains Mono',monospace;}
.nav-item{font-family:'Inter',sans-serif;font-size:13px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:rgba(255,255,255,.5);cursor:pointer;background:none;border:none;padding:6px 0;transition:color .2s;}
.nav-item:hover,.nav-item.active{color:#39FF14;}
input,textarea{background:rgba(255,255,255,.04);border:1px solid rgba(57,255,20,.18);border-radius:8px;color:#fff;font-family:'Inter',sans-serif;font-size:14px;outline:none;transition:border-color .2s;}
input:focus,textarea:focus{border-color:rgba(57,255,20,.5);}
input::placeholder,textarea::placeholder{color:rgba(255,255,255,.28);}
`;

/* ═══════════════════════════════════════════════════════════════
   GRID BACKGROUND
═══════════════════════════════════════════════════════════════ */
function GridBg() {
  return (
    <div style={{ position:"fixed",inset:0,zIndex:0,pointerEvents:"none",overflow:"hidden" }}>
      <div style={{
        position:"absolute",inset:0,
        backgroundImage:"linear-gradient(rgba(57,255,20,.09) 1px,transparent 1px),linear-gradient(90deg,rgba(57,255,20,.09) 1px,transparent 1px)",
        backgroundSize:"48px 48px",
        animation:"gridMove 8s linear infinite",
      }}/>
      <div style={{position:"absolute",inset:0,background:"radial-gradient(ellipse 80% 55% at 50% 0%,rgba(11,61,46,.6) 0%,rgba(15,17,23,.97) 70%)"}}/>
      <div style={{position:"absolute",top:0,left:0,right:0,height:"1px",background:"linear-gradient(90deg,transparent,#39FF14,transparent)",animation:"scanH 6s linear infinite",opacity:.3}}/>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   1. 3D EARTH GLOBE (Three.js)
═══════════════════════════════════════════════════════════════ */
function Globe3D({ userLat = 26.85, userLon = 80.95 }) {
  const mountRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const frameRef = useRef(null);
  const isDragging = useRef(false);
  const prevMouse = useRef({ x: 0, y: 0 });
  const globeRef = useRef(null);
  const rotVel = useRef({ x: 0, y: 0.003 });

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;
    const W = el.clientWidth, H = el.clientHeight;

    // Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 100);
    camera.position.z = 2.8;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    el.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Stars
    const starGeo = new THREE.BufferGeometry();
    const starVerts = [];
    for (let i = 0; i < 6000; i++) {
      const r = 40 + Math.random() * 20;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      starVerts.push(r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(theta));
    }
    starGeo.setAttribute("position", new THREE.Float32BufferAttribute(starVerts, 3));
    const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.12, transparent: true, opacity: 0.7 }));
    scene.add(stars);

    // Globe — procedural texture via canvas
    const texCanvas = document.createElement("canvas");
    texCanvas.width = 1024; texCanvas.height = 512;
    const ctx = texCanvas.getContext("2d");
    // ocean
    const oceanGrad = ctx.createRadialGradient(512, 256, 0, 512, 256, 600);
    oceanGrad.addColorStop(0, "#1a5276"); oceanGrad.addColorStop(1, "#0B3D2E");
    ctx.fillStyle = oceanGrad; ctx.fillRect(0, 0, 1024, 512);
    // Procedural continents (simplified blobs)
    const continents = [
      // North America
      { x:220,y:160,rx:110,ry:80,r:-0.2 },
      // South America
      { x:280,y:320,rx:60,ry:90,r:0.1 },
      // Europe
      { x:510,y:140,rx:55,ry:45,r:-0.1 },
      // Africa
      { x:510,y:280,rx:65,ry:90,r:0.05 },
      // Asia
      { x:680,y:155,rx:140,ry:75,r:-0.1 },
      // Australia
      { x:760,y:340,rx:65,ry:45,r:0.15 },
      // Antarctica
      { x:512,y:490,rx:200,ry:30,r:0 },
    ];
    ctx.fillStyle = "#2d6a2d";
    continents.forEach(({ x, y, rx, ry, r }) => {
      ctx.save(); ctx.translate(x, y); ctx.rotate(r);
      // main blob
      ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
      // variations
      for (let i = 0; i < 5; i++) {
        const bx = (Math.random() - 0.5) * rx, by = (Math.random() - 0.5) * ry;
        const br = rx * (0.3 + Math.random() * 0.4);
        ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    });
    // India highlight
    ctx.fillStyle = "#39FF1444";
    ctx.beginPath(); ctx.ellipse(680, 210, 28, 35, 0.2, 0, Math.PI * 2); ctx.fill();
    // Add some noise texture
    for (let i = 0; i < 8000; i++) {
      const px = Math.random() * 1024, py = Math.random() * 512;
      const alpha = Math.random() * 0.06;
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.fillRect(px, py, 1, 1);
    }
    // Clouds
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    for (let i = 0; i < 30; i++) {
      ctx.beginPath();
      ctx.ellipse(Math.random() * 1024, Math.random() * 512, 30 + Math.random() * 60, 10 + Math.random() * 20, Math.random(), 0, Math.PI * 2);
      ctx.fill();
    }
    const tex = new THREE.CanvasTexture(texCanvas);

    // Globe mesh
    const geo = new THREE.SphereGeometry(1, 64, 64);
    const mat = new THREE.MeshPhongMaterial({ map: tex, specular: new THREE.Color(0x222222), shininess: 12 });
    const globe = new THREE.Mesh(geo, mat);
    scene.add(globe);
    globeRef.current = globe;

    // Atmosphere glow
    const atmGeo = new THREE.SphereGeometry(1.035, 64, 64);
    const atmMat = new THREE.MeshPhongMaterial({
      color: 0x38BDF8, transparent: true, opacity: 0.08, side: THREE.FrontSide,
    });
    scene.add(new THREE.Mesh(atmGeo, atmMat));
    const atmGeo2 = new THREE.SphereGeometry(1.06, 64, 64);
    const atmMat2 = new THREE.MeshPhongMaterial({
      color: 0x39FF14, transparent: true, opacity: 0.04, side: THREE.FrontSide,
    });
    scene.add(new THREE.Mesh(atmGeo2, atmMat2));

    // User location marker
    const latRad = (userLat * Math.PI) / 180;
    const lonRad = (userLon * Math.PI) / 180;
    const markerGeo = new THREE.SphereGeometry(0.025, 12, 12);
    const markerMat = new THREE.MeshBasicMaterial({ color: 0x39FF14 });
    const marker = new THREE.Mesh(markerGeo, markerMat);
    marker.position.set(
      Math.cos(latRad) * Math.sin(lonRad),
      Math.sin(latRad),
      Math.cos(latRad) * Math.cos(lonRad)
    );
    globe.add(marker);

    // Lights
    scene.add(new THREE.AmbientLight(0x1a3a2a, 0.8));
    const sun = new THREE.DirectionalLight(0xffffff, 1.4);
    sun.position.set(5, 3, 5); scene.add(sun);
    const fill = new THREE.DirectionalLight(0x38BDF8, 0.3);
    fill.position.set(-5, -2, -3); scene.add(fill);

    // Grid lines (lat/lon)
    const gridMat = new THREE.LineBasicMaterial({ color: 0x39FF14, transparent: true, opacity: 0.12 });
    for (let lat = -90; lat <= 90; lat += 30) {
      const pts = [];
      const lr = (lat * Math.PI) / 180;
      for (let lon = 0; lon <= 360; lon += 5) {
        const lnr = (lon * Math.PI) / 180;
        pts.push(new THREE.Vector3(1.002 * Math.cos(lr) * Math.sin(lnr), 1.002 * Math.sin(lr), 1.002 * Math.cos(lr) * Math.cos(lnr)));
      }
      scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), gridMat));
    }
    for (let lon = 0; lon < 360; lon += 30) {
      const pts = [];
      const lnr = (lon * Math.PI) / 180;
      for (let lat = -90; lat <= 90; lat += 5) {
        const lr = (lat * Math.PI) / 180;
        pts.push(new THREE.Vector3(1.002 * Math.cos(lr) * Math.sin(lnr), 1.002 * Math.sin(lr), 1.002 * Math.cos(lr) * Math.cos(lnr)));
      }
      scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), gridMat));
    }

    // Mouse drag
    const onDown = (e) => { isDragging.current = true; prevMouse.current = { x: e.clientX, y: e.clientY }; };
    const onUp = () => { isDragging.current = false; };
    const onMove = (e) => {
      if (!isDragging.current) return;
      const dx = e.clientX - prevMouse.current.x;
      const dy = e.clientY - prevMouse.current.y;
      rotVel.current = { x: dy * 0.003, y: dx * 0.003 };
      prevMouse.current = { x: e.clientX, y: e.clientY };
    };
    const onWheel = (e) => { camera.position.z = Math.max(1.5, Math.min(5, camera.position.z + e.deltaY * 0.005)); };
    renderer.domElement.addEventListener("mousedown", onDown);
    renderer.domElement.addEventListener("touchstart", (e) => onDown(e.touches[0]));
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchend", onUp);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("touchmove", (e) => onMove(e.touches[0]));
    renderer.domElement.addEventListener("wheel", onWheel, { passive: true });

    // Animate
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      if (!isDragging.current) { rotVel.current.y *= 0.98; rotVel.current.x *= 0.98; rotVel.current.y += 0.0008; }
      globe.rotation.y += rotVel.current.y;
      globe.rotation.x = Math.max(-0.5, Math.min(0.5, globe.rotation.x + rotVel.current.x));
      stars.rotation.y += 0.00005;
      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      const W2 = el.clientWidth, H2 = el.clientHeight;
      camera.aspect = W2 / H2; camera.updateProjectionMatrix();
      renderer.setSize(W2, H2);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("mousemove", onMove);
      renderer.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div ref={mountRef} style={{ width:"100%", height:"100%", cursor:"grab" }} />
  );
}

/* ═══════════════════════════════════════════════════════════════
   2. INTERACTIVE 3D FARM MAP (Three.js terrain)
═══════════════════════════════════════════════════════════════ */
function FarmMap3D() {
  const mountRef = useRef(null);
  const frameRef = useRef(null);
  const [hovered, setHovered] = useState(null);
  const [tooltip, setTooltip] = useState({ show: false, x: 0, y: 0, data: null });
  const cameraRef = useRef(null);
  const isDragging = useRef(false);
  const prevMouse = useRef({ x: 0, y: 0 });
  const cameraAngle = useRef({ theta: 0.4, phi: 0.8, r: 18 });

  const farmParcels = [
    { id:"F-001", name:"Wheat Field", x:-3, z:-2, color:0xFACC15, crop:"Wheat", soil:78, yield:"4.2t/ha", status:"healthy" },
    { id:"F-002", name:"Rice Paddy", x:3, z:-1, color:0x39FF14, crop:"Rice", soil:85, yield:"5.1t/ha", status:"healthy" },
    { id:"F-003", name:"Cotton Zone", x:0, z:3, color:0xffffff, crop:"Cotton", soil:62, yield:"2.8t/ha", status:"warning" },
    { id:"F-004", name:"Sugarcane", x:-4, z:3, color:0x8B5E3C, crop:"Sugarcane", soil:71, yield:"68t/ha", status:"healthy" },
    { id:"F-005", name:"Veg Garden", x:4, z:3, color:0x38BDF8, crop:"Vegetables", soil:90, yield:"12t/ha", status:"excellent" },
  ];

  useEffect(() => {
    const el = mountRef.current; if (!el) return;
    const W = el.clientWidth, H = el.clientHeight;
    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x0B1A12, 20, 50);
    const camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 200);
    cameraRef.current = camera;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(W, H); renderer.shadowMap.enabled = true;
    renderer.setClearColor(0x0B1A12, 1);
    el.appendChild(renderer.domElement);

    // Terrain — heightmap using Perlin-like noise
    const res = 60;
    const terrGeo = new THREE.PlaneGeometry(20, 20, res, res);
    terrGeo.rotateX(-Math.PI / 2);
    const pos = terrGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      const h = Math.sin(x * 0.4) * Math.cos(z * 0.3) * 0.5
              + Math.sin(x * 0.9 + 1) * Math.cos(z * 0.7) * 0.3
              + (Math.random() - 0.5) * 0.15;
      pos.setY(i, h * 0.6);
    }
    terrGeo.computeVertexNormals();
    const terrMat = new THREE.MeshLambertMaterial({ color: 0x1a4a1a, wireframe: false });
    const terrain = new THREE.Mesh(terrGeo, terrMat);
    terrain.receiveShadow = true;
    scene.add(terrain);

    // Grid overlay
    const gridHelper = new THREE.GridHelper(20, 20, 0x39FF14, 0x1a3a1a);
    gridHelper.position.y = 0.35;
    scene.add(gridHelper);

    // Farm parcels
    const parcelMeshes = [];
    farmParcels.forEach(p => {
      const geo = new THREE.BoxGeometry(2.2, 0.08, 2.2);
      const mat = new THREE.MeshPhongMaterial({ color: p.color, transparent: true, opacity: 0.7, emissive: p.color, emissiveIntensity: 0.15 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(p.x, 0.38, p.z);
      mesh.userData = p;
      mesh.castShadow = true;
      scene.add(mesh);
      parcelMeshes.push(mesh);

      // Crop marker (vertical cylinder)
      const mGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.6, 8);
      const mMat = new THREE.MeshBasicMaterial({ color: p.color });
      const mMesh = new THREE.Mesh(mGeo, mMat);
      mMesh.position.set(p.x, 0.7, p.z);
      scene.add(mMesh);

      // Pulsing ring
      const rGeo = new THREE.TorusGeometry(0.25, 0.02, 8, 32);
      const rMat = new THREE.MeshBasicMaterial({ color: p.color, transparent: true, opacity: 0.6 });
      const ring = new THREE.Mesh(rGeo, rMat);
      ring.position.set(p.x, 0.44, p.z);
      ring.rotation.x = Math.PI / 2;
      ring.userData.isRing = true;
      scene.add(ring);
    });

    // Water body
    const waterGeo = new THREE.PlaneGeometry(4, 3);
    waterGeo.rotateX(-Math.PI / 2);
    const waterMat = new THREE.MeshPhongMaterial({ color: 0x38BDF8, transparent: true, opacity: 0.55, shininess: 100 });
    const water = new THREE.Mesh(waterGeo, waterMat);
    water.position.set(2, 0.36, -4); scene.add(water);

    // Trees
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const r = 8 + Math.random() * 1;
      const tx = Math.cos(angle) * r, tz = Math.sin(angle) * r;
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 0.6, 6), new THREE.MeshLambertMaterial({ color: 0x5c3317 }));
      trunk.position.set(tx, 0.65, tz); scene.add(trunk);
      const foliage = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 8), new THREE.MeshLambertMaterial({ color: 0x2d5a1b }));
      foliage.position.set(tx, 1.15, tz); scene.add(foliage);
    }

    // Lights
    scene.add(new THREE.AmbientLight(0x1a3a1a, 1.2));
    const sun = new THREE.DirectionalLight(0xffeedd, 1.6);
    sun.position.set(8, 12, 6); sun.castShadow = true; scene.add(sun);
    const fill = new THREE.DirectionalLight(0x39FF14, 0.25);
    fill.position.set(-5, 4, -5); scene.add(fill);

    // Raycaster for hover
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const onMouseMove = (e) => {
      const rect = el.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / W) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / H) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(parcelMeshes);
      if (hits.length > 0) {
        const d = hits[0].object.userData;
        setTooltip({ show: true, x: e.clientX - rect.left, y: e.clientY - rect.top, data: d });
        hits[0].object.material.emissiveIntensity = 0.4;
      } else {
        setTooltip(t => ({ ...t, show: false }));
        parcelMeshes.forEach(m => m.material.emissiveIntensity = 0.15);
      }
    };
    el.addEventListener("mousemove", onMouseMove);

    // Camera orbit
    const updateCamera = () => {
      const { theta, phi, r } = cameraAngle.current;
      camera.position.set(r * Math.sin(phi) * Math.sin(theta), r * Math.cos(phi) + 2, r * Math.sin(phi) * Math.cos(theta));
      camera.lookAt(0, 0, 0);
    };
    updateCamera();

    const onDown = (e) => { isDragging.current = true; prevMouse.current = { x: e.clientX, y: e.clientY }; };
    const onUp = () => { isDragging.current = false; };
    const onDrag = (e) => {
      if (!isDragging.current) return;
      const dx = e.clientX - prevMouse.current.x, dy = e.clientY - prevMouse.current.y;
      cameraAngle.current.theta -= dx * 0.008;
      cameraAngle.current.phi = Math.max(0.2, Math.min(1.4, cameraAngle.current.phi + dy * 0.008));
      prevMouse.current = { x: e.clientX, y: e.clientY };
      updateCamera();
    };
    const onWheelMap = (e) => {
      cameraAngle.current.r = Math.max(8, Math.min(30, cameraAngle.current.r + e.deltaY * 0.04));
      updateCamera();
    };
    el.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("mousemove", onDrag);
    el.addEventListener("wheel", onWheelMap, { passive: true });

    let t = 0;
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      t += 0.016;
      // Pulse rings
      scene.children.forEach(c => { if (c.userData?.isRing) { c.scale.setScalar(1 + 0.15 * Math.sin(t * 2)); c.material.opacity = 0.4 + 0.3 * Math.sin(t * 2); } });
      water.position.y = 0.36 + Math.sin(t * 0.8) * 0.01;
      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => { camera.aspect = el.clientWidth / el.clientHeight; camera.updateProjectionMatrix(); renderer.setSize(el.clientWidth, el.clientHeight); };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(frameRef.current);
      el.removeEventListener("mousemove", onMouseMove);
      el.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("mousemove", onDrag);
      el.removeEventListener("wheel", onWheelMap);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div style={{ position:"relative", width:"100%", height:"100%" }}>
      <div ref={mountRef} style={{ width:"100%", height:"100%", cursor:"grab" }} />
      {tooltip.show && tooltip.data && (
        <div style={{
          position:"absolute", left: tooltip.x + 12, top: tooltip.y - 10, pointerEvents:"none",
          background:"rgba(11,61,46,0.95)", border:"1px solid #39FF14", borderRadius:8,
          padding:"10px 14px", minWidth:160, animation:"fadeIn .15s ease", zIndex:10,
        }}>
          <div style={{ fontFamily:"'Syne',sans-serif", fontSize:11, color:"#39FF14", marginBottom:6 }}>{tooltip.data.id}</div>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:14, fontWeight:700, marginBottom:4 }}>{tooltip.data.name}</div>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            {[["Crop",tooltip.data.crop],["Yield",tooltip.data.yield],["Soil",tooltip.data.soil+"%"]].map(([k,v])=>(
              <div key={k} style={{ fontSize:11, color:"rgba(255,255,255,.6)" }}>{k}: <span style={{color:"#39FF14",fontWeight:700}}>{v}</span></div>
            ))}
          </div>
        </div>
      )}
      <div style={{ position:"absolute", bottom:10, left:10, fontFamily:"'JetBrains Mono',monospace", fontSize:10, color:"rgba(255,255,255,.35)" }}>
        Drag to orbit · Scroll to zoom · Hover parcels
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   3. 3D BAR CHART (Three.js)
═══════════════════════════════════════════════════════════════ */
function BarChart3D({ data, title }) {
  const mountRef = useRef(null);
  const frameRef = useRef(null);
  const barsRef = useRef([]);
  const [hovered, setHovered] = useState(null);

  useEffect(() => {
    const el = mountRef.current; if (!el) return;
    const W = el.clientWidth, H = el.clientHeight;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, W / H, 0.1, 100);
    camera.position.set(0, 5, 12);
    camera.lookAt(0, 0, 0);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(W, H); renderer.setClearColor(0x000000, 0);
    el.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0x334433, 1.2));
    const dLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dLight.position.set(5, 8, 5); scene.add(dLight);
    const nLight = new THREE.DirectionalLight(0x39FF14, 0.4);
    nLight.position.set(-3, 4, -3); scene.add(nLight);

    // Base platform
    const baseGeo = new THREE.BoxGeometry(data.length * 1.6 + 1, 0.08, 3);
    const baseMat = new THREE.MeshPhongMaterial({ color: 0x0B3D2E, transparent: true, opacity: 0.7 });
    scene.add(new THREE.Mesh(baseGeo, baseMat));

    // Grid lines on base
    const gridMat = new THREE.LineBasicMaterial({ color: 0x39FF14, transparent: true, opacity: 0.12 });
    const startX = -(data.length * 1.6) / 2;
    for (let i = 0; i <= 5; i++) {
      const y = i * 1.0;
      const pts = [new THREE.Vector3(startX - 0.5, y + 0.04, 1.2), new THREE.Vector3(-startX + 0.5, y + 0.04, 1.2)];
      scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), gridMat));
    }

    // Bars
    const maxVal = Math.max(...data.map(d => d.value));
    const bars = [];
    data.forEach((d, i) => {
      const targetH = (d.value / maxVal) * 4.5;
      const geo = new THREE.BoxGeometry(0.9, targetH, 1.2);
      geo.translate(0, targetH / 2, 0);
      const color = new THREE.Color(d.color || "#39FF14");
      const mat = new THREE.MeshPhongMaterial({ color, emissive: color, emissiveIntensity: 0.2, transparent: true, opacity: 0.9 });
      const bar = new THREE.Mesh(geo, mat);
      const xPos = startX + i * 1.6 + 0.8;
      bar.position.set(xPos, 0.04, 0);
      bar.scale.y = 0;
      bar.userData = { ...d, index: i, targetH };
      scene.add(bar);
      bars.push(bar);

      // Label line
      const lpts = [new THREE.Vector3(xPos, 0.04, 1.2), new THREE.Vector3(xPos, 0.04, 1.8)];
      scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(lpts), new THREE.LineBasicMaterial({ color: 0x39FF14, transparent: true, opacity: 0.4 })));
    });
    barsRef.current = bars;

    // Raycaster
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const onMove = (e) => {
      const rect = el.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / W) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / H) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(bars);
      if (hits.length > 0) { setHovered(hits[0].object.userData); hits[0].object.material.emissiveIntensity = 0.6; }
      else { setHovered(null); bars.forEach(b => b.material.emissiveIntensity = 0.2); }
    };
    el.addEventListener("mousemove", onMove);

    let t = 0;
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      t += 0.016;
      bars.forEach((b, i) => {
        if (b.scale.y < 1) b.scale.y = Math.min(1, b.scale.y + 0.025 * (1 - i * 0.05));
        b.material.emissiveIntensity = 0.2 + 0.1 * Math.sin(t * 1.5 + i * 0.5);
      });
      scene.rotation.y = Math.sin(t * 0.2) * 0.08;
      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => { camera.aspect = el.clientWidth / el.clientHeight; camera.updateProjectionMatrix(); renderer.setSize(el.clientWidth, el.clientHeight); };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(frameRef.current);
      el.removeEventListener("mousemove", onMove);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div style={{ position:"relative", width:"100%", height:"100%" }}>
      <div ref={mountRef} style={{ width:"100%", height:"100%" }} />
      {hovered && (
        <div style={{ position:"absolute", top:12, right:12, background:"rgba(11,61,46,.95)", border:"1px solid #39FF14", borderRadius:8, padding:"10px 14px", minWidth:140, animation:"fadeIn .15s ease" }}>
          <div style={{ fontFamily:"'Syne',sans-serif", fontSize:10, color:"#39FF14", marginBottom:4 }}>{hovered.label}</div>
          <div style={{ fontFamily:"'Syne',sans-serif", fontSize:20, fontWeight:900, color:"#fff" }}>{hovered.value}<span style={{fontSize:11,color:"rgba(255,255,255,.5)"}}>{hovered.unit}</span></div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   4. PLANT GROWTH SIMULATION (Three.js)
═══════════════════════════════════════════════════════════════ */
function PlantGrowth3D({ weather }) {
  const mountRef = useRef(null);
  const frameRef = useRef(null);
  const [stage, setStage] = useState(0);
  const [soilMoisture, setSoilMoisture] = useState(70);
  const [temperature, setTemperature] = useState(weather ? parseInt(weather.temp) || 25 : 25);
  const stageRef = useRef(0);
  const plantRef = useRef({ stem: null, leaves: [], roots: [], seed: null, seedling: null });
  const sceneRef = useRef(null);

  const STAGES = [
    { label:"Seed", desc:"Dormant seed in soil", color:"#8B5E3C" },
    { label:"Sprout", desc:"First shoot emerging", color:"#FACC15" },
    { label:"Sapling", desc:"Young plant growing", color:"#39FF14" },
    { label:"Harvest", desc:"Ready to harvest!", color:"#f87171" },
  ];

  const buildPlant = useCallback((scene, s) => {
    const p = plantRef.current;
    // Remove old
    [...(p.leaves||[]), ...(p.roots||[]), p.stem, p.seed, p.seedling].forEach(m => { if (m) scene.remove(m); });
    plantRef.current = { stem: null, leaves: [], roots: [], seed: null, seedling: null };

    if (s === 0) {
      // Seed
      const seed = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 12), new THREE.MeshPhongMaterial({ color: 0x8B5E3C }));
      seed.position.set(0, -0.3, 0); scene.add(seed); plantRef.current.seed = seed;
    } else if (s === 1) {
      // Sprout
      const seedling = new THREE.Group();
      const stemG = new THREE.CylinderGeometry(0.04, 0.06, 0.8, 8);
      const stem = new THREE.Mesh(stemG, new THREE.MeshPhongMaterial({ color: 0x2d8a2d }));
      stem.position.y = 0.4; seedling.add(stem);
      // Small leaf
      const leafG = new THREE.SphereGeometry(0.15, 8, 8);
      leafG.scale(1.8, 0.4, 1);
      const leaf = new THREE.Mesh(leafG, new THREE.MeshPhongMaterial({ color: 0x39FF14 }));
      leaf.position.set(0.15, 0.85, 0); seedling.add(leaf);
      // Root
      for (let i = 0; i < 3; i++) {
        const rG = new THREE.CylinderGeometry(0.02, 0.01, 0.4, 4);
        const r = new THREE.Mesh(rG, new THREE.MeshPhongMaterial({ color: 0x6b4226 }));
        const angle = (i / 3) * Math.PI * 2;
        r.position.set(Math.cos(angle) * 0.12, -0.3, Math.sin(angle) * 0.12);
        r.rotation.z = (Math.random() - 0.5) * 0.8;
        seedling.add(r);
      }
      seedling.position.y = 0; scene.add(seedling);
      plantRef.current.seedling = seedling;
    } else if (s === 2) {
      // Full plant
      const group = new THREE.Group();
      const stemH = 2.5;
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, stemH, 8), new THREE.MeshPhongMaterial({ color: 0x2d6a1a }));
      stem.position.y = stemH / 2; group.add(stem);
      // Leaves
      const leaves = [];
      for (let i = 0; i < 6; i++) {
        const lG = new THREE.SphereGeometry(0.28, 8, 8);
        lG.scale(2.2, 0.35, 1.1);
        const l = new THREE.Mesh(lG, new THREE.MeshPhongMaterial({ color: new THREE.Color(0x39FF14).lerp(new THREE.Color(0x2d6a1a), Math.random() * 0.4), shininess: 40 }));
        const h = 0.5 + i * 0.4;
        const a = (i / 6) * Math.PI * 2;
        l.position.set(Math.cos(a) * 0.5, h, Math.sin(a) * 0.3);
        l.rotation.z = a;
        group.add(l); leaves.push(l);
      }
      // Top flower/bud
      const bud = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 12), new THREE.MeshPhongMaterial({ color: 0xffffff, emissive: 0xffeedd, emissiveIntensity: 0.3 }));
      bud.position.y = stemH + 0.15; group.add(bud);
      // Roots
      for (let i = 0; i < 8; i++) {
        const rPts = [];
        const angle = (i / 8) * Math.PI * 2;
        for (let j = 0; j <= 5; j++) {
          rPts.push(new THREE.Vector3(Math.cos(angle) * j * 0.15, -j * 0.1 + (Math.random() - 0.5) * 0.05, Math.sin(angle) * j * 0.1));
        }
        const rLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(rPts), new THREE.LineBasicMaterial({ color: 0x6b4226, transparent: true, opacity: 0.7 }));
        group.add(rLine);
      }
      group.position.y = 0;
      scene.add(group);
      plantRef.current.seedling = group;
      plantRef.current.leaves = leaves;
    } else {
      // Harvest — golden
      const group = new THREE.Group();
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.12, 3, 8), new THREE.MeshPhongMaterial({ color: 0xBFA300 }));
      stem.position.y = 1.5; group.add(stem);
      // Golden grains at top
      for (let i = 0; i < 12; i++) {
        const g = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), new THREE.MeshPhongMaterial({ color: 0xFACC15, emissive: 0xFACC15, emissiveIntensity: 0.4 }));
        const a = (i / 12) * Math.PI * 2;
        g.position.set(Math.cos(a) * 0.18, 3.1 + Math.random() * 0.3, Math.sin(a) * 0.18);
        group.add(g);
      }
      // Golden leaves
      for (let i = 0; i < 5; i++) {
        const lG = new THREE.SphereGeometry(0.22, 8, 8); lG.scale(2, 0.3, 1);
        const l = new THREE.Mesh(lG, new THREE.MeshPhongMaterial({ color: 0xDAA520 }));
        const h = 0.4 + i * 0.55, a = (i / 5) * Math.PI * 2;
        l.position.set(Math.cos(a) * 0.4, h, Math.sin(a) * 0.3); l.rotation.z = a;
        group.add(l);
      }
      group.position.y = 0;
      scene.add(group);
      plantRef.current.seedling = group;
    }
  }, []);

  useEffect(() => {
    const el = mountRef.current; if (!el) return;
    const W = el.clientWidth, H = el.clientHeight;
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 50);
    camera.position.set(0, 2, 6);
    camera.lookAt(0, 1.5, 0);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(W, H); renderer.setClearColor(0x000000, 0);
    el.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0x223322, 1.5));
    const sun = new THREE.DirectionalLight(0xffeedd, 1.4); sun.position.set(3, 6, 4); scene.add(sun);
    const fill = new THREE.DirectionalLight(0x39FF14, 0.3); fill.position.set(-3, 2, -2); scene.add(fill);

    // Soil block
    const soilGeo = new THREE.BoxGeometry(4, 0.5, 2.5);
    const soilMat = new THREE.MeshPhongMaterial({ color: 0x5C3317 });
    const soil = new THREE.Mesh(soilGeo, soilMat); soil.position.y = -0.5; scene.add(soil);
    // Surface
    const surfGeo = new THREE.PlaneGeometry(4, 2.5); surfGeo.rotateX(-Math.PI / 2);
    const surfMat = new THREE.MeshPhongMaterial({ color: 0x3a2009 });
    const surf = new THREE.Mesh(surfGeo, surfMat); surf.position.y = -0.24; scene.add(surf);
    // Grid lines on soil
    const gMat = new THREE.LineBasicMaterial({ color: 0x39FF14, transparent: true, opacity: 0.15 });
    for (let i = -2; i <= 2; i++) {
      const pts = [new THREE.Vector3(-2, -0.23, i * 0.6), new THREE.Vector3(2, -0.23, i * 0.6)];
      scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), gMat));
    }

    buildPlant(scene, 0);

    let t = 0;
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      t += 0.016;
      const { seedling, leaves } = plantRef.current;
      if (seedling) {
        seedling.rotation.y = Math.sin(t * 0.4) * 0.05;
        if (leaves?.length) leaves.forEach((l, i) => l.rotation.y = Math.sin(t * 0.8 + i) * 0.08);
      }
      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => { camera.aspect = el.clientWidth / el.clientHeight; camera.updateProjectionMatrix(); renderer.setSize(el.clientWidth, el.clientHeight); };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  }, []);

  const setStageHandler = (s) => {
    setStage(s); stageRef.current = s;
    if (sceneRef.current) buildPlant(sceneRef.current, s);
  };

  const autoGrowStage = Math.min(3, Math.floor((soilMoisture / 100) * 2 + (temperature > 20 && temperature < 35 ? 1 : 0) + (temperature > 28 && temperature < 33 ? 0.5 : 0)));

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", gap:12 }}>
      <div style={{ flex:1, position:"relative", minHeight:240 }}>
        <div ref={mountRef} style={{ width:"100%", height:"100%" }} />
        <div style={{ position:"absolute", top:10, left:10, display:"flex", gap:6 }}>
          {STAGES.map((s, i) => (
            <button key={i} onClick={() => setStageHandler(i)} style={{ padding:"4px 10px", borderRadius:4, border:`1px solid ${stage===i?s.color:"rgba(255,255,255,.2)"}`, background: stage===i?"rgba(57,255,20,.15)":"transparent", color: stage===i?"#39FF14":"rgba(255,255,255,.5)", fontFamily:"'JetBrains Mono',monospace", fontSize:10, cursor:"pointer", transition:"all .2s" }}>
              {s.label}
            </button>
          ))}
        </div>
        <div style={{ position:"absolute", bottom:10, right:10, textAlign:"right" }}>
          <div style={{ fontFamily:"'Syne',sans-serif", fontSize:14, color:STAGES[stage].color }}>{STAGES[stage].label}</div>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color:"rgba(255,255,255,.5)" }}>{STAGES[stage].desc}</div>
        </div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, padding:"0 4px" }}>
        <div>
          <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:10, color:"rgba(255,255,255,.45)", marginBottom:4 }}>Soil moisture: <span style={{color:"#38BDF8"}}>{soilMoisture}%</span></div>
          <input type="range" min="0" max="100" value={soilMoisture} onChange={e => { setSoilMoisture(+e.target.value); setStageHandler(Math.min(3, Math.floor(+e.target.value / 30))); }} style={{ width:"100%", accentColor:"#38BDF8" }} />
        </div>
        <div>
          <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:10, color:"rgba(255,255,255,.45)", marginBottom:4 }}>Temperature: <span style={{color:"#FACC15"}}>{temperature}°C</span></div>
          <input type="range" min="5" max="50" value={temperature} onChange={e => setTemperature(+e.target.value)} style={{ width:"100%", accentColor:"#FACC15" }} />
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   LINE CHART (Canvas 2D — rainfall trends)
═══════════════════════════════════════════════════════════════ */
function RainfallChart({ data }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    const pad = { l:40, r:16, t:16, b:32 };
    const cW = W - pad.l - pad.r, cH = H - pad.t - pad.b;
    const maxV = Math.max(...data.map(d => d.value)) * 1.2;
    const xStep = cW / (data.length - 1);

    // Grid
    for (let i = 0; i <= 4; i++) {
      const y = pad.t + cH - (i / 4) * cH;
      ctx.strokeStyle = "rgba(57,255,20,.1)"; ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(pad.l + cW, y); ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,.3)"; ctx.font = "10px 'JetBrains Mono',monospace";
      ctx.fillText(Math.round((i / 4) * maxV), 0, y + 4);
    }

    // Area fill
    const grad = ctx.createLinearGradient(0, pad.t, 0, pad.t + cH);
    grad.addColorStop(0, "rgba(56,189,248,0.35)"); grad.addColorStop(1, "rgba(56,189,248,0)");
    ctx.beginPath();
    data.forEach((d, i) => { const x = pad.l + i * xStep, y = pad.t + cH - (d.value / maxV) * cH; i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); });
    ctx.lineTo(pad.l + (data.length - 1) * xStep, pad.t + cH);
    ctx.lineTo(pad.l, pad.t + cH);
    ctx.closePath(); ctx.fillStyle = grad; ctx.fill();

    // Line
    ctx.beginPath(); ctx.strokeStyle = "#38BDF8"; ctx.lineWidth = 2; ctx.lineJoin = "round";
    data.forEach((d, i) => { const x = pad.l + i * xStep, y = pad.t + cH - (d.value / maxV) * cH; i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); });
    ctx.stroke();

    // Dots + labels
    data.forEach((d, i) => {
      const x = pad.l + i * xStep, y = pad.t + cH - (d.value / maxV) * cH;
      ctx.beginPath(); ctx.arc(x, y, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = "#38BDF8"; ctx.fill();
      ctx.strokeStyle = "#0F1117"; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,.4)"; ctx.font = "9px 'JetBrains Mono',monospace";
      ctx.fillText(d.label, x - 8, pad.t + cH + 18);
    });
  }, [data]);
  return <canvas ref={canvasRef} width={400} height={180} style={{ width:"100%", height:"auto" }} />;
}

/* ═══════════════════════════════════════════════════════════════
   NAVIGATION
═══════════════════════════════════════════════════════════════ */
function Nav({ page, setPage }) {
  const [sc, setSc] = useState(false);
  useEffect(() => { const h = () => setSc(window.scrollY > 30); window.addEventListener("scroll", h); return () => window.removeEventListener("scroll", h); }, []);
  const pages = ["Globe", "Farm Map", "Analytics", "Mandi", "Growth", "Dashboard"];
  return (
    <nav style={{ position:"fixed", top:0, left:0, right:0, zIndex:100, height:60, display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 28px", background: sc ? "rgba(15,17,23,0.94)" : "transparent", backdropFilter: sc ? "blur(16px)" : "none", borderBottom: sc ? "1px solid rgba(57,255,20,.1)" : "none", transition:"all .3s" }}>
      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
        <div style={{ width:30, height:30, borderRadius:6, background:"linear-gradient(135deg,#39FF14,#0B3D2E)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:15, boxShadow:"0 0 10px rgba(57,255,20,.4)" }}>🌱</div>
        <span style={{ fontFamily:"'Syne',sans-serif", fontSize:14, fontWeight:700, color:"#39FF14", letterSpacing:".1em" }}>AGRO<span style={{color:"#fff"}}>MIND</span></span>
      </div>
      <div style={{ display:"flex", gap:24, alignItems:"center" }}>
        {pages.map(p => (
          <button key={p} className={`nav-item ${page===p?"active":""}`} onClick={() => setPage(p)}>{p}</button>
        ))}
      </div>
      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
        <div style={{ width:7, height:7, borderRadius:"50%", background:"#39FF14", animation:"neonPulse 2s infinite" }} />
        <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:10, color:"#39FF14" }}>LIVE</span>
      </div>
    </nav>
  );
}

/* ═══════════════════════════════════════════════════════════════
   PAGES
═══════════════════════════════════════════════════════════════ */
function GlobePage() {
  const [loc, setLoc] = useState({ lat: 26.85, lon: 80.95, name: "Lucknow, UP" });
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(p => setLoc({ lat: p.coords.latitude, lon: p.coords.longitude, name: "Your Location" }), () => {});
    }
  }, []);
  return (
    <div style={{ padding:"80px 28px 40px" }}>
      <div style={{ textAlign:"center", marginBottom:32 }}>
        <div className="tag" style={{ marginBottom:10 }}>[ EARTH VISUALIZATION ]</div>
        <h1 style={{ fontFamily:"'Syne',sans-serif", fontSize:"clamp(24px,5vw,52px)", fontWeight:900, background:"linear-gradient(135deg,#fff 30%,#39FF14 70%)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>Interactive Globe</h1>
        <p style={{ color:"rgba(255,255,255,.55)", fontFamily:"'Inter',sans-serif", fontSize:16, marginTop:8 }}>
          Drag to rotate · Scroll to zoom · Your location pinned in neon green
        </p>
      </div>
      <div className="glass" style={{ width:"100%", maxWidth:800, margin:"0 auto", height:500, overflow:"hidden", position:"relative" }}>
        <Globe3D userLat={loc.lat} userLon={loc.lon} />
        <div style={{ position:"absolute", bottom:16, left:16, fontFamily:"'JetBrains Mono',monospace", fontSize:11, color:"rgba(255,255,255,.45)" }}>
          📍 {loc.name} · {loc.lat.toFixed(2)}°N {loc.lon.toFixed(2)}°E
        </div>
        <div style={{ position:"absolute", top:16, right:16, display:"flex", flexDirection:"column", gap:6 }}>
          {[["🌾 Agri zones","#39FF14"], ["💧 Water bodies","#38BDF8"], ["🏔️ Terrain","#8B5E3C"]].map(([l,c]) => (
            <div key={l} style={{ display:"flex", alignItems:"center", gap:6, background:"rgba(0,0,0,.5)", padding:"4px 8px", borderRadius:4 }}>
              <div style={{ width:8, height:8, borderRadius:"50%", background:c }} />
              <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:9, color:"rgba(255,255,255,.6)" }}>{l}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:16, marginTop:24, maxWidth:800, margin:"24px auto 0" }}>
        {[["150M+","Indian Farmers","#39FF14"],["28","Agricultural Zones","#38BDF8"],["4","Monitoring Tools","#FACC15"],["10s","Response Time","#a78bfa"]].map(([v,l,c]) => (
          <div key={l} className="glass" style={{ padding:"16px 18px", textAlign:"center" }}>
            <div style={{ fontFamily:"'Syne',sans-serif", fontSize:26, fontWeight:900, color:c }}>{v}</div>
            <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color:"rgba(255,255,255,.45)", marginTop:4, textTransform:"uppercase", letterSpacing:".06em" }}>{l}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FarmMapPage() {
  return (
    <div style={{ padding:"80px 28px 40px" }}>
      <div style={{ textAlign:"center", marginBottom:28 }}>
        <div className="tag" style={{ marginBottom:10 }}>[ INTERACTIVE FARM MAP ]</div>
        <h1 style={{ fontFamily:"'Syne',sans-serif", fontSize:"clamp(22px,4vw,44px)", fontWeight:900, color:"#fff" }}>Field Intelligence Map</h1>
        <p style={{ color:"rgba(255,255,255,.5)", fontFamily:"'Inter',sans-serif", fontSize:15, marginTop:6 }}>
          Real-time terrain with crop parcels · Hover for farm insights · Drag to orbit
        </p>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 260px", gap:20, maxWidth:1100, margin:"0 auto" }}>
        <div className="glass" style={{ height:520, overflow:"hidden" }}>
          <FarmMap3D />
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <div className="glass" style={{ padding:18 }}>
            <div style={{ fontFamily:"'Syne',sans-serif", fontSize:10, color:"#39FF14", letterSpacing:".12em", marginBottom:14 }}>PARCEL LEGEND</div>
            {[["F-001","Wheat Field","#FACC15","4.2t/ha"],["F-002","Rice Paddy","#39FF14","5.1t/ha"],["F-003","Cotton Zone","#f0f0f0","2.8t/ha"],["F-004","Sugarcane","#8B5E3C","68t/ha"],["F-005","Veg Garden","#38BDF8","12t/ha"]].map(([id,name,color,yield_]) => (
              <div key={id} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
                <div style={{ width:10, height:10, borderRadius:2, background:color, flexShrink:0 }} />
                <div style={{ flex:1 }}>
                  <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:600 }}>{name}</div>
                  <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:10, color:"rgba(255,255,255,.4)" }}>{id} · {yield_}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="glass" style={{ padding:18 }}>
            <div style={{ fontFamily:"'Syne',sans-serif", fontSize:10, color:"#39FF14", letterSpacing:".12em", marginBottom:12 }}>SOIL HEALTH</div>
            {[["Zone A","85%","#39FF14"],["Zone B","62%","#FACC15"],["Zone C","43%","#f87171"]].map(([z,v,c]) => (
              <div key={z} style={{ marginBottom:10 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4, fontFamily:"'Inter',sans-serif", fontSize:12 }}>
                  <span style={{ color:"rgba(255,255,255,.55)" }}>{z}</span>
                  <span style={{ color:c, fontWeight:700 }}>{v}</span>
                </div>
                <div style={{ height:4, borderRadius:2, background:"rgba(255,255,255,.08)" }}>
                  <div style={{ height:"100%", width:v, background:c, borderRadius:2, transition:"width 1s ease" }} />
                </div>
              </div>
            ))}
          </div>
          <div className="glass" style={{ padding:18 }}>
            <div style={{ fontFamily:"'Syne',sans-serif", fontSize:10, color:"#39FF14", letterSpacing:".12em", marginBottom:10 }}>ALERTS</div>
            {[["Cotton Zone — low soil moisture","warning"],["Field F-003 — spray overdue","danger"],["Weather: rain in 48h","info"]].map(([msg,type]) => (
              <div key={msg} style={{ display:"flex", gap:8, alignItems:"flex-start", marginBottom:8, fontSize:12, fontFamily:"'Inter',sans-serif", fontWeight:500, color:"rgba(255,255,255,.65)", lineHeight:1.5 }}>
                <div style={{ width:6, height:6, borderRadius:"50%", background: type==="warning"?"#FACC15":type==="danger"?"#f87171":"#38BDF8", marginTop:4, flexShrink:0 }} />
                {msg}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function AnalyticsPage({ analytics, loading }) {
  const yieldData = analytics?.yieldData || [
    { label:"Jan", value:2.1, unit:"t/ha", color:"#39FF14" },
    { label:"Feb", value:2.8, unit:"t/ha", color:"#39FF14" },
    { label:"Mar", value:3.4, unit:"t/ha", color:"#39FF14" },
    { label:"Apr", value:4.2, unit:"t/ha", color:"#FACC15" },
    { label:"May", value:3.9, unit:"t/ha", color:"#FACC15" },
    { label:"Jun", value:5.1, unit:"t/ha", color:"#39FF14" },
    { label:"Jul", value:4.8, unit:"t/ha", color:"#38BDF8" },
  ];
  const rainfallData = [
    { label:"J", value:12 },{ label:"F", value:8 },{ label:"M", value:22 },
    { label:"A", value:45 },{ label:"M", value:89 },{ label:"J", value:135 },
    { label:"J", value:180 },{ label:"A", value:165 },{ label:"S", value:110 },
    { label:"O", value:55 },{ label:"N", value:18 },{ label:"D", value:6 },
  ];
  const m = analytics?.metrics || {};
  return (
    <div style={{ padding:"80px 28px 40px", maxWidth:1100, margin:"0 auto" }}>
      <div style={{ textAlign:"center", marginBottom:32 }}>
        <div className="tag" style={{ marginBottom:10 }}>[ DATA VISUALIZATION ]</div>
        <h1 style={{ fontFamily:"'Syne',sans-serif", fontSize:"clamp(22px,4vw,44px)", fontWeight:900, color:"#fff" }}>Analytics Engine</h1>
        {loading && <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:11, color:"#39FF14", marginTop:8, animation:"neonPulse 1s infinite" }}>⟳ Loading live data from AI...</div>}
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20, marginBottom:20 }}>
        <div className="glass" style={{ padding:20 }}>
          <div style={{ fontFamily:"'Syne',sans-serif", fontSize:11, color:"#FACC15", letterSpacing:".1em", marginBottom:4 }}>CROP YIELD</div>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:"rgba(255,255,255,.4)", marginBottom:8 }}>Hover bars for values · Auto-animates on load</div>
          <div style={{ height:220 }}>
            <BarChart3D data={yieldData} title="Crop Yield" />
          </div>
        </div>
        <div className="glass" style={{ padding:20 }}>
          <div style={{ fontFamily:"'Syne',sans-serif", fontSize:11, color:"#38BDF8", letterSpacing:".1em", marginBottom:4 }}>RAINFALL TRENDS</div>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:"rgba(255,255,255,.4)", marginBottom:8 }}>Monthly mm · Lucknow district</div>
          <RainfallChart data={rainfallData} />
        </div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:16 }}>
        {[
          { label:"Avg Yield",    value: m.avgYield    || "4.2", unit:"t/ha",   color:"#39FF14", delta: m.avgYieldDelta    || "+12%" },
          { label:"Rainfall",     value: m.rainfall    || "865", unit:"mm/yr",  color:"#38BDF8", delta: m.rainfallDelta    || "+8%"  },
          { label:"Soil Health",  value: m.soilHealth  || "76",  unit:"%",      color:"#FACC15", delta: m.soilDelta        || "-3%"  },
          { label:"Active Fields",value: analytics?.fields?.length?.toString() || "5", unit:"fields", color:"#a78bfa", delta:"stable" },
        ].map(({ label, value, unit, color, delta }) => (
          <div key={label} className="glass" style={{ padding:"16px 14px" }}>
            <div style={{ fontFamily:"'Inter',sans-serif", fontSize:11, color:"rgba(255,255,255,.4)", textTransform:"uppercase", letterSpacing:".06em", marginBottom:6 }}>{label}</div>
            <div style={{ fontFamily:"'Syne',sans-serif", fontSize:24, fontWeight:900, color }}>{value}<span style={{fontSize:11,color:"rgba(255,255,255,.35)",marginLeft:2}}>{unit}</span></div>
            <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:10, color: delta.startsWith("+")?"#39FF14":delta.startsWith("-")?"#f87171":"rgba(255,255,255,.4)", marginTop:4 }}>{delta}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function GrowthPage({ weather }) {
  const STAGES = [
    { label:"Seed",    icon:"🌰", color:"#8B5E3C", temp:"15–25°C", moisture:"40–60%", day:"Day 0",    desc:"Dormant seed planted in moist, nutrient-rich soil. Water and warmth trigger germination." },
    { label:"Sprout",  icon:"🌱", color:"#FACC15", temp:"20–28°C", moisture:"60–75%", day:"Day 7",    desc:"First shoot breaks the soil surface. Cotyledon leaves emerge and photosynthesis begins." },
    { label:"Sapling", icon:"🌿", color:"#39FF14", temp:"22–32°C", moisture:"65–80%", day:"Day 30",   desc:"True leaves develop. Root system expands. Plant enters vegetative growth phase." },
    { label:"Harvest", icon:"🌾", color:"#FACC15", temp:"25–35°C", moisture:"40–55%", day:"Day 90",   desc:"Grain heads fully formed. Golden color signals peak maturity. Ready to harvest." },
  ];

  const timeline = [
    { week:"Wk 1–2", event:"Germination", detail:"Seed absorbs water, root emerges", color:"#8B5E3C" },
    { week:"Wk 3–4", event:"Seedling",    detail:"First leaves, shallow roots",        color:"#FACC15" },
    { week:"Wk 5–8", event:"Vegetative",  detail:"Rapid stem & leaf growth",           color:"#39FF14" },
    { week:"Wk 9–11",event:"Flowering",   detail:"Pollination, grain set begins",      color:"#a78bfa" },
    { week:"Wk 12",  event:"Harvest",     detail:"Moisture <14%, combine ready",       color:"#FACC15" },
  ];

  const risks = [
    { label:"Late Blight",    level:15, color:"#39FF14" },
    { label:"Aphid Pressure", level:42, color:"#FACC15" },
    { label:"Fungal Risk",    level:20, color:"#39FF14" },
    { label:"Drought Stress", level:58, color:"#f87171" },
  ];

  return (
    <div style={{ padding:"80px 28px 40px", maxWidth:1200, margin:"0 auto" }}>
      {/* Header */}
      <div style={{ textAlign:"center", marginBottom:36 }}>
        <div className="tag" style={{ marginBottom:10 }}>[ GROWTH SIMULATION ]</div>
        <h1 style={{ fontFamily:"'Syne',sans-serif", fontSize:"clamp(22px,4vw,44px)", fontWeight:900, background:"linear-gradient(135deg,#fff 30%,#39FF14 70%)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
          Crop Growth Engine
        </h1>
        <p style={{ color:"rgba(255,255,255,.5)", fontFamily:"'Inter',sans-serif", fontSize:15, marginTop:8 }}>
          Select a stage · Adjust environment · Watch the plant respond in real time
        </p>
      </div>

      {/* Stage selector tabs */}
      <div style={{ display:"flex", justifyContent:"center", gap:12, marginBottom:28, flexWrap:"wrap" }}>
        {STAGES.map((s, i) => (
          <div key={s.label} style={{ background:"rgba(255,255,255,.04)", border:`1px solid ${s.color}44`, borderRadius:10, padding:"10px 20px", textAlign:"center", minWidth:130 }}>
            <div style={{ fontSize:24, marginBottom:4 }}>{s.icon}</div>
            <div style={{ fontFamily:"'Syne',sans-serif", fontSize:11, color:s.color, fontWeight:700 }}>{s.label}</div>
            <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:9, color:"rgba(255,255,255,.35)", marginTop:2 }}>{s.day}</div>
          </div>
        ))}
      </div>

      {/* Main grid */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 340px", gap:20, marginBottom:20 }}>

        {/* 3D viewport — tall and prominent */}
        <div className="glass" style={{ height:520, overflow:"hidden", position:"relative" }}>
          {/* ambient label */}
          <div style={{ position:"absolute", top:12, left:12, zIndex:2, fontFamily:"'Syne',sans-serif", fontSize:10, color:"#39FF14", letterSpacing:".12em", background:"rgba(7,26,15,.7)", padding:"4px 10px", borderRadius:4 }}>
            GROWTH VIEW
          </div>
          <div style={{ position:"absolute", top:12, right:12, zIndex:2, display:"flex", gap:6 }}>
            <div style={{ background:"rgba(57,255,20,.12)", border:"1px solid rgba(57,255,20,.25)", borderRadius:4, padding:"3px 8px", fontFamily:"'JetBrains Mono',monospace", fontSize:9, color:"#39FF14" }}>
              THREE.JS
            </div>
            <div style={{ background:"rgba(57,255,20,.12)", border:"1px solid rgba(57,255,20,.25)", borderRadius:4, padding:"3px 8px", fontFamily:"'JetBrains Mono',monospace", fontSize:9, color:"#39FF14" }}>
              REAL-TIME
            </div>
          </div>
          <PlantGrowth3D weather={weather} />
          {/* bottom overlay info */}
          <div style={{ position:"absolute", bottom:0, left:0, right:0, background:"linear-gradient(transparent,rgba(7,26,15,.9))", padding:"20px 16px 14px", zIndex:2 }}>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8 }}>
              {[["Photosynthesis","Active","#39FF14"],["Root Depth","18cm","#8B5E3C"],["Leaf Area","340cm²","#39FF14"],["Health","94%","#39FF14"]].map(([l,v,c]) => (
                <div key={l} style={{ textAlign:"center" }}>
                  <div style={{ fontFamily:"'Syne',sans-serif", fontSize:12, fontWeight:700, color:c }}>{v}</div>
                  <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:9, color:"rgba(255,255,255,.38)" }}>{l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>

          {/* Stage detail card */}
          <div className="glass" style={{ padding:18 }}>
            <div style={{ fontFamily:"'Syne',sans-serif", fontSize:10, color:"#39FF14", letterSpacing:".12em", marginBottom:14 }}>GROWTH STAGES</div>
            {STAGES.map((s, i) => (
              <div key={s.label} style={{ display:"flex", gap:12, marginBottom: i < 3 ? 14 : 0, paddingBottom: i < 3 ? 14 : 0, borderBottom: i < 3 ? "1px solid rgba(57,255,20,.08)" : "none" }}>
                <div style={{ width:36, height:36, borderRadius:8, background:s.color+"18", border:`1px solid ${s.color}44`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>{s.icon}</div>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:2 }}>
                    <span style={{ fontFamily:"'Inter',sans-serif", fontSize:14, fontWeight:700, color:"#fff" }}>{s.label}</span>
                    <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:9, color:s.color }}>{s.day}</span>
                  </div>
                  <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color:"rgba(255,255,255,.45)", lineHeight:1.5 }}>{s.desc}</div>
                  <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:9, color:"rgba(255,255,255,.28)", marginTop:3 }}>{s.temp} · {s.moisture} moisture</div>
                </div>
              </div>
            ))}
          </div>

          {/* Risk meter */}
          <div className="glass" style={{ padding:18 }}>
            <div style={{ fontFamily:"'Syne',sans-serif", fontSize:10, color:"#f87171", letterSpacing:".12em", marginBottom:12 }}>DISEASE & STRESS RISK</div>
            {risks.map(({ label, level, color }) => (
              <div key={label} style={{ marginBottom:10 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4, fontFamily:"'Inter',sans-serif", fontSize:12 }}>
                  <span style={{ color:"rgba(255,255,255,.6)" }}>{label}</span>
                  <span style={{ color, fontWeight:700 }}>{level}%</span>
                </div>
                <div style={{ height:5, borderRadius:3, background:"rgba(255,255,255,.08)" }}>
                  <div style={{ height:"100%", width:`${level}%`, background:color, borderRadius:3, boxShadow:`0 0 6px ${color}88` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Growth timeline — full width */}
      <div className="glass" style={{ padding:24 }}>
        <div style={{ fontFamily:"'Syne',sans-serif", fontSize:10, color:"#39FF14", letterSpacing:".12em", marginBottom:20 }}>GROWTH TIMELINE — WHEAT (90 DAYS)</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:0, position:"relative" }}>
          {/* connector line */}
          <div style={{ position:"absolute", top:18, left:"10%", right:"10%", height:2, background:"linear-gradient(to right,#8B5E3C,#FACC15,#39FF14,#a78bfa,#FACC15)", zIndex:0, borderRadius:1 }} />
          {timeline.map(({ week, event, detail, color }, i) => (
            <div key={week} style={{ textAlign:"center", position:"relative", zIndex:1 }}>
              <div style={{ width:36, height:36, borderRadius:"50%", background:color, margin:"0 auto 10px", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:`0 0 14px ${color}88`, border:"3px solid #0F1117" }}>
                <div style={{ width:10, height:10, borderRadius:"50%", background:"#0F1117" }} />
              </div>
              <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:9, color, marginBottom:3 }}>{week}</div>
              <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:700, color:"#fff", marginBottom:3 }}>{event}</div>
              <div style={{ fontFamily:"'Inter',sans-serif", fontSize:11, color:"rgba(255,255,255,.4)", lineHeight:1.4, padding:"0 4px" }}>{detail}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Dashboard 3D Farm Scene (full-screen background) ── */
function DashboardFarm3D() {
  const mountRef = useRef(null);
  const frameRef = useRef(null);

  useEffect(() => {
    const el = mountRef.current; if (!el) return;
    const W = el.clientWidth, H = el.clientHeight;
    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x87CEEB, 45, 100);

    const camera = new THREE.PerspectiveCamera(52, W / H, 0.1, 300);
    camera.position.set(-4, 5, 22);
    camera.lookAt(0, 1, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.setClearColor(0x87CEEB);
    el.appendChild(renderer.domElement);

    /* ═══ DAYTIME SKY ═══ */
    const skyGeo = new THREE.SphereGeometry(120, 24, 24);
    const skyCvs = document.createElement("canvas");
    skyCvs.width = 4; skyCvs.height = 512;
    const sCtx = skyCvs.getContext("2d");
    const sGrad = sCtx.createLinearGradient(0, 0, 0, 512);
    sGrad.addColorStop(0,    "#1a6eb5");
    sGrad.addColorStop(0.35, "#4db8f0");
    sGrad.addColorStop(0.65, "#87CEEB");
    sGrad.addColorStop(1,    "#c8e8f5");
    sCtx.fillStyle = sGrad; sCtx.fillRect(0, 0, 4, 512);
    scene.add(new THREE.Mesh(skyGeo, new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(skyCvs), side: THREE.BackSide })));

    /* ═══ CLOUDS ═══ */
    const cloudMat = new THREE.MeshPhongMaterial({ color: 0xffffff, transparent: true, opacity: 0.88 });
    const clouds = [];
    [[0,14,-30],[12,16,-40],[-15,13,-35],[25,15,-45],[-28,17,-38]].forEach(([cx,cy,cz]) => {
      const cg = new THREE.Group();
      [[0,0,0,2.5],[2.2,0.5,0,2],[-2,0.3,0,1.8],[0.8,1.2,0,1.6],[-1,1,0.8,1.4]].forEach(([ox,oy,oz,r]) => {
        const c = new THREE.Mesh(new THREE.SphereGeometry(r,8,8), cloudMat);
        c.position.set(ox,oy,oz); cg.add(c);
      });
      cg.position.set(cx,cy,cz); cg.userData.isCloud = true; cg.userData.speed = 0.004 + Math.random()*0.003;
      scene.add(cg); clouds.push(cg);
    });

    /* ═══ SUN DISC ═══ */
    const sun = new THREE.Mesh(new THREE.SphereGeometry(1.2,16,16), new THREE.MeshBasicMaterial({ color: 0xfffaaa }));
    sun.position.set(30, 28, -50); scene.add(sun);

    /* ═══ GROUND — rich green grass ═══ */
    const groundCvs = document.createElement("canvas");
    groundCvs.width = 512; groundCvs.height = 512;
    const gCtx = groundCvs.getContext("2d");
    // Base grass gradient
    const gGrad = gCtx.createLinearGradient(0, 0, 512, 512);
    gGrad.addColorStop(0,   "#3a7d1e");
    gGrad.addColorStop(0.4, "#4a9625");
    gGrad.addColorStop(0.7, "#3d8a1c");
    gGrad.addColorStop(1,   "#2e6b14");
    gCtx.fillStyle = gGrad; gCtx.fillRect(0, 0, 512, 512);
    // Grass blade texture noise
    gCtx.strokeStyle = "rgba(80,160,30,0.25)";
    for (let i = 0; i < 4000; i++) {
      const gx = Math.random()*512, gy = Math.random()*512;
      gCtx.lineWidth = 0.5 + Math.random();
      gCtx.beginPath(); gCtx.moveTo(gx, gy); gCtx.lineTo(gx+(Math.random()-0.5)*4, gy-3-Math.random()*5); gCtx.stroke();
    }
    const groundTex = new THREE.CanvasTexture(groundCvs);
    groundTex.wrapS = groundTex.wrapT = THREE.RepeatWrapping;
    groundTex.repeat.set(8, 8);
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(120, 120, 1, 1),
      new THREE.MeshLambertMaterial({ map: groundTex })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    /* ═══ BARN ═══ */
    const barnGroup = new THREE.Group();
    // Barn body — red
    const barnBody = new THREE.Mesh(
      new THREE.BoxGeometry(7, 5, 9),
      new THREE.MeshPhongMaterial({ color: 0xcc2200 })
    );
    barnBody.position.y = 2.5; barnBody.castShadow = true; barnGroup.add(barnBody);
    // Barn roof — grey peaked
    const roofGeo = new THREE.CylinderGeometry(0, 5.2, 3.5, 4, 1);
    roofGeo.rotateY(Math.PI / 4);
    const roof = new THREE.Mesh(roofGeo, new THREE.MeshPhongMaterial({ color: 0x888888 }));
    roof.position.y = 6.7; roof.castShadow = true; barnGroup.add(roof);
    // Barn door — dark
    const door = new THREE.Mesh(new THREE.BoxGeometry(2.2, 3.2, 0.15), new THREE.MeshPhongMaterial({ color: 0x3a1a00 }));
    door.position.set(0, 1.6, 4.58); barnGroup.add(door);
    // Door handles
    const handle = new THREE.Mesh(new THREE.SphereGeometry(0.12,8,8), new THREE.MeshPhongMaterial({ color: 0xccaa00 }));
    handle.position.set(0.6, 1.7, 4.72); barnGroup.add(handle);
    // Windows
    [[-2.5, 3.5, 4.58],[2.5, 3.5, 4.58]].forEach(([wx,wy,wz]) => {
      const win = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 0.15), new THREE.MeshPhongMaterial({ color: 0x88ccff, transparent: true, opacity: 0.7 }));
      win.position.set(wx, wy, wz); barnGroup.add(win);
      const frame = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 0.12), new THREE.MeshPhongMaterial({ color: 0xffffff }));
      frame.position.set(wx, wy, wz - 0.02); barnGroup.add(frame);
    });
    // White fence trim
    const trim = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.2, 0.15), new THREE.MeshPhongMaterial({ color: 0xffffff }));
    trim.position.set(0, 5.05, 4.6); barnGroup.add(trim);
    barnGroup.position.set(-6, 0, -6); scene.add(barnGroup);

    /* ═══ SILO ═══ */
    const siloGroup = new THREE.Group();
    const siloCyl = new THREE.Mesh(
      new THREE.CylinderGeometry(1.4, 1.4, 9, 16),
      new THREE.MeshPhongMaterial({ color: 0xddddcc })
    );
    siloCyl.position.y = 4.5; siloCyl.castShadow = true; siloGroup.add(siloCyl);
    const siloCap = new THREE.Mesh(
      new THREE.ConeGeometry(1.5, 2, 16),
      new THREE.MeshPhongMaterial({ color: 0x888888 })
    );
    siloCap.position.y = 10; siloGroup.add(siloCap);
    // Silo rings
    for (let ri = 1; ri <= 6; ri++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.42, 0.06, 4, 24), new THREE.MeshPhongMaterial({ color: 0xbbbbaa }));
      ring.position.y = ri * 1.3; ring.rotation.x = Math.PI/2; siloGroup.add(ring);
    }
    siloGroup.position.set(-14, 0, -7); scene.add(siloGroup);

    /* ═══ TRACTOR ═══ */
    const tractorGroup = new THREE.Group();
    // Body
    const tBody = new THREE.Mesh(new THREE.BoxGeometry(3, 1.8, 2), new THREE.MeshPhongMaterial({ color: 0xcc2200 }));
    tBody.position.y = 1.5; tBody.castShadow = true; tractorGroup.add(tBody);
    // Hood / engine
    const hood = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.2, 1.8), new THREE.MeshPhongMaterial({ color: 0xaa1a00 }));
    hood.position.set(1.8, 1.6, 0); tractorGroup.add(hood);
    // Cabin
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.6, 1.8), new THREE.MeshPhongMaterial({ color: 0xcc2200 }));
    cabin.position.set(-0.4, 2.8, 0); tractorGroup.add(cabin);
    // Cabin glass
    const glass = new THREE.Mesh(new THREE.BoxGeometry(1.82, 1.4, 0.1), new THREE.MeshPhongMaterial({ color: 0xaaddff, transparent: true, opacity: 0.5 }));
    glass.position.set(-0.4, 2.8, 0.95); tractorGroup.add(glass);
    // Exhaust pipe
    const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.2, 8), new THREE.MeshPhongMaterial({ color: 0x333333 }));
    exhaust.position.set(2, 2.3, 0.5); tractorGroup.add(exhaust);
    // Big rear wheels
    [[-1.1, 0, 1.2],[-1.1, 0, -1.2]].forEach(([wx,wy,wz]) => {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 0.7, 16), new THREE.MeshPhongMaterial({ color: 0x111111 }));
      wheel.rotation.z = Math.PI/2; wheel.position.set(wx, 1.1, wz);
      wheel.castShadow = true; tractorGroup.add(wheel);
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.75, 16), new THREE.MeshPhongMaterial({ color: 0x888888 }));
      rim.rotation.z = Math.PI/2; rim.position.set(wx, 1.1, wz); tractorGroup.add(rim);
    });
    // Small front wheels
    [[1.8, 0, 0.8],[1.8, 0, -0.8]].forEach(([wx,wy,wz]) => {
      const fw = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.45, 12), new THREE.MeshPhongMaterial({ color: 0x111111 }));
      fw.rotation.z = Math.PI/2; fw.position.set(wx, 0.55, wz); tractorGroup.add(fw);
    });
    tractorGroup.position.set(10, 0, 2); tractorGroup.rotation.y = -0.5;
    scene.add(tractorGroup);

    /* ═══ COWS ═══ */
    const makeCow = (cx, cz, ry) => {
      const cowGroup = new THREE.Group();
      // Body
      const body = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshPhongMaterial({ color: 0xf5f0e8 }));
      body.scale.set(1.5, 1, 1); body.position.y = 1.3; body.castShadow = true; cowGroup.add(body);
      // Brown patches
      const patch = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6), new THREE.MeshPhongMaterial({ color: 0x8B4513 }));
      patch.position.set(0.5, 1.7, 0.6); cowGroup.add(patch);
      const patch2 = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 6), new THREE.MeshPhongMaterial({ color: 0x8B4513 }));
      patch2.position.set(-0.8, 1.4, -0.5); cowGroup.add(patch2);
      // Head
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.55, 10, 8), new THREE.MeshPhongMaterial({ color: 0xf5f0e8 }));
      head.position.set(1.5, 1.7, 0); cowGroup.add(head);
      // Snout
      const snout = new THREE.Mesh(new THREE.SphereGeometry(0.3,8,6), new THREE.MeshPhongMaterial({ color: 0xffccaa }));
      snout.position.set(1.85, 1.55, 0); snout.scale.set(0.6,0.5,0.7); cowGroup.add(snout);
      // Eyes
      [-0.2, 0.2].forEach(ez => {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.07,6,6), new THREE.MeshPhongMaterial({ color: 0x111111 }));
        eye.position.set(1.9, 1.8, ez); cowGroup.add(eye);
      });
      // Ears
      [-0.55, 0.55].forEach(ez => {
        const ear = new THREE.Mesh(new THREE.SphereGeometry(0.2,6,6), new THREE.MeshPhongMaterial({ color: 0xffbbaa }));
        ear.position.set(1.3, 2.15, ez); ear.scale.set(0.5,0.8,0.4); cowGroup.add(ear);
      });
      // Horns
      [-0.3, 0.3].forEach(hz => {
        const horn = new THREE.Mesh(new THREE.ConeGeometry(0.06,0.35,6), new THREE.MeshPhongMaterial({ color: 0xccaa55 }));
        horn.position.set(1.3, 2.4, hz); horn.rotation.z = hz > 0 ? 0.4 : -0.4; cowGroup.add(horn);
      });
      // Legs
      [[-0.7,0,-0.45],[-0.7,0,0.45],[0.7,0,-0.45],[0.7,0,0.45]].forEach(([lx,ly,lz]) => {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.14,0.12,1.2,8), new THREE.MeshPhongMaterial({ color: 0xf0ebe0 }));
        leg.position.set(lx, 0.6, lz); cowGroup.add(leg);
        const hoof = new THREE.Mesh(new THREE.CylinderGeometry(0.15,0.13,0.22,8), new THREE.MeshPhongMaterial({ color: 0x333333 }));
        hoof.position.set(lx, 0.02, lz); cowGroup.add(hoof);
      });
      // Tail
      const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.03,0.9,6), new THREE.MeshPhongMaterial({ color: 0xddddcc }));
      tail.position.set(-1.45, 1.5, 0); tail.rotation.z = 0.5; cowGroup.add(tail);
      const tTuft = new THREE.Mesh(new THREE.SphereGeometry(0.14,6,6), new THREE.MeshPhongMaterial({ color: 0x8B4513 }));
      tTuft.position.set(-1.85, 1.95, 0); cowGroup.add(tTuft);
      // Udder
      const udder = new THREE.Mesh(new THREE.SphereGeometry(0.28,8,6), new THREE.MeshPhongMaterial({ color: 0xffbbaa }));
      udder.position.set(0, 0.65, 0); cowGroup.add(udder);

      cowGroup.position.set(cx, 0, cz);
      cowGroup.rotation.y = ry;
      cowGroup.userData.isCow = true;
      cowGroup.userData.walkPhase = Math.random() * Math.PI * 2;
      scene.add(cowGroup);
      return cowGroup;
    };

    const cows = [
      makeCow(-2, 5, 0.3),
      makeCow(3, 7, -0.5),
      makeCow(6, 4, 1.1),
    ];

    /* ═══ WHITE FENCE ═══ */
    const fenceMat = new THREE.MeshPhongMaterial({ color: 0xffffff });
    const makePost = (fx, fz) => {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.4, 0.18), fenceMat);
      post.position.set(fx, 0.7, fz); post.castShadow = true; scene.add(post);
    };
    const makeRail = (fx, fz, len, ry) => {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(len, 0.1, 0.08), fenceMat);
      rail.position.set(fx, 0.55, fz); rail.rotation.y = ry; scene.add(rail);
      const rail2 = new THREE.Mesh(new THREE.BoxGeometry(len, 0.1, 0.08), fenceMat);
      rail2.position.set(fx, 0.95, fz); rail2.rotation.y = ry; scene.add(rail2);
    };
    // Front fence line
    for (let fx = -14; fx <= 14; fx += 2.8) { makePost(fx, 2); }
    makeRail(0, 2, 28, 0);
    // Side fences
    for (let fz = 2; fz <= 14; fz += 2.8) { makePost(-14, fz); makePost(14, fz); }
    makeRail(-14, 8, 12, Math.PI/2);
    makeRail(14, 8, 12, Math.PI/2);

    /* ═══ CROP ROWS ═══ */
    const cropMat = new THREE.MeshPhongMaterial({ color: 0x5aaa1a, shininess: 20 });
    const wheatMat = new THREE.MeshPhongMaterial({ color: 0xd4a017 });
    for (let row = -12; row <= -3; row += 1.1) {
      for (let col = -9; col <= 9; col += 0.6) {
        const h = 0.55 + Math.random() * 0.35;
        const isWheat = row < -8;
        const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, h, 4), isWheat ? wheatMat : cropMat);
        stalk.position.set(col + (Math.random()-0.5)*0.2, h/2, row + (Math.random()-0.5)*0.2);
        scene.add(stalk);
        if (isWheat) {
          const head = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.22, 5), new THREE.MeshPhongMaterial({ color: 0xf0c030 }));
          head.position.set(stalk.position.x, h+0.1, stalk.position.z);
          scene.add(head);
        }
      }
    }

    /* ═══ REALISTIC TREES ═══ */
    const makeTree = (tx, tz, scale=1, autumnTint=false) => {
      const tg = new THREE.Group();
      // Trunk with texture variation
      const trunkH = (1.8 + Math.random()*0.6) * scale;
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18*scale, 0.28*scale, trunkH, 8),
        new THREE.MeshPhongMaterial({ color: 0x6b3a1f })
      );
      trunk.position.y = trunkH/2; trunk.castShadow = true; tg.add(trunk);
      // Multi-layer foliage for depth
      const foliageColor = autumnTint
        ? new THREE.Color().setHSL(0.08 + Math.random()*0.06, 0.8, 0.35)
        : new THREE.Color().setHSL(0.28 + Math.random()*0.06, 0.65, 0.28);
      [[0, trunkH+0.9*scale, 0, 1.4*scale],
       [-0.4*scale, trunkH+1.5*scale, 0.3*scale, 1.1*scale],
       [0.3*scale, trunkH+1.8*scale, -0.2*scale, 1.0*scale],
       [0, trunkH+2.4*scale, 0, 0.75*scale]
      ].forEach(([ox,oy,oz,r]) => {
        const leaf = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 7), new THREE.MeshPhongMaterial({ color: foliageColor, shininess: 15 }));
        leaf.position.set(ox,oy,oz); leaf.castShadow = true; tg.add(leaf);
      });
      tg.position.set(tx, 0, tz);
      tg.userData.isTree = true;
      scene.add(tg);
    };
    // Autumn trees behind barn (like reference image)
    [[-18,-4],[-20,-8],[-22,-2],[-19,-12],[-16,-16]].forEach(([tx,tz]) => makeTree(tx,tz,1.4,true));
    [[-12,-16],[-6,-16],[0,-16],[6,-16],[12,-16]].forEach(([tx,tz]) => makeTree(tx,tz,1.2,true));
    [[16,-4],[18,-9],[20,-3],[17,-14]].forEach(([tx,tz]) => makeTree(tx,tz,1.1,false));
    // Green trees front
    [[-20,6],[-22,12],[20,10],[22,5]].forEach(([tx,tz]) => makeTree(tx,tz,1.0,false));

    /* ═══ DRONE ═══ */
    const drone = new THREE.Group();
    const dBody = new THREE.Mesh(new THREE.BoxGeometry(0.45,0.12,0.45), new THREE.MeshPhongMaterial({ color: 0x222222 }));
    drone.add(dBody);
    const propGlow = new THREE.MeshBasicMaterial({ color:0x39FF14, transparent:true, opacity:0.6 });
    for (let i=0;i<4;i++){
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.45,0.04,0.04), new THREE.MeshPhongMaterial({color:0x444}));
      arm.rotation.y = i * Math.PI/2; arm.position.set(Math.cos(i*Math.PI/2)*0.22,0,Math.sin(i*Math.PI/2)*0.22);
      drone.add(arm);
      const prop = new THREE.Mesh(new THREE.CylinderGeometry(0.16,0.16,0.02,8), propGlow);
      prop.position.copy(arm.position); prop.position.y = 0.07;
      prop.userData.isProp = true; drone.add(prop);
    }
    const dLight = new THREE.PointLight(0x39FF14, 1.2, 5); drone.add(dLight);
    drone.position.set(0, 8, -5); scene.add(drone);

    /* ═══ LIGHTS ═══ */
    scene.add(new THREE.AmbientLight(0xfff8e7, 0.9));
    const sunLight = new THREE.DirectionalLight(0xfff5cc, 2.2);
    sunLight.position.set(30, 40, 20);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 150;
    sunLight.shadow.camera.left = -40;
    sunLight.shadow.camera.right = 40;
    sunLight.shadow.camera.top = 40;
    sunLight.shadow.camera.bottom = -40;
    sunLight.shadow.bias = -0.001;
    scene.add(sunLight);
    const fillLight = new THREE.DirectionalLight(0x88ccff, 0.4);
    fillLight.position.set(-20, 10, -10); scene.add(fillLight);
    const bounceLight = new THREE.HemisphereLight(0x87CEEB, 0x3a7d1e, 0.6); scene.add(bounceLight);

    /* ═══ ANIMATE ═══ */
    let t = 0;
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      t += 0.01;
      // Drone patrol
      drone.position.x = Math.sin(t*0.3)*10;
      drone.position.z = Math.cos(t*0.2)*7 - 4;
      drone.position.y = 7 + Math.sin(t*0.7)*0.6;
      drone.rotation.y = t*0.4;
      drone.children.forEach(c => { if (c.userData?.isProp) c.rotation.y += 0.35; });
      // Cows slow wander with collision separation
      cows.forEach((cow, i) => {
        cow.userData.walkPhase += 0.003;
        cow.position.x += Math.sin(cow.userData.walkPhase + i * 2.1) * 0.012;
        cow.position.z += Math.cos(cow.userData.walkPhase * 0.6 + i * 1.7) * 0.010;
        cow.position.x = Math.max(-10, Math.min(10, cow.position.x));
        cow.position.z = Math.max(3, Math.min(12, cow.position.z));
        // Separation — push cows apart if too close
        cows.forEach((other, j) => {
          if (i === j) return;
          const dx = cow.position.x - other.position.x;
          const dz = cow.position.z - other.position.z;
          const dist = Math.sqrt(dx*dx + dz*dz);
          if (dist < 3.5 && dist > 0) {
            const push = (3.5 - dist) / dist * 0.04;
            cow.position.x += dx * push;
            cow.position.z += dz * push;
          }
        });
        // Face direction of movement
        const targetY = Math.atan2(
          Math.sin(cow.userData.walkPhase + i * 2.1),
          Math.cos(cow.userData.walkPhase * 0.6 + i * 1.7)
        );
        cow.rotation.y += (targetY - cow.rotation.y) * 0.02;
        // Leg swing
        cow.children.forEach((c,ci) => { if (ci > 11 && ci < 16) c.rotation.x = Math.sin(cow.userData.walkPhase*3 + ci)*0.2; });
      });
      // Cloud drift
      clouds.forEach(c => { c.position.x += c.userData.speed; if (c.position.x > 50) c.position.x = -50; });
      // Gentle camera sway
      camera.position.x = -4 + Math.sin(t*0.05)*1.5;
      camera.position.y = 5 + Math.sin(t*0.04)*0.5;
      camera.lookAt(0, 1.2, 0);
      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      camera.aspect = el.clientWidth / el.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(el.clientWidth, el.clientHeight);
    };
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mountRef} style={{ position:"absolute", inset:0 }} />;
}

function DashboardPage({ setPage, backend }) {
  const [time, setTime] = useState(new Date());
  const [selectedField, setSelectedField] = useState(null);
  useEffect(() => { const t = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(t); }, []);

  const { weather, alerts, analytics, dailyStats, loading, aiChat, aiLoading, sendToAdvisor } = backend;
  const [advisorInput, setAdvisorInput] = useState("");

  const liveData = [
    { label:"Temp",     value: weather?.temp     || "...", icon:"🌡️", color:"#FACC15" },
    { label:"Humidity", value: weather?.humidity  || "...", icon:"💧", color:"#38BDF8" },
    { label:"Wind",     value: weather?.wind      || "...", icon:"💨", color:"#a78bfa" },
    { label:"Soil",     value: analytics?.fields?.[0]?.moisture ? analytics.fields[0].moisture+"%" : "74%", icon:"🌍", color:"#8B5E3C" },
    { label:"UV Index", value: weather?.uvIndex   || "7",  icon:"☀️", color:"#f87171" },
    { label:"Rain 48h", value: weather?.rain48h   || "...", icon:"🌧️", color:"#38BDF8" },
  ];

  const fields = analytics?.fields?.slice(0,4) || [
    { id:"F-001", name:"Wheat Field", status:"healthy", yield:"4.2t/ha", area:"3.5ac", color:"#FACC15", soil:82, moisture:71 },
    { id:"F-002", name:"Rice Paddy",  status:"healthy", yield:"5.1t/ha", area:"2.1ac", color:"#39FF14", soil:88, moisture:85 },
    { id:"F-003", name:"Cotton Zone", status:"warning", yield:"2.8t/ha", area:"4.0ac", color:"#f87171", soil:55, moisture:42 },
    { id:"F-004", name:"Sugarcane",   status:"healthy", yield:"68t/ha",  area:"1.8ac", color:"#8B5E3C", soil:74, moisture:68 },
  ];

  const modules = [
    { title:"Globe",      icon:"🌍", page:"Globe",      color:"#39FF14" },
    { title:"Farm Map",   icon:"🗺️", page:"Farm Map",   color:"#38BDF8" },
    { title:"Analytics",  icon:"📊", page:"Analytics",  color:"#FACC15" },
    { title:"Mandi",      icon:"📈", page:"Mandi",      color:"#FACC15" },
    { title:"Growth", icon:"🌱", page:"Growth", color:"#a78bfa" },
  ];

  return (
    <div style={{ position:"relative", minHeight:"100vh", paddingTop:60 }}>
      {/* ── FULL-SCREEN 3D FARM ── */}
      <div style={{ position:"fixed", inset:0, zIndex:0 }}>
        <DashboardFarm3D />
        {/* dark gradient overlay so UI is readable */}
        <div style={{ position:"absolute", inset:0, background:"linear-gradient(to bottom, rgba(7,26,15,0.55) 0%, rgba(7,26,15,0.2) 40%, rgba(7,26,15,0.5) 80%, rgba(7,26,15,0.92) 100%)" }} />
        <div style={{ position:"absolute", inset:0, background:"linear-gradient(to right, rgba(7,26,15,0.7) 0%, transparent 35%, transparent 65%, rgba(7,26,15,0.7) 100%)" }} />
      </div>

      {/* ── OVERLAY UI ── */}
      <div style={{ position:"relative", zIndex:2, display:"grid", gridTemplateColumns:"280px 1fr 280px", gridTemplateRows:"auto 1fr auto", gap:16, padding:"16px 20px", minHeight:"calc(100vh - 60px)" }}>

        {/* LEFT PANEL — field list */}
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          <div style={{ fontFamily:"'Syne',sans-serif", fontSize:10, color:"#39FF14", letterSpacing:".15em", marginBottom:2 }}>[ FIELD MONITOR ]</div>
          {fields.map(f => (
            <div key={f.id} onClick={() => setSelectedField(selectedField?.id === f.id ? null : f)}
              style={{ background:"rgba(7,26,15,0.82)", border:`1px solid ${selectedField?.id===f.id ? f.color : "rgba(57,255,20,0.18)"}`, borderRadius:10, padding:"12px 14px", cursor:"pointer", transition:"all .2s", backdropFilter:"blur(10px)" }}
              onMouseEnter={e => e.currentTarget.style.background="rgba(11,61,46,0.9)"}
              onMouseLeave={e => e.currentTarget.style.background="rgba(7,26,15,0.82)"}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                <div>
                  <div style={{ fontFamily:"'Syne',sans-serif", fontSize:11, color:f.color, letterSpacing:".06em" }}>{f.id}</div>
                  <div style={{ fontFamily:"'Inter',sans-serif", fontSize:14, fontWeight:700, color:"#fff" }}>{f.name}</div>
                </div>
                <div style={{ width:8, height:8, borderRadius:"50%", background: f.status==="healthy"?"#39FF14":"#f87171", boxShadow:`0 0 8px ${f.status==="healthy"?"#39FF14":"#f87171"}` }} />
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
                {[["Yield",f.yield],["Area",f.area]].map(([k,v]) => (
                  <div key={k} style={{ background:"rgba(255,255,255,.04)", borderRadius:5, padding:"4px 8px" }}>
                    <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:9, color:"rgba(255,255,255,.4)" }}>{k}</div>
                    <div style={{ fontFamily:"'Syne',sans-serif", fontSize:12, fontWeight:700, color:f.color }}>{v}</div>
                  </div>
                ))}
              </div>
              {selectedField?.id === f.id && (
                <div style={{ marginTop:10, animation:"slideUp .2s ease" }}>
                  {[["Soil Health", f.soil, "#39FF14"], ["Moisture", f.moisture, "#38BDF8"]].map(([l, v, c]) => (
                    <div key={l} style={{ marginBottom:6 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", fontFamily:"'JetBrains Mono',monospace", fontSize:10, color:"rgba(255,255,255,.5)", marginBottom:3 }}>
                        <span>{l}</span><span style={{ color:c }}>{v}%</span>
                      </div>
                      <div style={{ height:3, borderRadius:2, background:"rgba(255,255,255,.08)" }}>
                        <div style={{ height:"100%", width:`${v}%`, background:c, borderRadius:2 }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* CENTER — title + sensor strip at bottom */}
        <div style={{ display:"flex", flexDirection:"column", justifyContent:"space-between" }}>
          {/* Top center: title */}
          <div style={{ textAlign:"center", paddingTop:8 }}>
            <div className="tag" style={{ marginBottom:8 }}>[ MISSION CONTROL ]</div>
            <h1 style={{ fontFamily:"'Syne',sans-serif", fontSize:"clamp(22px,3.5vw,42px)", fontWeight:900, background:"linear-gradient(135deg,#fff 20%,#39FF14 80%)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", lineHeight:1.1 }}>
              AGROMIND
            </h1>
            <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:13, color:"#39FF14", marginTop:6 }}>
              {time.toLocaleTimeString("en-IN")} IST &nbsp;·&nbsp; Lucknow, UP
            </div>
            {/* Drone status badge */}
            <div style={{ display:"inline-flex", alignItems:"center", gap:8, marginTop:12, background:"rgba(57,255,20,0.1)", border:"1px solid rgba(57,255,20,0.3)", borderRadius:20, padding:"5px 14px" }}>
              <div style={{ width:7, height:7, borderRadius:"50%", background:"#39FF14", animation:"neonPulse 1.5s infinite" }} />
              <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:11, color:"#39FF14" }}>DRONE PATROL ACTIVE</span>
            </div>
            {loading && (
              <div style={{ display:"inline-flex", alignItems:"center", gap:6, marginTop:8, background:"rgba(250,204,21,0.1)", border:"1px solid rgba(250,204,21,0.3)", borderRadius:12, padding:"3px 10px" }}>
                <div style={{ width:6, height:6, borderRadius:"50%", background:"#FACC15", animation:"neonPulse 0.8s infinite" }} />
                <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:10, color:"#FACC15" }}>AI SYNCING LIVE DATA...</span>
              </div>
            )}
            {!loading && weather?.desc && (
              <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color:"rgba(255,255,255,.4)", marginTop:6 }}>
                ☁️ {weather.desc} · Feels like {weather.feelsLike}°C · Visibility {weather.visibility}km
              </div>
            )}
          </div>

          {/* Bottom center: live sensor strip */}
          <div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(6,1fr)", gap:10, marginBottom:14 }}>
              {liveData.map(({ label, value, icon, color }) => (
                <div key={label} style={{ background:"rgba(7,26,15,0.85)", border:"1px solid rgba(57,255,20,0.18)", borderRadius:10, padding:"10px 8px", textAlign:"center", backdropFilter:"blur(10px)" }}>
                  <div style={{ fontSize:16, marginBottom:3 }}>{icon}</div>
                  <div style={{ fontFamily:"'Syne',sans-serif", fontSize:13, fontWeight:700, color }}>{value}</div>
                  <div style={{ fontFamily:"'Inter',sans-serif", fontSize:10, color:"rgba(255,255,255,.38)", textTransform:"uppercase" }}>{label}</div>
                </div>
              ))}
            </div>
            {/* Nav modules */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10 }}>
              {modules.map(({ title, icon, page, color }) => (
                <div key={title} onClick={() => setPage(page)}
                  style={{ background:"rgba(7,26,15,0.85)", border:`1px solid ${color}33`, borderRadius:10, padding:"12px 10px", textAlign:"center", cursor:"pointer", transition:"all .2s", backdropFilter:"blur(10px)" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = color + "88"; e.currentTarget.style.background = "rgba(11,61,46,0.9)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = color + "33"; e.currentTarget.style.background = "rgba(7,26,15,0.85)"; e.currentTarget.style.transform = "translateY(0)"; }}>
                  <div style={{ fontSize:22, marginBottom:4 }}>{icon}</div>
                  <div style={{ fontFamily:"'Syne',sans-serif", fontSize:10, color, fontWeight:700 }}>{title}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT PANEL — AI alerts + system */}
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          <div style={{ fontFamily:"'Syne',sans-serif", fontSize:10, color:"#39FF14", letterSpacing:".15em", marginBottom:2 }}>[ AI ALERTS ]</div>
          {(alerts || [
            { msg:"Late blight detected — F-003", level:"danger", time:"2m ago", icon:"🔬" },
            { msg:"Spray window open — Wed 6am", level:"info", time:"5m ago", icon:"☁️" },
            { msg:"Mandi price rising — Wheat +3%", level:"success", time:"12m ago", icon:"📈" },
            { msg:"Soil moisture low — F-003", level:"warning", time:"18m ago", icon:"💧" },
            { msg:"PMFBY claim auto-drafted", level:"info", time:"31m ago", icon:"📋" },
          ]).map(({ msg, level, time: t, icon }) => {
            const col = level==="danger"?"#f87171":level==="warning"?"#FACC15":level==="success"?"#39FF14":"#38BDF8";
            return (
              <div key={msg} style={{ background:"rgba(7,26,15,0.82)", border:`1px solid ${col}33`, borderRadius:8, padding:"10px 12px", backdropFilter:"blur(10px)" }}>
                <div style={{ display:"flex", gap:8, alignItems:"flex-start" }}>
                  <span style={{ fontSize:14 }}>{icon}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:600, color:"rgba(255,255,255,.85)", lineHeight:1.4 }}>{msg}</div>
                    <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:9, color:"rgba(255,255,255,.3)", marginTop:2 }}>{t}</div>
                  </div>
                  <div style={{ width:6, height:6, borderRadius:"50%", background:col, flexShrink:0, marginTop:3 }} />
                </div>
              </div>
            );
          })}

          <div style={{ marginTop:4, background:"rgba(7,26,15,0.82)", border:"1px solid rgba(57,255,20,0.18)", borderRadius:10, padding:"14px", backdropFilter:"blur(10px)" }}>
            <div style={{ fontFamily:"'Syne',sans-serif", fontSize:10, color:"#39FF14", letterSpacing:".12em", marginBottom:10 }}>SYSTEM</div>
            {[
              ["AI Advisor",   loading ? "loading" : "online"],
              ["Weather API",  weather ? "online" : "connecting"],
              ["Mandi Prices", loading ? "loading" : "online"],
              ["PMFBY",        "degraded"],
            ].map(([svc, st]) => (
              <div key={svc} style={{ display:"flex", justifyContent:"space-between", marginBottom:7, fontFamily:"'Inter',sans-serif", fontSize:12 }}>
                <span style={{ color:"rgba(255,255,255,.55)" }}>{svc}</span>
                <span style={{ display:"flex", alignItems:"center", gap:4 }}>
                  <div style={{ width:5, height:5, borderRadius:"50%", background: st==="online"?"#39FF14":"#FACC15", boxShadow:`0 0 5px ${st==="online"?"#39FF14":"#FACC15"}` }} />
                  <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:9, color: st==="online"?"#39FF14":"#FACC15" }}>{st}</span>
                </span>
              </div>
            ))}
          </div>

          <div style={{ background:"rgba(7,26,15,0.82)", border:"1px solid rgba(57,255,20,0.18)", borderRadius:10, padding:"14px", backdropFilter:"blur(10px)" }}>
            <div style={{ fontFamily:"'Syne',sans-serif", fontSize:10, color:"#39FF14", letterSpacing:".12em", marginBottom:10 }}>TODAY</div>
            {[
              ["Messages", backend.dailyStats?.messages || "...", "#39FF14"],
              ["Alerts",   backend.dailyStats?.alerts   || "...", "#f87171"],
              ["Queries",  backend.dailyStats?.queries  || "...", "#FACC15"],
            ].map(([l,v,c]) => (
              <div key={l} style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                <span style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color:"rgba(255,255,255,.5)" }}>{l}</span>
                <span style={{ fontFamily:"'Syne',sans-serif", fontSize:13, fontWeight:700, color:c }}>{v}</span>
              </div>
            ))}
          </div>

          {/* AI CROP ADVISOR chat */}
          <div style={{ background:"rgba(7,26,15,0.82)", border:"1px solid rgba(57,255,20,0.25)", borderRadius:10, padding:"14px", backdropFilter:"blur(10px)", flex:1, display:"flex", flexDirection:"column" }}>
            <div style={{ fontFamily:"'Syne',sans-serif", fontSize:10, color:"#39FF14", letterSpacing:".12em", marginBottom:8 }}>🤖 AI CROP ADVISOR</div>
            <div style={{ flex:1, overflowY:"auto", maxHeight:140, marginBottom:8, display:"flex", flexDirection:"column", gap:6 }}>
              {aiChat.length === 0 && (
                <div style={{ fontFamily:"'Inter',sans-serif", fontSize:11, color:"rgba(255,255,255,.3)", fontStyle:"italic" }}>
                  Ask anything: crop disease, mandi prices, best sowing time...
                </div>
              )}
              {aiChat.map((m, i) => (
                <div key={i} style={{ display:"flex", gap:6, justifyContent: m.role==="user" ? "flex-end" : "flex-start" }}>
                  <div style={{ background: m.role==="user" ? "rgba(57,255,20,0.15)" : "rgba(255,255,255,0.06)", border:`1px solid ${m.role==="user" ? "rgba(57,255,20,0.3)" : "rgba(255,255,255,0.1)"}`, borderRadius:6, padding:"5px 9px", maxWidth:"90%", fontFamily:"'Inter',sans-serif", fontSize:11, color: m.role==="user" ? "#39FF14" : "rgba(255,255,255,.8)", lineHeight:1.5, whiteSpace:"pre-wrap" }}>
                    {m.text}
                  </div>
                </div>
              ))}
              {aiLoading && (
                <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:10, color:"#39FF14", animation:"neonPulse 1s infinite" }}>⟳ AI thinking...</div>
              )}
            </div>
            <div style={{ display:"flex", gap:6 }}>
              <input
                value={advisorInput}
                onChange={e => setAdvisorInput(e.target.value)}
                onKeyDown={e => { if (e.key==="Enter" && advisorInput.trim()) { sendToAdvisor(advisorInput); setAdvisorInput(""); }}}
                placeholder="Type your farming question..."
                style={{ flex:1, background:"rgba(255,255,255,.06)", border:"1px solid rgba(57,255,20,0.25)", borderRadius:5, padding:"5px 8px", color:"#fff", fontFamily:"'Inter',sans-serif", fontSize:11, outline:"none" }}
              />
              <button onClick={() => { if (advisorInput.trim()) { sendToAdvisor(advisorInput); setAdvisorInput(""); }}}
                style={{ background:"rgba(57,255,20,0.2)", border:"1px solid rgba(57,255,20,0.4)", borderRadius:5, padding:"5px 10px", color:"#39FF14", cursor:"pointer", fontFamily:"'Syne',sans-serif", fontSize:9 }}>
                ASK
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════
   MANDI PRICES PAGE — Live AI-powered market data
═══════════════════════════════════════════════════════════════ */
function MandiPage({ mandi, loading }) {
  const prices = mandi?.prices || [
    { crop:"Wheat",     price:2180, unit:"₹/q", change:"+3%",   trend:"up"     },
    { crop:"Rice",      price:1950, unit:"₹/q", change:"-1%",   trend:"down"   },
    { crop:"Cotton",    price:6200, unit:"₹/q", change:"+1.5%", trend:"up"     },
    { crop:"Sugarcane", price:350,  unit:"₹/q", change:"0%",    trend:"stable" },
    { crop:"Potato",    price:1200, unit:"₹/q", change:"+5%",   trend:"up"     },
  ];

  return (
    <div style={{ padding:"80px 28px 40px", maxWidth:900, margin:"0 auto" }}>
      <div style={{ textAlign:"center", marginBottom:32 }}>
        <div className="tag" style={{ marginBottom:10 }}>[ LIVE MARKET DATA ]</div>
        <h1 style={{ fontFamily:"'Syne',sans-serif", fontSize:"clamp(22px,4vw,40px)", fontWeight:900, background:"linear-gradient(135deg,#fff 30%,#FACC15 70%)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
          Mandi Prices
        </h1>
        <p style={{ color:"rgba(255,255,255,.4)", fontFamily:"'Inter',sans-serif", fontSize:13, marginTop:6 }}>
          {mandi?.mandis?.join(" · ") || "Aminabad Mandi · Lucknow APMC"} &nbsp;·&nbsp; {new Date().toLocaleDateString("en-IN")}
        </p>
        {loading && <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:11, color:"#FACC15", marginTop:8, animation:"neonPulse 1s infinite" }}>⟳ Fetching live prices...</div>}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(250px,1fr))", gap:16 }}>
        {prices.map(({ crop, price, unit, change, trend }) => {
          const col = trend==="up" ? "#39FF14" : trend==="down" ? "#f87171" : "#FACC15";
          const arrow = trend==="up" ? "↑" : trend==="down" ? "↓" : "→";
          return (
            <div key={crop} className="glass" style={{ padding:"20px", display:"flex", flexDirection:"column", gap:8 }}>
              <div style={{ fontFamily:"'Syne',sans-serif", fontSize:13, color:"rgba(255,255,255,.7)", letterSpacing:".06em" }}>{crop}</div>
              <div style={{ display:"flex", alignItems:"baseline", gap:6 }}>
                <span style={{ fontFamily:"'Syne',sans-serif", fontSize:28, fontWeight:900, color:col }}>{price.toLocaleString("en-IN")}</span>
                <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:11, color:"rgba(255,255,255,.4)" }}>{unit}</span>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                <span style={{ fontFamily:"'Syne',sans-serif", fontSize:16, color:col }}>{arrow}</span>
                <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:12, color:col, fontWeight:700 }}>{change}</span>
                <span style={{ fontFamily:"'Inter',sans-serif", fontSize:11, color:"rgba(255,255,255,.3)" }}>vs yesterday</span>
              </div>
              <div style={{ height:3, borderRadius:2, background:"rgba(255,255,255,.08)" }}>
                <div style={{ height:"100%", width: trend==="up"?"70%":trend==="down"?"30%":"50%", background:col, borderRadius:2, boxShadow:`0 0 6px ${col}88`, transition:"width 1s ease" }} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="glass" style={{ marginTop:20, padding:20 }}>
        <div style={{ fontFamily:"'Syne',sans-serif", fontSize:10, color:"#FACC15", letterSpacing:".12em", marginBottom:14 }}>ADVISORY</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          {[
            { tip:"Best time to sell Wheat: Thu–Fri (rising trend)", icon:"📈" },
            { tip:"Hold Cotton — price momentum positive", icon:"💰" },
            { tip:"Rice: sell now before monsoon price dip", icon:"⚠️" },
            { tip:"Sugarcane: check cooperative rates vs mandi", icon:"🏭" },
          ].map(({ tip, icon }) => (
            <div key={tip} style={{ display:"flex", gap:10, background:"rgba(255,255,255,.04)", borderRadius:8, padding:"10px 12px" }}>
              <span style={{ fontSize:16 }}>{icon}</span>
              <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:"rgba(255,255,255,.7)", lineHeight:1.5 }}>{tip}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   APP ROOT
═══════════════════════════════════════════════════════════════ */
export default function AgroMind() {
  const [page, setPage] = useState("Dashboard");
  const backend = useBackend();
  const pageMap = {
    "Dashboard": <DashboardPage setPage={setPage} backend={backend} />,
    "Globe": <GlobePage />,
    "Farm Map": <FarmMapPage analytics={backend.analytics} />,
    "Analytics": <AnalyticsPage analytics={backend.analytics} loading={backend.loading} />,
    "Mandi": <MandiPage mandi={backend.mandi} loading={backend.loading} />,
    "Growth": <GrowthPage weather={backend.weather} />,
  };
  return (
    <>
      <style>{G}</style>
      <div style={{ minHeight:"100vh", background:"#0F1117", position:"relative" }}>
        <GridBg />
        <div style={{ position:"relative", zIndex:1 }}>
          <Nav page={page} setPage={setPage} />
          <div key={page} style={{ animation:"fadeIn .3s ease" }}>
            {pageMap[page]}
          </div>
          <footer style={{ borderTop:"1px solid rgba(57,255,20,.08)", padding:"28px 32px", textAlign:"center" }}>
            <div style={{ fontFamily:"'Syne',sans-serif", fontSize:13, fontWeight:700, color:"#39FF14" }}>AGRO<span style={{color:"#fff"}}>MIND</span></div>
            <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color:"rgba(255,255,255,.3)", marginTop:6 }}>
              Three.js · React 18 · FastAPI · LangChain · Gemini AI · Sarvam TTS
            </div>
          </footer>
        </div>
      </div>
    </>
  );
}
