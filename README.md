# Hot Desk App

Aplikacja do rezerwacji biurek w biurze. Projekt sklada sie z:
- backendu w FastAPI
- frontendu w React + Vite
- bazy PostgreSQL uruchamianej przez Docker Compose

## Wymagania
- Docker Desktop z Docker Compose
- Python 3.14 lub inny zgodny Python 3.x
- Node.js 20+

## Struktura projektu
- `backend/` - API, modele, migracja schematu i seed danych
- `frontend/` - interfejs uzytkownika

## 1. Uruchom baze danych
Plik `docker-compose.yml` znajduje sie w katalogu `backend/`.

Z katalogu glownego projektu:

```powershell
docker compose -f backend/docker-compose.yml up -d
```

Albo wejd z katalogu backend:

```powershell
cd backend
docker compose up -d
```

Po starcie dostajesz:
- PostgreSQL: `localhost:5432`
- pgAdmin: `http://localhost:5050`

Dane logowania do PostgreSQL i pgAdmin ustawiasz w pliku `backend/.env`.

## 2. Skonfiguruj backend
Wejdz do katalogu backend i przygotuj virtualenv:

```powershell
cd backend
copy .env.example .env
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Jesli uzywasz CMD, zamiast PowerShell aktywuj srodowisko tak:

```bat
.\.venv\Scripts\activate.bat
```

### Wazne zmienne backendu
W pliku `backend/.env` sprawdz przede wszystkim:
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `POSTGRES_HOST`
- `POSTGRES_PORT`
- `POSTGRES_DB`
- `SECRET_KEY`
- `CORS_ORIGINS` - opcjonalnie, jesli frontend dziala z innego adresu niz domyslny

Domyslnie backend akceptuje frontend z:
- `http://localhost:5173`
- `http://127.0.0.1:5173`

## 3. Utworz schemat bazy
Po uruchomieniu bazy i ustawieniu `.env` wygeneruj tabele:

```powershell
python database.py
```

Jesli chcesz zasilic baze danymi testowymi, uruchom dodatkowo:

```powershell
python fakedatagenerator.py
```

## 4. Uruchom backend
Najprostszy sposob to uruchomienie uvicorn z katalogu backend:

```powershell
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Alternatywnie mozesz uruchomic bezposrednio plik:

```powershell
python main.py
```

Backend bedzie dostepny pod:
- `http://localhost:8000`
- dokumentacja Swagger: `http://localhost:8000/docs`

## 5. Uruchom frontend
Wejdz do katalogu frontend i zainstaluj zaleznosci:

```powershell
cd frontend
npm install
npm run dev
```

Frontend uruchomi sie domyslnie na:
- `http://localhost:5173`

### Opcjonalna konfiguracja frontendu
Frontend domyslnie laczy sie z backendem pod `http://localhost:8000`.
Jesli backend dziala pod innym adresem, dodaj plik `frontend/.env` z trescia:

```env
VITE_API_URL=http://localhost:8000
```

## 6. Najczestsze komendy
### Backend
```powershell
cd backend
python database.py
python fakedatagenerator.py
uvicorn main:app --reload
```

### Frontend
```powershell
cd frontend
npm install
npm run dev
npm run build
npm run preview
```

## 7. Najczestsze problemy
- Jesli `npm start dev` nie dziala, uzyj `npm run dev`.
- Jesli frontend pokazuje blad CORS, upewnij sie, ze backend dziala i `CORS_ORIGINS` zawiera `http://localhost:5173`.
- Jesli backend nie laczy sie z baza, sprawdz `backend/.env` i czy kontenery sa uruchomione przez Docker Compose.
- Jesli port `8000` lub `5173` jest zajety, zmien port w komendzie startowej.

## 8. Zatrzymanie aplikacji
- Backend zatrzymasz przez `Ctrl+C` w terminalu.
- Kontenery bazy zatrzymasz poleceniem:

```powershell
docker compose -f backend/docker-compose.yml down
```

Jesli chcesz usunac tez wolumen z danymi, uzyj:

```powershell
docker compose -f backend/docker-compose.yml down -v
```
