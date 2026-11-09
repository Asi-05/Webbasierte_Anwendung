# Startpunkt der Anwendung: verbindet alle Schichten.
# Starten mit: python3 main.py   (oder ▶️-Button in VS Code)
from pathlib import Path

import uvicorn
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from app.persistence import init_db
from app.service import router

init_db()  # Tabellen und feste Kategorien anlegen

app = FastAPI(title="Aufgabenverwaltung")
app.include_router(router)  # REST-Endpunkte unter /api/...

# Präsentationsschicht: liefert static/index.html unter http://localhost:8000/
static_ordner = Path(__file__).parent / "static"
app.mount("/", StaticFiles(directory=static_ordner, html=True), name="static")

if __name__ == "__main__":
    print("Webseite öffnen: http://localhost:8000")
    uvicorn.run(app, port=8000)
