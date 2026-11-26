
from io import BytesIO
from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse

from sqlalchemy.orm import Session
from sqlalchemy import func

from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment
from openpyxl.utils import get_column_letter

from .database import get_db
from .models import Employee, User
from .attendance_models import Attendance
from .employees import get_authenticated_user

from datetime import date
from calendar import monthrange

from fastapi import HTTPException


router = APIRouter(
    prefix="/api/reports",
    tags=["Reports"]
)


# --------------------------------------------------
# EXCEL GENERATION FUNCTION
# --------------------------------------------------

def create_excel_file(sheet_name, headers, rows):

    workbook = Workbook()
    worksheet = workbook.active
    worksheet.title = sheet_name

    worksheet.append(headers)

    # Header styling
    for cell in worksheet[1]:
        cell.font = Font(
            bold=True,
            color="FFFFFF"
        )

        cell.fill = PatternFill(
            start_color="263B63",
            end_color="263B63",
            fill_type="solid"
        )

        cell.alignment = Alignment(
            horizontal="center"
        )

    # Add data
    for row in rows:
        worksheet.append(row)

    # Adjust column widths
    for column in worksheet.columns:

        max_length = 0
        column_letter = get_column_letter(
            column[0].column
        )

        for cell in column:
            if cell.value is not None:
                max_length = max(
                    max_length,
                    len(str(cell.value))
                )

        worksheet.column_dimensions[
            column_letter
        ].width = min(max_length + 4, 35)

    worksheet.freeze_panes = "A2"
    worksheet.auto_filter.ref = worksheet.dimensions

    output = BytesIO()
    workbook.save(output)
    output.seek(0)

    return output



# --------------------------------------------------
# EMPLOYEE REPORT QUERY WITH FILTERS
# --------------------------------------------------

def get_employee_report_data(
    db: Session,
    employee_id: Optional[int] = None,
    department: Optional[str] = None,
    designation: Optional[str] = None,
    status: Optional[str] = None,
    joining_date_from: Optional[date] = None,
    joining_date_to: Optional[date] = None,
    search: Optional[str] = None
):

    query = db.query(Employee).filter(
        Employee.is_deleted == False
    )

    # Employee ID filter
    if employee_id is not None:
        query = query.filter(
            Employee.employee_id == employee_id
        )

    # Department filter
    if department:
        query = query.filter(
            Employee.department == department
        )

    # Designation filter
    if designation:
        query = query.filter(
            Employee.designation == designation
        )

    # Employment status filter
    if status:
        query = query.filter(
            Employee.status == status
        )

    # Joining date from
    if joining_date_from:
        query = query.filter(
            Employee.joining_date >= joining_date_from
        )

    # Joining date to
    if joining_date_to:
        query = query.filter(
            Employee.joining_date <= joining_date_to
        )

    # Employee name or email search
    if search:
        search_value = f"%{search.strip()}%"

        query = query.filter(
            (Employee.employee_name.ilike(search_value)) |
            (Employee.email.ilike(search_value))
        )

    employees = query.order_by(
        Employee.employee_id.asc()
    ).all()

    rows = []

    for employee in employees:
        rows.append([
            employee.employee_id,
            employee.employee_name,
            employee.email,
            employee.mobile,
            employee.department,
            employee.designation,
            employee.joining_date,
            employee.status
        ])

    return rows


# --------------------------------------------------
# EMPLOYEE REPORT PREVIEW WITH FILTERS
# --------------------------------------------------

@router.get("/employees")
def employee_report(
    employee_id: Optional[int] = Query(None),
    department: Optional[str] = Query(None),
    designation: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    joining_date_from: Optional[date] = Query(None),
    joining_date_to: Optional[date] = Query(None),
    search: Optional[str] = Query(None),

    db: Session = Depends(get_db),
    current_user: User = Depends(get_authenticated_user)
):

    if (
        joining_date_from
        and joining_date_to
        and joining_date_from > joining_date_to
    ):
        raise HTTPException(
            status_code=400,
            detail="Joining date from cannot be after joining date to"
        )

    rows = get_employee_report_data(
        db=db,
        employee_id=employee_id,
        department=department,
        designation=designation,
        status=status,
        joining_date_from=joining_date_from,
        joining_date_to=joining_date_to,
        search=search
    )

    return {
        "total_records": len(rows),
        "data": [
            {
                "employee_id": row[0],
                "employee_name": row[1],
                "email": row[2],
                "mobile": row[3],
                "department": row[4],
                "designation": row[5],
                "joining_date": row[6],
                "status": row[7]
            }
            for row in rows
        ]
    }


# --------------------------------------------------
# EMPLOYEE EXCEL DOWNLOAD WITH FILTERS
# --------------------------------------------------

