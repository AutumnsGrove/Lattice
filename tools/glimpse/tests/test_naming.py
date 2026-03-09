"""Tests for glimpse.utils.naming — filename generation from capture parameters."""

import pytest

from glimpse.utils.naming import url_to_slug, generate_filename, resolve_output_path


class TestUrlToSlug:
    def test_simple_domain(self):
        assert url_to_slug("https://grove.place") == "grove-place"

    def test_subdomain(self):
        assert url_to_slug("https://plant.grove.place") == "plant-grove-place"

    def test_with_path(self):
        assert url_to_slug("https://grove.place/about") == "grove-place-about"

    def test_trailing_slash_stripped(self):
        assert url_to_slug("https://grove.place/about/") == "grove-place-about"

    def test_port_stripped(self):
        assert url_to_slug("http://localhost:3000/app") == "localhost-app"

    def test_deep_path(self):
        slug = url_to_slug("https://plant.grove.place/blog/post-title")
        assert slug == "plant-grove-place-blog-post-title"

    def test_special_characters(self):
        slug = url_to_slug("https://grove.place/path?q=test&a=1")
        assert ".." not in slug
        assert "?" not in slug
        assert "&" not in slug

    def test_empty_fallback(self):
        """Edge case: if slugification produces empty string, fallback to 'capture'."""
        # This is hard to trigger with real URLs but tests the safety net
        assert url_to_slug("https:///") == "capture"


class TestGenerateFilename:
    def test_basic(self):
        assert generate_filename("https://grove.place") == "grove-place.png"

    def test_with_season(self):
        result = generate_filename("https://grove.place", season="autumn")
        assert result == "grove-place-autumn.png"

    def test_with_theme(self):
        result = generate_filename("https://grove.place", theme="dark")
        assert result == "grove-place-dark.png"

    def test_with_season_and_theme(self):
        result = generate_filename(
            "https://grove.place", season="autumn", theme="dark"
        )
        assert result == "grove-place-autumn-dark.png"

    def test_with_selector(self):
        result = generate_filename(
            "https://grove.place", selector=".hero-section"
        )
        assert result == "grove-place-hero-section.png"

    def test_full_combination(self):
        result = generate_filename(
            "https://grove.place",
            season="midnight",
            theme="dark",
            selector="header",
        )
        assert result == "grove-place-midnight-dark-header.png"

    def test_jpeg_format(self):
        result = generate_filename("https://grove.place", fmt="jpeg")
        assert result == "grove-place.jpeg"

    def test_none_values_omitted(self):
        """None season/theme/selector should not appear in filename."""
        result = generate_filename(
            "https://grove.place", season=None, theme=None, selector=None
        )
        assert result == "grove-place.png"


class TestResolveOutputPath:
    def test_explicit_output(self, tmp_path):
        result = resolve_output_path(
            output=str(tmp_path / "custom.png"),
            url="https://grove.place",
        )
        assert result.name == "custom.png"

    def test_auto_generated(self, tmp_path):
        result = resolve_output_path(
            output=None,
            url="https://grove.place",
            season="autumn",
            theme="dark",
            output_dir=str(tmp_path / "screenshots"),
        )
        assert result.name == "grove-place-autumn-dark.png"
        assert "screenshots" in str(result)

    def test_path_includes_output_dir(self, tmp_path):
        """Output dir is part of the resolved path (creation deferred to engine)."""
        out_dir = tmp_path / "deep" / "nested" / "dir"
        out_dir.mkdir(parents=True)
        result = resolve_output_path(
            output=None,
            url="https://grove.place",
            output_dir=str(out_dir),
        )
        assert str(out_dir) in str(result.parent)

    def test_reject_traversal_in_output(self):
        with pytest.raises(Exception, match="traversal"):
            resolve_output_path(
                output="../../../etc/evil.png",
                url="https://grove.place",
            )
