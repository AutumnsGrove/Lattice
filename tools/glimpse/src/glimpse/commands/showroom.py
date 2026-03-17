"""glimpse showroom — component isolation, capture, and audit.

Renders any .svelte component in the Showroom app, captures screenshots
across scenarios and themes, runs design compliance checks, and diffs
against baselines. Returns a full audit bundle for agent self-verification.

The Showroom server is long-running with Vite HMR, so edits to the source
component reflect instantly — agents can edit-and-recapture without restart.
"""

import asyncio
import json
import os
import re
import shutil
import subprocess
import sys
import time
from dataclasses import dataclass, field
from pathlib import Path
from urllib.parse import quote

import click

from glimpse.capture.engine import CaptureEngine
from glimpse.capture.screenshot import CaptureRequest, CaptureResult
from glimpse.commands.diff import diff_images


# ---------------------------------------------------------------------------
# Data structures
# ---------------------------------------------------------------------------


@dataclass
class ComplianceViolation:
    """A single design compliance violation."""

    element: str
    expected: str
    actual: str
    rule: str  # e.g. "color-tokens", "spacing-grid"
    severity: str = "warning"  # "error" | "warning" | "info"

    def to_dict(self) -> dict:
        return {
            "element": self.element,
            "expected": self.expected,
            "actual": self.actual,
            "rule": self.rule,
            "severity": self.severity,
        }


@dataclass
class ComplianceCheck:
    """Result of a single compliance rule check."""

    name: str
    passed: bool
    violations: list[ComplianceViolation] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "passed": self.passed,
            "violations": [v.to_dict() for v in self.violations],
        }


@dataclass
class ComplianceResult:
    """Aggregate compliance result for a component."""

    score: float  # 0-100
    checks: list[ComplianceCheck] = field(default_factory=list)

    @property
    def passed(self) -> bool:
        return all(c.passed for c in self.checks)

    def to_dict(self) -> dict:
        return {
            "score": self.score,
            "passed": self.passed,
            "checks": [c.to_dict() for c in self.checks],
        }


@dataclass
class ScenarioResult:
    """Result of capturing and auditing a single scenario."""

    scenario: str
    theme: str
    capture: CaptureResult
    compliance: ComplianceResult | None = None
    diff_result: dict | None = None
    computed_styles: dict | None = None

    def to_dict(self) -> dict:
        d: dict = {
            "scenario": self.scenario,
            "theme": self.theme,
            "capture": str(self.capture.output_path) if self.capture.output_path else None,
            "success": self.capture.success,
        }
        if self.capture.a11y:
            d["a11y"] = self.capture.a11y.to_dict()
        if self.compliance:
            d["compliance"] = self.compliance.to_dict()
        if self.diff_result:
            d["diff"] = {
                "similarity": self.diff_result.get("similarity"),
                "changed_pixels": self.diff_result.get("changed_pixels"),
                "total_pixels": self.diff_result.get("total_pixels"),
                "diff_path": str(self.diff_result["diff_path"])
                if self.diff_result.get("diff_path")
                else None,
            }
        if self.computed_styles:
            d["computed_styles"] = self.computed_styles
        if self.capture.error:
            d["error"] = self.capture.error
        return d


@dataclass
class ShowroomAudit:
    """Full audit bundle for a component showroom run."""

    component: str
    fixture: str | None
    timestamp: str
    scenarios: list[ScenarioResult] = field(default_factory=list)

    @property
    def total_captures(self) -> int:
        return len(self.scenarios)

    @property
    def successful_captures(self) -> int:
        return sum(1 for s in self.scenarios if s.capture.success)

    @property
    def avg_compliance_score(self) -> float:
        scores = [
            s.compliance.score for s in self.scenarios if s.compliance is not None
        ]
        return sum(scores) / len(scores) if scores else 0.0

    def to_dict(self) -> dict:
        return {
            "component": self.component,
            "fixture": self.fixture,
            "timestamp": self.timestamp,
            "summary": {
                "total_captures": self.total_captures,
                "successful": self.successful_captures,
                "avg_compliance_score": round(self.avg_compliance_score, 1),
            },
            "scenarios": [s.to_dict() for s in self.scenarios],
        }


# ---------------------------------------------------------------------------
# Compliance engine
# ---------------------------------------------------------------------------

# Valid spacing values on the 4px grid (Tailwind classes p-1 through p-16)
VALID_SPACINGS_PX = {0, 1, 2, 4, 6, 8, 10, 12, 14, 16, 20, 24, 28, 32, 36, 40, 44, 48, 56, 64}

# Valid font sizes from the typography scale
VALID_FONT_SIZES_PX = {12, 14, 16, 18, 20, 24, 30, 36, 48}

# Grove color families (from prism tokens) — checking against these would
# require parsing the full token set. Instead we check for hardcoded hex values
# that are NOT part of the Tailwind config.
HARDCODED_COLOR_PATTERN = re.compile(
    r"rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)"
    r"|#[0-9a-fA-F]{3,8}\b"
)


