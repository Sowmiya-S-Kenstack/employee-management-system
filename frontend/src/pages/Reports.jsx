
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

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleDateString("en-GB");
}

function formatTime(value) {
    if (!value) return "--";

    return String(value).slice(0, 5);
}

function Reports() {
    const navigate = useNavigate();
    const location = useLocation();

    const [reportType, setReportType] = useState("attendance");

    const [startDate, setStartDate] = useState(getToday());
    const [endDate, setEndDate] = useState(getToday());
    const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());

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

    const getPreviewUrl = () => {
        if (reportType === "employees") {
            return `${REPORT_API}/employees`;
        }

        if (reportType === "attendance") {
            return `${REPORT_API}/attendance`;
        }

        return `${REPORT_API}/monthly-attendance`;
    };

    const getExcelUrl = () => {
        if (reportType === "employees") {
            return `${REPORT_API}/employees/excel`;
        }

        if (reportType === "attendance") {
            return `${REPORT_API}/attendance/excel`;
        }

        return `${REPORT_API}/monthly-attendance/excel`;
    };

    const getRequestParams = () => {
        if (reportType === "attendance") {
            return {
                start_date: startDate || undefined,
                end_date: endDate || undefined
            };
        }

        if (reportType === "monthly-attendance") {
            return {
                month: selectedMonth
            };
        }

        return {};
    };

    const previewReport = async () => {
        if (
            reportType === "attendance" &&
            startDate &&
            endDate &&
            startDate > endDate
        ) {
            toast.error("Start date cannot be after end date");
            return;
        }

        if (
            reportType === "monthly-attendance" &&
            !selectedMonth
        ) {
            toast.warning("Please select a month");
            return;
        }

        try {
            setLoading(true);

            const response = await axios.get(
                getPreviewUrl(),
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
        if (
            reportType === "attendance" &&
            startDate &&
            endDate &&
            startDate > endDate
        ) {
            toast.error("Start date cannot be after end date");
            return;
        }

        if (
            reportType === "monthly-attendance" &&
            !selectedMonth
        ) {
            toast.warning("Please select a month");
            return;
        }

        try {
            setDownloading(true);

            const response = await axios.get(
                getExcelUrl(),
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

            if (reportType === "employees") {
                link.download = "Employee_Report.xlsx";
            } else if (reportType === "attendance") {
                link.download = "Attendance_Report.xlsx";
            } else {
                link.download =
                    `Monthly_Attendance_${selectedMonth}.xlsx`;
            }

            document.body.appendChild(link);
            link.click();
            link.remove();

            window.URL.revokeObjectURL(downloadUrl);

            toast.success("Excel report downloaded");

        } catch (error) {
            console.error(error);

            toast.error(
                error.response?.data?.detail ||
                "Unable to download Excel report"
            );

        } finally {
            setDownloading(false);
        }
    };

    useEffect(() => {
        setReportData([]);
        setHasPreview(false);
    }, [reportType]);

    const getReportTitle = () => {
        if (reportType === "employees") {
            return "Employee Records";
        }

        if (reportType === "attendance") {
            return "Attendance Records";
        }

        return "Monthly Attendance Summary";
    };

    const handleLogout = () => {
        sessionStorage.clear();
        navigate("/login", { replace: true });
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
                        <strong>
                            {user.full_name || "User"}
                        </strong>
                        <span>Registered User</span>
                    </div>

                    <button
                        className="sidebar-logout"
                        onClick={handleLogout}
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
                    >
                        <RefreshCw size={16} />
                        Refresh
                    </button>

                </div>

                {/* REPORT FILTERS */}
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
                        </select>
                    </div>

                    {/* ATTENDANCE DATE FILTERS */}
{reportType === "attendance" && (

    <LocalizationProvider dateAdapter={AdapterDateFns}>

        <div className="reports-date-filters">

            {/* START DATE */}
            <div className="reports-form-group">

                <label>Start Date</label>

                <DatePicker
                    value={
                        startDate
                            ? parseISO(startDate)
                            : null
                    }
                    onChange={(newValue) => {

                        setStartDate(
                            newValue && isValid(newValue)
                                ? format(newValue, "yyyy-MM-dd")
                                : ""
                        );

                    }}
                    format="dd/MM/yyyy"
                    views={["year", "month", "day"]}
                    openTo="day"
                    maxDate={
                        endDate
                            ? parseISO(endDate)
                            : new Date()
                    }
                    slotProps={{
                        textField: {
                            size: "small",
                            placeholder: "DD/MM/YYYY",
                            sx: {
                                width: "180px"
                            }
                        },
                        actionBar: {
                            actions: ["today"]
                        }
                    }}
                />

            </div>


            {/* END DATE */}
            <div className="reports-form-group">

                <label>End Date</label>

                <DatePicker
                    value={
                        endDate
                            ? parseISO(endDate)
                            : null
                    }
                    onChange={(newValue) => {

                        setEndDate(
                            newValue && isValid(newValue)
                                ? format(newValue, "yyyy-MM-dd")
                                : ""
                        );

                    }}
                    format="dd/MM/yyyy"
                    views={["year", "month", "day"]}
                    openTo="day"
                    minDate={
                        startDate
                            ? parseISO(startDate)
                            : undefined
                    }
                    maxDate={new Date()}
                    slotProps={{
                        textField: {
                            size: "small",
                            placeholder: "DD/MM/YYYY",
                            sx: {
                                width: "180px"
                            }
                        },
                        actionBar: {
                            actions: ["today"]
                        }
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

                    <div className="reports-action-buttons">

                        <button
                            className="reports-preview-btn"
                            onClick={previewReport}
                            disabled={loading}
                        >
                            <Eye size={16} />

                            {loading
                                ? "Loading..."
                                : "Preview Report"}
                        </button>

                        <button
                            className="reports-download-btn"
                            onClick={downloadExcel}
                            disabled={downloading}
                        >
                            <Download size={16} />

                            {downloading
                                ? "Downloading..."
                                : "Download Excel"}
                        </button>

                    </div>

                </div>

                {/* REPORT TABLE */}
                <div className="reports-table-card">

                    <div className="reports-table-heading">

                        <h2>{getReportTitle()}</h2>

                        <span>
                            {hasPreview
                                ? `${reportData.length} records found`
                                : "Preview your report"}
                        </span>

                    </div>

                    {!hasPreview ? (
                        <div className="reports-empty">
                            Select a report and click
                            Preview Report.
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
                                        {reportType === "employees" && (
                                            <>
                                                <th>Employee ID</th>
                                                <th>Employee Name</th>
                                                <th>Email</th>
                                                <th>Mobile</th>
                                                <th>Department</th>
                                                <th>Designation</th>
                                                <th>Joining Date</th>
                                                <th>Status</th>
                                            </>
                                        )}

                                        {reportType === "attendance" && (
                                            <>
                                                <th>Attendance ID</th>
                                                <th>Employee ID</th>
                                                <th>Employee Name</th>
                                                <th>Department</th>
                                                <th>Attendance Date</th>
                                                <th>Status</th>
                                                <th>Check In</th>
                                                <th>Check Out</th>
                                                <th>Remarks</th>
                                            </>
                                        )}

                                        {reportType === "monthly-attendance" && (
                                            <>
                                                <th>Employee ID</th>
                                                <th>Employee Name</th>
                                                <th>Department</th>
                                                <th>Designation</th>
                                                <th>Present</th>
                                                <th>Absent</th>
                                                <th>On Leave</th>
                                                <th>Marked Days</th>
                                                <th>Attendance %</th>
                                            </>
                                        )}
                                    </tr>
                                </thead>

                                <tbody>

                                    {reportData.map((item, index) => (
                                        <tr
                                            key={
                                                item.employee_id ||
                                                item.attendance_id ||
                                                index
                                            }
                                        >

                                            {reportType === "employees" && (
                                                <>
                                                    <td>
                                                        #{item.employee_id}
                                                    </td>

                                                    <td>
                                                        {item.employee_name}
                                                    </td>

                                                    <td>{item.email}</td>
                                                    <td>{item.mobile || "--"}</td>
                                                    <td>{item.department}</td>
                                                    <td>{item.designation}</td>

                                                    <td>
                                                        {formatDate(
                                                            item.joining_date
                                                        )}
                                                    </td>

                                                    <td>
                                                        <span
                                                            className={`reports-status ${
                                                                item.status?.toLowerCase()
                                                            }`}
                                                        >
                                                            {item.status}
                                                        </span>
                                                    </td>
                                                </>
                                            )}

                                            {reportType === "attendance" && (
                                                <>
                                                    <td>
                                                        #{item.attendance_id}
                                                    </td>

                                                    <td>
                                                        #{item.employee_id}
                                                    </td>

                                                    <td>
                                                        {item.employee_name}
                                                    </td>

                                                    <td>{item.department}</td>

                                                    <td>
                                                        {formatDate(
                                                            item.attendance_date
                                                        )}
                                                    </td>

                                                    <td>
                                                        <span
                                                            className={`reports-status ${
                                                                item.status
                                                                    ?.toLowerCase()
                                                                    .replace(
                                                                        " ",
                                                                        "-"
                                                                    )
                                                            }`}
                                                        >
                                                            {item.status}
                                                        </span>
                                                    </td>

                                                    <td>
                                                        {formatTime(
                                                            item.check_in
                                                        )}
                                                    </td>

                                                    <td>
                                                        {formatTime(
                                                            item.check_out
                                                        )}
                                                    </td>

                                                    <td>
                                                        {item.remarks || "--"}
                                                    </td>
                                                </>
                                            )}

                                            {reportType === "monthly-attendance" && (
                                                <>
                                                    <td>
                                                        #{item.employee_id}
                                                    </td>

                                                    <td>
                                                        {item.employee_name}
                                                    </td>

                                                    <td>{item.department}</td>
                                                    <td>{item.designation}</td>

                                                    <td>
                                                        <span className="reports-status present">
                                                            {item.present}
                                                        </span>
                                                    </td>

                                                    <td>
                                                        <span className="reports-status absent">
                                                            {item.absent}
                                                        </span>
                                                    </td>

                                                    <td>
                                                        <span className="reports-status on-leave">
                                                            {item.leave}
                                                        </span>
                                                    </td>

                                                    <td>{item.marked_days}</td>

                                                    <td>
                                                        <strong>
                                                            {item.attendance_percentage}%
                                                        </strong>
                                                    </td>
                                                </>
                                            )}

                                        </tr>
                                    ))}

                                    {reportData.length === 0 && (
                                        <tr>
                                            <td
                                                colSpan={
                                                    reportType === "employees"
                                                        ? 8
                                                        : reportType === "attendance"
                                                        ? 9
                                                        : 9
                                                }
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
