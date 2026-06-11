from open_webui.utils.model_groups import append_query_params, apply_display_name


def test_append_query_params_basic():
    assert (
        append_query_params('https://api.sakrylle.com/v1/models', {'groups': 'all'})
        == 'https://api.sakrylle.com/v1/models?groups=all'
    )


def test_append_query_params_empty_returns_unchanged():
    url = 'https://api.sakrylle.com/v1/models'
    assert append_query_params(url, {}) == url
    assert append_query_params(url, None) == url


def test_append_query_params_preserves_existing():
    out = append_query_params('https://api.sakrylle.com/v1/models?foo=bar', {'groups': 'all'})
    assert 'foo=bar' in out
    assert 'groups=all' in out


def test_apply_display_name_sets_name_keeps_prefixed_id():
    model = {'id': '12:claude-opus-4-6', 'display_name': 'claude-opus-4-6'}
    apply_display_name(model)
    assert model['name'] == 'claude-opus-4-6'
    assert model['id'] == '12:claude-opus-4-6'


def test_apply_display_name_noop_without_display_name():
    model = {'id': 'gpt-4o'}
    apply_display_name(model)
    assert 'name' not in model
