from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import agents, auth, course, graph, learning_path, notes, practice, profile, reports, resources, system
from app.core.config import settings

app = FastAPI(title=settings.app_name, version=settings.app_version)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/v1", tags=["auth"])
app.include_router(profile.router, prefix="/api/v1", tags=["profiles"])
app.include_router(course.router, prefix="/api/v1", tags=["courses"])
app.include_router(graph.router, prefix="/api/v1", tags=["graph"])
app.include_router(agents.router, prefix="/api/v1", tags=["agents"])
app.include_router(resources.router, prefix="/api/v1", tags=["resources"])
app.include_router(learning_path.router, prefix="/api/v1", tags=["learning-paths"])
app.include_router(practice.router, prefix="/api/v1", tags=["practices"])
app.include_router(notes.router, prefix="/api/v1", tags=["notes"])
app.include_router(reports.router, prefix="/api/v1", tags=["reports"])
app.include_router(system.router, prefix="/api/v1", tags=["system"])
