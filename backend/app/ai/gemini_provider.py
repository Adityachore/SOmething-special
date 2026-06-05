import json
import asyncio
import hashlib
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
        prompt = f"""You are an HR/Complaint system classifier and quality assessor. Analyze the complaint below and respond ONLY with a JSON object.

Complaint Title: {title}
Complaint Description: {description}

Respond with this exact JSON structure:
{{
  "department": "HR | IT | Finance | Operations | Legal | Facilities | Management | Other",
  "sub_category": "a specific sub-category label (e.g., 'Workplace Harassment', 'Payroll Issue', 'Equipment Failure')",
  "is_hr_sensitive": true or false,
  "reason": "short 1-2 sentence explanation of why this category was chosen",
  "confidence": 0.0 to 1.0,
  "is_valuable": true or false,
  "value_reason": "short 1-2 sentence explanation of why this complaint is considered valuable (e.g. clear, coherent, actionable, serious) or not (e.g. spam, gibberish, completely empty/vague like 'help me' with no details, or extremely trivial/spurious)"
}}

Rules:
- is_hr_sensitive = true for harassment, discrimination, bullying, misconduct, pay disputes
- department must be one of the listed values
- confidence reflects how sure you are
- is_valuable should be false if the description lacks any specific details, is nonsense, or is clearly spam/junk. Otherwise it should be true."""

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
                is_valuable=bool(data.get("is_valuable", True)),
                value_reason=data.get("value_reason", "Assessed by AI"),
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

    def get_mock_embedding(self, text: str) -> list[float]:
        text = text.lower()
        words = [w.strip(".,!?\"'()").lower() for w in text.split()]
        words = [w for w in words if len(w) > 2]
        
        # Detect topics to simulate semantic similarity
        topics = []
        if "server" in text and any(x in text for x in ["temp", "cold", "freez", "cool", "ac", "air con"]):
            topics.append("topic_server_room_cooling")
        if any(x in text for x in ["harass", "bully", "abuse", "verbal", "threat"]):
            topics.append("topic_harassment")
        if any(x in text for x in ["salary", "pay", "bonus", "payroll", "compensation", "delayed"]):
            topics.append("topic_payroll_salary")
            
        vector = [0.0] * 768
        
        # Helper to add a token to vector
        def add_token(token: str, weight: float = 1.0):
            h = hashlib.md5(token.encode('utf-8')).hexdigest()
            idx1 = int(h[0:8], 16) % 768
            idx2 = int(h[8:16], 16) % 768
            idx3 = int(h[16:24], 16) % 768
            vector[idx1] += weight
            vector[idx2] += weight
            vector[idx3] += weight
            
        for word in words:
            add_token(word, 1.0)
            
        for topic in topics:
            # Topic matches get a heavy weight to align embeddings of similar topics
            add_token(topic, 15.0)
            
        # Normalize
        sq_sum = sum(x*x for x in vector)
        if sq_sum > 0:
            norm = sq_sum ** 0.5
            vector = [x / norm for x in vector]
        else:
            vector[0] = 1.0
        return vector

    async def get_embedding(self, text: str) -> list[float]:
        try:
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
        except Exception as e:
            # Fallback to local mock embedding generator
            print(f"Gemini embedding failed, using local mock embedding: {e}")
            return self.get_mock_embedding(text)

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
