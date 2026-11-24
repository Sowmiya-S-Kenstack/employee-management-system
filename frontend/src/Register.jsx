
import React, { useState } from "react";
import axios from "axios";
import "react-toastify/dist/ReactToastify.css";
import "./App.css";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

const API_URL = "http://localhost:8000/api/auth/register";

function Register() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    mobile_number: "",
    password: "",
    confirm_password: ""
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));

    setErrors((prev) => ({
      ...prev,
      [name]: ""
    }));
  };

  // Validate all form fields
  const validateForm = () => {
    const newErrors = {};

    // Full name validation
    const name = formData.full_name.trim();

    if (!name) {
      newErrors.full_name = "Full name is required";
    } else if (name.length < 3) {
      newErrors.full_name = "Minimum 3 characters required";
    } else if (!/^[\p{L}\p{M}\s.'-]+$/u.test(name)) {
      newErrors.full_name = "Enter a valid full name";
    }

    // Email validation
    const email = formData.email.trim();

    if (!email) {
      newErrors.email = "Email address is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Enter a valid email address";
    }

    // Mobile number validation
    if (!formData.mobile_number) {
      newErrors.mobile_number = "Mobile number is required";
    } else if (!/^[6-9]\d{9}$/.test(formData.mobile_number)) {
      newErrors.mobile_number = "Enter a valid 10-digit mobile number";
    }

    // Password validation
    const password = formData.password;

    if (!password) {
      newErrors.password = "Password is required";
    } else if (password.length < 8) {
      newErrors.password = "Minimum 8 characters required";
    } else if (!/[A-Z]/.test(password)) {
      newErrors.password = "Include one uppercase letter";
    } else if (!/[a-z]/.test(password)) {
      newErrors.password = "Include one lowercase letter";
    } else if (!/[0-9]/.test(password)) {
      newErrors.password = "Include one number";
    } else if (!/[^A-Za-z0-9]/.test(password)) {
      newErrors.password = "Include one special character";
    }

    // Confirm password validation
    if (!formData.confirm_password) {
      newErrors.confirm_password = "Confirm password is required";
    } else if (formData.password !== formData.confirm_password) {
      newErrors.confirm_password = "Passwords do not match";
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
        toast.error("Please correct the errors in the form");
        return;
    }

    setLoading(true);

    try {
        await axios.post(API_URL, {
            full_name: formData.full_name.trim(),
            email: formData.email.trim().toLowerCase(),
            mobile_number: formData.mobile_number,
            password: formData.password,
            confirm_password: formData.confirm_password
        });

        // Clear form after successful registration
        setFormData({
            full_name: "",
            email: "",
            mobile_number: "",
            password: "",
            confirm_password: ""
        });

        setErrors({});
        setShowPassword(false);
        setShowConfirmPassword(false);

        // Show success message before navigating
        toast.success("Account created successfully! You can log in now.", {
            autoClose: 3000,
            onClose: () => {
                navigate("/login", { replace: true });
            }
        });

    } catch (error) {
        const status = error.response?.status;
        const detail = error.response?.data?.detail;

        if (status === 409) {
            setErrors((prev) => ({
                ...prev,
                email: "This email address is already registered"
            }));

            toast.error("Email address already exists!");

        } else if (status === 422) {
            toast.error("Please check your registration information");

        } else {
            toast.error(
                detail || "Server connection failed. Please try again."
            );
        }

    } finally {
        setLoading(false);
    }
};

  return (
    <div className="page-container">

      <div className="registration-card">

        <div className="form-header">

          <div className="logo">EMS</div>

          <h1>Create Account</h1>

          <p>
            Employee Management System
          </p>

        </div>

        <form onSubmit={handleSubmit} noValidate>

          {/* Full Name */}
          <div className="form-group">

            <label>Full Name *</label>

            <input
              type="text"
              name="full_name"
              placeholder="Enter your full name"
              value={formData.full_name}
              onChange={handleChange}
              className={errors.full_name ? "input-error" : ""}
            />

            {errors.full_name && (
              <small className="error-text">
                {errors.full_name}
              </small>
            )}

          </div>

          {/* Email */}
          <div className="form-group">

            <label>Email Address *</label>

            <input
              type="email"
              name="email"
              placeholder="example@gmail.com"
              value={formData.email}
              onChange={handleChange}
              className={errors.email ? "input-error" : ""}
            />

            {errors.email && (
              <small className="error-text">
                {errors.email}
              </small>
            )}

          </div>

          {/* Mobile Number */}
          <div className="form-group">

            <label>Mobile Number *</label>

            <input
              type="tel"
              name="mobile_number"
              placeholder="Enter 10-digit mobile number"
              maxLength="10"
              value={formData.mobile_number}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "");

                setFormData((prev) => ({
                  ...prev,
                  mobile_number: value
                }));

                setErrors((prev) => ({
                  ...prev,
                  mobile_number: ""
                }));
              }}
              className={errors.mobile_number ? "input-error" : ""}
            />

            {errors.mobile_number && (
              <small className="error-text">
                {errors.mobile_number}
              </small>
            )}

          </div>

          {/* Password */}
          <div className="form-group">

            <label>Password *</label>

            <div className="password-wrapper">

              <input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Create a strong password"
                value={formData.password}
                onChange={handleChange}
                className={errors.password ? "input-error" : ""}
              />

              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? "Hide" : "Show"}
              </button>

            </div>

            {errors.password && (
              <small className="error-text">
                {errors.password}
              </small>
            )}

            <small className="hint-text">
              Minimum 8 characters with uppercase, lowercase,
              number and special character.
            </small>

          </div>

          {/* Confirm Password */}
          <div className="form-group">

            <label>Confirm Password *</label>

            <div className="password-wrapper">

              <input
                type={showConfirmPassword ? "text" : "password"}
                name="confirm_password"
                placeholder="Re-enter your password"
                value={formData.confirm_password}
                onChange={handleChange}
                className={
                  errors.confirm_password ? "input-error" : ""
                }
              />

              <button
                type="button"
                className="toggle-password"
                onClick={() =>
                  setShowConfirmPassword(!showConfirmPassword)
                }
              >
                {showConfirmPassword ? "Hide" : "Show"}
              </button>

            </div>

            {errors.confirm_password && (
              <small className="error-text">
                {errors.confirm_password}
              </small>
            )}

          </div>

          {/* Submit */}
          <button
            type="submit"
            className="register-btn"
            disabled={loading}
          >
            {loading ? "Registering..." : "Create Account"}
          </button>


<p className="auth-footer">
    Already registered?{" "}
    <Link to="/login">Login here</Link>
</p>


        </form>

        <div className="form-footer">
          Employee Management System
        </div>

      </div>

    </div>
  );
}

export default Register;