EXTRACT_STYLES_JS = """() => {
    const component = document.getElementById('showroom-component');
    if (!component) return { error: 'No component mounted' };

    const elements = component.querySelectorAll('*');
    const colors = new Set();
    const fontSizes = new Set();
    const spacings = new Set();
    const focusStyles = [];
    const rawInlineColors = [];
    let hasGlass = false;

    // Regex to detect hardcoded hex/rgb in inline styles
    const hexPattern = /#[0-9a-fA-F]{3,8}\\b/g;
    const rgbPattern = /rgb\\(\\s*\\d+\\s*,\\s*\\d+\\s*,\\s*\\d+\\s*\\)/g;

    for (const el of elements) {
        const style = window.getComputedStyle(el);

        // Collect computed colors
        colors.add(style.color);
        colors.add(style.backgroundColor);
        if (style.borderColor !== 'rgba(0, 0, 0, 0)') {
            colors.add(style.borderColor);
        }

        // Collect font sizes
        fontSizes.add(style.fontSize);

        // Collect spacings (padding + margin)
        for (const prop of ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
                             'marginTop', 'marginRight', 'marginBottom', 'marginLeft']) {
            const val = parseFloat(style[prop]);
            if (val > 0) spacings.add(val);
        }

        // Check for glassmorphism
        if (style.backdropFilter && style.backdropFilter !== 'none') {
            hasGlass = true;
        }

        // Check inline style attribute for hardcoded colors
        const inlineStyle = el.getAttribute('style') || '';
        if (inlineStyle) {
            const hexMatches = inlineStyle.match(hexPattern) || [];
            const rgbMatches = inlineStyle.match(rgbPattern) || [];
            for (const m of [...hexMatches, ...rgbMatches]) {
                rawInlineColors.push({
                    element: el.tagName.toLowerCase() + (el.className ? '.' + el.className.split(' ')[0] : ''),
                    value: m,
                });
            }
        }
    }

    // Check focus styles on interactive elements
    const interactives = component.querySelectorAll('button, a, input, select, textarea, [tabindex]');
    for (const el of interactives) {
        focusStyles.push({
            tag: el.tagName.toLowerCase(),
            type: el.type || null,
            hasFocusClass: el.className?.includes?.('focus') || false,
        });
    }

    return {
        colors: [...colors].filter(c => c && c !== 'rgba(0, 0, 0, 0)'),
        fontSizes: [...fontSizes],
        spacings: [...spacings].sort((a, b) => a - b),
        rawInlineColors,
        hasGlass,
        interactiveCount: interactives.length,
        focusStyles,
        elementCount: elements.length,
    };
}"""


def _check_color_tokens(styles: dict) -> ComplianceCheck:
    """Check that colors use CSS custom properties (tokens), not hardcoded values.

    We can't perfectly distinguish token-derived vs hardcoded from computed
    styles alone (computed values are always resolved to rgb()). Instead,
    we check for inline styles with hardcoded hex/rgb that bypass the
    token system — the `rawInlineColors` field from the JS extractor.
    """
    violations = []
    raw_inline = styles.get("rawInlineColors", [])

    for entry in raw_inline:
        violations.append(
            ComplianceViolation(
                element=entry.get("element", "unknown"),
                expected="CSS custom property (design token)",
                actual=entry.get("value", "hardcoded color"),
                rule="color-tokens",
                severity="warning",
            )
        )

    return ComplianceCheck(
        name="color-tokens",
        passed=len(violations) == 0,
        violations=violations,
    )


def _check_spacing_grid(styles: dict) -> ComplianceCheck:
    """Check that spacings align to the 4px grid."""
    violations = []
    spacings = styles.get("spacings", [])

    for spacing in spacings:
        rounded = round(spacing)
        if rounded > 0 and rounded % 4 != 0 and rounded not in {1, 2, 6, 10, 14}:
            violations.append(
                ComplianceViolation(
                    element="component",
                    expected="Multiple of 4px (spacing grid)",
                    actual=f"{spacing}px",
                    rule="spacing-grid",
                    severity="warning",
                )
            )

    return ComplianceCheck(
        name="spacing-grid",
        passed=len(violations) == 0,
        violations=violations,
    )


def _check_typography_scale(styles: dict) -> ComplianceCheck:
    """Check that font sizes are from the allowed scale."""
    violations = []
    font_sizes = styles.get("fontSizes", [])

    for size_str in font_sizes:
        try:
            size_px = float(size_str.replace("px", ""))
            size_rounded = round(size_px)
            if size_rounded not in VALID_FONT_SIZES_PX:
                violations.append(
                    ComplianceViolation(
                        element="component",
                        expected=f"One of {sorted(VALID_FONT_SIZES_PX)}",
                        actual=f"{size_px}px",
                        rule="typography-scale",
                        severity="warning",
                    )
                )
        except (ValueError, AttributeError):
            pass

    return ComplianceCheck(
        name="typography-scale",
        passed=len(violations) == 0,
        violations=violations,
    )


def _check_focus_styles(styles: dict) -> ComplianceCheck:
    """Check that interactive elements have custom focus indicators."""
    violations = []
    focus_styles = styles.get("focusStyles", [])
    interactive_count = styles.get("interactiveCount", 0)

    if interactive_count > 0 and not any(f.get("hasFocusClass") for f in focus_styles):
        violations.append(
            ComplianceViolation(
                element="interactive elements",
                expected="Custom focus-grove or focus ring class",
                actual="No focus class detected (may use CSS :focus-visible)",
                rule="focus-styles",
                severity="info",
            )
        )

    return ComplianceCheck(
        name="focus-styles",
        passed=len(violations) == 0,
        violations=violations,
    )


