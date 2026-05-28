from __future__ import annotations

from sqlalchemy import select

from app.db.session import session_context
from app.models import KnowledgeNodeModel, KnowledgeRelationModel
from app.repositories.learning_path_repository import LearningPathRepository, default_learning_path_repository
from app.schemas.common import MasteryStatus
from app.schemas.course import KnowledgeNode
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


def graph_node_from_knowledge_node(node: KnowledgeNode) -> GraphNode:
    return GraphNode(
        id=node.id,
        label=node.name,
        node_type=node.node_type,
        difficulty=node.difficulty,
        mastery_status=node.mastery_status or MasteryStatus.not_started,
        mastery_score=node.mastery_score or 0,
        x=node.x,
        y=node.y,
    )


class GraphService:
    """Read graph data from contract knowledge-node tables."""

    def __init__(self, learning_path_repository: LearningPathRepository | None = None) -> None:
        self.learning_path_repository = learning_path_repository or default_learning_path_repository

    def get_course_graph(self, course_id: str) -> KnowledgeGraph | None:
        nodes = [
            graph_node_from_knowledge_node(node)
            for node in self.learning_path_repository.list_nodes(course_id)
        ]
        edges = [
            GraphEdge(
                id=relation.id,
                source=relation.source_node_id,
                target=relation.target_node_id,
                relation_type=relation.relation_type,
                weight=relation.weight,
                label=relation.relation_type,
            )
            for relation in self.learning_path_repository.list_relations(course_id)
        ]
        if nodes or edges:
            return KnowledgeGraph(course_id=course_id, nodes=nodes, edges=edges)

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
            if nodes or edges:
                return KnowledgeGraph(course_id=course_id, nodes=nodes, edges=edges)

        return None

    def update_node_mastery(
        self,
        node_id: str,
        mastery_score: float,
        mastery_status: MasteryStatus,
    ) -> GraphNode | None:
        node = self.learning_path_repository.update_node_mastery(node_id, mastery_score, mastery_status)
        if node is None:
            return None
        return graph_node_from_knowledge_node(node)
