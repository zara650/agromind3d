<div align="center">

<!-- Animated Banner -->
<img width="100%" src="https://capsule-render.vercel.app/api?type=waving&color=0:0B3D2E,50:39FF14,100:0F1117&height=200&section=header&text=AgroMind&fontSize=72&fontColor=ffffff&fontAlignY=38&desc=AI-Powered%20Smart%20Farming%20Assistant&descAlignY=60&descSize=20&animation=fadeIn" />

<!-- Live Status Badges -->
<p>
  <a href="https://your-deployed-url.netlify.app" target="_blank">
    <img src="https://img.shields.io/website?url=https%3A%2F%2Fyour-deployed-url.netlify.app&label=Frontend&style=for-the-badge&logo=netlify&logoColor=white&color=39FF14" />
  </a>
  <img src="https://img.shields.io/badge/Claude%20AI-Sonnet%204-6366f1?style=for-the-badge&logo=anthropic&logoColor=white" />
  <img src="https://img.shields.io/badge/Three.js-r166-black?style=for-the-badge&logo=threedotjs&logoColor=white" />
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=white" />
  <img src="https://img.shields.io/badge/Weather-Live%20API-38BDF8?style=for-the-badge&logo=openweathermap&logoColor=white" />
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
║  🌱 AgroMind  ·  AI-Powered Smart Farming Dashboard             ║
║  ✦ Three.js 3D Farm Scene   ✦ Live Weather API                  ║
║  ✦ Claude AI Crop Advisor   ✦ Live Mandi Prices                 ║
║  ✦ Interactive Globe        ✦ Plant Growth Simulation           ║
╚══════════════════════════════════════════════════════════════════╝
```

</div>

---

## 🌐 Live Demo

| Layer | URL | Status |
|-------|-----|--------|
| 🖥️ **Frontend** | [whimsical-custard-943a95.netlify.app](https://whimsical-custard-943a95.netlify.app) | ![Live](https://img.shields.io/website?url=https%3A%2F%2Fwhimsical-custard-943a95.netlify.app&style=flat-square&color=39FF14) |
| ⚡ **AI Function** | `/.netlify/functions/ai` | Netlify Serverless |
| 🌤️ **Weather API** | OpenWeatherMap · Lucknow, UP | Live |

---

## ✨ Features

### 🤖 AI Intelligence
- **Claude AI Crop Advisor** — chat interface powered by Anthropic claude-sonnet-4, gives real advice on crop disease, spray timing, sowing windows
- **Live Mandi Prices** — AI generates realistic current market prices for Lucknow mandis (Aminabad, Lucknow APMC, Amausi)
- **Smart Farm Alerts** — AI-generated alerts for disease risk, weather spray windows, price movements, and PMFBY claims
- **AI Field Analytics** — dynamically generated yield, soil health, and field metrics per Kharif season

### 🌍 3D Visualizations (Three.js)
- **Full-Screen 3D Farm Dashboard** — barn, silo, tractor, wandering cows, crop rows, drone patrol, autumn trees — all animated
- **Interactive Earth Globe** — draggable, zoomable globe with your farm location pinned in neon green
- **3D Farm Parcel Map** — terrain with 5 clickable crop fields, hover tooltips, orbit controls
- **3D Crop Yield Bar Chart** — animated bars that grow on load with hover highlight
- **Plant Growth Simulation** — interactive seed → sprout → sapling → harvest with soil moisture and temperature sliders

### 🌤️ Live Weather
- Real-time temperature, humidity, wind speed, UV index, pressure, visibility
- Powered by OpenWeatherMap API, auto-refreshes every 10 minutes
- Configured for **Lucknow, Uttar Pradesh** (lat: 26.8467, lon: 80.9462)

### 📊 Analytics Engine
- Monthly crop yield bar chart
- Annual rainfall trend line chart (Lucknow district)
- Live metrics: avg yield, rainfall, soil health, active fields

---

## 🏗 Architecture

### System Overview

```mermaid
graph TB
    User(["👤 Farmer / User"])

    subgraph Frontend ["🖥️ Frontend — Netlify CDN"]
        REACT["React 18\nSPA"]
        THREE["Three.js r166\n3D Scenes"]
        CANVAS["Canvas 2D\nRainfall Chart"]
    end

    subgraph Serverless ["⚡ Netlify Functions"]
        AI_FN["ai.js\nServerless Proxy"]
    end

    subgraph External ["🌐 External APIs"]
        ANTHROPIC["Anthropic API\nClaude Sonnet 4"]
        WEATHER["OpenWeatherMap\nLive Weather"]
    end

    User -->|"HTTPS"| REACT
    REACT --> THREE
    REACT --> CANVAS
    REACT -->|"POST /.netlify/functions/ai"| AI_FN
    REACT -->|"GET weather data"| WEATHER
    AI_FN -->|"POST /v1/messages\nANTHROPIC_API_KEY"| ANTHROPIC
    ANTHROPIC -->|"AI response JSON"| AI_FN
    AI_FN -->|"Proxied response"| REACT
    WEATHER -->|"Weather JSON"| REACT
