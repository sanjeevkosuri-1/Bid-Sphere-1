
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import "./Login.css";

function Login() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    identifier: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    const identifier = formData.identifier.trim();

    if (!identifier || !formData.password) {
      setError("Please enter your email and password.");
      return;
    }

    if (!identifier.includes("@")) {
      setError("Please sign in using your registered email address.");
      return;
    }

    try {
      setLoading(true);

      const response = await axios.post(
        "http://localhost:5001/api/auth/login",
        {
          email: identifier.toLowerCase(),
          password: formData.password,
        }
      );

      const { token, user } = response.data;

      if (!token || !user) {
        setError("Login response is incomplete. Please try again.");
        return;
      }

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));

      setMessage("Login successful! Redirecting...");
      navigate("/dashboard");
    } catch (error) {
      setError(
        error.response?.data?.message ||
          "Login failed. Please check your connection and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <h1>Welcome Back!</h1>
        <p>Sign in to continue to Requirement Bidding Platform.</p>

        <form onSubmit={handleSubmit}>
          <label htmlFor="identifier">Email Address</label>
          <input
            id="identifier"
            name="identifier"
            type="email"
            value={formData.identifier}
            onChange={handleChange}
            placeholder="Enter your registered email"
            autoComplete="username"
            required
          />

          <label htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="Enter your password"
            autoComplete="current-password"
            required
          />

          <div className="forgot-password-link">
            <Link to="/forgot-password">
              Forgot Password?
            </Link>
          </div>

          {error && <p className="login-error">{error}</p>}
          {message && <p className="login-success">{message}</p>}

          <button type="submit" disabled={loading}>
            {loading ? "Signing In..." : "Sign In"}
          </button>
        </form>

        <p className="login-footer">
          Don't have an account?{" "}
          <Link to="/register">Create Account</Link>
        </p>

        <Link className="login-home" to="/">
          Back to Home
        </Link>
      </div>
    </div>
  );
}

export default Login;
