from pydantic import BaseModel


class KnowledgeGraphSchema(BaseModel):
    id: int | None = None
