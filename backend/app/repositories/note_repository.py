from collections.abc import Iterable
from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import uuid4

from sqlalchemy import delete, exists, func, or_, select

from app.core.config import settings
from app.db.session import session_context
from app.models import NoteModel, NoteRelationModel, NoteTagModel
from app.schemas.note import Note, NoteQuery


def now_utc() -> datetime:
    return datetime.now(UTC)


def as_iso(value: datetime | str) -> str:
    return value.isoformat() if isinstance(value, datetime) else value


class NoteRepository:
    """Store notes in PostgreSQL while preserving an isolated mock-mode store."""

    def __init__(self) -> None:
        self._mock_notes: dict[str, Note] = {}

    def create_note(self, values: dict[str, Any]) -> Note:
        timestamp = now_utc()
        note_id = f"note_{uuid4().hex[:12]}"
        if settings.enable_mock:
            note = Note(
                id=note_id,
                user_id=values["user_id"],
                course_id=values.get("course_id"),
                node_id=values.get("node_id"),
                question_id=values.get("question_id"),
                title=values["title"],
                content=values["content"],
                tags=values.get("tags", []),
                relation_type=values.get("relation_type"),
                relation_id=values.get("relation_id"),
                pinned=False,
                created_at=timestamp.isoformat(),
                updated_at=timestamp.isoformat(),
            )
            self._mock_notes[note.id] = note
            return note.model_copy(deep=True)

        with session_context() as session:
            model = NoteModel(
                id=note_id,
                user_id=values["user_id"],
                course_id=values.get("course_id"),
                node_id=values.get("node_id"),
                question_id=values.get("question_id"),
                title=values["title"],
                content=values["content"],
                pinned=False,
                created_at=timestamp,
                updated_at=timestamp,
            )
            session.add(model)
            session.add_all(
                NoteTagModel(
                    id=f"note_tag_{uuid4().hex[:12]}",
                    note_id=note_id,
                    tag=tag,
                    created_at=timestamp + timedelta(microseconds=index),
                )
                for index, tag in enumerate(values.get("tags", []))
            )
            if values.get("relation_type") and values.get("relation_id"):
                session.add(
                    NoteRelationModel(
                        id=f"note_relation_{uuid4().hex[:12]}",
                        note_id=note_id,
                        relation_type=values["relation_type"],
                        relation_id=values["relation_id"],
                        created_at=timestamp,
                        updated_at=timestamp,
                    )
                )
            session.flush()
            return self._hydrate_one(session, model)

    def get_note(self, note_id: str) -> Note | None:
        if settings.enable_mock:
            note = self._mock_notes.get(note_id)
            return note.model_copy(deep=True) if note else None
        with session_context() as session:
            model = session.get(NoteModel, note_id)
            return self._hydrate_one(session, model) if model else None

    def list_notes(self, query: NoteQuery) -> tuple[list[Note], int]:
        if settings.enable_mock:
            return self._list_mock_notes(query)

        with session_context() as session:
            filters = [NoteModel.user_id == query.user_id]
            if query.course_id:
                filters.append(NoteModel.course_id == query.course_id)
            if query.node_id:
                filters.append(NoteModel.node_id == query.node_id)
            if query.pinned is not None:
                filters.append(NoteModel.pinned.is_(query.pinned))
            if query.tag:
                filters.append(
                    exists(
                        select(NoteTagModel.id).where(
                            NoteTagModel.note_id == NoteModel.id,
                            func.lower(NoteTagModel.tag) == query.tag.casefold(),
                        )
                    )
                )
            if query.relation_type:
                filters.append(
                    exists(
                        select(NoteRelationModel.id).where(
                            NoteRelationModel.note_id == NoteModel.id,
                            NoteRelationModel.relation_type == query.relation_type,
                        )
                    )
                )
            if query.keyword:
                pattern = f"%{query.keyword.strip()}%"
                filters.append(
                    or_(
                        NoteModel.title.ilike(pattern),
                        NoteModel.content.ilike(pattern),
                        exists(
                            select(NoteTagModel.id).where(
                                NoteTagModel.note_id == NoteModel.id,
                                NoteTagModel.tag.ilike(pattern),
                            )
                        ),
                    )
                )

            base_query = select(NoteModel).where(*filters)
            count_query = select(func.count()).select_from(NoteModel).where(*filters)
            sort_column = {
                "createdAt": NoteModel.created_at,
                "title": NoteModel.title,
                "updatedAt": NoteModel.updated_at,
            }.get(query.sort_by or "updatedAt", NoteModel.updated_at)
            sort_expression = sort_column.asc() if query.sort_order == "asc" else sort_column.desc()
            models = session.scalars(
                base_query.order_by(NoteModel.pinned.desc(), sort_expression, NoteModel.id.desc())
                .offset(max(query.page - 1, 0) * query.page_size)
                .limit(query.page_size)
            ).all()
            total = session.scalar(count_query) or 0
            return self._hydrate_many(session, models), total

    def update_note(self, note_id: str, updates: dict[str, Any]) -> Note | None:
        timestamp = now_utc()
        if settings.enable_mock:
            note = self._mock_notes.get(note_id)
            if note is None:
                return None
            note_updates = {key: value for key, value in updates.items() if key not in {"tags", "relation_type", "relation_id"}}
            if "tags" in updates:
                note_updates["tags"] = updates["tags"]
            if "relation_type" in updates:
                note_updates["relation_type"] = updates["relation_type"]
                note_updates["relation_id"] = updates["relation_id"]
            note_updates["updated_at"] = timestamp.isoformat()
            result = note.model_copy(update=note_updates, deep=True)
            self._mock_notes[note_id] = result
            return result.model_copy(deep=True)

        with session_context() as session:
            model = session.get(NoteModel, note_id)
            if model is None:
                return None
            for field in ("course_id", "node_id", "question_id", "title", "content"):
                if field in updates:
                    setattr(model, field, updates[field])
            if "tags" in updates:
                session.execute(delete(NoteTagModel).where(NoteTagModel.note_id == note_id))
                session.add_all(
                    NoteTagModel(
                        id=f"note_tag_{uuid4().hex[:12]}",
                        note_id=note_id,
                        tag=tag,
                        created_at=timestamp + timedelta(microseconds=index),
                    )
                    for index, tag in enumerate(updates["tags"])
                )
            if "relation_type" in updates:
                session.execute(delete(NoteRelationModel).where(NoteRelationModel.note_id == note_id))
                if updates["relation_type"] and updates["relation_id"]:
                    session.add(
                        NoteRelationModel(
                            id=f"note_relation_{uuid4().hex[:12]}",
                            note_id=note_id,
                            relation_type=updates["relation_type"],
                            relation_id=updates["relation_id"],
                            created_at=timestamp,
                            updated_at=timestamp,
                        )
                    )
            model.updated_at = timestamp
            session.flush()
            return self._hydrate_one(session, model)

    def pin_note(self, note_id: str, pinned: bool) -> Note | None:
        timestamp = now_utc()
        if settings.enable_mock:
            note = self._mock_notes.get(note_id)
            if note is None:
                return None
            result = note.model_copy(update={"pinned": pinned, "updated_at": timestamp.isoformat()}, deep=True)
            self._mock_notes[note_id] = result
            return result.model_copy(deep=True)
        with session_context() as session:
            model = session.get(NoteModel, note_id)
            if model is None:
                return None
            model.pinned = pinned
            model.updated_at = timestamp
            session.flush()
            return self._hydrate_one(session, model)

    def set_relation(self, note_id: str, relation_type: str, relation_id: str) -> Note | None:
        return self.update_note(
            note_id,
            {"relation_type": relation_type, "relation_id": relation_id},
        )

    def delete_note(self, note_id: str) -> bool:
        if settings.enable_mock:
            return self._mock_notes.pop(note_id, None) is not None
        with session_context() as session:
            model = session.get(NoteModel, note_id)
            if model is None:
                return False
            session.delete(model)
            session.flush()
            return True

    def clear_mock(self) -> None:
        self._mock_notes.clear()

    def _list_mock_notes(self, query: NoteQuery) -> tuple[list[Note], int]:
        items = [note for note in self._mock_notes.values() if note.user_id == query.user_id]
        if query.course_id:
            items = [note for note in items if note.course_id == query.course_id]
        if query.node_id:
            items = [note for note in items if note.node_id == query.node_id]
        if query.pinned is not None:
            items = [note for note in items if note.pinned is query.pinned]
        if query.tag:
            tag = query.tag.casefold()
            items = [note for note in items if any(value.casefold() == tag for value in note.tags)]
        if query.relation_type:
            items = [note for note in items if note.relation_type == query.relation_type]
        if query.keyword:
            keyword = query.keyword.strip().casefold()
            items = [
                note
                for note in items
                if keyword in note.title.casefold()
                or keyword in note.content.casefold()
                or any(keyword in tag.casefold() for tag in note.tags)
            ]
        items.sort(key=lambda note: note.id, reverse=True)
        sort_name = query.sort_by or "updatedAt"
        sort_reverse = query.sort_order != "asc"
        items.sort(
            key=lambda note: {
                "createdAt": note.created_at,
                "title": note.title.casefold(),
                "updatedAt": note.updated_at,
            }.get(sort_name, note.updated_at),
            reverse=sort_reverse,
        )
        items.sort(key=lambda note: note.pinned, reverse=True)
        total = len(items)
        start = max(query.page - 1, 0) * query.page_size
        return [note.model_copy(deep=True) for note in items[start : start + query.page_size]], total

    def _hydrate_one(self, session: Any, model: NoteModel) -> Note:
        return self._hydrate_many(session, [model])[0]

    def _hydrate_many(self, session: Any, models: Iterable[NoteModel]) -> list[Note]:
        model_list = list(models)
        if not model_list:
            return []
        note_ids = [model.id for model in model_list]
        tag_rows = session.scalars(
            select(NoteTagModel)
            .where(NoteTagModel.note_id.in_(note_ids))
            .order_by(NoteTagModel.created_at.asc(), NoteTagModel.id.asc())
        ).all()
        relation_rows = session.scalars(
            select(NoteRelationModel).where(NoteRelationModel.note_id.in_(note_ids))
        ).all()
        tags_by_note: dict[str, list[str]] = {note_id: [] for note_id in note_ids}
        for tag in tag_rows:
            tags_by_note[tag.note_id].append(tag.tag)
        relation_by_note = {relation.note_id: relation for relation in relation_rows}
        return [
            Note(
                id=model.id,
                user_id=model.user_id,
                course_id=model.course_id,
                node_id=model.node_id,
                question_id=model.question_id,
                title=model.title,
                content=model.content,
                tags=tags_by_note[model.id],
                relation_type=relation_by_note.get(model.id).relation_type if model.id in relation_by_note else None,
                relation_id=relation_by_note.get(model.id).relation_id if model.id in relation_by_note else None,
                pinned=model.pinned,
                created_at=as_iso(model.created_at),
                updated_at=as_iso(model.updated_at),
            )
            for model in model_list
        ]


default_note_repository = NoteRepository()