def _check_heading_hierarchy(a11y) -> ComplianceCheck:
    """Check that heading levels are sequential (no h1→h3 skip)."""
    violations = []

    if a11y and a11y.headings:
        prev_level = 0
        for heading in a11y.headings:
            match = re.match(r"h(\d)", heading)
            if match:
                level = int(match.group(1))
                if prev_level > 0 and level > prev_level + 1:
                    violations.append(
                        ComplianceViolation(
                            element=heading,
                            expected=f"h{prev_level + 1} (sequential)",
                            actual=f"h{level} (skipped level)",
                            rule="heading-hierarchy",
                            severity="warning",
                        )
                    )
                prev_level = level

    return ComplianceCheck(
        name="heading-hierarchy",
        passed=len(violations) == 0,
        violations=violations,
    )


def _check_images_alt(a11y) -> ComplianceCheck:
    """Check that all images have alt text."""
    violations = []

    if a11y and a11y.images_missing_alt > 0:
        violations.append(
            ComplianceViolation(
                element=f"{a11y.images_missing_alt} image(s)",
                expected="alt attribute or aria-label",
                actual="Missing alt text",
                rule="images-alt",
                severity="error",
            )
        )

    return ComplianceCheck(
        name="images-alt",
        passed=len(violations) == 0,
        violations=violations,
    )


def run_compliance_checks(styles: dict, a11y=None) -> ComplianceResult:
    """Run all compliance checks and produce an aggregate result."""
    checks = [
        _check_color_tokens(styles),
        _check_spacing_grid(styles),
        _check_typography_scale(styles),
        _check_focus_styles(styles),
        _check_heading_hierarchy(a11y),
        _check_images_alt(a11y),
    ]

    total = len(checks)
    passed = sum(1 for c in checks if c.passed)
    score = (passed / total * 100) if total > 0 else 100.0

    return ComplianceResult(score=round(score, 1), checks=checks)


# ---------------------------------------------------------------------------
# Fixture scaffolding
# ---------------------------------------------------------------------------


def scaffold_fixture(
    component_path: str,
    grove_root: Path,
    force: bool = False,
) -> str | None:
    """Generate a .showroom.ts fixture template from a component's props.

    Does lightweight regex parsing of the Props interface — not full TypeScript
    resolution. Generates a starting template that developers/agents fill in.

    Returns the generated fixture path, or None on failure.
    Returns "exists:<path>" if the fixture already exists and force=False.
    """
    comp_path = Path(component_path)
    if not comp_path.is_absolute():
        comp_path = grove_root / comp_path

    if not comp_path.exists():
        return None

    source = comp_path.read_text()
    component_name = comp_path.stem

    # Extract library name from path
    relative = comp_path.relative_to(grove_root)
    parts = relative.parts
    library = "app"
    if parts[0] == "libs" and len(parts) > 1:
        library = parts[1]
    elif parts[0] == "apps" and len(parts) > 1:
        library = parts[1]

    # Check if fixture already exists (guard against overwriting hand-crafted fixtures)
    fixture_dir = grove_root / "tools" / "showroom" / "fixtures" / library
    fixture_path = fixture_dir / f"{component_name}.showroom.ts"
    if fixture_path.exists() and not force:
        return f"exists:{fixture_path}"

    # Parse Props interface (also checks companion *-variants.ts files)
    props = _parse_props_interface(source, comp_path)

    # Generate fixture content (use spaces for Prettier compliance)
    I = "  "  # noqa: E741 — indent unit
    lines = [
        'import type { ShowroomFixture } from "../types";',
        "",
        "export default {",
        f"{I}scenarios: {{",
        f"{I}{I}default: {{",
        f"{I}{I}{I}props: {{",
    ]

    for prop_name, prop_info in props.items():
        default_val = _default_value_for_type(prop_info["type"])
        optional = prop_info.get("optional", False)
        comment = f"  // {prop_info['type']}"
        if optional:
            comment += " (optional)"
        lines.append(f"{I}{I}{I}{I}{prop_name}: {default_val},{comment}")

    lines.extend(
        [
            f"{I}{I}{I}}},",
            f'{I}{I}{I}description: "Default state",',
            f"{I}{I}}},",
            f"{I}{I}empty: {{",
            f"{I}{I}{I}props: {{}},",
            f'{I}{I}{I}description: "Empty/zero-props state",',
            f"{I}{I}}},",
            f"{I}}},",
            "} satisfies ShowroomFixture;",
            "",
        ]
    )

    fixture_content = "\n".join(lines)

    # Write fixture file
    fixture_dir.mkdir(parents=True, exist_ok=True)
    fixture_path.write_text(fixture_content)

    # Run Prettier on the generated file for consistent formatting
    _run_prettier(fixture_path)

    return str(fixture_path)


