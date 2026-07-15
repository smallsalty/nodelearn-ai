from __future__ import annotations

import hashlib
import re
import shutil
import subprocess
from dataclasses import dataclass, field
from datetime import UTC, datetime
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import (
    ChapterModel,
    CourseModel,
    GeneratedResourceModel,
    KnowledgeBuildTaskModel,
    KnowledgeNodeModel,
    KnowledgeRelationModel,
    UploadedFileModel,
)

HELLO_ALGO_LICENSE = "CC BY-NC-SA 4.0"
HELLO_ALGO_COURSE_ID = "course_ds_001"
HELLO_ALGO_USER_ID = "system"

CODE_EXTENSIONS = {
    ".c",
    ".cc",
    ".cpp",
    ".cs",
    ".dart",
    ".go",
    ".java",
    ".js",
    ".kt",
    ".py",
    ".rb",
    ".rs",
    ".swift",
    ".ts",
    ".zig",
}


@dataclass(slots=True)
class ParsedChapter:
    id: str
    course_id: str
    title: str
    order_index: int
    description: str | None
    source_path: str


@dataclass(slots=True)
class ParsedNode:
    id: str
    course_id: str
    chapter_id: str
    name: str
    description: str | None
    content: str
    difficulty: str
    learning_value: float
    prerequisite_node_ids: list[str] = field(default_factory=list)
    next_node_ids: list[str] = field(default_factory=list)
    resource_ids: list[str] = field(default_factory=list)
    source_path: str = ""


@dataclass(slots=True)
class ParsedRelation:
    id: str
    course_id: str
    source_node_id: str
    target_node_id: str
    relation_type: str
    weight: float


@dataclass(slots=True)
class ParsedResource:
    id: str
    user_id: str
    course_id: str
    node_id: str | None
    title: str
    resource_type: str
    content: str
    file_url: str | None
    status: str
    audit_status: str
    source_path: str


@dataclass(slots=True)
class ParsedHelloAlgoDataset:
    course: CourseModel
    chapters: list[ParsedChapter]
    nodes: list[ParsedNode]
    relations: list[ParsedRelation]
    resources: list[ParsedResource]
    source_commit: str


@dataclass(slots=True)
class ImportSummary:
    course_id: str
    source_commit: str
    chapters: int
    nodes: int
    relations: int
    resources: int


