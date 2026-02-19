"""
Mock provider for testing

Returns configurable responses without making API calls.
"""

import json
import random
from typing import Optional, List, Callable, Any
from dataclasses import dataclass, field

from .base import ModelProvider, ModelResponse


# Common TLDs for domain generation
COMMON_TLDS = ["com", "co", "io", "dev", "app", "me", "net", "org"]

# Sample business name variations
PREFIXES = ["get", "try", "use", "my", "the", "go", "hey", "hello"]
SUFFIXES = ["hq", "app", "io", "labs", "studio", "works", "co", "hub"]


def generate_mock_domains(business_name: str, count: int = 50) -> List[str]:
    """
    Generate mock domain suggestions based on a business name.

    Args:
        business_name: The business/project name
        count: Number of domains to generate

    Returns:
        List of domain name suggestions
    """
    # Clean the business name
    base = business_name.lower().replace(" ", "").replace("-", "").replace("_", "")
    short = base[:8] if len(base) > 8 else base

    domains = []

    # Direct name with various TLDs
    for tld in COMMON_TLDS:
        domains.append(f"{base}.{tld}")
        domains.append(f"{short}.{tld}")

    # Prefix variations
    for prefix in PREFIXES:
        tld = random.choice(COMMON_TLDS)
        domains.append(f"{prefix}{base}.{tld}")

    # Suffix variations
    for suffix in SUFFIXES:
        tld = random.choice(COMMON_TLDS)
        domains.append(f"{base}{suffix}.{tld}")

    # Creative variations
    if len(base) > 4:
        # Abbreviated
        abbrev = base[:3] + base[-2:]
        domains.append(f"{abbrev}.io")
        domains.append(f"{abbrev}.co")

    # Shuffle and limit
    random.shuffle(domains)
    return list(set(domains))[:count]


def generate_mock_evaluation(domain: str) -> dict:
    """
    Generate a mock evaluation for a domain.

    Args:
        domain: The domain to evaluate

    Returns:
        Evaluation dict with scores and notes
    """
    name = domain.split(".")[0]
    tld = domain.split(".")[-1]

    # Score based on length and TLD
    length_score = max(0.3, 1.0 - (len(name) - 6) * 0.1)
    tld_scores = {"com": 0.95, "co": 0.85, "io": 0.80, "dev": 0.75, "app": 0.70}
    tld_score = tld_scores.get(tld, 0.6)

    overall = (length_score + tld_score) / 2 + random.uniform(-0.1, 0.1)
    overall = max(0.1, min(1.0, overall))

    return {
        "domain": domain,
        "score": round(overall, 2),
        "worth_checking": overall > 0.5,
        "pronounceable": len(name) < 12 and not any(c.isdigit() for c in name),
        "memorable": len(name) < 10,
        "brand_fit": overall > 0.6,
        "notes": f"{'Short and catchy' if len(name) < 8 else 'Longer but descriptive'}, .{tld} is {'premium' if tld == 'com' else 'modern'}",
    }


