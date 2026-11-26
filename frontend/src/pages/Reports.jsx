
import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";

import {
    Users,
    LayoutDashboard,
    CalendarDays,
    ChartColumn,
    UserRound,
    LogOut,
    FileSpreadsheet,
    RefreshCw,
    Eye,
    Download
} from "lucide-react";

import { useNavigate, useLocation } from "react-router-dom";

import "../Dashboard.css";
import "./Reports.css";

import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";

import { parseISO, format, isValid } from "date-fns";
import { logoutWithAttendance } from "../utils/logoutWithAttendance";

const REPORT_API = "http://localhost:8000/api/reports";

function getToday() {
    const today = new Date();

    return [
        today.getFullYear(),
        String(today.getMonth() + 1).padStart(2, "0"),
        String(today.getDate()).padStart(2, "0")
    ].join("-");
}

function getCurrentMonth() {
    return getToday().slice(0, 7);
}

function formatDate(value) {
    if (!value) return "--";

    const date = new Date(value);

    return Number.isNaN(date.getTime())
        ? value
        : date.toLocaleDateString("en-GB");
}

function formatTime(value) {
    return value ? String(value).slice(0, 5) : "--";
}

const reportConfigurations = {
    employees: {
        title: "Employee Records",
        preview: "/employees",
        excel: "/employees/excel",
        columns: [
            ["employee_id", "Employee ID"],
            ["employee_name", "Employee Name"],
            ["email", "Email"],
            ["mobile", "Mobile"],
            ["department", "Department"],
            ["designation", "Designation"],
            ["joining_date", "Joining Date"],
            ["status", "Status"]
        ]
    },

    attendance: {
        title: "Attendance Records",
        preview: "/attendance",
        excel: "/attendance/excel",
        columns: [
            ["attendance_id", "Attendance ID"],
            ["employee_id", "Employee ID"],
            ["employee_name", "Employee Name"],
            ["department", "Department"],
            ["attendance_date", "Attendance Date"],
            ["status", "Status"],
            ["check_in", "Check In"],
            ["check_out", "Check Out"],
            ["remarks", "Remarks"]
        ]
    },

    "monthly-attendance": {
        title: "Monthly Attendance Summary",
        preview: "/monthly-attendance",
        excel: "/monthly-attendance/excel",
        columns: [
            ["employee_id", "Employee ID"],
            ["employee_name", "Employee Name"],
            ["department", "Department"],
            ["designation", "Designation"],
            ["present", "Present"],
            ["absent", "Absent"],
            ["leave", "On Leave"],
            ["marked_days", "Marked Days"],
            ["attendance_percentage", "Attendance %"]
        ]
    },

    "department-wise": {
        title: "Department-wise Employee Report",
        preview: "/department-wise",
        excel: "/department-wise/excel",
        columns: [
            ["employee_id", "Employee ID"],
            ["employee_name", "Employee Name"],
            ["email", "Email"],
            ["mobile", "Mobile"],
            ["department", "Department"],
            ["designation", "Designation"],
            ["joining_date", "Joining Date"],
            ["status", "Status"]
        ]
    },

    "late-attendance": {
        title: "Late Attendance Report",
        preview: "/late-attendance",
        excel: "/late-attendance/excel",
        columns: [
            ["attendance_id", "Attendance ID"],
            ["employee_id", "Employee ID"],
            ["employee_name", "Employee Name"],
            ["department", "Department"],
            ["attendance_date", "Attendance Date"],
            ["check_in", "Check In"],
            ["is_late", "Late"],
            ["remarks", "Remarks"]
        ]
    },

    "absence-leave": {
        title: "Absence and Leave Report",
        preview: "/absence-leave",
        excel: "/absence-leave/excel",
        columns: [
            ["attendance_id", "Attendance ID"],
            ["employee_id", "Employee ID"],
            ["employee_name", "Employee Name"],
            ["department", "Department"],
            ["attendance_date", "Attendance Date"],
            ["status", "Attendance Status"],
            ["remarks", "Remarks"]
        ]
    }
};

