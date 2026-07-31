import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

# backend/ directory, regardless of the process's current working directory
# (e.g. whether uvicorn was launched from the repo root or from inside backend/).
BACKEND_DIR = Path(__file__).resolve().parent.parent


def _get_bool(name: str, default: bool = False) -> bool:
    value = os.getenv(name)
    if value is None:
        return default

    return value.strip().lower() in {"1", "true", "yes", "on"}


class Settings:
    GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY")
    AUCKLAND_TRANSPORT_API_KEY = os.getenv("AUCKLAND_TRANSPORT_API_KEY")
    ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
    ANTHROPIC_MODEL = os.getenv("ANTHROPIC_MODEL", "claude-haiku-4-5-20251001")
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
        os.getenv("AUCKLAND_TRANSPORT_GTFS_CACHE_PATH", str(BACKEND_DIR / ".cache" / "at_gtfs.zip"))
    )
    LLM_PROVIDER = os.getenv("LLM_PROVIDER", "openai").strip().lower()
    OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    DEEPSEEK_MODEL = os.getenv("DEEPSEEK_MODEL", "deepseek-chat")
    LLM_TIMEOUT_SECONDS = float(os.getenv("LLM_TIMEOUT_SECONDS", "20"))
    LLM_ENABLED = _get_bool("LLM_ENABLED", True)

    # Per-task model routing: each "agent" (decision vs. narration) can be pinned
    # to its own provider, independent of the general LLM_PROVIDER default.
    DECISION_LLM_PROVIDER = (os.getenv("DECISION_LLM_PROVIDER") or LLM_PROVIDER).strip().lower()
    NARRATION_LLM_PROVIDER = (os.getenv("NARRATION_LLM_PROVIDER") or LLM_PROVIDER).strip().lower()

    # Tool-calling commute agent: when enabled, the agent loop gathers route and
    # weather data itself and makes the mode decision; the deterministic planner
    # pipeline remains the fallback. AGENT_MAX_TURNS caps LLM round-trips.
    AGENT_ENABLED = _get_bool("AGENT_ENABLED", True)
    AGENT_LLM_PROVIDER = (os.getenv("AGENT_LLM_PROVIDER") or LLM_PROVIDER).strip().lower()
    AGENT_MAX_TURNS = int(os.getenv("AGENT_MAX_TURNS", "5"))

    GOOGLE_CALENDAR_CLIENT_ID = os.getenv("GOOGLE_CALENDAR_CLIENT_ID")
    GOOGLE_CALENDAR_CLIENT_SECRET = os.getenv("GOOGLE_CALENDAR_CLIENT_SECRET")
    GOOGLE_CALENDAR_REDIRECT_URI = os.getenv(
        "GOOGLE_CALENDAR_REDIRECT_URI", "http://localhost:8000/calendar/oauth/callback"
    )
    GOOGLE_CALENDAR_TOKEN_PATH = Path(
        os.getenv("GOOGLE_CALENDAR_TOKEN_PATH", str(BACKEND_DIR / ".cache" / "google_calendar_token.json"))
    )

settings = Settings()
