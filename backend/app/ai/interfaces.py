from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Optional


@dataclass
class CategorizationResult:
    department: str
    sub_category: str
    is_hr_sensitive: bool
    reason: str
    confidence: float
    source: str = "AI"  # "AI" or "RULE"


@dataclass
class PriorityResult:
    priority_level: str  # LOW, MEDIUM, HIGH, CRITICAL
    priority_score: float  # 0.0–1.0
    reason: str
    source: str = "AI"


@dataclass
class SimilarityResult:
    is_repeat: bool
    similar_complaint_ids: list[str]
    cluster_id: Optional[str]
    similarity_score: float


@dataclass
class SummaryTagsResult:
    summary: str
    tags: list[str]


class AIProvider(ABC):

    @abstractmethod
    async def categorize(self, title: str, description: str) -> CategorizationResult:
        """Detect department, sub-category, HR sensitivity."""
        pass

    @abstractmethod
    async def get_priority(self, title: str, description: str, is_hr_sensitive: bool) -> PriorityResult:
        """Determine urgency/priority level."""
        pass

    @abstractmethod
    async def get_embedding(self, text: str) -> list[float]:
        """Generate text embedding for similarity search."""
        pass

    @abstractmethod
    async def summarize_and_tag(self, title: str, description: str) -> SummaryTagsResult:
        """Generate a short summary and searchable tags."""
        pass
