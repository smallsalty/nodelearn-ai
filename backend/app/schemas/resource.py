from pydantic import BaseModel


class LearningResourceSchema(BaseModel):
    id: int | None = None
