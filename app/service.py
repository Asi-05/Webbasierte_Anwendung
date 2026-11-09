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


def fehler_behandeln(funktion, *args):
    """Ruft eine Business-Funktion auf und wandelt ihre Fehler in HTTP-Fehler um."""
    try:
        return funktion(*args)
    except LookupError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


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
    return fehler_behandeln(business.aufgabe_erstellen, db, dto)


@router.put("/aufgaben/{aufgabe_id}")
def aufgabe_aendern(aufgabe_id: int, dto: AufgabeDTO, db: Session = Depends(get_db)) -> AufgabeDTO:
    return fehler_behandeln(business.aufgabe_aendern, db, aufgabe_id, dto)


@router.delete("/aufgaben/{aufgabe_id}")
def aufgabe_loeschen(aufgabe_id: int, db: Session = Depends(get_db)):
    fehler_behandeln(business.aufgabe_loeschen, db, aufgabe_id)
