
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import Base, engine
from . import models
from .auth import router as auth_router

from .dashboard import router as dashboard_router
from .employees import router as employee_router

from . import attendance_models
from .attendance import router as attendance_router
from .reports import router as reports_router

from .attendance_scheduler import mark_daily_attendance
from apscheduler.schedulers.background import BackgroundScheduler

# Create database tables
Base.metadata.create_all(bind=engine)


app = FastAPI(
    title="Employee Management System",
    description="User Registration Module",
    version="1.0.0"
)

scheduler = BackgroundScheduler()

scheduler.add_job(
    mark_daily_attendance,
    trigger="cron",
    hour=18,
    minute=5,
    id="daily_attendance_job",
    replace_existing=True
)

@app.on_event("startup")
def start_attendance_scheduler():
    if not scheduler.running:
        scheduler.start()


@app.on_event("shutdown")
def stop_attendance_scheduler():
    if scheduler.running:
        scheduler.shutdown()

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
app.include_router(reports_router)

@app.get("/")
def home():

    return {
        "message": "Employee Management System API is running"
    }