def _parse_props_interface(source: str, comp_path: Path | None = None) -> dict:
    """Extract props from a Svelte 5 component source.

    Handles three patterns:
    1. interface Props { name: type; ... }
    2. let { name = default, ... }: Type = $props();  (shadcn style)
    3. Companion *-variants.ts with exported type (shadcn/tv pattern)
    """
    props: dict = {}

    # Pattern 1: interface Props { ... }
    interface_match = re.search(
        r"interface\s+Props\s*\{([^}]+)\}", source, re.DOTALL
    )
    if interface_match:
        body = interface_match.group(1)
        for line in body.strip().split("\n"):
            line = line.strip()
            if line.startswith("//") or line.startswith("/*") or line.startswith("*"):
                continue
            prop_match = re.match(
                r"[\"']?(\w+)[\"']?\s*(\?)?\s*:\s*(.+?)\s*;?\s*$", line
            )
            if prop_match:
                name = prop_match.group(1)
                optional = prop_match.group(2) == "?"
                type_str = prop_match.group(3).strip().rstrip(";")
                props[name] = {"type": type_str, "optional": optional}

    # Pattern 2: let { a = default, b, ...rest }: Type = $props()
    destructure_match = re.search(
        r"let\s*\{([^}]+)\}.*\$props\(\)", source, re.DOTALL
    )
    if destructure_match and not props:
        body = destructure_match.group(1)

        # Try to load type info from companion variants file
        companion_types = _load_companion_types(comp_path) if comp_path else {}

        for part in body.split(","):
            part = part.strip()
            if not part:
                continue

            # Skip rest props (...restProps)
            if part.startswith("..."):
                continue

            # Handle: class: className = "default"
            if ":" in part and not part.startswith("{"):
                actual_name = part.split(":")[0].strip()
                remainder = part.split(":", 1)[1].strip()
                if "=" in remainder:
                    default_val = remainder.split("=", 1)[1].strip()
                    prop_type = _infer_type_from_default(default_val)
                    props[actual_name] = {"type": prop_type, "optional": True}
                else:
                    props[actual_name] = {"type": "string", "optional": True}
                continue

            if "=" in part:
                name = part.split("=")[0].strip()
                default_val = part.split("=", 1)[1].strip()

                # Skip $bindable() props
                if "$bindable" in default_val:
                    continue

                prop_type = _infer_type_from_default(default_val)

                # Check companion types for better info
                if name in companion_types:
                    prop_type = companion_types[name]

                props[name] = {"type": prop_type, "optional": True}
            else:
                name = part.strip()
                if name and name.isidentifier():
                    prop_type = companion_types.get(name, "unknown")
                    props[name] = {"type": prop_type, "optional": False}

    return props


def _load_companion_types(comp_path: Path) -> dict:
    """Try to load type information from a companion *-variants.ts file.

    Shadcn components often have button-variants.ts, badge-variants.ts, etc.
    that export type aliases like ButtonVariant, ButtonSize.
    """
    types: dict = {}
    if not comp_path:
        return types

    # Look for *-variants.ts in the same directory
    parent = comp_path.parent
    stem = comp_path.stem  # e.g. "button"
    variants_path = parent / f"{stem}-variants.ts"
    if not variants_path.exists():
        # Try index.ts
        variants_path = parent / "index.ts"

    if not variants_path.exists():
        return types

    try:
        source = variants_path.read_text()

        # Parse tv({ variants: { name: { key: "css...", ... } } }) to extract variant keys.
        # The variant map keys are the valid prop values. We use a brace-depth
        # parser because the CSS class strings contain colons/braces.
        tv_match = re.search(r"tv\(\{", source)
        if tv_match:
            variants_match = re.search(
                r"\bvariants:\s*(\{)", source[tv_match.start():]
            )
            if variants_match:
                # Position of the opening { for the variants object
                brace_pos = tv_match.start() + variants_match.start(1)
                variant_groups = _parse_tv_variants(source, brace_pos)

                for group_name, keys in variant_groups.items():
                    if keys:
                        types[group_name] = " | ".join(f'"{k}"' for k in keys)

    except Exception:
        pass

    return types


def _parse_tv_variants(source: str, start: int) -> dict[str, list[str]]:
    """Parse a tailwind-variants tv() variants block using brace-depth tracking.

    Given `variants: { variant: { default: "...", destructive: "..." }, size: { ... } }`,
    extracts { "variant": ["default", "destructive"], "size": [...] }.
    """
    groups: dict[str, list[str]] = {}
    i = start
    depth = 0
    current_group = None
    current_keys: list[str] = []

    while i < len(source):
        c = source[i]

        if c == "{":
            depth += 1
            if depth == 2:
                # Starting a variant group — look back for the group name
                name_match = re.search(r"(\w+)\s*:\s*$", source[max(0, i - 40):i])
                if name_match:
                    current_group = name_match.group(1)
                    current_keys = []
            i += 1
            continue

        if c == "}":
            if depth == 2 and current_group:
                groups[current_group] = current_keys
                current_group = None
                current_keys = []
            depth -= 1
            if depth == 0:
                break
            i += 1
            continue

        # At depth 2, we're inside a variant group — look for keys.
        # Keys appear at the start of lines (after whitespace) followed by colon.
        # We must NOT match colons inside CSS class strings like "hover:bg-..."
        if depth == 2 and current_group:
            # Only look for keys after newline+whitespace or after opening brace
            if source[i - 1] in "\n{," or (source[i - 1] in " \t" and i >= 2 and source[i - 2] == "\n"):
                # Skip leading whitespace
                j = i
                while j < len(source) and source[j] in " \t":
                    j += 1
                key_match = re.match(r"""['"]?([\w-]+)['"]?\s*:\s*(?:\n|['"])""", source[j:])
                if key_match:
                    current_keys.append(key_match.group(1))
                    i = j + key_match.end() - 1
                    continue

        i += 1

    return groups


