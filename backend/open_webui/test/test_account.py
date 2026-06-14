from open_webui.routers.account import normalize_balance


def test_normalize_balance_success():
    out = normalize_balance(
        {
            'credit_remaining': 8.94,
            'currency_symbol': '¥',
            'currency_display': 'CNY',
            'group_name': 'GPT-Pro',
            'rate_multiplier': 1.0,
            'extra_ignored': 'x',
        }
    )
    assert out == {
        'available': True,
        'credit_remaining': 8.94,
        'currency_symbol': '¥',
        'currency_display': 'CNY',
        'group_name': 'GPT-Pro',
        'rate_multiplier': 1.0,
    }


def test_normalize_balance_missing_credit_is_unavailable():
    assert normalize_balance({'currency_symbol': '¥'}) == {'available': False}


def test_normalize_balance_none_credit_is_unavailable():
    assert normalize_balance({'credit_remaining': None}) == {'available': False}


def test_normalize_balance_non_dict_is_unavailable():
    assert normalize_balance(None) == {'available': False}
    assert normalize_balance('nope') == {'available': False}


def test_normalize_balance_optional_fields_default_none():
    out = normalize_balance({'credit_remaining': 0})
    assert out['available'] is True
    assert out['credit_remaining'] == 0
    assert out['currency_symbol'] is None
    assert out['group_name'] is None
