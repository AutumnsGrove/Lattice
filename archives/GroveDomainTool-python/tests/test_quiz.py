"""
Tests for quiz schema and follow-up generation.
"""

import pytest

from forage.quiz.schema import (
    QuizQuestion,
    QuizOption,
    QuizResponse,
    InitialQuiz,
    FollowupQuiz,
    QuestionType,
    INITIAL_QUIZ_SCHEMA,
    validate_initial_responses,
    get_initial_quiz_dict,
)
from forage.quiz.followup import FollowupQuizGenerator
from forage.providers.mock import MockProvider


class TestQuizOption:
    """Tests for QuizOption."""

    def test_to_dict(self):
        """Test serialization."""
        option = QuizOption(value="test", label="Test Label")
        data = option.to_dict()

        assert data["value"] == "test"
        assert data["label"] == "Test Label"

    def test_from_dict(self):
        """Test deserialization."""
        option = QuizOption.from_dict({"value": "opt", "label": "Option"})

        assert option.value == "opt"
        assert option.label == "Option"


class TestQuizQuestion:
    """Tests for QuizQuestion."""

    def test_text_question(self):
        """Test text question creation."""
        q = QuizQuestion(
            id="name",
            type=QuestionType.TEXT,
            prompt="What's your name?",
            required=True,
            placeholder="Enter name...",
        )

        assert q.type == QuestionType.TEXT
        assert q.required is True

    def test_single_select_question(self):
        """Test single select question."""
        q = QuizQuestion(
            id="color",
            type=QuestionType.SINGLE_SELECT,
            prompt="Pick a color",
            options=[
                QuizOption("red", "Red"),
                QuizOption("blue", "Blue"),
            ],
        )

        data = q.to_dict()
        assert len(data["options"]) == 2

    def test_multi_select_question(self):
        """Test multi select question."""
        q = QuizQuestion(
            id="tlds",
            type=QuestionType.MULTI_SELECT,
            prompt="Pick TLDs",
            options=[
                QuizOption("com", ".com"),
                QuizOption("io", ".io"),
            ],
            default=["com"],
        )

        data = q.to_dict()
        assert data["default"] == ["com"]

    def test_from_dict(self):
        """Test question deserialization."""
        data = {
            "id": "test",
            "type": "text",
            "prompt": "Test?",
            "required": False,
        }

        q = QuizQuestion.from_dict(data)
        assert q.id == "test"
        assert q.type == QuestionType.TEXT


class TestInitialQuiz:
    """Tests for InitialQuiz."""

    def test_basic_creation(self):
        """Test basic quiz creation."""
        quiz = InitialQuiz(
            business_name="My Business",
            vibe="creative",
        )

        assert quiz.business_name == "My Business"
        assert quiz.vibe == "creative"
        assert quiz.tld_preferences == ["com", "any"]  # Default

    def test_full_creation(self):
        """Test with all fields."""
        quiz = InitialQuiz(
            business_name="Test",
            domain_idea="test.com",
            tld_preferences=["io", "dev"],
            vibe="minimal",
            keywords="tech, startup",
        )

        assert quiz.domain_idea == "test.com"
        assert quiz.keywords == "tech, startup"

    def test_to_dict(self):
        """Test serialization."""
        quiz = InitialQuiz(business_name="Test", vibe="bold")
        data = quiz.to_dict()

        assert data["business_name"] == "Test"
        assert data["vibe"] == "bold"

    def test_from_dict(self):
        """Test deserialization."""
        data = {
            "business_name": "Loaded",
            "vibe": "personal",
            "tld_preferences": ["me"],
        }

        quiz = InitialQuiz.from_dict(data)
        assert quiz.business_name == "Loaded"
        assert quiz.tld_preferences == ["me"]

    def test_from_responses(self):
        """Test creation from quiz responses."""
        responses = [
            QuizResponse(question_id="business_name", value="MyBiz"),
            QuizResponse(question_id="vibe", value="creative"),
            QuizResponse(question_id="tld_preference", value=["com", "io"]),
        ]

        quiz = InitialQuiz.from_responses(responses)

        assert quiz.business_name == "MyBiz"
        assert quiz.vibe == "creative"


