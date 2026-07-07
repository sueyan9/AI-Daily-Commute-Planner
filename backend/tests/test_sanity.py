def test_sanity():
    assert 1 + 1 == 2


def test_app_modules_are_importable():
    # Confirms pytest resolves our absolute imports (from services.xxx,
    # from core.xxx) the same way uvicorn does — this is usually the first
    # thing that trips people up with pytest project layout.
    from core.config import settings
    from services.planner import PlannerService

    assert settings is not None
    assert PlannerService is not None