@dataclass
class MockProvider(ModelProvider):
    """
    Mock provider for testing.

    Can be configured with custom response generators or fixed responses.
    """

    _name: str = "mock"
    _default_model: str = "mock-model-v1"
    fixed_response: Optional[str] = None
    response_generator: Optional[Callable[[str], str]] = None
    delay_seconds: float = 0.0
    fail_rate: float = 0.0  # Probability of raising an error
    token_count: int = 100

    @property
    def name(self) -> str:
        return self._name

    @property
    def default_model(self) -> str:
        return self._default_model

    async def generate(
        self,
        prompt: str,
        *,
        system: Optional[str] = None,
        model: Optional[str] = None,
        max_tokens: int = 4096,
        temperature: float = 0.7,
        **kwargs
    ) -> ModelResponse:
        """Generate a mock response."""
        import asyncio

        # Simulate delay
        if self.delay_seconds > 0:
            await asyncio.sleep(self.delay_seconds)

        # Simulate failures
        if self.fail_rate > 0 and random.random() < self.fail_rate:
            from .base import ProviderError
            raise ProviderError("Simulated mock provider failure")

        # Generate response
        if self.fixed_response is not None:
            content = self.fixed_response
        elif self.response_generator is not None:
            content = self.response_generator(prompt)
        else:
            content = self._default_response(prompt, system)

        return ModelResponse(
            content=content,
            model=model or self._default_model,
            provider=self.name,
            usage={
                "input_tokens": len(prompt.split()) * 2,
                "output_tokens": self.token_count,
            },
        )

    def _default_response(self, prompt: str, system: Optional[str] = None) -> str:
        """
        Generate a contextual mock response based on prompt content.

        Tries to detect what kind of response is expected and returns appropriate mock data.
        """
        prompt_lower = prompt.lower()

        # Domain generation request
        if "domain" in prompt_lower and ("generate" in prompt_lower or "suggest" in prompt_lower or "candidate" in prompt_lower):
            # Try to extract business name from prompt
            business_name = "example"
            if "business" in prompt_lower or "name" in prompt_lower:
                # Simple extraction - look for quoted strings
                import re
                quoted = re.findall(r'"([^"]+)"', prompt)
                if quoted:
                    business_name = quoted[0]

            domains = generate_mock_domains(business_name, count=50)
            return json.dumps({"domains": domains}, indent=2)

        # Domain evaluation request
        if "evaluat" in prompt_lower and "domain" in prompt_lower:
            # Try to find domains in the prompt
            import re
            domain_pattern = r'\b([a-z0-9][-a-z0-9]*\.[a-z]{2,})\b'
            domains = re.findall(domain_pattern, prompt_lower)

            if domains:
                evaluations = [generate_mock_evaluation(d) for d in domains[:10]]
                return json.dumps({"evaluations": evaluations}, indent=2)

            # Generic evaluation response
            return json.dumps({
                "evaluations": [
                    generate_mock_evaluation("example.com"),
                    generate_mock_evaluation("test.io"),
                ]
            }, indent=2)

        # Follow-up quiz generation
        if "quiz" in prompt_lower or "question" in prompt_lower:
            return json.dumps({
                "questions": [
                    {
                        "id": "followup_1",
                        "type": "single_select",
                        "prompt": "Your first choice was taken. Would you prefer a variation or different TLD?",
                        "options": [
                            {"value": "variation", "label": "Try a variation of the name"},
                            {"value": "different_tld", "label": "Try different domain endings"},
                            {"value": "new_direction", "label": "Explore completely new names"},
                        ]
                    },
                    {
                        "id": "followup_2",
                        "type": "text",
                        "prompt": "Any additional keywords or themes to explore?",
                        "required": False
                    },
                    {
                        "id": "followup_3",
                        "type": "single_select",
                        "prompt": "What's your budget for the domain?",
                        "options": [
                            {"value": "bundled", "label": "Keep it under $30/year"},
                            {"value": "flexible", "label": "Up to $50/year is fine"},
                            {"value": "premium_ok", "label": "Willing to pay premium for the right name"},
                        ]
                    }
                ]
            }, indent=2)

        # Default generic response
        return json.dumps({
            "message": "Mock response generated",
            "prompt_length": len(prompt),
            "has_system": system is not None,
        }, indent=2)


def create_domain_generator_mock(business_name: str = "example") -> MockProvider:
    """Create a mock provider configured for domain generation."""

    def generator(prompt: str) -> str:
        domains = generate_mock_domains(business_name, count=50)
        return json.dumps({"domains": domains}, indent=2)

    return MockProvider(response_generator=generator)


def create_evaluator_mock() -> MockProvider:
    """Create a mock provider configured for domain evaluation."""

    def generator(prompt: str) -> str:
        import re
        domain_pattern = r'\b([a-z0-9][-a-z0-9]*\.[a-z]{2,})\b'
        domains = re.findall(domain_pattern, prompt.lower())

        if domains:
            evaluations = [generate_mock_evaluation(d) for d in domains[:10]]
        else:
            evaluations = [generate_mock_evaluation("example.com")]

        return json.dumps({"evaluations": evaluations}, indent=2)

    return MockProvider(response_generator=generator)
