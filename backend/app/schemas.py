
import re

from pydantic import (
    BaseModel,
    EmailStr,
    Field,
    field_validator,
    model_validator
)


class UserRegister(BaseModel):

    full_name: str = Field(
        min_length=3,
        max_length=100
    )

    email: EmailStr

    mobile_number: str

    password: str = Field(
        min_length=8,
        max_length=128
    )

    confirm_password: str

    @field_validator("full_name")
    @classmethod
    def validate_name(cls, value):

        value = value.strip()

        if len(value) < 3:
            raise ValueError(
                "Full name must contain at least 3 characters"
            )

        if not re.fullmatch(
            r"[\w\s.'-]+",
            value,
            flags=re.UNICODE
        ):
            raise ValueError("Enter a valid full name")

        return value

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value):
        return str(value).strip().lower()

    @field_validator("mobile_number")
    @classmethod
    def validate_mobile(cls, value):

        if not re.fullmatch(r"[6-9]\d{9}", value):
            raise ValueError(
                "Enter a valid 10-digit Indian mobile number"
            )

        return value

    @field_validator("password")
    @classmethod
    def validate_password(cls, value):

        if not re.search(r"[A-Z]", value):
            raise ValueError(
                "Password must contain an uppercase letter"
            )

        if not re.search(r"[a-z]", value):
            raise ValueError(
                "Password must contain a lowercase letter"
            )

        if not re.search(r"\d", value):
            raise ValueError(
                "Password must contain a number"
            )

        if not re.search(r"[^A-Za-z0-9]", value):
            raise ValueError(
                "Password must contain a special character"
            )

        return value

    @model_validator(mode="after")
    def check_confirm_password(self):

        if self.password != self.confirm_password:
            raise ValueError("Passwords do not match")

        return self


class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value):
        return str(value).strip().lower()


from datetime import date
from typing import Literal
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class EmployeeCreate(BaseModel):
    employee_name: str = Field(min_length=3, max_length=100)
    email: EmailStr
    mobile: str = Field(min_length=10, max_length=15)
    department: Literal["Development", "AI", "HR"]
    designation: str = Field(min_length=2, max_length=100)
    joining_date: date
    status: Literal["Active", "Inactive"] = "Active"

    @field_validator("employee_name", "designation")
    @classmethod
    def remove_extra_spaces(cls, value):
        value = value.strip()
        if not value:
            raise ValueError("This field is required")
        return value

    @field_validator("mobile")
    @classmethod
    def validate_mobile(cls, value):
        value = value.strip()
        if not value.isdigit():
            raise ValueError("Mobile number must contain digits only")
        if not 10 <= len(value) <= 15:
            raise ValueError("Mobile number must contain 10 to 15 digits")
        return value


class EmployeeUpdate(EmployeeCreate):
    pass


class EmployeeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    employee_id: int
    employee_name: str
    email: EmailStr
    mobile: str
    department: str
    designation: str
    joining_date: date
    status: str


class EmployeePageResponse(BaseModel):
    items: list[EmployeeResponse]
    total: int
    page: int
    limit: int
    total_pages: int
