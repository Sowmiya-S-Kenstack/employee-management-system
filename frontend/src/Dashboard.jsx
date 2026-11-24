
import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { useNavigate, useLocation } from "react-router-dom";

import {
    LayoutDashboard,
    Users,
    ChartColumn,
    LogOut,
    RefreshCw,
    Menu,
    X,
    UserRound,
    CalendarDays
} from "lucide-react";

import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    PieChart,
    Pie,
    Cell
} from "recharts";

import "./Dashboard.css";

const API_URL = "http://localhost:8000/api/dashboard";

function Dashboard() {

    const navigate = useNavigate();
    const location = useLocation();

    const [dashboardData, setDashboardData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [showLogoutDialog, setShowLogoutDialog] = useState(false);

    // Fetch dashboard information from FastAPI
    const fetchDashboardData = async () => {

        const token = sessionStorage.getItem("access_token");

        if (!token) {
            navigate("/login");
            return;
        }

        try {

            setLoading(true);
            setError("");

            const response = await axios.get(
                `${API_URL}/overview`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            setDashboardData(response.data);

        } catch (err) {

            console.error("Dashboard API Error:", err);

            if (err.response?.status === 401) {

                sessionStorage.removeItem("access_token");
                sessionStorage.removeItem("user");

                toast.error("Session expired. Please login again.");

                navigate("/login");
                return;
            }

            setError(
                err.response?.data?.detail ||
                "Unable to load dashboard information."
            );

        } finally {

            setLoading(false);

        }
    };

    useEffect(() => {
        fetchDashboardData();
    }, []);

    // Logout
    const handleLogout = () => {
  setShowLogoutDialog(true);
};

const confirmLogout = () => {
  sessionStorage.removeItem("access_token");
  sessionStorage.removeItem("user");

  toast.success("Logged out successfully!");

  setShowLogoutDialog(false);
  navigate("/login");
};

    // Logged-in user information
    const user = dashboardData?.current_user;

    // Employee statistics from employees table
    const stats = dashboardData?.stats;

    const totalEmployees = stats?.total_employees ?? 0;
    const activeEmployees = stats?.active_employees ?? 0;
    const inactiveEmployees = stats?.inactive_employees ?? 0;

    // Calculate percentages
    const activePercentage =
        totalEmployees > 0
            ? (activeEmployees / totalEmployees) * 100
            : 0;

    const inactivePercentage =
        totalEmployees > 0
            ? (inactiveEmployees / totalEmployees) * 100
            : 0;

    // Doughnut chart data
    const employeeStatusData = [
        {
            name: "Active",
            value: activeEmployees,
            color: "#16a34a"
        },
        {
            name: "Inactive",
            value: inactiveEmployees,
            color: "#e60000"
        }
    ];

    // Actual employee records from employees table
    const recentEmployees =
        dashboardData?.recent_employees || [];

    // Monthly joining statistics
    const monthlyStatistics =
        dashboardData?.monthly_statistics || [];

    // Format date
    const formatDate = (dateValue) => {

        if (!dateValue) return "-";

        return new Date(dateValue).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        });
    };

    if (loading && !dashboardData) {

        return (
            <div className="dashboard-loading">
                <div className="loader"></div>
                <p>Loading dashboard information...</p>
            </div>
        );
    }

    return (

        <div className="dashboard-layout">

            {/* Sidebar */}
            <aside
                className={`dashboard-sidebar ${
                    sidebarOpen ? "sidebar-open" : ""
                }`}
            >

                <div className="sidebar-brand">

                    <div className="brand-icon">
                        <Users size={25} />
                    </div>

                    <div>
                        <h2>EMS</h2>
                        <span>Employee Management</span>
                    </div>

                    <button
                        className="sidebar-close"
                        onClick={() => setSidebarOpen(false)}
                        aria-label="Close sidebar"
                    >
                        <X size={20} />
                    </button>

                </div>

                <div className="sidebar-section-title">
                    MAIN MENU
                </div>

                <nav className="sidebar-nav">

                    <a
                        href="#overview"
                        className={`nav-item ${
                            location.pathname === "/dashboard"
                                ? "active"
                                : ""
                        }`}
                        onClick={() => setSidebarOpen(false)}
                    >
                        <LayoutDashboard size={19} />
                        <span>Dashboard</span>
                    </a>

                    <button
                        className={`nav-item ${
                            location.pathname === "/employees"
                                ? "active"
                                : ""
                        }`}
                        onClick={() => {
                            navigate("/employees");
                            setSidebarOpen(false);
                        }}
                    >
                        <Users size={19} />
                        <span>Employees</span>
                    </button>

                    {/* ATTENDANCE - NEW */}
    <button
        className={`nav-item ${
            location.pathname === "/attendance" ? "active" : ""
        }`}
        onClick={() => {
            navigate("/attendance");
            setSidebarOpen(false);
        }}
    >
        <CalendarDays size={19} />
        <span>Attendance</span>
    </button>

                    <a
                        href="#statistics"
                        className="nav-item"
                        onClick={() => setSidebarOpen(false)}
                    >
                        <ChartColumn size={19} />
                        <span>Statistics</span>
                    </a>

                </nav>

                <div className="sidebar-bottom">

                    <div className="sidebar-user-icon">
                        <UserRound size={20} />
                    </div>

                    <div className="sidebar-user-info">
                        <strong>{user?.full_name || "User"}</strong>
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

            {/* Mobile Sidebar Overlay */}
            {sidebarOpen && (
                <div
                    className="sidebar-overlay"
                    onClick={() => setSidebarOpen(false)}
                ></div>
            )}

            {/* Main Content */}
            <main className="dashboard-main">

                {/* Header */}
                <header className="dashboard-header">

                    <div className="header-left">

                        <button
                            className="mobile-menu-button"
                            onClick={() => setSidebarOpen(true)}
                            aria-label="Open sidebar"
                        >
                            <Menu size={23} />
                        </button>

                        <div>
                            <h1>Dashboard</h1>
                            <p>
                                Welcome to your Employee Management System
                            </p>
                        </div>

                    </div>

                    <div className="header-right">

                        <div className="header-user">

                            <div className="header-avatar">
                                <UserRound size={20} />
                            </div>

                            <div className="header-user-details">
                                <strong>
                                    {user?.full_name || "User"}
                                </strong>
                                <span>Logged in</span>
                            </div>

                        </div>

                        <button
                            className="header-logout"
                            onClick={handleLogout}
                        >
                            <LogOut size={17} />
                            Logout
                        </button>

                    </div>

                </header>

                <div className="dashboard-content" id="overview">

                    {/* Page Heading */}
                    <div className="dashboard-welcome">

                        <div>
                            <h2>Overview</h2>
                            <p>
                                Here is your employee information at a glance.
                            </p>
                        </div>

                        <button
                            className="refresh-button"
                            onClick={fetchDashboardData}
                            disabled={loading}
                        >
                            <RefreshCw size={17} />
                            Refresh
                        </button>

                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="dashboard-error">
                            {error}

                            <button onClick={fetchDashboardData}>
                                Try Again
                            </button>
                        </div>
                    )}

                    {/* Employee Status Overview */}
                    <section className="dashboard-panel status-overview-panel">

                        <div className="panel-heading">

                            <div>
                                <h3>Employee Status Overview</h3>
                                <p>
                                    Distribution of active and inactive employees
                                </p>
                            </div>

                            <Users size={21} />

                        </div>

                        <div className="status-overview-content">

                            {/* Doughnut Chart */}
                            <div className="status-donut-container">

                                {totalEmployees > 0 ? (

                                    <ResponsiveContainer
                                        width="100%"
                                        height="100%"
                                    >

                                        <PieChart>

                                            <Pie
                                                data={employeeStatusData}
                                                dataKey="value"
                                                nameKey="name"
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={65}
                                                outerRadius={95}
                                                paddingAngle={3}
                                                stroke="none"
                                            >

                                                {employeeStatusData.map((entry) => (
                                                    <Cell
                                                        key={entry.name}
                                                        fill={entry.color}
                                                    />
                                                ))}

                                            </Pie>

                                            <Tooltip
                                                formatter={(value, name) => [
                                                    `${value} employees`,
                                                    name
                                                ]}
                                            />

                                        </PieChart>

                                    </ResponsiveContainer>

                                ) : (

                                    <div className="status-no-data">
                                        No employee data
                                    </div>

                                )}

                                <div className="donut-center-text">
                                    <strong>{totalEmployees}</strong>
                                    <span>Total</span>
                                </div>

                            </div>

                            {/* Status Details */}
                            <div className="status-details">

                                {/* Active Employees */}
                                <div className="status-detail-item">

                                    <div className="status-detail-heading">

                                        <div className="status-name">
                                            <span className="status-dot active-dot"></span>
                                            <strong>Active Employees</strong>
                                        </div>

                                        <strong className="status-count active-count">
                                            {activeEmployees}
                                        </strong>

                                    </div>

                                    <div className="status-progress-track">

                                        <div
                                            className="status-progress-fill active-progress"
                                            style={{
                                                width: `${activePercentage}%`
                                            }}
                                        ></div>

                                    </div>

                                    <span className="status-percentage">
                                        {activePercentage.toFixed(1)}% of total employees
                                    </span>

                                </div>

                                {/* Inactive Employees */}
                                <div className="status-detail-item">

                                    <div className="status-detail-heading">

                                        <div className="status-name">
                                            <span className="status-dot inactive-dot"></span>
                                            <strong>Inactive Employees</strong>
                                        </div>

                                        <strong className="status-count inactive-count">
                                            {inactiveEmployees}
                                        </strong>

                                    </div>

                                    <div className="status-progress-track">

                                        <div
                                            className="status-progress-fill inactive-progress"
                                            style={{
                                                width: `${inactivePercentage}%`
                                            }}
                                        ></div>

                                    </div>

                                    <span className="status-percentage">
                                        {inactivePercentage.toFixed(1)}% of total employees
                                    </span>

                                </div>

                            </div>

                        </div>

                    </section>

                    {/* Chart and Recent Employees */}
                    <div className="dashboard-middle-grid">

                        {/* Employee Statistics Chart */}
                        <section
                            className="dashboard-panel chart-panel"
                            id="statistics"
                        >

                            <div className="panel-heading">

                                <div>
                                    <h3>Employee Statistics</h3>
                                    <p>
                                        Employees who joined over the last 6 months
                                    </p>
                                </div>

                                <ChartColumn size={21} />

                            </div>

                            <div className="chart-container">

                                {monthlyStatistics.length > 0 ? (

                                    <ResponsiveContainer
                                        width="100%"
                                        height="100%"
                                    >

                                        <BarChart
                                            data={monthlyStatistics}
                                            margin={{
                                                top: 15,
                                                right: 10,
                                                left: -15,
                                                bottom: 5
                                            }}
                                        >

                                            <CartesianGrid
                                                strokeDasharray="3 3"
                                                vertical={false}
                                            />

                                            <XAxis
                                                dataKey="month"
                                                tick={{ fontSize: 11 }}
                                                axisLine={false}
                                                tickLine={false}
                                            />

                                            <YAxis
                                                allowDecimals={false}
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fontSize: 12 }}
                                            />

                                            <Tooltip />

                                            <Bar
                                                dataKey="employees"
                                                name="Employees"
                                                fill="#3b82f6"
                                                radius={[6, 6, 0, 0]}
                                                barSize={35}
                                            />

                                        </BarChart>

                                    </ResponsiveContainer>

                                ) : (

                                    <p className="empty-message">
                                        No statistics available.
                                    </p>

                                )}

                            </div>

                        </section>

                        {/* Recently Added Employees */}
                        <section
                            className="dashboard-panel recent-panel"
                            id="employees"
                        >

                            <div className="panel-heading">

                                <div>
                                    <h3>Recently Added Employees</h3>
                                    <p>Latest employees added</p>
                                </div>

                                <Users size={21} />

                            </div>

                            <div className="recent-list">

                                {recentEmployees.length > 0 ? (

                                    recentEmployees.map((employee) => (

                                        <div
                                            className="recent-employee"
                                            key={employee.employee_id}
                                        >

                                            <div className="employee-avatar">
                                                {employee.employee_name
                                                    ?.charAt(0)
                                                    .toUpperCase()}
                                            </div>

                                            <div className="employee-details">

                                                <strong>
                                                    {employee.employee_name}
                                                </strong>

                                                <span>
                                                    {employee.email}
                                                </span>

                                                <small>
                                                    {employee.department} · {employee.designation}
                                                </small>

                                                <small>
                                                    Joined: {formatDate(employee.joining_date)}
                                                </small>

                                            </div>

                                            <span
                                                className={`status-badge ${
                                                    employee.status?.toLowerCase() === "active"
                                                        ? "status-active"
                                                        : "status-inactive"
                                                }`}
                                            >
                                                {employee.status}
                                            </span>

                                        </div>

                                    ))

                                ) : (

                                    <p className="empty-message">
                                        No employees found.
                                    </p>

                                )}

                            </div>

                        </section>

                    </div>

                    {/* Employee Details Table */}
                    <section className="dashboard-panel employee-table-panel">

                        <div className="panel-heading">

                            <div>
                                <h3>Employee Overview</h3>
                                <p>Recently added employee details</p>
                            </div>

                        </div>

                        <div className="table-wrapper" id="settings">

                            <table className="employee-table">

                                <thead>
                                    <tr>
                                        <th>Employee ID</th>
                                        <th>Employee Name</th>
                                        <th>Email Address</th>
                                        <th>Department</th>
                                        <th>Designation</th>
                                        <th>Joining Date</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>

                                <tbody>

                                    {recentEmployees.map((employee) => (

                                        <tr key={employee.employee_id}>

                                            <td>
                                                EMP-{employee.employee_id}
                                            </td>

                                            <td>
                                                {employee.employee_name}
                                            </td>

                                            <td>
                                                {employee.email}
                                            </td>

                                            <td>
                                                {employee.department}
                                            </td>

                                            <td>
                                                {employee.designation}
                                            </td>

                                            <td>
                                                {formatDate(employee.joining_date)}
                                            </td>

                                            <td>
                                                <span
                                                    className={`status-badge ${
                                                        employee.status?.toLowerCase() === "active"
                                                            ? "status-active"
                                                            : "status-inactive"
                                                    }`}
                                                >
                                                    {employee.status}
                                                </span>
                                            </td>

                                        </tr>

                                    ))}

                                    {recentEmployees.length === 0 && (

                                        <tr>
                                            <td
                                                colSpan="7"
                                                className="empty-message"
                                            >
                                                No employee records available.
                                            </td>
                                        </tr>

                                    )}

                                </tbody>

                            </table>

                        </div>

                                        </section>

                    {/* Footer */}
                    <footer className="dashboard-footer">
                        Employee Management System © {new Date().getFullYear()}
                    </footer>

                </div>

            </main>

            {/* LOGOUT CONFIRMATION DIALOG */}
            {showLogoutDialog && (
                <div className="logout-dialog-overlay">
                    <div className="logout-dialog">

                        <div className="logout-dialog-icon">
                            <LogOut size={24} />
                        </div>

                        <h3>Confirm Logout</h3>

                        <p>
                            Are you sure you want to log out?
                        </p>

                        <div className="logout-dialog-actions">
                            <button
                                className="logout-cancel-btn"
                                onClick={() => setShowLogoutDialog(false)}
                            >
                                Cancel
                            </button>

                            <button
                                className="logout-confirm-btn"
                                onClick={confirmLogout}
                            >
                                Yes, Logout
                            </button>
                        </div>

                    </div>
                </div>
            )}

        </div>
    );
}

export default Dashboard;