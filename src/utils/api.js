import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'https://api.simusolve.local',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

export default api
