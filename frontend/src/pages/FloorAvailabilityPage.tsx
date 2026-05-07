import { type FormEvent, useState } from 'react'

import { useFloorDesks } from '../hooks/useFloorDesks'

function getStatusClass(status: string) {
  switch (status.toLowerCase()) {
    case 'available':
      return 'status-pill--available'
    case 'occupied':
      return 'status-pill--occupied'
    case 'maintenance':
      return 'status-pill--maintenance'
    default:
      return 'status-pill--default'
  }
}

export function FloorAvailabilityPage() {
  const [draftFloorId, setDraftFloorId] = useState('1')
  const [floorId, setFloorId] = useState(1)

  const desksQuery = useFloorDesks(floorId)
  const desks = desksQuery.data ?? []

  const totalDesks = desks.length
  const availableDesks = desks.filter((desk) => desk.status.toLowerCase() === 'available').length
  const occupiedDesks = desks.filter((desk) => desk.status.toLowerCase() === 'occupied').length
  const maintenanceDesks = desks.filter((desk) => desk.status.toLowerCase() === 'maintenance').length

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const parsedFloorId = Number.parseInt(draftFloorId, 10)

    if (!Number.isFinite(parsedFloorId) || parsedFloorId < 1) {
      setDraftFloorId(String(Math.max(1, floorId)))
      return
    }

    if (parsedFloorId === floorId) {
      void desksQuery.refetch()
      return
    }

    setFloorId(parsedFloorId)
  }

  const isRefreshing = desksQuery.isFetching && !desksQuery.isPending

  return (
    <main className="app-shell">
      <section className="page">
        <header className="hero-card">
          <div className="hero-copy">
            <p className="eyebrow">Hot desk reservation</p>
            <h1 className="title">Biurka na piętrze {floorId}</h1>
            <p className="lede">
              Widok startowy oparty na React Query. Zmień numer piętra, aby pobrać aktualną listę
              biurek z backendu FastAPI.
            </p>
          </div>

          <div className="hero-metrics" aria-label="Podsumowanie piętra">
            <article className="metric">
              <span className="metric__label">Łącznie</span>
              <strong className="metric__value">{totalDesks}</strong>
              <span className="metric__hint">wszystkie biurka w odpowiedzi API</span>
            </article>
            <article className="metric">
              <span className="metric__label">Dostępne</span>
              <strong className="metric__value">{availableDesks}</strong>
              <span className="metric__hint">status `available`</span>
            </article>
            <article className="metric">
              <span className="metric__label">Serwis</span>
              <strong className="metric__value">{maintenanceDesks}</strong>
              <span className="metric__hint">status `maintenance`</span>
            </article>
          </div>
        </header>

        <section className="panel">
          <form className="search-form" onSubmit={handleSubmit}>
            <label className="field">
              <span className="field__label">Numer piętra</span>
              <input
                className="field__input"
                min={1}
                step={1}
                type="number"
                value={draftFloorId}
                onChange={(event) => setDraftFloorId(event.target.value)}
                placeholder="np. 3"
              />
            </label>

            <button className="button" type="submit" disabled={desksQuery.isPending}>
              {isRefreshing ? 'Odświeżanie...' : 'Pobierz biurka'}
            </button>
          </form>

          <div className="summary-grid">
            <article className="summary-card">
              <span className="summary-card__label">Aktualne piętro</span>
              <strong className="summary-card__value">{floorId}</strong>
              <span className="summary-card__meta">To zapytanie używa klucza React Query dla tego piętra.</span>
            </article>
            <article className="summary-card">
              <span className="summary-card__label">Zajęte</span>
              <strong className="summary-card__value">{occupiedDesks}</strong>
              <span className="summary-card__meta">Biurka oznaczone jako `occupied`.</span>
            </article>
            <article className="summary-card">
              <span className="summary-card__label">Status zapytania</span>
              <strong className="summary-card__value">
                {desksQuery.isPending ? 'Ładowanie' : isRefreshing ? 'Odświeżanie' : 'Gotowe'}
              </strong>
              <span className="summary-card__meta">Dane są pobierane przez axios z lokalnego backendu.</span>
            </article>
          </div>

          {desksQuery.isError ? (
            <div className="state-card state-card--error">
              <strong>Nie udało się pobrać listy biurek.</strong>
              <p>{desksQuery.error instanceof Error ? desksQuery.error.message : 'Spróbuj ponownie.'}</p>
            </div>
          ) : desksQuery.isPending ? (
            <div className="state-card">
              <strong>Ładowanie danych...</strong>
              <p>Pobieram biurka dla piętra {floorId}.</p>
            </div>
          ) : desks.length === 0 ? (
            <div className="state-card state-card--empty">
              <strong>Brak biurek dla tego piętra.</strong>
              <p>Backend zwrócił pustą listę.</p>
            </div>
          ) : (
            <div className="results-grid">
              {desks.map((desk) => (
                <article className="desk-card" key={desk.id}>
                  <div className="desk-card__header">
                    <div>
                      <p className="desk-label">{desk.label}</p>
                      <p className="desk-subtitle">Biurko ID {desk.id}</p>
                    </div>
                    <span className={`status-pill ${getStatusClass(desk.status)}`}>{desk.status}</span>
                  </div>

                  <dl className="desk-specs">
                    <div className="spec">
                      <dt>Wyposażenie</dt>
                      <dd>{desk.equipment ?? 'Brak danych'}</dd>
                    </div>
                    <div className="spec">
                      <dt>Współrzędne</dt>
                      <dd>
                        {desk.x_coordinate ?? '—'}, {desk.y_coordinate ?? '—'}
                      </dd>
                    </div>
                    <div className="spec">
                      <dt>Piętro</dt>
                      <dd>{desk.floor_id}</dd>
                    </div>
                  </dl>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  )
}