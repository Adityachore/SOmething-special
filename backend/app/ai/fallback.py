"""
Rule-based fallback for when Gemini AI fails.
These are keyword heuristic classifiers, not ML.
"""
from app.ai.interfaces import CategorizationResult, PriorityResult, SummaryTagsResult

# Keyword → department mapping
DEPT_KEYWORDS = {
    "HR": ["harassment", "bullying", "discrimination", "misconduct", "hostile", "hr", "human resources", "inappropriate", "abuse"],
    "IT": ["computer", "laptop", "software", "system", "internet", "network", "email", "access", "password", "it support"],
    "Finance": ["salary", "payroll", "bonus", "pay", "reimbursement", "expense", "allowance", "payment"],
    "Operations": ["process", "workflow", "operations", "procedure", "delay", "efficiency"],
    "Legal": ["legal", "contract", "compliance", "policy", "regulation", "law", "lawsuit"],
    "Facilities": ["office", "bathroom", "parking", "temperature", "facilities", "cleaning", "equipment", "desk"],
    "Management": ["manager", "supervisor", "boss", "leadership", "management", "promotion", "performance"],
}

HR_KEYWORDS = {"harassment", "bullying", "discrimination", "misconduct", "hostile", "abuse", "inappropriate", "assault"}

CRITICAL_KEYWORDS = {"violence", "assault", "threat", "illegal", "law enforcement", "safety", "danger"}
HIGH_KEYWORDS = {"urgent", "immediate", "harassment", "discrimination", "unfair", "severe"}
LOW_KEYWORDS = {"minor", "small", "suggestion", "feedback", "nice to have"}


def _text(title: str, desc: str) -> str:
    return f"{title} {desc}".lower()


def fallback_categorize(title: str, description: str) -> CategorizationResult:
    text = _text(title, description)
    words = set(text.split())

    department = "Other"
    for dept, keywords in DEPT_KEYWORDS.items():
        if any(kw in text for kw in keywords):
            department = dept
            break

    is_hr_sensitive = bool(HR_KEYWORDS & words) or department == "HR"

    return CategorizationResult(
        department=department,
        sub_category="General",
        is_hr_sensitive=is_hr_sensitive,
        reason="Auto-classified by keyword rules (AI unavailable).",
        confidence=0.4,
        source="RULE",
    )


def fallback_priority(title: str, description: str, is_hr_sensitive: bool) -> PriorityResult:
    text = _text(title, description)
    words = set(text.split())

    if CRITICAL_KEYWORDS & words:
        level, score = "CRITICAL", 0.9
    elif HIGH_KEYWORDS & words or is_hr_sensitive:
        level, score = "HIGH", 0.7
    elif LOW_KEYWORDS & words:
        level, score = "LOW", 0.2
    else:
        level, score = "MEDIUM", 0.5

    return PriorityResult(
        priority_level=level,
        priority_score=score,
        reason="Auto-prioritized by keyword rules (AI unavailable).",
        source="RULE",
    )


def fallback_summary_tags(title: str, description: str) -> SummaryTagsResult:
    summary = f"{title}. {description[:200]}..." if len(description) > 200 else f"{title}. {description}"
    return SummaryTagsResult(summary=summary, tags=[])
