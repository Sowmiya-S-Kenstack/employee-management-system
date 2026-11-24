
from math import ceil

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
    status
)

from fastapi.security import (
    HTTPBearer,
    HTTPAuthorizationCredentials
)

from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from sqlalchemy.exc import IntegrityError

from .database import get_db
from .models import Employee, User
from .schemas import (
    EmployeeCreate,
    EmployeeUpdate,
    EmployeeResponse,
    EmployeePageResponse
)
from .security import get_current_user_id


router = APIRouter(
    prefix="/api/employees",
    tags=["Employee Management"]
)

bearer_scheme = HTTPBearer()


# JWT AUTHENTICATION
def get_authenticated_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db)
):
    user_id = get_current_user_id(credentials.credentials)

    user = db.query(User).filter(
        User.user_id == user_id
    ).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account not found. Please login again."
        )

    return user


# CREATE EMPLOYEE
@router.post(
    "/",
    response_model=EmployeeResponse,
    status_code=status.HTTP_201_CREATED
)
def create_employee(
    employee_data: EmployeeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_authenticated_user)
):
    existing_employee = db.query(Employee).filter(
        func.lower(Employee.email) == str(employee_data.email).lower()
    ).first()

    if existing_employee:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Employee email already exists"
        )

    new_employee = Employee(
        **employee_data.model_dump()
    )

    try:
        db.add(new_employee)
        db.commit()
        db.refresh(new_employee)

    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Employee email already exists"
        )

    return new_employee


# READ EMPLOYEES - SEARCH, FILTER AND PAGINATION
@router.get(
    "/",
    response_model=EmployeePageResponse
)
def get_employees(
    search: str = Query(default="", max_length=100),
    department: str | None = Query(default=None),
    employee_status: str | None = Query(default=None, alias="status"),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=5, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_authenticated_user)
):
    query = db.query(Employee)

    # Search by employee name or email
    if search.strip():
        search_value = f"%{search.strip()}%"

        query = query.filter(
            or_(
                Employee.employee_name.ilike(search_value),
                Employee.email.ilike(search_value)
            )
        )

    # Department filter
    if department:
        if department not in ["Development", "AI", "HR"]:
            raise HTTPException(
                status_code=400,
                detail="Invalid department"
            )

        query = query.filter(
            Employee.department == department
        )

    # Status filter
    if employee_status:
        if employee_status not in ["Active", "Inactive"]:
            raise HTTPException(
                status_code=400,
                detail="Invalid employee status"
            )

        query = query.filter(
            Employee.status == employee_status
        )

    total = query.count()

    employees = (
        query
        .order_by(Employee.employee_id.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

    return {
        "items": employees,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": ceil(total / limit) if total else 0
    }


# READ ONE EMPLOYEE
@router.get(
    "/{employee_id}",
    response_model=EmployeeResponse
)
def get_employee(
    employee_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_authenticated_user)
):
    employee = db.query(Employee).filter(
        Employee.employee_id == employee_id
    ).first()

    if not employee:
        raise HTTPException(
            status_code=404,
            detail="Employee not found"
        )

    return employee


# UPDATE EMPLOYEE
@router.put(
    "/{employee_id}",
    response_model=EmployeeResponse
)
def update_employee(
    employee_id: int,
    employee_data: EmployeeUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_authenticated_user)
):
    employee = db.query(Employee).filter(
        Employee.employee_id == employee_id
    ).first()

    if not employee:
        raise HTTPException(
            status_code=404,
            detail="Employee not found"
        )

    duplicate_email = db.query(Employee).filter(
        func.lower(Employee.email) == str(employee_data.email).lower(),
        Employee.employee_id != employee_id
    ).first()

    if duplicate_email:
        raise HTTPException(
            status_code=409,
            detail="Email already belongs to another employee"
        )

    for field, value in employee_data.model_dump().items():
        setattr(employee, field, value)

    try:
        db.commit()
        db.refresh(employee)

    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Email already belongs to another employee"
        )

    return employee


# DEACTIVATE EMPLOYEE - SOFT DELETE
@router.patch(
    "/{employee_id}/deactivate",
    response_model=EmployeeResponse
)
def deactivate_employee(
    employee_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_authenticated_user)
):
    employee = db.query(Employee).filter(
        Employee.employee_id == employee_id
    ).first()

    if not employee:
        raise HTTPException(
            status_code=404,
            detail="Employee not found"
        )

    employee.status = "Inactive"

    db.commit()
    db.refresh(employee)

    return employee


# DELETE EMPLOYEE PERMANENTLY
@router.delete("/{employee_id}")
def delete_employee(
    employee_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_authenticated_user)
):
    employee = db.query(Employee).filter(
        Employee.employee_id == employee_id
    ).first()

    if not employee:
        raise HTTPException(
            status_code=404,
            detail="Employee not found"
        )

    db.delete(employee)
    db.commit()

    return {
        "success": True,
        "message": "Employee deleted successfully"
    }
