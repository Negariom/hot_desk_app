import { useState, useEffect } from 'react';
import { apiClient } from '../api/client';

// Interfaces
interface City { id: number; name: string; }
interface Building { id: number; name: string; city_id: number; }
interface Floor { id: number; floor_number: number; building_id: number; }
interface Desk { id: number; name: string; floor_id: number; is_active: boolean; }
interface Feature { id: number; name: string; category?: string; }
interface DeskFeature { value: string | null; feature: Feature; }

export function FloorAvailabilityPage() {
  const [cities, setCities] = useState<City[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [floors, setFloors] = useState<Floor[]>([]);
  const [desks, setDesks] = useState<Desk[]>([]);

  const [selectedCity, setSelectedCity] = useState<number | null>(null);
  const [selectedBuilding, setSelectedBuilding] = useState<number | null>(null);
  const [selectedFloor, setSelectedFloor] = useState<number | null>(null);
  
  const [expandedDeskId, setExpandedDeskId] = useState<number | null>(null);
  const [deskEquipment, setDeskEquipment] = useState<DeskFeature[]>([]);

  const [isLoading, setIsLoading] = useState({
    cities: true,
    buildings: false,
    floors: false,
    desks: false,
    equipment: false,
  });

  // Fetch cities
  useEffect(() => {
    apiClient.get('/cities')
      .then(response => setCities(response.data))
      .catch(error => console.error("Failed to fetch cities", error))
      .finally(() => setIsLoading(prev => ({ ...prev, cities: false })));
  }, []);

  // Fetch buildings
  useEffect(() => {
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
    if (selectedFloor) {
      setIsLoading(prev => ({ ...prev, desks: true }));
      apiClient.get(`/desks/?floor_id=${selectedFloor}`)
        .then(response => setDesks(response.data))
        .catch(error => console.error("Failed to fetch desks", error))
        .finally(() => setIsLoading(prev => ({ ...prev, desks: false })));
    }
  }, [selectedFloor]);

  // Fetch equipment
  useEffect(() => {
    if (expandedDeskId) {
      setIsLoading(prev => ({ ...prev, equipment: true }));
      apiClient.get(`/desks/${expandedDeskId}/equipment`)
        .then(response => setDeskEquipment(response.data))
        .catch(error => console.error("Failed to fetch equipment", error))
        .finally(() => setIsLoading(prev => ({ ...prev, equipment: false })));
    }
  }, [expandedDeskId]);

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
                      if (selectedCity !== city.id) {
                        setSelectedCity(city.id);
                        setSelectedBuilding(null);
                        setSelectedFloor(null);
                        setBuildings([]);
                        setFloors([]);
                        setDesks([]);
                        setExpandedDeskId(null);
                        setDeskEquipment([]);
                      }
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
                        if (selectedBuilding !== building.id) {
                          setSelectedBuilding(building.id);
                          setSelectedFloor(null);
                          setFloors([]);
                          setDesks([]);
                          setExpandedDeskId(null);
                          setDeskEquipment([]);
                        }
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
                        if (selectedFloor !== floor.id) {
                          setSelectedFloor(floor.id);
                          setDesks([]);
                          setExpandedDeskId(null);
                          setDeskEquipment([]);
                        }
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
              <div className="results-grid">
                {desks.length > 0 ? (
                  desks.map((desk) => (
                    <article className="desk-card" style={{ cursor: 'pointer' }} key={desk.id} onClick={() => {
                      if (expandedDeskId !== desk.id) {
                        setExpandedDeskId(desk.id);
                        setDeskEquipment([]);
                      } else {
                        setExpandedDeskId(null);
                        setDeskEquipment([]);
                      }
                    }}>
                      <div className="desk-card__header">
                        <p className="desk-label">{desk.name}</p>
                        <span className={`status-pill ${desk.is_active ? 'status-pill--available' : 'status-pill--occupied'}`}>
                          {desk.is_active ? 'Dostępne' : 'Zajęte'}
                        </span>
                      </div>
                      {expandedDeskId === desk.id && (
                        <div className="desk-card__details" style={{ marginTop: '1rem', borderTop: '1px solid #eee', paddingTop: '0.5rem' }}>
                          <h4 style={{ marginBottom: '0.5rem', fontSize: '0.95rem' }}>Wyposażenie:</h4>
                          {isLoading.equipment ? <p style={{ fontSize: '0.9rem', color: '#666' }}>Ładowanie...</p> : (
                            deskEquipment.length > 0 ? (
                              <ul style={{ listStyle: 'disc', paddingLeft: '1.5rem', fontSize: '0.9rem', color: '#444' }}>
                                {deskEquipment.map((eq, idx) => (
                                  <li key={idx}>
                                    {eq.feature.name} {eq.value ? `(${eq.value})` : ''}
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p style={{ fontSize: '0.9rem', color: '#666' }}>Brak przypisanego wyposażenia.</p>
                            )
                          )}
                        </div>
                      )}
                    </article>
                  ))
                ) : (
                  <div className="state-card state-card--empty">
                    <strong>Brak biurek na tym piętrze.</strong>
                  </div>
                )}
              </div>
            )}
          </section>
        )}
      </section>
    </main>
  );
}