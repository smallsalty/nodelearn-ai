import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

from app.schemas.common import (
    AgentType,
    AuditStatus,
    CognitiveStyle,
    CourseStatus,
    DifficultyLevel,
    NodeType,
    PracticePreference,
    ResourceType,
    TaskStatus,
)


def test_core_enum_values_match_contract_subset():
    assert CourseStatus.published.value == "published"
    assert NodeType.question_type.value == "question_type"
    assert DifficultyLevel.challenge.value == "challenge"
    assert ResourceType.summary_note.value == "summary_note"
    assert ResourceType.knowledge_video.value == "knowledge_video"
    assert ResourceType.digital_human_video.value == "digital_human_video"
    assert AgentType.knowledge_graph_agent.value == "knowledge_graph_agent"
    assert AgentType.qa_agent.value == "qa_agent"
    assert AgentType.digital_human_agent.value == "digital_human_agent"
    assert AgentType.video_generation_agent.value == "video_generation_agent"
    assert TaskStatus.cancelled.value == "cancelled"
    assert AuditStatus.need_review.value == "need_review"
    assert CognitiveStyle.diagram.value == "diagram"
    assert PracticePreference.case.value == "case"
    assert ResourceType.mind_map.value == "mind_map"
    # TODO: exhaustively compare enum values against docs/interface-contract.md.
