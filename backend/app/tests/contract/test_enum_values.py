import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

from app.schemas.common import AgentType, AuditStatus, CourseStatus, DifficultyLevel, NodeType, ResourceType, TaskStatus


def test_core_enum_values_match_contract_subset():
    assert CourseStatus.published.value == "published"
    assert NodeType.question_type.value == "question_type"
    assert DifficultyLevel.challenge.value == "challenge"
    assert ResourceType.summary_note.value == "summary_note"
    assert AgentType.knowledge_graph_agent.value == "knowledge_graph_agent"
    assert TaskStatus.cancelled.value == "cancelled"
    assert AuditStatus.need_review.value == "need_review"
    # TODO: exhaustively compare enum values against docs/interface-contract.md.
