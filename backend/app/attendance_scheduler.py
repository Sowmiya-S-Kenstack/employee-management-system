
from datetime import date, datetime, time

from sqlalchemy.orm import Session

from .database import SessionLocal
from .models import Employee
from .attendance_models import Attendance


def mark_daily_attendance():
    db: Session = SessionLocal()

    try:
        today = date.today()

        # Saturday and Sunday
        weekend = today.weekday() in (5, 6)

        from sqlalchemy import text

        holiday_result = db.execute(
            text("""
                SELECT holiday_id
                FROM holidays
                WHERE holiday_date = :today
            """),
            {"today": today}
        ).first()

        is_public_holiday = holiday_result is not None

        # All active, non-deleted employees
        employees = db.query(Employee).filter(
            Employee.is_deleted == False,
            Employee.status == "Active"
        ).all()

        for employee in employees:

            attendance = db.query(Attendance).filter(
                Attendance.employee_id == employee.employee_id,
                Attendance.attendance_date == today
            ).first()

            # Preserve existing attendance and approved leave
            if attendance:
                continue

            if weekend or is_public_holiday:
                status = "Holiday"
                remarks = "Weekend or public holiday"
            else:
                status = "Absent"
                remarks = "No check-in recorded"

            attendance = Attendance(
                employee_id=employee.employee_id,
                attendance_date=today,
                status=status,
                check_in=None,
                check_out=None,
                is_late=False,
                remarks=remarks
            )

            db.add(attendance)

        db.commit()

    except Exception:
        db.rollback()
        raise

    finally:
        db.close()
