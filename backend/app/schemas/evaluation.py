from pydantic import BaseModel


class EvaluationSchema(BaseModel):
    id: int | None = None
