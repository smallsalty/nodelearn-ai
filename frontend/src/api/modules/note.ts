import { request } from "@/api/client";
import type { PageRequest, PageResult } from "@/types/contracts";
import type { Note, NoteCreateRequest } from "@/types/note";

export const noteApi = {
  createNote(payload: NoteCreateRequest) {
    return request<Note>({ method: "POST", url: "/notes", data: payload });
  },
  listNotes(params: PageRequest) {
    return request<PageResult<Note>>({ method: "GET", url: "/notes", params });
  },
  getNote(noteId: string) {
    return request<Note>({ method: "GET", url: `/notes/${noteId}` });
  },
  updateNote(noteId: string, payload: Partial<Note>) {
    return request<Note>({ method: "PUT", url: `/notes/${noteId}`, data: payload });
  },
  deleteNote(noteId: string) {
    return request<boolean>({ method: "DELETE", url: `/notes/${noteId}` });
  },
  pinNote(noteId: string, payload: { pinned: boolean }) {
    return request<Note>({ method: "POST", url: `/notes/${noteId}/pin`, data: payload });
  },
  relateNote(noteId: string, payload: { relationType: string; relationId: string }) {
    return request<Note>({ method: "POST", url: `/notes/${noteId}/relations`, data: payload });
  },
  listUserNotes(userId: string) {
    return request<Note[]>({ method: "GET", url: `/users/${userId}/notes` });
  },
  listNodeNotes(nodeId: string) {
    return request<Note[]>({ method: "GET", url: `/nodes/${nodeId}/notes` });
  }
};
