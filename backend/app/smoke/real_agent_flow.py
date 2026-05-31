from typing import Any

import httpx
from fastapi.testclient import TestClient
from sqlalchemy import func, select

from app.core.config import settings
from app.db.session import session_context
from app.main import app
from app.models import ChapterModel, GeneratedResourceModel, KnowledgeNodeModel, KnowledgeRelationModel

USER_ID = "user_live_smoke_001"
COURSE_ID = "course_ds_001"
NODE_ID = "node_linked_list_001"
MODEL_NAME = "deepseek-v4-pro"
MESSAGE = "我是计算机专业大二学生，链表指针操作比较薄弱。请结合 Hello 算法材料解释链表，并生成适合复习的图解讲义。"


def ensure_live_configuration() -> None:
    if settings.enable_mock:
        raise RuntimeError("ENABLE_MOCK must be false for the live smoke check")
    if not settings.llm_api_key:
        raise RuntimeError("LLM_API_KEY is not configured")
    if settings.llm_model_name != MODEL_NAME:
        raise RuntimeError(f"LLM_MODEL_NAME must be {MODEL_NAME}")


def verify_models() -> None:
    response = httpx.get(
        f"{settings.llm_base_url.rstrip('/')}/models",
        headers={"Authorization": f"Bearer {settings.llm_api_key}"},
        timeout=30.0,
    )
    response.raise_for_status()
    model_ids = {item.get("id") for item in response.json().get("data", [])}
    if MODEL_NAME not in model_ids:
        raise RuntimeError(f"{MODEL_NAME} is not available from DeepSeek /models")
    print(f"models: {MODEL_NAME} available")


def database_counts() -> dict[str, int]:
    with session_context() as session:
        counts = {
            "chapters": session.scalar(select(func.count()).select_from(ChapterModel)) or 0,
            "nodes": session.scalar(select(func.count()).select_from(KnowledgeNodeModel)) or 0,
            "relations": session.scalar(select(func.count()).select_from(KnowledgeRelationModel)) or 0,
            "sourceResources": session.scalar(
                select(func.count()).select_from(GeneratedResourceModel).where(GeneratedResourceModel.user_id == "system")
            )
            or 0,
        }
    expected = {"chapters": 20, "nodes": 105, "relations": 85, "sourceResources": 459}
    if counts != expected:
        raise RuntimeError(f"Hello Algo import counts mismatch: expected={expected}, actual={counts}")
    print(f"database: {counts}")
    return counts


def post_data(client: TestClient, path: str, payload: dict[str, Any]) -> dict[str, Any]:
    response = client.post(path, json=payload)
    response.raise_for_status()
    body = response.json()
    if body.get("code") != 200:
        raise RuntimeError(f"{path} failed: {body.get('message')}")
    return body["data"]


def run_api_flow() -> str:
    with TestClient(app) as client:
        health = client.get("/api/v1/system/health").json()["data"]
        if health["status"] != "ok" or health["database"] != "ok" or health["llmService"] != "ok":
            raise RuntimeError(f"health check failed: {health}")
        print(f"health: {health}")

        extracted = post_data(
            client,
            "/api/v1/profiles/extract",
            {"userId": USER_ID, "message": MESSAGE, "historyMessages": []},
        )
        print(f"profile extract: fields={sorted(extracted['extractedFields'])}")

        chat = post_data(
            client,
            "/api/v1/chat/send",
            {
                "userId": USER_ID,
                "courseId": COURSE_ID,
                "nodeId": NODE_ID,
                "message": "链表插入时为什么容易断链？",
                "useRag": True,
                "useProfile": True,
            },
        )
        if not chat.get("retrievedDocuments"):
            raise RuntimeError("RAG chat did not return retrievedDocuments")
        print(f"chat: retrievedDocuments={len(chat['retrievedDocuments'])}")

        profile_agent = run_agent(client, "profile_agent", {})
        planner_agent = run_agent(
            client,
            "planner_agent",
            {"weakNodeIds": ["node_linked_list_001"], "targetGoal": "掌握链表", "timeBudget": "每天30分钟"},
        )
        resource_agent = run_agent(
            client,
            "resource_agent",
            {"resourceTypes": ["lecture_doc"], "learningGoal": "掌握链表"},
        )
        multimodal_agent = run_agent(
            client,
            "multimodal_agent",
            {"resourceTypes": ["mind_map"], "learningGoal": "掌握链表"},
        )
        generated_resources = multimodal_agent["output"].get("generatedResources", [])
        safety_agent = run_agent(
            client,
            "safety_agent",
            {
                "targetType": "resource",
                "targetId": generated_resources[0]["id"],
                "content": generated_resources[0]["content"],
            },
        )
        print(
            "agents: "
            f"profile={profile_agent['status']} planner={planner_agent['status']} "
            f"resource={resource_agent['status']} multimodal={multimodal_agent['status']} safety={safety_agent['status']}"
        )

        workflow = post_data(
            client,
            "/api/v1/agents/workflows/run",
            {
                "userId": USER_ID,
                "courseId": COURSE_ID,
                "nodeId": NODE_ID,
                "workflowType": "resource_generate",
                "input": {
                    "message": MESSAGE,
                    "targetGoal": "掌握链表",
                    "resourceTypes": ["lecture_doc"],
                    "multimodalResourceTypes": ["mind_map"],
                },
            },
        )
        if workflow["status"] != "success":
            raise RuntimeError(f"workflow failed: {workflow}")
        if not workflow["finalOutput"].get("retrievedDocuments"):
            raise RuntimeError("workflow did not return retrievedDocuments")
        resource = workflow["finalOutput"]["generatedResources"][0]
        print(f"workflow: steps={len(workflow['steps'])} resourceId={resource['id']}")
        return resource["id"]


def run_agent(client: TestClient, agent_type: str, input_payload: dict[str, Any]) -> dict[str, Any]:
    data = post_data(
        client,
        "/api/v1/agents/run",
        {
            "userId": USER_ID,
            "courseId": COURSE_ID,
            "nodeId": NODE_ID,
            "agentType": agent_type,
            "input": input_payload,
        },
    )
    if data["status"] != "success":
        raise RuntimeError(f"{agent_type} failed: {data.get('errorMessage')}")
    return data


def verify_persisted_resource(resource_id: str) -> None:
    with session_context() as session:
        resource = session.get(GeneratedResourceModel, resource_id)
        if resource is None:
            raise RuntimeError(f"generated resource was not persisted: {resource_id}")
        if resource.model_name != MODEL_NAME or resource.audit_status != "passed" or resource.status != "success":
            raise RuntimeError(
                f"persisted resource mismatch: model={resource.model_name} audit={resource.audit_status} status={resource.status}"
            )
    print(f"persisted: resourceId={resource_id} model={MODEL_NAME} auditStatus=passed")


def main() -> None:
    ensure_live_configuration()
    verify_models()
    database_counts()
    resource_id = run_api_flow()
    verify_persisted_resource(resource_id)
    print("live smoke: passed")


if __name__ == "__main__":
    main()
