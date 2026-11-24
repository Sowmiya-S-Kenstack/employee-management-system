
import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import {
    Search,
    Plus,
    Pencil,
    Trash2,
    UserX,
    X,
    Users,
    ChevronLeft,
    ChevronRight,
    RefreshCw,
    LayoutDashboard,
    ChartColumn,
    LogOut,
    Menu,
    UserRound,
    CalendarDays
} from "lucide-react";

import "./Employees.css";

import { useNavigate, useLocation } from "react-router-dom";

import "../Dashboard.css";

import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";

import { format, parseISO, isValid } from "date-fns";

const API_URL = "http://localhost:8000/api/employees";

const initialForm = {
    employee_name: "",
    email: "",
    mobile: "",
    department: "Development",
    designation: "",
    joining_date: "",
    status: "Active"
};

function Employees() {
    const navigate = useNavigate();
    const location = useLocation();
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);
    const [selectedDeactivateId, setSelectedDeactivateId] = useState(null);
    const [deactivating, setDeactivating] = useState(false);

    const [sidebarOpen, setSidebarOpen] = useState(false);

    const loggedInUser = JSON.parse(
        sessionStorage.getItem("user") || "{}"
    );

    // Logout
    const handleLogout = () => {
        sessionStorage.removeItem("access_token");
        sessionStorage.removeItem("user");

        toast.success("Logged out successfully!");

        navigate("/login");
    };

    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(false);

    const [search, setSearch] = useState("");
    const [department, setDepartment] = useState("");
    const [employeeStatus, setEmployeeStatus] = useState("");

    const [page, setPage] = useState(1);
    const [limit] = useState(5);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(0);

    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState(initialForm);
    const [saving, setSaving] = useState(false);

    const token = sessionStorage.getItem("access_token");

    const headers = {
        Authorization: `Bearer ${token}`
    };

    // FETCH EMPLOYEES
    const fetchEmployees = async () => {
        if (!token) {
            toast.error("Please login again.");
            return;
        }

        setLoading(true);

        try {
            const response = await axios.get(API_URL, {
                headers,
                params: {
                    search,
                    department: department || undefined,
                    status: employeeStatus || undefined,
                    page,
                    limit
                }
            });

            setEmployees(response.data.items);
            setTotal(response.data.total);
            setTotalPages(response.data.total_pages);

        } catch (error) {
            toast.error(
                error.response?.data?.detail ||
                "Unable to load employees"
            );

        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchEmployees();
        }, 300);

        return () => clearTimeout(timer);
    }, [search, department, employeeStatus, page]);

    // OPEN ADD FORM
    const openAddModal = () => {
        setEditingId(null);
        setFormData(initialForm);
        setShowModal(true);
    };

    // OPEN EDIT FORM
    const openEditModal = (employee) => {
        setEditingId(employee.employee_id);

        setFormData({
            employee_name: employee.employee_name,
            email: employee.email,
            mobile: employee.mobile,
            department: employee.department,
            designation: employee.designation,
            joining_date: employee.joining_date,
            status: employee.status
        });

        setShowModal(true);
    };

    // HANDLE INPUT
    const handleChange = (event) => {
        const { name, value } = event.target;

        setFormData((previous) => ({
            ...previous,
            [name]: value
        }));
    };

    // VALIDATION
    const validateForm = () => {
        if (formData.employee_name.trim().length < 3) {
            toast.error("Employee name must contain at least 3 characters");
            return false;
        }

        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailPattern.test(formData.email.trim())) {
            toast.error("Enter a valid email address");
            return false;
        }

        if (!/^\d{10}$/.test(formData.mobile.trim())) {
            toast.error("Mobile number must contain exactly 10 digits");
            return false;
        }

        if (!formData.designation.trim()) {
            toast.error("Designation is required");
            return false;
        }

        if (!formData.joining_date) {
            toast.error("Joining date is required");
            return false;
        }

        return true;
    };

    
