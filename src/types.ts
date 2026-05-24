export interface WeatherData {
  temp: number
  feels_like: number
  humidity: number
  wind: number
  description: string
  condition: string
  status: string
}

export interface Field {
  id: string
  crop: string
  yield: string
  area: string
  health: number
  status: "good" | "warning" | "danger"
}

export interface Alert {
  msg: string
  level: "danger" | "warning" | "info" | "success"
  time: string
  icon: string
}

export interface MandiPrice {
  crop: string
  price: number
  unit: string
  change: string
  trend: "up" | "down" | "stable"
}

export interface ChatMessage {
  role: "user" | "ai"
  text: string
}

export interface DailyStats {
  messages: string
  alerts: string
  queries: string
}

export interface Analytics {
  fields: Field[]
  metrics: {
    avgYield: string
    rainfall: string
    soilHealth: number
    activeFields: number
  }
}