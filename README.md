# Aufgabenverwaltung – Webbasierte Anwendungen

## Starten

```bash
python3 -m pip install -r requirements.txt
python3 main.py
```

Danach im Browser öffnen: http://localhost:8000
API-Dokumentation (automatisch von FastAPI): http://localhost:8000/docs

Standardmässig wird eine SQLite-Datei `aufgaben.db` verwendet. Für MySQL:

```bash
python3 -m pip install pymysql
DATABASE_URL="mysql+pymysql://user:passwort@localhost/aufgaben" python3 main.py
```

## Aufbau (Schichten)

| Datei | Schicht |
|---|---|
| `static/index.html` | Presentation Layer (HTML + jQuery) |
| `app/service.py` | Service Layer (REST-Endpunkte mit FastAPI) |
| `app/business.py` | Business Layer (DTOs + Geschäftslogik) |
| `app/persistence.py` | Persistence Layer (SQLAlchemy-Entitäten + DB-Verbindung) |
| `main.py` | Startpunkt, verbindet alles |