// CREATE OR UPDATE EMPLOYEE
const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validateForm()) return;

    setSaving(true);

    try {
        const payload = {
            ...formData,
            employee_name: formData.employee_name.trim(),
            email: formData.email.trim().toLowerCase(),
            mobile: formData.mobile.trim(),
            designation: formData.designation.trim()
        };

        if (editingId) {
            await axios.put(
                `${API_URL}/${editingId}`,
                payload,
                { headers }
            );

            toast.success("Employee updated successfully!");

            setShowModal(false);
            setFormData(initialForm);
            setEditingId(null);

            // Automatically refresh after updating
            await fetchEmployees();

        } else {
            await axios.post(
                `${API_URL}/`,
                payload,
                { headers }
            );

            toast.success("Employee added successfully!");

            setShowModal(false);
            setFormData(initialForm);
            setEditingId(null);

            // Return to first page after adding
            if (page !== 1) {
                setPage(1);
            } else {
                // Refresh immediately if already on Page 1
                await fetchEmployees();
            }
        }

    } catch (error) {
        toast.error(
            error.response?.data?.detail ||
            "Unable to save employee"
        );

    } finally {
        setSaving(false);
    }
};

// OPEN DEACTIVATE CONFIRMATION DIALOG
const confirmDeactivate = (employeeId) => {
    setSelectedDeactivateId(employeeId);
    setShowDeactivateDialog(true);
};

// DEACTIVATE EMPLOYEE
const handleDeactivate = async () => {
    if (!selectedDeactivateId) return;

    setDeactivating(true);

    try {
        await axios.patch(
            `${API_URL}/${selectedDeactivateId}/deactivate`,
            {},
            { headers }
        );

        toast.success("Employee deactivated successfully!");

        setShowDeactivateDialog(false);
        setSelectedDeactivateId(null);

        await fetchEmployees();

    } catch (error) {
        toast.error(
            error.response?.data?.detail ||
            "Unable to deactivate employee"
        );

    } finally {
        setDeactivating(false);
    }
};

// CLOSE DEACTIVATE DIALOG
const closeDeactivateDialog = () => {
    if (deactivating) return;

    setShowDeactivateDialog(false);
    setSelectedDeactivateId(null);
};


// OPEN DELETE CONFIRMATION DIALOG
const confirmDelete = (employeeId) => {
    setSelectedEmployeeId(employeeId);
    setShowDeleteDialog(true);
};

// PERMANENT DELETE EMPLOYEE
const handleDelete = async () => {
    if (!selectedEmployeeId) return;

    setDeleting(true);

    try {
        await axios.delete(
            `${API_URL}/${selectedEmployeeId}`,
            { headers }
        );

        toast.success("Employee deleted successfully!");

        setShowDeleteDialog(false);
        setSelectedEmployeeId(null);

        // Refresh employee records
        if (employees.length === 1 && page > 1) {
            setPage((previous) => previous - 1);
        } else {
            await fetchEmployees();
        }

    } catch (error) {
        toast.error(
            error.response?.data?.detail ||
            "Unable to delete employee"
        );

    } finally {
        setDeleting(false);
    }
};

