from __future__ import annotations

import json
import time
from datetime import datetime, timezone
from typing import Any
from urllib.parse import urlencode

import requests

from core.config import settings


class GoogleCalendarService:
    AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
    TOKEN_URL = "https://oauth2.googleapis.com/token"
    EVENTS_URL = "https://www.googleapis.com/calendar/v3/calendars/primary/events"
    SCOPE = "https://www.googleapis.com/auth/calendar.readonly"

    def build_auth_url(self) -> str:
        params = {
            "client_id": settings.GOOGLE_CALENDAR_CLIENT_ID,
            "redirect_uri": settings.GOOGLE_CALENDAR_REDIRECT_URI,
            "response_type": "code",
            "scope": self.SCOPE,
            "access_type": "offline",
            "prompt": "consent",
        }
        return f"{self.AUTH_URL}?{urlencode(params)}"

    def exchange_code(self, code: str) -> bool:
        payload = {
            "code": code,
            "client_id": settings.GOOGLE_CALENDAR_CLIENT_ID,
            "client_secret": settings.GOOGLE_CALENDAR_CLIENT_SECRET,
            "redirect_uri": settings.GOOGLE_CALENDAR_REDIRECT_URI,
            "grant_type": "authorization_code",
        }

        try:
            response = requests.post(self.TOKEN_URL, data=payload, timeout=10)
            response.raise_for_status()
        except requests.RequestException:
            return False

        token_data = response.json()
        if "refresh_token" not in token_data:
            # Google only returns a refresh_token on first consent. If the user has
            # already granted access before, re-prompt (build_auth_url uses
            # prompt=consent, so this should be rare) rather than silently reusing
            # a stale/missing refresh token.
            existing = self._read_token_file()
            if existing and existing.get("refresh_token"):
                token_data["refresh_token"] = existing["refresh_token"]
            else:
                return False

        token_data["obtained_at"] = time.time()
        self._write_token_file(token_data)
        return True

    def is_connected(self) -> bool:
        token = self._read_token_file()
        return bool(token and token.get("refresh_token"))

    def disconnect(self) -> None:
        if settings.GOOGLE_CALENDAR_TOKEN_PATH.exists():
            settings.GOOGLE_CALENDAR_TOKEN_PATH.unlink()

    def get_next_event(self) -> dict[str, Any] | None:
        access_token = self._get_valid_access_token()
        if not access_token:
            return None

        params = {
            "timeMin": datetime.now(timezone.utc).isoformat(),
            "maxResults": 1,
            "singleEvents": "true",
            "orderBy": "startTime",
        }
        headers = {"Authorization": f"Bearer {access_token}"}

        try:
            response = requests.get(self.EVENTS_URL, params=params, headers=headers, timeout=10)
            response.raise_for_status()
        except requests.RequestException:
            return None

        items = response.json().get("items") or []
        if not items:
            return None

        event = items[0]
        start = event.get("start") or {}
        start_time = start.get("dateTime")
        if not start_time:
            return None

        return {
            "summary": event.get("summary") or "Untitled event",
            "location": event.get("location"),
            "start_time": start_time,
        }

    def _get_valid_access_token(self) -> str | None:
        token = self._read_token_file()
        if not token or not token.get("refresh_token"):
            return None

        obtained_at = token.get("obtained_at", 0)
        expires_in = token.get("expires_in", 0)
        if token.get("access_token") and time.time() < obtained_at + expires_in - 60:
            return token["access_token"]

        payload = {
            "client_id": settings.GOOGLE_CALENDAR_CLIENT_ID,
            "client_secret": settings.GOOGLE_CALENDAR_CLIENT_SECRET,
            "refresh_token": token["refresh_token"],
            "grant_type": "refresh_token",
        }

        try:
            response = requests.post(self.TOKEN_URL, data=payload, timeout=10)
            response.raise_for_status()
        except requests.RequestException:
            return None

        refreshed = response.json()
        refreshed["refresh_token"] = token["refresh_token"]
        refreshed["obtained_at"] = time.time()
        self._write_token_file(refreshed)
        return refreshed.get("access_token")

    def _read_token_file(self) -> dict[str, Any] | None:
        path = settings.GOOGLE_CALENDAR_TOKEN_PATH
        if not path.exists():
            return None

        try:
            return json.loads(path.read_text())
        except (ValueError, OSError):
            return None

    def _write_token_file(self, token_data: dict[str, Any]) -> None:
        path = settings.GOOGLE_CALENDAR_TOKEN_PATH
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(token_data))
