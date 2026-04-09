import axios from 'axios'

// In production (Render static deploy), API calls must go to the actual backend URL.
// In local dev, Vite proxies /api → localhost:8000, so we leave baseURL empty.
const BASE_URL = import.meta.env.VITE_API_URL || ''

const api = axios.create({
  baseURL: BASE_URL,
})

export default api
