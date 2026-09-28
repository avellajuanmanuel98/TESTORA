from rest_framework.response import Response
from rest_framework.views import exception_handler


def _first_message(errors):
    """Best-effort extraction of one human-readable message out of DRF's
    (possibly nested, per-field) validation error structure. Used so the
    frontend's generic error toast shows something actionable ("'Valor' es
    obligatorio para Escribir texto.") instead of a flat "Validation
    failed." — the full structure is still passed through as `errors` for
    any UI that wants to render per-field messages."""
    if isinstance(errors, list) and errors:
        return str(errors[0])
    if isinstance(errors, dict):
        for value in errors.values():
            message = _first_message(value)
            if message:
                return message
    return None


def api_exception_handler(exc, context):
    """Wraps DRF's default handler so every error response has a consistent
    shape the frontend can rely on: {"detail": str, "errors": {...} | None}.
    """
    response = exception_handler(exc, context)
    if response is None:
        return None

    detail = response.data
    if isinstance(detail, dict) and "detail" in detail and len(detail) == 1:
        payload = {"detail": detail["detail"], "errors": None}
    else:
        payload = {"detail": _first_message(detail) or "Validation failed.", "errors": detail}

    return Response(payload, status=response.status_code, headers=response.headers)
