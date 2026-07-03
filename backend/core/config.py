import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()


def _get_bool(name: str, default: bool = False) -> bool:
    value = os.getenv(name)
    if value is None:
        return default

    return value.strip().lower() in {"1", "true", "yes", "on"}


class Settings:
    GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY")
    AUCKLAND_TRANSPORT_API_KEY = os.getenv("AUCKLAND_TRANSPORT_API_KEY")
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
    DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")
    OPENWEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY")
    WEATHER_TIMEOUT_SECONDS = float(os.getenv("WEATHER_TIMEOUT_SECONDS", "10"))
    AUCKLAND_TRANSPORT_TIMEOUT_SECONDS = float(os.getenv("AUCKLAND_TRANSPORT_TIMEOUT_SECONDS", "12"))
    AUCKLAND_TRANSPORT_GTFS_URL = os.getenv("AUCKLAND_TRANSPORT_GTFS_URL", "https://gtfs.at.govt.nz/gtfs.zip")
    AUCKLAND_TRANSPORT_TRIP_UPDATES_URL = os.getenv(
        "AUCKLAND_TRANSPORT_TRIP_UPDATES_URL",
        "https://api.at.govt.nz/realtime/legacy/tripupdates",
    )
    AUCKLAND_TRANSPORT_SERVICE_ALERTS_URL = os.getenv(
        "AUCKLAND_TRANSPORT_SERVICE_ALERTS_URL",
        "https://api.at.govt.nz/realtime/legacy/servicealerts",
    )
    AUCKLAND_TRANSPORT_GTFS_CACHE_PATH = Path(
        os.getenv("AUCKLAND_TRANSPORT_GTFS_CACHE_PATH", "backend/.cache/at_gtfs.zip")
    )
    LLM_PROVIDER = os.getenv("LLM_PROVIDER", "openai").strip().lower()
    OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    DEEPSEEK_MODEL = os.getenv("DEEPSEEK_MODEL", "deepseek-chat")
    LLM_TIMEOUT_SECONDS = float(os.getenv("LLM_TIMEOUT_SECONDS", "20"))
    LLM_ENABLED = _get_bool("LLM_ENABLED", True)

settings = Settings()
