from __future__ import annotations

import ast
import hashlib
import html
import re
import shutil
import subprocess
from dataclasses import dataclass, field
from datetime import UTC, datetime
from pathlib import Path
from urllib.parse import quote, unquote, urlsplit

import yaml
from sqlalchemy import inspect, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models import (
    ChapterModel,
    ChatSessionModel,
    CourseModel,
    GeneratedResourceModel,
    KnowledgeBuildTaskModel,
    KnowledgeNodeModel,
    KnowledgeRelationModel,
    MultimodalGenerationTaskModel,
    PracticeQuestionModel,
    PracticeRecordModel,
    UploadedFileModel,
)

HELLO_ALGO_LICENSE = "CC BY-NC-SA 4.0"
HELLO_ALGO_COURSE_ID = "course_ds_001"
HELLO_ALGO_USER_ID = "system"
ALLOWED_CODE_LANGUAGES = ("cpp", "python", "java")
LANGUAGE_LABELS = {"cpp": "C++", "python": "Python", "java": "Java"}
LANGUAGE_EXTENSIONS = {"cpp": ".cpp", "python": ".py", "java": ".java"}
KNOWN_LANGUAGE_TABS = {
    "python", "c++", "cpp", "java", "c#", "csharp", "go", "swift", "js", "javascript",
    "ts", "typescript", "dart", "rust", "c", "kotlin", "ruby", "zig",
}
ADMONITION_LABELS = {
    "abstract": "摘要",
    "note": "说明",
    "tip": "提示",
    "question": "思考",
    "quote": "引用",
    "success": "要点",
    "pythontutor": "交互演示",
}


@dataclass(slots=True)
class ParsedAsset:
    source_path: str
    storage_path: str
    public_url: str


@dataclass(slots=True)
class ParsedChapter:
    id: str
    course_id: str
    title: str
    order_index: int
    description: str | None
    content: str
    source_path: str


@dataclass(slots=True)
class ParsedNode:
    id: str
    course_id: str
    chapter_id: str
    name: str
    description: str | None
    content: str
    order_index: int
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
    chapter_id: str | None
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
    assets: list[ParsedAsset]
    source_commit: str
    repo_path: Path


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
    if (repo_dir / ".git").exists():
        run_git(["fetch", "--depth", "1", "origin", branch], cwd=repo_dir)
        run_git(["checkout", branch], cwd=repo_dir)
        run_git(["reset", "--hard", f"origin/{branch}"], cwd=repo_dir)
        return repo_dir
    if repo_dir.exists() and any(repo_dir.iterdir()):
        raise RuntimeError(f"refusing to replace non-git Hello Algo directory: {repo_dir}")
    repo_dir.parent.mkdir(parents=True, exist_ok=True)
    run_git(["clone", "--depth", "1", "--branch", branch, repo_url, str(repo_dir)])
    return repo_dir


def get_repo_commit(repo_dir: Path, explicit_commit: str | None = None) -> str:
    try:
        top_level = Path(run_git(["rev-parse", "--show-toplevel"], cwd=repo_dir)).resolve()
        if top_level != repo_dir.resolve():
            raise RuntimeError(f"Hello Algo source is not its own Git worktree: {repo_dir}")
        return run_git(["rev-parse", "HEAD"], cwd=repo_dir)
    except (OSError, subprocess.CalledProcessError, RuntimeError):
        if explicit_commit and re.fullmatch(r"[0-9a-fA-F]{7,40}", explicit_commit):
            return explicit_commit.lower()
        raise RuntimeError("non-git Hello Algo source requires an explicit source commit")


