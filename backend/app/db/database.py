import os
from dotenv import load_dotenv

load_dotenv()
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./sql_app.db")

_is_sqlite = SQLALCHEMY_DATABASE_URL.startswith("sqlite")

# Supabase Session/Transaction Pooler requires SSL.
# We pass sslmode=require via connect_args for psycopg2 when using PostgreSQL.
_connect_args = {}
if not _is_sqlite:
    _connect_args = {"sslmode": "require"}

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args=_connect_args,
    # SQLite doesn't support these pool args
    **({} if _is_sqlite else {
        "pool_size":         int(os.getenv("DB_POOL_SIZE",    "5")),
        "max_overflow":      int(os.getenv("DB_MAX_OVERFLOW", "10")),
        "pool_pre_ping":     True,   # test connections before use
        "pool_recycle":      1800,   # recycle connections every 30 min
    })
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

