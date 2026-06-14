import logging

import aiohttp
from fastapi import APIRouter, Depends, Request

from open_webui.env import AIOHTTP_CLIENT_SESSION_SSL
from open_webui.routers.openai import get_headers_and_cookies
from open_webui.utils.auth import get_verified_user

log = logging.getLogger(__name__)

router = APIRouter()

# Upstream gateway connection index (idx 0 == the system_oauth Sakrylle connection).
GATEWAY_IDX = 0
BALANCE_FETCH_TIMEOUT = 10

UNAVAILABLE = {'available': False}


def normalize_balance(data) -> dict:
    """Map a gateway /v1/account/balance response to the frontend shape.

    Returns {'available': False} for anything missing a numeric credit_remaining.
    """
    if not isinstance(data, dict) or data.get('credit_remaining') is None:
        return {'available': False}
    return {
        'available': True,
        'credit_remaining': data.get('credit_remaining'),
        'currency_symbol': data.get('currency_symbol'),
        'currency_display': data.get('currency_display'),
        'group_name': data.get('group_name'),
        'rate_multiplier': data.get('rate_multiplier'),
    }


@router.get('/balance')
async def get_account_balance(request: Request, user=Depends(get_verified_user)):
    """Proxy the current user's Sakrylle gateway balance.

    Forwards the user's OAuth token (system_oauth) to the gateway. Any failure
    (missing scope, no oauth session, gateway/network error) degrades silently to
    {'available': False} so the sidebar widget simply hides.
    """
    base_urls = request.app.state.config.OPENAI_API_BASE_URLS
    if not base_urls or GATEWAY_IDX >= len(base_urls):
        return UNAVAILABLE

    url = base_urls[GATEWAY_IDX]
    keys = request.app.state.config.OPENAI_API_KEYS
    key = keys[GATEWAY_IDX] if GATEWAY_IDX < len(keys) else None
    api_config = request.app.state.config.OPENAI_API_CONFIGS.get(
        str(GATEWAY_IDX),
        request.app.state.config.OPENAI_API_CONFIGS.get(url, {}),
    )

    try:
        headers, cookies = await get_headers_and_cookies(
            request, url, key, api_config, user=user
        )
        async with aiohttp.ClientSession(
            trust_env=True,
            timeout=aiohttp.ClientTimeout(total=BALANCE_FETCH_TIMEOUT),
        ) as session:
            async with session.get(
                f'{url}/account/balance',
                headers=headers,
                cookies=cookies,
                ssl=AIOHTTP_CLIENT_SESSION_SSL,
            ) as r:
                if r.status != 200:
                    log.debug(f'Balance fetch returned HTTP {r.status}')
                    return UNAVAILABLE
                data = await r.json()
    except Exception as e:
        log.debug(f'Balance fetch failed: {e}')
        return UNAVAILABLE

    return normalize_balance(data)