def parse_hello_algo_repo(
    repo_dir: str | Path,
    doc_language: str = "zh",
    code_languages: list[str] | None = None,
    source_commit: str | None = None,
    asset_public_base_url: str | None = None,
) -> ParsedHelloAlgoDataset:
    repo_path = Path(repo_dir).resolve()
    commit = get_repo_commit(repo_path, source_commit)
    docs_root = resolve_docs_root(repo_path, doc_language)
    allowed_languages = normalize_code_languages(code_languages)
    nav_chapters = parse_mkdocs_navigation(repo_path, docs_root)
    public_base = (asset_public_base_url or settings.file_storage_public_base_url).rstrip("/")

    course = CourseModel(
        id=HELLO_ALGO_COURSE_ID,
        name="Hello 算法",
        code="HELLO_ALGO",
        description=f"Imported from krahets/hello-algo; source license {HELLO_ALGO_LICENSE}.",
        target_major="computer_science",
        status="published",
        created_at=now_utc(),
        updated_at=now_utc(),
    )
    chapters: list[ParsedChapter] = []
    nodes: list[ParsedNode] = []
    relations: list[ParsedRelation] = []
    resources: list[ParsedResource] = []
    assets_by_source: dict[str, ParsedAsset] = {}

    for chapter_index, (chapter_title, overview_path, section_entries) in enumerate(nav_chapters, start=1):
        chapter_dir = overview_path.parent
        chapter_id = stable_id("chapter", chapter_dir.name)
        overview_raw = read_text(overview_path)
        chapter_content, _, chapter_assets = normalize_markdown(
            repo_path,
            overview_path,
            overview_raw,
            chapter_title,
            commit,
            public_base,
            allowed_languages,
        )
        if not chapter_content.strip():
            raise ValueError(f"Hello Algo chapter overview is blank: {relative_posix(repo_path, overview_path)}")
        for asset in chapter_assets:
            assets_by_source[asset.source_path] = asset
        chapter = ParsedChapter(
            id=chapter_id,
            course_id=HELLO_ALGO_COURSE_ID,
            title=chapter_title,
            order_index=chapter_index,
            description=extract_description(chapter_content),
            content=chapter_content,
            source_path=relative_posix(repo_path, chapter_dir),
        )
        chapters.append(chapter)
        overview_resource = markdown_resource(
            repo_path,
            overview_path,
            overview_raw,
            commit,
            node_id=None,
            chapter_id=chapter_id,
        )
        resources.append(overview_resource)

        chapter_nodes: list[ParsedNode] = []
        for section_index, (section_title, markdown_path) in enumerate(section_entries, start=1):
            markdown_raw = read_text(markdown_path)
            normalized, source_files, section_assets = normalize_markdown(
                repo_path,
                markdown_path,
                markdown_raw,
                chapter_title,
                commit,
                public_base,
                allowed_languages,
            )
            if not normalized.strip():
                raise ValueError(f"Hello Algo section content is blank: {relative_posix(repo_path, markdown_path)}")
            for asset in section_assets:
                assets_by_source[asset.source_path] = asset
            node_id = stable_id("node", relative_posix(repo_path, markdown_path))
            reading = markdown_resource(
                repo_path,
                markdown_path,
                markdown_raw,
                commit,
                node_id=node_id,
                chapter_id=None,
            )
            node = ParsedNode(
                id=node_id,
                course_id=HELLO_ALGO_COURSE_ID,
                chapter_id=chapter_id,
                name=section_title,
                description=extract_description(normalized),
                content=normalized,
                order_index=section_index,
                difficulty=difficulty_for(chapter_index),
                learning_value=max(40, 100 - chapter_index),
                resource_ids=[reading.id],
                source_path=relative_posix(repo_path, markdown_path),
            )
            resources.append(reading)
            for language, code_paths in source_files.items():
                for code_path in sorted(code_paths):
                    code_text = read_text(code_path)
                    code = code_resource(repo_path, code_path, code_text, commit, language, node_id)
                    if code.id not in node.resource_ids:
                        node.resource_ids.append(code.id)
                        resources.append(code)
            chapter_nodes.append(node)
            nodes.append(node)

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

    unique_resources = {resource.id: resource for resource in resources}
    if len(chapters) != 20 or len(nodes) != 85 or len(relations) != 68:
        raise ValueError(
            f"unexpected Hello Algo navigation shape: chapters={len(chapters)}, nodes={len(nodes)}, relations={len(relations)}"
        )
    return ParsedHelloAlgoDataset(
        course=course,
        chapters=chapters,
        nodes=nodes,
        relations=relations,
        resources=list(unique_resources.values()),
        assets=list(assets_by_source.values()),
        source_commit=commit,
        repo_path=repo_path,
    )


