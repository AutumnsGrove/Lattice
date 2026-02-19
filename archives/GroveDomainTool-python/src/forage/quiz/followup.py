"""
Follow-up quiz generator

Uses AI to generate personalized follow-up questions based on search results.
"""

import json
import re
from typing import Optional

from ..providers.base import ModelProvider
from ..agents.prompts import FOLLOWUP_QUIZ_SYSTEM, format_followup_prompt
from .schema import FollowupQuiz, QuizQuestion, QuizOption, QuestionType


class FollowupQuizGenerator:
    """
    Generates dynamic follow-up quizzes based on search results.

    When a search doesn't find enough good domains, this generator
    creates targeted questions to refine the search.
    """

    def __init__(self, provider: ModelProvider, model: Optional[str] = None):
        """
        Initialize generator.

        Args:
            provider: AI model provider
            model: Optional model override
        """
        self.provider = provider
        self.model = model

    async def generate(
        self,
        original_quiz: dict,
        batches_completed: int,
        total_checked: int,
        good_found: int,
        target: int,
        checked_domains: list[str],
        available_domains: list[str],
    ) -> FollowupQuiz:
        """
        Generate a follow-up quiz based on search results.

        Args:
            original_quiz: Original quiz responses
            batches_completed: Number of batches completed
            total_checked: Total domains checked
            good_found: Number of good domains found
            target: Target number of domains
            checked_domains: All domains checked
            available_domains: Domains that were available

        Returns:
            FollowupQuiz with 3 targeted questions
        """
        # Analyze patterns
        availability_patterns = self._analyze_availability(
            checked_domains, available_domains
        )
        taken_summary = self._summarize_taken(checked_domains, available_domains)
        available_summary = self._summarize_available(available_domains)

        # Format prompt
        prompt = format_followup_prompt(
            original_quiz=original_quiz,
            batches_completed=batches_completed,
            total_checked=total_checked,
            good_found=good_found,
            target=target,
            availability_patterns=availability_patterns,
            taken_summary=taken_summary,
            available_summary=available_summary,
        )

        # Generate
        response = await self.provider.generate(
            prompt=prompt,
            system=FOLLOWUP_QUIZ_SYSTEM,
            model=self.model,
            max_tokens=2048,
            temperature=0.7,
        )

        # Parse response
        questions = self._parse_questions(response.content)

        # Build context
        context = {
            "batches_completed": batches_completed,
            "total_checked": total_checked,
            "good_found": good_found,
            "target": target,
            "availability_rate": len(available_domains) / max(1, len(checked_domains)),
        }

        return FollowupQuiz(questions=questions, context=context)

    def _analyze_availability(
        self,
        checked: list[str],
        available: list[str],
    ) -> str:
        """Analyze availability patterns."""
        if not checked:
            return "No domains checked yet"

        available_set = set(d.lower() for d in available)

        # TLD analysis
        tld_stats: dict[str, dict] = {}
        for domain in checked:
            tld = domain.split(".")[-1].lower()
            if tld not in tld_stats:
                tld_stats[tld] = {"checked": 0, "available": 0}
            tld_stats[tld]["checked"] += 1
            if domain.lower() in available_set:
                tld_stats[tld]["available"] += 1

        # Format patterns
        patterns = []
        for tld, stats in sorted(tld_stats.items(), key=lambda x: -x[1]["checked"]):
            rate = stats["available"] / max(1, stats["checked"]) * 100
            patterns.append(f".{tld}: {stats['available']}/{stats['checked']} available ({rate:.0f}%)")

        return "\n".join(patterns[:5])

    def _summarize_taken(self, checked: list[str], available: list[str]) -> str:
        """Summarize taken domains."""
        available_set = set(d.lower() for d in available)
        taken = [d for d in checked if d.lower() not in available_set]

        if not taken:
            return "None - all checked domains were available!"

        # Group by pattern
        short_taken = [d for d in taken if len(d.split(".")[0]) <= 8]
        long_taken = [d for d in taken if len(d.split(".")[0]) > 8]

        summary_parts = []
        if short_taken:
            summary_parts.append(f"Short names taken: {', '.join(short_taken[:5])}")
        if long_taken:
            summary_parts.append(f"Longer names taken: {', '.join(long_taken[:5])}")

        return "\n".join(summary_parts) if summary_parts else f"Examples: {', '.join(taken[:8])}"

    def _summarize_available(self, available: list[str]) -> str:
        """Summarize available domains."""
        if not available:
            return "None found yet"

        # Sort by TLD for grouping
        by_tld: dict[str, list[str]] = {}
        for domain in available:
            tld = domain.split(".")[-1].lower()
            if tld not in by_tld:
                by_tld[tld] = []
            by_tld[tld].append(domain)

        parts = []
        for tld, domains in sorted(by_tld.items(), key=lambda x: -len(x[1])):
            parts.append(f".{tld}: {', '.join(domains[:3])}")

        return "\n".join(parts[:4])

    def _parse_questions(self, content: str) -> list[QuizQuestion]:
        """Parse questions from AI response."""
        questions = []

        try:
            # Find JSON
            json_match = re.search(r'\{[\s\S]*\}', content)
            if json_match:
                data = json.loads(json_match.group())
                for q_data in data.get("questions", []):
                    question = self._parse_question(q_data)
                    if question:
                        questions.append(question)
        except json.JSONDecodeError:
            pass

        # Fallback: generate default follow-up questions
        if not questions:
            questions = self._default_followup_questions()

        return questions[:3]  # Limit to 3 questions

    def _parse_question(self, data: dict) -> Optional[QuizQuestion]:
        """Parse a single question from dict."""
        try:
            q_type = QuestionType(data.get("type", "single_select"))
            options = [
                QuizOption(value=o["value"], label=o["label"])
                for o in data.get("options", [])
            ]

            return QuizQuestion(
                id=data.get("id", "followup"),
                type=q_type,
                prompt=data.get("prompt", ""),
                required=data.get("required", False),
                options=options,
            )
        except (KeyError, ValueError):
            return None

    def _default_followup_questions(self) -> list[QuizQuestion]:
        """Default follow-up questions when AI generation fails."""
        return [
            QuizQuestion(
                id="followup_direction",
                type=QuestionType.SINGLE_SELECT,
                prompt="Your preferred name wasn't available. What would you like to try?",
                options=[
                    QuizOption(value="variation", label="Try variations of the same name"),
                    QuizOption(value="different_tld", label="Try different domain endings (.co, .io, etc.)"),
                    QuizOption(value="new_name", label="Explore completely different names"),
                ],
            ),
            QuizQuestion(
                id="followup_length",
                type=QuestionType.SINGLE_SELECT,
                prompt="Short names are mostly taken. What's your preference?",
                options=[
                    QuizOption(value="keep_short", label="Keep trying for short names"),
                    QuizOption(value="longer_ok", label="Longer, more descriptive names are fine"),
                    QuizOption(value="compound", label="Try compound words or phrases"),
                ],
            ),
            QuizQuestion(
                id="followup_keywords",
                type=QuestionType.TEXT,
                prompt="Any new keywords or themes to explore?",
                required=False,
                placeholder="e.g., local, artisan, modern",
            ),
        ]
