
import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import {
  CalendarDays,
  Search,
  Clock,
  CheckCircle,
  XCircle,
  Coffee,
  LogIn,
  LogOut,
  RefreshCw,
  Users,
  LayoutDashboard,
  ChartColumn,
  UserRound
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import "../Dashboard.css";
import "./Attendance.css";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { parseISO, format, isValid } from "date-fns";
import {
    FileSpreadsheet
} from "lucide-react";

import { logoutWithAttendance } from "../utils/logoutWithAttendance";

const EMPLOYEE_API = "http://localhost:8000/api/employees/";
const ATTENDANCE_API = "http://localhost:8000/api/attendance/";

function getToday() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function Attendance() {
  const navigate = useNavigate();
  const location = useLocation();

  const [employees, setEmployees] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [selectedDate, setSelectedDate] = useState(
    format(new Date(), "yyyy-MM-dd")
);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [loading, setLoading] = useState(false);

  const token = sessionStorage.getItem("access_token");

  const headers = {
    Authorization: `Bearer ${token}`
  };

  const fetchAttendance = async () => {
    try {
      setLoading(true);

      const [employeeResponse, attendanceResponse] = await Promise.all([
        axios.get(EMPLOYEE_API, {
          headers,
          params: { page: 1, limit: 100 }
        }),
        axios.get(ATTENDANCE_API, {
          headers,
          params: {
    attendance_date: selectedDate,
    page: 1,
    limit: 100
}
        })
      ]);

      setEmployees(employeeResponse.data.items || []);
      setAttendance(attendanceResponse.data.items || []);

    } catch (error) {
      console.error(error);
      toast.error(
        error.response?.data?.detail || "Unable to load attendance"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
}, [selectedDate]);

  const getAttendance = (employeeId) => {
    return attendance.find(
      (record) => record.employee_id === employeeId
    );
  };

  

const markAttendance = async (employeeId, status) => {
    try {
        const existing = getAttendance(employeeId);

        // Prevent changing attendance after check-in
        if (existing?.check_in) {
            toast.warning(
                "Attendance status cannot be changed after check-in."
            );
            return;
        }

        const payload = {
            employee_id: employeeId,
            attendance_date: selectedDate,
            status: status,
            remarks: ""
        };

        let attendanceId = existing?.attendance_id;

        // Create or update attendance
        if (existing) {
            await axios.put(
                `${ATTENDANCE_API}${existing.attendance_id}`,
                {
                    status,
                    remarks: existing.remarks || "",
                    check_in: null,
                    check_out: null
                },
                { headers }
            );
        } else {
            const response = await axios.post(
                ATTENDANCE_API,
                payload,
                { headers }
            );

            attendanceId = response.data?.attendance_id;
        }

        // Automatically record check-in when Present is selected
        if (status === "Present" && selectedDate === getToday()) {

            // If the POST response does not contain the ID,
            // fetch the attendance record to find it
            if (!attendanceId) {
                const response = await axios.get(
                    ATTENDANCE_API,
                    {
                        headers,
                        params: {
                            attendance_date: selectedDate,
                            page: 1,
                            limit: 100
                        }
                    }
                );

                const record = response.data.items.find(
                    (item) => item.employee_id === employeeId
                );

                attendanceId = record?.attendance_id;
            }

            if (!attendanceId) {
                throw new Error("Attendance record ID not found");
            }

            // Call the existing check-in endpoint
            await axios.patch(
                `${ATTENDANCE_API}${attendanceId}/check-in`,
                {},
                { headers }
            );

            toast.success(
                "Present marked and check-in recorded successfully!"
            );
        } else {
            toast.success(`Marked as ${status}`);
        }

        await fetchAttendance();

    } catch (error) {
        console.error("Attendance error:", error);

        toast.error(
            error.response?.data?.detail ||
            error.message ||
            "Unable to mark attendance"
        );
    }
};


  const recordTime = async (employeeId, action) => {
    try {
      const existing = getAttendance(employeeId);

      if (!existing) {
        toast.warning("Please mark attendance first");
        return;
      }

      await axios.patch(
        `${ATTENDANCE_API}${existing.attendance_id}/${action}`,
        {},
        { headers }
      );

      toast.success(
        action === "check-in" ? "Check-in recorded" : "Check-out recorded"
      );

      fetchAttendance();

    } catch (error) {
      toast.error(
        error.response?.data?.detail || "Unable to record time"
      );
    }
  };

  const filteredEmployees = employees.filter((employee) => {
    const matchesSearch =
      employee.employee_name.toLowerCase().includes(search.toLowerCase()) ||
      employee.email.toLowerCase().includes(search.toLowerCase());

    const record = getAttendance(employee.employee_id);

    const matchesStatus =
      statusFilter === "All"
        ? true
        : statusFilter === "Not Marked"
          ? !record
          : record?.status === statusFilter;

    return matchesSearch && matchesStatus && employee.status === "Active";
  });

  const presentCount = attendance.filter(
    (item) => item.status === "Present"
  ).length;

  const absentCount = attendance.filter(
    (item) => item.status === "Absent"
  ).length;

  const leaveCount = attendance.filter(
    (item) => item.status === "On Leave"
  ).length;

  const markedCount = attendance.length;
  const activeCount = employees.filter(
    (employee) => employee.status === "Active"
  ).length;

  const formatTime = (time) => {
    if (!time) return "--";
    return time.slice(0, 5);
  };

  return (
    <div className="dashboard-layout">

      
{/* SIDEBAR */}
<aside className="dashboard-sidebar">

    {/* BRAND */}
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

    {/* NAVIGATION */}
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
                location.pathname === "/attendance" ? "active" : ""
            }`}
            onClick={() => navigate("/attendance")}
        >
            <CalendarDays size={19} />
            <span>Attendance</span>
        </button>

        <button
            className="nav-item"
            onClick={() => navigate("/dashboard#statistics")}
        >
            <ChartColumn size={19} />
            <span>Statistics</span>
        </button>

        <button
    className={`nav-item ${
        location.pathname === "/reports" ? "active" : ""
    }`}
    onClick={() => navigate("/reports")}
>
    <FileSpreadsheet size={19} />
    <span>Reports</span>
</button>

    </nav>

    {/* BOTTOM USER SECTION */}
    <div className="sidebar-bottom">

        <div className="sidebar-user-icon">
            <UserRound size={20} />
        </div>

        <div className="sidebar-user-info">
            <strong>
                {JSON.parse(sessionStorage.getItem("user") || "{}").full_name || "User"}
            </strong>
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
      <main className="dashboard-main attendance-main">

        <div className="attendance-header">
          <div>
            <h1>Attendance Management</h1>
            <p>Track and manage your employees' daily attendance.</p>
          </div>

          <button
            className="attendance-refresh"
            onClick={fetchAttendance}
          >
            <RefreshCw size={17} />
            Refresh
          </button>
        </div>

        {/* DATE SELECTOR */}
        <div className="attendance-date-card">
          <div>
            <CalendarDays size={20} />
            <span>Attendance Date</span>
          </div>

          <LocalizationProvider dateAdapter={AdapterDateFns}>
    <DatePicker
        value={selectedDate ? parseISO(selectedDate) : null}
        onChange={(newValue) => {
            setSelectedDate(
                newValue && isValid(newValue)
                    ? format(newValue, "yyyy-MM-dd")
                    : ""
            );
        }}
        format="dd/MM/yyyy"
        views={["year", "month", "day"]}
        openTo="day"
        maxDate={new Date()}
        slotProps={{
    textField: {
        size: "small",
        placeholder: "DD/MM/YYYY",
        sx: {
            width: "220px"
        }
    },
    actionBar: {
        actions: ["today"]
    }
}}
    />
</LocalizationProvider>
        </div>

        {/* SUMMARY */}
        <div className="attendance-summary">

          <div className="attendance-stat">
            <span className="stat-icon total">
              <Clock size={22} />
            </span>
            <div>
              <h3>{activeCount}</h3>
              <p>Total Employees</p>
            </div>
          </div>

          <div className="attendance-stat">
            <span className="stat-icon present">
              <CheckCircle size={22} />
            </span>
            <div>
              <h3>{presentCount}</h3>
              <p>Present</p>
            </div>
          </div>

          <div className="attendance-stat">
            <span className="stat-icon absent">
              <XCircle size={22} />
            </span>
            <div>
              <h3>{absentCount}</h3>
              <p>Absent</p>
            </div>
          </div>

          <div className="attendance-stat">
            <span className="stat-icon leave">
              <Coffee size={22} />
            </span>
            <div>
              <h3>{leaveCount}</h3>
              <p>On Leave</p>
            </div>
          </div>

          <div className="attendance-stat">
            <span className="stat-icon marked">
              <CalendarDays size={22} />
            </span>
            <div>
              <h3>{markedCount}/{activeCount}</h3>
              <p>Marked</p>
            </div>
          </div>

        </div>

        {/* FILTERS */}
        <div className="attendance-filter-card">

          <div className="attendance-search">
            <Search size={18} />
            <input
              type="text"
              placeholder="Search employee name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="All">All Status</option>
            <option value="Present">Present</option>
            <option value="Absent">Absent</option>
            <option value="On Leave">On Leave</option>
            <option value="Not Marked">Not Marked</option>
          </select>

        </div>

        {/* TABLE */}
        <div className="attendance-table-card">

          <div className="attendance-table-heading">
            <h2>Daily Attendance</h2>
            <span>{filteredEmployees.length} employees</span>
          </div>

          {loading ? (
            <div className="attendance-empty">Loading attendance...</div>
          ) : (
            <div className="attendance-table-wrapper">
              <table className="attendance-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Department</th>
                    <th>Status</th>
                    <th>Check In</th>
                    <th>Check Out</th>
                    <th>Mark Attendance</th>
                    <th>Time Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredEmployees.map((employee) => {
                    const record = getAttendance(employee.employee_id);

                    return (
                      <tr key={employee.employee_id}>
                        <td>
                          <strong>{employee.employee_name}</strong>
                          <small>{employee.email}</small>
                        </td>

                        <td>{employee.department}</td>

                        
<td>
    {record ? (
        <>
            <span
                className={`attendance-status ${
                    record.status?.toLowerCase().replace(" ", "-")
                }`}
            >
                {record.status}
            </span>

            {record.is_late && (
                <span className="attendance-status late">
                    Late
                </span>
            )}
        </>
    ) : (
        <span className="attendance-status not-marked">
            Not Marked
        </span>
    )}
</td>


                        <td>{formatTime(record?.check_in)}</td>
                        <td>{formatTime(record?.check_out)}</td>

                        <td>
                          
<div className="attendance-mark-actions">

    <button
        className="mark-present"
        disabled={!!record?.check_in}
        onClick={() =>
            markAttendance(employee.employee_id, "Present")
        }
    >
        Present
    </button>

    <button
        className="mark-absent"
        disabled={!!record?.check_in}
        onClick={() =>
            markAttendance(employee.employee_id, "Absent")
        }
    >
        Absent
    </button>

    <button
        className="mark-leave"
        disabled={!!record?.check_in}
        onClick={() =>
            markAttendance(employee.employee_id, "On Leave")
        }
    >
        Leave
    </button>

</div>

                        </td>

                        <td>
                          <div className="attendance-time-actions">
                            <button
                              onClick={() => recordTime(employee.employee_id, "check-in")}
                              disabled={!record || record.status !== "Present" || !!record.check_in}
                              title="Check In"
                            >
                              <LogIn size={16} />
                            </button>

                            <button
                              onClick={() => recordTime(employee.employee_id, "check-out")}
                              disabled={!record || record.status !== "Present" || !record.check_in || !!record.check_out}
                              title="Check Out"
                            >
                              <LogOut size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredEmployees.length === 0 && (
                    <tr>
                      <td colSpan="7" className="attendance-empty">
                        No employees found.
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

export default Attendance;
