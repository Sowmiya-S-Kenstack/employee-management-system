
from sqlalchemy import (
    Column,
    Integer,
    String,
    Date,
    Time,
    DateTime,
    ForeignKey,
    UniqueConstraint,
    func
)

from .database import Base
from sqlalchemy import Boolean


class Attendance(Base):
    __tablename__ = "attendance"

    attendance_id = Column(
        Integer,
        primary_key=True,
        index=True,
        autoincrement=True
    )

    employee_id = Column(
        Integer,
        ForeignKey("employees.employee_id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    attendance_date = Column(
        Date,
        nullable=False,
        index=True
    )

    status = Column(
        String(20),
        nullable=False,
        default="Present"
    )

    check_in = Column(
        Time,
        nullable=True
    )

    check_out = Column(
        Time,
        nullable=True
    )

    remarks = Column(
        String(250),
        nullable=True
    )

    created_at = Column(
        DateTime,
        server_default=func.now(),
        nullable=False
    )

    is_late = Column(
        Boolean,
        nullable=False,
        default=False
    )

    __table_args__ = (
        UniqueConstraint(
            "employee_id",
            "attendance_date",
            name="unique_employee_attendance_date"
        ),
    )
