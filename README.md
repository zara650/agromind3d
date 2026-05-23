<div align="center">

<!-- Animated Banner -->
<img width="100%" src="https://capsule-render.vercel.app/api?type=waving&color=0:0B3D2E,50:2E7D32,100:0F1117&height=200&section=header&text=AgroMind%203D&fontSize=72&fontColor=ffffff&fontAlignY=38&desc=AI-Powered%20Smart%20Farming%20Assistant%20for%20Indian%20Farmers&descAlignY=60&descSize=18&animation=fadeIn" />

<!-- Live Status Badges -->
<p>
  <a href="https://whimsical-custard-943a95.netlify.app" target="_blank">
    <img src="https://img.shields.io/website?url=https%3A%2F%2Fwhimsical-custard-943a95.netlify.app&label=Frontend&style=for-the-badge&logo=netlify&logoColor=white&color=2E7D32" />
  </a>
  <a href="https://whimsical-custard-943a95.netlify.app/.netlify/functions/ai" target="_blank">
    <img src="https://img.shields.io/website?url=https%3A%2F%2Fwhimsical-custard-943a95.netlify.app%2F.netlify%2Ffunctions%2Fai&label=AI%20Function&style=for-the-badge&logo=google&logoColor=white&color=1565C0" />
  </a>
  <img src="https://img.shields.io/badge/Gemini%201.5%20Flash-AI%20Powered-4285F4?style=for-the-badge&logo=google&logoColor=white" />
  <img src="https://img.shields.io/badge/Three.js-r166-black?style=for-the-badge&logo=threedotjs&logoColor=white" />
  <img src="https://img.shields.io/badge/React-18.3-61DAFB?style=for-the-badge&logo=react&logoColor=white" />
  <img src="https://img.shields.io/badge/Weather-Live%20API-38BDF8?style=for-the-badge&logo=openweathermap&logoColor=white" />
  <img src="https://img.shields.io/badge/Mandi-data.gov.in-FF6F00?style=for-the-badge&logo=databricks&logoColor=white" />
  <img src="https://img.shields.io/badge/License-MIT-FACC15?style=for-the-badge" />
</p>

<!-- Quick Nav -->
<p>
  <a href="#-live-demo"><strong>🌐 Live Demo</strong></a> •
  <a href="#-features"><strong>✨ Features</strong></a> •
  <a href="#-architecture"><strong>🏗 Architecture</strong></a> •
  <a href="#-pages"><strong>📄 Pages</strong></a> •
  <a href="#-tech-stack"><strong>🛠 Tech Stack</strong></a> •
  <a href="#-quick-start"><strong>🚀 Quick Start</strong></a> •
  <a href="#-deployment"><strong>☁️ Deploy</strong></a> •
  <a href="#-environment-variables"><strong>🔑 Env Vars</strong></a>
</p>

<br/>

```
╔══════════════════════════════════════════════════════════════════╗
║  🌱 AgroMind 3D  ·  AI-Powered Smart Farming Dashboard          ║
║  ✦ Three.js 3D Farm Scene   ✦ Live Weather API                  ║
║  ✦ Gemini AI Crop Advisor   ✦ Real Mandi Prices (data.gov.in)   ║
║  ✦ Interactive Globe        ✦ Plant Growth Simulation           ║
╚══════════════════════════════════════════════════════════════════╝
```

</div>

---

## 🌐 Live Demo

