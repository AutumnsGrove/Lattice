"""
Quiz schema and data structures

Defines the structure for initial and follow-up quizzes.
"""

from dataclasses import dataclass, field
from typing import Literal, Optional, Any
from enum import Enum
import json


class QuestionType(str, Enum):
    """Types of quiz questions."""
    TEXT = "text"
    SINGLE_SELECT = "single_select"
    MULTI_SELECT = "multi_select"


@dataclass
class QuizOption:
    """An option for select-type questions."""
    value: str
    label: str

    def to_dict(self) -> dict:
        return {"value": self.value, "label": self.label}

    @classmethod
    def from_dict(cls, data: dict) -> "QuizOption":
        return cls(value=data["value"], label=data["label"])


@dataclass
class QuizQuestion:
    """A single quiz question."""
    id: str
    type: QuestionType
    prompt: str
    required: bool = True
    placeholder: str = ""
    options: list[QuizOption] = field(default_factory=list)
    default: Any = None

    def to_dict(self) -> dict:
        result = {
            "id": self.id,
            "type": self.type.value,
            "prompt": self.prompt,
            "required": self.required,
        }
        if self.placeholder:
            result["placeholder"] = self.placeholder
        if self.options:
            result["options"] = [o.to_dict() for o in self.options]
        if self.default is not None:
            result["default"] = self.default
        return result

    @classmethod
    def from_dict(cls, data: dict) -> "QuizQuestion":
        options = [QuizOption.from_dict(o) for o in data.get("options", [])]
        return cls(
            id=data["id"],
            type=QuestionType(data["type"]),
            prompt=data["prompt"],
            required=data.get("required", True),
            placeholder=data.get("placeholder", ""),
            options=options,
            default=data.get("default"),
        )


@dataclass
class QuizResponse:
    """Response to a quiz question."""
    question_id: str
    value: Any  # str for text, str for single_select, list[str] for multi_select

    def to_dict(self) -> dict:
        return {"question_id": self.question_id, "value": self.value}

    @classmethod
    def from_dict(cls, data: dict) -> "QuizResponse":
        return cls(question_id=data["question_id"], value=data["value"])


@dataclass
class InitialQuiz:
    """
    Initial client intake quiz responses.

    Contains the core information needed to start a domain search.
    """
    business_name: str
    domain_idea: Optional[str] = None
    tld_preferences: list[str] = field(default_factory=lambda: ["com", "any"])
    vibe: str = "professional"
    keywords: Optional[str] = None

    def to_dict(self) -> dict:
        return {
            "business_name": self.business_name,
            "domain_idea": self.domain_idea,
            "tld_preferences": self.tld_preferences,
            "vibe": self.vibe,
            "keywords": self.keywords,
        }

    @classmethod
    def from_dict(cls, data: dict) -> "InitialQuiz":
        return cls(
            business_name=data["business_name"],
            domain_idea=data.get("domain_idea"),
            tld_preferences=data.get("tld_preferences", ["com", "any"]),
            vibe=data.get("vibe", "professional"),
            keywords=data.get("keywords"),
        )

    @classmethod
    def from_responses(cls, responses: list[QuizResponse]) -> "InitialQuiz":
        """Create from list of quiz responses."""
        response_map = {r.question_id: r.value for r in responses}
        return cls(
            business_name=response_map.get("business_name", ""),
            domain_idea=response_map.get("domain_idea"),
            tld_preferences=response_map.get("tld_preference", ["com", "any"]),
            vibe=response_map.get("vibe", "professional"),
            keywords=response_map.get("keywords"),
        )

    def to_json(self) -> str:
        return json.dumps(self.to_dict(), indent=2)


@dataclass
class FollowupQuiz:
    """
    Dynamically generated follow-up quiz.

    Generated when initial search doesn't find enough good results.
    """
    questions: list[QuizQuestion]
    context: dict = field(default_factory=dict)  # Search context that generated this

    def to_dict(self) -> dict:
        return {
            "questions": [q.to_dict() for q in self.questions],
            "context": self.context,
        }

    @classmethod
    def from_dict(cls, data: dict) -> "FollowupQuiz":
        questions = [QuizQuestion.from_dict(q) for q in data.get("questions", [])]
        return cls(questions=questions, context=data.get("context", {}))

    def to_json(self) -> str:
        return json.dumps(self.to_dict(), indent=2)


# =============================================================================
# INITIAL QUIZ SCHEMA (Static)
# =============================================================================

INITIAL_QUIZ_SCHEMA = [
    QuizQuestion(
        id="business_name",
        type=QuestionType.TEXT,
        prompt="Business or project name",
        required=True,
        placeholder="e.g., Sunrise Bakery",
    ),
    QuizQuestion(
        id="domain_idea",
        type=QuestionType.TEXT,
        prompt="Domain in mind?",
        required=False,
        placeholder="e.g., sunrisebakery.com",
    ),
    QuizQuestion(
        id="tld_preference",
        type=QuestionType.MULTI_SELECT,
        prompt="Preferred endings",
        required=True,
        options=[
            QuizOption(value="com", label=".com (most recognized)"),
            QuizOption(value="co", label=".co (modern alternative)"),
            QuizOption(value="io", label=".io (tech-focused)"),
            QuizOption(value="dev", label=".dev (developer-focused)"),
            QuizOption(value="app", label=".app (application-focused)"),
            QuizOption(value="me", label=".me (personal brand)"),
            QuizOption(value="any", label="Open to anything"),
        ],
        default=["com", "any"],
    ),
    QuizQuestion(
        id="vibe",
        type=QuestionType.SINGLE_SELECT,
        prompt="What vibe fits your brand?",
        required=True,
        options=[
            QuizOption(value="professional", label="Professional & trustworthy"),
            QuizOption(value="creative", label="Creative & playful"),
            QuizOption(value="minimal", label="Minimal & modern"),
            QuizOption(value="bold", label="Bold & memorable"),
            QuizOption(value="personal", label="Personal & approachable"),
        ],
        default="professional",
    ),
    QuizQuestion(
        id="keywords",
        type=QuestionType.TEXT,
        prompt="Keywords or themes",
        required=False,
        placeholder="e.g., nature, tech, local, artisan",
    ),
]


def get_initial_quiz_dict() -> list[dict]:
    """Get initial quiz schema as list of dicts (for JSON serialization)."""
    return [q.to_dict() for q in INITIAL_QUIZ_SCHEMA]


def validate_initial_responses(responses: dict) -> tuple[bool, list[str]]:
    """
    Validate initial quiz responses.

    Args:
        responses: Dict mapping question_id to response value

    Returns:
        Tuple of (is_valid, list of error messages)
    """
    errors = []

    for question in INITIAL_QUIZ_SCHEMA:
        value = responses.get(question.id)

        if question.required and not value:
            errors.append(f"'{question.prompt}' is required")
            continue

        if value and question.type == QuestionType.SINGLE_SELECT:
            valid_values = [o.value for o in question.options]
            if value not in valid_values:
                errors.append(f"Invalid value for '{question.prompt}': {value}")

        if value and question.type == QuestionType.MULTI_SELECT:
            valid_values = [o.value for o in question.options]
            if not isinstance(value, list):
                errors.append(f"'{question.prompt}' must be a list")
            else:
                for v in value:
                    if v not in valid_values:
                        errors.append(f"Invalid value for '{question.prompt}': {v}")

    return (len(errors) == 0, errors)
