from pydantic import BaseModel


class NoteSchema(BaseModel):
    id: int | None = None