| Layer | URL | Status |
|-------|-----|--------|
| 🖥️ **Frontend** | [whimsical-custard-943a95.netlify.app](https://whimsical-custard-943a95.netlify.app) | ![Netlify](https://img.shields.io/website?url=https%3A%2F%2Fwhimsical-custard-943a95.netlify.app&style=flat-square&color=2E7D32) |
| ⚡ **AI Function** | [/.netlify/functions/ai](https://whimsical-custard-943a95.netlify.app/.netlify/functions/ai) | Netlify Serverless |
| 🌤️ **Weather API** | [OpenWeatherMap · Lucknow, UP](https://openweathermap.org/api) | Live |
| 🏪 **Mandi API** | [data.gov.in · Agmarknet](https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070) | Live |

---

## ✨ Features

### 🤖 AI Intelligence (Google Gemini 1.5 Flash)

- **Gemini AI Crop Advisor** — real chat interface powered by `gemini-1.5-flash`, gives practical advice on crop disease, spray timing, sowing windows, and pest management specific to UP farming
- **Live Mandi Prices** — AI + real data.gov.in Agmarknet API for Lucknow mandis (Aminabad, Lucknow APMC, Amausi) with trend arrows and sell/hold advisory
- **Smart Farm Alerts** — AI-generated alerts for disease risk, weather spray windows, price movements, and PMFBY claims — refreshes every 10 minutes
- **AI Field Analytics** — dynamically generated yield, soil health, and field metrics per Kharif 2026 season

### 🌍 3D Visualizations (Three.js r166)

- **Full-Screen 3D Farm Dashboard** — barn, silo, tractor, wandering cows with collision avoidance, crop rows, drone patrol, autumn trees — all animated in real-time
- **Interactive Earth Globe** — draggable, zoomable 3D globe with Lucknow farm location pinned
- **3D Farm Parcel Map** — terrain with 5 clickable crop fields (Wheat, Rice, Cotton, Sugarcane, Veg Garden), hover tooltips, orbit controls
- **3D Crop Yield Bar Chart** — animated bars that grow on load with hover highlight
- **Plant Growth Simulation** — interactive seed → sprout → sapling → harvest with soil moisture, temperature sliders, disease risk meters

### 🌤️ Live Weather (OpenWeatherMap)

- Real-time temperature, humidity, wind speed, UV index, pressure, visibility
- Powered by OpenWeatherMap API, auto-refreshes every 10 minutes
- Configured for **Lucknow, Uttar Pradesh** (lat: 26.8467, lon: 80.9462)
- Fallback to realistic static data if API unavailable

### 📊 Analytics Engine

- Monthly crop yield bar chart with animated reveals
- Annual rainfall trend line chart (Lucknow district)
- Live metrics: avg yield, rainfall, soil health, active fields
- Real-time data powered by Gemini AI

---

## 🏗 Architecture

### System Overview

```mermaid
graph TB
    User(["👤 Farmer / User"])

    subgraph Frontend ["🖥️ Frontend — Netlify CDN"]
        REACT["React 18\nSPA (Vite)"]
        THREE["Three.js r166\n3D Scenes"]
        CANVAS["Canvas 2D\nRainfall Chart"]
    end

    subgraph Serverless ["⚡ Netlify Functions"]
        AI_FN["ai.js\nGemini Proxy"]
    end

    subgraph External ["🌐 External APIs"]
        GEMINI["Google Gemini\n1.5 Flash"]
        WEATHER["OpenWeatherMap\nLive Weather"]
        DATAGOV["data.gov.in\nAgmarknet Mandi"]
    end

    User -->|"HTTPS"| REACT
    REACT --> THREE
    REACT --> CANVAS
    REACT -->|"POST /.netlify/functions/ai"| AI_FN
    REACT -->|"GET weather"| WEATHER
    REACT -->|"GET mandi prices"| DATAGOV
    AI_FN -->|"POST /v1beta/models/gemini-1.5-flash\nGEMINI_API_KEY"| GEMINI
    GEMINI -->|"AI text response"| AI_FN
    AI_FN -->|"{ text }"| REACT
    WEATHER -->|"Weather JSON"| REACT
    DATAGOV -->|"Mandi records JSON"| REACT
```

---

### Request Lifecycle

```mermaid
sequenceDiagram
    actor Farmer
    participant FE as React Frontend
    participant NF as Netlify Function
    participant AI as Gemini 1.5 Flash
    participant WX as OpenWeatherMap
    participant MK as data.gov.in

    Farmer->>FE: Opens Dashboard
    FE->>WX: GET /weather?lat=26.84&lon=80.94
    WX-->>FE: { temp, humidity, wind, ... }
    FE->>MK: GET /agmarknet?state=UP&district=Lucknow
    MK-->>FE: { mandi price records }
    FE->>NF: POST /ai — fetchLiveAlerts()
    FE->>NF: POST /ai — fetchFieldAnalytics()
    FE->>NF: POST /ai — fetchDailyStats()
    NF->>AI: POST /v1beta/models/gemini-1.5-flash { prompt, systemPrompt }
    AI-->>NF: { candidates[0].content.parts[0].text }
    NF-->>FE: { text: "JSON string" }
    FE->>Farmer: Renders live dashboard with all data
```

---

### Data Flow — AI Features

```mermaid
flowchart LR
    A["User Input\nor page load"] --> B{"Which AI call?"}

    B -->|Mandi Tab| C["fetchMandiPrices()\n+ data.gov.in real data\nfallback: Gemini"]
    B -->|Dashboard load| D["fetchLiveAlerts()\nPrompt: 5 alerts\nbased on weather"]
    B -->|Analytics Tab| E["fetchFieldAnalytics()\nPrompt: 5-field farm\nKharif 2026 data"]
    B -->|AI Advisor chat| F["askCropAdvisor(msg)\nUser farming question\nUP-specific context"]

    C --> G["Netlify Function\nai.js — Gemini Proxy"]
    D --> G
    E --> G
    F --> G

    G --> H["Gemini 1.5 Flash\nGoogle AI API"]
    H --> I["Text response\nparsed & rendered"]
```

---

## 📄 Pages

| Page | Nav Label | Description |
|------|-----------|-------------|
| 🏠 Dashboard | `HOME` | Full-screen 3D farm with live weather strip, field monitor cards, AI alerts, AI crop advisor chat, quick access modules |
| 🌍 Globe | `GLOBE` | Interactive 3D Earth, Lucknow farm location pin, agricultural zone stats (150M+ farmers, 28 zones) |
| 🗺️ Farm Map | `FARM` | 3D terrain with 5 crop parcels, soil health bars by zone, parcel legend, orbit + zoom |
| 📊 Analytics | `ANALYTICS` | 3D yield bar chart, Lucknow rainfall trend line, live metrics (yield, rainfall, soil health) |
| 💰 Mandi | `MANDI` | Real Agmarknet crop prices (Wheat, Rice, Cotton, Sugarcane, Potato, Mustard), trend arrows, sell/hold advisory |
| 🌱 Growth | `GROWTH` | Plant growth simulation, disease & stress risk meters, 90-day wheat growth timeline |

---

## 🛠 Tech Stack

```mermaid
graph LR
    ROOT(["🌱 AgroMind 3D"])

    ROOT --- FE["🖥️ Frontend"]
    ROOT --- BE["⚡ Serverless"]
    ROOT --- EXT["🌐 External APIs"]

    FE --- FE1["React 18"]
    FE --- FE2["Vite 5"]
    FE --- FE3["Three.js r166"]

    FE3 --- FE3a["3D Farm Scene\nDashboard"]
    FE3 --- FE3b["Earth Globe\nFarm Map"]
    FE3 --- FE3c["Bar Chart\nPlant Growth"]

    BE --- BE1["Netlify Functions\nNode.js"]
    BE --- BE2["ai.js\nGemini Proxy"]

    EXT --- EXT1["Google Gemini\n1.5 Flash"]
    EXT --- EXT2["OpenWeatherMap\nv2.5"]
    EXT --- EXT3["data.gov.in\nAgmarknet"]

    EXT1 --- EXT1a["Mandi fallback"]
    EXT1 --- EXT1b["Farm Alerts"]
    EXT1 --- EXT1c["Crop Advisor"]
    EXT1 --- EXT1d["Field Analytics"]

    EXT2 --- EXT2a["Temp · Humidity"]
    EXT2 --- EXT2b["Wind · UV · Rain"]

    EXT3 --- EXT3a["Real mandi prices\nUP / Lucknow"]

    classDef root  fill:#0B3D2E,stroke:#2E7D32,color:#fff,font-weight:bold
    classDef branch fill:#1B5E20,stroke:#2E7D32,color:#fff,font-weight:bold
    classDef fe    fill:#1a3a2a,stroke:#43A047,color:#A5D6A7
    classDef be    fill:#1a2a3a,stroke:#1565C0,color:#90CAF9
    classDef ext   fill:#2a1a3a,stroke:#6A1B9A,color:#CE93D8
    classDef leaf  fill:#0F1117,stroke:#ffffff22,color:#ffffff88

    class ROOT root
    class FE,BE,EXT branch
    class FE1,FE2,FE3 fe
    class BE1,BE2 be
    class EXT1,EXT2,EXT3 ext
    class FE3a,FE3b,FE3c,EXT1a,EXT1b,EXT1c,EXT1d,EXT2a,EXT2b,EXT3a leaf
```

### Package Versions

| Category | Package | Version |
|----------|---------|---------|
| UI Framework | `react` + `react-dom` | 18.3.1 |
| Build Tool | `vite` + `@vitejs/plugin-react` | 5.4.1 |
| 3D Graphics | `three` | 0.166.0 |
| AI | Google Gemini API | `gemini-1.5-flash` |
| Weather | OpenWeatherMap REST | v2.5 |
| Mandi | data.gov.in Agmarknet | REST API |
| Deployment | Netlify | Functions + CDN |

---

## 🚀 Quick Start

### Prerequisites

- Node.js v18+
- npm v9+
- Free API keys (see below)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/YOUR_USERNAME/agromind3d.git
cd agromind3d

# 2. Install dependencies
npm install

# 3. Create environment file
touch .env
```

Add to `.env`:

```env
VITE_OPENWEATHER_KEY=your_openweathermap_key_here
VITE_GEMINI_KEY=your_gemini_key_here
```

```bash
# 4. Run locally
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

> ⚠️ AI features (Mandi prices fallback, alerts, crop advisor) use Netlify Functions.
> For full local AI testing, use Netlify CLI:

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Run with full functions support
netlify dev
```

---

## 🔑 Environment Variables

### Frontend (`.env`)

| Variable | Where to get | Required |
|----------|-------------|----------|
| `VITE_OPENWEATHER_KEY` | [openweathermap.org](https://openweathermap.org/api) — free signup | ✅ Yes |
| `VITE_GEMINI_KEY` | [aistudio.google.com](https://aistudio.google.com) — free | ✅ Yes |

### Netlify Function (`netlify/functions/ai.js`)

| Variable | Where to set | Required |
|----------|-------------|----------|
| `GEMINI_API_KEY` | Netlify Dashboard → Site Config → Environment Variables | ✅ Yes |
| `VITE_OPENWEATHER_KEY` | Netlify Dashboard → Site Config → Environment Variables | ✅ Yes |

> 🔒 Never commit your `.env` file. It's already in `.gitignore`.

---

## ☁️ Deployment

### Deploy on Netlify (Recommended — Free)

```bash
# 1. Push to GitHub
git add .
git commit -m "initial commit"
git push origin main
```

2. Go to [netlify.com](https://netlify.com) → **Add new site** → **Import from GitHub**

3. Build settings are auto-detected from `netlify.toml`:

```toml
[build]
  command = "npm run build"
  publish = "dist"

[functions]
  directory = "netlify/functions"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

4. Add environment variables in **Netlify Dashboard**:

**Site Configuration → Environment Variables → Add variable**

| Key | Value |
|-----|-------|
| `GEMINI_API_KEY` | Your Google Gemini API key |
| `VITE_OPENWEATHER_KEY` | Your OpenWeatherMap key |

5. Click **Trigger deploy** → live in ~2 minutes at:

```
https://whimsical-custard-943a95.netlify.app
```

---

## 📁 Project Structure

```
agromind3d/
├── 📄 index.html                    # App shell
├── ⚙️  vite.config.js               # Vite config
├── 📦 package.json                  # Dependencies
├── 🌐 netlify.toml                  # Netlify build + functions config
├── 🔺 vercel.json                   # Vercel deploy config (alternative)
├── 🔒 .env                          # API keys — never commit!
│
├── src/
│   ├── ⚛️  main.jsx                 # React root mount
│   └── 🌱 App.jsx                   # Entire app — all pages + components
│                                    # (~2200 lines — Globe, FarmMap, Analytics,
│                                    #  Mandi, Growth, Dashboard, Nav, AI hooks)
│
└── netlify/
    └── functions/
        └── ⚡ ai.js                 # Serverless Gemini proxy — forwards
                                     # requests to Google AI securely
```

---

## 🗺️ Location Config

The app is configured for **Lucknow, Uttar Pradesh**. To change location, edit these constants in `src/App.jsx`:

```js
const LUCKNOW_LAT = 26.8467;   // ← your latitude
const LUCKNOW_LON = 80.9462;   // ← your longitude
```

And search + replace **"Lucknow"** in `App.jsx` for city name references.

---

## 📊 Platform Overview

```
┌──────────────────────────────────────────────────────────────┐
│   🌾 6 Pages        🤖 Gemini AI      🌍 3D Globe           │
│   📊 Analytics      🌤️ Live Weather   🚁 Drone Patrol       │
│   💰 Mandi Prices   🌱 Growth Sim     🗺️ Farm Map           │
│   🏪 data.gov.in    ⚡ Netlify Fn     📱 Responsive          │
└──────────────────────────────────────────────────────────────┘
```

### AI Features Summary

| Feature | Model | Type |
|---------|-------|------|
| Mandi Prices (fallback) | `gemini-1.5-flash` | Structured JSON |
| Farm Alerts | `gemini-1.5-flash` | JSON array |
| Field Analytics | `gemini-1.5-flash` | Structured JSON |
| Crop Advisor Chat | `gemini-1.5-flash` | Conversational |
| Daily Stats | `gemini-1.5-flash` | Structured JSON |

### Live Data Sources

| Data | Source | Refresh |
|------|--------|---------|
| Weather | OpenWeatherMap API | Every 10 min |
| Mandi Prices | data.gov.in Agmarknet | On page load |
| Farm Alerts | Gemini AI | Every 10 min |
| Field Analytics | Gemini AI | On page load |

---

## 🤝 Contributing

Contributions welcome!

```bash
# 1. Fork the repo
# 2. Create your branch
git checkout -b feature/your-feature-name

# 3. Commit your changes
git commit -m "Add: your feature description"

# 4. Push and open a Pull Request
git push origin feature/your-feature-name
```

**Guidelines:**
- One feature per PR
- Test locally before submitting
- Keep code commented and clean
- Follow existing style in `App.jsx`

---

## 👤 Author

**Zara Alam**
- GitHub: [@zara650](https://github.com/zara650)
- LinkedIn: [zara-alam-73b9b1322](https://www.linkedin.com/in/zara-alam-73b9b1322)
- Email: [zalam9414@gmail.com](mailto:zalam9414@gmail.com)

---

## 📄 License

MIT License — free to use, modify and distribute.

---

<div align="center">

⭐ **If AgroMind helped you, give it a star!**

<img width="100%" src="https://capsule-render.vercel.app/api?type=waving&color=0:0F1117,50:0B3D2E,100:2E7D32&height=120&section=footer&animation=fadeIn" />

**Built with ❤️ for Indian Farmers · Powered by Gemini AI · Three.js · React · OpenWeatherMap · data.gov.in**

</div>
