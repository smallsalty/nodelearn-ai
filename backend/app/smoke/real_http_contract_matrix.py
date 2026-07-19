from __future__ import annotations

import argparse
import json
import re
import sys
from collections import Counter
from datetime import UTC, datetime
from pathlib import Path
from typing import Any
from uuid import uuid4

import httpx


REPOSITORY_ROOT = Path(__file__).resolve().parents[3]
CONTRACT_PATH = REPOSITORY_ROOT / "docs" / "interface-contract.md"
DEFAULT_OUTPUT = REPOSITORY_ROOT / "output" / "playwright" / "real-flow-2026-07-14" / "http-contract-matrix.json"
USER_ID = "user_real_verification_20260714"
IMPORTED_COURSE_ID = "course_ds_001"
IMPORTED_NODE_ID = "node_array_001"

PLACEHOLDER_PREFIXES = (
    "/api/v1/auth/",
    "/api/v1/profiles/",
    "/api/v1/chat/sessions",
    "/api/v1/learning-paths",
    "/api/v1/learning-tasks",
    "/api/v1/learning-records",
    "/api/v1/reports",
    "/api/v1/audit/logs",
    "/api/v1/model-call-logs",
)

EXPECTED_BLOCKED = {
    ("POST", "/api/v1/files/upload"),
    ("GET", "/api/v1/files/{fileId}"),
    ("DELETE", "/api/v1/files/{fileId}"),
    ("POST", "/api/v1/knowledge-base/build"),
    ("GET", "/api/v1/knowledge-base/build-tasks/{taskId}"),
    ("POST", "/api/v1/knowledge-base/embed"),
    ("POST", "/api/v1/multimodal/digital-human/explain"),
}


def parse_contract_routes() -> list[tuple[str, str]]:
    content = CONTRACT_PATH.read_text(encoding="utf-8")
    routes = re.findall(
        r"^\|\s*(GET|POST|PUT|DELETE|PATCH)\s*\|\s*`(/api/v1[^`]*)`",
        content,
        flags=re.MULTILINE,
    )
    if len(routes) != 108 or len(set(routes)) != 108:
        raise RuntimeError(f"expected 108 unique contract routes, got {len(routes)} rows and {len(set(routes))} unique")
    return routes