```

---

### Request Lifecycle

```mermaid
sequenceDiagram
    actor Farmer
    participant FE as React Frontend
    participant NF as Netlify Function
    participant AI as Claude AI
    participant WX as OpenWeatherMap

    Farmer->>FE: Opens Dashboard
    FE->>WX: GET /weather?lat=26.84&lon=80.94
    WX-->>FE: { temp, humidity, wind, ... }
    FE->>NF: POST /ai — fetchMandiPrices()
    FE->>NF: POST /ai — fetchLiveAlerts()
    FE->>NF: POST /ai — fetchFieldAnalytics()
    FE->>NF: POST /ai — fetchDailyStats()
    NF->>AI: POST /v1/messages { model, system, messages }
    AI-->>NF: { content[0].text — JSON string }
    NF-->>FE: Parsed prices / alerts / analytics
    FE->>Farmer: Renders live dashboard with all data
```

---

### Data Flow — AI Features

```mermaid
flowchart LR
    A["User Input\nor page load"] --> B{"Which AI call?"}

    B -->|Mandi Tab| C["fetchMandiPrices()\nPrompt: Lucknow UP mandi\nprices for today"]
    B -->|Dashboard load| D["fetchLiveAlerts()\nPrompt: 5 farm alerts\nbased on weather"]
    B -->|Analytics Tab| E["fetchFieldAnalytics()\nPrompt: 5-field farm\nKharif 2026 data"]
    B -->|AI Advisor chat| F["askCropAdvisor(msg)\nUser question about\ncrop / disease / price"]

    C --> G["Netlify Function\nai.js proxy"]
    D --> G
    E --> G
    F --> G

    G --> H["Claude Sonnet 4\nAnthropic API"]
    H --> I["JSON response\nparsed & rendered"]
```

---

## 📄 Pages

| Page | Nav Label | Description |
|------|-----------|-------------|
| **Dashboard** | `DASHBOARD` | Full-screen 3D farm with live weather, field monitor, AI alerts, crop advisor chat |
| **Globe** | `GLOBE` | Interactive 3D Earth, farm location pin, agri zone stats |
| **Farm Map** | `FARM MAP` | 3D terrain with 5 crop parcels, soil health bars, orbit + zoom |
| **Analytics** | `ANALYTICS` | 3D yield chart, rainfall trends, live metrics |
| **Mandi** | `MANDI` | Live AI crop prices, trend arrows, sell/hold advisory |
| **Growth** | `GROWTH` | Plant growth simulation, disease risk meter, 90-day timeline |

---

## 🛠 Tech Stack

```mermaid
graph LR
    ROOT(["🌱 AgroMind"])

    ROOT --- FE["🖥️ Frontend"]
    ROOT --- BE["⚡ Backend"]
    ROOT --- EXT["🌐 External APIs"]

    FE --- FE1["React 18"]
    FE --- FE2["Vite 5"]
    FE --- FE3["Three.js r166"]
    FE --- FE4["Canvas 2D"]

    FE3 --- FE3a["3D Farm Scene\nDashboard BG"]
    FE3 --- FE3b["Earth Globe\nFarm Map"]
    FE3 --- FE3c["Bar Chart\nPlant Growth"]

    BE --- BE1["Netlify Functions\nNode.js"]
    BE --- BE2["ai.js\nAPI Proxy"]

    EXT --- EXT1["Anthropic\nClaude Sonnet 4"]
    EXT --- EXT2["OpenWeatherMap\nLive Weather"]

    EXT1 --- EXT1a["Mandi Prices"]
    EXT1 --- EXT1b["Farm Alerts"]
    EXT1 --- EXT1c["Crop Advisor"]
    EXT1 --- EXT1d["Field Analytics"]

    EXT2 --- EXT2a["Temp · Humidity"]
    EXT2 --- EXT2b["Wind · Pressure"]

    classDef root  fill:#0B3D2E,stroke:#39FF14,color:#39FF14,font-weight:bold
    classDef branch fill:#0F1117,stroke:#39FF14,color:#fff,font-weight:bold
    classDef fe    fill:#1a3a2a,stroke:#39FF14,color:#39FF14
    classDef be    fill:#1a2a3a,stroke:#38BDF8,color:#38BDF8
    classDef ext   fill:#2a1a3a,stroke:#a78bfa,color:#a78bfa
    classDef leaf  fill:#0F1117,stroke:#ffffff22,color:#ffffff88

    class ROOT root
    class FE,BE,EXT branch
    class FE1,FE2,FE3,FE4 fe
    class BE1,BE2 be
    class EXT1,EXT2 ext
    class FE3a,FE3b,FE3c,EXT1a,EXT1b,EXT1c,EXT1d,EXT2a,EXT2b leaf
