from __future__ import annotations

from sqlalchemy import select

from app.db.session import session_context
from app.models import KnowledgeNodeModel, KnowledgeRelationModel
from app.schemas.common import MasteryStatus
from app.schemas.graph import GraphEdge, GraphNode, KnowledgeGraph


def graph_node_from_model(model: KnowledgeNodeModel) -> GraphNode:
    return GraphNode(
        id=model.id,
        label=model.name,
        node_type=model.node_type,
        difficulty=model.difficulty,
        mastery_status=MasteryStatus.not_started,
        mastery_score=0,
        x=model.x,
        y=model.y,
    )


def graph_edge_from_model(model: KnowledgeRelationModel) -> GraphEdge:
    return GraphEdge(
        id=model.id,
        source=model.source_node_id,
        target=model.target_node_id,
        relation_type=model.relation_type,
        weight=model.weight,
        label=model.relation_type,
    )


class GraphService:
    """Read graph data from contract knowledge-node tables."""

    def get_course_graph(self, course_id: str) -> KnowledgeGraph | None:
        with session_context() as session:
            node_query = (
                select(KnowledgeNodeModel)
                .where(KnowledgeNodeModel.course_id == course_id, KnowledgeNodeModel.deleted_at.is_(None))
                .order_by(KnowledgeNodeModel.created_at.asc())
            )
            relation_query = (
                select(KnowledgeRelationModel)
                .where(KnowledgeRelationModel.course_id == course_id, KnowledgeRelationModel.deleted_at.is_(None))
                .order_by(KnowledgeRelationModel.created_at.asc())
            )
            nodes = [graph_node_from_model(model) for model in session.scalars(node_query).all()]
            edges = [graph_edge_from_model(model) for model in session.scalars(relation_query).all()]
            if not nodes and not edges:
                return None
            return KnowledgeGraph(course_id=course_id, nodes=nodes, edges=edges)