@router.get("/employees/excel")
def download_employee_report(
    employee_id: Optional[int] = Query(None),
    department: Optional[str] = Query(None),
    designation: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    joining_date_from: Optional[date] = Query(None),
    joining_date_to: Optional[date] = Query(None),
    search: Optional[str] = Query(None),

    db: Session = Depends(get_db),
    current_user: User = Depends(get_authenticated_user)
):

    if (
        joining_date_from
        and joining_date_to
        and joining_date_from > joining_date_to
    ):
        raise HTTPException(
            status_code=400,
            detail="Joining date from cannot be after joining date to"
        )

    rows = get_employee_report_data(
        db=db,
        employee_id=employee_id,
        department=department,
        designation=designation,
        status=status,
        joining_date_from=joining_date_from,
        joining_date_to=joining_date_to,
        search=search
    )

    headers = [
        "Employee ID",
        "Employee Name",
        "Email",
        "Mobile",
        "Department",
        "Designation",
        "Joining Date",
        "Status"
    ]

    file = create_excel_file(
        "Employee Report",
        headers,
        rows
    )

    return StreamingResponse(
        file,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition":
            'attachment; filename="Employee_Report.xlsx"'
        }
    )
# --------------------------------------------------
# ATTENDANCE REPORT QUERY
# --------------------------------------------------

def get_attendance_report_data(
    db: Session,
    start_date: Optional[date],
    end_date: Optional[date]
):

    query = db.query(
        Attendance,
        Employee
    ).join(
        Employee,
        Attendance.employee_id == Employee.employee_id
    ).filter(
        Employee.is_deleted == False
    )

    if start_date:
        query = query.filter(
            Attendance.attendance_date >= start_date
        )

    if end_date:
        query = query.filter(
            Attendance.attendance_date <= end_date
        )

    records = query.order_by(
        Attendance.attendance_date.desc(),
        Employee.employee_name.asc()
    ).all()

    rows = []

    for attendance, employee in records:

        rows.append([
            attendance.attendance_id,
            employee.employee_id,
            employee.employee_name,
            employee.department,
            attendance.attendance_date,
            attendance.status,
            attendance.check_in,
            attendance.check_out,
            attendance.remarks
        ])

    return rows


# --------------------------------------------------
# ATTENDANCE REPORT PREVIEW
# --------------------------------------------------

@router.get("/attendance")
def attendance_report(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_authenticated_user)
):

    if start_date and end_date and start_date > end_date:
        from fastapi import HTTPException
        raise HTTPException(
            status_code=400,
            detail="Start date cannot be after end date"
        )

    rows = get_attendance_report_data(
        db,
        start_date,
        end_date
    )

    return {
        "total_records": len(rows),
        "data": [
            {
                "attendance_id": row[0],
                "employee_id": row[1],
                "employee_name": row[2],
                "department": row[3],
                "attendance_date": row[4],
                "status": row[5],
                "check_in": row[6],
                "check_out": row[7],
                "remarks": row[8]
            }
            for row in rows
        ]
    }


# --------------------------------------------------
# ATTENDANCE EXCEL DOWNLOAD
# --------------------------------------------------

@router.get("/attendance/excel")
def download_attendance_report(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_authenticated_user)
):

    if start_date and end_date and start_date > end_date:
        from fastapi import HTTPException
        raise HTTPException(
            status_code=400,
            detail="Start date cannot be after end date"
        )

    rows = get_attendance_report_data(
        db,
        start_date,
        end_date
    )

    headers = [
        "Attendance ID",
        "Employee ID",
        "Employee Name",
        "Department",
        "Attendance Date",
        "Status",
        "Check In",
        "Check Out",
        "Remarks"
    ]

    file = create_excel_file(
        "Attendance Report",
        headers,
        rows
    )

    return StreamingResponse(
        file,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition":
            'attachment; filename="Attendance_Report.xlsx"'
        }
    )

# --------------------------------------------------
# MONTHLY ATTENDANCE REPORT DATA
# --------------------------------------------------

