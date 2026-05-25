from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import requests, os, json, re
from dotenv import load_dotenv
from typing import Optional
from groq import Groq

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
OPENWEATHER_KEY = os.getenv("VITE_OPENWEATHER_KEY", "")
LAT = 26.8467
LON = 80.9462

client = Groq(api_key=GROQ_API_KEY)

app = FastAPI(title="AgroMind API", version="2.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

SYSTEM_PROMPT = """You are AgroMind AI, expert agricultural advisor for Indian farmers in Lucknow UP India. Season: Kharif 2026. Reply in 2-4 short bullet points. Be practical, specific to UP farming. If disease: give treatment name, dosage, spray timing. Always mention best action, timing, cost in INR."""

class AdvisorRequest(BaseModel):
    message: str
    weather: Optional[str] = "31 degrees C, humid"

def call_ai(prompt: str, max_tokens: int = 800) -> str:
    try:
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt}
            ],
            max_tokens=max_tokens,
            temperature=0.7
        )
        return response.choices[0].message.content
    except Exception as e:
        return f"Error: {str(e)}"

@app.get("/api/health")
def health():
    return {"status": "online", "version": "2.0.0", "model": "llama-3.1-8b-instant"}

@app.post("/api/advisor")
async def crop_advisor(req: AdvisorRequest):
    prompt = f"Weather: {req.weather}\nQuestion: {req.message}"
    try:
        text = call_ai(prompt, 800)
        return {"response": text, "status": "ok"}
    except Exception as e:
        return {"response": "Unable to connect to AI advisor.", "status": "error"}

@app.get("/api/alerts")
async def get_alerts():
    prompt = """Generate exactly 5 farm alerts for UP India Kharif 2026.
Return ONLY valid JSON array, no markdown, no explanation:
[{"msg":"alert text","level":"danger","time":"2m ago","icon":"emoji"}]
Levels: danger/warning/info/success. Make realistic for Lucknow UP."""
    try:
        text = call_ai(prompt, 600)
        text = re.sub(r'```json|```', '', text).strip()
        alerts = json.loads(text)
        return {"alerts": alerts, "status": "ok"}
    except:
        return {"alerts": [
            {"msg": "Late blight risk — F-003 Cotton", "level": "danger", "time": "2m ago", "icon": "🌿"},
            {"msg": "Spray window: Wed 6am-9am", "level": "info", "time": "5m ago", "icon": "💧"},
            {"msg": "Wheat prices up +3% at Gola", "level": "success", "time": "12m ago", "icon": "📈"},
            {"msg": "Soil moisture low — F-003", "level": "warning", "time": "18m ago", "icon": "⚠️"},
            {"msg": "PMFBY claim window open", "level": "info", "time": "31m ago", "icon": "📋"}
        ], "status": "fallback"}

@app.get("/api/analytics")
async def get_analytics():
    prompt = """Farm analytics for 5 fields Lucknow UP Kharif 2026.
Return ONLY valid JSON, no markdown:
{"fields":[{"id":"F-001","crop":"Wheat","yield":"3.2t/ha","area":"2.5ac","health":85,"status":"good"}],
"metrics":{"avgYield":"3.1t/ha","rainfall":"847mm","soilHealth":78,"activeFields":5}}"""
    try:
        text = call_ai(prompt, 600)
        text = re.sub(r'```json|```', '', text).strip()
        return {**json.loads(text), "status": "ok"}
    except:
        return {"fields": [
            {"id": "F-001", "crop": "Wheat", "yield": "3.2t/ha", "area": "2.5ac", "health": 85, "status": "good"},
            {"id": "F-002", "crop": "Rice", "yield": "4.1t/ha", "area": "3.0ac", "health": 72, "status": "good"},
            {"id": "F-003", "crop": "Cotton", "yield": "2.8t/ha", "area": "4.0ac", "health": 61, "status": "warning"},
            {"id": "F-004", "crop": "Sugarcane", "yield": "68t/ha", "area": "1.8ac", "health": 90, "status": "good"},
            {"id": "F-005", "crop": "Vegetables", "yield": "12t/ha", "area": "1.2ac", "health": 80, "status": "good"}
        ], "metrics": {"avgYield": "3.1t/ha", "rainfall": "847mm", "soilHealth": 78, "activeFields": 5}, "status": "fallback"}

@app.get("/api/weather")
async def get_weather():
    try:
        url = f"https://api.openweathermap.org/data/2.5/weather?lat={LAT}&lon={LON}&appid={OPENWEATHER_KEY}&units=metric"
        r = requests.get(url, timeout=5)
        d = r.json()
        return {
            "temp": round(d["main"]["temp"]),
            "feels_like": round(d["main"]["feels_like"]),
            "humidity": d["main"]["humidity"],
            "wind": round(d["wind"]["speed"] * 3.6),
            "description": d["weather"][0]["description"],
            "condition": d["weather"][0]["main"],
            "status": "ok"
        }
    except:
        return {"temp": 31, "feels_like": 35, "humidity": 72, "wind": 14,
                "description": "partly cloudy", "condition": "Clouds", "status": "fallback"}

@app.get("/api/stats")
async def get_stats():
    return {"messages": "1,247", "alerts": "23", "queries": "418", "status": "ok"}

active_connections = []

@app.websocket("/ws/farm")
async def websocket_farm(websocket: WebSocket):
    await websocket.accept()
    active_connections.append(websocket)
    try:
        while True:
            data = await websocket.receive_json()
            if data.get("type") == "ping":
                await websocket.send_json({"type": "pong"})
            elif data.get("type") == "chat":
                await websocket.send_json({"type": "thinking"})
                msg = data.get("message", "")
                weather = data.get("weather", "31C humid")
                text = call_ai(f"Weather: {weather}\nQuestion: {msg}", 800)
                await websocket.send_json({"type": "response", "message": text})
    except WebSocketDisconnect:
        active_connections.remove(websocket)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