class MatrixRunner:
    def __init__(self, base_url: str, output: Path) -> None:
        self.base_url = base_url.rstrip("/")
        self.output = output
        self.prefix = f"real_verify_20260714_{uuid4().hex[:8]}"
        self.client = httpx.Client(
            timeout=httpx.Timeout(900.0, connect=20.0),
            follow_redirects=True,
            trust_env=False,
        )
        self.results: list[dict[str, Any]] = []
        self.state: dict[str, str] = {
            "course_id": IMPORTED_COURSE_ID,
            "node_id": IMPORTED_NODE_ID,
            "file_id": f"{self.prefix}_file_missing",
            "build_task_id": f"{self.prefix}_build_missing",
            "chat_session_id": f"{self.prefix}_chat",
            "agent_task_id": f"{self.prefix}_agent_missing",
            "resource_task_id": f"{self.prefix}_resource_missing",
            "resource_id": f"{self.prefix}_resource_missing",
            "video_task_id": f"{self.prefix}_video_missing",
            "callback_task_id": f"{self.prefix}_callback_missing",
            "digital_human_session_id": f"{self.prefix}_digital_human_missing",
            "recommendation_id": f"{self.prefix}_recommendation_missing",
            "path_id": f"{self.prefix}_path_missing",
            "learning_task_id": f"{self.prefix}_learning_task_missing",
            "practice_question_id": f"{self.prefix}_practice_question_missing",
            "programming_question_id": f"{self.prefix}_programming_question_missing",
            "note_id": f"{self.prefix}_note",
            "report_id": f"{self.prefix}_report",
        }

    def body_for(self, method: str, template: str) -> dict[str, Any] | None:
        course_id = self.state["course_id"]
        node_id = self.state["node_id"]
        bodies: dict[tuple[str, str], dict[str, Any]] = {
            ("POST", "/api/v1/auth/register"): {
                "username": self.prefix,
                "password": "verification_password",
                "role": "student",
            },
            ("POST", "/api/v1/auth/login"): {"username": "demo_student", "password": "demo_password"},
            ("POST", "/api/v1/auth/refresh-token"): {"refreshToken": "verification_refresh_token"},
            ("PUT", "/api/v1/users/me"): {"username": self.prefix},
            ("PUT", "/api/v1/profiles/{userId}"): {
                "major": "computer_science",
                "learningGoal": "验证真实联调",
            },
            ("POST", "/api/v1/profiles/extract"): {
                "userId": USER_ID,
                "message": "我是计算机专业学生，希望学习数组，每天可以学习 30 分钟，偏好图示和代码。",
                "historyMessages": [],
            },
            ("POST", "/api/v1/profiles/update-by-behavior"): {
                "userId": USER_ID,
                "courseId": course_id,
                "nodeId": node_id,
                "behaviorType": "view_resource",
                "behaviorData": {"durationSeconds": 30},
            },
            ("POST", "/api/v1/profiles/update-by-practice"): {
                "userId": USER_ID,
                "courseId": course_id,
                "questionId": self.state["practice_question_id"],
                "nodeId": node_id,
                "isCorrect": False,
                "mistakeReason": "verification",
            },
            ("POST", "/api/v1/courses"): {
                "name": self.prefix,
                "code": self.prefix.upper(),
                "description": "real integration verification",
            },
            ("PUT", "/api/v1/courses/{courseId}"): {"name": f"{self.prefix}_updated"},
            ("POST", "/api/v1/courses/{courseId}/chapters"): {
                "courseId": course_id,
                "title": f"{self.prefix}_chapter",
                "orderIndex": 1,
            },
            ("POST", "/api/v1/courses/{courseId}/nodes"): {
                "courseId": course_id,
                "name": f"{self.prefix}_node",
                "nodeType": "concept",
                "difficulty": "easy",
                "learningValue": 70,
            },
            ("PUT", "/api/v1/nodes/{nodeId}"): {"name": f"{self.prefix}_node_updated"},
            ("POST", "/api/v1/courses/{courseId}/relations"): {
                "id": f"{self.prefix}_relation",
                "courseId": course_id,
                "sourceNodeId": node_id,
                "targetNodeId": node_id,
                "relationType": "related",
                "weight": 0.5,
                "createdAt": "2026-07-14T00:00:00Z",
                "updatedAt": "2026-07-14T00:00:00Z",
            },
            ("PUT", "/api/v1/users/{userId}/nodes/{nodeId}/mastery"): {
                "masteryScore": 58,
                "masteryStatus": "weak",
            },
            ("POST", "/api/v1/knowledge-base/build"): {
                "courseId": course_id,
                "fileIds": [self.state["file_id"]],
                "buildMode": "append",
            },
            ("POST", "/api/v1/knowledge-base/search"): {
                "courseId": IMPORTED_COURSE_ID,
                "nodeId": IMPORTED_NODE_ID,
                "query": "数组的基本操作",
                "topK": 3,
            },
            ("POST", "/api/v1/knowledge-base/embed"): {
                "text": "数组",
                "courseId": IMPORTED_COURSE_ID,
            },
            ("POST", "/api/v1/chat/sessions"): {
                "userId": USER_ID,
                "courseId": IMPORTED_COURSE_ID,
                "nodeId": IMPORTED_NODE_ID,
                "title": self.prefix,
                "sessionType": "qa",
            },
            ("POST", "/api/v1/chat/send"): {
                "userId": USER_ID,
                "sessionId": self.state["chat_session_id"],
                "courseId": IMPORTED_COURSE_ID,
                "nodeId": IMPORTED_NODE_ID,
                "message": "请基于课程资料用两句话解释数组，并给出引用依据。",
                "useRag": True,
                "useProfile": True,
            },
            ("POST", "/api/v1/agents/run"): {
                "userId": USER_ID,
                "courseId": IMPORTED_COURSE_ID,
                "nodeId": IMPORTED_NODE_ID,
                "agentType": "profile_agent",
                "input": {"message": "验证画像分析"},
            },
            ("POST", "/api/v1/agents/workflows/run"): {
                "userId": USER_ID,
                "courseId": IMPORTED_COURSE_ID,
                "nodeId": IMPORTED_NODE_ID,
                "workflowType": "qa",
                "input": {"message": "数组访问为什么是 O(1)？"},
            },
            ("POST", "/api/v1/resources/generate"): {
                "userId": USER_ID,
                "courseId": IMPORTED_COURSE_ID,
                "nodeId": IMPORTED_NODE_ID,
                "resourceTypes": ["mind_map"],
                "difficulty": "easy",
                "learningGoal": "理解数组结构",
                "customRequirement": "只生成一个精简思维导图",
            },
            ("POST", "/api/v1/multimodal/videos/generate"): {
                "userId": USER_ID,
                "courseId": IMPORTED_COURSE_ID,
                "nodeId": IMPORTED_NODE_ID,
                "title": f"{self.prefix}_video",
                "learningGoal": "用最短时长解释数组随机访问",
                "difficulty": "easy",
                "durationSeconds": 30,
                "theme": "warm_academic",
                "useDigitalHuman": False,
                "useRag": True,
            },
            ("POST", "/api/v1/multimodal/digital-human/explain"): {
                "userId": USER_ID,
                "courseId": IMPORTED_COURSE_ID,
                "nodeId": IMPORTED_NODE_ID,
                "useRag": True,
                "customRequirement": "简短讲解数组",
            },
            ("POST", "/api/v1/multimodal/digital-human/chat"): {
                "userId": USER_ID,
                "courseId": IMPORTED_COURSE_ID,
                "nodeId": IMPORTED_NODE_ID,
                "message": "请用一句话介绍数组。",
                "useRag": True,
                "useProfile": True,
            },
            ("POST", "/api/v1/multimodal/digital-human/callback"): {
                "taskId": self.state["callback_task_id"],
                "providerTaskId": f"{self.prefix}_provider",
                "status": "success",
                "token": "invalid-verification-token",
            },
            ("POST", "/api/v1/recommendations/resources"): {
                "userId": USER_ID,
                "courseId": IMPORTED_COURSE_ID,
                "nodeId": IMPORTED_NODE_ID,
                "limit": 1,
            },
            ("POST", "/api/v1/learning-paths/generate"): {
                "userId": USER_ID,
                "courseId": IMPORTED_COURSE_ID,
                "targetGoal": "掌握数组基础",
                "timeBudget": "30 minutes",
                "weakNodeIds": [IMPORTED_NODE_ID],
            },
            ("PUT", "/api/v1/learning-paths/{pathId}"): {"title": f"{self.prefix}_path"},
            ("PUT", "/api/v1/learning-tasks/{taskId}/status"): {"status": "success"},
            ("POST", "/api/v1/practices/generate"): {
                "userId": USER_ID,
                "courseId": IMPORTED_COURSE_ID,
                "nodeId": IMPORTED_NODE_ID,
                "questionTypes": ["single_choice"],
                "difficulty": "easy",
                "count": 1,
            },
            ("POST", "/api/v1/practices/submit"): {
                "userId": USER_ID,
                "questionId": self.state["practice_question_id"],
                "userAnswer": "B",
                "durationSeconds": 20,
            },
            ("POST", "/api/v1/programming/questions/generate"): {
                "userId": USER_ID,
                "courseId": IMPORTED_COURSE_ID,
                "nodeId": IMPORTED_NODE_ID,
                "difficulty": "easy",
                "count": 1,
            },
            ("POST", "/api/v1/programming/submissions"): {
                "userId": USER_ID,
                "questionId": self.state["programming_question_id"],
                "language": "python",
                "sourceCode": "a, b = map(int, input().split())\nprint(a + b)\n",
                "durationSeconds": 30,
            },
            ("POST", "/api/v1/notes"): {
                "userId": USER_ID,
                "courseId": IMPORTED_COURSE_ID,
                "nodeId": IMPORTED_NODE_ID,
                "title": self.prefix,
                "content": "real verification note",
                "tags": ["verification"],
            },
            ("PUT", "/api/v1/notes/{noteId}"): {"title": f"{self.prefix}_updated"},
            ("POST", "/api/v1/notes/{noteId}/pin"): {"pinned": True},
            ("POST", "/api/v1/notes/{noteId}/relations"): {
                "relationType": "node",
                "relationId": IMPORTED_NODE_ID,
            },
            ("POST", "/api/v1/learning-records"): {
                "userId": USER_ID,
                "courseId": IMPORTED_COURSE_ID,
                "nodeId": IMPORTED_NODE_ID,
                "behaviorType": "view_resource",
                "durationSeconds": 30,
            },
            ("POST", "/api/v1/reports/generate"): {
                "userId": USER_ID,
                "courseId": IMPORTED_COURSE_ID,
                "includeChart": True,
                "exportPdf": False,
            },
            ("POST", "/api/v1/audit/check"): {
                "targetType": "message",
                "targetId": f"{self.prefix}_message",
                "content": "正常的数组学习内容",
                "userId": USER_ID,
                "courseId": IMPORTED_COURSE_ID,
            },
        }
        return bodies.get((method, template))

    def concrete_path(self, template: str) -> str:
        task_id = self.state["resource_task_id"]
        if "/knowledge-base/build-tasks/" in template:
            task_id = self.state["build_task_id"]
        elif "/agents/tasks/" in template:
            task_id = self.state["agent_task_id"]
        elif "/multimodal/videos" in template:
            task_id = self.state["video_task_id"]
        elif "/learning-tasks/" in template:
            task_id = self.state["learning_task_id"]

        session_id = self.state["chat_session_id"]
        if "/digital-human/sessions/" in template:
            session_id = self.state["digital_human_session_id"]

        question_id = self.state["practice_question_id"]
        if "/programming/" in template:
            question_id = self.state["programming_question_id"]

        replacements = {
            "{userId}": USER_ID,
            "{courseId}": self.state["course_id"],
            "{nodeId}": self.state["node_id"],
            "{fileId}": self.state["file_id"],
            "{taskId}": task_id,
            "{sessionId}": session_id,
            "{resourceId}": self.state["resource_id"],
            "{recommendationId}": self.state["recommendation_id"],
            "{pathId}": self.state["path_id"],
            "{questionId}": question_id,
            "{noteId}": self.state["note_id"],
            "{reportId}": self.state["report_id"],
        }
        path = template
        for key, value in replacements.items():
            path = path.replace(key, value)
        return path

    def classify(self, method: str, template: str, http_status: int, code: int | None, is_sse: bool) -> str:
        normalized = template.partition("?")[0]
        if http_status != 200:
            return "FAIL"
        if is_sse:
            return "PASS_PLACEHOLDER" if normalized == "/api/v1/chat/stream" else "PASS_REAL"
        if code == 200:
            if normalized in {"/api/v1/users/me", "/api/v1/audit/check"}:
                return "PASS_PLACEHOLDER"
            if normalized.startswith(PLACEHOLDER_PREFIXES):
                return "PASS_PLACEHOLDER"
            if normalized.startswith("/api/v1/users/") and any(
                suffix in normalized
                for suffix in (
                    "/learning-paths",
                    "/practice-records",
                    "/wrong-questions",
                    "/programming-submissions",
                    "/learning-records",
                    "/reports",
                    "/evaluation",
                )
            ):
                return "PASS_PLACEHOLDER"
            if normalized.startswith("/api/v1/practices/") and normalized != "/api/v1/practices/generate":
                return "PASS_PLACEHOLDER"
            if normalized.startswith("/api/v1/programming/questions") and method == "GET":
                return "PASS_PLACEHOLDER"
            return "PASS_REAL"
        if (method, normalized) in EXPECTED_BLOCKED:
            return "BLOCKED"
        if normalized.startswith("/api/v1/multimodal/digital-human/") and code in {401, 404, 500, 501}:
            return "BLOCKED"
        return "FAIL"

    @staticmethod
    def response_summary(data: Any) -> dict[str, Any]:
        if data is None:
            return {"shape": "null"}
        if isinstance(data, list):
            return {"shape": "list", "count": len(data)}
        if not isinstance(data, dict):
            return {"shape": type(data).__name__}
        summary: dict[str, Any] = {"shape": "object", "keys": sorted(data.keys())}
        for field in (
            "id",
            "taskId",
            "sessionId",
            "resourceId",
            "submissionId",
            "status",
            "verdict",
            "auditStatus",
            "eventType",
            "progress",
        ):
            value = data.get(field)
            if isinstance(value, (str, int, float, bool)):
                summary[field] = value
        return summary

    def capture_state(self, method: str, template: str, data: Any) -> None:
        if not isinstance(data, (dict, list)):
            return
        if (method, template) == ("POST", "/api/v1/courses") and isinstance(data, dict):
            self.state["course_id"] = str(data["id"])
        elif (method, template) == ("POST", "/api/v1/courses/{courseId}/nodes") and isinstance(data, dict):
            self.state["node_id"] = str(data["id"])
        elif (method, template) == ("POST", "/api/v1/chat/sessions") and isinstance(data, dict):
            self.state["chat_session_id"] = str(data["id"])
        elif (method, template) == ("POST", "/api/v1/chat/send") and isinstance(data, dict):
            self.state["chat_session_id"] = str(data["sessionId"])
        elif (method, template) == ("POST", "/api/v1/agents/workflows/run") and isinstance(data, dict):
            self.state["agent_task_id"] = str(data["taskId"])
        elif (method, template) == ("POST", "/api/v1/resources/generate") and isinstance(data, dict):
            self.state["resource_task_id"] = str(data["taskId"])
            resource_ids = data.get("resourceIds") or []
            if resource_ids:
                self.state["resource_id"] = str(resource_ids[0])
        elif (method, template) == ("POST", "/api/v1/multimodal/videos/generate") and isinstance(data, dict):
            self.state["video_task_id"] = str(data["taskId"])
        elif (method, template) == ("POST", "/api/v1/multimodal/digital-human/chat") and isinstance(data, dict):
            self.state["digital_human_session_id"] = str(data["sessionId"])
        elif (method, template) == ("POST", "/api/v1/recommendations/resources") and isinstance(data, list) and data:
            self.state["recommendation_id"] = str(data[0]["id"])
        elif (method, template) == ("POST", "/api/v1/learning-paths/generate") and isinstance(data, dict):
            self.state["path_id"] = str(data["id"])
        elif (method, template) == ("GET", "/api/v1/learning-paths/{pathId}/tasks") and isinstance(data, list) and data:
            self.state["learning_task_id"] = str(data[0]["id"])
        elif (method, template) == ("POST", "/api/v1/practices/generate") and isinstance(data, list) and data:
            self.state["practice_question_id"] = str(data[0]["id"])
        elif (method, template) == ("POST", "/api/v1/programming/questions/generate") and isinstance(data, list) and data:
            self.state["programming_question_id"] = str(data[0]["id"])
        elif (method, template) == ("POST", "/api/v1/notes") and isinstance(data, dict):
            self.state["note_id"] = str(data["id"])
        elif (method, template) == ("POST", "/api/v1/reports/generate") and isinstance(data, dict):
            self.state["report_id"] = str(data["id"])

    def call(self, method: str, template: str) -> None:
        path = self.concrete_path(template)
        body = self.body_for(method, template)
        kwargs: dict[str, Any] = {}
        if (method, template) == ("POST", "/api/v1/files/upload"):
            kwargs["files"] = {"file": (f"{self.prefix}.txt", b"verification", "text/plain")}
        elif body is not None:
            kwargs["json"] = body

        started = datetime.now(UTC)
        try:
            response = self.client.request(method, f"{self.base_url}{path}", **kwargs)
            duration_ms = round((datetime.now(UTC) - started).total_seconds() * 1000)
            is_sse = response.headers.get("content-type", "").startswith("text/event-stream")
            code: int | None = None
            data: Any = None
            message = ""
            if is_sse:
                line = next((line for line in response.text.splitlines() if line.startswith("data:")), "")
                data = json.loads(line.removeprefix("data:").strip()) if line else None
            else:
                payload = response.json()
                code = payload.get("code")
                data = payload.get("data")
                message = str(payload.get("message", ""))[:200]
            classification = self.classify(method, template, response.status_code, code, is_sse)
            self.capture_state(method, template, data)
            self.results.append(
                {
                    "method": method,
                    "contractPath": template,
                    "httpStatus": response.status_code,
                    "apiCode": code,
                    "mediaType": response.headers.get("content-type", "").split(";")[0],
                    "durationMs": duration_ms,
                    "classification": classification,
                    "message": message,
                    "dataSummary": self.response_summary(data),
                }
            )
        except Exception as exc:
            self.results.append(
                {
                    "method": method,
                    "contractPath": template,
                    "httpStatus": None,
                    "apiCode": None,
                    "durationMs": round((datetime.now(UTC) - started).total_seconds() * 1000),
                    "classification": "FAIL",
                    "message": f"{type(exc).__name__}: {exc}",
                    "dataSummary": {"shape": "unavailable"},
                }
            )

    def run(self) -> int:
        routes = parse_contract_routes()
        deferred = {
            ("DELETE", "/api/v1/nodes/{nodeId}"),
            ("DELETE", "/api/v1/courses/{courseId}"),
        }
        ordered = [route for route in routes if route not in deferred]
        ordered.extend(
            [
                ("DELETE", "/api/v1/nodes/{nodeId}"),
                ("DELETE", "/api/v1/courses/{courseId}"),
            ]
        )
        try:
            for method, template in ordered:
                self.call(method, template)
        finally:
            session_id = self.state.get("digital_human_session_id", "")
            if session_id and "missing" not in session_id:
                try:
                    self.client.post(
                        f"{self.base_url}/api/v1/multimodal/digital-human/sessions/{session_id}/stop",
                        timeout=30,
                    )
                except Exception:
                    pass
            self.client.close()

        counts = Counter(result["classification"] for result in self.results)
        unique_pairs = {(result["method"], result["contractPath"]) for result in self.results}
        document = {
            "generatedAt": datetime.now(UTC).isoformat(),
            "baseUrl": self.base_url,
            "verificationPrefix": self.prefix,
            "routeCount": len(self.results),
            "uniqueMethodPathCount": len(unique_pairs),
            "summary": dict(sorted(counts.items())),
            "trackedIds": {
                key: value
                for key, value in self.state.items()
                if key in {"agent_task_id", "resource_task_id", "video_task_id", "digital_human_session_id"}
            },
            "results": self.results,
        }
        self.output.parent.mkdir(parents=True, exist_ok=True)
        self.output.write_text(json.dumps(document, ensure_ascii=False, indent=2), encoding="utf-8")
        print(json.dumps({key: document[key] for key in ("routeCount", "uniqueMethodPathCount", "summary", "trackedIds")}, ensure_ascii=False))
        return 1 if counts["FAIL"] else 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Call all 108 real HTTP contract routes and record redacted evidence.")
    parser.add_argument("--base-url", default="http://127.0.0.1:8000")
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()
    return MatrixRunner(args.base_url, args.output).run()


if __name__ == "__main__":
    sys.exit(main())