def run_git(args: list[str], cwd: Path | None = None) -> str:
    completed = subprocess.run(
        ["git", *args],
        cwd=str(cwd) if cwd else None,
        check=True,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    return completed.stdout.strip()


def ensure_hello_algo_repo(repo_url: str, branch: str, local_dir: str | Path) -> Path:
    repo_dir = Path(local_dir).resolve()

    def configure_sparse_checkout() -> None:
        try:
            run_git(["sparse-checkout", "set", "docs", "codes"], cwd=repo_dir)
        except subprocess.CalledProcessError:
            run_git(["sparse-checkout", "set", "docs"], cwd=repo_dir)

    if (repo_dir / ".git").exists():
        try:
            run_git(["fetch", "--depth", "1", "origin", branch], cwd=repo_dir)
            run_git(["checkout", branch], cwd=repo_dir)
            run_git(["reset", "--hard", f"origin/{branch}"], cwd=repo_dir)
            if not (repo_dir / "docs").exists():
                configure_sparse_checkout()
            return repo_dir
        except subprocess.CalledProcessError:
            shutil.rmtree(repo_dir, ignore_errors=True)

    repo_dir.parent.mkdir(parents=True, exist_ok=True)
    run_git(["clone", "--depth", "1", "--filter=blob:none", "--sparse", "--branch", branch, repo_url, str(repo_dir)])
    configure_sparse_checkout()
    return repo_dir


def get_repo_commit(repo_dir: Path) -> str:
    return run_git(["rev-parse", "HEAD"], cwd=repo_dir)


def parse_hello_algo_repo(repo_dir: str | Path, doc_language: str = "zh", code_languages: list[str] | None = None) -> ParsedHelloAlgoDataset:
    repo_path = Path(repo_dir).resolve()
    source_commit = get_repo_commit(repo_path)
    docs_root = resolve_docs_root(repo_path, doc_language)
    code_roots = resolve_code_roots(repo_path, code_languages)

    course = CourseModel(
        id=HELLO_ALGO_COURSE_ID,
        name="Hello \u7b97\u6cd5",
        code="HELLO_ALGO",
        description=f"Imported from {repo_path.name}; source license {HELLO_ALGO_LICENSE}.",
        target_major="computer_science",
        status="published",
        created_at=now_utc(),
        updated_at=now_utc(),
    )

    chapters: list[ParsedChapter] = []
    nodes: list[ParsedNode] = []
    relations: list[ParsedRelation] = []
    resources: list[ParsedResource] = []
    node_by_stem: dict[str, ParsedNode] = {}

    chapter_dirs = [p for p in sorted(docs_root.iterdir()) if p.is_dir() and p.name.startswith("chapter_")]
    for chapter_index, chapter_dir in enumerate(chapter_dirs, start=1):
        markdown_files = [p for p in sorted(chapter_dir.rglob("*.md")) if ".assets" not in p.parts and "assets" not in p.parts]
        if not markdown_files:
            continue
        title = title_from_path(chapter_dir.name)
        first_text = read_text(markdown_files[0])
        first_title = extract_first_heading(first_text)
        if first_title:
            title = first_title
        chapter_id = stable_id("chapter", chapter_dir.name)
        chapters.append(
            ParsedChapter(
                id=chapter_id,
                course_id=HELLO_ALGO_COURSE_ID,
                title=title,
                order_index=chapter_index,
                description=extract_description(first_text),
                source_path=relative_posix(repo_path, chapter_dir),
            )
        )

        chapter_nodes: list[ParsedNode] = []
        for file_index, markdown_path in enumerate(markdown_files, start=1):
            markdown_text = read_text(markdown_path)
            node_title = extract_first_heading(markdown_text) or title_from_path(markdown_path.stem)
            node_id = stable_id("node", relative_posix(repo_path, markdown_path))
            resource = markdown_resource(repo_path, markdown_path, markdown_text, source_commit, node_id)
            node = ParsedNode(
                id=node_id,
                course_id=HELLO_ALGO_COURSE_ID,
                chapter_id=chapter_id,
                name=node_title,
                description=extract_description(markdown_text),
                content=resource.content,
                difficulty=difficulty_for(chapter_index),
                learning_value=max(40, 100 - chapter_index),
                source_path=relative_posix(repo_path, markdown_path),
            )
            chapter_nodes.append(node)
            nodes.append(node)
            node_by_stem.setdefault(markdown_path.stem, node)

            resources.append(resource)
            node.resource_ids.append(resource.id)

        for index, node in enumerate(chapter_nodes):
            if index > 0:
                node.prerequisite_node_ids.append(chapter_nodes[index - 1].id)
            if index < len(chapter_nodes) - 1:
                next_node = chapter_nodes[index + 1]
                node.next_node_ids.append(next_node.id)
                relations.append(
                    ParsedRelation(
                        id=stable_id("relation", f"{node.id}:{next_node.id}:related"),
                        course_id=HELLO_ALGO_COURSE_ID,
                        source_node_id=node.id,
                        target_node_id=next_node.id,
                        relation_type="related",
                        weight=1,
                    )
                )

    for code_root in code_roots:
        language = code_root.name
        for code_path in sorted(code_root.rglob("*")):
            if not code_path.is_file() or code_path.suffix.lower() not in CODE_EXTENSIONS:
                continue
            node = node_by_stem.get(code_path.stem)
            if node is None:
                continue
            text = read_text(code_path)
            if not text.strip():
                continue
            resource = code_resource(repo_path, code_path, text, source_commit, language, node.id)
            resources.append(resource)
            node.resource_ids.append(resource.id)

    return ParsedHelloAlgoDataset(course=course, chapters=chapters, nodes=nodes, relations=relations, resources=resources, source_commit=source_commit)


def import_hello_algo_dataset(session: Session, dataset: ParsedHelloAlgoDataset) -> ImportSummary:
    now = now_utc()
    dataset.course.updated_at = now
    session.merge(dataset.course)
    session.flush()

    session.merge(
        UploadedFileModel(
            id="file_hello_algo_repo",
            user_id=HELLO_ALGO_USER_ID,
            course_id=HELLO_ALGO_COURSE_ID,
            filename="krahets/hello-algo",
            file_type="git_repository",
            file_size=0,
            file_url=f"https://github.com/krahets/hello-algo/tree/{dataset.source_commit}",
            parse_status="success",
            created_at=now,
            updated_at=now,
        )
    )
    session.merge(
        KnowledgeBuildTaskModel(
            id=stable_id("kb_task", dataset.source_commit),
            course_id=HELLO_ALGO_COURSE_ID,
            file_ids=["file_hello_algo_repo"],
            status="success",
            progress=100,
            created_at=now,
            updated_at=now,
        )
    )
    session.flush()

    for chapter in dataset.chapters:
        session.merge(
            ChapterModel(
                id=chapter.id,
                course_id=chapter.course_id,
                title=chapter.title,
                order_index=chapter.order_index,
                description=chapter.description,
                created_at=now,
                updated_at=now,
            )
        )
    session.flush()
    for node in dataset.nodes:
        session.merge(
            KnowledgeNodeModel(
                id=node.id,
                course_id=node.course_id,
                chapter_id=node.chapter_id,
                name=node.name,
                node_type="concept",
                description=node.description,
                content=node.content,
                difficulty=node.difficulty,
                learning_value=node.learning_value,
                prerequisite_node_ids=node.prerequisite_node_ids,
                next_node_ids=node.next_node_ids,
                resource_ids=node.resource_ids,
                common_mistakes=[],
                recommended_practice_ids=[],
                created_at=now,
                updated_at=now,
            )
        )
    session.flush()
    for relation in dataset.relations:
        session.merge(
            KnowledgeRelationModel(
                id=relation.id,
                course_id=relation.course_id,
                source_node_id=relation.source_node_id,
                target_node_id=relation.target_node_id,
                relation_type=relation.relation_type,
                weight=relation.weight,
                created_at=now,
                updated_at=now,
            )
        )
    session.flush()
    for resource in dataset.resources:
        session.merge(
            GeneratedResourceModel(
                id=resource.id,
                user_id=resource.user_id,
                course_id=resource.course_id,
                node_id=resource.node_id,
                title=resource.title,
                resource_type=resource.resource_type,
                content=resource.content,
                file_url=resource.file_url,
                prompt=None,
                model_name=None,
                status=resource.status,
                audit_status=resource.audit_status,
                created_at=now,
                updated_at=now,
            )
        )
    session.flush()
    return ImportSummary(
        course_id=HELLO_ALGO_COURSE_ID,
        source_commit=dataset.source_commit,
        chapters=len(dataset.chapters),
        nodes=len(dataset.nodes),
        relations=len(dataset.relations),
        resources=len(dataset.resources),
    )


def import_hello_algo(session: Session, repo_dir: str | Path, doc_language: str = "zh", code_languages: list[str] | None = None) -> ImportSummary:
    dataset = parse_hello_algo_repo(repo_dir, doc_language=doc_language, code_languages=code_languages)
    return import_hello_algo_dataset(session, dataset)


def has_imported_hello_algo_data(session: Session) -> bool:
    return session.execute(select(CourseModel.id).where(CourseModel.id == HELLO_ALGO_COURSE_ID)).first() is not None


def resolve_docs_root(repo_path: Path, doc_language: str) -> Path:
    if doc_language.lower() in {"zh", "zh-cn", "cn"}:
        candidate = repo_path / "docs"
    else:
        candidate = repo_path / doc_language / "docs"
    if not candidate.exists():
        raise FileNotFoundError(f"Hello Algo docs directory not found: {candidate}")
    return candidate


def resolve_code_roots(repo_path: Path, code_languages: list[str] | None) -> list[Path]:
    codes_root = repo_path / "codes"
    if not codes_root.exists():
        return []
    if not code_languages or code_languages == ["all"]:
        return [p for p in sorted(codes_root.iterdir()) if p.is_dir()]
    return [codes_root / lang for lang in code_languages if (codes_root / lang).exists()]


def markdown_resource(repo_path: Path, markdown_path: Path, markdown_text: str, commit: str, node_id: str) -> ParsedResource:
    rel_path = relative_posix(repo_path, markdown_path)
    title = extract_first_heading(markdown_text) or title_from_path(markdown_path.stem)
    return ParsedResource(
        id=stable_id("resource", f"markdown:{rel_path}"),
        user_id=HELLO_ALGO_USER_ID,
        course_id=HELLO_ALGO_COURSE_ID,
        node_id=node_id,
        title=title,
        resource_type="reading_material",
        content=source_wrapped_content(repo_path, rel_path, commit, markdown_text),
        file_url=github_blob_url(rel_path, commit),
        status="success",
        audit_status="unchecked",
        source_path=rel_path,
    )


def code_resource(repo_path: Path, code_path: Path, code_text: str, commit: str, language: str, node_id: str) -> ParsedResource:
    rel_path = relative_posix(repo_path, code_path)
    return ParsedResource(
        id=stable_id("resource", f"code:{rel_path}"),
        user_id=HELLO_ALGO_USER_ID,
        course_id=HELLO_ALGO_COURSE_ID,
        node_id=node_id,
        title=f"{title_from_path(code_path.stem)} ({language})",
        resource_type="code_case",
        content=source_wrapped_content(repo_path, rel_path, commit, code_text),
        file_url=github_blob_url(rel_path, commit),
        status="success",
        audit_status="unchecked",
        source_path=rel_path,
    )


def source_wrapped_content(repo_path: Path, rel_path: str, commit: str, content: str) -> str:
    normalized = content.strip()
    if len(normalized) > 50000:
        normalized = normalized[:50000]
    return "\n".join(
        [
            f"Source: {github_blob_url(rel_path, commit)}",
            f"Commit: {commit}",
            f"License: {HELLO_ALGO_LICENSE}",
            f"Path: {rel_path}",
            "",
            normalized,
        ]
    )


def github_blob_url(rel_path: str, commit: str) -> str:
    return f"https://github.com/krahets/hello-algo/blob/{commit}/{rel_path}"


def stable_id(prefix: str, value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "_", value.lower()).strip("_")[:56]
    digest = hashlib.sha1(value.encode("utf-8")).hexdigest()[:12]
    if slug:
        return f"{prefix}_{slug}_{digest}"
    return f"{prefix}_{digest}"


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="replace")


