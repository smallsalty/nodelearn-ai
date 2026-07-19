from typing import Literal

from pydantic import Field

from app.schemas.common import ContractModel, PageRequest


NoteRelationType = Literal["node", "question", "resource", "path"]


class Note(ContractModel):
    id: str
    user_id: str
    course_id: str | None = None
    node_id: str | None = None
    question_id: str | None = None
    title: str
    content: str
    tags: list[str] = Field(default_factory=list)
    relation_type: NoteRelationType | None = None
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
    relation_type: NoteRelationType | None = None
    relation_id: str | None = None


class NoteUpdateRequest(ContractModel):
    course_id: str | None = None
    node_id: str | None = None
    question_id: str | None = None
    title: str | None = None
    content: str | None = None
    tags: list[str] | None = None
    relation_type: NoteRelationType | None = None
    relation_id: str | None = None


class NoteQuery(PageRequest):
    user_id: str
    course_id: str | None = None
    node_id: str | None = None
    tag: str | None = None
    pinned: bool | None = None
    relation_type: NoteRelationType | None = None


class PinNoteRequest(ContractModel):
    pinned: bool


class NoteRelationRequest(ContractModel):
    relation_type: NoteRelationType
    relation_id: str


class FloatingMenuState(ContractModel):
    visible: bool
    active_tab: Literal["qa", "note", "wrong_book", "resource"]
    position_x: float
    position_y: float
    width: float
    height: float
    collapsed: bool
