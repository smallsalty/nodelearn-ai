from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import func, or_, select

from app.db.session import session_context
from app.models import GeneratedResourceModel, KnowledgeBuildTaskModel, UploadedFileModel
from app.schemas.resource import GeneratedResource, KnowledgeBuildTask, RetrievedDocument, UploadedFile


def now_utc() -> datetime:
    return datetime.now(UTC)


def as_iso(value: datetime | str | None) -> str:
    if isinstance(value, datetime):
        return value.isoformat()
    return value or now_utc().isoformat()


def uploaded_file_from_model(model: UploadedFileModel) -> UploadedFile:
    return UploadedFile(
        id=model.id,
        user_id=model.user_id,
        course_id=model.course_id,
        filename=model.filename,
        file_type=model.file_type,
        file_size=model.file_size,
        file_url=model.file_url,
        parse_status=model.parse_status,
        created_at=as_iso(model.created_at),
        updated_at=as_iso(model.updated_at),
    )


def build_task_from_model(model: KnowledgeBuildTaskModel) -> KnowledgeBuildTask:
    return KnowledgeBuildTask(
        id=model.id,
        course_id=model.course_id,
        file_ids=model.file_ids or [],
        status=model.status,
        progress=model.progress,
        error_message=model.error_message,
        created_at=as_iso(model.created_at),
        updated_at=as_iso(model.updated_at),
    )


def generated_resource_from_model(model: GeneratedResourceModel) -> GeneratedResource:
    return GeneratedResource(
        id=model.id,
        user_id=model.user_id,
        course_id=model.course_id,
        node_id=model.node_id,
        title=model.title,
        resource_type=model.resource_type,
        content=model.content,
        file_url=model.file_url,
        prompt=model.prompt,
        model_name=model.model_name,
        status=model.status,
        audit_status=model.audit_status,
        created_at=as_iso(model.created_at),
        updated_at=as_iso(model.updated_at),
    )


class ResourceService:
    """Resource, file, and knowledge-base read operations."""

    def get_file(self, file_id: str) -> UploadedFile | None:
        with session_context() as session:
            model = session.get(UploadedFileModel, file_id)
            return uploaded_file_from_model(model) if model else None

    def get_build_task(self, task_id: str) -> KnowledgeBuildTask | None:
        with session_context() as session:
            model = session.get(KnowledgeBuildTaskModel, task_id)
            return build_task_from_model(model) if model else None

    def get_resource(self, resource_id: str) -> GeneratedResource | None:
        with session_context() as session:
            model = session.get(GeneratedResourceModel, resource_id)
            return generated_resource_from_model(model) if model else None

    def list_user_resources(self, user_id: str, page: int, page_size: int, keyword: str | None = None) -> tuple[list[GeneratedResource], int]:
        with session_context() as session:
            query = select(GeneratedResourceModel).where(GeneratedResourceModel.user_id == user_id)
            count_query = select(func.count()).select_from(GeneratedResourceModel).where(GeneratedResourceModel.user_id == user_id)
            if keyword:
                pattern = f"%{keyword}%"
                filter_expr = or_(GeneratedResourceModel.title.like(pattern), GeneratedResourceModel.content.like(pattern))
                query = query.where(filter_expr)
                count_query = count_query.where(filter_expr)
            total = session.scalar(count_query) or 0
            models = session.scalars(query.order_by(GeneratedResourceModel.created_at.desc()).offset((page - 1) * page_size).limit(page_size)).all()
            return [generated_resource_from_model(model) for model in models], total

    def list_node_resources(self, node_id: str) -> list[GeneratedResource]:
        with session_context() as session:
            query = (
                select(GeneratedResourceModel)
                .where(GeneratedResourceModel.node_id == node_id)
                .order_by(GeneratedResourceModel.created_at.desc())
            )
            return [generated_resource_from_model(model) for model in session.scalars(query).all()]

    def search_knowledge_base(self, course_id: str, query_text: str, node_id: str | None = None, top_k: int | None = None) -> list[RetrievedDocument]:
        limit = top_k or 5
        with session_context() as session:
            query = select(GeneratedResourceModel).where(GeneratedResourceModel.course_id == course_id)
            if node_id:
                query = query.where(GeneratedResourceModel.node_id == node_id)
            if query_text:
                pattern = f"%{query_text}%"
                query = query.where(or_(GeneratedResourceModel.title.like(pattern), GeneratedResourceModel.content.like(pattern)))
            models = session.scalars(query.order_by(GeneratedResourceModel.created_at.desc()).limit(limit)).all()
            return [
                RetrievedDocument(
                    id=model.id,
                    source_id=model.file_url or model.id,
                    title=model.title,
                    content=model.content[:1000],
                    score=1.0,
                    metadata={"resourceId": model.id, "nodeId": model.node_id},
                )
                for model in models
            ]
