from __future__ import annotations

from collections.abc import Iterable

from app.schemas.course import KnowledgeNode
from app.schemas.practice import PracticeRecord
from app.schemas.profile import StudentProfile
from app.schemas.resource import RetrievedDocument
from app.services.video_pipeline.models import (
    ContextNode,
    LearnerContext,
    PracticeEvidence,
    RagEvidence,
    VideoGenerationContext,
)


def _value(value: object | None) -> str | None:
    if value is None:
        return None
    return str(getattr(value, "value", value))


class VideoContextBuilder:
    """Build and trim prompt context without inventing learner evidence."""

    def build(
        self,
        *,
        course_id: str,
        node: KnowledgeNode | None,
        profile: StudentProfile | None,
        practice_records: Iterable[PracticeRecord],
        documents: Iterable[RetrievedDocument],
        available_nodes: Iterable[KnowledgeNode] = (),
        course_name: str | None = None,
        learning_goal: str | None = None,
        custom_requirement: str | None = None,
    ) -> VideoGenerationContext:
        current = node or self._unknown_node(course_id)
        node_by_id = {item.id: item for item in available_nodes}
        prerequisites = [
            self._context_node(node_by_id[node_id])
            for node_id in current.prerequisite_node_ids[:8]
            if node_id in node_by_id
        ]

        records = [
            record
            for record in practice_records
            if record.node_id == current.id
        ]
        records.sort(key=lambda item: item.created_at, reverse=True)
        records = records[:10]
        relevant_mistakes = list(
            dict.fromkeys(
                record.mistake_reason.strip()
                for record in records
                if not record.is_correct and record.mistake_reason and record.mistake_reason.strip()
            )
        )[:12]

        learner = LearnerContext(
            cognitive_style=_value(profile.cognitive_style) if profile else None,
            practice_preference=_value(profile.practice_preference) if profile else None,
            knowledge_base_level=_value(profile.knowledge_base_level) if profile else None,
            learning_goal=profile.learning_goal if profile else None,
            weak_node_ids=profile.weak_node_ids[:20] if profile else [],
            common_mistakes=profile.common_mistakes[:12] if profile else [],
            profile_summary=profile.profile_summary if profile else None,
        )
        practice_evidence = [
            PracticeEvidence(
                question_id=record.question_id,
                is_correct=record.is_correct,
                mistake_reason=record.mistake_reason,
                user_answer=record.user_answer,
                correct_answer=record.correct_answer,
                created_at=record.created_at,
            )
            for record in records
        ]
        rag = [
            RagEvidence(
                source_id=document.source_id,
                title=document.title[:120],
                excerpt=document.content[:900],
                score=document.score,
            )
            for document in list(documents)[:5]
        ]
        return VideoGenerationContext(
            course_id=course_id,
            course_name=course_name,
            current_node=self._context_node(current),
            prerequisite_nodes=prerequisites,
            learner=learner,
            relevant_mistakes=relevant_mistakes,
            recent_practice=practice_evidence,
            rag_evidence=rag,
            learning_goal=learning_goal,
            custom_requirement=custom_requirement,
        )

    @staticmethod
    def _context_node(node: KnowledgeNode) -> ContextNode:
        return ContextNode(
            id=node.id,
            name=node.name,
            description=node.description,
            difficulty=_value(node.difficulty),
            common_mistakes=node.common_mistakes[:10],
        )

    @staticmethod
    def _unknown_node(course_id: str) -> KnowledgeNode:
        return KnowledgeNode.model_validate(
            {
                "id": "unknown_node",
                "course_id": course_id,
                "name": "当前知识点",
                "node_type": "concept",
                "difficulty": "medium",
                "learning_value": 0,
                "prerequisite_node_ids": [],
                "next_node_ids": [],
                "resource_ids": [],
                "common_mistakes": [],
                "recommended_practice_ids": [],
                "created_at": "1970-01-01T00:00:00Z",
                "updated_at": "1970-01-01T00:00:00Z",
            }
        )