class TestFollowupQuiz:
    """Tests for FollowupQuiz."""

    def test_creation(self):
        """Test followup quiz creation."""
        questions = [
            QuizQuestion(
                id="q1",
                type=QuestionType.SINGLE_SELECT,
                prompt="Question 1?",
                options=[QuizOption("a", "A"), QuizOption("b", "B")],
            ),
        ]

        followup = FollowupQuiz(questions=questions, context={"batch": 3})

        assert len(followup.questions) == 1
        assert followup.context["batch"] == 3

    def test_to_dict(self):
        """Test serialization."""
        followup = FollowupQuiz(
            questions=[
                QuizQuestion(id="q", type=QuestionType.TEXT, prompt="Q?"),
            ],
        )

        data = followup.to_dict()
        assert len(data["questions"]) == 1


class TestInitialQuizSchema:
    """Tests for the static initial quiz schema."""

    def test_schema_exists(self):
        """Test schema is defined."""
        assert len(INITIAL_QUIZ_SCHEMA) == 5

    def test_required_questions(self):
        """Test required questions."""
        required_ids = {"business_name", "tld_preference", "vibe"}
        for q in INITIAL_QUIZ_SCHEMA:
            if q.id in required_ids:
                assert q.required is True

    def test_optional_questions(self):
        """Test optional questions."""
        optional_ids = {"domain_idea", "keywords"}
        for q in INITIAL_QUIZ_SCHEMA:
            if q.id in optional_ids:
                assert q.required is False

    def test_get_initial_quiz_dict(self):
        """Test dict export."""
        data = get_initial_quiz_dict()

        assert isinstance(data, list)
        assert len(data) == 5
        assert all("id" in q for q in data)


class TestValidation:
    """Tests for quiz validation."""

    def test_valid_responses(self):
        """Test valid responses pass validation."""
        responses = {
            "business_name": "Test Business",
            "tld_preference": ["com", "io"],
            "vibe": "professional",
        }

        is_valid, errors = validate_initial_responses(responses)

        assert is_valid is True
        assert len(errors) == 0

    def test_missing_required(self):
        """Test missing required field."""
        responses = {
            "tld_preference": ["com"],
            "vibe": "creative",
        }

        is_valid, errors = validate_initial_responses(responses)

        assert is_valid is False
        assert any("required" in e for e in errors)

    def test_invalid_single_select(self):
        """Test invalid single select value."""
        responses = {
            "business_name": "Test",
            "tld_preference": ["com"],
            "vibe": "invalid_vibe",
        }

        is_valid, errors = validate_initial_responses(responses)

        assert is_valid is False
        assert any("Invalid" in e for e in errors)

    def test_invalid_multi_select_type(self):
        """Test multi select with wrong type."""
        responses = {
            "business_name": "Test",
            "tld_preference": "com",  # Should be list
            "vibe": "professional",
        }

        is_valid, errors = validate_initial_responses(responses)

        assert is_valid is False
        assert any("list" in e for e in errors)


class TestFollowupQuizGenerator:
    """Tests for FollowupQuizGenerator."""

    @pytest.fixture
    def generator(self):
        """Create generator with mock provider."""
        return FollowupQuizGenerator(MockProvider())

    @pytest.mark.asyncio
    async def test_generate_followup(self, generator):
        """Test followup quiz generation."""
        followup = await generator.generate(
            original_quiz={"business_name": "Test", "vibe": "creative"},
            batches_completed=3,
            total_checked=150,
            good_found=10,
            target=25,
            checked_domains=["a.com", "b.io", "c.dev"],
            available_domains=["b.io"],
        )

        assert len(followup.questions) > 0
        assert len(followup.questions) <= 3
        assert followup.context["batches_completed"] == 3

    def test_analyze_availability(self, generator):
        """Test availability pattern analysis."""
        patterns = generator._analyze_availability(
            checked=["a.com", "b.com", "c.io", "d.io", "e.io"],
            available=["c.io", "d.io"],
        )

        assert ".io" in patterns
        assert ".com" in patterns

    def test_summarize_taken(self, generator):
        """Test taken domain summary."""
        summary = generator._summarize_taken(
            checked=["short.com", "medium.com", "verylongdomainname.io"],
            available=["verylongdomainname.io"],
        )

        assert "short" in summary.lower() or "taken" in summary.lower()

    def test_default_questions(self, generator):
        """Test default fallback questions."""
        questions = generator._default_followup_questions()

        assert len(questions) == 3
        assert all(isinstance(q, QuizQuestion) for q in questions)
