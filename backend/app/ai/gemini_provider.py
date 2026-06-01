import json
import asyncio
import google.generativeai as genai
from app.config import settings
from app.ai.interfaces import (
    AIProvider, CategorizationResult, PriorityResult, SummaryTagsResult
)

genai.configure(api_key=settings.GEMINI_API_KEY)


class GeminiProvider(AIProvider):

    def __init__(self):
        self.model = genai.GenerativeModel(settings.GEMINI_MODEL)
        self.embedding_model = "models/text-embedding-004"

    async def _generate(self, prompt: str) -> str:
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(
            None,
            lambda: self.model.generate_content(prompt)
        )
        return response.text.strip()

    # ─── Categorization ───────────────────────────────────────────────────────

    async def categorize(self, title: str, description: str) -> CategorizationResult:
        prompt = f"""You are an HR/Complaint system classifier. Analyze the complaint below and respond ONLY with a JSON object.

Complaint Title: {title}
Complaint Description: {description}

Respond with this exact JSON structure:
{{
  "department": "HR | IT | Finance | Operations | Legal | Facilities | Management | Other",
  "sub_category": "a specific sub-category label (e.g., 'Workplace Harassment', 'Payroll Issue', 'Equipment Failure')",
  "is_hr_sensitive": true or false,
  "reason": "short 1-2 sentence explanation of why this category was chosen",
  "confidence": 0.0 to 1.0
}}

Rules:
- is_hr_sensitive = true for harassment, discrimination, bullying, misconduct, pay disputes
- department must be one of the listed values
- confidence reflects how sure you are"""

        try:
            text = await self._generate(prompt)
            # Strip markdown code fences if present
            if "```" in text:
                text = text.split("```")[1]
                if text.startswith("json"):
                    text = text[4:]
            data = json.loads(text.strip())
            return CategorizationResult(
                department=data["department"],
                sub_category=data["sub_category"],
                is_hr_sensitive=bool(data["is_hr_sensitive"]),
                reason=data["reason"],
                confidence=float(data["confidence"]),
                source="AI",
            )
        except Exception as e:
            raise RuntimeError(f"Gemini categorization failed: {e}") from e

    # ─── Priority ─────────────────────────────────────────────────────────────

    async def get_priority(self, title: str, description: str, is_hr_sensitive: bool) -> PriorityResult:
        prompt = f"""You are a complaint priority assessor. Analyze this complaint and respond ONLY with JSON.

Title: {title}
Description: {description}
HR Sensitive: {is_hr_sensitive}

Respond with:
{{
  "priority_level": "LOW | MEDIUM | HIGH | CRITICAL",
  "priority_score": 0.0 to 1.0,
  "reason": "1-2 sentence explanation"
}}

Priority guide:
- CRITICAL: immediate safety risk, legal threat, severe harassment
- HIGH: serious disruption, HR-sensitive issues, urgent operational problem
- MEDIUM: moderate impact, needs attention within a few days
- LOW: minor issue, informational, can wait"""

        try:
            text = await self._generate(prompt)
            if "```" in text:
                text = text.split("```")[1]
                if text.startswith("json"):
                    text = text[4:]
            data = json.loads(text.strip())
            return PriorityResult(
                priority_level=data["priority_level"],
                priority_score=float(data["priority_score"]),
                reason=data["reason"],
                source="AI",
            )
        except Exception as e:
            raise RuntimeError(f"Gemini priority failed: {e}") from e

    # ─── Embeddings ───────────────────────────────────────────────────────────

    async def get_embedding(self, text: str) -> list[float]:
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(
            None,
            lambda: genai.embed_content(
                model=self.embedding_model,
                content=text,
                task_type="SEMANTIC_SIMILARITY"
            )
        )
        return response["embedding"]

    # ─── Summary & Tags ───────────────────────────────────────────────────────

    async def summarize_and_tag(self, title: str, description: str) -> SummaryTagsResult:
        prompt = f"""Summarize this complaint in 2-3 sentences and generate 3-6 searchable tags.

Title: {title}
Description: {description}

Respond ONLY with JSON:
{{
  "summary": "concise 2-3 sentence summary",
  "tags": ["tag1", "tag2", "tag3"]
}}"""

        try:
            text = await self._generate(prompt)
            if "```" in text:
                text = text.split("```")[1]
                if text.startswith("json"):
                    text = text[4:]
            data = json.loads(text.strip())
            return SummaryTagsResult(
                summary=data["summary"],
                tags=data["tags"][:6],
            )
        except Exception as e:
            raise RuntimeError(f"Gemini summary/tags failed: {e}") from e


# Singleton instance
gemini_provider = GeminiProvider()
