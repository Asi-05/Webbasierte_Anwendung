# ==========================================
# BUSINESS SERVICE LAYER
# DTOs (Data Transfer Objects) + Business Services (Geschäftslogik)
# Kennt die Datenbank-Entitäten, aber nichts von HTTP.
# Von FastAPI wird hier nur Depends (Dependency-Injection) genutzt.
# ==========================================
from datetime import date
from typing import Annotated

from fastapi import Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.persistence import Aufgabe, Kategorie, get_session


# ---------- Eigene Exceptions ----------
# Der Business Layer kennt kein HTTP. Er meldet Fehler mit diesen Klassen,
# der Service Layer übersetzt sie in Statuscodes.

class NichtGefundenError(Exception):
    """Gesuchte Aufgabe existiert nicht -> wird im Service Layer zu 404."""


class UngueltigeDatenError(Exception):
    """Daten verletzen eine Geschäftsregel -> wird im Service Layer zu 400."""


# ---------- DTOs ----------

class KategorieDTO(BaseModel):
    id: int  # Kategorien werden nur gelesen, haben also immer eine ID
    name: str


class AufgabeDTO(BaseModel):
    id: int | None = None
    titel: str
    beschreibung: str | None = None
    erledigt: bool = False
    faellig_am: date | None = None
    kategorie_id: int
    ueberfaellig: bool = False  # wird von der Business-Logik berechnet, nicht gespeichert


# ---------- Business Service: Kategorien ----------

class KategorieService:
    def __init__(self, session: Session):
        self.session = session

    # Kategorien sind fix (Schule, Arbeit, Privat) -> sie können nur gelesen werden
    def alle_kategorien(self) -> list[KategorieDTO]:
        kategorien = self.session.scalars(select(Kategorie).order_by(Kategorie.id)).all()
        return [KategorieDTO(id=k.id, name=k.name) for k in kategorien]


# ---------- Business Service: Aufgaben ----------

class AufgabeService:
    def __init__(self, session: Session):
        self.session = session

    def alle_aufgaben(self, kategorie_id: int | None = None, nur_offene: bool = False) -> list[AufgabeDTO]:
        """Liefert alle Aufgaben, optional gefiltert nach Kategorie und/oder nur offene Aufgaben."""
        abfrage = select(Aufgabe)

        # Filter nur einbauen, wenn er gesetzt ist -> ohne Parameter wie bisher alle Aufgaben
        if kategorie_id is not None:
            abfrage = abfrage.where(Aufgabe.kategorie_id == kategorie_id)
        if nur_offene:
            abfrage = abfrage.where(Aufgabe.erledigt == False)  # nur nicht erledigte Aufgaben

        # Sortierung nach Fälligkeitsdatum (Aufgaben ohne Datum stehen bei MySQL zuerst)
        abfrage = abfrage.order_by(Aufgabe.faellig_am)
        aufgaben = self.session.scalars(abfrage).all()
        return [_zu_dto(a) for a in aufgaben]

    def aufgabe_lesen(self, aufgabe_id: int) -> AufgabeDTO:
        return _zu_dto(self._finde_aufgabe(aufgabe_id))

    def aufgabe_erstellen(self, dto: AufgabeDTO) -> AufgabeDTO:
        self._pruefe_aufgabe(dto)
        # Geschäftsregel: Eine neue Aufgabe darf nicht schon in der Vergangenheit fällig sein
        if dto.faellig_am is not None and dto.faellig_am < date.today():
            raise UngueltigeDatenError("Fälligkeitsdatum darf nicht in der Vergangenheit liegen")

        aufgabe = Aufgabe(
            titel=dto.titel.strip(),
            beschreibung=dto.beschreibung,
            erledigt=dto.erledigt,
            faellig_am=dto.faellig_am,
            kategorie_id=dto.kategorie_id,
        )
        self.session.add(aufgabe)
        self.session.commit()
        return _zu_dto(aufgabe)

    def aufgabe_aendern(self, aufgabe_id: int, dto: AufgabeDTO) -> AufgabeDTO:
        aufgabe = self._finde_aufgabe(aufgabe_id)
        self._pruefe_aufgabe(dto)

        aufgabe.titel = dto.titel.strip()
        aufgabe.beschreibung = dto.beschreibung
        aufgabe.erledigt = dto.erledigt
        aufgabe.faellig_am = dto.faellig_am
        aufgabe.kategorie_id = dto.kategorie_id
        self.session.commit()
        return _zu_dto(aufgabe)

    def aufgabe_loeschen(self, aufgabe_id: int):
        aufgabe = self._finde_aufgabe(aufgabe_id)
        self.session.delete(aufgabe)
        self.session.commit()

    def _finde_aufgabe(self, aufgabe_id: int) -> Aufgabe:
        """Sucht eine Aufgabe per ID, wirft NichtGefundenError wenn es sie nicht gibt."""
        aufgabe = self.session.get(Aufgabe, aufgabe_id)
        if aufgabe is None:
            raise NichtGefundenError("Aufgabe nicht gefunden")
        return aufgabe

    def _pruefe_aufgabe(self, dto: AufgabeDTO):
        """Gemeinsame Prüfungen für Erstellen und Ändern."""
        if not dto.titel.strip():
            raise UngueltigeDatenError("Titel darf nicht leer sein")
        # Gleiche Längen wie in der Datenbank (String(100) / String(250)), sonst lehnt MySQL ab -> Fehler 500
        if len(dto.titel) > 100 or (dto.beschreibung and len(dto.beschreibung) > 250):
            raise UngueltigeDatenError("Titel max. 100 und Beschreibung max. 250 Zeichen")
        if self.session.get(Kategorie, dto.kategorie_id) is None:
            raise UngueltigeDatenError("Kategorie existiert nicht")


def _zu_dto(aufgabe: Aufgabe) -> AufgabeDTO:
    """Wandelt eine Aufgabe in ein DTO um und berechnet, ob sie überfällig ist."""
    return AufgabeDTO(
        id=aufgabe.id,
        titel=aufgabe.titel,
        beschreibung=aufgabe.beschreibung,
        erledigt=aufgabe.erledigt,
        faellig_am=aufgabe.faellig_am,
        kategorie_id=aufgabe.kategorie_id,
        # Geschäftsregel: überfällig = nicht erledigt und Fälligkeitsdatum ist vorbei
        ueberfaellig=not aufgabe.erledigt and aufgabe.faellig_am is not None and aufgabe.faellig_am < date.today(),
    )


# ---------- Provider für die Dependency-Injection (Depends) ----------
# FastAPI ruft diese Funktionen bei jeder Anfrage auf und übergibt das Resultat
# an die REST-Endpunkte im Service Layer.

def get_kategorie_service(session: Annotated[Session, Depends(get_session)]):
    return KategorieService(session)


def get_aufgabe_service(session: Annotated[Session, Depends(get_session)]):
    return AufgabeService(session)
