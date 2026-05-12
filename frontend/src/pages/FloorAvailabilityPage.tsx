import { useState, useEffect } from 'react';
import { apiClient } from '../api/client';

// Interfaces
interface City { id: number; name: string; }
interface Building { id: number; name: string; city_id: number; }
interface Floor { id: number; floor_number: number; building_id: number; }
interface Feature { id: number; name: string; category?: string; }
interface DeskFeature { value?: string; feature: Feature; }
interface Desk { id: number; name: string; floor_id: number; is_active: boolean; features: DeskFeature[]; }

export function FloorAvailabilityPage() {
  const [cities, setCities] = useState<City[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [floors, setFloors] = useState<Floor[]>([]);
  const [desks, setDesks] = useState<Desk[]>([]);

  const [selectedCity, setSelectedCity] = useState<number | null>(null);
  const [selectedBuilding, setSelectedBuilding] = useState<number | null>(null);
  const [selectedFloor, setSelectedFloor] = useState<number | null>(null);
  const [expandedDeskId, setExpandedDeskId] = useState<number | null>(null);
  const [myReservations, setMyReservations] = useState<any[]>([]);
  const [expandedReservationDeskId, setExpandedReservationDeskId] = useState<number | null>(null);

  const [isLoading, setIsLoading] = useState({
    cities: true,
    buildings: false,
    floors: false,
    desks: false,
  });

  // Fetch cities
  useEffect(() => {
    setIsLoading(prev => ({ ...prev, cities: true }));
    apiClient.get('/cities')
      .then(response => setCities(response.data))
      .catch(error => console.error("Failed to fetch cities", error))
      .finally(() => setIsLoading(prev => ({ ...prev, cities: false })));
  }, []);

  // Fetch buildings
  useEffect(() => {
    // Reset child states
    setBuildings([]);
    setFloors([]);
    setDesks([]);
    if (selectedCity) {
      setIsLoading(prev => ({ ...prev, buildings: true }));
      apiClient.get(`/buildings/?city_id=${selectedCity}`)
        .then(response => setBuildings(response.data))
        .catch(error => console.error("Failed to fetch buildings", error))
        .finally(() => setIsLoading(prev => ({ ...prev, buildings: false })));
    }
  }, [selectedCity]);

  // Fetch floors
  useEffect(() => {
    // Reset child states
    setFloors([]);
    setDesks([]);
    if (selectedBuilding) {
      setIsLoading(prev => ({ ...prev, floors: true }));
      apiClient.get(`/floors/?building_id=${selectedBuilding}`)
        .then(response => setFloors(response.data))
        .catch(error => console.error("Failed to fetch floors", error))
        .finally(() => setIsLoading(prev => ({ ...prev, floors: false })));
    }
  }, [selectedBuilding]);

  // Fetch desks
  useEffect(() => {
    // Reset child state
    setDesks([]);
    if (selectedFloor) {
      setIsLoading(prev => ({ ...prev, desks: true }));
      apiClient.get(`/desks/?floor_id=${selectedFloor}`)
        .then(response => setDesks(response.data))
        .catch(error => console.error("Failed to fetch desks", error))
        .finally(() => setIsLoading(prev => ({ ...prev, desks: false })));
    }
  }, [selectedFloor]);

  const handleReserve = async (e: React.MouseEvent, desk: Desk) => {
    e.stopPropagation(); // Blokuje zdarzenie kliknięcia żeby panel wyposażenia się nie rozwijał
    try {
      // Korzystamy z globalnego klienta API z projektu
      const response = await apiClient.post(`/desks/${desk.id}/reserve`);
      const updatedDesk = response.data;
      
      // Aktualizuje główne widoki
      setDesks(desks.map(d => d.id === updatedDesk.id ? updatedDesk : d));
      // Dodaje biurko do panelu użytkownika
      setMyReservations([...myReservations, updatedDesk]);
    } catch (error) {
      console.error("Błąd podczas rezerwacji:", error);
      alert("Nie udało się zarezerwować biurka - być może jest już zajęte lub wystąpił błąd serwera.");
    }
  };

  const handleCancel = async (e: React.MouseEvent, desk: Desk) => {
    e.stopPropagation();
    try {
      const response = await apiClient.post(`/desks/${desk.id}/cancel`);
      const updatedDesk = response.data;
      
      // Aktualizuje główne widoki (przywraca biurko), jeśli to samo piętro jest otwarte
      setDesks(desks.map(d => d.id === updatedDesk.id ? updatedDesk : d));
      // Usuwa biurko z panelu użytkownika
      setMyReservations(myReservations.filter(d => d.id !== desk.id));
    } catch (error) {
      console.error("Błąd podczas anulowania rezerwacji:", error);
      alert("Nie udało się anulować rezerwacji lub wystąpił błąd serwera.");
    }
  };

  return (
    <main className="app-shell">
      <section className="page">
        <header className="hero-card">
          <div className="hero-copy">
            <h1 className="title">Rezerwacja biurek</h1>
            <p className="lede">Wybierz miasto, budynek i piętro, aby zobaczyć dostępne biurka.</p>
          </div>
        </header>

        <div className="selection-container">
          {/* City Selection */}
          <div className="selection-step">
            <h2>1. Wybierz miasto</h2>
            {isLoading.cities ? <p>Ładowanie...</p> : (
              <ul className="item-list">
                {cities.map((city) => (
                  <li key={city.id} className={`item-card ${selectedCity === city.id ? 'selected' : ''}`}
                    onClick={() => {
                      setSelectedCity(city.id);
                      setSelectedBuilding(null);
                      setSelectedFloor(null);
                      setExpandedDeskId(null);
                    }}>
                    {city.name}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Building Selection */}
          {selectedCity && (
            <div className="selection-step">
              <h2>2. Wybierz budynek</h2>
              {isLoading.buildings ? <p>Ładowanie...</p> : (
                <ul className="item-list">
                  {buildings.map((building) => (
                    <li key={building.id} className={`item-card ${selectedBuilding === building.id ? 'selected' : ''}`}
                      onClick={() => {
                        setSelectedBuilding(building.id);
                        setSelectedFloor(null);
                        setExpandedDeskId(null);
                      }}>
                      {building.name}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Floor Selection */}
          {selectedBuilding && (
            <div className="selection-step">
              <h2>3. Wybierz piętro</h2>
              {isLoading.floors ? <p>Ładowanie...</p> : (
                <ul className="item-list">
                  {floors.map((floor) => (
                    <li key={floor.id} className={`item-card ${selectedFloor === floor.id ? 'selected' : ''}`}
                      onClick={() => {
                        setSelectedFloor(floor.id);
                        setExpandedDeskId(null);
                      }}>
                      Piętro {floor.floor_number}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* Desk List */}
        {selectedFloor && (
          <section className="panel">
            <h3>Biurka na piętrze</h3>
            {isLoading.desks ? <p>Ładowanie biurek...</p> : (
              <div className="results-list">
                {desks.length > 0 ? (
                  <ul className="item-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: 0, margin: 0 }}>
                    {desks.map((desk) => (
                      <li className="item-card" key={desk.id} 
                          style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', cursor: 'pointer' }}
                          onClick={() => setExpandedDeskId(expandedDeskId === desk.id ? null : desk.id)}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span className="desk-label" style={{ fontWeight: 600 }}>{desk.name}</span>
                          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                            <span className={`status-pill ${desk.is_active ? 'status-pill--available' : 'status-pill--occupied'}`}>
                              {desk.is_active ? 'Dostępne' : 'Zajęte'}
                            </span>
                            {desk.is_active && (
                              <button 
                                onClick={(e) => handleReserve(e, desk)}
                                style={{ padding: '0.25rem 0.75rem', cursor: 'pointer', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', fontSize: '0.85rem' }}
                              >
                                Rezerwuj
                              </button>
                            )}
                          </div>
                        </div>
                        {expandedDeskId === desk.id && (
                          <div className="desk-features" style={{ marginTop: '0.5rem', padding: '0.75rem', backgroundColor: 'rgba(0,0,0,0.03)', borderRadius: '4px', fontSize: '0.9rem' }}>
                            <strong style={{ display: 'block', marginBottom: '0.5rem' }}>Wyposażenie:</strong>
                            {desk.features && desk.features.length > 0 ? (
                              <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
                                {desk.features.map((df, idx) => (
                                  <li key={idx}>{df.feature.name} {df.value ? `- ${df.value}` : ''}</li>
                                ))}
                              </ul>
                            ) : (
                              <p style={{ margin: 0 }}>Brak przypisanego wyposażenia.</p>
                            )}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="state-card state-card--empty">
                    <strong>Brak biurek na tym piętrze.</strong>
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {/* Panel Moje Rezerwacje */}
        <section className="panel" style={{ marginTop: '2rem' }}>
          <h3>Moje rezerwacje</h3>
          {myReservations.length > 0 ? (
            <ul className="item-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: 0, margin: 0 }}>
              {myReservations.map((res) => (
                <li key={res.id} className="item-card" 
                    style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', cursor: 'pointer', backgroundColor: '#f8f9fa' }}
                    onClick={() => setExpandedReservationDeskId(expandedReservationDeskId === res.id ? null : res.id)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong className="desk-label">{res.name}</strong>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.85rem', color: '#666' }}>Zarezerwowano</span>
                      <button 
                        onClick={(e) => handleCancel(e, res)}
                        style={{ padding: '0.25rem 0.75rem', cursor: 'pointer', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', fontSize: '0.85rem' }}
                      >
                        Anuluj
                      </button>
                    </div>
                  </div>
                  {expandedReservationDeskId === res.id && (
                    <div className="desk-features" style={{ marginTop: '0.5rem', padding: '0.75rem', backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: '4px', fontSize: '0.9rem' }}>
                      <strong style={{ display: 'block', marginBottom: '0.5rem' }}>Wyposażenie:</strong>
                      {res.features && res.features.length > 0 ? (
                        <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
                          {res.features.map((df: any, idx: number) => (
                            <li key={idx}>{df.feature.name} {df.value ? `- ${df.value}` : ''}</li>
                          ))}
                        </ul>
                      ) : (
                        <p style={{ margin: 0 }}>Brak przypisanego wyposażenia.</p>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p>Brak aktywnych rezerwacji.</p>
          )}
        </section>
      </section>
    </main>
  );
}