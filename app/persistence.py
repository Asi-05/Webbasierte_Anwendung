# ==========================================
# PERSISTENCE LAYER
# Datenbankverbindung + Entitätsklassen (SQLAlchemy)
# ==========================================
from datetime import date

from sqlalchemy import Boolean, Date, ForeignKey, String, create_engine, select, text
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, relationship

# MySQL-Zugangsdaten -> hier an die eigene MySQL-Installation anpassen
DB_USER = "root"
DB_PASSWORT = "NewStrongPass!1"
DB_HOST = "localhost"
DB_NAME = "aufgaben"

# Verbindung zum MySQL-Server (ohne Datenbank) und zur Datenbank der Anwendung
SERVER_URL = f"mysql+pymysql://{DB_USER}:{DB_PASSWORT}@{DB_HOST}:3306"
DATABASE_URL = f"{SERVER_URL}/{DB_NAME}"

engine = create_engine(DATABASE_URL)


class Base(DeclarativeBase):
    pass


class Kategorie(Base):
    __tablename__ = "kategorie"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(50), unique=True)

    # 1:n Beziehung -> eine Kategorie hat viele Aufgaben
    aufgaben: Mapped[list["Aufgabe"]] = relationship(back_populates="kategorie")


class Aufgabe(Base):
    __tablename__ = "aufgabe"

    id: Mapped[int] = mapped_column(primary_key=True)
    titel: Mapped[str] = mapped_column(String(100))
    beschreibung: Mapped[str | None] = mapped_column(String(250))
    erledigt: Mapped[bool] = mapped_column(Boolean, default=False)
    faellig_am: Mapped[date | None] = mapped_column(Date)  # optional
    kategorie_id: Mapped[int] = mapped_column(ForeignKey("kategorie.id"))

    # n:1 Beziehung -> jede Aufgabe gehört zu genau einer Kategorie
    kategorie: Mapped[Kategorie] = relationship(back_populates="aufgaben")


# Die Kategorien sind fix vorgegeben und können nicht geändert werden
FESTE_KATEGORIEN = ["Schule", "Arbeit", "Privat"]


def init_db():
    """Erstellt Datenbank und Tabellen und legt die festen Kategorien an, falls sie fehlen."""
    # Die Datenbank selbst muss auf dem MySQL-Server zuerst existieren
    with create_engine(SERVER_URL).connect() as verbindung:
        verbindung.execute(text(f"CREATE DATABASE IF NOT EXISTS {DB_NAME}"))

    Base.metadata.create_all(engine)
    with Session(engine) as session:
        for name in FESTE_KATEGORIEN:
            if session.scalar(select(Kategorie).where(Kategorie.name == name)) is None:
                session.add(Kategorie(name=name))
        session.commit()


def get_db():
    """Liefert pro Request eine DB-Session (wird via Depends() von FastAPI genutzt)."""
    with Session(engine) as session:
        yield session
