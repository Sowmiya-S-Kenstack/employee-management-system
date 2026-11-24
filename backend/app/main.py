
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import Base, engine
from . import models
from .auth import router as auth_router

from .dashboard import router as dashboard_router
from .employees import router as employee_router

from . import attendance_models
from .attendance import router as attendance_router

# Create database tables
Base.metadata.create_all(bind=engine)


app = FastAPI(
    title="Employee Management System",
    description="User Registration Module",
    version="1.0.0"
)


# React frontend connection
app.add_middleware(
    CORSMiddleware,

    allow_origins=[
        "http://localhost:5173"
    ],

    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)


# Register API router
app.include_router(auth_router)
app.include_router(dashboard_router)
app.include_router(employee_router)
app.include_router(attendance_router)

@app.get("/")
def home():

    return {
        "message": "Employee Management System API is running"
    }
