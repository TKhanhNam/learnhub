import axios from 'axios'

export interface ApiEnvelope<T> {
  success: boolean
  code: number
  message: string
  data: T
  errors?: { field?: string; message: string }[] | null
  meta?: Record<string, unknown> | null
}

function apiOrigin() {
  if (typeof window !== 'undefined') return window.location.origin
  return import.meta.env.VITE_API_BASE_URL
}

const axiosClient = axios.create({
  baseURL: apiOrigin(),
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

axiosClient.interceptors.request.use((config) => {
  config.baseURL = apiOrigin()
  const token = localStorage.getItem('lh_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

axiosClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status
    const original = error.config
    if (status === 401 && original && !original._retry && !String(original.url || '').includes('/auth/')) {
      original._retry = true
      const refreshToken = localStorage.getItem('lh_refresh')
      try {
        const res = await axios.post(
          `${apiOrigin()}/api/auth/refresh`,
          { refreshToken },
          { withCredentials: true },
        )
        const data = res.data?.data
        if (data?.accessToken) {
          localStorage.setItem('lh_token', data.accessToken)
          if (data.refreshToken) localStorage.setItem('lh_refresh', data.refreshToken)
          original.headers.Authorization = `Bearer ${data.accessToken}`
          return axiosClient(original)
        }
      } catch {
        localStorage.removeItem('lh_token')
        localStorage.removeItem('lh_refresh')
        localStorage.removeItem('lh_user')
        if (window.location.pathname !== '/login') window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  },
)

export default axiosClient
