
from datetime import date, datetime
from typing import Optional

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query
)

from sqlalchemy.orm import Session
from sqlalchemy import or_

from fastapi.security import (
    HTTPBearer,
    HTTPAuthorizationCredentials
)

from .database import get_db
from .models import User, Employee

from .attendance_models import Attendance

from .attendance_schemas import (
    AttendanceCreate,
    AttendanceUpdate,
    AttendanceResponse
)

from .security import get_current_user_id


from datetime import datetime, date, time
from sqlalchemy import text
from .models import Employee

router = APIRouter(
    prefix="/api/attendance",
    tags=["Attendance"]
)

OFFICE_START_TIME = time(9, 30)

bearer_scheme = HTTPBearer()


# AUTHENTICATION
def get_authenticated_user(
    credentials: HTTPAuthorizationCredentials = Depends(
        bearer_scheme
    ),
    db: Session = Depends(get_db)
):
    user_id = get_current_user_id(
        credentials.credentials
    )

    user = db.query(User).filter(
        User.user_id == user_id
    ).first()

    if not user:
        raise HTTPException(
            status_code=401,
            detail="User account not found"
        )

    return user


# GET ATTENDANCE RECORDS
@router.get("/")
def get_attendance(
    attendance_date: Optional[date] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user=Depends(get_authenticated_user)
):

    query = (
        db.query(Attendance, Employee)
        .join(
            Employee,
            Attendance.employee_id == Employee.employee_id
        )
    )

    if attendance_date:
        query = query.filter(
            Attendance.attendance_date == attendance_date
        )

    if status:
        query = query.filter(
            Attendance.status == status
        )

    if search:
        search_value = f"%{search}%"

        query = query.filter(
            or_(
                Employee.employee_name.ilike(search_value),
                Employee.email.ilike(search_value)
            )
        )

    total = query.count()

    records = (
        query
        .order_by(Attendance.attendance_id.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

    items = []

    for attendance, employee in records:
        items.append({
            "attendance_id": attendance.attendance_id,
            "employee_id": employee.employee_id,
            "employee_name": employee.employee_name,
            "email": employee.email,
            "department": employee.department,
            "attendance_date": attendance.attendance_date,
            "status": attendance.status,
            "check_in": attendance.check_in,
            "check_out": attendance.check_out,
            "remarks": attendance.remarks,
            "is_late": attendance.is_late
        })

    return {
        "items": items,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": (
            (total + limit - 1) // limit
            if total else 0
        )
    }


# MARK ATTENDANCE
@router.post("/")
def mark_attendance(
    data: AttendanceCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_authenticated_user)
):

    employee = db.query(Employee).filter(
        Employee.employee_id == data.employee_id
    ).first()

    if not employee:
        raise HTTPException(
            status_code=404,
            detail="Employee not found"
        )

    existing = db.query(Attendance).filter(
        Attendance.employee_id == data.employee_id,
        Attendance.attendance_date == data.attendance_date
    ).first()

    if existing:
        raise HTTPException(
            status_code=400,
            detail="Attendance already exists for this date"
        )

    attendance = Attendance(
        employee_id=data.employee_id,
        attendance_date=data.attendance_date,
        status=data.status,
        check_in=data.check_in,
        check_out=data.check_out,
        remarks=data.remarks
    )

    db.add(attendance)
    db.commit()
    db.refresh(attendance)

    return {
        "message": "Attendance marked successfully",
        "attendance_id": attendance.attendance_id
    }


# UPDATE ATTENDANCE
@router.put("/{attendance_id}")
def update_attendance(
    attendance_id: int,
    data: AttendanceUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_authenticated_user)
):

    attendance = db.query(Attendance).filter(
        Attendance.attendance_id == attendance_id
    ).first()

    if not attendance:
        raise HTTPException(
            status_code=404,
            detail="Attendance record not found"
        )

    # Prevent status changes after check-in
    if attendance.check_in and data.status != attendance.status:
        raise HTTPException(
            status_code=400,
            detail="Attendance status cannot be changed after check-in."
        )

    attendance.status = data.status
    attendance.check_in = data.check_in
    attendance.check_out = data.check_out
    attendance.remarks = data.remarks

    db.commit()

    return {
        "message": "Attendance updated successfully"
    }


