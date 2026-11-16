# Aufgabenverwaltung – Webbasierte Anwendungen

## Voraussetzungen

- Python 3.10 oder neuer
- MySQL-Server (z.B. MySQL Community Server), gestartet auf `localhost:3306`
- Internetverbindung (jQuery wird von code.jquery.com geladen)

## Datenbank einrichten

In `app/persistence.py` Benutzer und Passwort des MySQL-Servers eintragen:

```python
DB_USER = "root"
DB_PASSWORT = "passwort"
```

Die Datenbank `aufgaben`, die Tabellen und die Kategorien (Schule, Arbeit, Privat) werden beim Start automatisch angelegt.

## Starten

```bash
python3 -m pip install -r requirements.txt
python3 main.py
```

Danach im Browser öffnen: http://localhost:8000
API-Dokumentation (automatisch von FastAPI): http://localhost:8000/docs

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