def get_monthly_attendance_data(
    db: Session,
    month: str
):
    """
    month format: YYYY-MM
    """

    try:
        year, month_number = map(
            int,
            month.split("-")
        )

        if month_number < 1 or month_number > 12:
            raise ValueError

    except (ValueError, AttributeError):
        raise HTTPException(
            status_code=400,
            detail="Month must be in YYYY-MM format"
        )

    first_day = date(
        year,
        month_number,
        1
    )

    last_day_number = monthrange(
        year,
        month_number
    )[1]

    last_day = date(
        year,
        month_number,
        last_day_number
    )

    # Employees excluding soft-deleted records
    employees = db.query(Employee).filter(
        Employee.is_deleted == False
    ).order_by(
        Employee.employee_name.asc()
    ).all()

    result = []

    for employee in employees:

        attendance_records = db.query(Attendance).filter(
            Attendance.employee_id == employee.employee_id,
            Attendance.attendance_date >= first_day,
            Attendance.attendance_date <= last_day
        ).all()

        present = sum(
            1 for record in attendance_records
            if record.status == "Present"
        )

        absent = sum(
            1 for record in attendance_records
            if record.status == "Absent"
        )

        leave = sum(
            1 for record in attendance_records
            if record.status == "On Leave"
        )

        marked_days = present + absent + leave

        # Attendance percentage excludes leave days
        percentage_denominator = present + absent

        attendance_percentage = (
            round(
                (present / percentage_denominator) * 100,
                2
            )
            if percentage_denominator > 0
            else 0
        )

        result.append({
            "employee_id": employee.employee_id,
            "employee_name": employee.employee_name,
            "department": employee.department,
            "designation": employee.designation,
            "present": present,
            "absent": absent,
            "leave": leave,
            "marked_days": marked_days,
            "attendance_percentage": attendance_percentage
        })

    return result

# --------------------------------------------------
# MONTHLY ATTENDANCE REPORT PREVIEW
# --------------------------------------------------

@router.get("/monthly-attendance")
def monthly_attendance_report(
    month: str = Query(
        ...,
        description="Month in YYYY-MM format"
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_authenticated_user)
):

    data = get_monthly_attendance_data(
        db=db,
        month=month
    )

    return {
        "month": month,
        "total_records": len(data),
        "data": data
    }

# --------------------------------------------------
# MONTHLY ATTENDANCE EXCEL DOWNLOAD
# --------------------------------------------------

@router.get("/monthly-attendance/excel")
def download_monthly_attendance_report(
    month: str = Query(
        ...,
        description="Month in YYYY-MM format"
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_authenticated_user)
):

    data = get_monthly_attendance_data(
        db=db,
        month=month
    )

    headers = [
        "Employee ID",
        "Employee Name",
        "Department",
        "Designation",
        "Present Days",
        "Absent Days",
        "Leave Days",
        "Marked Days",
        "Attendance Percentage"
    ]

    rows = [
        [
            item["employee_id"],
            item["employee_name"],
            item["department"],
            item["designation"],
            item["present"],
            item["absent"],
            item["leave"],
            item["marked_days"],
            f'{item["attendance_percentage"]}%'
        ]
        for item in data
    ]

    file = create_excel_file(
        "Monthly Attendance",
        headers,
        rows
    )

    return StreamingResponse(
        file,
        media_type=(
            "application/vnd.openxmlformats-officedocument."
            "spreadsheetml.sheet"
        ),
        headers={
            "Content-Disposition":
                f'attachment; filename="Monthly_Attendance_{month}.xlsx"'
        }
    )


# ==================================================
# 4. DEPARTMENT-WISE EMPLOYEE REPORT
# ==================================================

def get_department_employee_data(
    db: Session,
    department: Optional[str] = None
):
    query = db.query(Employee).filter(
        Employee.is_deleted == False
    )

    if department:
        query = query.filter(
            Employee.department == department
        )

    employees = query.order_by(
        Employee.department.asc(),
        Employee.employee_name.asc()
    ).all()

    return [
        {
            "employee_id": employee.employee_id,
            "employee_name": employee.employee_name,
            "email": employee.email,
            "mobile": employee.mobile,
            "department": employee.department,
            "designation": employee.designation,
            "joining_date": employee.joining_date,
            "status": employee.status
        }
        for employee in employees
    ]


@router.get("/department-wise")
def department_wise_report(
    department: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_authenticated_user)
):
    data = get_department_employee_data(db, department)

    return {
        "total_records": len(data),
        "data": data
    }


@router.get("/department-wise/excel")
def download_department_wise_report(
    department: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_authenticated_user)
):
    data = get_department_employee_data(db, department)

    headers = [
        "Employee ID",
        "Employee Name",
        "Email",
        "Mobile",
        "Department",
        "Designation",
        "Joining Date",
        "Status"
    ]

    rows = [
        [
            item["employee_id"],
            item["employee_name"],
            item["email"],
            item["mobile"],
            item["department"],
            item["designation"],
            item["joining_date"],
            item["status"]
        ]
        for item in data
    ]

    file = create_excel_file(
        "Department Employees",
        headers,
        rows
    )

    return StreamingResponse(
        file,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition":
            'attachment; filename="Department_Wise_Employees.xlsx"'
        }
    )


# ==================================================
# 5. LATE ATTENDANCE REPORT
# ==================================================