```

### Package Versions

| Category | Package | Version |
|----------|---------|---------|
| UI Framework | `react` + `react-dom` | 18.3.1 |
| Build Tool | `vite` + `@vitejs/plugin-react` | 5.4.1 |
| 3D Graphics | `three` | 0.166.0 |
| AI | Anthropic Claude API | claude-sonnet-4-20250514 |
| Weather | OpenWeatherMap REST | v2.5 |
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
git clone https://github.com/YOUR_USERNAME/agromind.git
cd agromind

# 2. Install dependencies
npm install

# 3. Create environment file
touch .env
```

Add to `.env`:

```env
VITE_OPENWEATHER_KEY=your_openweathermap_key_here
ANTHROPIC_API_KEY=your_anthropic_key_here
```

```bash
# 4. Run locally (basic — no AI functions)
npm run dev

# OR with Netlify CLI (full AI features locally)
npm install -g netlify-cli
netlify dev
```

Open [http://localhost:3000](http://localhost:3000)

> ⚠️ AI features (Mandi prices, alerts, crop advisor) need Netlify Functions. Use `netlify dev` for full local testing, or just deploy to Netlify.

---

## 🔑 Environment Variables

| Variable | Where to get | Required |
|----------|-------------|---------|
| `VITE_OPENWEATHER_KEY` | [openweathermap.org](https://openweathermap.org/api) — free | ✅ Yes |
| `ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com) | ✅ Yes |

> 🔒 Never commit your `.env` file. Add it to `.gitignore`.

---

## ☁️ Deployment

### Deploy on Netlify (Recommended)

```bash
# 1. Push to GitHub
git add .
git commit -m "initial commit"
git push origin main
```

**2.** Go to [netlify.com](https://netlify.com) → **Add new site** → **Import from GitHub**

**3.** Build settings are auto-detected from `netlify.toml`:

```toml
[build]
  command = "npm run build"
  publish = "dist"

[functions]
  directory = "netlify/functions"
```

**4.** Add environment variables in Netlify Dashboard:
- **Site Settings → Environment Variables**
- Add `ANTHROPIC_API_KEY` and `VITE_OPENWEATHER_KEY`

**5.** Click **Trigger deploy** → live in ~2 minutes at:
```
https://agromind.netlify.app
```

---

## 📁 Project Structure

```
agromind/
├── 📄 index.html                    # App shell
├── ⚙️  vite.config.js               # Vite config
├── 📦 package.json                  # Dependencies
├── 🌐 netlify.toml                  # Netlify build + functions config
├── 🔺 vercel.json                   # Vercel deploy config (alternative)
├── 🔒 .env                          # API keys — never commit this
│
├── src/
│   ├── ⚛️  main.jsx                 # React root mount
│   └── 🌱 App.jsx                   # Entire app — all pages + components
│                                    # (2200 lines — Globe, FarmMap, Analytics,
│                                    #  Mandi, Growth, Dashboard, Nav, AI hooks)
│
└── netlify/
    └── functions/
        └── ⚡ ai.js                 # Serverless proxy — forwards requests
                                     # to Anthropic API securely
```

---

## 🗺️ Location Config

The app is configured for **Lucknow, Uttar Pradesh**. To change location, edit these lines in `src/App.jsx`:

```js
const GORAKHPUR_LAT = 26.8467;   // ← your latitude
const GORAKHPUR_LON = 80.9462;   // ← your longitude
```

And update city name references (search for `"Lucknow"` in App.jsx).

---

## 📊 Platform Overview

```
┌──────────────────────────────────────────────────────┐
│   🌾 6 Pages      🤖 Claude AI     🌍 3D Globe       │
│   📊 Analytics    🌤️ Live Weather  🚁 Drone Patrol   │
│   📈 Mandi Prices 🌱 Growth Sim    🗺️ Farm Map       │
└──────────────────────────────────────────────────────┘
```

### AI Features Summary

| Feature | Model | Prompt Type |
|---------|-------|-------------|
| Mandi Prices | claude-sonnet-4 | Structured JSON |
| Farm Alerts | claude-sonnet-4 | JSON array |
| Field Analytics | claude-sonnet-4 | Structured JSON |
| Crop Advisor Chat | claude-sonnet-4 | Conversational |
| Daily Stats | claude-sonnet-4 | Structured JSON |

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

### Guidelines
- One feature per PR
- Test locally before submitting
- Keep code commented and clean
- Follow existing style in `App.jsx`

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

## 👤 Author

**[Your Name]**

- GitHub: [@your-username](https://github.com/your-username)
- LinkedIn: [your-linkedin](https://linkedin.com/in/your-profile)
- Email: your@email.com

---

<div align="center">

## ⭐ If AgroMind helped you, give it a star!

<img width="100%" src="https://capsule-render.vercel.app/api?type=waving&color=0:0F1117,50:0B3D2E,100:39FF14&height=120&section=footer&animation=fadeIn" />

**Built with ❤️ for Indian Farmers · Powered by Claude AI · Three.js · React · OpenWeatherMap**

</div>
