
from datetime import date, time
from typing import Optional, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


AttendanceStatus = Literal[
    "Present",
    "Absent",
    "On Leave"
]


class AttendanceCreate(BaseModel):

    employee_id: int

    attendance_date: date

    status: AttendanceStatus = "Present"

    check_in: Optional[time] = None

    check_out: Optional[time] = None

    remarks: Optional[str] = Field(
        default=None,
        max_length=250
    )

    @field_validator("check_out")
    @classmethod
    def validate_checkout(cls, value, info):
        check_in = info.data.get("check_in")

        if value and check_in and value < check_in:
            raise ValueError(
                "Check-out must be after check-in"
            )

        return value


class AttendanceUpdate(BaseModel):

    status: AttendanceStatus

    check_in: Optional[time] = None

    check_out: Optional[time] = None

    remarks: Optional[str] = Field(
        default=None,
        max_length=250
    )


class AttendanceResponse(BaseModel):

    attendance_id: int

    employee_id: int

    attendance_date: date

    status: str

    check_in: Optional[time]

    check_out: Optional[time]

    remarks: Optional[str]

    model_config = ConfigDict(
        from_attributes=True
    )