def parse_mkdocs_navigation(repo_path: Path, docs_root: Path) -> list[tuple[str, Path, list[tuple[str, Path]]]]:
    config_path = repo_path / "mkdocs.yml"
    config = yaml.safe_load(read_text(config_path))
    nav = config.get("nav") if isinstance(config, dict) else None
    if not isinstance(nav, list):
        raise ValueError("mkdocs.yml does not contain a nav list")
    result: list[tuple[str, Path, list[tuple[str, Path]]]] = []
    for entry in nav:
        if not isinstance(entry, dict) or len(entry) != 1:
            continue
        chapter_title, children = next(iter(entry.items()))
        if not isinstance(children, list):
            continue
        overview: Path | None = None
        sections: list[tuple[str, Path]] = []
        for child in children:
            if isinstance(child, str):
                rel_path = child
                label = ""
            elif isinstance(child, dict) and len(child) == 1:
                label, rel_path = next(iter(child.items()))
            else:
                continue
            if not isinstance(rel_path, str) or not rel_path.startswith("chapter_"):
                continue
            source_path = (docs_root / rel_path).resolve()
            if docs_root.resolve() not in source_path.parents or not source_path.is_file():
                raise FileNotFoundError(f"Hello Algo nav source not found: {rel_path}")
            if source_path.name == "index.md":
                overview = source_path
            else:
                sections.append((normalize_nav_title(str(label)), source_path))
        if overview is not None:
            result.append((normalize_nav_title(str(chapter_title)), overview, sections))
    return result


def normalize_nav_title(value: str) -> str:
    normalized = html.unescape(value).replace("\xa0", " ")
    return re.sub(r"\s+", " ", normalized).strip()


def normalize_code_languages(values: list[str] | None) -> tuple[str, ...]:
    if not values or values == ["all"]:
        return ALLOWED_CODE_LANGUAGES
    aliases = {"c++": "cpp", "py": "python"}
    normalized = tuple(dict.fromkeys(aliases.get(value.strip().lower(), value.strip().lower()) for value in values))
    unsupported = [value for value in normalized if value not in ALLOWED_CODE_LANGUAGES]
    if unsupported:
        raise ValueError(f"Hello Algo course content supports only cpp, python, java: {', '.join(unsupported)}")
    return tuple(language for language in ALLOWED_CODE_LANGUAGES if language in normalized)


def normalize_markdown(
    repo_path: Path,
    markdown_path: Path,
    content: str,
    chapter_title: str,
    commit: str,
    public_base: str,
    allowed_languages: tuple[str, ...],
) -> tuple[str, dict[str, set[Path]], list[ParsedAsset]]:
    value = content.replace("\r\n", "\n").replace("\r", "\n")
    value = re.sub(r"\A---\n.*?\n---\n+", "", value, count=1, flags=re.DOTALL)
    value = re.sub(r"\A\s*#\s+[^\n]+\n+", "", value, count=1)
    source_files: dict[str, set[Path]] = {language: set() for language in allowed_languages}

    def replace_src(match: re.Match[str]) -> str:
        marker = match.group(1).strip()
        file_name = marker_value(marker, "file")
        class_name = marker_value(marker, "class")
        function_name = marker_value(marker, "func")
        if not file_name:
            raise ValueError(f"invalid src marker in {relative_posix(repo_path, markdown_path)}: {marker}")
        panels: list[tuple[str, str, str]] = []
        for language in allowed_languages:
            code_path = repo_path / "codes" / language / markdown_path.parent.name / f"{file_name}{LANGUAGE_EXTENSIONS[language]}"
            if not code_path.is_file():
                raise FileNotFoundError(f"Hello Algo code source not found: {relative_posix(repo_path, code_path)}")
            code_text = read_text(code_path)
            snippet = extract_code_snippet(code_text, language, class_name, function_name)
            if not snippet.strip():
                raise ValueError(
                    f"Hello Algo code target not found: {relative_posix(repo_path, code_path)} class={class_name} func={function_name}"
                )
            source_files[language].add(code_path)
            panels.append((LANGUAGE_LABELS[language], language, f"```{language}\n{snippet.rstrip()}\n```"))
        return code_tabs_directive(panels)

    value = re.sub(r"```src\s*\n(.*?)\n```", replace_src, value, flags=re.DOTALL)
    value = normalize_tab_groups(value, allowed_languages)
    value = normalize_admonitions(value)
    value = normalize_table_captions(value, chapter_title)
    value = normalize_known_html(value)
    value, assets = rewrite_images(repo_path, markdown_path, value, commit, public_base)
    value = re.sub(
        r"\$\$(.*?)\$\$",
        lambda match: "$$" + match.group(1).replace(r"\newline", r"\\") + "$$",
        value,
        flags=re.DOTALL,
    )
    value = re.sub(r"[\u2061-\u2064]", "", value)
    value = re.sub(r"\n{3,}", "\n\n", value).strip()
    return value, source_files, assets


