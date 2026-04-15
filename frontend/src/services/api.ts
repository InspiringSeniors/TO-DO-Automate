import axios from 'axios'

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
})

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default apiClient

// ── Auth ──────────────────────────────────────────────────────────────────────
export const login = (username: string, password: string) => {
  const params = new URLSearchParams()
  params.append('username', username)
  params.append('password', password)
  return apiClient.post('/auth/login', params, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  })
}
export const getMe = () => apiClient.get('/auth/me')
export const getUsers = () => apiClient.get('/auth')
export const createUser = (data: object) => apiClient.post('/auth/create', data)

// ── Tasks ─────────────────────────────────────────────────────────────────────
export const getTasks = (params?: object) => apiClient.get('/tasks', { params })
export const createTask = (data: object) => apiClient.post('/tasks', data)
export const updateTask = (id: string, data: object) => apiClient.put(`/tasks/${id}`, data)
export const deleteTask = (id: string) => apiClient.delete(`/tasks/${id}`)
export const completeTask = (id: string) => apiClient.patch(`/tasks/${id}/complete`)
export const uploadExcel = (file: File) => {
  const fd = new FormData()
  fd.append('file', file)
  return apiClient.post('/tasks/upload-excel', fd)
}
export const exportTasksExcel = () =>
  apiClient.get('/tasks/export-excel', { responseType: 'blob' })

// ── Resources ─────────────────────────────────────────────────────────────────
export const getResources = (params?: { search?: string; user_id?: string }) =>
  apiClient.get('/resources', { params })
export const uploadResource = (formData: FormData) =>
  apiClient.post('/resources', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
export const deleteResource = (id: string) => apiClient.delete(`/resources/${id}`)

// ── Users ─────────────────────────────────────────────────────────────────────
export const getUsersList = () => apiClient.get('/auth/users-list')
