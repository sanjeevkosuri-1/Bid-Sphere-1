
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import "./Register.css";

const API_URL = "http://localhost:5001/api/auth";

function Register() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone_number: "",
    password: "",
    confirmPassword: "",
  });

  const [otp, setOtp] = useState("");
  const [verificationStep, setVerificationStep] = useState("register");
  const [phoneTestOtp, setPhoneTestOtp] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const normalizedEmail = formData.email.trim().toLowerCase();

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // STEP 1: REGISTER
  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setPhoneTestOtp("");

    if (formData.full_name.trim().length < 3) {
      setError("Full name must contain at least 3 characters.");
      return;
    }

    if (!/^\+[1-9]\d{1,14}$/.test(formData.phone_number.trim())) {
      setError(
        "Enter your phone number with country code, e.g. +919876543210."
      );
      return;
    }

    if (
      !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(
        formData.password
      )
    ) {
      setError(
        "Password must have at least 8 characters, uppercase, lowercase, a number, and a special character."
      );
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);

      const response = await axios.post(`${API_URL}/register`, {
        fullName: formData.full_name.trim(),
        email: normalizedEmail,
        phone: formData.phone_number.trim(),
        password: formData.password,
      });

      setVerificationStep("email");
      setOtp("");
      setMessage(
        response.data.message || "OTP sent. Check your email."
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Registration failed. Please check whether the backend is running."
      );
    } finally {
      setLoading(false);
    }
  };

  // STEP 2: VERIFY EMAIL, THEN REQUEST PHONE TEST OTP
  const handleVerifyEmail = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setPhoneTestOtp("");

    if (!/^\d{6}$/.test(otp)) {
      setError("Enter the 6-digit OTP sent to your email.");
      return;
    }

    try {
      setLoading(true);

      const response = await axios.post(`${API_URL}/verify-email`, {
        email: normalizedEmail,
        otp,
      });

      // Email verification has succeeded.
      setVerificationStep("phone");
      setOtp("");
      setMessage(
        response.data.message || "Email verified successfully."
      );

      // Request the development-only simulated phone OTP.
      try {
        const phoneResponse = await axios.post(
          `${API_URL}/send-phone-otp`,
          { email: normalizedEmail }
        );

        setPhoneTestOtp(phoneResponse.data.testOtp || "");
        setMessage(
          "Email verified! Your development phone OTP is ready below."
        );
      } catch (phoneError) {
        setError(
          phoneError.response?.data?.message ||
            "Email verified, but the phone test OTP could not be generated. Try requesting it again."
        );
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Email OTP verification failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // RESEND EMAIL OTP
  const handleResendEmailOtp = async () => {
    setError("");
    setMessage("");

    try {
      setLoading(true);

      const response = await axios.post(
        `${API_URL}/resend-verification-otp`,
        { email: normalizedEmail }
      );

      setOtp("");
      setMessage(
        response.data.message || "A new email OTP has been sent."
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to resend email OTP. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // REQUEST A NEW DEVELOPMENT PHONE OTP
  const handleSendPhoneOtp = async () => {
    setError("");
    setMessage("");
    setPhoneTestOtp("");
    setOtp("");

    try {
      setLoading(true);

      const response = await axios.post(
        `${API_URL}/send-phone-otp`,
        { email: normalizedEmail }
      );

      setPhoneTestOtp(response.data.testOtp || "");
      setMessage(
        "Development phone OTP generated. No SMS was sent."
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to generate phone OTP. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // STEP 3: VERIFY PHONE
  const handleVerifyPhone = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!/^\d{6}$/.test(otp)) {
      setError("Enter the 6-digit phone test OTP.");
      return;
    }

    try {
      setLoading(true);

      const response = await axios.post(
        `${API_URL}/verify-phone-otp`,
        {
          email: normalizedEmail,
          otp,
        }
      );

      setOtp("");
      setPhoneTestOtp("");
      setMessage(
        response.data.message ||
          "Phone verification successful. You can now log in."
      );

      setTimeout(() => {
        navigate("/login");
      }, 1500);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Phone OTP verification failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleBackToRegistration = () => {
    setVerificationStep("register");
    setOtp("");
    setPhoneTestOtp("");
    setError("");
    setMessage("");
  };

  return (
    <div className="register-page">
      <div className="register-card">
        <h1>Join BidSphere</h1>

        {verificationStep === "register" && (
          <>
            <p>
              Create your account to explore auctions and submit offers.
            </p>

            <form onSubmit={handleSubmit}>
              <label htmlFor="full_name">Full Name</label>
              <input
                id="full_name"
                name="full_name"
                type="text"
                value={formData.full_name}
                onChange={handleChange}
                minLength="3"
                maxLength="100"
                placeholder="Enter your full name"
                autoComplete="name"
                required
              />

              <label htmlFor="email">Email Address</label>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter your email"
                autoComplete="email"
                required
              />

              <label htmlFor="phone_number">Phone Number</label>
              <input
                id="phone_number"
                name="phone_number"
                type="tel"
                value={formData.phone_number}
                onChange={handleChange}
                placeholder="+919876543210"
                autoComplete="tel"
                required
              />

              <label htmlFor="password">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Create a strong password"
                autoComplete="new-password"
                required
              />

              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Re-enter your password"
                autoComplete="new-password"
                required
              />

              {error && <p className="register-error">{error}</p>}
              {message && <p className="register-success">{message}</p>}

              <button type="submit" disabled={loading}>
                {loading ? "Creating Account..." : "Create Account"}
              </button>
            </form>
          </>
        )}

        {verificationStep === "email" && (
          <>
            <p>Step 1 of 2: Verify your email address.</p>

            <p>
              Email: <strong>{normalizedEmail}</strong>
            </p>

            <form onSubmit={handleVerifyEmail}>
              <label htmlFor="emailOtp">Enter Email OTP</label>
              <input
                id="emailOtp"
                name="otp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength="6"
                pattern="[0-9]{6}"
                value={otp}
                onChange={(event) =>
                  setOtp(
                    event.target.value.replace(/\D/g, "").slice(0, 6)
                  )
                }
                placeholder="Enter 6-digit email OTP"
                required
              />

              {error && <p className="register-error">{error}</p>}
              {message && <p className="register-success">{message}</p>}

              <button type="submit" disabled={loading}>
                {loading ? "Verifying..." : "Verify Email"}
              </button>

              <button
                type="button"
                onClick={handleResendEmailOtp}
                disabled={loading}
              >
                Resend Email OTP
              </button>
            </form>
          </>
        )}

        {verificationStep === "phone" && (
          <>
            <p>Step 2 of 2: Verify your phone number.</p>

            <p>
              Phone: <strong>{formData.phone_number}</strong>
            </p>

            <p>
              Development testing only. No SMS will be sent.
            </p>

            {phoneTestOtp && (
              <p className="register-success">
                Development test OTP: <strong>{phoneTestOtp}</strong>
              </p>
            )}

            <form onSubmit={handleVerifyPhone}>
              <label htmlFor="phoneOtp">Enter Phone Test OTP</label>
              <input
                id="phoneOtp"
                name="otp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength="6"
                pattern="[0-9]{6}"
                value={otp}
                onChange={(event) =>
                  setOtp(
                    event.target.value.replace(/\D/g, "").slice(0, 6)
                  )
                }
                placeholder="Enter 6-digit phone OTP"
                required
              />

              {error && <p className="register-error">{error}</p>}
              {message && <p className="register-success">{message}</p>}

              <button type="submit" disabled={loading}>
                {loading ? "Verifying..." : "Verify Phone"}
              </button>

              <button
                type="button"
                onClick={handleSendPhoneOtp}
                disabled={loading}
              >
                Generate New Test OTP
              </button>
            </form>
          </>
        )}

        {verificationStep !== "register" && (
          <button
            type="button"
            onClick={handleBackToRegistration}
            disabled={loading}
          >
            Back to Registration
          </button>
        )}

        <p className="register-footer">
          Already have an account? <Link to="/login">Sign In</Link>
        </p>

        <Link className="register-home" to="/">
          Back to Home
        </Link>
      </div>
    </div>
  );
}

export default Register;
