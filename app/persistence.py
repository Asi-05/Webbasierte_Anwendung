# ==========================================
# PERSISTENCE LAYER
# Datenbankverbindung + Entitätsklassen (SQLAlchemy)
# ==========================================
import os

from sqlalchemy import Boolean, ForeignKey, String, create_engine, select
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, relationship

# Standard: SQLite-Datei im Projektordner (kein DB-Server nötig).
# Für MySQL z.B.: DATABASE_URL="mysql+pymysql://user:passwort@localhost/aufgaben"
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///aufgaben.db")

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
    kategorie_id: Mapped[int] = mapped_column(ForeignKey("kategorie.id"))

    # n:1 Beziehung -> jede Aufgabe gehört zu genau einer Kategorie
    kategorie: Mapped[Kategorie] = relationship(back_populates="aufgaben")


# Die Kategorien sind fix vorgegeben und können nicht geändert werden
FESTE_KATEGORIEN = ["Schule", "Arbeit", "Privat"]


def init_db():
    """Erstellt die Tabellen und legt die festen Kategorien an, falls sie fehlen."""
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