# CHECK IN
@router.patch("/{attendance_id}/check-in")
def check_in(
    attendance_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_authenticated_user)
):

    attendance = db.query(Attendance).filter(
        Attendance.attendance_id == attendance_id
    ).first()

    if not attendance:
        raise HTTPException(
            status_code=404,
            detail="Attendance record not found"
        )

    if attendance.status != "Present":
        raise HTTPException(
            status_code=400,
            detail="Check-in is allowed only for Present"
        )

    if attendance.check_in:
        raise HTTPException(
            status_code=400,
            detail="Employee has already checked in"
        )

    attendance.check_in = datetime.now().time().replace(
        microsecond=0
    )

    db.commit()

    return {
        "message": "Check-in recorded successfully",
        "check_in": attendance.check_in
    }


# CHECK OUT
@router.patch("/{attendance_id}/check-out")
def check_out(
    attendance_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_authenticated_user)
):

    attendance = db.query(Attendance).filter(
        Attendance.attendance_id == attendance_id
    ).first()

    if not attendance:
        raise HTTPException(
            status_code=404,
            detail="Attendance record not found"
        )

    if not attendance.check_in:
        raise HTTPException(
            status_code=400,
            detail="Employee must check in first"
        )

    if attendance.check_out:
        raise HTTPException(
            status_code=400,
            detail="Employee has already checked out"
        )

    attendance.check_out = datetime.now().time().replace(
        microsecond=0
    )

    db.commit()

    return {
        "message": "Check-out recorded successfully",
        "check_out": attendance.check_out
    }


# DELETE ATTENDANCE
@router.delete("/{attendance_id}")
def delete_attendance(
    attendance_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_authenticated_user)
):

    attendance = db.query(Attendance).filter(
        Attendance.attendance_id == attendance_id
    ).first()

    if not attendance:
        raise HTTPException(
            status_code=404,
            detail="Attendance record not found"
        )

    db.delete(attendance)
    db.commit()

    return {
        "message": "Attendance deleted successfully"
    }

def is_holiday(db: Session, attendance_date: date) -> bool:

    # Saturday = 5, Sunday = 6
    if attendance_date.weekday() in (5, 6):
        return True

    result = db.execute(
        text("""
            SELECT holiday_id
            FROM holidays
            WHERE holiday_date = :attendance_date
        """),
        {
            "attendance_date": attendance_date
        }
    ).first()

    return result is not None


@router.post("/auto-check-in")
def auto_check_in(
    db: Session = Depends(get_db),
    current_user=Depends(get_authenticated_user)
):
    today = date.today()
    now = datetime.now()

    # Find employee using logged-in user's email
    employee = db.query(Employee).filter(
        Employee.email == current_user.email,
        Employee.is_deleted == False
    ).first()

    if not employee:
        raise HTTPException(
            status_code=404,
            detail="Employee record not found for this login"
        )

    # Do not create attendance on weekends/holidays
    if is_holiday(db, today):
        return {
            "message": "Today is a holiday",
            "status": "Holiday"
        }

    # Check whether attendance already exists
    attendance = db.query(Attendance).filter(
        Attendance.employee_id == employee.employee_id,
        Attendance.attendance_date == today
    ).first()

    if attendance:
        return {
            "message": "Attendance already recorded",
            "status": attendance.status,
            "check_in": attendance.check_in
        }

    late = now.time() > OFFICE_START_TIME

    attendance = Attendance(
        employee_id=employee.employee_id,
        attendance_date=today,
        status="Present",
        check_in=now.time(),
        is_late=late,
        remarks="Late check-in" if late else None
    )

    db.add(attendance)
    db.commit()
    db.refresh(attendance)

    return {
        "message": "Attendance recorded successfully",
        "status": "Present",
        "is_late": late,
        "check_in": attendance.check_in
    }

@router.post("/check-out")
def auto_check_out(
    db: Session = Depends(get_db),
    current_user=Depends(get_authenticated_user)
):
    today = date.today()
    now = datetime.now()

    employee = db.query(Employee).filter(
        Employee.email == current_user.email,
        Employee.is_deleted == False
    ).first()

    if not employee:
        raise HTTPException(
            status_code=404,
            detail="Employee record not found"
        )

    attendance = db.query(Attendance).filter(
        Attendance.employee_id == employee.employee_id,
        Attendance.attendance_date == today
    ).first()

    if not attendance:
        raise HTTPException(
            status_code=404,
            detail="Today's check-in record not found"
        )

    if attendance.check_out:
        return {
            "message": "Check-out already recorded",
            "check_out": attendance.check_out
        }

    attendance.check_out = now.time()

    db.commit()
    db.refresh(attendance)

    return {
        "message": "Check-out recorded successfully",
        "check_out": attendance.check_out
    }