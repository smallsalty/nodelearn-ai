from __future__ import annotations

import argparse
from pathlib import Path

from app.core.config import settings
from app.db.session import init_db, session_context
from app.services.hello_algo_import_service import ensure_hello_algo_repo, import_hello_algo


def project_root() -> Path:
    return Path(__file__).resolve().parents[3]


def resolve_project_path(value: str) -> Path:
    path = Path(value)
    if path.is_absolute():
        return path
    return project_root() / path


def parse_code_languages(value: str) -> list[str]:
    normalized = value.strip()
    if not normalized or normalized.lower() == "all":
        return ["all"]
    return [item.strip() for item in normalized.split(",") if item.strip()]


def main() -> None:
    parser = argparse.ArgumentParser(description="Import krahets/hello-algo into the NodeLearn AI knowledge database.")
    parser.add_argument("--repo-url", default=settings.hello_algo_repo_url)
    parser.add_argument("--branch", default=settings.hello_algo_branch)
    parser.add_argument("--local-dir", default=settings.hello_algo_local_dir)
    parser.add_argument("--doc-language", default=settings.hello_algo_doc_language)
    parser.add_argument("--code-languages", default=settings.hello_algo_code_languages or settings.hello_algo_code_language or "cpp,python,java")
    parser.add_argument("--source-commit", default=None, help="Required with --skip-git when the source is not its own Git worktree.")
    parser.add_argument("--skip-git", action="store_true", help="Use the existing local repository without clone/pull.")
    parser.add_argument("--init-db", action="store_true", help="Create contract tables before importing.")
    args = parser.parse_args()

    local_dir = resolve_project_path(args.local_dir)
    if args.skip_git:
        repo_dir = local_dir
    else:
        repo_dir = ensure_hello_algo_repo(args.repo_url, args.branch, local_dir)

    if args.init_db:
        init_db()

    with session_context() as session:
        summary = import_hello_algo(
            session=session,
            repo_dir=repo_dir,
            doc_language=args.doc_language,
            code_languages=parse_code_languages(args.code_languages),
            source_commit=args.source_commit,
        )
    print(
        {
            "courseId": summary.course_id,
            "sourceCommit": summary.source_commit,
            "chapters": summary.chapters,
            "nodes": summary.nodes,
            "relations": summary.relations,
            "resources": summary.resources,
        }
    )


if __name__ == "__main__":
    main()
