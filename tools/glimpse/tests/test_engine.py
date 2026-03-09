"""Tests for glimpse.capture.engine — init script generation.

Tests the pure-logic _build_init_script function without requiring
a running browser. Integration tests for actual captures would go
in a separate test file with Playwright fixtures.
"""

import pytest

from glimpse.capture.injector import build_init_script as _build_init_script


class TestBuildInitScript:
    def test_season_only(self):
        script = _build_init_script(season="autumn")
        assert "grove-season" in script
        assert "'autumn'" in script

    def test_theme_light(self):
        script = _build_init_script(theme="light")
        assert "localStorage.setItem('theme', 'light')" in script
        assert "classList.remove('dark')" in script

    def test_theme_dark(self):
        script = _build_init_script(theme="dark")
        assert "localStorage.setItem('theme', 'dark')" in script
        assert "classList.add('dark')" in script

    def test_theme_system(self):
        """System theme should set localStorage but not touch classList."""
        script = _build_init_script(theme="system")
        assert "localStorage.setItem('theme', 'system')" in script
        assert "classList" not in script

    def test_grove_mode_true(self):
        script = _build_init_script(grove_mode=True)
        assert "localStorage.setItem('grove-mode', 'true')" in script

    def test_grove_mode_false(self):
        script = _build_init_script(grove_mode=False)
        assert "localStorage.setItem('grove-mode', 'false')" in script

    def test_all_combined(self):
        script = _build_init_script(
            season="midnight", theme="dark", grove_mode=True
        )
        assert "grove-season" in script
        assert "'midnight'" in script
        assert "'dark'" in script
        assert "grove-mode" in script

    def test_none_returns_none(self):
        """No values set should return None (no script needed)."""
        assert _build_init_script() is None
        assert _build_init_script(season=None, theme=None, grove_mode=None) is None

    def test_reject_unsafe_season(self):
        """Defense-in-depth: engine rejects values not in its allowlist."""
        with pytest.raises(ValueError, match="Unsafe season"):
            _build_init_script(season="'; alert('xss');//")

    def test_reject_unsafe_theme(self):
        with pytest.raises(ValueError, match="Unsafe theme"):
            _build_init_script(theme="<script>bad</script>")

    def test_all_valid_seasons_accepted(self):
        for season in ["spring", "summer", "autumn", "winter", "midnight"]:
            script = _build_init_script(season=season)
            assert season in script

    def test_all_valid_themes_accepted(self):
        for theme in ["light", "dark", "system"]:
            script = _build_init_script(theme=theme)
            assert theme in script
