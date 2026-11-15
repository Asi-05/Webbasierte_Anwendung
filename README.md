# Aufgabenverwaltung – Webbasierte Anwendungen

## Starten

```bash
python3 -m pip install -r requirements.txt
python3 main.py
```

Danach im Browser öffnen: http://localhost:8000
API-Dokumentation (automatisch von FastAPI): http://localhost:8000/docs

Die Daten werden in der SQLite-Datei `aufgaben.db` im Projektordner gespeichert.

## ER-Modell (konzeptuell)

![ER-Modell](docs/er-modell.svg)

## Aufbau (Schichten)

| Datei | Schicht |
|---|---|
| `static/index.html`, `static/css/main.css`, `static/js/main.js` | Presentation Layer (HTML + CSS + JavaScript mit jQuery) |
| `app/service.py` | Service Layer (REST-Endpunkte mit FastAPI) |
| `app/business.py` | Business Layer (DTOs + Geschäftslogik) |
| `app/persistence.py` | Persistence Layer (SQLAlchemy-Entitäten + DB-Verbindung) |
| `main.py` | Startpunkt, verbindet alles |
