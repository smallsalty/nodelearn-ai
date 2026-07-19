from typing import Literal

from fastapi import APIRouter, Path, Query
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError

from app.core.response import error_response, page_result, success_response
from app.schemas.note import (
    NoteCreateRequest,
    NoteQuery,
    NoteRelationRequest,
    NoteRelationType,
    NoteUpdateRequest,
    PinNoteRequest,
)
from app.services.note_service import default_note_service

router = APIRouter()


def api_error(message: str, code: int) -> JSONResponse:
    return JSONResponse(status_code=code, content=error_response(message, code=code))


@router.post("/notes")
def create_note(payload: NoteCreateRequest):
    try:
        return success_response(default_note_service.create_note(payload))
    except ValueError as exc:
        return api_error(str(exc), 400)
    except IntegrityError:
        return api_error("笔记关联的课程、知识点或题目不存在", 400)


@router.get("/notes")
def list_notes(
    user_id: str = Query(alias="userId"),
    page: int = 1,
    page_size: int = Query(10, alias="pageSize"),
    keyword: str | None = None,
    sort_by: str | None = Query(None, alias="sortBy"),
    sort_order: Literal["asc", "desc"] | None = Query(None, alias="sortOrder"),
    course_id: str | None = Query(None, alias="courseId"),
    node_id: str | None = Query(None, alias="nodeId"),
    tag: str | None = None,
    pinned: bool | None = None,
    relation_type: NoteRelationType | None = Query(None, alias="relationType"),
):
    try:
        query = NoteQuery(
            user_id=user_id,
            page=page,
            page_size=page_size,
            keyword=keyword,
            sort_by=sort_by,
            sort_order=sort_order,
            course_id=course_id,
            node_id=node_id,
            tag=tag,
            pinned=pinned,
            relation_type=relation_type,
        )
        items, total = default_note_service.list_notes(query)
        return success_response(page_result(items, total, query.page, query.page_size))
    except ValueError as exc:
        return api_error(str(exc), 400)


@router.get("/notes/{noteId}")
def get_note(note_id: str = Path(alias="noteId")):
    note = default_note_service.get_note(note_id)
    return success_response(note) if note else api_error("笔记不存在", 404)


@router.put("/notes/{noteId}")
def update_note(payload: NoteUpdateRequest, note_id: str = Path(alias="noteId")):
    try:
        note = default_note_service.update_note(note_id, payload)
        return success_response(note) if note else api_error("笔记不存在", 404)
    except ValueError as exc:
        return api_error(str(exc), 400)
    except IntegrityError:
        return api_error("笔记关联的课程、知识点或题目不存在", 400)


@router.delete("/notes/{noteId}")
def delete_note(note_id: str = Path(alias="noteId")):
    deleted = default_note_service.delete_note(note_id)
    return success_response(True) if deleted else api_error("笔记不存在", 404)


@router.post("/notes/{noteId}/pin")
def pin_note(payload: PinNoteRequest, note_id: str = Path(alias="noteId")):
    note = default_note_service.pin_note(note_id, payload.pinned)
    return success_response(note) if note else api_error("笔记不存在", 404)


@router.post("/notes/{noteId}/relations")
def relate_note(payload: NoteRelationRequest, note_id: str = Path(alias="noteId")):
    try:
        note = default_note_service.relate_note(note_id, payload)
        return success_response(note) if note else api_error("笔记不存在", 404)
    except ValueError as exc:
        return api_error(str(exc), 400)


@router.get("/users/{userId}/notes")
def list_user_notes(user_id: str = Path(alias="userId")):
    try:
        return success_response(default_note_service.list_user_notes(user_id))
    except ValueError as exc:
        return api_error(str(exc), 400)


@router.get("/nodes/{nodeId}/notes")
def list_node_notes(
    node_id: str = Path(alias="nodeId"),
    user_id: str = Query(alias="userId"),
):
    try:
        return success_response(default_note_service.list_node_notes(node_id, user_id))
    except ValueError as exc:
        return api_error(str(exc), 400)