function Reports() {
    const navigate = useNavigate();
    const location = useLocation();

    const [reportType, setReportType] = useState("attendance");

    const [startDate, setStartDate] = useState(getToday());
    const [endDate, setEndDate] = useState(getToday());
    const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());

    const [department, setDepartment] = useState("");
    const [absenceStatus, setAbsenceStatus] = useState("");

    const [reportData, setReportData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [hasPreview, setHasPreview] = useState(false);

    const token = sessionStorage.getItem("access_token");

    const headers = {
        Authorization: `Bearer ${token}`
    };

    const user = JSON.parse(
        sessionStorage.getItem("user") || "{}"
    );

    const config = reportConfigurations[reportType];

    const validateFilters = () => {
        if (
            [
                "attendance",
                "late-attendance",
                "absence-leave"
            ].includes(reportType) &&
            startDate &&
            endDate &&
            startDate > endDate
        ) {
            toast.error("Start date cannot be after end date");
            return false;
        }

        if (
            reportType === "monthly-attendance" &&
            !selectedMonth
        ) {
            toast.warning("Please select a month");
            return false;
        }

        return true;
    };

    const getRequestParams = () => {
        if (reportType === "monthly-attendance") {
            return {
                month: selectedMonth
            };
        }

        if (
            [
                "attendance",
                "late-attendance",
                "absence-leave"
            ].includes(reportType)
        ) {
            const params = {
                start_date: startDate || undefined,
                end_date: endDate || undefined
            };

            if (
                reportType === "absence-leave" &&
                absenceStatus
            ) {
                params.status = absenceStatus;
            }

            return params;
        }

        if (reportType === "department-wise") {
            return {
                department: department || undefined
            };
        }

        return {};
    };

    const previewReport = async () => {
        if (!validateFilters()) return;

        try {
            setLoading(true);

            const response = await axios.get(
                `${REPORT_API}${config.preview}`,
                {
                    headers,
                    params: getRequestParams()
                }
            );

            setReportData(response.data.data || []);
            setHasPreview(true);

        } catch (error) {
            console.error(error);

            toast.error(
                error.response?.data?.detail ||
                "Unable to generate report"
            );

            setReportData([]);
            setHasPreview(false);

        } finally {
            setLoading(false);
        }
    };

    const downloadExcel = async () => {
        if (!validateFilters()) return;

        try {
            setDownloading(true);

            const response = await axios.get(
                `${REPORT_API}${config.excel}`,
                {
                    headers,
                    params: getRequestParams(),
                    responseType: "blob"
                }
            );

            const blob = new Blob(
                [response.data],
                {
                    type:
                        "application/vnd.openxmlformats-officedocument." +
                        "spreadsheetml.sheet"
                }
            );

            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement("a");

            link.href = downloadUrl;
            link.download = `${reportType.replaceAll("-", "_")}_Report.xlsx`;

            document.body.appendChild(link);
            link.click();
            link.remove();

            window.URL.revokeObjectURL(downloadUrl);

            toast.success("Excel report downloaded successfully");

        } catch (error) {
            console.error(error);

            toast.error("Unable to download Excel report");

        } finally {
            setDownloading(false);
        }
    };

    useEffect(() => {
        setReportData([]);
        setHasPreview(false);
    }, [
        reportType,
        startDate,
        endDate,
        selectedMonth,
        department,
        absenceStatus
    ]);

    const renderCell = (item, key) => {
        if (key === "employee_id" || key === "attendance_id") {
            return `#${item[key]}`;
        }

        if (
            key === "joining_date" ||
            key === "attendance_date"
        ) {
            return formatDate(item[key]);
        }

        if (key === "check_in" || key === "check_out") {
            return formatTime(item[key]);
        }

        if (key === "is_late") {
            return item.is_late ? "Yes" : "No";
        }

        if (key === "attendance_percentage") {
            return `${item[key]}%`;
        }

        return item[key] ?? "--";
    };

    return (
        <div className="dashboard-layout">

            {/* SIDEBAR */}
            <aside className="dashboard-sidebar">

                <div className="sidebar-brand">
                    <div className="brand-icon">
                        <Users size={25} />
                    </div>

                    <div>
                        <h2>EMS</h2>
                        <span>Employee Management</span>
                    </div>
                </div>

                <div className="sidebar-section-title">
                    MAIN MENU
                </div>

                <nav className="sidebar-nav">

                    <button
                        className="nav-item"
                        onClick={() => navigate("/dashboard")}
                    >
                        <LayoutDashboard size={19} />
                        <span>Dashboard</span>
                    </button>

                    <button
                        className="nav-item"
                        onClick={() => navigate("/employees")}
                    >
                        <Users size={19} />
                        <span>Employees</span>
                    </button>

                    <button
                        className={`nav-item ${
                            location.pathname === "/attendance"
                                ? "active"
                                : ""
                        }`}
                        onClick={() => navigate("/attendance")}
                    >
                        <CalendarDays size={19} />
                        <span>Attendance</span>
                    </button>

                    <button
                        className="nav-item"
                        onClick={() =>
                            navigate("/dashboard#statistics")
                        }
                    >
                        <ChartColumn size={19} />
                        <span>Statistics</span>
                    </button>

                    <button
                        className={`nav-item ${
                            location.pathname === "/reports"
                                ? "active"
                                : ""
                        }`}
                        onClick={() => navigate("/reports")}
                    >
                        <FileSpreadsheet size={19} />
                        <span>Reports</span>
                    </button>

                </nav>

                <div className="sidebar-bottom">

                    <div className="sidebar-user-icon">
                        <UserRound size={20} />
                    </div>

                    <div className="sidebar-user-info">
                        <strong>{user.full_name || "User"}</strong>
                        <span>Registered User</span>
                    </div>

                    <button
                        className="sidebar-logout"
                        onClick={async () => {
                            await logoutWithAttendance(navigate);
                        }}
                        title="Logout"
                    >
                        <LogOut size={19} />
                    </button>

                </div>

            </aside>

            {/* MAIN CONTENT */}
            <main className="dashboard-main reports-main">

                <div className="reports-header">

                    <div>
                        <h1>Reports</h1>
                        <p>
                            Generate and download employee
                            and attendance reports.
                        </p>
                    </div>

                    <button
                        className="reports-refresh"
                        onClick={previewReport}
                        disabled={loading}
                    >
                        <RefreshCw size={16} />
                        Refresh
                    </button>

                </div>

                {/* FILTER CARD */}
                <div className="reports-filter-card">

                    <div className="reports-filter-group">
                        <label>Report Type</label>

                        <select
                            value={reportType}
                            onChange={(event) =>
                                setReportType(event.target.value)
                            }
                        >
                            <option value="employees">
                                Employee Report
                            </option>

                            <option value="attendance">
                                Attendance Report
                            </option>

                            <option value="monthly-attendance">
                                Monthly Attendance Report
                            </option>

                            <option value="department-wise">
                                Department-wise Employee Report
                            </option>

                            <option value="late-attendance">
                                Late Attendance Report
                            </option>

                            <option value="absence-leave">
                                Absence & Leave Report
                            </option>
                        </select>
                    </div>

                    {/* DATE FILTERS */}
                    {[
                        "attendance",
                        "late-attendance",
                        "absence-leave"
                    ].includes(reportType) && (

                        <LocalizationProvider dateAdapter={AdapterDateFns}>

                            <div className="reports-date-filters">

                                <div className="reports-form-group">
                                    <label>Start Date</label>

                                    <DatePicker
    value={
        startDate
            ? parseISO(startDate)
            : null
    }
    onChange={(newValue) =>
        setStartDate(
            newValue && isValid(newValue)
                ? format(newValue, "yyyy-MM-dd")
                : ""
        )
    }
    format="dd/MM/yyyy"
    views={["year", "month", "day"]}
    openTo="day"
    maxDate={endDate ? parseISO(endDate) : new Date()}
    slotProps={{
        actionBar: {
            actions: ["today"],
        },
        textField: {
            size: "small",
            placeholder: "DD/MM/YYYY",
            sx: { width: "180px" },
        },
        popper: {
    placement: "top-start",
    sx: {
        "& .MuiPaper-root": {
            width: "320px",
            minWidth: "320px",
            maxWidth: "none",
        },
        "& .MuiPickersLayout-root": {
            minWidth: "320px",
            width: "320px",
        },
        "& .MuiDateCalendar-root": {
            width: "320px",
        },
        "& .MuiMonthCalendar-root": {
            width: "100%",
        },
        "& .MuiYearCalendar-root": {
            width: "100%",
        },
    },
    modifiers: [
        {
            name: "flip",
            enabled: true,
        },
        {
            name: "preventOverflow",
            enabled: true,
            options: {
                boundary: "viewport",
            },
        },
    ],
},
    }}
/>
                                </div>

                                <div className="reports-form-group">
                                    <label>End Date</label>

                                    <DatePicker
    value={
        endDate
            ? parseISO(endDate)
            : null
    }
    onChange={(newValue) =>
        setEndDate(
            newValue && isValid(newValue)
                ? format(newValue, "yyyy-MM-dd")
                : ""
        )
    }
    format="dd/MM/yyyy"
    views={["year", "month", "day"]}
    openTo="day"
    minDate={startDate ? parseISO(startDate) : undefined}
    maxDate={new Date()}
    slotProps={{
        actionBar: {
            actions: ["today"],
        },
        textField: {
            size: "small",
            placeholder: "DD/MM/YYYY",
            sx: { width: "180px" },
        },
        popper: {
    placement: "top-start",
    sx: {
        "& .MuiPaper-root": {
            width: "320px",
            minWidth: "320px",
            maxWidth: "none",
        },
        "& .MuiPickersLayout-root": {
            minWidth: "320px",
            width: "320px",
        },
        "& .MuiDateCalendar-root": {
            width: "320px",
        },
        "& .MuiMonthCalendar-root": {
            width: "100%",
        },
        "& .MuiYearCalendar-root": {
            width: "100%",
        },
    },
    modifiers: [
        {
            name: "flip",
            enabled: true,
        },
        {
            name: "preventOverflow",
            enabled: true,
            options: {
                boundary: "viewport",
            },
        },
    ],
},
    }}
/>
                                </div>

                            </div>

                        </LocalizationProvider>
                    )}

                    {/* MONTH FILTER */}
                    {reportType === "monthly-attendance" && (
                        <div className="reports-filter-group">
                            <label>Select Month</label>

                            <input
                                type="month"
                                value={selectedMonth}
                                onChange={(event) =>
                                    setSelectedMonth(event.target.value)
                                }
                            />
                        </div>
                    )}

                    {/* DEPARTMENT FILTER */}
{reportType === "department-wise" && (
    <div className="reports-filter-group">
        <label>Department</label>

        <select
            value={department}
            onChange={(event) =>
                setDepartment(event.target.value)
            }
        >
            <option value="">All Departments</option>
            <option value="IT">IT</option>
            <option value="HR">HR</option>
            <option value="AI">AI</option>
            <option value="Development">Development</option>
        </select>
    </div>
)}

                    {/* ABSENCE STATUS FILTER */}
                    {reportType === "absence-leave" && (
                        <div className="reports-filter-group">
                            <label>Attendance Status</label>

                            <select
                                value={absenceStatus}
                                onChange={(event) =>
                                    setAbsenceStatus(event.target.value)
                                }
                            >
                                <option value="">All</option>
                                <option value="Absent">Absent</option>
                                <option value="On Leave">On Leave</option>
                            </select>
                        </div>
                    )}

                    {/* ACTION BUTTONS */}
                    <div className="reports-action-buttons">

                        <button
                            className="reports-preview-btn"
                            onClick={previewReport}
                            disabled={loading}
                        >
                            <Eye size={16} />
                            {loading ? "Loading..." : "Preview Report"}
                        </button>

                        <button
                            className="reports-download-btn"
                            onClick={downloadExcel}
                            disabled={downloading}
                        >
                            <Download size={16} />
                            {downloading ? "Downloading..." : "Download Excel"}
                        </button>

                    </div>

                </div>

                {/* REPORT TABLE */}
                <div className="reports-table-card">

                    <div className="reports-table-heading">
                        <h2>{config.title}</h2>

                        <span>
                            {hasPreview
                                ? `${reportData.length} records found`
                                : "Preview your report"}
                        </span>
                    </div>

                    {!hasPreview ? (

                        <div className="reports-empty">
                            Select a report and click Preview Report.
                        </div>

                    ) : loading ? (

                        <div className="reports-empty">
                            Loading report...
                        </div>

                    ) : (

                        <div className="reports-table-wrapper">

                            <table className="reports-table">

                                <thead>
                                    <tr>
                                        {config.columns.map(([key, label]) => (
                                            <th key={key}>{label}</th>
                                        ))}
                                    </tr>
                                </thead>

                                <tbody>

                                    {reportData.map((item, index) => (
                                        <tr
                                            key={
                                                item.attendance_id ||
                                                item.employee_id ||
                                                index
                                            }
                                        >
                                            {config.columns.map(([key]) => (
                                                <td key={key}>
                                                    {[
                                                        "status",
                                                    ].includes(key) ? (
                                                        <span
                                                            className={`reports-status ${
                                                                String(item[key] || "")
                                                                    .toLowerCase()
                                                                    .replace(" ", "-")
                                                            }`}
                                                        >
                                                            {renderCell(item, key)}
                                                        </span>
                                                    ) : key === "is_late" ? (
                                                        <span
                                                            className={`reports-status ${
                                                                item.is_late
                                                                    ? "late"
                                                                    : "present"
                                                            }`}
                                                        >
                                                            {item.is_late ? "Yes" : "No"}
                                                        </span>
                                                    ) : (
                                                        renderCell(item, key)
                                                    )}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}

                                    {reportData.length === 0 && (
                                        <tr>
                                            <td
                                                colSpan={config.columns.length}
                                                className="reports-empty"
                                            >
                                                No records found.
                                            </td>
                                        </tr>
                                    )}

                                </tbody>

                            </table>

                        </div>

                    )}

                </div>

            </main>

        </div>
    );
}

export default Reports;