def marker_value(marker: str, key: str) -> str:
    match = re.search(rf"\[{re.escape(key)}\]\{{([^}}]*)\}}", marker)
    return match.group(1).strip() if match else ""


def code_tabs_directive(panels: list[tuple[str, str, str]]) -> str:
    lines = [":::code-tabs"]
    for label, language, body in panels:
        lines.extend([f"@@{label}|{language}", body.strip()])
    lines.append(":::")
    return "\n".join(lines)


def normalize_tab_groups(content: str, allowed_languages: tuple[str, ...]) -> str:
    lines = content.splitlines()
    output: list[str] = []
    index = 0
    allowed_by_label = {LANGUAGE_LABELS[language].lower(): language for language in allowed_languages}
    while index < len(lines):
        tab_match = re.match(r'^===\s+"([^"]+)"\s*$', lines[index])
        if not tab_match:
            output.append(lines[index])
            index += 1
            continue
        panels: list[tuple[str, str]] = []
        while index < len(lines):
            tab_match = re.match(r'^===\s+"([^"]+)"\s*$', lines[index])
            if not tab_match:
                break
            label = tab_match.group(1).strip()
            index += 1
            body: list[str] = []
            while index < len(lines):
                if re.match(r'^===\s+"([^"]+)"\s*$', lines[index]):
                    break
                line = lines[index]
                if line and not line.startswith("    "):
                    break
                body.append(line[4:] if line.startswith("    ") else "")
                index += 1
            panels.append((label, "\n".join(body).strip()))
        is_language_group = any(label.lower() in KNOWN_LANGUAGE_TABS for label, _ in panels)
        if is_language_group:
            selected: list[tuple[str, str, str]] = []
            for canonical in ALLOWED_CODE_LANGUAGES:
                if canonical not in allowed_languages:
                    continue
                expected_label = LANGUAGE_LABELS[canonical]
                panel = next((body for label, body in panels if label.lower() == expected_label.lower()), None)
                if panel:
                    selected.append((expected_label, canonical, panel))
            if selected:
                output.append(code_tabs_directive(selected))
        else:
            for label, body in panels:
                step_match = re.fullmatch(r"<(\d+)>", label)
                heading = f"步骤 {step_match.group(1)}" if step_match else label
                output.extend([f"#### {heading}", "", body])
    return "\n".join(output)


def normalize_admonitions(content: str) -> str:
    lines = content.splitlines()
    output: list[str] = []
    index = 0
    while index < len(lines):
        match = re.match(r'^\s*(!!!|\?\?\?)\s+([\w-]+)(?:\s+"([^"]+)")?\s*$', lines[index])
        if not match:
            output.append(lines[index])
            index += 1
            continue
        kind = match.group(2).lower()
        title = match.group(3) or ADMONITION_LABELS.get(kind, "说明")
        index += 1
        body: list[str] = []
        while index < len(lines):
            line = lines[index]
            if line and not line.startswith("    "):
                break
            body.append(line[4:] if line.startswith("    ") else "")
            index += 1
        output.extend([f"> **{title}**", ">"])
        output.extend(">" if not line else f"> {line}" for line in body)
    return "\n".join(output)


def normalize_table_captions(content: str, chapter_title: str) -> str:
    chapter_match = re.search(r"第\s*(\d+)\s*章", chapter_title)
    prefix = chapter_match.group(1) if chapter_match else ""
    counter = 0

    def replace(_: re.Match[str]) -> str:
        nonlocal counter
        counter += 1
        return f"表 {prefix}-{counter}" if prefix else f"表 {counter}"

    return re.sub(r"表\s*<id>", replace, content)


def normalize_known_html(content: str) -> str:
    parts = re.split(r"(```[^\n]*\n[\s\S]*?\n```)", content)
    return "".join(part if part.startswith("```") else normalize_html_fragment(part) for part in parts)


