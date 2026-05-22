from fastapi import APIRouter, Path, Query

from app.core.response import page_result, success_response
from app.schemas.common import NoteRelationRequest, PinNoteRequest
from app.schemas.note import Note, NoteCreateRequest

router = APIRouter()

MOCK_TIME = "2026-05-19T10:00:00Z"


def mock_note(note_id: str = "note_demo_001", user_id: str = "user_demo_001") -> Note:
    return Note(id=note_id, user_id=user_id, title="Mock Note", content="mock", tags=[], pinned=False, created_at=MOCK_TIME, updated_at=MOCK_TIME)


@router.post("/notes")
def create_note(payload: NoteCreateRequest):
    return success_response(mock_note(user_id=payload.user_id))


@router.get("/notes")
def list_notes(page: int = 1, page_size: int = Query(10, alias="pageSize"), keyword: str | None = None, sort_by: str | None = Query(None, alias="sortBy"), sort_order: str | None = Query(None, alias="sortOrder")):
    items = [mock_note()]
    return success_response(page_result(items, len(items), page, page_size))


@router.get("/notes/{noteId}")
def get_note(note_id: str = Path(alias="noteId")):
    return success_response(mock_note(note_id))


@router.put("/notes/{noteId}")
def update_note(payload: dict, note_id: str = Path(alias="noteId")):
    return success_response(mock_note(note_id))


@router.delete("/notes/{noteId}")
def delete_note(note_id: str = Path(alias="noteId")):
    return success_response(True)


@router.post("/notes/{noteId}/pin")
def pin_note(payload: PinNoteRequest, note_id: str = Path(alias="noteId")):
    note = mock_note(note_id)
    note.pinned = payload.pinned
    return success_response(note)


@router.post("/notes/{noteId}/relations")
def relate_note(payload: NoteRelationRequest, note_id: str = Path(alias="noteId")):
    return success_response(mock_note(note_id))


@router.get("/users/{userId}/notes")
def list_user_notes(user_id: str = Path(alias="userId")):
    return success_response([mock_note(user_id=user_id)])


@router.get("/nodes/{nodeId}/notes")
def list_node_notes(node_id: str = Path(alias="nodeId")):
    return success_response([mock_note()])
