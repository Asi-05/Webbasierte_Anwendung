# ==========================================
# WEB/REST SERVICE LAYER (REST-Endpunkte mit FastAPI)
# Nimmt HTTP-Anfragen entgegen, ruft die Business Services auf
# und übersetzt Fehler in HTTP-Statuscodes.
#
# URL-Schema (Liste im Plural, einzelnes Objekt im Singular):
#   GET    /api/kategorien          Liste aller Kategorien
#   GET    /api/aufgaben            Liste aller Aufgaben
#   GET    /api/aufgabe/{id}        eine Aufgabe abfragen
#   POST   /api/aufgabe             neue Aufgabe erstellen
#   PUT    /api/aufgabe/{id}        Aufgabe ändern
#   DELETE /api/aufgabe/{id}        Aufgabe löschen
# ==========================================
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException

from app.business import (
    AufgabeDTO,
    AufgabeService,
    KategorieDTO,
    KategorieService,
    get_aufgabe_service,
    get_kategorie_service,
)

router = APIRouter(prefix="/api")


# ---------- Kategorien ----------

# Nur lesen, da die Kategorien fix sind
@router.get("/kategorien")
def get_kategorien(
    service: Annotated[KategorieService, Depends(get_kategorie_service)],
) -> list[KategorieDTO]:
    return service.alle_kategorien()


# ---------- Aufgaben ----------

@router.get("/aufgaben")
def get_aufgaben(
    service: Annotated[AufgabeService, Depends(get_aufgabe_service)],
) -> list[AufgabeDTO]:
    return service.alle_aufgaben()


@router.get("/aufgabe/{aufgabe_id}")
def get_aufgabe(
    aufgabe_id: int,
    service: Annotated[AufgabeService, Depends(get_aufgabe_service)],
) -> AufgabeDTO:
    try:
        return service.aufgabe_lesen(aufgabe_id)
    except LookupError as e:  # Aufgabe gibt es nicht -> 404 Not Found
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/aufgabe", status_code=201)  # 201 Created
def create_aufgabe(
    dto: AufgabeDTO,
    service: Annotated[AufgabeService, Depends(get_aufgabe_service)],
) -> AufgabeDTO:
    try:
        return service.aufgabe_erstellen(dto)
    except ValueError as e:  # z.B. leerer Titel -> 400 Bad Request
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/aufgabe/{aufgabe_id}")
def update_aufgabe(
    aufgabe_id: int,
    dto: AufgabeDTO,
    service: Annotated[AufgabeService, Depends(get_aufgabe_service)],
) -> AufgabeDTO:
    try:
        return service.aufgabe_aendern(aufgabe_id, dto)
    except LookupError as e:  # Aufgabe gibt es nicht -> 404 Not Found
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:  # z.B. leerer Titel -> 400 Bad Request
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/aufgabe/{aufgabe_id}")
def delete_aufgabe(
    aufgabe_id: int,
    service: Annotated[AufgabeService, Depends(get_aufgabe_service)],
):
    try:
        service.aufgabe_loeschen(aufgabe_id)
    except LookupError as e:  # Aufgabe gibt es nicht -> 404 Not Found
        raise HTTPException(status_code=404, detail=str(e))
