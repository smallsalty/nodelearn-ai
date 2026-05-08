from fastapi import FastAPI

from app.admin_kb.router import router as admin_kb_router
from app.auth.router import router as auth_router
from app.evaluation.router import router as evaluation_router
from app.graph.router import router as graph_router
from app.learning_path.router import router as learning_path_router
from app.notes.router import router as notes_router
from app.profiles.router import router as profiles_router
from app.reports.router import router as reports_router
from app.resources.router import router as resources_router
from app.users.router import router as users_router

app = FastAPI(title="nodelearn-ai")

app.include_router(auth_router)
app.include_router(users_router)
app.include_router(profiles_router)
app.include_router(learning_path_router)
app.include_router(resources_router)
app.include_router(graph_router)
app.include_router(evaluation_router)
app.include_router(reports_router)
app.include_router(notes_router)
app.include_router(admin_kb_router)