def _infer_type_from_default(default_val: str) -> str:
    """Infer a TypeScript type from a default value expression."""
    val = default_val.strip().rstrip(",")

    # Remove $bindable wrapper
    if val.startswith("$bindable("):
        val = val[len("$bindable("):-1].strip()

    if val in ("true", "false"):
        return "boolean"
    if val == "undefined" or val == "null":
        return "unknown"
    if val.startswith('"') or val.startswith("'"):
        # String literal — extract value for union hint
        inner = val.strip("\"'")
        return f'"{inner}"'
    try:
        float(val)
        return "number"
    except ValueError:
        pass
    if val.startswith("["):
        return "array"
    if val.startswith("{"):
        return "object"
    return "unknown"


def _run_prettier(file_path: Path) -> None:
    """Run Prettier on a generated file for consistent formatting.

    Best-effort — silently skips if Prettier is not available.
    """
    try:
        subprocess.run(
            ["bun", "x", "prettier", "--write", str(file_path)],
            capture_output=True,
            timeout=10,
        )
    except (FileNotFoundError, subprocess.TimeoutExpired):
        pass


def _default_value_for_type(type_str: str) -> str:
    """Generate a sensible default value string for a TypeScript type."""
    t = type_str.strip().lower()

    if t == "string":
        return '"example"'
    if t == "number":
        return "0"
    if t == "boolean" or t == "bool":
        return "false"
    if "snippet" in t:
        return "undefined"

    # Union of string literals: 'a' | 'b' | 'c' -> pick the first
    union_match = re.match(r"""['"](\w+)['"]""", type_str)
    if union_match:
        return f'"{union_match.group(1)}"'

    return "{}"


# ---------------------------------------------------------------------------
# Main capture + audit flow
# ---------------------------------------------------------------------------


async def _run_showroom_audit(
    component_path: str,
    scenarios: dict,
    themes: list[str],
    output_dir: Path,
    baseline_dir: Path,
    showroom_url: str,
    headless: bool,
    config,
    update_baselines: bool = False,
    no_diff: bool = False,
    no_audit: bool = False,
    strict: bool = False,
) -> ShowroomAudit:
    """Execute the full showroom capture + audit pipeline."""
    timestamp = time.strftime("%Y-%m-%dT%H:%M:%S")
    audit = ShowroomAudit(
        component=component_path,
        fixture=None,
        timestamp=timestamp,
    )

    captures_dir = output_dir / "captures"
    diffs_dir = output_dir / "diffs"
    captures_dir.mkdir(parents=True, exist_ok=True)
    diffs_dir.mkdir(parents=True, exist_ok=True)
    baseline_dir.mkdir(parents=True, exist_ok=True)

    async with CaptureEngine(headless=headless) as engine:
        for scenario_name, scenario_data in scenarios.items():
            props = scenario_data.get("props", {})
            scenario_viewport = scenario_data.get("viewport", {})
            width = scenario_viewport.get("width", config.viewport_width)
            height = scenario_viewport.get("height", config.viewport_height)

            for theme in themes:
                # Build the showcase URL with query params
                props_json = json.dumps(props)
                url = (
                    f"{showroom_url}/showcase"
                    f"?component={quote(component_path)}"
                    f"&scenario={quote(scenario_name)}"
                    f"&props={quote(props_json)}"
                )

                filename = f"{Path(component_path).stem}_{scenario_name}_{theme}"
                output_path = captures_dir / f"{filename}.png"

                request = CaptureRequest(
                    url=url,
                    season=None,
                    theme=theme,
                    width=width,
                    height=height,
                    scale=config.scale,
                    wait_ms=800,  # Extra wait for component mount
                    wait_for="#showroom-component[data-ready='true']",
                    output_path=output_path,
                    format="png",
                    timeout_ms=config.timeout_ms,
                    logs=True,
                )

                # Capture screenshot + extract styles in one browser session
                result, computed_styles = await _capture_with_styles(
                    engine, request, run_audit=not no_audit,
                )

                # Run compliance checks with both styles and a11y data
                compliance = None
                if not no_audit:
                    compliance = run_compliance_checks(
                        computed_styles or {}, result.a11y,
                    )

                # Diff against baseline
                diff_result = None
                baseline_path = baseline_dir / f"{filename}.png"

                if result.success and not no_diff:
                    if baseline_path.exists() and not update_baselines:
                        diff_output = diffs_dir / f"{filename}_diff.png"
                        try:
                            diff_result = diff_images(
                                baseline_path, output_path, diff_output
                            )
                        except Exception:
                            pass
                    elif update_baselines or (
                        not baseline_path.exists() and not strict
                    ):
                        shutil.copy2(output_path, baseline_path)

                scenario_result = ScenarioResult(
                    scenario=scenario_name,
                    theme=theme,
                    capture=result,
                    compliance=compliance,
                    diff_result=diff_result,
                    computed_styles=computed_styles,
                )
                audit.scenarios.append(scenario_result)

    return audit


