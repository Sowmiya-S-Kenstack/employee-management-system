
from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy import func

from .database import get_db
from .models import User, Employee
from .security import get_current_user_id


router = APIRouter(
    prefix="/api/dashboard",
    tags=["Dashboard"]
)

bearer_scheme = HTTPBearer()


# Verify JWT and get logged-in user.
# Login details remain in the users table.
def get_logged_in_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db)
):
    user_id = get_current_user_id(credentials.credentials)

    user = db.query(User).filter(
        User.user_id == user_id
    ).first()

    if not user:
        raise HTTPException(
            status_code=401,
            detail="User not found. Please login again."
        )

    return user


# Calculate month ranges
def shift_month(month_date, months):
    month_index = (
        month_date.year * 12
        + month_date.month - 1
        + months
    )

    year = month_index // 12
    month = month_index % 12 + 1

    return date(year, month, 1)


# Dashboard API
@router.get("/overview")
def get_dashboard_overview(
    db: Session = Depends(get_db),
    current_user=Depends(get_logged_in_user)
):

    # 1. Total employees from employees table
    total_employees = db.query(
        func.count(Employee.employee_id)
    ).filter(
        Employee.is_deleted == False
    ).scalar() or 0

    # 2. Active employees
    active_employees = db.query(
        func.count(Employee.employee_id)
    ).filter(
        Employee.is_deleted == False,
        func.lower(Employee.status) == "active"
    ).scalar() or 0

    # 3. Inactive employees
    inactive_employees = db.query(
        func.count(Employee.employee_id)
    ).filter(
        Employee.is_deleted == False,
        func.lower(Employee.status) == "inactive"
    ).scalar() or 0

    # 4. Recently added employees
    recent_employee_records = db.query(Employee).filter(
        Employee.is_deleted == False
    ).order_by(
        Employee.employee_id.desc()
    ).limit(5).all()

    recent_employees = []

    for employee in recent_employee_records:
        recent_employees.append({
            "employee_id": employee.employee_id,
            "employee_name": employee.employee_name,
            "email": employee.email,
            "mobile": employee.mobile,
            "department": employee.department,
            "designation": employee.designation,
            "joining_date": (
                employee.joining_date.isoformat()
                if employee.joining_date else None
            ),
            "status": employee.status
        })

    # 5. Monthly employee statistics - last 6 months
    today = date.today()
    current_month = today.replace(day=1)

    first_month = shift_month(current_month, -5)
    next_month = shift_month(current_month, 1)

    month_expression = func.date_trunc(
        "month",
        Employee.joining_date
    )

    monthly_rows = db.query(
        month_expression.label("month"),
        func.count(Employee.employee_id).label("total")
    ).filter(
        Employee.is_deleted == False,
        Employee.joining_date >= first_month,
        Employee.joining_date < next_month
    ).group_by(
        month_expression
    ).all()

    monthly_counts = {}

    for row in monthly_rows:
        monthly_counts[row.month.strftime("%Y-%m")] = int(row.total)

    monthly_statistics = []

    for month_offset in range(6):
        month_date = shift_month(first_month, month_offset)
        month_key = month_date.strftime("%Y-%m")

        monthly_statistics.append({
            "month": month_date.strftime("%b %Y"),
            "employees": monthly_counts.get(month_key, 0)
        })

    # 6. Return dashboard data
    return {
        "success": True,

        # Logged-in user still comes from users table
        "current_user": {
            "user_id": current_user.user_id,
            "full_name": current_user.full_name,
            "email": current_user.email
        },

        # Employee statistics from employees table
        "stats": {
            "total_employees": total_employees,
            "active_employees": active_employees,
            "inactive_employees": inactive_employees
        },

        "recent_employees": recent_employees,

        "monthly_statistics": monthly_statistics
    }
