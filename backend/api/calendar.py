from fastapi import APIRouter
from fastapi.responses import HTMLResponse, RedirectResponse

from services.google_calendar import GoogleCalendarService

router = APIRouter(prefix="/calendar", tags=["Calendar"])

calendar_service = GoogleCalendarService()


@router.get("/status")
async def calendar_status():
    return {"connected": calendar_service.is_connected()}


@router.get("/oauth/login")
async def calendar_oauth_login():
    return RedirectResponse(calendar_service.build_auth_url())


@router.get("/oauth/callback")
async def calendar_oauth_callback(code: str | None = None, error: str | None = None):
    if error or not code:
        message = "Google Calendar connection was cancelled."
    elif calendar_service.exchange_code(code):
        message = "Google Calendar connected. You can close this window."
    else:
        message = "Something went wrong connecting Google Calendar. You can close this window and try again."

    return HTMLResponse(
        f"<html><body style='font-family: sans-serif; padding: 40px; text-align: center;'>"
        f"<p>{message}</p>"
        f"<script>setTimeout(() => window.close(), 1500);</script>"
        f"</body></html>"
    )


@router.post("/disconnect")
async def calendar_disconnect():
    calendar_service.disconnect()
    return {"connected": False}


@router.get("/next-event")
async def calendar_next_event():
    if not calendar_service.is_connected():
        return {"connected": False, "event": None}

    event = calendar_service.get_next_event()
    return {"connected": True, "event": event}
