from typing import Any

from app.repositories.note_repository import NoteRepository, default_note_repository
from app.schemas.note import (
    Note,
    NoteCreateRequest,
    NoteQuery,
    NoteRelationRequest,
    NoteUpdateRequest,
)


class NoteService:
    def __init__(self, repository: NoteRepository | None = None) -> None:
        self.repository = repository or default_note_repository

    def create_note(self, payload: NoteCreateRequest) -> Note:
        relation_type, relation_id = self._normalize_relation(
            payload.relation_type,
            payload.relation_id,
            allow_empty=True,
        )
        values = {
            "user_id": self._required(payload.user_id, "用户"),
            "course_id": self._optional_id(payload.course_id),
            "node_id": self._optional_id(payload.node_id),
            "question_id": self._optional_id(payload.question_id),
            "title": self._required(payload.title, "笔记标题"),
            "content": self._required(payload.content, "笔记正文"),
            "tags": self._normalize_tags(payload.tags or []),
            "relation_type": relation_type,
            "relation_id": relation_id,
        }
        return self.repository.create_note(values)

    def list_notes(self, query: NoteQuery) -> tuple[list[Note], int]:
        user_id = self._required(query.user_id, "用户")
        if query.page < 1 or query.page_size < 1:
            raise ValueError("分页参数必须大于 0")
        if query.sort_by and query.sort_by not in {"updatedAt", "createdAt", "title"}:
            raise ValueError("笔记排序字段无效")
        normalized = query.model_copy(
            update={
                "user_id": user_id,
                "course_id": self._optional_id(query.course_id),
                "node_id": self._optional_id(query.node_id),
                "tag": self._optional_id(query.tag),
                "keyword": query.keyword.strip() if query.keyword else None,
            }
        )
        return self.repository.list_notes(normalized)

    def get_note(self, note_id: str) -> Note | None:
        return self.repository.get_note(self._required(note_id, "笔记"))

    def update_note(self, note_id: str, payload: NoteUpdateRequest) -> Note | None:
        updates = payload.model_dump(exclude_unset=True)
        if not updates:
            raise ValueError("至少提供一个笔记更新字段")
        if "title" in updates:
            updates["title"] = self._required(updates["title"], "笔记标题")
        if "content" in updates:
            updates["content"] = self._required(updates["content"], "笔记正文")
        if "tags" in updates:
            updates["tags"] = self._normalize_tags(updates["tags"] or [])
        for field in ("course_id", "node_id", "question_id"):
            if field in updates:
                updates[field] = self._optional_id(updates[field])

        relation_fields = {"relation_type", "relation_id"} & payload.model_fields_set
        if relation_fields:
            if relation_fields != {"relation_type", "relation_id"}:
                raise ValueError("关联类型和关联 ID 必须同时提供")
            relation_type, relation_id = self._normalize_relation(
                updates.get("relation_type"),
                updates.get("relation_id"),
                allow_empty=True,
            )
            updates["relation_type"] = relation_type
            updates["relation_id"] = relation_id
        return self.repository.update_note(self._required(note_id, "笔记"), updates)

    def delete_note(self, note_id: str) -> bool:
        return self.repository.delete_note(self._required(note_id, "笔记"))

    def pin_note(self, note_id: str, pinned: bool) -> Note | None:
        return self.repository.pin_note(self._required(note_id, "笔记"), pinned)

    def relate_note(self, note_id: str, payload: NoteRelationRequest) -> Note | None:
        relation_type, relation_id = self._normalize_relation(
            payload.relation_type,
            payload.relation_id,
        )
        return self.repository.set_relation(
            self._required(note_id, "笔记"),
            relation_type,
            relation_id,
        )

    def list_user_notes(self, user_id: str) -> list[Note]:
        notes, _ = self.list_notes(NoteQuery(user_id=user_id, page=1, page_size=10_000))
        return notes

    def list_node_notes(self, node_id: str, user_id: str) -> list[Note]:
        notes, _ = self.list_notes(
            NoteQuery(user_id=user_id, node_id=node_id, page=1, page_size=10_000)
        )
        return notes

    @staticmethod
    def _required(value: Any, label: str) -> str:
        normalized = str(value or "").strip()
        if not normalized:
            raise ValueError(f"{label}不能为空")
        return normalized

    @staticmethod
    def _optional_id(value: Any) -> str | None:
        normalized = str(value or "").strip()
        return normalized or None

    @classmethod
    def _normalize_tags(cls, tags: list[str]) -> list[str]:
        result: list[str] = []
        seen: set[str] = set()
        for value in tags:
            tag = str(value).strip()
            normalized = tag.casefold()
            if not tag or normalized in seen:
                continue
            seen.add(normalized)
            result.append(tag)
        return result

    @classmethod
    def _normalize_relation(
        cls,
        relation_type: str | None,
        relation_id: str | None,
        *,
        allow_empty: bool = False,
    ) -> tuple[str | None, str | None]:
        normalized_type = cls._optional_id(relation_type)
        normalized_id = cls._optional_id(relation_id)
        if normalized_type is None and normalized_id is None and allow_empty:
            return None, None
        if normalized_type is None or normalized_id is None:
            raise ValueError("关联类型和关联 ID 必须同时提供")
        return normalized_type, normalized_id


default_note_service = NoteService()