async def _capture_with_styles(
    engine: CaptureEngine,
    request: CaptureRequest,
    run_audit: bool = True,
) -> tuple[CaptureResult, dict | None]:
    """Capture a screenshot and extract computed styles in one browser session.

    Injects the style-extraction script as an init script so it runs in
    the same page context as the capture. After the screenshot is taken,
    we evaluate the extraction script to get computed styles.

    Falls back to plain capture if style extraction fails.
    """
    # First, do the normal capture
    result = await engine.capture(request)

    if not result.success or not run_audit:
        return result, None

    # Now open a second context just for style extraction
    # (the capture engine closes its context after each capture)
    styles: dict = {}
    try:
        if engine._browser:
            from glimpse.capture.injector import build_init_script

            ctx = await engine._browser.new_context(
                viewport={"width": request.width, "height": request.height},
                device_scale_factor=request.scale,
            )
            init_js = build_init_script(
                season=request.season,
                theme=request.theme,
                grove_mode=None,
            )
            if init_js:
                await ctx.add_init_script(init_js)

            page = await ctx.new_page()
            try:
                await page.goto(request.url, wait_until="domcontentloaded", timeout=15000)
                if request.wait_for:
                    await page.wait_for_selector(request.wait_for, timeout=10000)
                elif request.wait_ms > 0:
                    await page.wait_for_timeout(request.wait_ms)

                styles = await page.evaluate(EXTRACT_STYLES_JS)
            except Exception:
                pass
            finally:
                await ctx.close()
    except Exception:
        pass

    return result, styles if styles else None


# ---------------------------------------------------------------------------
# CLI command
# ---------------------------------------------------------------------------