def normalize_html_fragment(content: str) -> str:
    value = re.sub(
        r'<p\s+align=["\']center["\']\s*>(.*?)</p>',
        lambda match: f"**{clean_markdown_text(match.group(1))}**",
        content,
        flags=re.IGNORECASE | re.DOTALL,
    )
    value = re.sub(r"<u>(.*?)</u>", r"**\1**", value, flags=re.IGNORECASE | re.DOTALL)
    value = re.sub(
        r'(!\[[^\]]*\]\([^)\n]+\))[ \t]*\{[ \t]*(?:[.#][\w-]+|(?:class|width|height|loading)[ \t]*=)[^}\n]*\}',
        r"\1",
        value,
    )
    value = re.sub(
        r'(?m)^[ \t]*\{[ \t]*(?:[.#][\w-]+|(?:class|width|height|loading)[ \t]*=)[^}\n]*\}[ \t]*$',
        "",
        value,
    )
    value = re.sub(r"<!--.*?-->", "", value, flags=re.DOTALL)
    value = re.sub(r"</?[A-Za-z][^>\n]*>", "", value)
    return html.unescape(value)


def rewrite_images(
    repo_path: Path,
    markdown_path: Path,
    content: str,
    commit: str,
    public_base: str,
) -> tuple[str, list[ParsedAsset]]:
    assets: dict[str, ParsedAsset] = {}

    def public_url(raw_url: str) -> str:
        stripped = raw_url.strip().strip("<>")
        if stripped.startswith(("http://", "https://", "data:", "#")):
            return stripped
        parsed = urlsplit(stripped)
        source_path = (markdown_path.parent / unquote(parsed.path)).resolve()
        if repo_path.resolve() not in source_path.parents or not source_path.is_file():
            raise FileNotFoundError(
                f"Hello Algo image not found or outside repository: {relative_posix(repo_path, markdown_path)} -> {raw_url}"
            )
        rel_path = relative_posix(repo_path, source_path)
        storage_path = f"course-content/hello-algo/{commit}/{rel_path}"
        url = f"{public_base}/{quote(storage_path, safe='/')}"
        assets[rel_path] = ParsedAsset(source_path=rel_path, storage_path=storage_path, public_url=url)
        return url

    markdown_image = re.compile(r"!\[([^\]]*)\]\(([^)\s]+)(?:\s+['\"][^'\"]*['\"])?\)")
    value = markdown_image.sub(lambda match: f"![{match.group(1)}]({public_url(match.group(2))})", content)
    value = re.sub(
        r'(<img\b[^>]*\bsrc=["\'])([^"\']+)(["\'])',
        lambda match: f"{match.group(1)}{public_url(match.group(2))}{match.group(3)}",
        value,
        flags=re.IGNORECASE,
    )
    return value, list(assets.values())


def extract_code_snippet(code: str, language: str, class_name: str, function_name: str) -> str:
    if language == "python":
        return extract_python_snippet(code, class_name, function_name)
    return extract_c_like_snippet(code, class_name, function_name)


def normalized_identifier(value: str) -> str:
    return re.sub(r"[^a-z0-9]", "", value.lower())


def extract_python_snippet(code: str, class_name: str, function_name: str) -> str:
    tree = ast.parse(code)
    scope: list[ast.AST] = list(tree.body)
    if class_name:
        target_class = next(
            (node for node in ast.walk(tree) if isinstance(node, ast.ClassDef) and normalized_identifier(node.name) == normalized_identifier(class_name)),
            None,
        )
        if target_class is None:
            return ""
        if not function_name:
            return "\n".join(code.splitlines()[target_class.lineno - 1 : target_class.end_lineno])
        scope = list(target_class.body)
    if function_name:
        target_function = next(
            (
                node
                for node in scope
                if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))
                and normalized_identifier(node.name) == normalized_identifier(function_name)
            ),
            None,
        )
        if target_function is None and not class_name:
            target_function = next(
                (
                    node
                    for node in ast.walk(tree)
                    if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))
                    and normalized_identifier(node.name) == normalized_identifier(function_name)
                ),
                None,
            )
        if target_function is None:
            return ""
        return "\n".join(code.splitlines()[target_function.lineno - 1 : target_function.end_lineno])
    return code


