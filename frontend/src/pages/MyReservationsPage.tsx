import { useEffect, useState } from "react"
import { deleteReservation, getMyReservations, type Reservation } from "../api/client"

export function MyReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  useEffect(() => {
    setIsLoading(true)
    getMyReservations()
      .then(setReservations)
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
      setDeleteError("Nie udalo sie usunac rezerwacji.")
    } finally {
      setDeletingId(null)
    }
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
                reservations.map((reservation) => (
                  <article className="desk-card reservation-card" key={reservation.id}>
                    <div className="desk-card__header">
                      <p className="desk-label">Biurko #{reservation.desk_id}</p>
                      <span className="status-pill status-pill--available">{reservation.status}</span>
                    </div>
                    <p className="desk-meta">Data: {reservation.reservation_date}</p>
                    <p className="desk-meta">Utworzono: {new Date(reservation.created_at).toLocaleString()}</p>
                    <button
                      type="button"
                      className="reservation-delete"
                      onClick={() => handleDelete(reservation.id)}
                      disabled={deletingId === reservation.id}
                    >
                      {deletingId === reservation.id ? "Usuwanie..." : "Usun rezerwacje"}
                    </button>
                  </article>
                ))
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
