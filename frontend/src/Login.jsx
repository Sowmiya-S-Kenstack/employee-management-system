import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import "./Login.css";

const API_URL = "http://localhost:8000/api/auth";

function Login() {
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        email: "",
        password: ""
    });

    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // Handle input changes
    const handleChange = (e) => {
        const { name, value } = e.target;

        setFormData((previous) => ({
            ...previous,
            [name]: value
        }));

        setErrors((previous) => ({
            ...previous,
            [name]: ""
        }));
    };

    // Validate login form
    const validateForm = () => {
        const newErrors = {};

        if (!formData.email.trim()) {
            newErrors.email = "Email address is required";
        } else if (
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())
        ) {
            newErrors.email = "Please enter a valid email address";
        }

        if (!formData.password) {
            newErrors.password = "Password is required";
        }

        setErrors(newErrors);

        return Object.keys(newErrors).length === 0;
    };

    // Handle login
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) return;

        setLoading(true);

        try {
            const response = await axios.post(
                `${API_URL}/login`,
                {
                    email: formData.email.trim().toLowerCase(),
                    password: formData.password
                }
            );

            const { access_token, user } = response.data;

            // Store authentication details
            sessionStorage.setItem("access_token", access_token);
            sessionStorage.setItem("user", JSON.stringify(user));

            toast.success("Welcome back! Login successful.");

            navigate("/dashboard", { replace: true });

        } catch (error) {
            if (error.response?.status === 401) {
                toast.error("Invalid email or password");
            } else if (error.response?.status === 422) {
                toast.error("Please enter valid login details");
            } else {
                toast.error(
                    "Unable to connect to the server. Please try again."
                );
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page-container login-page">

            <div className="registration-card login-card">

                {/* Header */}
                <div className="form-header login-header">

                    <div className="login-logo">
                        <span className="logo-icon">EMS</span>
                    </div>

                    <h2>Welcome Back!</h2>

                    <p>
                        Employee Management System
                    </p>

                    <span className="login-description">
                        Sign in to access your account
                    </span>

                </div>

                {/* Login Form */}
                <form onSubmit={handleSubmit} noValidate>

                    {/* Email */}
                    <div className="form-group">

                        <label htmlFor="email">
                            Email Address
                        </label>

                        <input
                            id="email"
                            type="email"
                            name="email"
                            placeholder="Enter your email address"
                            value={formData.email}
                            onChange={handleChange}
                            autoComplete="username"
                            className={errors.email ? "input-error" : ""}
                        />

                        {errors.email && (
                            <span className="error">
                                {errors.email}
                            </span>
                        )}

                    </div>

                    {/* Password */}
                    <div className="form-group">

                        <label htmlFor="password">
                            Password
                        </label>

                        <div className="password-wrapper">

                            <input
                                id="password"
                                type={showPassword ? "text" : "password"}
                                name="password"
                                placeholder="Enter your password"
                                value={formData.password}
                                onChange={handleChange}
                                autoComplete="current-password"
                                className={
                                    errors.password ? "input-error" : ""
                                }
                            />

                            <button
                                type="button"
                                className="password-toggle"
                                onClick={() =>
                                    setShowPassword((previous) => !previous)
                                }
                            >
                                {showPassword ? "Hide" : "Show"}
                            </button>

                        </div>

                        {errors.password && (
                            <span className="error">
                                {errors.password}
                            </span>
                        )}

                    </div>

                    {/* Login Button */}
                    <button
                        type="submit"
                        className="register-btn login-btn"
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <span className="login-spinner"></span>
                                Signing In...
                            </>
                        ) : (
                            "Login to Account"
                        )}
                    </button>

                </form>

                {/* Footer */}
                <div className="form-footer login-footer">

                    <p>
                        Don't have an account?
                    </p>

                    <Link to="/register">
                        Create New Account
                    </Link>

                </div>

                {/* Bottom Note */}
                <div className="login-bottom">
                    <span>Secure Employee Management Portal</span>
                </div>

            </div>

        </div>
    );
}

export default Login;