def mask_c_like(code: str) -> str:
    chars = list(code)
    result = chars.copy()
    index = 0
    state = "code"
    quote_char = ""
    while index < len(chars):
        char = chars[index]
        next_char = chars[index + 1] if index + 1 < len(chars) else ""
        if state == "code":
            if char == "/" and next_char == "/":
                result[index] = result[index + 1] = " "
                state = "line_comment"
                index += 2
                continue
            if char == "/" and next_char == "*":
                result[index] = result[index + 1] = " "
                state = "block_comment"
                index += 2
                continue
            if char in {'"', "'"}:
                quote_char = char
                result[index] = " "
                state = "string"
        elif state == "line_comment":
            if char == "\n":
                state = "code"
            else:
                result[index] = " "
        elif state == "block_comment":
            if char == "*" and next_char == "/":
                result[index] = result[index + 1] = " "
                state = "code"
                index += 2
                continue
            if char != "\n":
                result[index] = " "
        elif state == "string":
            if char == "\\":
                result[index] = " "
                if index + 1 < len(chars):
                    result[index + 1] = " "
                    index += 2
                    continue
            if char == quote_char:
                state = "code"
            if char != "\n":
                result[index] = " "
        index += 1
    return "".join(result)


def matching_delimiter(masked: str, start: int, opening: str, closing: str) -> int:
    depth = 0
    for index in range(start, len(masked)):
        if masked[index] == opening:
            depth += 1
        elif masked[index] == closing:
            depth -= 1
            if depth == 0:
                return index
    return -1


def extract_c_like_snippet(code: str, class_name: str, function_name: str) -> str:
    masked = mask_c_like(code)
    scope_start, scope_end = 0, len(code)
    if class_name:
        class_pattern = re.compile(r"\bclass\s+([A-Za-z_]\w*)")
        class_match = next(
            (match for match in class_pattern.finditer(masked) if normalized_identifier(match.group(1)) == normalized_identifier(class_name)),
            None,
        )
        if class_match is None:
            return ""
        open_brace = masked.find("{", class_match.end())
        close_brace = matching_delimiter(masked, open_brace, "{", "}") if open_brace >= 0 else -1
        if close_brace < 0:
            return ""
        scope_start, scope_end = class_match.start(), close_brace + 1
        if not function_name:
            line_start = code.rfind("\n", 0, class_match.start()) + 1
            return code[line_start:scope_end]
    if not function_name:
        return code
    target_function_name = class_name if function_name == "__init__" and class_name else function_name
    identifier_pattern = re.compile(r"\b([A-Za-z_]\w*)\s*\(")
    for match in identifier_pattern.finditer(masked, scope_start, scope_end):
        if normalized_identifier(match.group(1)) != normalized_identifier(target_function_name):
            continue
        open_paren = masked.find("(", match.start(), scope_end)
        close_paren = matching_delimiter(masked, open_paren, "(", ")")
        if close_paren < 0:
            continue
        open_brace = masked.find("{", close_paren, scope_end)
        semicolon = masked.find(";", close_paren, scope_end)
        if open_brace < 0 or (semicolon >= 0 and semicolon < open_brace):
            continue
        close_brace = matching_delimiter(masked, open_brace, "{", "}")
        if close_brace < 0 or close_brace >= scope_end:
            continue
        line_start = code.rfind("\n", 0, match.start()) + 1
        return code[line_start : close_brace + 1]
    return ""


def publish_assets(dataset: ParsedHelloAlgoDataset, storage_root: str | Path | None = None) -> None:
    configured_root = Path(storage_root) if storage_root is not None else Path(settings.file_storage_path)
    if storage_root is None and not configured_root.is_absolute():
        backend_root = Path(__file__).resolve().parents[2]
        project_root = backend_root.parent if backend_root.name.lower() == "backend" else backend_root
        configured_root = project_root / configured_root
    root = configured_root.resolve()
    root.mkdir(parents=True, exist_ok=True)
    version_path = Path("course-content") / "hello-algo" / dataset.source_commit
    final_root = (root / version_path).resolve()
    staging_root = (final_root.parent / f".{dataset.source_commit}.tmp").resolve()
    if root not in final_root.parents or root not in staging_root.parents:
        raise ValueError("Hello Algo version directory escapes storage root")
    if staging_root.exists():
        shutil.rmtree(staging_root)
    staging_root.mkdir(parents=True)
    try:
        for asset in dataset.assets:
            source = (dataset.repo_path / asset.source_path).resolve()
            try:
                relative_destination = Path(asset.storage_path).relative_to(version_path)
            except ValueError as exc:
                raise ValueError(f"asset is outside the version directory: {asset.storage_path}") from exc
            destination = (staging_root / relative_destination).resolve()
            if staging_root not in destination.parents:
                raise ValueError(f"asset destination escapes staging root: {asset.storage_path}")
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source, destination)
            if not destination.is_file() or destination.stat().st_size != source.stat().st_size:
                raise IOError(f"failed to stage Hello Algo asset: {asset.storage_path}")
        if final_root.exists():
            shutil.copytree(staging_root, final_root, dirs_exist_ok=True)
            shutil.rmtree(staging_root)
        else:
            staging_root.replace(final_root)
    except Exception:
        if staging_root.exists():
            shutil.rmtree(staging_root)
        raise