@click.command("showroom")
@click.argument("component", type=str)
@click.option(
    "--scenario",
    type=str,
    default=None,
    help="Capture only this scenario (default: all from fixture)",
)
@click.option(
    "--props",
    "props_json",
    type=str,
    default=None,
    help="Inline JSON props override (e.g. '{\"label\": \"Test\"}')",
)
@click.option(
    "--theme",
    type=str,
    default=None,
    help="Capture only this theme: light or dark (default: both)",
)
@click.option(
    "--output",
    "-o",
    type=str,
    default=None,
    help="Output directory for audit bundle (default: .glimpse/showroom/)",
)
@click.option(
    "--baseline-dir",
    type=str,
    default=None,
    help="Baseline directory for diffs (default: .glimpse/showroom/baselines/)",
)
@click.option(
    "--update-baselines",
    is_flag=True,
    default=False,
    help="Update baselines with current captures",
)
@click.option(
    "--scaffold",
    is_flag=True,
    default=False,
    help="Generate a .showroom.ts fixture template for this component",
)
@click.option(
    "--force",
    is_flag=True,
    default=False,
    help="Overwrite existing fixture when using --scaffold",
)
@click.option(
    "--no-diff",
    is_flag=True,
    default=False,
    help="Skip visual diff against baselines",
)
@click.option(
    "--no-audit",
    is_flag=True,
    default=False,
    help="Skip design compliance audit",
)
@click.option(
    "--strict",
    is_flag=True,
    default=False,
    help="Require --update-baselines for initial baseline creation",
)
@click.pass_context
def showroom(
    ctx: click.Context,
    component: str,
    scenario: str | None,
    props_json: str | None,
    theme: str | None,
    output: str | None,
    baseline_dir: str | None,
    update_baselines: bool,
    scaffold: bool,
    force: bool,
    no_diff: bool,
    no_audit: bool,
    strict: bool,
) -> None:
    """Render a component in isolation and run a full audit.

    Starts (or reuses) the Showroom dev server, mounts the specified
    component, captures screenshots across scenarios and themes, and
    returns an audit bundle with compliance checks and visual diffs.

    Examples:

        glimpse showroom libs/engine/src/lib/ui/components/ui/Spinner.svelte

        glimpse showroom libs/engine/src/lib/ui/components/ui/Card.svelte --scenario default --theme dark

        glimpse showroom libs/engine/src/lib/ui/components/ui/Card.svelte --props '{"title": "Test"}'

        glimpse showroom libs/engine/src/lib/ui/components/ui/Card.svelte --scaffold

        glimpse showroom libs/engine/src/lib/ui/components/ui/Card.svelte --update-baselines
    """
    config = ctx.obj["config"]
    output_handler = ctx.obj["output"]

    # Find grove root
    from glimpse.seed.discovery import find_grove_root

    grove_root = find_grove_root()
    if not grove_root:
        output_handler.print_error("Cannot find grove root (no pnpm-workspace.yaml)")
        ctx.exit(1)
        return

    # Handle --scaffold mode
    if scaffold:
        fixture_path = scaffold_fixture(component, grove_root, force=force)
        if fixture_path and fixture_path.startswith("exists:"):
            existing = fixture_path[len("exists:"):]
            if output_handler.mode == "json":
                json.dump({"skipped": existing, "reason": "exists"}, sys.stdout)
                sys.stdout.write("\n")
            elif output_handler.mode == "agent":
                print(f"[SKIP] {existing} (already exists, use --force to overwrite)", file=sys.stdout)
            else:
                output_handler.print_info(
                    f"Fixture already exists: {existing}\n"
                    f"  Use --force to overwrite."
                )
            return
        elif fixture_path:
            if output_handler.mode == "json":
                json.dump({"scaffold": fixture_path}, sys.stdout)
                sys.stdout.write("\n")
            elif output_handler.mode == "agent":
                print(fixture_path, file=sys.stdout)
            else:
                output_handler.print_success(f"Fixture scaffolded: {fixture_path}")
        else:
            output_handler.print_error(f"Component not found: {component}")
            ctx.exit(1)
        return

    # Validate component path exists
    comp_path = Path(component)
    if not comp_path.is_absolute():
        comp_path = grove_root / component
    if not comp_path.exists():
        output_handler.print_error(f"Component not found: {component}")
        ctx.exit(1)
        return

    # Auto-start showroom server
    effective_auto = ctx.obj.get("global_auto", False) or True  # Always auto for showroom
    showroom_port = 5188
    showroom_url = f"http://localhost:{showroom_port}"

    if effective_auto:
        from glimpse.server.manager import ServerManager

        # Override config for showroom app — use a longer health timeout
        # because Vite cold starts (pnpm dev with no cache) can take 5-10s
        showroom_config = config
        showroom_config.server_start_cwd = "tools/showroom"
        showroom_config.server_start_command = "pnpm dev"
        showroom_config.server_port = showroom_port
        showroom_config.server_health_url = showroom_url
        showroom_config.server_health_timeout = 45000  # 45s for cold starts

        mgr = ServerManager(showroom_config)
        ok, err = mgr.ensure_server(showroom_url)
        if not ok:
            output_handler.print_error(f"Showroom server not reachable: {err}")
            ctx.exit(1)
            return

    # Resolve fixture and scenarios
    scenarios: dict = {}

    # Check for fixture file
    relative = comp_path.relative_to(grove_root)
    parts = relative.parts
    library = "app"
    if parts[0] == "libs" and len(parts) > 1:
        library = parts[1]
    elif parts[0] == "apps" and len(parts) > 1:
        library = parts[1]

    component_name = comp_path.stem
    fixture_path = (
        grove_root
        / "tools"
        / "showroom"
        / "fixtures"
        / library
        / f"{component_name}.showroom.ts"
    )

    fixture_source = None
    if fixture_path.exists():
        fixture_source = str(fixture_path)
        # Load fixture via the showroom server's API (uses Vite ssrLoadModule
        # for full TypeScript support). Falls back to regex parser if server
        # is not yet ready.
        scenarios = _load_fixture_via_api(showroom_url, component)
        if not scenarios:
            try:
                fixture_text = fixture_path.read_text()
                scenarios = _parse_fixture_scenarios(fixture_text)
            except Exception:
                scenarios = {"default": {"props": {}}}
    else:
        scenarios = {"default": {"props": {}}}

    # Apply inline props override
    if props_json:
        try:
            inline_props = json.loads(props_json)
            scenarios = {"inline": {"props": inline_props}}
        except json.JSONDecodeError as e:
            output_handler.print_error(f"Invalid props JSON: {e}")
            ctx.exit(1)
            return

    # Filter to specific scenario if requested
    if scenario and scenario in scenarios:
        scenarios = {scenario: scenarios[scenario]}
    elif scenario and scenario not in scenarios:
        output_handler.print_error(
            f"Scenario '{scenario}' not found. Available: {', '.join(scenarios.keys())}"
        )
        ctx.exit(1)
        return

    # Determine themes
    themes = ["light", "dark"]
    if theme:
        if theme not in ("light", "dark"):
            output_handler.print_error(f"Invalid theme: {theme}. Use 'light' or 'dark'.")
            ctx.exit(1)
            return
        themes = [theme]

    # Resolve output directories
    output_dir = Path(output) if output else grove_root / ".glimpse" / "showroom"
    baselines = Path(baseline_dir) if baseline_dir else output_dir / "baselines"

    # Run the audit
    audit = asyncio.run(
        _run_showroom_audit(
            component_path=component,
            scenarios=scenarios,
            themes=themes,
            output_dir=output_dir,
            baseline_dir=baselines,
            showroom_url=showroom_url,
            headless=config.headless,
            config=config,
            update_baselines=update_baselines,
            no_diff=no_diff,
            no_audit=no_audit,
            strict=strict,
        )
    )
    audit.fixture = fixture_source

    # Write manifest
    manifest_path = output_dir / "manifest.json"
    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    with open(manifest_path, "w") as f:
        json.dump(audit.to_dict(), f, indent=2)

    # Output results
    if output_handler.mode == "json":
        json.dump(audit.to_dict(), sys.stdout, indent=2)
        sys.stdout.write("\n")
    elif output_handler.mode == "agent":
        # Agent mode: bare paths + summary
        for s in audit.scenarios:
            if s.capture.success:
                print(str(s.capture.output_path), file=sys.stdout)
            else:
                print(f"[FAIL] {s.scenario}/{s.theme}: {s.capture.error}", file=sys.stdout)

        # Summary line
        score = audit.avg_compliance_score
        print(
            f"[SHOWROOM] {audit.successful_captures}/{audit.total_captures} captured, "
            f"compliance={score:.0f}%",
            file=sys.stdout,
        )

        # Diff summary
        diffs_changed = [
            s for s in audit.scenarios
            if s.diff_result and s.diff_result.get("similarity", 100) < 100
        ]
        if diffs_changed:
            for s in diffs_changed:
                sim = s.diff_result["similarity"]
                print(
                    f"[DIFF] {s.scenario}/{s.theme}: {sim}% similar",
                    file=sys.stdout,
                )

        print(str(manifest_path), file=sys.stdout)
    else:
        # Human mode
        from rich.console import Console
        from rich.panel import Panel
        from rich.table import Table

        console = Console()
        console.print()

        # Build summary table
        table = Table(title=f"Showroom — {component_name}", show_lines=True)
        table.add_column("Scenario", style="cyan")
        table.add_column("Theme")
        table.add_column("Status")
        table.add_column("Compliance")
        table.add_column("Diff")

        for s in audit.scenarios:
            status = "[green]\u2713[/green]" if s.capture.success else f"[red]\u2717 {s.capture.error}[/red]"
            compliance_str = (
                f"{s.compliance.score:.0f}%" if s.compliance else "—"
            )
            if s.compliance and not s.compliance.passed:
                compliance_str = f"[yellow]{compliance_str}[/yellow]"

            diff_str = "—"
            if s.diff_result:
                sim = s.diff_result.get("similarity", 0)
                if sim == 100:
                    diff_str = "[green]identical[/green]"
                elif sim >= 99:
                    diff_str = f"[green]{sim}%[/green]"
                elif sim >= 90:
                    diff_str = f"[yellow]{sim}%[/yellow]"
                else:
                    diff_str = f"[red]{sim}%[/red]"

            table.add_row(s.scenario, s.theme, status, compliance_str, diff_str)

        console.print(table)
        console.print(f"\n  Manifest: {manifest_path}")
        console.print(f"  Captures: {audit.successful_captures}/{audit.total_captures}")
        console.print(f"  Compliance: {audit.avg_compliance_score:.0f}%")
        console.print()

    if audit.successful_captures < audit.total_captures:
        ctx.exit(1)


