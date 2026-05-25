import { type MouseEvent, useEffect, useMemo, useRef, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  API_BASE_URL,
  type Building,
  type City,
  type Desk,
  type DeskMapPayload,
  type Feature,
  type Floor,
  getBuildings,
  getCities,
  getDesks,
  getFeatures,
  getFloors,
  saveFloorDesksBatch,
  uploadFloorMap,
} from "../api/client"
import { isAuthenticated } from "../lib/auth"

type DeskDraft = DeskMapPayload & {
  clientId: string
}

type SaveState = "idle" | "saving" | "success" | "error"

type UploadState = "idle" | "uploading" | "success" | "error"

const createClientId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID()
  }
  return `desk-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

const mapDeskToDraft = (desk: Desk): DeskDraft => ({
  id: desk.id,
  clientId: `server-${desk.id}`,
  name: desk.name,
  description: desk.description ?? "",
  x_pos: desk.x_pos ?? 0,
  y_pos: desk.y_pos ?? 0,
  is_active: desk.is_active,
  features:
    desk.features?.map((item) => ({
      feature_id: item.feature.id,
      value: item.value ?? "",
    })) ?? [],
})

const resolveMapUrl = (mapUrl: string | null | undefined) => {
  if (!mapUrl) {
    return null
  }
  if (mapUrl.startsWith("http")) {
    return mapUrl
  }
  return `${API_BASE_URL}${mapUrl}`
}

export function AdminFloorPlanPage() {
  const queryClient = useQueryClient()
  const [selectedCityId, setSelectedCityId] = useState<number | null>(null)
  const [selectedBuildingId, setSelectedBuildingId] = useState<number | null>(null)
  const [selectedFloorId, setSelectedFloorId] = useState<number | null>(null)
  const [desks, setDesks] = useState<DeskDraft[]>([])
  const [activeDesk, setActiveDesk] = useState<DeskDraft | null>(null)
  const [modalError, setModalError] = useState<string | null>(null)
  const [saveState, setSaveState] = useState<SaveState>("idle")
  const [uploadState, setUploadState] = useState<UploadState>("idle")
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isDirty, setIsDirty] = useState(false)
  const imgRef = useRef<HTMLImageElement | null>(null)

  const citiesQuery = useQuery<City[]>({
    queryKey: ["cities"],
    queryFn: getCities,
  })

  const buildingsQuery = useQuery<Building[]>({
    queryKey: ["buildings", selectedCityId],
    queryFn: () => getBuildings(selectedCityId as number),
    enabled: Boolean(selectedCityId),
  })

  const floorsQuery = useQuery<Floor[]>({
    queryKey: ["floors", selectedBuildingId],
    queryFn: () => getFloors(selectedBuildingId as number),
    enabled: Boolean(selectedBuildingId),
  })

  const desksQuery = useQuery<Desk[]>({
    queryKey: ["desks", selectedFloorId],
    queryFn: () => getDesks(selectedFloorId as number),
    enabled: Boolean(selectedFloorId),
  })

  const featuresQuery = useQuery<Feature[]>({
    queryKey: ["features"],
    queryFn: getFeatures,
  })

  const selectedFloor = useMemo(
    () => floorsQuery.data?.find((floor) => floor.id === selectedFloorId) ?? null,
    [floorsQuery.data, selectedFloorId],
  )

  const selectedCity = useMemo(
    () => citiesQuery.data?.find((city) => city.id === selectedCityId) ?? null,
    [citiesQuery.data, selectedCityId],
  )

  const selectedBuilding = useMemo(
    () => buildingsQuery.data?.find((building) => building.id === selectedBuildingId) ?? null,
    [buildingsQuery.data, selectedBuildingId],
  )

  const mapUrl = useMemo(
    () => resolveMapUrl(selectedFloor?.svg_map_url),
    [selectedFloor?.svg_map_url],
  )

  const hasToken = isAuthenticated()

  useEffect(() => {
    if (desksQuery.data && selectedFloorId) {
      setDesks(desksQuery.data.map(mapDeskToDraft))
      setIsDirty(false)
      setSaveState("idle")
    }
    if (!selectedFloorId) {
      setDesks([])
      setIsDirty(false)
      setSaveState("idle")
    }
  }, [desksQuery.data, selectedFloorId])

  const handleMapClick = (event: MouseEvent<HTMLDivElement>) => {
    if (!imgRef.current || !selectedFloorId) {
      return
    }

    const rect = imgRef.current.getBoundingClientRect()
    const offsetX = event.clientX - rect.left
    const offsetY = event.clientY - rect.top

    if (offsetX < 0 || offsetY < 0 || offsetX > rect.width || offsetY > rect.height) {
      return
    }

    const xPercent = Number(((offsetX / rect.width) * 100).toFixed(2))
    const yPercent = Number(((offsetY / rect.height) * 100).toFixed(2))

    setActiveDesk({
      clientId: createClientId(),
      name: "",
      description: "",
      x_pos: xPercent,
      y_pos: yPercent,
      is_active: true,
      features: [],
    })
    setModalError(null)
  }

  const updateFeatureSelection = (featureId: number) => {
    if (!activeDesk) {
      return
    }

    const current = activeDesk.features ?? []
    const exists = current.find((item) => item.feature_id === featureId)
    const nextFeatures = exists
      ? current.filter((item) => item.feature_id !== featureId)
      : [...current, { feature_id: featureId, value: "" }]

    setActiveDesk({
      ...activeDesk,
      features: nextFeatures,
    })
  }

  const updateFeatureValue = (featureId: number, value: string) => {
    if (!activeDesk) {
      return
    }

    const current = activeDesk.features ?? []
    const nextFeatures = current.map((item) =>
      item.feature_id === featureId ? { ...item, value } : item,
    )
    setActiveDesk({
      ...activeDesk,
      features: nextFeatures,
    })
  }

  const handleDeskSave = () => {
    if (!activeDesk) {
      return
    }

    if (!activeDesk.name.trim()) {
      setModalError("Desk name is required.")
      return
    }

    setDesks((prev) => {
      const existingIndex = prev.findIndex((desk) => desk.clientId === activeDesk.clientId)
      if (existingIndex >= 0) {
        const next = [...prev]
        next[existingIndex] = { ...activeDesk, features: activeDesk.features ?? [] }
        return next
      }
      return [...prev, { ...activeDesk, features: activeDesk.features ?? [] }]
    })
    setIsDirty(true)
    setActiveDesk(null)
  }

  const handleUpload = async (file: File) => {
    if (!selectedFloorId) {
      return
    }

    setUploadState("uploading")
    setUploadError(null)

    try {
      const updatedFloor = await uploadFloorMap(selectedFloorId, file)
      queryClient.setQueryData<Floor[]>(["floors", selectedBuildingId], (old) => {
        if (!old) {
          return [updatedFloor]
        }
        return old.map((floor) => (floor.id === updatedFloor.id ? updatedFloor : floor))
      })
      setUploadState("success")
    } catch (error) {
      console.error(error)
      setUploadState("error")
      setUploadError("Upload failed. Please try again.")
    }
  }

  const persistDesks = async (nextDesks: DeskDraft[]) => {
    if (!selectedFloorId) {
      return
    }
    setSaveState("saving")
    try {
      const payload = nextDesks.map(({ clientId, ...desk }) => desk)
      const savedDesks = await saveFloorDesksBatch(selectedFloorId, payload)
      queryClient.setQueryData<Desk[]>(["desks", selectedFloorId], savedDesks)
      setDesks(savedDesks.map(mapDeskToDraft))
      setIsDirty(false)
      setSaveState("success")
    } catch (error) {
      console.error(error)
      setSaveState("error")
      setIsDirty(true)
    }
  }

  const handleDeskDelete = async () => {
    if (!activeDesk) {
      return
    }

    const nextDesks = desks.filter((desk) => desk.clientId !== activeDesk.clientId)
    setDesks(nextDesks)
    setIsDirty(true)
    setActiveDesk(null)
    await persistDesks(nextDesks)
  }

  const handleSaveLayout = async () => {
    await persistDesks(desks)
  }

  return (
    <main className="relative overflow-hidden px-6 pb-16 text-slate-900">
      <div className="pointer-events-none absolute -left-16 top-10 h-72 w-72 rounded-full bg-gradient-to-br from-amber-300/50 via-orange-200/30 to-transparent blur-3xl" />
      <div className="pointer-events-none absolute -right-10 top-24 h-96 w-96 rounded-full bg-gradient-to-br from-cyan-200/40 via-teal-200/20 to-transparent blur-3xl" />

      <header className="relative mx-auto flex w-full max-w-7xl flex-col gap-4 pb-10 pt-6 animate-fade-in">
        <span className="inline-flex w-fit items-center gap-2 rounded-full bg-white/90 px-4 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-slate-500 shadow-sm">
          Admin Studio
        </span>
        <h1 className="font-display text-3xl text-slate-900 md:text-5xl">
          Floor Plan Editor
        </h1>
        <p className="max-w-2xl text-base text-slate-600">
          Select a location, upload the floor map, and click to place desks. Coordinates are saved as percentages
          so the layout scales smoothly across screens.
        </p>
        {!hasToken && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-900 shadow-sm">
            You are not authenticated. Uploads and saves will return 401 until a JWT token is stored in
            localStorage under <strong>access_token</strong>.
          </div>
        )}
      </header>

      <div className="relative mx-auto grid w-full max-w-7xl gap-10 lg:grid-cols-[360px_1fr]">
        <section className="space-y-6 animate-rise-in" style={{ animationDelay: "120ms" }}>
          <div className="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-xl shadow-slate-900/10">
            <h2 className="font-display text-lg text-slate-900">Location</h2>
            <div className="mt-4 space-y-4 text-sm">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Select City
                </label>
                <select
                  className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-400 focus:outline-none"
                  value={selectedCityId ?? ""}
                  onChange={(event) => {
                    const value = event.target.value
                    setSelectedCityId(value ? Number(value) : null)
                    setSelectedBuildingId(null)
                    setSelectedFloorId(null)
                  }}
                >
                  <option value="">Choose city</option>
                  {citiesQuery.data?.map((city) => (
                    <option key={city.id} value={city.id}>
                      {city.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Select Building
                </label>
                <select
                  className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-400 focus:outline-none"
                  value={selectedBuildingId ?? ""}
                  onChange={(event) => {
                    const value = event.target.value
                    setSelectedBuildingId(value ? Number(value) : null)
                    setSelectedFloorId(null)
                  }}
                  disabled={!selectedCityId || buildingsQuery.isLoading}
                >
                  <option value="">Choose building</option>
                  {buildingsQuery.data?.map((building) => (
                    <option key={building.id} value={building.id}>
                      {building.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Select Floor
                </label>
                <select
                  className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-400 focus:outline-none"
                  value={selectedFloorId ?? ""}
                  onChange={(event) => {
                    const value = event.target.value
                    setSelectedFloorId(value ? Number(value) : null)
                  }}
                  disabled={!selectedBuildingId || floorsQuery.isLoading}
                >
                  <option value="">Choose floor</option>
                  {floorsQuery.data?.map((floor) => (
                    <option key={floor.id} value={floor.id}>
                      Floor {floor.floor_number}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-xl shadow-slate-900/10">
            <h2 className="font-display text-lg text-slate-900">Floor Map</h2>
            <p className="mt-2 text-xs text-slate-500">
              Upload an SVG, PNG, or JPG. Existing maps are shown automatically.
            </p>

            <label className="mt-4 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-xs text-slate-500 transition hover:border-slate-400 hover:bg-slate-100">
              <span className="text-sm font-semibold text-slate-700">Drop file or click to upload</span>
              <span>Recommended: SVG for crisp scaling</span>
              <input
                type="file"
                accept="image/svg+xml,image/png,image/jpeg"
                className="hidden"
                disabled={!selectedFloorId}
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (file) {
                    handleUpload(file)
                    event.target.value = ""
                  }
                }}
              />
            </label>
            {uploadState === "uploading" && (
              <p className="mt-3 text-xs text-slate-500">Uploading map...</p>
            )}
            {uploadState === "success" && (
              <p className="mt-3 text-xs text-emerald-600">Upload complete.</p>
            )}
            {uploadError && (
              <p className="mt-3 text-xs text-rose-600">{uploadError}</p>
            )}
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-xl shadow-slate-900/10">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg text-slate-900">Desk List</h2>
              <span className="rounded-full bg-slate-900/10 px-3 py-1 text-xs font-semibold text-slate-600">
                {desks.length} desks
              </span>
            </div>
            <div className="mt-4 space-y-2 text-sm">
              {desks.length === 0 ? (
                <p className="text-xs text-slate-500">No desks yet. Click on the map to add one.</p>
              ) : (
                desks.map((desk) => (
                  <button
                    key={desk.clientId}
                    type="button"
                    onClick={() => {
                      setActiveDesk({ ...desk })
                      setModalError(null)
                    }}
                    className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-3 py-2 text-left text-xs text-slate-700 transition hover:border-slate-300"
                  >
                    <span className="font-semibold">{desk.name || "Untitled desk"}</span>
                    <span className={`text-[0.6rem] uppercase tracking-widest ${desk.is_active ? "text-emerald-600" : "text-slate-400"}`}>
                      {desk.is_active ? "active" : "inactive"}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </section>

        <section className="space-y-6 animate-rise-in" style={{ animationDelay: "200ms" }}>
          <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-xl shadow-slate-900/10">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-xl text-slate-900">Interactive Map</h2>
                <p className="text-sm text-slate-500">
                  Click the map to drop a marker. Use the modal to update details.
                </p>
              </div>
              <button
                type="button"
                onClick={handleSaveLayout}
                disabled={!selectedFloorId || saveState === "saving"}
                className="rounded-full bg-slate-900 px-5 py-2 text-xs font-semibold uppercase tracking-widest text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {saveState === "saving" ? "Saving..." : "Save changes"}
              </button>
            </div>

            {saveState === "success" && (
              <p className="text-xs text-emerald-600">Layout saved successfully.</p>
            )}
            {saveState === "error" && (
              <p className="text-xs text-rose-600">Failed to save layout. Please try again.</p>
            )}
            {isDirty && saveState === "idle" && (
              <p className="text-xs text-amber-600">Unsaved changes detected.</p>
            )}

            <div className="relative min-h-[420px] overflow-hidden rounded-3xl border border-slate-200 bg-white p-4 shadow-inner">
              {!selectedFloorId && (
                <div className="flex h-64 items-center justify-center text-center text-sm text-slate-500">
                  Select a floor to load or upload a map.
                </div>
              )}
              {selectedFloorId && !mapUrl && (
                <div className="flex h-64 items-center justify-center text-center text-sm text-slate-500">
                  Upload a floor map to start placing desks.
                </div>
              )}
              {selectedFloorId && mapUrl && (
                <div className="relative">
                  <img
                    ref={imgRef}
                    src={mapUrl}
                    alt="Floor map"
                    className="w-full select-none rounded-2xl border border-slate-100"
                  />
                  <div
                    className="absolute inset-0 cursor-crosshair"
                    role="presentation"
                    onClick={handleMapClick}
                  >
                    {desks.map((desk) => (
                      <button
                        key={desk.clientId}
                        type="button"
                        className={`group absolute flex h-6 w-6 items-center justify-center rounded-full border border-white shadow-lg transition hover:scale-110 ${desk.is_active ? "bg-emerald-500" : "bg-slate-400"}`}
                        style={{
                          left: `${desk.x_pos}%`,
                          top: `${desk.y_pos}%`,
                          transform: "translate(-50%, -50%)",
                        }}
                        onClick={(event) => {
                          event.stopPropagation()
                          setActiveDesk({ ...desk })
                          setModalError(null)
                        }}
                        title={desk.name}
                      >
                        <span className="sr-only">Edit desk</span>
                        <span className="absolute left-1/2 top-7 hidden -translate-x-1/2 whitespace-nowrap rounded-full bg-white px-2 py-1 text-[0.65rem] font-semibold text-slate-700 shadow-md group-hover:block">
                          {desk.name || "Untitled"}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-3xl border border-slate-200 bg-white/95 p-5 text-xs text-slate-600 shadow-xl shadow-slate-900/10">
              <h3 className="font-display text-base text-slate-900">Tips</h3>
              <ul className="mt-3 space-y-2">
                <li>Use SVG maps to keep labels crisp at any zoom.</li>
                <li>Keep desks spaced so markers stay clickable on mobile.</li>
                <li>Deactivate desks to hide them from booking flows.</li>
              </ul>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white/95 p-5 text-xs text-slate-600 shadow-xl shadow-slate-900/10">
              <h3 className="font-display text-base text-slate-900">Floor Context</h3>
              <div className="mt-3 space-y-1">
                <p>
                  <span className="font-semibold text-slate-700">City:</span> {selectedCity?.name ?? "-"}
                </p>
                <p>
                  <span className="font-semibold text-slate-700">Building:</span> {selectedBuilding?.name ?? "-"}
                </p>
                <p>
                  <span className="font-semibold text-slate-700">Floor:</span> {selectedFloor?.floor_number ?? "-"}
                </p>
                <p>
                  <span className="font-semibold text-slate-700">Map:</span> {selectedFloor?.svg_map_url ? "Uploaded" : "Missing"}
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>

      {activeDesk && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 px-4">
          <div className="w-full max-w-md rounded-3xl border border-white/60 bg-white/90 p-6 shadow-2xl">
            <h3 className="font-display text-xl text-slate-900">Desk details</h3>
            <p className="mt-1 text-xs text-slate-500">Update the label and status for this desk marker.</p>

            <div className="mt-4 space-y-4 text-sm">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Desk name
                </label>
                <input
                  value={activeDesk.name}
                  onChange={(event) =>
                    setActiveDesk({
                      ...activeDesk,
                      name: event.target.value,
                    })
                  }
                  className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                  placeholder="e.g. Window A12"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Description
                </label>
                <textarea
                  value={activeDesk.description ?? ""}
                  onChange={(event) =>
                    setActiveDesk({
                      ...activeDesk,
                      description: event.target.value,
                    })
                  }
                  className="h-24 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                  placeholder="Optional notes"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Wyposazenie
                </label>
                <div className="space-y-2">
                  {featuresQuery.isLoading && (
                    <p className="text-xs text-slate-500">Ladowanie wyposazenia...</p>
                  )}
                  {!featuresQuery.isLoading && featuresQuery.data?.length === 0 && (
                    <p className="text-xs text-slate-500">Brak zdefiniowanego wyposazenia.</p>
                  )}
                  {!featuresQuery.isLoading && featuresQuery.data?.length ? (
                    featuresQuery.data.map((feature) => {
                      const selected = activeDesk.features?.find(
                        (item) => item.feature_id === feature.id,
                      )
                      return (
                        <div key={feature.id} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={Boolean(selected)}
                            onChange={() => updateFeatureSelection(feature.id)}
                            className="h-4 w-4 rounded border-slate-300 text-slate-900"
                          />
                          <div className="flex w-full items-center gap-2">
                            <span className="text-xs font-semibold text-slate-700">{feature.name}</span>
                            <input
                              type="text"
                              placeholder="Wartosc"
                              value={selected?.value ?? ""}
                              onChange={(event) => updateFeatureValue(feature.id, event.target.value)}
                              disabled={!selected}
                              className="w-full rounded-xl border border-slate-200 px-2 py-1 text-xs focus:border-slate-400 focus:outline-none disabled:bg-slate-100"
                            />
                          </div>
                        </div>
                      )
                    })
                  ) : null}
                </div>
              </div>

              <label className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-xs font-semibold text-slate-600">
                Active desk
                <input
                  type="checkbox"
                  checked={activeDesk.is_active}
                  onChange={(event) =>
                    setActiveDesk({
                      ...activeDesk,
                      is_active: event.target.checked,
                    })
                  }
                  className="h-4 w-4 rounded border-slate-300 text-slate-900"
                />
              </label>

              {modalError && <p className="text-xs text-rose-600">{modalError}</p>}
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setActiveDesk(null)}
                className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600"
              >
                Cancel
              </button>
              <div className="flex items-center gap-2">
                {activeDesk.id && (
                  <button
                    type="button"
                    onClick={handleDeskDelete}
                    className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-600"
                  >
                    Delete
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleDeskSave}
                  className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-white"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
