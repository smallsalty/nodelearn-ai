from pydantic import BaseModel


class LearningPathSchema(BaseModel):
    id: int | None = None
