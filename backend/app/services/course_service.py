from __future__ import annotations

from datetime import UTC, datetime
from uuid import uuid4

from sqlalchemy import func, select

from app.db.session import session_context
from app.models import ChapterModel, CourseModel, KnowledgeNodeModel, KnowledgeRelationModel
from app.schemas.common import CourseStatus, DifficultyLevel, NodeType
from app.schemas.course import (
    Chapter,
    ChapterCreateRequest,
    Course,
    CourseCreateRequest,
    CourseUpdateRequest,
    KnowledgeNode,
    KnowledgeNodeCreateRequest,
    KnowledgeRelation,
)


def now_utc() -> datetime:
    return datetime.now(UTC)


def as_iso(value: datetime | str | None) -> str:
    if isinstance(value, datetime):
        return value.isoformat()
    return value or now_utc().isoformat()


def new_id(prefix: str) -> str:
    return f"{prefix}_{uuid4().hex}"


def course_from_model(model: CourseModel) -> Course:
    return Course(
        id=model.id,
        name=model.name,
        code=model.code,
        description=model.description,
        target_major=model.target_major,
        status=model.status,
        cover_url=model.cover_url,
        created_at=as_iso(model.created_at),
        updated_at=as_iso(model.updated_at),
    )


def chapter_from_model(model: ChapterModel) -> Chapter:
    return Chapter(
        id=model.id,
        course_id=model.course_id,
        title=model.title,
        order_index=model.order_index,
        description=model.description,
        created_at=as_iso(model.created_at),
        updated_at=as_iso(model.updated_at),
    )


def node_from_model(model: KnowledgeNodeModel) -> KnowledgeNode:
    return KnowledgeNode(
        id=model.id,
        course_id=model.course_id,
        chapter_id=model.chapter_id,
        name=model.name,
        node_type=model.node_type,
        description=model.description,
        content=model.content,
        difficulty=model.difficulty,
        learning_value=model.learning_value,
        prerequisite_node_ids=model.prerequisite_node_ids or [],
        next_node_ids=model.next_node_ids or [],
        resource_ids=model.resource_ids or [],
        common_mistakes=model.common_mistakes or [],
        recommended_practice_ids=model.recommended_practice_ids or [],
        mastery_status=None,
        mastery_score=None,
        x=model.x,
        y=model.y,
        created_at=as_iso(model.created_at),
        updated_at=as_iso(model.updated_at),
    )


def relation_from_model(model: KnowledgeRelationModel) -> KnowledgeRelation:
    return KnowledgeRelation(
        id=model.id,
        course_id=model.course_id,
        source_node_id=model.source_node_id,
        target_node_id=model.target_node_id,
        relation_type=model.relation_type,
        weight=model.weight,
        created_at=as_iso(model.created_at),
        updated_at=as_iso(model.updated_at),
    )


