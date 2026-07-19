import { request } from "@/api/client";
import type { PageResult } from "@/types/contracts";
import type {
  Note,
  NoteCreateRequest,
  NoteQuery,
  NoteRelationRequest,
  NoteUpdateRequest,
  PinNoteRequest
} from "@/types/note";

export const noteApi = {
  createNote(payload: NoteCreateRequest) {
    return request<Note>({ method: "POST", url: "/notes", data: payload });
  },
  listNotes(params: NoteQuery) {
    return request<PageResult<Note>>({ method: "GET", url: "/notes", params });
  },
  getNote(noteId: string) {
    return request<Note>({ method: "GET", url: `/notes/${noteId}` });
  },
  updateNote(noteId: string, payload: NoteUpdateRequest) {
    return request<Note>({ method: "PUT", url: `/notes/${noteId}`, data: payload });
  },
  deleteNote(noteId: string) {
    return request<boolean>({ method: "DELETE", url: `/notes/${noteId}` });
  },
  pinNote(noteId: string, payload: PinNoteRequest) {
    return request<Note>({ method: "POST", url: `/notes/${noteId}/pin`, data: payload });
  },
  relateNote(noteId: string, payload: NoteRelationRequest) {
    return request<Note>({ method: "POST", url: `/notes/${noteId}/relations`, data: payload });
  },
  getUserNotes(userId: string) {
    return request<Note[]>({ method: "GET", url: `/users/${userId}/notes` });
  },
  getNodeNotes(nodeId: string, userId: string) {
    return request<Note[]>({ method: "GET", url: `/nodes/${nodeId}/notes`, params: { userId } });
  }
};