def _load_fixture_via_api(showroom_url: str, component_path: str) -> dict | None:
    """Load fixture data from the showroom server's API.

    The Vite plugin uses ssrLoadModule to load the .showroom.ts file
    with full TypeScript support — handles nested objects, arrays,
    and any valid TS expressions that the regex parser would miss.

    Returns parsed scenarios dict, or None if the API is unreachable.
    """
    import urllib.request
    import urllib.error

    url = (
        f"{showroom_url}/api/showroom/fixture"
        f"?component={quote(component_path)}"
    )
    try:
        with urllib.request.urlopen(url, timeout=5) as resp:
            data = json.loads(resp.read().decode())
            scenarios = data.get("scenarios", {})
            if scenarios:
                # Wrap raw scenario data into the expected format
                result = {}
                for name, scenario_data in scenarios.items():
                    if isinstance(scenario_data, dict):
                        result[name] = scenario_data
                    else:
                        result[name] = {"props": {}}
                return result if result else None
    except (urllib.error.URLError, json.JSONDecodeError, OSError):
        pass
    return None


def _parse_fixture_scenarios(text: str) -> dict:
    """Parse scenario props from a .showroom.ts fixture file.

    This is a lightweight parser that extracts scenario names and their
    props objects. It handles simple cases — complex nested objects may
    need manual JSON overrides.
    """
    scenarios: dict = {}

    # Find the scenarios block
    scenarios_match = re.search(r"scenarios:\s*\{(.+)\}\s*,?\s*\}", text, re.DOTALL)
    if not scenarios_match:
        return {"default": {"props": {}}}

    body = scenarios_match.group(1)

    # Find each scenario: name: { props: { ... } }
    # Use a simple state machine to handle nested braces
    current_name = None
    brace_depth = 0
    current_block = []
    i = 0

    while i < len(body):
        char = body[i]

        if brace_depth == 0 and char.isalpha():
            # Start of scenario name
            name_end = body.index(":", i)
            current_name = body[i:name_end].strip()
            i = name_end + 1
            continue

        if char == "{":
            brace_depth += 1
            if brace_depth == 1:
                i += 1
                continue

        if char == "}":
            brace_depth -= 1
            if brace_depth == 0 and current_name:
                block = "".join(current_block)
                # Extract props from the block
                props_match = re.search(
                    r"props:\s*(\{[^}]*\})", block, re.DOTALL
                )
                if props_match:
                    props_str = props_match.group(1)
                    try:
                        # Clean up TypeScript-isms for JSON parsing
                        clean = re.sub(r"//[^\n]*", "", props_str)  # Remove comments
                        clean = re.sub(r",\s*}", "}", clean)  # Remove trailing commas
                        clean = re.sub(
                            r"(\w+)\s*:", lambda m: f'"{m.group(1)}":', clean
                        )  # Quote keys
                        clean = clean.replace("'", '"')  # Single -> double quotes
                        props = json.loads(clean)
                        scenarios[current_name] = {"props": props}
                    except json.JSONDecodeError:
                        scenarios[current_name] = {"props": {}}
                else:
                    scenarios[current_name] = {"props": {}}

                current_name = None
                current_block = []
                i += 1
                continue

        if brace_depth > 0:
            current_block.append(char)

        i += 1

    return scenarios if scenarios else {"default": {"props": {}}}
