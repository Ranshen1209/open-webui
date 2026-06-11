"""Pure helpers for Sakrylle model-group support (no app/db deps; unit-testable)."""

from urllib.parse import urlparse, urlunparse, urlencode, parse_qsl


def append_query_params(url: str, params: dict | None) -> str:
    """Append query params to a URL, preserving any existing ones.

    Returns the URL unchanged when params is falsy.
    """
    if not params:
        return url
    parts = urlparse(url)
    merged = dict(parse_qsl(parts.query))
    merged.update({str(k): str(v) for k, v in params.items()})
    return urlunparse(parts._replace(query=urlencode(merged)))


def apply_display_name(model: dict) -> None:
    """Use the upstream clean `display_name` as the UI `name` when present.

    The `id` is left untouched so any `<group_id>:` routing prefix is preserved.
    """
    if model.get('display_name'):
        model['name'] = model['display_name']
