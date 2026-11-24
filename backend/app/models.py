
from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    func
)

from .database import Base


class User(Base):

    __tablename__ = "users"

    user_id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    full_name = Column(
        String(100),
        nullable=False
    )

    email = Column(
        String(255),
        unique=True,
        nullable=False,
        index=True
    )

    mobile_number = Column(
        String(10),
        nullable=False
    )

    password_hash = Column(
        String(255),
        nullable=False
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )

    employment_status = Column(
        String(20),
        nullable=False,
        default="Active",
        server_default="Active"
    )


from sqlalchemy import Column, Integer, String, Date



class Employee(Base):
    __tablename__ = "employees"

    employee_id = Column(
        Integer,
        primary_key=True,
        index=True,
        autoincrement=True
    )

    employee_name = Column(String(100), nullable=False)

    email = Column(
        String(150),
        unique=True,
        nullable=False,
        index=True
    )

    mobile = Column(String(15), nullable=False)

    department = Column(String(50), nullable=False)

    designation = Column(String(100), nullable=False)

    joining_date = Column(Date, nullable=False)

    status = Column(
        String(20),
        nullable=False,
        default="Active",
        server_default="Active"
    )
