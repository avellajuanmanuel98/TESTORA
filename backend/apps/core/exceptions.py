from rest_framework.response import Response
from rest_framework.views import exception_handler


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
        payload = {"detail": "Validation failed.", "errors": detail}

    return Response(payload, status=response.status_code, headers=response.headers)
