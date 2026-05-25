import { useEffect, useMemo, useState } from "react"
import {
  API_BASE_URL,
  type Building,
  type City,
  type Desk,
  type DeskDetails,
  type Feature,
  type Floor,
  createReservation,
  getBuildings,
  getCities,
  getDeskDetails,
  getDesks,
  getFeatures,
  getFloors,
} from "../api/client"

type ViewMode = "list" | "map"

export function FloorAvailabilityPage() {
  const [cities, setCities] = useState<City[]>([])
  const [buildings, setBuildings] = useState<Building[]>([])
  const [floors, setFloors] = useState<Floor[]>([])
  const [desks, setDesks] = useState<Desk[]>([])
  const [features, setFeatures] = useState<Feature[]>([])

  const [selectedCity, setSelectedCity] = useState<number | null>(null)
  const [selectedBuilding, setSelectedBuilding] = useState<number | null>(null)
  const [selectedFloor, setSelectedFloor] = useState<number | null>(null)
  const [selectedFeature, setSelectedFeature] = useState<number | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>("list")
  const [selectedDeskId, setSelectedDeskId] = useState<number | null>(null)
  const [selectedDesk, setSelectedDesk] = useState<DeskDetails | null>(null)
  const [deskNotice, setDeskNotice] = useState<string | null>(null)
  const [deskError, setDeskError] = useState<string | null>(null)
  const [reservationState, setReservationState] = useState<"idle" | "saving" | "success" | "error">("idle")
  const [reservationError, setReservationError] = useState<string | null>(null)
  const [isDeskLoading, setIsDeskLoading] = useState(false)
  const today = useMemo(() => new Date().toISOString().split("T")[0], [])
  const [selectedDate, setSelectedDate] = useState(today)
  const [reservationDate, setReservationDate] = useState(today)

  const [isLoading, setIsLoading] = useState({
    cities: true,
    buildings: false,
    floors: false,
    desks: false,
    features: true,
  })

  const selectedFloorData = useMemo(
    () => floors.find((floor) => floor.id === selectedFloor) ?? null,
    [floors, selectedFloor],
  )

  const mapUrl = useMemo(() => {
    if (!selectedFloorData?.svg_map_url) {
      return null
    }
    if (selectedFloorData.svg_map_url.startsWith("http")) {
      return selectedFloorData.svg_map_url
    }
    return `${API_BASE_URL}${selectedFloorData.svg_map_url}`
  }, [selectedFloorData])

  const reservationDisabled =
    !selectedDesk || !reservationDate || reservationState === "saving" || !selectedDesk.is_active

  // Fetch cities
  useEffect(() => {
    setIsLoading((prev) => ({ ...prev, cities: true }))
    getCities()
      .then(setCities)
      .catch((error) => console.error("Failed to fetch cities", error))
      .finally(() => setIsLoading((prev) => ({ ...prev, cities: false })))
  }, [])

  useEffect(() => {
    setIsLoading((prev) => ({ ...prev, features: true }))
    getFeatures()
      .then(setFeatures)
      .catch((error) => console.error("Failed to fetch features", error))
      .finally(() => setIsLoading((prev) => ({ ...prev, features: false })))
  }, [])

  // Fetch buildings
  useEffect(() => {
    setBuildings([])
    setFloors([])
    setDesks([])
    setSelectedBuilding(null)
    setSelectedFloor(null)
    setSelectedFeature(null)
    if (selectedCity) {
      setIsLoading((prev) => ({ ...prev, buildings: true }))
      getBuildings(selectedCity)
        .then(setBuildings)
        .catch((error) => console.error("Failed to fetch buildings", error))
        .finally(() => setIsLoading((prev) => ({ ...prev, buildings: false })))
    }
  }, [selectedCity])

  // Fetch floors
  useEffect(() => {
    setFloors([])
    setDesks([])
    setSelectedFloor(null)
    setSelectedFeature(null)
    if (selectedBuilding) {
      setIsLoading((prev) => ({ ...prev, floors: true }))
      getFloors(selectedBuilding)
        .then(setFloors)
        .catch((error) => console.error("Failed to fetch floors", error))
        .finally(() => setIsLoading((prev) => ({ ...prev, floors: false })))
    }
  }, [selectedBuilding])

  // Fetch desks
  useEffect(() => {
    setDesks([])
    if (selectedFloor && selectedDate) {
      setIsLoading((prev) => ({ ...prev, desks: true }))
      getDesks(selectedFloor, selectedFeature)
        .then(setDesks)
        .catch((error) => console.error("Failed to fetch desks", error))
        .finally(() => setIsLoading((prev) => ({ ...prev, desks: false })))
    }
  }, [selectedFloor, selectedFeature, selectedDate])

  useEffect(() => {
    setSelectedDeskId(null)
    setSelectedDesk(null)
    setDeskNotice(null)
    setDeskError(null)
    setReservationState("idle")
    setReservationError(null)
  }, [selectedFloor, selectedFeature, viewMode, selectedDate])

  useEffect(() => {
    setReservationDate(selectedDate)
  }, [selectedDate])

  useEffect(() => {
    if (!selectedDeskId) {
      setSelectedDesk(null)
      return
    }

    setIsDeskLoading(true)
    setDeskError(null)
    getDeskDetails(selectedDeskId)
      .then((desk) => {
        setSelectedDesk(desk)
        setDeskNotice(`Wybrane biurko: ${desk.name}`)
        setReservationState("idle")
      })
      .catch((error) => {
        console.error("Failed to fetch desk details", error)
        setDeskError("Nie udało się pobrać danych biurka.")
      })
      .finally(() => setIsDeskLoading(false))
  }, [selectedDeskId])

  useEffect(() => {
    if (selectedDeskId && !desks.find((desk) => desk.id === selectedDeskId)) {
      setSelectedDeskId(null)
      setSelectedDesk(null)
    }
  }, [desks, selectedDeskId])

  const formatEquipment = (desk: Desk) => {
    const names = desk.features?.map((item) => item.feature.name) ?? []
    if (names.length === 0) {
      return "Brak"
    }
    return names.slice(0, 3).join(", ") + (names.length > 3 ? "..." : "")
  }

  const handleReservation = async () => {
    if (!selectedDesk || !reservationDate) {
      return
    }

    setReservationState("saving")
    setReservationError(null)
    try {
      await createReservation(selectedDesk.id, reservationDate)
      setReservationState("success")
      setDeskNotice(`Zarezerwowano biurko: ${selectedDesk.name}`)
    } catch (error) {
      console.error("Reservation failed", error)
      setReservationState("error")
      setReservationError("Nie udało się utworzyć rezerwacji.")
    }
  }

  return (
    <main className="app-shell">
      <section className="page">
        <header className="hero-card">
          <div className="hero-copy">
            <h1 className="title">Rezerwacja biurek</h1>
            <p className="lede">
              Wybierz miasto, budynek i piętro, a następnie zdecyduj czy chcesz zobaczyć listę
              biurek czy interaktywną mapę.
            </p>
          </div>
        </header>

        <section className="panel">
          <div className="panel-header">
            <h2>Wybór lokalizacji</h2>
            <span className="panel-subtitle">{cities.length} miast</span>
          </div>
          <div className="filter-grid">
            <div className="field">
              <label>Miasto</label>
              <select
                value={selectedCity ?? ""}
                onChange={(event) => setSelectedCity(event.target.value ? Number(event.target.value) : null)}
              >
                <option value="">Wybierz miasto</option>
                {cities.map((city) => (
                  <option key={city.id} value={city.id}>
                    {city.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label>Budynek</label>
              <select
                value={selectedBuilding ?? ""}
                onChange={(event) => setSelectedBuilding(event.target.value ? Number(event.target.value) : null)}
                disabled={!selectedCity || isLoading.buildings}
              >
                <option value="">Wybierz budynek</option>
                {buildings.map((building) => (
                  <option key={building.id} value={building.id}>
                    {building.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label>Piętro</label>
              <select
                value={selectedFloor ?? ""}
                onChange={(event) => setSelectedFloor(event.target.value ? Number(event.target.value) : null)}
                disabled={!selectedBuilding || isLoading.floors}
              >
                <option value="">Wybierz piętro</option>
                {floors.map((floor) => (
                  <option key={floor.id} value={floor.id}>
                    Piętro {floor.floor_number}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label>Data</label>
              <input
                type="date"
                value={selectedDate}
                min={today}
                onChange={(event) => setSelectedDate(event.target.value)}
              />
            </div>

            <div className="field">
              <label>Widok</label>
              <select
                value={viewMode}
                onChange={(event) => setViewMode(event.target.value as ViewMode)}
              >
                <option value="list">Lista biurek</option>
                <option value="map">Mapa interaktywna</option>
              </select>
            </div>

            <div className="field">
              <label>Wyposażenie</label>
              <select
                value={selectedFeature ?? ""}
                onChange={(event) =>
                  setSelectedFeature(event.target.value ? Number(event.target.value) : null)
                }
                disabled={isLoading.features}
              >
                <option value="">Wszystkie</option>
                {features.map((feature) => (
                  <option key={feature.id} value={feature.id}>
                    {feature.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {selectedFloor && selectedDate && viewMode === "list" && (
          <section className="panel">
            <div className="panel-header">
              <h3>Biurka na piętrze</h3>
              <span className="panel-subtitle">{desks.length} wyników</span>
            </div>
            {isLoading.desks ? (
              <p>Ładowanie biurek...</p>
            ) : (
              <div className="results-grid">
                {desks.length > 0 ? (
                  desks.map((desk) => (
                    <article className="desk-card" key={desk.id}>
                      <div className="desk-card__header">
                        <p className="desk-label">{desk.name}</p>
                        <span
                          className={`status-pill ${desk.is_active ? "status-pill--available" : "status-pill--occupied"}`}
                        >
                          {desk.is_active ? "Dostępne" : "Niedostępne"}
                        </span>
                      </div>
                      <p className="desk-meta">
                        {desk.description ? desk.description : "Brak opisu biurka."}
                      </p>
                      <p className="desk-meta">Wyposażenie: {formatEquipment(desk)}</p>
                    </article>
                  ))
                ) : (
                  <div className="state-card state-card--empty">
                    <strong>Brak biurek spełniających kryteria.</strong>
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {selectedFloor && selectedDate && viewMode === "map" && (
          <section className="panel">
            <div className="panel-header">
              <h3>Mapa piętra</h3>
              <span className="panel-subtitle">{desks.length} markerów</span>
            </div>
            <div className="map-layout">
              <div>
                {mapUrl ? (
                  <div className="map-shell">
                    <img src={mapUrl} alt="Mapa piętra" className="map-image" />
                    <div className="map-overlay" role="presentation">
                      {desks
                        .filter((desk) => desk.x_pos !== null && desk.y_pos !== null)
                        .map((desk) => (
                          <button
                            key={desk.id}
                            type="button"
                            className={`map-marker ${desk.is_active ? "map-marker--active" : "map-marker--inactive"} ${
                              selectedDeskId === desk.id ? "map-marker--selected" : ""
                            }`}
                            style={{ left: `${desk.x_pos}%`, top: `${desk.y_pos}%` }}
                            title={desk.name}
                            onClick={() => setSelectedDeskId(desk.id)}
                          >
                            <span className="sr-only">{desk.name}</span>
                          </button>
                        ))}
                    </div>
                  </div>
                ) : (
                  <div className="state-card state-card--empty">
                    <strong>Brak mapy dla tego piętra.</strong>
                  </div>
                )}
              </div>

              <aside className="desk-details">
                <div className="desk-details__header">
                  <h4>Wybrane biurko</h4>
                  {selectedDesk && (
                    <span
                      className={`status-pill ${selectedDesk.is_active ? "status-pill--available" : "status-pill--occupied"}`}
                    >
                      {selectedDesk.is_active ? "Dostępne" : "Niedostępne"}
                    </span>
                  )}
                </div>

                {deskNotice && <div className="notice notice--info">{deskNotice}</div>}
                {reservationState === "success" && (
                  <div className="notice notice--success">Rezerwacja została zapisana.</div>
                )}
                {deskError && <div className="notice notice--error">{deskError}</div>}
                {reservationState === "error" && reservationError && (
                  <div className="notice notice--error">{reservationError}</div>
                )}

                {isDeskLoading && <p className="desk-muted">Ładowanie danych biurka...</p>}

                {!isDeskLoading && !selectedDesk && (
                  <p className="desk-muted">Wybierz biurko z mapy, aby zobaczyć szczegóły i zarezerwować.</p>
                )}

                {!isDeskLoading && selectedDesk && (
                  <div className="desk-details__content">
                    <p className="desk-name">{selectedDesk.name}</p>
                    <p className="desk-description">
                      {selectedDesk.description || "Brak opisu biurka."}
                    </p>

                    <div className="desk-section">
                      <h5>Wyposażenie</h5>
                      {selectedDesk.features.length > 0 ? (
                        <ul className="equipment-list">
                          {selectedDesk.features.map((item, index) => (
                            <li key={`${item.feature.id}-${index}`} className="equipment-item">
                              <span className="equipment-name">{item.feature.name}</span>
                              <span className="equipment-value">{item.value || "-"}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="desk-muted">Brak wyposażenia dla tego biurka.</p>
                      )}
                    </div>

                    <div className="desk-section">
                      <h5>Rezerwacja</h5>
                      <div className="reservation-form">
                        <label htmlFor="reservation-date">Wybierz dzień</label>
                        <input
                          id="reservation-date"
                          type="date"
                          value={reservationDate}
                          min={today}
                          onChange={(event) => setReservationDate(event.target.value)}
                        />
                        <button
                          type="button"
                          onClick={handleReservation}
                          disabled={reservationDisabled}
                        >
                          {reservationState === "saving" ? "Rezerwuję..." : "Zarezerwuj"}
                        </button>
                      </div>
                      {!selectedDesk.is_active && (
                        <p className="desk-muted">To biurko jest niedostępne do rezerwacji.</p>
                      )}
                    </div>
                  </div>
                )}
              </aside>
            </div>
          </section>
        )}

        {selectedFloor && !selectedDate && (
          <section className="panel">
            <div className="state-card state-card--empty">
              <strong>Wybierz datę, aby zobaczyć dostępne biurka.</strong>
            </div>
          </section>
        )}
      </section>
    </main>
  )
}