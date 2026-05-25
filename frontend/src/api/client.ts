import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from "axios"
import { clearAccessToken, getAccessToken } from "../lib/auth"

export interface DeskAvailability {
  id: number
  floor_id: number
  label: string
  status: string
  equipment: string | null
  x_coordinate: number | null
  y_coordinate: number | null
}

export interface City {
  id: number
  name: string
}

export interface Building {
  id: number
  name: string
  address: string
  city_id: number
}

export interface Floor {
  id: number
  floor_number: number
  building_id: number
  description?: string | null
  svg_map_url?: string | null
}

export interface Feature {
  id: number
  name: string
  category?: string | null
}

export interface Desk {
  id: number
  name: string
  floor_id: number
  description?: string | null
  x_pos: number | null
  y_pos: number | null
  is_active: boolean
  features?: DeskFeature[]
}

export interface DeskFeature {
  value?: string | null
  feature: Feature
}

export interface DeskFeaturePayload {
  feature_id: number
  value?: string | null
}

export interface DeskDetails extends Desk {
  features: DeskFeature[]
}

export interface Reservation {
  id: number
  desk_id: number
  user_id: number
  reservation_date: string
  status: string
  check_in: boolean
  created_at: string
}

export interface DeskMapPayload {
  id?: number
  name: string
  description?: string | null
  x_pos: number
  y_pos: number
  is_active: boolean
  features?: DeskFeaturePayload[]
}

export const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000"
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
})

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAccessToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      clearAccessToken()
      if (typeof window !== "undefined" && window.location.pathname !== "/login") {
        window.location.assign("/login")
      }
    }
    return Promise.reject(error)
  },
)

export interface AuthTokenResponse {
  access_token: string
  token_type: string
}

export async function login(email: string, password: string): Promise<AuthTokenResponse> {
  const formData = new URLSearchParams()
  formData.append("username", email)
  formData.append("password", password)

  const response = await apiClient.post<AuthTokenResponse>("/login", formData, {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
  })
  return response.data
}

export async function getFloorDesks(floorId: number): Promise<DeskAvailability[]> {
  const response = await apiClient.get<DeskAvailability[]>(`/desks/${floorId}/availability`)
  return response.data
}

export async function getCities(): Promise<City[]> {
  const response = await apiClient.get<City[]>("/cities/")
  return response.data
}

export async function getBuildings(cityId: number): Promise<Building[]> {
  const response = await apiClient.get<Building[]>(`/buildings/?city_id=${cityId}`)
  return response.data
}

export async function getFloors(buildingId: number): Promise<Floor[]> {
  const response = await apiClient.get<Floor[]>(`/floors/?building_id=${buildingId}`)
  return response.data
}

export async function getDesks(floorId: number, featureId?: number | null): Promise<Desk[]> {
  const params = new URLSearchParams({ floor_id: String(floorId) })
  if (featureId) {
    params.append("feature_id", String(featureId))
  }
  const response = await apiClient.get<Desk[]>(`/desks/?${params.toString()}`)
  return response.data
}

export async function getDeskDetails(deskId: number): Promise<DeskDetails> {
  const response = await apiClient.get<DeskDetails>(`/desks/${deskId}`)
  return response.data
}

export async function getFeatures(): Promise<Feature[]> {
  const response = await apiClient.get<Feature[]>("/features/")
  return response.data
}

export async function createReservation(
  deskId: number,
  reservationDate: string,
): Promise<Reservation> {
  const response = await apiClient.post<Reservation>("/reservations/", {
    desk_id: deskId,
    reservation_date: reservationDate,
  })
  return response.data
}

export async function getMyReservations(): Promise<Reservation[]> {
  const response = await apiClient.get<Reservation[]>("/reservations/me")
  return response.data
}

export async function deleteReservation(reservationId: number): Promise<void> {
  await apiClient.delete(`/reservations/${reservationId}`)
}

export async function uploadFloorMap(floorId: number, file: File): Promise<Floor> {
  const formData = new FormData()
  formData.append("file", file)

  const response = await apiClient.put<Floor>(`/floors/${floorId}/map`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  })

  return response.data
}

export async function saveFloorDesksBatch(
  floorId: number,
  desks: DeskMapPayload[],
): Promise<Desk[]> {
  const response = await apiClient.put<Desk[]>(`/floors/${floorId}/desks/batch`, { desks })
  return response.data
}
