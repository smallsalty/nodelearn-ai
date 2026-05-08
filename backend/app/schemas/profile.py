from pydantic import BaseModel


class StudentProfileSchema(BaseModel):
    id: int | None = None
