from pydantic import BaseModel


class LearningReportSchema(BaseModel):
    id: int | None = None