def import_hello_algo_dataset(session: Session, dataset: ParsedHelloAlgoDataset) -> ImportSummary:
    now = now_utc()
    overview_by_node_id = {
        stable_id("node", f"{chapter.source_path}/index.md"): chapter.id for chapter in dataset.chapters
    }
    overview_ids = set(overview_by_node_id)
    ensure_overview_nodes_are_migratable(session, overview_ids)

    current_nodes = {
        model.id: model
        for model in session.scalars(
            select(KnowledgeNodeModel).where(KnowledgeNodeModel.course_id == HELLO_ALGO_COURSE_ID)
        ).all()
    }
    for relation in session.scalars(
        select(KnowledgeRelationModel).where(KnowledgeRelationModel.course_id == HELLO_ALGO_COURSE_ID)
    ).all():
        source = current_nodes.get(relation.source_node_id)
        is_managed = (
            relation.source_node_id in overview_ids
            or relation.target_node_id in overview_ids
            or (source is not None and relation.target_node_id in (source.next_node_ids or []))
        )
        if is_managed:
            session.delete(relation)
    session.flush()

    for resource in session.scalars(
        select(GeneratedResourceModel).where(
            GeneratedResourceModel.node_id.in_(overview_ids),
            GeneratedResourceModel.course_id == HELLO_ALGO_COURSE_ID,
        )
    ).all():
        resource.chapter_id = overview_by_node_id[resource.node_id]
        resource.node_id = None
        resource.updated_at = now

    for resource in session.scalars(
        select(GeneratedResourceModel).where(
            GeneratedResourceModel.course_id == HELLO_ALGO_COURSE_ID,
            GeneratedResourceModel.user_id == HELLO_ALGO_USER_ID,
            GeneratedResourceModel.resource_type == "code_case",
        )
    ).all():
        url = (resource.file_url or "").lower()
        if "/codes/" in url and not any(f"/codes/{language}/" in url for language in ALLOWED_CODE_LANGUAGES):
            session.delete(resource)
    session.flush()

    for node_id in overview_ids:
        model = current_nodes.get(node_id)
        if model is not None:
            session.delete(model)
    session.flush()

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
    for chapter in dataset.chapters:
        session.merge(
            ChapterModel(
                id=chapter.id,
                course_id=chapter.course_id,
                title=chapter.title,
                order_index=chapter.order_index,
                description=chapter.description,
                content=chapter.content,
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
                order_index=node.order_index,
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
    for resource in dataset.resources:
        session.merge(
            GeneratedResourceModel(
                id=resource.id,
                user_id=resource.user_id,
                course_id=resource.course_id,
                node_id=resource.node_id,
                chapter_id=resource.chapter_id,
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


def ensure_overview_nodes_are_migratable(session: Session, overview_ids: set[str]) -> None:
    if not overview_ids:
        return
    blockers = {
        "practice_question": session.scalar(
            select(PracticeQuestionModel.id).where(PracticeQuestionModel.node_id.in_(overview_ids)).limit(1)
        ),
        "practice_record": session.scalar(
            select(PracticeRecordModel.id).where(PracticeRecordModel.node_id.in_(overview_ids)).limit(1)
        ),
        "chat_session": session.scalar(
            select(ChatSessionModel.id).where(ChatSessionModel.node_id.in_(overview_ids)).limit(1)
        ),
        "multimodal_generation_task": session.scalar(
            select(MultimodalGenerationTaskModel.id)
            .where(MultimodalGenerationTaskModel.node_id.in_(overview_ids))
            .limit(1)
        ),
    }
    found = [f"{table}:{record_id}" for table, record_id in blockers.items() if record_id]
    if found:
        raise RuntimeError("chapter overview nodes still have non-migratable references: " + ", ".join(found))


def import_hello_algo(
    session: Session,
    repo_dir: str | Path,
    doc_language: str = "zh",
    code_languages: list[str] | None = None,
    source_commit: str | None = None,
) -> ImportSummary:
    dataset = parse_hello_algo_repo(
        repo_dir,
        doc_language=doc_language,
        code_languages=code_languages,
        source_commit=source_commit,
    )
    publish_assets(dataset)
    return import_hello_algo_dataset(session, dataset)


def has_imported_hello_algo_data(session: Session) -> bool:
    return session.execute(select(CourseModel.id).where(CourseModel.id == HELLO_ALGO_COURSE_ID)).first() is not None


def markdown_resource(
    repo_path: Path,
    markdown_path: Path,
    markdown_text: str,
    commit: str,
    node_id: str | None,
    chapter_id: str | None,
) -> ParsedResource:
    rel_path = relative_posix(repo_path, markdown_path)
    title = extract_first_heading(markdown_text) or title_from_path(markdown_path.stem)
    return ParsedResource(
        id=stable_id("resource", f"markdown:{rel_path}"),
        user_id=HELLO_ALGO_USER_ID,
        course_id=HELLO_ALGO_COURSE_ID,
        node_id=node_id,
        chapter_id=chapter_id,
        title=title,
        resource_type="reading_material",
        content=source_wrapped_content(rel_path, commit, markdown_text),
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
        chapter_id=None,
        title=f"{title_from_path(code_path.stem)} ({LANGUAGE_LABELS[language]})",
        resource_type="code_case",
        content=source_wrapped_content(rel_path, commit, code_text),
        file_url=github_blob_url(rel_path, commit),
        status="success",
        audit_status="unchecked",
        source_path=rel_path,
    )


def source_wrapped_content(rel_path: str, commit: str, content: str) -> str:
    return "\n".join(
        [
            f"Source: {github_blob_url(rel_path, commit)}",
            f"Commit: {commit}",
            f"License: {HELLO_ALGO_LICENSE}",
            f"Path: {rel_path}",
            "",
            content.strip(),
        ]
    )


def github_blob_url(rel_path: str, commit: str) -> str:
    return f"https://github.com/krahets/hello-algo/blob/{commit}/{rel_path}"


def stable_id(prefix: str, value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "_", value.lower()).strip("_")[:56]
    digest = hashlib.sha1(value.encode("utf-8")).hexdigest()[:12]
    return f"{prefix}_{slug}_{digest}" if slug else f"{prefix}_{digest}"


def resolve_docs_root(repo_path: Path, doc_language: str) -> Path:
    candidate = repo_path / "docs" if doc_language.lower() in {"zh", "zh-cn", "cn"} else repo_path / doc_language / "docs"
    if not candidate.exists():
        raise FileNotFoundError(f"Hello Algo docs directory not found: {candidate}")
    return candidate


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="strict")


def extract_first_heading(text: str) -> str | None:
    for line in text.splitlines():
        match = re.match(r"^#\s+(.+?)\s*$", line)
        if match:
            return clean_markdown_text(match.group(1))
    return None


def extract_description(text: str, limit: int = 480) -> str | None:
    paragraphs: list[str] = []
    in_code = False
    for line in text.splitlines():
        stripped = line.strip()
        if stripped.startswith("```"):
            in_code = not in_code
            continue
        if in_code or not stripped or stripped.startswith(("#", "|", "![", ":::code-tabs", "@@")):
            continue
        paragraphs.append(clean_markdown_text(stripped.lstrip("> ")))
        if sum(len(item) for item in paragraphs) >= limit:
            break
    description = " ".join(filter(None, paragraphs)).strip()
    return description[:limit] if description else None


def clean_markdown_text(value: str) -> str:
    value = re.sub(r"`([^`]+)`", r"\1", value)
    value = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", value)
    value = re.sub(r"[*_#<>]", "", value)
    return re.sub(r"\s+", " ", value).strip()


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
