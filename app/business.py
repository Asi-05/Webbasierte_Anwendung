# ==========================================
# BUSINESS LAYER
# DTOs (Data Transfer Objects) + Geschäftslogik
# Kennt die Datenbank-Entitäten, aber nichts von HTTP/FastAPI.
# ==========================================
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.persistence import Aufgabe, Kategorie


# ---------- DTOs ----------

class KategorieDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)  # erlaubt Umwandlung aus SQLAlchemy-Objekt
    id: int | None = None
    name: str


class AufgabeDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int | None = None
    titel: str
    beschreibung: str | None = None
    erledigt: bool = False
    kategorie_id: int


# ---------- Kategorien ----------

# Kategorien sind fix (Schule, Arbeit, Privat) -> sie können nur gelesen werden
def alle_kategorien(db: Session) -> list[KategorieDTO]:
    kategorien = db.scalars(select(Kategorie).order_by(Kategorie.id)).all()
    return [KategorieDTO.model_validate(k) for k in kategorien]


# ---------- Aufgaben ----------

def alle_aufgaben(db: Session) -> list[AufgabeDTO]:
    aufgaben = db.scalars(select(Aufgabe).order_by(Aufgabe.id)).all()
    return [AufgabeDTO.model_validate(a) for a in aufgaben]


def aufgabe_erstellen(db: Session, dto: AufgabeDTO) -> AufgabeDTO:
    _pruefe_aufgabe(db, dto)
    aufgabe = Aufgabe(
        titel=dto.titel.strip(),
        beschreibung=dto.beschreibung,
        erledigt=dto.erledigt,
        kategorie_id=dto.kategorie_id,
    )
    db.add(aufgabe)
    db.commit()
    return AufgabeDTO.model_validate(aufgabe)


def aufgabe_aendern(db: Session, aufgabe_id: int, dto: AufgabeDTO) -> AufgabeDTO:
    aufgabe = db.get(Aufgabe, aufgabe_id)
    if aufgabe is None:
        raise LookupError("Aufgabe nicht gefunden")
    _pruefe_aufgabe(db, dto)

    aufgabe.titel = dto.titel.strip()
    aufgabe.beschreibung = dto.beschreibung
    aufgabe.erledigt = dto.erledigt
    aufgabe.kategorie_id = dto.kategorie_id
    db.commit()
    return AufgabeDTO.model_validate(aufgabe)


def aufgabe_loeschen(db: Session, aufgabe_id: int):
    aufgabe = db.get(Aufgabe, aufgabe_id)
    if aufgabe is None:
        raise LookupError("Aufgabe nicht gefunden")
    db.delete(aufgabe)
    db.commit()


def _pruefe_aufgabe(db: Session, dto: AufgabeDTO):
    """Gemeinsame Prüfungen für Erstellen und Ändern."""
    if not dto.titel.strip():
        raise ValueError("Titel darf nicht leer sein")
    if db.get(Kategorie, dto.kategorie_id) is None:
        raise ValueError("Kategorie existiert nicht")
