import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from "axios"

export interface DeskAvailability {
  id: number
  floor_id: number
  label: string
  status: string
  equipment: string | null
  x_coordinate: number | null
  y_coordinate: number | null
}

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000"
export const ACCESS_TOKEN_KEY = "access_token"

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
})

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (typeof window !== "undefined") {
    const token = window.localStorage.getItem(ACCESS_TOKEN_KEY)

    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  }

  return config
})

export async function getFloorDesks(floorId: number): Promise<DeskAvailability[]> {
  const response = await apiClient.get<DeskAvailability[]>(`/desks/${floorId}/availability`)
  return response.data
}
