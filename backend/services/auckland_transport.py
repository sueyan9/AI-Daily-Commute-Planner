from __future__ import annotations

import csv
import io
import math
import zipfile
from collections import defaultdict
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

import requests

from core.config import settings


@dataclass
class StopRecord:
    stop_id: str
    stop_name: str
    stop_lat: float
    stop_lon: float


@dataclass
class RouteRecord:
    route_id: str
    short_name: str
    long_name: str
    route_type: str


@dataclass
class TripRecord:
    trip_id: str
    route_id: str
    service_id: str
    headsign: str


@dataclass
class StopTimeRecord:
    stop_id: str
    arrival_seconds: int | None
    departure_seconds: int | None
    stop_sequence: int


class AucklandTransportService:
    TIMEZONE = ZoneInfo("Pacific/Auckland")
    MAX_WALKING_DISTANCE_METERS = 800
    MAX_STOPS_PER_SIDE = 8
    _dataset_cache: dict | None = None
    _dataset_cache_mtime: float | None = None

    def get_transit_option(
        self,
        *,
        origin_latitude: float,
        origin_longitude: float,
        destination_latitude: float,
        destination_longitude: float,
        destination_label: str,
        arrival_time: str | None,
    ) -> dict:
        if not settings.AUCKLAND_TRANSPORT_API_KEY:
            return {
                "available": False,
                "status": "Auckland Transport API key is not configured yet.",
            }

        try:
            dataset = self._load_dataset()
        except Exception:
            return {
                "available": False,
                "status": "Auckland Transport GTFS data could not be loaded.",
            }

        now = datetime.now(self.TIMEZONE)
        target_arrival = self._build_target_arrival(now=now, arrival_time=arrival_time)

        origin_stops = self._find_nearby_stops(
            dataset["stops"],
            latitude=origin_latitude,
            longitude=origin_longitude,
        )
        destination_stops = self._find_nearby_stops(
            dataset["stops"],
            latitude=destination_latitude,
            longitude=destination_longitude,
        )

        if not origin_stops:
            return {
                "available": False,
                "status": "No nearby Auckland Transport stops were found near your current location.",
            }

        if not destination_stops:
            return {
                "available": False,
                "status": f"No nearby Auckland Transport stops were found near {destination_label}.",
            }

        active_services = self._get_active_service_ids(
            calendar=dataset["calendar"],
            calendar_dates=dataset["calendar_dates"],
            service_date=now.date(),
        )

        if not active_services:
            return {
                "available": False,
                "status": "No active Auckland Transport services were found for today.",
            }

        trip_updates = self._fetch_trip_updates()
        alerts = self._fetch_service_alerts()

        candidates = self._build_candidates(
            dataset=dataset,
            origin_stops=origin_stops,
            destination_stops=destination_stops,
            active_services=active_services,
            trip_updates=trip_updates,
            now=now,
            target_arrival=target_arrival,
        )

        if not candidates:
            return {
                "available": False,
                "status": "No direct Auckland Transport service was found for this trip right now.",
            }

        best_candidate = candidates[0]
        sibling_departures = [
            candidate for candidate in candidates
            if candidate["route_id"] == best_candidate["route_id"]
            and candidate["origin_stop_id"] == best_candidate["origin_stop_id"]
        ][:3]
        matched_alerts = self._match_alerts(
            alerts=alerts,
            route_id=best_candidate["route_id"],
            stop_ids={best_candidate["origin_stop_id"], best_candidate["destination_stop_id"]},
        )

        first_delay = best_candidate.get("delay_minutes")
        if first_delay and first_delay > 0:
            realtime_status = f"Delayed {first_delay} mins"
        else:
            realtime_status = "No delays reported"

        if matched_alerts:
            realtime_status = f"{realtime_status}. {matched_alerts[0]}"

        return {
            "available": True,
            "status": realtime_status,
            "route_label": best_candidate["route_label"],
            "route_headsign": best_candidate["headsign"],
            "origin_stop_name": best_candidate["origin_stop_name"],
            "destination_stop_name": best_candidate["destination_stop_name"],
            "departure_time": best_candidate["departure_time"],
            "arrival_time": best_candidate["arrival_time"],
            "travel_time_minutes": best_candidate["travel_time_minutes"],
            "delay_minutes": best_candidate.get("delay_minutes"),
            "next_departures": [
                {
                    "time": candidate["departure_time"],
                    "scheduled_time": candidate["scheduled_departure_time"],
                    "delay_minutes": candidate.get("delay_minutes"),
                    "status": self._format_departure_status(candidate.get("delay_minutes")),
                }
                for candidate in sibling_departures
            ],
            "alerts": matched_alerts,
            "summary": (
                f"Catch {best_candidate['route_label']} from {best_candidate['origin_stop_name']} at "
                f"{best_candidate['departure_time']}."
            ),
        }

    def _load_dataset(self) -> dict:
        cache_path = settings.AUCKLAND_TRANSPORT_GTFS_CACHE_PATH
        cache_path.parent.mkdir(parents=True, exist_ok=True)

        if not cache_path.exists() or self._should_refresh_cache(cache_path):
            response = requests.get(
                settings.AUCKLAND_TRANSPORT_GTFS_URL,
                timeout=settings.AUCKLAND_TRANSPORT_TIMEOUT_SECONDS,
            )
            response.raise_for_status()
            cache_path.write_bytes(response.content)

        mtime = cache_path.stat().st_mtime
        if self._dataset_cache is not None and self._dataset_cache_mtime == mtime:
            return self._dataset_cache

        with zipfile.ZipFile(cache_path) as archive:
            dataset = {
                "stops": self._load_stops(archive),
                "routes": self._load_routes(archive),
                "trips": self._load_trips(archive),
                "stop_times": self._load_stop_times(archive),
                "calendar": self._load_calendar(archive),
                "calendar_dates": self._load_calendar_dates(archive),
            }

        self._dataset_cache = dataset
        self._dataset_cache_mtime = mtime
        return dataset

    def _should_refresh_cache(self, cache_path: Path) -> bool:
        last_updated = datetime.fromtimestamp(cache_path.stat().st_mtime, tz=self.TIMEZONE)
        return datetime.now(self.TIMEZONE) - last_updated > timedelta(hours=12)

    def _load_stops(self, archive: zipfile.ZipFile) -> dict[str, StopRecord]:
        stops: dict[str, StopRecord] = {}
        for row in self._read_csv(archive, "stops.txt"):
            if row.get("location_type") not in {"", "0", None}:
                continue

            stop_id = row.get("stop_id")
            stop_name = row.get("stop_name")
            stop_lat = row.get("stop_lat")
            stop_lon = row.get("stop_lon")
            if not stop_id or not stop_name or not stop_lat or not stop_lon:
                continue

            stops[stop_id] = StopRecord(
                stop_id=stop_id,
                stop_name=stop_name,
                stop_lat=float(stop_lat),
                stop_lon=float(stop_lon),
            )

        return stops

    def _load_routes(self, archive: zipfile.ZipFile) -> dict[str, RouteRecord]:
        routes: dict[str, RouteRecord] = {}
        for row in self._read_csv(archive, "routes.txt"):
            route_id = row.get("route_id")
            if not route_id:
                continue

            routes[route_id] = RouteRecord(
                route_id=route_id,
                short_name=(row.get("route_short_name") or "").strip(),
                long_name=(row.get("route_long_name") or "").strip(),
                route_type=(row.get("route_type") or "").strip(),
            )

        return routes

    def _load_trips(self, archive: zipfile.ZipFile) -> dict[str, dict]:
        trips_by_id: dict[str, TripRecord] = {}
        trips_by_route: dict[str, list[TripRecord]] = defaultdict(list)

        for row in self._read_csv(archive, "trips.txt"):
            trip_id = row.get("trip_id")
            route_id = row.get("route_id")
            service_id = row.get("service_id")
            if not trip_id or not route_id or not service_id:
                continue

            trip = TripRecord(
                trip_id=trip_id,
                route_id=route_id,
                service_id=service_id,
                headsign=(row.get("trip_headsign") or "").strip(),
            )
            trips_by_id[trip_id] = trip
            trips_by_route[route_id].append(trip)

        return {
            "by_id": trips_by_id,
            "by_route": trips_by_route,
        }

    def _load_stop_times(self, archive: zipfile.ZipFile) -> dict[str, list[StopTimeRecord]]:
        stop_times: dict[str, list[StopTimeRecord]] = defaultdict(list)

        for row in self._read_csv(archive, "stop_times.txt"):
            trip_id = row.get("trip_id")
            stop_id = row.get("stop_id")
            stop_sequence = row.get("stop_sequence")
            if not trip_id or not stop_id or not stop_sequence:
                continue

            stop_times[trip_id].append(
                StopTimeRecord(
                    stop_id=stop_id,
                    arrival_seconds=self._parse_gtfs_time(row.get("arrival_time")),
                    departure_seconds=self._parse_gtfs_time(row.get("departure_time")),
                    stop_sequence=int(stop_sequence),
                )
            )

        for records in stop_times.values():
            records.sort(key=lambda record: record.stop_sequence)

        return stop_times

    def _load_calendar(self, archive: zipfile.ZipFile) -> dict[str, dict]:
        calendar: dict[str, dict] = {}
        for row in self._read_csv(archive, "calendar.txt"):
            service_id = row.get("service_id")
            start_date = row.get("start_date")
            end_date = row.get("end_date")
            if not service_id or not start_date or not end_date:
                continue

            calendar[service_id] = {
                "monday": row.get("monday") == "1",
                "tuesday": row.get("tuesday") == "1",
                "wednesday": row.get("wednesday") == "1",
                "thursday": row.get("thursday") == "1",
                "friday": row.get("friday") == "1",
                "saturday": row.get("saturday") == "1",
                "sunday": row.get("sunday") == "1",
                "start_date": datetime.strptime(start_date, "%Y%m%d").date(),
                "end_date": datetime.strptime(end_date, "%Y%m%d").date(),
            }

        return calendar

    def _load_calendar_dates(self, archive: zipfile.ZipFile) -> dict[date, dict[str, bool]]:
        calendar_dates: dict[date, dict[str, bool]] = defaultdict(dict)
        for row in self._read_csv(archive, "calendar_dates.txt"):
            service_id = row.get("service_id")
            raw_date = row.get("date")
            exception_type = row.get("exception_type")
            if not service_id or not raw_date or not exception_type:
                continue

            service_date = datetime.strptime(raw_date, "%Y%m%d").date()
            calendar_dates[service_date][service_id] = exception_type == "1"

        return calendar_dates

    def _read_csv(self, archive: zipfile.ZipFile, filename: str) -> list[dict[str, str]]:
        with archive.open(filename) as file_handle:
            content = io.TextIOWrapper(file_handle, encoding="utf-8-sig")
            return list(csv.DictReader(content))

    def _find_nearby_stops(
        self,
        stops: dict[str, StopRecord],
        *,
        latitude: float,
        longitude: float,
    ) -> list[dict]:
        nearby: list[dict] = []

        for stop in stops.values():
            distance = self._distance_meters(
                latitude,
                longitude,
                stop.stop_lat,
                stop.stop_lon,
            )
            if distance > self.MAX_WALKING_DISTANCE_METERS:
                continue

            nearby.append(
                {
                    "stop_id": stop.stop_id,
                    "stop_name": stop.stop_name,
                    "distance_meters": round(distance),
                }
            )

        nearby.sort(key=lambda stop: stop["distance_meters"])
        return nearby[: self.MAX_STOPS_PER_SIDE]

    def _build_candidates(
        self,
        *,
        dataset: dict,
        origin_stops: list[dict],
        destination_stops: list[dict],
        active_services: set[str],
        trip_updates: dict[str, dict[str, dict]],
        now: datetime,
        target_arrival: datetime | None,
    ) -> list[dict]:
        origin_stop_ids = {stop["stop_id"] for stop in origin_stops}
        destination_stop_ids = {stop["stop_id"] for stop in destination_stops}
        route_ids = self._find_route_overlap(
            stop_times=dataset["stop_times"],
            trips_by_id=dataset["trips"]["by_id"],
            origin_stop_ids=origin_stop_ids,
            destination_stop_ids=destination_stop_ids,
        )

        now_seconds = now.hour * 3600 + now.minute * 60 + now.second
        candidates: list[dict] = []

        for route_id in route_ids:
            for trip in dataset["trips"]["by_route"].get(route_id, []):
                if trip.service_id not in active_services:
                    continue

                stop_times = dataset["stop_times"].get(trip.trip_id) or []
                origin_match = None
                destination_match = None

                for stop_time in stop_times:
                    if origin_match is None and stop_time.stop_id in origin_stop_ids:
                        origin_match = stop_time
                        continue

                    if origin_match and stop_time.stop_id in destination_stop_ids:
                        destination_match = stop_time
                        break

                if origin_match is None or destination_match is None:
                    continue

                scheduled_departure = origin_match.departure_seconds or origin_match.arrival_seconds
                scheduled_arrival = destination_match.arrival_seconds or destination_match.departure_seconds
                if scheduled_departure is None or scheduled_arrival is None:
                    continue

                realtime_update = trip_updates.get(trip.trip_id, {}).get(origin_match.stop_id, {})
                destination_update = trip_updates.get(trip.trip_id, {}).get(destination_match.stop_id, {})

                predicted_departure = realtime_update.get("departure_epoch") or realtime_update.get("arrival_epoch")
                predicted_arrival = destination_update.get("arrival_epoch") or destination_update.get("departure_epoch")

                scheduled_departure_dt = self._seconds_to_datetime(now.date(), scheduled_departure)
                scheduled_arrival_dt = self._seconds_to_datetime(now.date(), scheduled_arrival)

                predicted_departure_dt = predicted_departure or scheduled_departure_dt
                predicted_arrival_dt = predicted_arrival or scheduled_arrival_dt

                if predicted_departure_dt < now - timedelta(minutes=1):
                    continue

                if target_arrival and predicted_arrival_dt > target_arrival:
                    continue

                route = dataset["routes"].get(route_id)
                route_label = (
                    route.short_name
                    if route and route.short_name
                    else route.long_name
                    if route and route.long_name
                    else "Public transport"
                )

                delay_minutes = None
                delay_seconds = realtime_update.get("delay_seconds")
                if delay_seconds is not None:
                    delay_minutes = round(delay_seconds / 60)

                candidates.append(
                    {
                        "trip_id": trip.trip_id,
                        "route_id": route_id,
                        "route_label": route_label,
                        "headsign": trip.headsign,
                        "origin_stop_id": origin_match.stop_id,
                        "origin_stop_name": dataset["stops"][origin_match.stop_id].stop_name,
                        "destination_stop_id": destination_match.stop_id,
                        "destination_stop_name": dataset["stops"][destination_match.stop_id].stop_name,
                        "scheduled_departure_time": self._format_datetime(scheduled_departure_dt),
                        "scheduled_arrival_time": self._format_datetime(scheduled_arrival_dt),
                        "departure_time": self._format_datetime(predicted_departure_dt),
                        "arrival_time": self._format_datetime(predicted_arrival_dt),
                        "departure_dt": predicted_departure_dt,
                        "arrival_dt": predicted_arrival_dt,
                        "travel_time_minutes": round(
                            (predicted_arrival_dt - predicted_departure_dt).total_seconds() / 60
                        ),
                        "delay_minutes": delay_minutes,
                    }
                )

        candidates.sort(key=lambda candidate: candidate["departure_dt"])
        return candidates

    def _find_route_overlap(
        self,
        *,
        stop_times: dict[str, list[StopTimeRecord]],
        trips_by_id: dict[str, TripRecord],
        origin_stop_ids: set[str],
        destination_stop_ids: set[str],
    ) -> set[str]:
        route_ids: set[str] = set()

        for trip_id, records in stop_times.items():
            saw_origin = False
            for record in records:
                if record.stop_id in origin_stop_ids:
                    saw_origin = True
                    continue

                if saw_origin and record.stop_id in destination_stop_ids:
                    trip = trips_by_id.get(trip_id)
                    if trip:
                        route_ids.add(trip.route_id)
                    break

        return route_ids

    def _get_active_service_ids(
        self,
        *,
        calendar: dict[str, dict],
        calendar_dates: dict[date, dict[str, bool]],
        service_date: date,
    ) -> set[str]:
        weekday = service_date.strftime("%A").lower()
        active_services = {
            service_id
            for service_id, details in calendar.items()
            if details["start_date"] <= service_date <= details["end_date"]
            and details.get(weekday, False)
        }

        for service_id, is_added in calendar_dates.get(service_date, {}).items():
            if is_added:
                active_services.add(service_id)
            else:
                active_services.discard(service_id)

        return active_services

    def _fetch_trip_updates(self) -> dict[str, dict[str, dict]]:
        response = requests.get(
            settings.AUCKLAND_TRANSPORT_TRIP_UPDATES_URL,
            headers=self._build_headers(),
            timeout=settings.AUCKLAND_TRANSPORT_TIMEOUT_SECONDS,
        )
        response.raise_for_status()

        data = response.json()
        trip_updates: dict[str, dict[str, dict]] = defaultdict(dict)

        for entity in data.get("entity", []):
            trip_update = entity.get("trip_update") or {}
            trip = trip_update.get("trip") or {}
            trip_id = trip.get("trip_id")
            if not trip_id:
                continue

            for stop_time_update in trip_update.get("stop_time_update", []):
                stop_id = stop_time_update.get("stop_id")
                if not stop_id:
                    continue

                departure = stop_time_update.get("departure") or {}
                arrival = stop_time_update.get("arrival") or {}
                trip_updates[trip_id][stop_id] = {
                    "departure_epoch": self._epoch_to_datetime(departure.get("time")),
                    "arrival_epoch": self._epoch_to_datetime(arrival.get("time")),
                    "delay_seconds": departure.get("delay", arrival.get("delay")),
                }

        return trip_updates

    def _fetch_service_alerts(self) -> list[dict]:
        response = requests.get(
            settings.AUCKLAND_TRANSPORT_SERVICE_ALERTS_URL,
            headers=self._build_headers(),
            timeout=settings.AUCKLAND_TRANSPORT_TIMEOUT_SECONDS,
        )
        response.raise_for_status()

        data = response.json()
        alerts: list[dict] = []
        for entity in data.get("entity", []):
            alert = entity.get("alert") or {}
            informed_entities = alert.get("informed_entity") or []
            header_text = self._extract_translated_text(alert.get("header_text"))
            description_text = self._extract_translated_text(alert.get("description_text"))
            message = header_text or description_text

            if not message:
                continue

            alerts.append(
                {
                    "message": message,
                    "entities": informed_entities,
                }
            )

        return alerts

    def _match_alerts(
        self,
        *,
        alerts: list[dict],
        route_id: str,
        stop_ids: set[str],
    ) -> list[str]:
        matched: list[str] = []

        for alert in alerts:
            entities = alert.get("entities") or []
            if not entities:
                matched.append(alert["message"])
                continue

            for entity in entities:
                if entity.get("route_id") == route_id or entity.get("stop_id") in stop_ids:
                    matched.append(alert["message"])
                    break

        return matched[:2]

    def _build_headers(self) -> dict[str, str]:
        return {
            "Ocp-Apim-Subscription-Key": settings.AUCKLAND_TRANSPORT_API_KEY or "",
            "Accept": "application/json",
        }

    def _format_departure_status(self, delay_minutes: int | None) -> str:
        if delay_minutes is None:
            return "Scheduled"
        if delay_minutes > 0:
            return f"Delayed {delay_minutes} mins"
        if delay_minutes < 0:
            return f"{abs(delay_minutes)} mins early"
        return "On time"

    def _build_target_arrival(
        self,
        *,
        now: datetime,
        arrival_time: str | None,
    ) -> datetime | None:
        if not arrival_time:
            return None

        try:
            hours, minutes = [int(part) for part in arrival_time.split(":", maxsplit=1)]
        except ValueError:
            return None

        target = now.replace(hour=hours, minute=minutes, second=0, microsecond=0)
        if target < now - timedelta(hours=3):
            target += timedelta(days=1)

        return target

    def _seconds_to_datetime(self, service_date: date, seconds: int) -> datetime:
        midnight = datetime.combine(service_date, datetime.min.time(), tzinfo=self.TIMEZONE)
        return midnight + timedelta(seconds=seconds)

    def _epoch_to_datetime(self, epoch_seconds: int | None) -> datetime | None:
        if epoch_seconds is None:
            return None
        return datetime.fromtimestamp(epoch_seconds, tz=self.TIMEZONE)

    def _format_datetime(self, value: datetime) -> str:
        return value.strftime("%-I:%M %p")

    def _parse_gtfs_time(self, raw_value: str | None) -> int | None:
        if not raw_value:
            return None

        try:
            hours, minutes, seconds = [int(part) for part in raw_value.split(":")]
        except ValueError:
            return None

        return hours * 3600 + minutes * 60 + seconds

    def _extract_translated_text(self, value: dict | None) -> str | None:
        if not value:
            return None

        translations = value.get("translation") or []
        for translation in translations:
            text = (translation.get("text") or "").strip()
            if text:
                return text

        return None

    def _distance_meters(
        self,
        latitude_a: float,
        longitude_a: float,
        latitude_b: float,
        longitude_b: float,
    ) -> float:
        radius = 6371000

        phi_a = math.radians(latitude_a)
        phi_b = math.radians(latitude_b)
        delta_phi = math.radians(latitude_b - latitude_a)
        delta_lambda = math.radians(longitude_b - longitude_a)

        haversine = (
            math.sin(delta_phi / 2) ** 2
            + math.cos(phi_a) * math.cos(phi_b) * math.sin(delta_lambda / 2) ** 2
        )
        return 2 * radius * math.atan2(math.sqrt(haversine), math.sqrt(1 - haversine))
