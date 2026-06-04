from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.v1 import agents, audit, auth, course, graph, learning_path, notes, practice, profile, reports, resources, system
from app.core.config import settings

app = FastAPI(title=settings.app_name, version=settings.app_version)
storage_path = Path(settings.file_storage_path).resolve()
storage_path.mkdir(parents=True, exist_ok=True)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.mount(settings.file_storage_url_prefix, StaticFiles(directory=storage_path), name="storage")

app.include_router(auth.router, prefix="/api/v1", tags=["auth"])
app.include_router(profile.router, prefix="/api/v1", tags=["profiles"])
app.include_router(course.router, prefix="/api/v1", tags=["courses"])
app.include_router(graph.router, prefix="/api/v1", tags=["graph"])
app.include_router(agents.router, prefix="/api/v1", tags=["agents"])
app.include_router(resources.router, prefix="/api/v1", tags=["resources"])
app.include_router(audit.router, prefix="/api/v1", tags=["audit"])
app.include_router(learning_path.router, prefix="/api/v1", tags=["learning-paths"])
app.include_router(practice.router, prefix="/api/v1", tags=["practices"])
app.include_router(notes.router, prefix="/api/v1", tags=["notes"])
app.include_router(reports.router, prefix="/api/v1", tags=["reports"])
app.include_router(system.router, prefix="/api/v1", tags=["system"])
