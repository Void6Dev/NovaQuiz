from urllib.parse import urlparse

from django.conf import settings
from django.http import JsonResponse

_UNSAFE_METHODS = {'POST', 'PUT', 'PATCH', 'DELETE'}


def _allowed_origins():
    """Explicit cross-origin allowlist (these include scheme + port)."""
    origins = set()
    for o in getattr(settings, 'CSRF_TRUSTED_ORIGINS', []):
        origins.add(o.rstrip('/'))
    for o in getattr(settings, 'CORS_ALLOWED_ORIGINS', []):
        origins.add(o.rstrip('/'))
    return origins


class ApiOriginCheckMiddleware:
    """CSRF defence for the cookie-authenticated JSON API.

    The /api/ views are @csrf_exempt (the SPA sends its own X-CSRFToken and some
    calls come cross-origin in dev), which on its own leaves session-cookie auth
    open to CSRF via HTML form POSTs. Browsers always attach an Origin header to
    cross-site unsafe requests, so we reject any unsafe /api/ request whose Origin
    (or Referer host) is not in the allowlist. Requests with neither header are
    non-browser clients (curl, mobile) which cannot be driven by a CSRF attack.
    """

    def __init__(self, get_response):
        self.get_response = get_response
        self._allowed = None

    def __call__(self, request):
        if (
            request.method in _UNSAFE_METHODS
            and request.path.startswith('/api/')
        ):
            blocked = self._is_cross_origin(request)
            if blocked:
                return JsonResponse({'error': 'Cross-origin request blocked'}, status=403)
        return self.get_response(request)

    def _is_cross_origin(self, request):
        if self._allowed is None:
            self._allowed = _allowed_origins()

        host = request.get_host()  # includes port, e.g. 127.0.0.1:8000

        origin = request.META.get('HTTP_ORIGIN')
        if origin:
            if origin.rstrip('/') in self._allowed:
                return False
            # Same-origin: Origin's host:port matches the request Host.
            return urlparse(origin).netloc != host

        referer = request.META.get('HTTP_REFERER')
        if referer:
            parsed = urlparse(referer)
            ref_origin = f'{parsed.scheme}://{parsed.netloc}'
            if ref_origin.rstrip('/') in self._allowed:
                return False
            return parsed.netloc != host

        # No Origin and no Referer → not a browser form submission; allow.
        return False