// CLOSE DELETE DIALOG
const closeDeleteDialog = () => {
    if (deleting) return;

    setShowDeleteDialog(false);
    setSelectedEmployeeId(null);
};

    // RESET FILTERS
    const resetFilters = () => {
        setSearch("");
        setDepartment("");
        setEmployeeStatus("");
        setPage(1);
    };

    return (
    <div className="dashboard-layout">

        {/* SAME SIDEBAR AS DASHBOARD */}
        <aside className={`dashboard-sidebar ${
            sidebarOpen ? "sidebar-open" : ""
        }`}>

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
                >
                    <X size={20} />
                </button>

            </div>

            <div className="sidebar-section-title">
                MAIN MENU
            </div>

            <nav className="sidebar-nav">

                <button
                    className="nav-item"
                    onClick={() => navigate("/dashboard#overview")}
                >
                    <LayoutDashboard size={19} />
                    <span>Dashboard</span>
                </button>

                <button
                    className={`nav-item ${
                        location.pathname === "/employees" ? "active" : ""
                    }`}
                    onClick={() => setSidebarOpen(false)}
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

                <button
                    className="nav-item"
                    onClick={() => navigate("/dashboard#statistics")}
                >
                    <ChartColumn size={19} />
                    <span>Statistics</span>
                </button>
            </nav>

            <div className="sidebar-bottom">

                <div className="sidebar-user-icon">
                    <UserRound size={20} />
                </div>

                <div className="sidebar-user-info">
                    <strong>
                        {loggedInUser.full_name || "User"}
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

        {/* MOBILE OVERLAY */}
        {sidebarOpen && (
            <div
                className="sidebar-overlay"
                onClick={() => setSidebarOpen(false)}
            ></div>
        )}

        {/* EMPLOYEE PAGE CONTENT */}
        <main className="dashboard-main">


            <div className="dashboard-content">

                {/* MOBILE MENU BUTTON */}
                <button
                    className="mobile-menu-button"
                    onClick={() => setSidebarOpen(true)}
                >
                    <Menu size={23} />
                </button>

            {/* PAGE HEADER */}
            <div className="employees-header">
                <div>
                    <h1>Employee Management</h1>
                    <p>Manage employee information and records</p>
                </div>

                <button
                    className="add-employee-btn"
                    onClick={openAddModal}
                >
                    <Plus size={18} />
                    Add Employee
                </button>
            </div>

            {/* SUMMARY */}
            <div className="employee-summary">
                <div className="employee-summary-card">
                    <div className="summary-icon">
                        <Users size={23} />
                    </div>

                    <div>
                        <p>Total Employees</p>
                        <h2>{total}</h2>
                    </div>
                </div>
            </div>

            {/* SEARCH AND FILTERS */}
            <div className="employee-toolbar">

                <div className="employee-search">
                    <Search size={19} />

                    <input
                        type="text"
                        placeholder="Search name or email..."
                        value={search}
                        onChange={(event) => {
                            setSearch(event.target.value);
                            setPage(1);
                        }}
                    />
                </div>

                <select
                    value={department}
                    onChange={(event) => {
                        setDepartment(event.target.value);
                        setPage(1);
                    }}
                >
                    <option value="">All Departments</option>
                    <option value="Development">Development</option>
                    <option value="AI">AI</option>
                    <option value="HR">HR</option>
                </select>

                <select
                    value={employeeStatus}
                    onChange={(event) => {
                        setEmployeeStatus(event.target.value);
                        setPage(1);
                    }}
                >
                    <option value="">All Status</option>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                </select>

                <button
                    className="reset-filter-btn"
                    onClick={resetFilters}
                    title="Reset filters"
                >
                    <RefreshCw size={17} />
                </button>
            </div>

            {/* EMPLOYEE TABLE */}
            <div className="employee-table-container">

                <div className="employee-table-heading">
                    <h2>Employee Records</h2>
                    <span>{total} records found</span>
                </div>

                <div className="employee-table-scroll">
                    <table className="employee-table">

                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Employee</th>
                                <th>Email</th>
                                <th>Mobile</th>
                                <th>Department</th>
                                <th>Designation</th>
                                <th>Joining Date</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>

                        <tbody>

                            {loading ? (
                                <tr>
                                    <td colSpan="9" className="table-message">
                                        Loading employees...
                                    </td>
                                </tr>
                            ) : employees.length === 0 ? (
                                <tr>
                                    <td colSpan="9" className="table-message">
                                        No employee records found.
                                    </td>
                                </tr>
                            ) : (
                                employees.map((employee) => (
                                    <tr key={employee.employee_id}>

                                        <td>#{employee.employee_id}</td>

                                        <td className="employee-name-cell">
                                            {employee.employee_name}
                                        </td>

                                        <td>{employee.email}</td>

                                        <td>{employee.mobile}</td>

                                        <td>{employee.department}</td>

                                        <td>{employee.designation}</td>

                                        <td>{employee.joining_date}</td>

                                        <td>
                                            <span className={
                                                employee.status === "Active"
                                                    ? "employee-status active"
                                                    : "employee-status inactive"
                                            }>
                                                {employee.status}
                                            </span>
                                        </td>

                                        <td>
                                            <div className="employee-actions">

                                                <button
                                                    className="edit-action"
                                                    title="Edit employee"
                                                    onClick={() => openEditModal(employee)}
                                                >
                                                    <Pencil size={17} />
                                                </button>

                                                {employee.status === "Active" && (
                                                    <button
                                                        className="deactivate-action"
                                                        title="Deactivate employee"
                                                        onClick={() =>
                                                            confirmDeactivate(employee.employee_id)
                                                        }
                                                    >
                                                        <UserX size={17} />
                                                    </button>
                                                )}

                                                <button
                                                    className="delete-action"
                                                    title="Delete employee"
                                                    onClick={() =>
                                                        confirmDelete(employee.employee_id)
                                                    }
                                                >
                                                    <Trash2 size={17} />
                                                </button>

                                                

                                            </div>
                                        </td>

                                    </tr>
                                ))
                            )}

                        </tbody>
                    </table>
                </div>

                {/* PAGINATION */}
                <div className="employee-pagination">

                    <span>
                        Showing {employees.length} of {total} employees
                    </span>

                    <div className="pagination-controls">

                        <button
                            disabled={page <= 1}
                            onClick={() => setPage((previous) => previous - 1)}
                        >
                            <ChevronLeft size={18} />
                            Previous
                        </button>

                        <span>
                            Page {page} of {totalPages || 1}
                        </span>

                        <button
                            disabled={page >= totalPages}
                            onClick={() => setPage((previous) => previous + 1)}
                        >
                            Next
                            <ChevronRight size={18} />
                        </button>

                    </div>
                </div>

            </div>

{/* DEACTIVATE CONFIRMATION DIALOG */}
{showDeactivateDialog && (
    <div className="delete-dialog-overlay">

        <div className="delete-dialog">

            <div className="deactivate-dialog-icon">
                <UserX size={30} />
            </div>

            <h2>Deactivate Employee?</h2>

            <p>
                Are you sure you want to deactivate this employee?
                The employee record will remain in the system,
                but the status will change to Inactive.
            </p>

            <div className="delete-dialog-actions">

                <button
                    type="button"
                    className="delete-cancel-btn"
                    onClick={closeDeactivateDialog}
                    disabled={deactivating}
                >
                    Cancel
                </button>

                <button
                    type="button"
                    className="deactivate-confirm-btn"
                    onClick={handleDeactivate}
                    disabled={deactivating}
                >
                    {deactivating ? "Deactivating..." : "Deactivate"}
                </button>

            </div>

        </div>

    </div>
)}

{/* DELETE CONFIRMATION DIALOG */}
{showDeleteDialog && (
    <div className="delete-dialog-overlay">

        <div className="delete-dialog">

            <div className="delete-dialog-icon">
                <Trash2 size={30} />
            </div>

            <h2>Delete Employee?</h2>

            <p>
                Are you sure you want to permanently delete
                this employee record? This action cannot be undone.
            </p>

            <div className="delete-dialog-actions">

                <button
                    type="button"
                    className="delete-cancel-btn"
                    onClick={closeDeleteDialog}
                    disabled={deleting}
                >
                    Cancel
                </button>

                <button
                    type="button"
                    className="delete-confirm-btn"
                    onClick={handleDelete}
                    disabled={deleting}
                >
                    {deleting ? "Deleting..." : "Delete Employee"}
                </button>

            </div>

        </div>

    </div>
)}

            {/* ADD / EDIT MODAL */}
            {showModal && (
                <div className="employee-modal-overlay">

                    <div className="employee-modal">

                        <div className="employee-modal-header">
                            <div>
                                <h2>
                                    {editingId ? "Edit Employee" : "Add New Employee"}
                                </h2>

                                <p>
                                    Enter the employee information below
                                </p>
                            </div>

                            <button
                                type="button"
                                className="modal-close-btn"
                                onClick={() => setShowModal(false)}
                            >
                                <X size={22} />
                            </button>
                        </div>

                        <form
                            onSubmit={handleSubmit}
                            className="employee-form"
                        >

                            <div className="employee-form-grid">

                                <div className="employee-form-group">
                                    <label>Employee Name *</label>

                                    <input
                                        type="text"
                                        name="employee_name"
                                        placeholder="Enter employee name"
                                        value={formData.employee_name}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>

                                <div className="employee-form-group">
                                    <label>Email Address *</label>

                                    <input
                                        type="email"
                                        name="email"
                                        placeholder="Enter email address"
                                        value={formData.email}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>

                                <div className="employee-form-group">
                                    <label>Mobile Number *</label>

                                    <input
                                        type="tel"
                                        name="mobile"
                                        placeholder="Enter 10-digit mobile number"
                                        value={formData.mobile}
                                        onChange={(event) => {
                                            const value = event.target.value.replace(/\D/g, "");

                                            if (value.length <= 10) {
                                                setFormData((previous) => ({
                                                    ...previous,
                                                    mobile: value
                                                }));
                                            }
                                        }}
                                        maxLength={10}
                                        inputMode="numeric"
                                        required
                                    />
                                </div>

                                <div className="employee-form-group">
                                    <label>Department *</label>

                                    <select
                                        name="department"
                                        value={formData.department}
                                        onChange={handleChange}
                                    >
                                        <option value="Development">
                                            Development
                                        </option>

                                        <option value="AI">
                                            AI
                                        </option>

                                        <option value="HR">
                                            HR
                                        </option>
                                    </select>
                                </div>

                                <div className="employee-form-group">
                                    <label>Designation *</label>

                                    <input
                                        type="text"
                                        name="designation"
                                        placeholder="Example: Python Developer"
                                        value={formData.designation}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>

                                
                                <div className="employee-form-group">
                                    <label>Joining Date *</label>

                                    <LocalizationProvider dateAdapter={AdapterDateFns}>
  <DatePicker
    value={
      formData.joining_date
        ? parseISO(formData.joining_date)
        : null
    }
    onChange={(newValue) =>
      setFormData((prev) => ({
        ...prev,
        joining_date:
          newValue && isValid(newValue)
            ? format(newValue, "yyyy-MM-dd")
            : "",
      }))
    }
    format="dd/MM/yyyy"
    views={["year", "month", "day"]}
    openTo="day"
    slotProps={{
      actionBar: {
        actions: ["today"],
      },
      textField: {
        fullWidth: true,
        size: "small",
        placeholder: "DD/MM/YYYY",
        required: true,
      },
      popper: {
        placement: "top-start",
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
</LocalizationProvider>
                                </div>

                                <div className="employee-form-group">
                                    <label>Employee Status *</label>

                                    <select
                                        name="status"
                                        value={formData.status}
                                        onChange={handleChange}
                                    >
                                        <option value="Active">Active</option>
                                        <option value="Inactive">Inactive</option>
                                    </select>
                                </div>

                            </div>

                            <div className="employee-form-actions">

                                <button
                                    type="button"
                                    className="cancel-employee-btn"
                                    onClick={() => setShowModal(false)}
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    className="save-employee-btn"
                                    disabled={saving}
                                >
                                    {saving
                                        ? "Saving..."
                                        : editingId
                                            ? "Update Employee"
                                            : "Save Employee"}
                                </button>

                            </div>

                        </form>
                    </div>
                </div>
            )}

        </div>

    </main>

</div>
);

}

export default Employees;