"""Tests for glimpse.browse.interpreter — NL instruction parser."""

from glimpse.browse.interpreter import parse_instructions, ActionStep


class TestParseClick:
    def test_basic_click(self):
        steps = parse_instructions("click Posts")
        assert len(steps) == 1
        assert steps[0].verb == "click"
        assert steps[0].target == "Posts"

    def test_click_the(self):
        steps = parse_instructions("click the Posts link")
        assert steps[0].verb == "click"
        assert steps[0].target == "Posts link"

    def test_click_on(self):
        steps = parse_instructions("click on the navigation")
        assert steps[0].verb == "click"
        assert steps[0].target == "navigation"


class TestParseFill:
    def test_fill_with(self):
        steps = parse_instructions("fill email with test@example.com")
        assert steps[0].verb == "fill"
        assert steps[0].target == "email"
        assert steps[0].value == "test@example.com"

    def test_type_into(self):
        steps = parse_instructions("type hello into the search box")
        assert steps[0].verb == "fill"
        assert steps[0].target == "search box"
        assert steps[0].value == "hello"


class TestParseHover:
    def test_hover(self):
        steps = parse_instructions("hover over the menu")
        assert steps[0].verb == "hover"
        assert steps[0].target == "menu"

    def test_hover_without_over(self):
        steps = parse_instructions("hover the button")
        assert steps[0].verb == "hover"
        assert steps[0].target == "button"


class TestParseScroll:
    def test_scroll_down(self):
        steps = parse_instructions("scroll down")
        assert steps[0].verb == "scroll"
        assert "down" in steps[0].value

    def test_scroll_up(self):
        steps = parse_instructions("scroll up")
        assert steps[0].verb == "scroll"
        assert "up" in steps[0].value

    def test_scroll_with_amount(self):
        steps = parse_instructions("scroll down 5")
        assert steps[0].verb == "scroll"
        assert "5" in steps[0].value


class TestParseWait:
    def test_wait_default(self):
        steps = parse_instructions("wait")
        assert steps[0].verb == "wait"
        assert steps[0].value == "1"

    def test_wait_seconds(self):
        steps = parse_instructions("wait 3s")
        assert steps[0].verb == "wait"
        assert steps[0].value == "3"

    def test_wait_without_suffix(self):
        steps = parse_instructions("wait 2")
        assert steps[0].verb == "wait"
        assert steps[0].value == "2"


class TestParsePress:
    def test_press_key(self):
        steps = parse_instructions("press Enter")
        assert steps[0].verb == "press"
        assert steps[0].value == "Enter"


class TestParseGoto:
    def test_go_to(self):
        steps = parse_instructions("go to /about")
        assert steps[0].verb == "goto"
        assert steps[0].value == "/about"

    def test_navigate_to(self):
        steps = parse_instructions("navigate to /settings")
        assert steps[0].verb == "goto"
        assert steps[0].value == "/settings"

    def test_visit(self):
        steps = parse_instructions("visit /blog")
        assert steps[0].verb == "goto"
        assert steps[0].value == "/blog"


class TestParseChained:
    def test_then_separator(self):
        steps = parse_instructions("click Posts then scroll down")
        assert len(steps) == 2
        assert steps[0].verb == "click"
        assert steps[1].verb == "scroll"

    def test_comma_then_separator(self):
        steps = parse_instructions("click Posts, then scroll down")
        assert len(steps) == 2
        assert steps[0].verb == "click"
        assert steps[1].verb == "scroll"

    def test_comma_before_verb(self):
        steps = parse_instructions("click Posts, scroll down")
        assert len(steps) == 2
        assert steps[0].verb == "click"
        assert steps[1].verb == "scroll"

    def test_three_steps(self):
        steps = parse_instructions("click Posts, then wait 2s, then scroll down")
        assert len(steps) == 3
        assert steps[0].verb == "click"
        assert steps[1].verb == "wait"
        assert steps[2].verb == "scroll"


class TestParseUnknown:
    def test_unknown_preserved(self):
        steps = parse_instructions("do something weird")
        assert steps[0].verb == "unknown"
        assert steps[0].raw == "do something weird"

    def test_raw_always_set(self):
        steps = parse_instructions("click the button")
        assert steps[0].raw == "click the button"

    def test_empty_string(self):
        steps = parse_instructions("")
        assert steps == []

    def test_whitespace_only(self):
        steps = parse_instructions("   ")
        assert steps == []