def get_late_attendance_data(
    db: Session,
    start_date: Optional[date],
    end_date: Optional[date]
):
    query = db.query(
        Attendance,
        Employee
    ).join(
        Employee,
        Attendance.employee_id == Employee.employee_id
    ).filter(
        Employee.is_deleted == False,
        Attendance.is_late == True
    )

    if start_date:
        query = query.filter(
            Attendance.attendance_date >= start_date
        )

    if end_date:
        query = query.filter(
            Attendance.attendance_date <= end_date
        )

    records = query.order_by(
        Attendance.attendance_date.desc(),
        Employee.employee_name.asc()
    ).all()

    return [
        {
            "attendance_id": attendance.attendance_id,
            "employee_id": employee.employee_id,
            "employee_name": employee.employee_name,
            "department": employee.department,
            "attendance_date": attendance.attendance_date,
            "check_in": attendance.check_in,
            "is_late": attendance.is_late,
            "remarks": attendance.remarks
        }
        for attendance, employee in records
    ]


@router.get("/late-attendance")
def late_attendance_report(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_authenticated_user)
):
    if start_date and end_date and start_date > end_date:
        raise HTTPException(
            status_code=400,
            detail="Start date cannot be after end date"
        )

    data = get_late_attendance_data(
        db, start_date, end_date
    )

    return {
        "total_records": len(data),
        "data": data
    }


@router.get("/late-attendance/excel")
def download_late_attendance_report(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_authenticated_user)
):
    if start_date and end_date and start_date > end_date:
        raise HTTPException(
            status_code=400,
            detail="Start date cannot be after end date"
        )

    data = get_late_attendance_data(
        db, start_date, end_date
    )

    headers = [
        "Attendance ID",
        "Employee ID",
        "Employee Name",
        "Department",
        "Attendance Date",
        "Check In",
        "Late",
        "Remarks"
    ]

    rows = [
        [
            item["attendance_id"],
            item["employee_id"],
            item["employee_name"],
            item["department"],
            item["attendance_date"],
            item["check_in"],
            "Yes" if item["is_late"] else "No",
            item["remarks"]
        ]
        for item in data
    ]

    file = create_excel_file(
        "Late Attendance",
        headers,
        rows
    )

    return StreamingResponse(
        file,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition":
            'attachment; filename="Late_Attendance_Report.xlsx"'
        }
    )


# ==================================================
# 6. ABSENCE AND LEAVE REPORT
# ==================================================

def get_absence_leave_data(
    db: Session,
    start_date: Optional[date],
    end_date: Optional[date],
    status: Optional[str] = None
):
    query = db.query(
        Attendance,
        Employee
    ).join(
        Employee,
        Attendance.employee_id == Employee.employee_id
    ).filter(
        Employee.is_deleted == False,
        Attendance.status.in_(["Absent", "On Leave"])
    )

    if start_date:
        query = query.filter(
            Attendance.attendance_date >= start_date
        )

    if end_date:
        query = query.filter(
            Attendance.attendance_date <= end_date
        )

    if status:
        if status not in ["Absent", "On Leave"]:
            raise HTTPException(
                status_code=400,
                detail="Status must be Absent or On Leave"
            )

        query = query.filter(
            Attendance.status == status
        )

    records = query.order_by(
        Attendance.attendance_date.desc(),
        Employee.employee_name.asc()
    ).all()

    return [
        {
            "attendance_id": attendance.attendance_id,
            "employee_id": employee.employee_id,
            "employee_name": employee.employee_name,
            "department": employee.department,
            "attendance_date": attendance.attendance_date,
            "status": attendance.status,
            "remarks": attendance.remarks
        }
        for attendance, employee in records
    ]


@router.get("/absence-leave")
def absence_leave_report(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_authenticated_user)
):
    if start_date and end_date and start_date > end_date:
        raise HTTPException(
            status_code=400,
            detail="Start date cannot be after end date"
        )

    data = get_absence_leave_data(
        db, start_date, end_date, status
    )

    return {
        "total_records": len(data),
        "data": data
    }


@router.get("/absence-leave/excel")
def download_absence_leave_report(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_authenticated_user)
):
    if start_date and end_date and start_date > end_date:
        raise HTTPException(
            status_code=400,
            detail="Start date cannot be after end date"
        )

    data = get_absence_leave_data(
        db, start_date, end_date, status
    )

    headers = [
        "Attendance ID",
        "Employee ID",
        "Employee Name",
        "Department",
        "Attendance Date",
        "Status",
        "Remarks"
    ]

    rows = [
        [
            item["attendance_id"],
            item["employee_id"],
            item["employee_name"],
            item["department"],
            item["attendance_date"],
            item["status"],
            item["remarks"]
        ]
        for item in data
    ]

    file = create_excel_file(
        "Absence and Leave",
        headers,
        rows
    )

    return StreamingResponse(
        file,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition":
            'attachment; filename="Absence_Leave_Report.xlsx"'
        }
    )
