"""Tests for glimpse.utils.validation — input boundary enforcement."""

import pytest
import click

from glimpse.utils.validation import (
    validate_url,
    validate_viewport,
    validate_quality,
    validate_format,
    validate_season,
    validate_theme,
    validate_scale,
    validate_wait,
    validate_timeout,
    VALID_SEASONS,
    VALID_THEMES,
    VALID_FORMATS,
)


# --- URL validation ---


class TestValidateUrl:
    def test_valid_https(self):
        assert validate_url("https://grove.place") == "https://grove.place"

    def test_valid_http(self):
        assert validate_url("http://localhost:3000") == "http://localhost:3000"

    def test_auto_prepend_https(self):
        """URLs without a scheme get https:// prepended."""
        assert validate_url("grove.place") == "https://grove.place"

    def test_reject_file_scheme(self):
        with pytest.raises(click.BadParameter, match="file://"):
            validate_url("file:///etc/passwd")

    def test_reject_javascript_scheme(self):
        with pytest.raises(click.BadParameter, match="javascript://"):
            validate_url("javascript://alert(1)")

    def test_reject_data_scheme(self):
        with pytest.raises(click.BadParameter, match="data://"):
            validate_url("data:text/html,<h1>hi</h1>")

    def test_reject_empty(self):
        with pytest.raises(click.BadParameter, match="empty"):
            validate_url("")

    def test_reject_too_long(self):
        long_url = "https://example.com/" + "a" * 5000
        with pytest.raises(click.BadParameter, match="maximum length"):
            validate_url(long_url)

    def test_reject_no_hostname(self):
        with pytest.raises(click.BadParameter, match="hostname"):
            validate_url("https://")

    def test_url_with_path(self):
        result = validate_url("https://grove.place/about")
        assert result == "https://grove.place/about"

    def test_url_with_query(self):
        result = validate_url("https://grove.place/search?q=test")
        assert result == "https://grove.place/search?q=test"


# --- Viewport validation ---


class TestValidateViewport:
    def test_valid_default(self):
        assert validate_viewport(1920, 1080) == (1920, 1080)

    def test_valid_mobile(self):
        assert validate_viewport(390, 844) == (390, 844)

    def test_valid_minimum(self):
        assert validate_viewport(100, 100) == (100, 100)

    def test_valid_maximum(self):
        assert validate_viewport(7680, 4320) == (7680, 4320)

    def test_reject_width_too_small(self):
        with pytest.raises(click.BadParameter, match="width"):
            validate_viewport(50, 1080)

    def test_reject_height_too_large(self):
        with pytest.raises(click.BadParameter, match="height"):
            validate_viewport(1920, 10000)

    def test_reject_negative(self):
        with pytest.raises(click.BadParameter):
            validate_viewport(-1, 1080)


# --- Quality validation ---


class TestValidateQuality:
    def test_valid_default(self):
        assert validate_quality(90) == 90

    def test_valid_minimum(self):
        assert validate_quality(1) == 1

    def test_valid_maximum(self):
        assert validate_quality(100) == 100

    def test_reject_zero(self):
        with pytest.raises(click.BadParameter):
            validate_quality(0)

    def test_reject_over_100(self):
        with pytest.raises(click.BadParameter):
            validate_quality(101)


# --- Format validation ---


class TestValidateFormat:
    def test_png(self):
        assert validate_format("png") == "png"

    def test_jpeg(self):
        assert validate_format("jpeg") == "jpeg"

    def test_case_insensitive(self):
        assert validate_format("PNG") == "png"
        assert validate_format("JPEG") == "jpeg"

    def test_reject_gif(self):
        with pytest.raises(click.BadParameter, match="gif"):
            validate_format("gif")

    def test_reject_webp(self):
        with pytest.raises(click.BadParameter):
            validate_format("webp")


# --- Season validation ---


class TestValidateSeason:
    @pytest.mark.parametrize("season", sorted(VALID_SEASONS))
    def test_all_valid_seasons(self, season):
        assert validate_season(season) == season

    def test_case_insensitive(self):
        assert validate_season("AUTUMN") == "autumn"
        assert validate_season("Midnight") == "midnight"

    def test_reject_invalid(self):
        with pytest.raises(click.BadParameter):
            validate_season("fall")


# --- Theme validation ---


class TestValidateTheme:
    @pytest.mark.parametrize("theme", sorted(VALID_THEMES))
    def test_all_valid_themes(self, theme):
        assert validate_theme(theme) == theme

    def test_case_insensitive(self):
        assert validate_theme("DARK") == "dark"

    def test_reject_invalid(self):
        with pytest.raises(click.BadParameter):
            validate_theme("sepia")


# --- Scale validation ---


class TestValidateScale:
    def test_valid_1x(self):
        assert validate_scale(1) == 1

    def test_valid_2x(self):
        assert validate_scale(2) == 2

    def test_valid_max(self):
        assert validate_scale(4) == 4

    def test_reject_zero(self):
        with pytest.raises(click.BadParameter):
            validate_scale(0)

    def test_reject_too_high(self):
        with pytest.raises(click.BadParameter):
            validate_scale(5)


# --- Wait validation ---


class TestValidateWait:
    def test_valid_zero(self):
        assert validate_wait(0) == 0

    def test_valid_default(self):
        assert validate_wait(500) == 500

    def test_reject_negative(self):
        with pytest.raises(click.BadParameter, match="negative"):
            validate_wait(-1)

    def test_reject_too_long(self):
        with pytest.raises(click.BadParameter, match="maximum"):
            validate_wait(120000)


# --- Timeout validation ---


class TestValidateTimeout:
    def test_valid_default(self):
        assert validate_timeout(30000) == 30000

    def test_reject_zero(self):
        with pytest.raises(click.BadParameter, match="positive"):
            validate_timeout(0)

    def test_reject_negative(self):
        with pytest.raises(click.BadParameter, match="positive"):
            validate_timeout(-1)

    def test_reject_too_long(self):
        with pytest.raises(click.BadParameter, match="maximum"):
            validate_timeout(200000)
