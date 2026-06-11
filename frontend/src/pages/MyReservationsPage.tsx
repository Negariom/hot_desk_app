import { useEffect, useState } from "react"
import {
  deleteReservation,
  getDeskFullDetails,
  getMyReservations,
  type DeskFullInfo,
  type Reservation,
} from "../api/client"

export function MyReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [deskDetailsMap, setDeskDetailsMap] = useState<Record<number, DeskFullInfo>>({})

  useEffect(() => {
    setIsLoading(true)
    getMyReservations()
      .then(async (data) => {
        setReservations(data)
        const uniqueDeskIds = [...new Set(data.map((r) => r.desk_id))]
        const results = await Promise.allSettled(
          uniqueDeskIds.map((id) => getDeskFullDetails(id)),
        )
        const map: Record<number, DeskFullInfo> = {}
        results.forEach((result, index) => {
          if (result.status === "fulfilled") {
            map[uniqueDeskIds[index]] = result.value
          }
        })
        setDeskDetailsMap(map)
      })
      .catch((err) => {
        console.error("Failed to fetch reservations", err)
        setError("Nie udało się pobrać rezerwacji.")
      })
      .finally(() => setIsLoading(false))
  }, [])

  const handleDelete = async (reservationId: number) => {
    setDeletingId(reservationId)
    setDeleteError(null)
    try {
      await deleteReservation(reservationId)
      setReservations((prev) => prev.filter((item) => item.id !== reservationId))
    } catch (err) {
      console.error("Failed to delete reservation", err)
      setDeleteError("Nie udało się usunąć rezerwacji.")
    } finally {
      setDeletingId(null)
    }
  }

  const toggleExpand = (reservationId: number) => {
    setExpandedId((prev) => (prev === reservationId ? null : reservationId))
  }

  return (
    <main className="app-shell">
      <section className="page">
        <header className="hero-card">
          <div className="hero-copy">
            <h1 className="title">Moje rezerwacje</h1>
            <p className="lede">Zobacz wszystkie rezerwacje przypisane do Twojego konta.</p>
          </div>
        </header>

        <section className="panel">
          <div className="panel-header">
            <h2>Lista rezerwacji</h2>
            <span className="panel-subtitle">{reservations.length} wpisów</span>
          </div>

          {isLoading && <p>Ładowanie rezerwacji...</p>}
          {error && <div className="notice notice--error">{error}</div>}
          {deleteError && <div className="notice notice--error">{deleteError}</div>}

          {!isLoading && !error && (
            <div className="results-grid">
              {reservations.length > 0 ? (
                reservations.map((reservation) => {
                  const details = deskDetailsMap[reservation.desk_id]
                  const isExpanded = expandedId === reservation.id
                  return (
                    <article className="desk-card reservation-card" key={reservation.id}>
                      <div className="desk-card__header">
                        <p className="desk-label">
                          {details?.name ?? `Biurko #${reservation.desk_id}`}
                        </p>
                        <span className="status-pill status-pill--available">
                          {reservation.status}
                        </span>
                      </div>
                      <p className="desk-meta">Data: {reservation.reservation_date}</p>
                      <p className="desk-meta">
                        Utworzono: {new Date(reservation.created_at).toLocaleString()}
                      </p>

                      <button
                        type="button"
                        className="reservation-expand"
                        onClick={() => toggleExpand(reservation.id)}
                      >
                        {isExpanded ? "Ukryj szczegóły ▲" : "Pokaż szczegóły ▼"}
                      </button>

                      {isExpanded && details && (
                        <div className="reservation-details">
                          <div className="reservation-details__section">
                            <h5>Lokalizacja</h5>
                            <p className="desk-meta">
                              <span className="desk-meta__label">Miasto:</span> {details.city_name}
                            </p>
                            <p className="desk-meta">
                              <span className="desk-meta__label">Budynek:</span>{" "}
                              {details.building_name} ({details.building_address})
                            </p>
                            <p className="desk-meta">
                              <span className="desk-meta__label">Piętro:</span>{" "}
                              {details.floor_number}
                            </p>
                          </div>
                          {details.description && (
                            <div className="reservation-details__section">
                              <h5>Opis biurka</h5>
                              <p className="desk-meta">{details.description}</p>
                            </div>
                          )}
                          <div className="reservation-details__section">
                            <h5>Wyposażenie</h5>
                            {details.features.length > 0 ? (
                              <ul className="equipment-list">
                                {details.features.map((f, i) => (
                                  <li key={i} className="equipment-item">
                                    <span className="equipment-name">{f.name}</span>
                                    <span className="equipment-value">{f.value || "—"}</span>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="desk-muted">Brak wyposażenia.</p>
                            )}
                          </div>
                        </div>
                      )}

                      {isExpanded && !details && (
                        <div className="reservation-details">
                          <p className="desk-muted">Ładowanie szczegółów...</p>
                        </div>
                      )}

                      <button
                        type="button"
                        className="reservation-delete"
                        onClick={() => handleDelete(reservation.id)}
                        disabled={deletingId === reservation.id}
                      >
                        {deletingId === reservation.id ? "Usuwanie..." : "Usuń rezerwację"}
                      </button>
                    </article>
                  )
                })
              ) : (
                <div className="state-card state-card--empty">
                  <strong>Brak rezerwacji.</strong>
                </div>
              )}
            </div>
          )}
        </section>
      </section>
    </main>
  )
}