def extract_first_heading(text: str) -> str | None:
    for line in text.splitlines():
        match = re.match(r"^#\s+(.+?)\s*$", line)
        if match:
            return clean_markdown_text(match.group(1))
    return None


def extract_description(text: str, limit: int = 480) -> str | None:
    paragraphs: list[str] = []
    for line in text.splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or stripped.startswith("```") or stripped.startswith("<!--"):
            continue
        if stripped.startswith(("!", "|", "<")):
            continue
        paragraphs.append(clean_markdown_text(stripped))
        if sum(len(item) for item in paragraphs) >= limit:
            break
    description = " ".join(paragraphs).strip()
    return description[:limit] if description else None


def clean_markdown_text(value: str) -> str:
    value = re.sub(r"`([^`]+)`", r"\1", value)
    value = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", value)
    value = re.sub(r"[*_#<>]", "", value)
    return value.strip()


def title_from_path(value: str) -> str:
    return value.replace("chapter_", "").replace("_", " ").replace("-", " ").strip().title()


def difficulty_for(chapter_index: int) -> str:
    if chapter_index <= 4:
        return "easy"
    if chapter_index <= 10:
        return "medium"
    if chapter_index <= 16:
        return "hard"
    return "challenge"


def relative_posix(root: Path, path: Path) -> str:
    return path.resolve().relative_to(root.resolve()).as_posix()


def now_utc() -> datetime:
    return datetime.now(UTC)