class CourseService:
    """Course, chapter, node, and relation storage operations."""

    def list_courses(self, page: int, page_size: int, keyword: str | None = None) -> tuple[list[Course], int]:
        with session_context() as session:
            query = select(CourseModel).where(CourseModel.deleted_at.is_(None))
            count_query = select(func.count()).select_from(CourseModel).where(CourseModel.deleted_at.is_(None))
            if keyword:
                pattern = f"%{keyword}%"
                query = query.where(CourseModel.name.like(pattern))
                count_query = count_query.where(CourseModel.name.like(pattern))
            total = session.scalar(count_query) or 0
            models = session.scalars(query.order_by(CourseModel.created_at.desc()).offset((page - 1) * page_size).limit(page_size)).all()
            return [course_from_model(model) for model in models], total

    def get_course(self, course_id: str) -> Course | None:
        with session_context() as session:
            model = session.get(CourseModel, course_id)
            if model is None or model.deleted_at is not None:
                return None
            return course_from_model(model)

    def create_course(self, payload: CourseCreateRequest) -> Course:
        now = now_utc()
        model = CourseModel(
            id=new_id("course"),
            name=payload.name,
            code=payload.code,
            description=payload.description,
            target_major=payload.target_major,
            status=CourseStatus.draft.value,
            cover_url=payload.cover_url,
            created_at=now,
            updated_at=now,
        )
        with session_context() as session:
            session.add(model)
            session.flush()
            return course_from_model(model)

    def update_course(self, course_id: str, payload: CourseUpdateRequest) -> Course | None:
        updates = payload.model_dump(exclude_unset=True)
        with session_context() as session:
            model = session.get(CourseModel, course_id)
            if model is None or model.deleted_at is not None:
                return None
            for key, value in updates.items():
                setattr(model, key, value.value if hasattr(value, "value") else value)
            model.updated_at = now_utc()
            session.flush()
            return course_from_model(model)

    def delete_course(self, course_id: str) -> bool:
        with session_context() as session:
            model = session.get(CourseModel, course_id)
            if model is None or model.deleted_at is not None:
                return False
            model.deleted_at = now_utc()
            model.updated_at = now_utc()
            return True

    def list_chapters(self, course_id: str) -> list[Chapter]:
        with session_context() as session:
            query = (
                select(ChapterModel)
                .where(ChapterModel.course_id == course_id, ChapterModel.deleted_at.is_(None))
                .order_by(ChapterModel.order_index.asc())
            )
            return [chapter_from_model(model) for model in session.scalars(query).all()]

    def create_chapter(self, course_id: str, payload: ChapterCreateRequest) -> Chapter:
        now = now_utc()
        model = ChapterModel(
            id=new_id("chapter"),
            course_id=course_id,
            title=payload.title,
            order_index=payload.order_index,
            description=payload.description,
            created_at=now,
            updated_at=now,
        )
        with session_context() as session:
            session.add(model)
            session.flush()
            return chapter_from_model(model)

    def list_nodes(self, course_id: str) -> list[KnowledgeNode]:
        with session_context() as session:
            query = (
                select(KnowledgeNodeModel)
                .where(KnowledgeNodeModel.course_id == course_id, KnowledgeNodeModel.deleted_at.is_(None))
                .order_by(KnowledgeNodeModel.created_at.asc())
            )
            return [node_from_model(model) for model in session.scalars(query).all()]

    def create_node(self, course_id: str, payload: KnowledgeNodeCreateRequest) -> KnowledgeNode:
        now = now_utc()
        model = KnowledgeNodeModel(
            id=new_id("node"),
            course_id=course_id,
            chapter_id=payload.chapter_id,
            name=payload.name,
            node_type=payload.node_type.value if hasattr(payload.node_type, "value") else payload.node_type,
            description=payload.description,
            content=payload.content,
            difficulty=payload.difficulty.value if hasattr(payload.difficulty, "value") else payload.difficulty,
            learning_value=payload.learning_value,
            prerequisite_node_ids=payload.prerequisite_node_ids or [],
            next_node_ids=payload.next_node_ids or [],
            resource_ids=[],
            common_mistakes=payload.common_mistakes or [],
            recommended_practice_ids=payload.recommended_practice_ids or [],
            created_at=now,
            updated_at=now,
        )
        with session_context() as session:
            session.add(model)
            session.flush()
            return node_from_model(model)

    def get_node(self, node_id: str) -> KnowledgeNode | None:
        with session_context() as session:
            model = session.get(KnowledgeNodeModel, node_id)
            if model is None or model.deleted_at is not None:
                return None
            return node_from_model(model)

    def update_node(self, node_id: str, payload: dict) -> KnowledgeNode | None:
        allowed_fields = {
            "chapter_id",
            "name",
            "node_type",
            "description",
            "content",
            "difficulty",
            "learning_value",
            "prerequisite_node_ids",
            "next_node_ids",
            "resource_ids",
            "common_mistakes",
            "recommended_practice_ids",
            "x",
            "y",
        }
        updates = {to_snake(key): value for key, value in payload.items()}
        if "content" in updates:
            content = updates["content"]
            if not isinstance(content, str) or not content.strip():
                raise ValueError("knowledge node content must not be blank")
            updates["content"] = content.strip()
        with session_context() as session:
            model = session.get(KnowledgeNodeModel, node_id)
            if model is None or model.deleted_at is not None:
                return None
            for key, value in updates.items():
                if key in allowed_fields:
                    setattr(model, key, value.value if hasattr(value, "value") else value)
            model.updated_at = now_utc()
            session.flush()
            return node_from_model(model)

    def delete_node(self, node_id: str) -> bool:
        with session_context() as session:
            model = session.get(KnowledgeNodeModel, node_id)
            if model is None or model.deleted_at is not None:
                return False
            model.deleted_at = now_utc()
            model.updated_at = now_utc()
            return True

    def list_relations(self, course_id: str) -> list[KnowledgeRelation]:
        with session_context() as session:
            query = (
                select(KnowledgeRelationModel)
                .where(KnowledgeRelationModel.course_id == course_id, KnowledgeRelationModel.deleted_at.is_(None))
                .order_by(KnowledgeRelationModel.created_at.asc())
            )
            return [relation_from_model(model) for model in session.scalars(query).all()]

    def create_relation(self, course_id: str, payload: KnowledgeRelation) -> KnowledgeRelation:
        now = now_utc()
        model = KnowledgeRelationModel(
            id=payload.id,
            course_id=course_id,
            source_node_id=payload.source_node_id,
            target_node_id=payload.target_node_id,
            relation_type=payload.relation_type,
            weight=payload.weight,
            created_at=now,
            updated_at=now,
        )
        with session_context() as session:
            session.merge(model)
            session.flush()
            return relation_from_model(model)


def to_snake(value: str) -> str:
    chars: list[str] = []
    for char in value:
        if char.isupper():
            chars.append("_")
            chars.append(char.lower())
        else:
            chars.append(char)
    return "".join(chars).lstrip("_")
