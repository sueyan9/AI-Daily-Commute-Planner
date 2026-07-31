from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any
from zoneinfo import ZoneInfo

from services.google_maps import GoogleMapsService

TIMEZONE = ZoneInfo("Pacific/Auckland")

# Tool definitions are provider-neutral: {"name", "description", "parameters"}.
# The agent converts them to the Anthropic or OpenAI wire format.
#
# Origin and destination are deliberately NOT tool parameters — they are bound
# from the request context, so the model chooses *when* and *for which departure
# window* to fetch a route, never *where to*.

DRIVING_ROUTE_TOOL = {
    "name": "get_driving_route",
    "description": (
        "Get the driving route from the user's current location to their destination, "
        "with live-traffic duration, traffic-free duration, and distance. "
        "Pass departure_time to estimate a future departure instead of right now."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "departure_time": {
                "type": "string",
                "description": (
                    "Optional departure time as HH:MM (24-hour, Pacific/Auckland). "
                    "A time already past today means tomorrow. Omit to depart now."
                ),
            },
        },
        "required": [],
    },
}

TRANSIT_ROUTE_TOOL = {
    "name": "get_transit_route",
    "description": (
        "Get the public transport route from the user's current location to their destination, "
        "with departure/arrival times, travel time, transfers, and line names. "
        "Pass departure_time to plan a future departure instead of right now."
    ),
    "parameters": DRIVING_ROUTE_TOOL["parameters"],
}


def parse_departure_time(value: str | None) -> datetime | None:
    """Turns "HH:MM" into the next occurrence of that time in Auckland (today,
    or tomorrow if it has already passed), matching the planner's convention."""
    if not value:
        return None

    try:
        hours, minutes = [int(part) for part in value.split(":", maxsplit=1)]
        departure = datetime.now(TIMEZONE).replace(
            hour=hours, minute=minutes, second=0, microsecond=0
        )
    except ValueError:
        return None

    if departure < datetime.now(TIMEZONE):
        departure += timedelta(days=1)

    return departure


def run_driving_route(
    google_maps: GoogleMapsService,
    *,
    origin: str,
    destination: str,
    arguments: dict[str, Any],
) -> dict[str, Any]:
    departure = parse_departure_time(arguments.get("departure_time"))
    route = google_maps.get_driving_route(
        origin=origin,
        destination=destination,
        departure_time=departure,
    )

    if route is None:
        return {"error": "No driving route was found for this trip right now."}

    return route


def run_transit_route(
    google_maps: GoogleMapsService,
    *,
    origin_latitude: float,
    origin_longitude: float,
    destination_latitude: float,
    destination_longitude: float,
    arguments: dict[str, Any],
) -> dict[str, Any]:
    departure = parse_departure_time(arguments.get("departure_time"))
    return google_maps.get_transit_route(
        origin_latitude=origin_latitude,
        origin_longitude=origin_longitude,
        destination_latitude=destination_latitude,
        destination_longitude=destination_longitude,
        departure_time=departure,
    )
