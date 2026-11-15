# ==========================================
# SERVICE LAYER (REST-Endpunkte mit FastAPI)
# Nimmt HTTP-Anfragen entgegen, ruft die Business-Logik auf
# und übersetzt Fehler in HTTP-Statuscodes.
# ==========================================
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import business
from app.business import AufgabeDTO, KategorieDTO
from app.persistence import get_db

router = APIRouter(prefix="/api")


# ---------- Kategorien ----------

# Nur lesen, da die Kategorien fix sind
@router.get("/kategorien")
def kategorien_lesen(db: Session = Depends(get_db)) -> list[KategorieDTO]:
    return business.alle_kategorien(db)


# ---------- Aufgaben ----------

@router.get("/aufgaben")
def aufgaben_lesen(db: Session = Depends(get_db)) -> list[AufgabeDTO]:
    return business.alle_aufgaben(db)


@router.post("/aufgaben")
def aufgabe_erstellen(dto: AufgabeDTO, db: Session = Depends(get_db)) -> AufgabeDTO:
    try:
        return business.aufgabe_erstellen(db, dto)
    except ValueError as e:  # z.B. leerer Titel -> 400 Bad Request
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/aufgaben/{aufgabe_id}")
def aufgabe_aendern(aufgabe_id: int, dto: AufgabeDTO, db: Session = Depends(get_db)) -> AufgabeDTO:
    try:
        return business.aufgabe_aendern(db, aufgabe_id, dto)
    except LookupError as e:  # Aufgabe gibt es nicht -> 404 Not Found
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:  # z.B. leerer Titel -> 400 Bad Request
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/aufgaben/{aufgabe_id}")
def aufgabe_loeschen(aufgabe_id: int, db: Session = Depends(get_db)):
    try:
        business.aufgabe_loeschen(db, aufgabe_id)
    except LookupError as e:  # Aufgabe gibt es nicht -> 404 Not Found
        raise HTTPException(status_code=404, detail=str(e))
