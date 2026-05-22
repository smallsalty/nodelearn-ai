from typing import Literal

from pydantic import Field

from app.schemas.common import ContractModel


class Note(ContractModel):
    id: str
    user_id: str
    course_id: str | None = None
    node_id: str | None = None
    question_id: str | None = None
    title: str
    content: str
    tags: list[str] = Field(default_factory=list)
    relation_type: Literal["node", "question", "resource", "path"] | None = None
    relation_id: str | None = None
    pinned: bool
    created_at: str
    updated_at: str


class NoteCreateRequest(ContractModel):
    user_id: str
    course_id: str | None = None
    node_id: str | None = None
    question_id: str | None = None
    title: str
    content: str
    tags: list[str] | None = None
    relation_type: Literal["node", "question", "resource", "path"] | None = None
    relation_id: str | None = None


class FloatingMenuState(ContractModel):
    visible: bool
    active_tab: Literal["qa", "note", "wrong_book", "resource"]
    position_x: float
    position_y: float
    width: float
    height: float
    collapsed: bool
