# ==========================================
# PERSISTENCE LAYER
# Datenbankverbindung + Entitätsklassen (SQLAlchemy)
# ==========================================
from datetime import date

from sqlalchemy import ForeignKey, String, create_engine, select
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, relationship

# MySQL-Zugangsdaten -> hier an die eigene MySQL-Installation anpassen
DB_USER = "root"
DB_PASSWORT = ""
DB_HOST = "localhost"
DB_NAME = "aufgaben"

# Verbindung zur Datenbank der Anwendung (die Datenbank muss in MySQL schon existieren)
DATABASE_URL = f"mysql+pymysql://{DB_USER}:{DB_PASSWORT}@{DB_HOST}:3306/{DB_NAME}"

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
    erledigt: Mapped[bool] = mapped_column(default=False)
    faellig_am: Mapped[date | None]  # optional
    kategorie_id: Mapped[int] = mapped_column(ForeignKey("kategorie.id"))

    # n:1 Beziehung -> jede Aufgabe gehört zu genau einer Kategorie
    kategorie: Mapped[Kategorie] = relationship(back_populates="aufgaben")


# Die Kategorien sind fix vorgegeben und können nicht geändert werden
FESTE_KATEGORIEN = ["Schule", "Arbeit", "Privat"]


def init_db():
    """Erstellt die Tabellen und legt die festen Kategorien an, falls sie fehlen."""
    Base.metadata.create_all(engine)
    with Session(engine) as session:
        # Nur beim allerersten Start (Tabelle noch leer) die festen Kategorien einfügen
        if session.scalars(select(Kategorie)).first() is None:
            for name in FESTE_KATEGORIEN:
                session.add(Kategorie(name=name))
            session.commit()


def get_session():
    """Liefert pro Request eine DB-Session (wird via Depends() von FastAPI genutzt)."""
    with Session(engine) as session:
        yield session
