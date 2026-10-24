
import React, { useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import "./ForgotPassword.css";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [step, setStep] = useState(1);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const API = "http://localhost:5001/api/auth";

  // Step 1: Send OTP
  const handleSendOtp = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    try {
      setLoading(true);

      const response = await axios.post(
        `${API}/forgot-password`,
        {
          email: email.trim().toLowerCase(),
        }
      );

      setMessage(
        response.data.message ||
          "If the account exists, an OTP will be sent."
      );

      setStep(2);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to send OTP. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!/^\d{6}$/.test(otp)) {
      setError("Please enter the 6-digit OTP.");
      return;
    }

    try {
      setLoading(true);

      const response = await axios.post(
        `${API}/verify-reset-otp`,
        {
          email: email.trim().toLowerCase(),
          otp,
        }
      );

      setMessage(
        response.data.message || "OTP verified successfully."
      );

      setStep(3);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Invalid or expired OTP. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Reset password
  const handleResetPassword = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (newPassword.length < 6) {
      setError("Password must contain at least 6 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);

      const response = await axios.post(
        `${API}/reset-password`,
        {
          email: email.trim().toLowerCase(),
          otp,
          newPassword,
        }
      );

      setMessage(
        response.data.message ||
          "Password reset successfully. You can now log in."
      );

      setStep(4);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to reset password. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="forgot-page">
      <div className="forgot-card">
        <h1>Forgot Password?</h1>

        {step === 1 && (
          <>
            <p>
              Enter your registered email address to receive an OTP.
            </p>

            <form onSubmit={handleSendOtp}>
              <label htmlFor="email">Email Address</label>

              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Enter your registered email"
                autoComplete="email"
                required
              />

              <button type="submit" disabled={loading}>
                {loading ? "Sending OTP..." : "Send OTP"}
              </button>
            </form>
          </>
        )}

        {step === 2 && (
          <>
            <p>
              Enter the 6-digit OTP sent to your email address.
            </p>

            <form onSubmit={handleVerifyOtp}>
              <label htmlFor="otp">Email OTP</label>

              <input
                id="otp"
                type="text"
                inputMode="numeric"
                value={otp}
                onChange={(event) =>
                  setOtp(
                    event.target.value
                      .replace(/\D/g, "")
                      .slice(0, 6)
                  )
                }
                placeholder="Enter 6-digit OTP"
                autoComplete="one-time-code"
                maxLength={6}
                required
              />

              <button type="submit" disabled={loading}>
                {loading ? "Verifying..." : "Verify OTP"}
              </button>
            </form>

            <button
              type="button"
              className="secondary-button"
              disabled={loading}
              onClick={handleSendOtp}
            >
              {loading ? "Please wait..." : "Resend OTP"}
            </button>
          </>
        )}

        {step === 3 && (
          <>
            <p>
              Create a new password for your BidSphere account.
            </p>

            <form onSubmit={handleResetPassword}>
              <label htmlFor="newPassword">New Password</label>

              <input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(event) =>
                  setNewPassword(event.target.value)
                }
                placeholder="Enter new password"
                autoComplete="new-password"
                minLength={6}
                required
              />

              <label htmlFor="confirmPassword">
                Confirm Password
              </label>

              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(event) =>
                  setConfirmPassword(event.target.value)
                }
                placeholder="Confirm new password"
                autoComplete="new-password"
                minLength={6}
                required
              />

              <button type="submit" disabled={loading}>
                {loading ? "Updating Password..." : "Reset Password"}
              </button>
            </form>
          </>
        )}

        {step === 4 && (
          <>
            <p className="forgot-success">
              Your password has been reset successfully.
            </p>

            <Link className="forgot-button" to="/login">
              Go to Login
            </Link>
          </>
        )}

        {error && (
          <p className="forgot-error" role="alert">
            {error}
          </p>
        )}

        {message && step !== 4 && (
          <p className="forgot-success" role="status">
            {message}
          </p>
        )}

        {step !== 4 && (
          <Link className="back-login" to="/login">
            Back to Login
          </Link>
        )}
      </div>
    </div>
  );
}

export default ForgotPassword;
