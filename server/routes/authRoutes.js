
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const crypto = require("crypto");

const User = require("../models/User");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

const OTP_EXPIRY_MS = 10 * 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;

// Gmail transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Hash OTP before storing or comparing it.
function hashOTP(otp) {
  return crypto
    .createHash("sha256")
    .update(String(otp).trim())
    .digest("hex");
}

// Generate a six-digit OTP.
function generateOTP() {
  return crypto.randomInt(100000, 1000000).toString();
}

// Generate JWT.
function createToken(user) {
  return jwt.sign(
    { userId: user._id.toString() },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );
}

// Return safe user details.
function safeUser(user) {
  return {
    id: user._id,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    emailVerified: user.emailVerified,
    phoneVerified: user.phoneVerified,
    createdAt: user.createdAt,
  };
}

// Send OTP by email.
async function sendOTPEmail(email, otp, purpose) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error(
      "EMAIL_USER or EMAIL_PASS is missing in the environment"
    );
  }

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject:
      purpose === "verify"
        ? "BidSphere Email Verification"
        : "BidSphere Password Reset",
    text: `Your BidSphere OTP is ${otp}. It expires in 10 minutes. Do not share it with anyone.`,
  });
}

// TEST ROUTE
router.get("/test", (req, res) => {
  res.status(200).json({
    message: "BidSphere authentication routes are working",
  });
});

// REGISTER
router.post("/register", async (req, res) => {
  try {
    const { fullName, email, phone, password } = req.body;

    if (
      typeof fullName !== "string" ||
      typeof email !== "string" ||
      typeof phone !== "string" ||
      typeof password !== "string" ||
      !fullName.trim() ||
      !email.trim() ||
      !phone.trim() ||
      !password
    ) {
      return res.status(400).json({
        message: "Please fill in all required fields",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: "Password must contain at least 6 characters",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        message: "Email is already registered",
      });
    }

    const otp = generateOTP();

    const user = await User.create({
      fullName: fullName.trim(),
      email: normalizedEmail,
      phone: phone.trim(),
      password: await bcrypt.hash(password, 10),

      emailVerified: false,
      emailOtpHash: hashOTP(otp),
      emailOtpExpires: new Date(Date.now() + OTP_EXPIRY_MS),
      emailOtpAttempts: 0,

      phoneVerified: false,
      phoneOtpHash: null,
      phoneOtpExpires: null,
      phoneOtpAttempts: 0,
    });

    try {
      await sendOTPEmail(normalizedEmail, otp, "verify");
    } catch (emailError) {
      await User.findByIdAndDelete(user._id);

      console.error("Verification email error:", {
        code: emailError.code,
        message: emailError.message,
      });

      return res.status(500).json({
        message:
          "Unable to send verification email. Please check email configuration.",
      });
    }

    return res.status(201).json({
      message: "Registration successful. Please verify your email.",
      email: user.email,
    });
  } catch (error) {
    console.error("Registration error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        message: "Email is already registered",
      });
    }

    return res.status(500).json({
      message: "Registration failed",
    });
  }
});

// VERIFY EMAIL OTP
router.post("/verify-email", async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (
      typeof email !== "string" ||
      !/^\d{6}$/.test(String(otp || ""))
    ) {
      return res.status(400).json({
        message: "Valid email and six-digit OTP are required",
      });
    }

    const user = await User.findOne({
      email: email.trim().toLowerCase(),
    });

    if (!user) {
      return res.status(400).json({
        message: "Invalid email or OTP",
      });
    }

    if (user.emailVerified) {
      return res.status(400).json({
        message: "Email is already verified",
      });
    }

    if (
      !user.emailOtpHash ||
      !user.emailOtpExpires ||
      new Date(user.emailOtpExpires).getTime() <= Date.now()
    ) {
      return res.status(400).json({
        message: "OTP has expired. Request a new one.",
      });
    }

    if ((user.emailOtpAttempts || 0) >= MAX_OTP_ATTEMPTS) {
      return res.status(429).json({
        message: "Too many attempts. Request a new OTP.",
      });
    }

    user.emailOtpAttempts = (user.emailOtpAttempts || 0) + 1;

    if (hashOTP(otp) !== user.emailOtpHash) {
      await user.save();

      return res.status(400).json({
        message: "Invalid OTP",
      });
    }

    user.emailVerified = true;
    user.emailOtpHash = null;
    user.emailOtpExpires = null;
    user.emailOtpAttempts = 0;

    await user.save();

    return res.status(200).json({
      message: "Email verified successfully. Please verify your phone number next.",
      emailVerified: true,
      requiresPhoneVerification: true,
    });
  } catch (error) {
    console.error("Email verification error:", error);

    return res.status(500).json({
      message: "Email verification failed",
    });
  }
});

// RESEND EMAIL VERIFICATION OTP
router.post("/resend-verification-otp", async (req, res) => {
  try {
    const { email } = req.body;

    if (typeof email !== "string" || !email.trim()) {
      return res.status(400).json({
        message: "Email is required",
      });
    }

    const user = await User.findOne({
      email: email.trim().toLowerCase(),
    });

    if (!user) {
      return res.status(200).json({
        message:
          "If the account needs verification, an OTP will be sent.",
      });
    }

    if (user.emailVerified) {
      return res.status(400).json({
        message: "Email is already verified",
      });
    }

    const otp = generateOTP();

    user.emailOtpHash = hashOTP(otp);
    user.emailOtpExpires = new Date(Date.now() + OTP_EXPIRY_MS);
    user.emailOtpAttempts = 0;

    await user.save();

    try {
      await sendOTPEmail(user.email, otp, "verify");
    } catch (emailError) {
      console.error("Resend verification email error:", {
        code: emailError.code,
        message: emailError.message,
      });

      return res.status(500).json({
        message: "Unable to send verification OTP",
      });
    }

    return res.status(200).json({
      message: "Verification OTP sent",
    });
  } catch (error) {
    console.error("Resend verification error:", error);

    return res.status(500).json({
      message: "Unable to resend verification OTP",
    });
  }
});

// SEND PHONE OTP - DEVELOPMENT ONLY
router.post("/send-phone-otp", async (req, res) => {
  try {
    // Never expose simulated OTPs outside development.
    if (process.env.NODE_ENV !== "development") {
      return res.status(403).json({
        message:
          "Simulated phone verification is available only in development.",
      });
    }

    const { email } = req.body;

    if (typeof email !== "string" || !email.trim()) {
      return res.status(400).json({
        message: "Email is required",
      });
    }

    const user = await User.findOne({
      email: email.trim().toLowerCase(),
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    if (!user.emailVerified) {
      return res.status(403).json({
        message: "Please verify your email first",
      });
    }

    if (user.phoneVerified) {
      return res.status(400).json({
        message: "Phone number is already verified",
      });
    }

    const otp = generateOTP();

    user.phoneOtpHash = hashOTP(otp);
    user.phoneOtpExpires = new Date(Date.now() + OTP_EXPIRY_MS);
    user.phoneOtpAttempts = 0;

    await user.save();

    return res.status(200).json({
      message: "Development test OTP generated. No SMS was sent.",
      testOtp: otp,
    });
  } catch (error) {
    console.error("Send phone OTP error:", error);

    return res.status(500).json({
      message: "Unable to generate phone OTP",
    });
  }
});

// VERIFY PHONE OTP - DEVELOPMENT ONLY
router.post("/verify-phone-otp", async (req, res) => {
  try {
    if (process.env.NODE_ENV !== "development") {
      return res.status(403).json({
        message:
          "Simulated phone verification is available only in development.",
      });
    }

    const { email, otp } = req.body;

    if (
      typeof email !== "string" ||
      !/^\d{6}$/.test(String(otp || ""))
    ) {
      return res.status(400).json({
        message: "Valid email and six-digit OTP are required",
      });
    }

    const user = await User.findOne({
      email: email.trim().toLowerCase(),
    });

    if (!user) {
      return res.status(400).json({
        message: "Invalid email or OTP",
      });
    }

    if (!user.emailVerified) {
      return res.status(403).json({
        message: "Please verify your email first",
      });
    }

    if (user.phoneVerified) {
      return res.status(200).json({
        message: "Phone number is already verified",
        phoneVerified: true,
      });
    }

    if (
      !user.phoneOtpHash ||
      !user.phoneOtpExpires ||
      new Date(user.phoneOtpExpires).getTime() <= Date.now()
    ) {
      return res.status(400).json({
        message: "OTP has expired. Request a new one.",
      });
    }

    if ((user.phoneOtpAttempts || 0) >= MAX_OTP_ATTEMPTS) {
      return res.status(429).json({
        message: "Too many attempts. Request a new OTP.",
      });
    }

    user.phoneOtpAttempts = (user.phoneOtpAttempts || 0) + 1;

    if (hashOTP(otp) !== user.phoneOtpHash) {
      await user.save();

      return res.status(400).json({
        message: "Invalid OTP",
      });
    }

    user.phoneVerified = true;
    user.phoneOtpHash = null;
    user.phoneOtpExpires = null;
    user.phoneOtpAttempts = 0;

    await user.save();

    return res.status(200).json({
      message: "Phone number verified successfully. You can now log in.",
      phoneVerified: true,
    });
  } catch (error) {
    console.error("Verify phone OTP error:", error);

    return res.status(500).json({
      message: "Phone verification failed",
    });
  }
});

// LOGIN
router.post("/login", async (req, res) => {
  try {
    const { identifier, email, password } = req.body;

    const loginEmail = (
      typeof identifier === "string"
        ? identifier
        : typeof email === "string"
          ? email
          : ""
    ).trim().toLowerCase();

    if (!loginEmail || typeof password !== "string" || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    const user = await User.findOne({
      email: loginEmail,
    });

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const passwordMatches = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatches) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    if (!user.emailVerified) {
      return res.status(403).json({
        message: "Please verify your email before logging in",
        requiresEmailVerification: true,
      });
    }

    if (!user.phoneVerified) {
      return res.status(403).json({
        message: "Please verify your phone number before logging in",
        requiresPhoneVerification: true,
      });
    }

    return res.status(200).json({
      message: "Login successful",
      token: createToken(user),
      user: safeUser(user),
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      message: "Login failed",
    });
  }
});

// FORGOT PASSWORD: SEND OTP
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    if (typeof email !== "string" || !email.trim()) {
      return res.status(400).json({
        message: "A valid email address is required",
      });
    }

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.error(
        "Forgot password: Gmail environment variables are missing."
      );

      return res.status(500).json({
        message: "Email service is not configured on the server.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    console.log("Forgot password: looking up account.");

    const user = await User.findOne({
      email: normalizedEmail,
    });

    const responseMessage =
      "If the account exists, a password reset OTP will be sent.";

    if (!user) {
      return res.status(200).json({
        message: responseMessage,
      });
    }

    const otp = generateOTP();

    user.resetOtpHash = hashOTP(otp);
    user.resetOtpExpires = new Date(Date.now() + OTP_EXPIRY_MS);
    user.resetOtpAttempts = 0;

    console.log("Forgot password: saving OTP.");

    await user.save();

    console.log("Forgot password: sending email.");

    try {
      await sendOTPEmail(user.email, otp, "reset");
    } catch (emailError) {
      console.error("Gmail delivery failed:", {
        code: emailError.code,
        command: emailError.command,
        responseCode: emailError.responseCode,
        message: emailError.message,
      });

      return res.status(500).json({
        message:
          "Unable to send the OTP email. Check server email configuration.",
      });
    }

    return res.status(200).json({
      message: responseMessage,
    });
  } catch (error) {
    console.error("Forgot password database/server error:", error);

    return res.status(500).json({
      message:
        "Unable to process password reset. Check the backend terminal.",
    });
  }
});

// VERIFY PASSWORD RESET OTP
router.post("/verify-reset-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (
      typeof email !== "string" ||
      !/^\d{6}$/.test(String(otp || ""))
    ) {
      return res.status(400).json({
        message: "Valid email and six-digit OTP are required",
      });
    }

    const user = await User.findOne({
      email: email.trim().toLowerCase(),
    });

    if (!user) {
      return res.status(400).json({
        message: "Invalid or expired OTP",
      });
    }

    if (
      !user.resetOtpHash ||
      !user.resetOtpExpires ||
      new Date(user.resetOtpExpires).getTime() <= Date.now()
    ) {
      return res.status(400).json({
        message: "OTP has expired. Please request a new one.",
      });
    }

    if ((user.resetOtpAttempts || 0) >= MAX_OTP_ATTEMPTS) {
      return res.status(429).json({
        message: "Too many attempts. Please request a new OTP.",
      });
    }

    if (hashOTP(otp) !== user.resetOtpHash) {
      user.resetOtpAttempts = (user.resetOtpAttempts || 0) + 1;
      await user.save();

      return res.status(400).json({
        message: "Invalid OTP",
      });
    }

    return res.status(200).json({
      message: "OTP verified successfully",
    });
  } catch (error) {
    console.error("Verify reset OTP error:", error);

    return res.status(500).json({
      message: "Failed to verify OTP",
    });
  }
});

// RESET PASSWORD
router.post("/reset-password", async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (
      typeof email !== "string" ||
      !/^\d{6}$/.test(String(otp || "")) ||
      typeof newPassword !== "string"
    ) {
      return res.status(400).json({
        message: "Email, valid OTP and new password are required",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        message: "Password must contain at least 6 characters",
      });
    }

    const user = await User.findOne({
      email: email.trim().toLowerCase(),
    });

    if (!user) {
      return res.status(400).json({
        message: "Invalid or expired OTP",
      });
    }

    if (
      !user.resetOtpHash ||
      !user.resetOtpExpires ||
      new Date(user.resetOtpExpires).getTime() <= Date.now()
    ) {
      return res.status(400).json({
        message: "OTP has expired. Please request a new one.",
      });
    }

    if ((user.resetOtpAttempts || 0) >= MAX_OTP_ATTEMPTS) {
      return res.status(429).json({
        message: "Too many attempts. Please request a new OTP.",
      });
    }

    if (hashOTP(otp) !== user.resetOtpHash) {
      user.resetOtpAttempts = (user.resetOtpAttempts || 0) + 1;
      await user.save();

      return res.status(400).json({
        message: "Invalid OTP",
      });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetOtpHash = null;
    user.resetOtpExpires = null;
    user.resetOtpAttempts = 0;

    await user.save();

    return res.status(200).json({
      message: "Password reset successful. Please log in again.",
    });
  } catch (error) {
    console.error("Reset password error:", error);

    return res.status(500).json({
      message: "Unable to reset password",
    });
  }
});

// GET MY PROFILE
router.get("/profile", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select(
      "-password -emailOtpHash -phoneOtpHash -resetOtpHash"
    );

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    return res.status(200).json({
      user: safeUser(user),
    });
  } catch (error) {
    console.error("Get profile error:", error);

    return res.status(500).json({
      message: "Failed to fetch profile",
    });
  }
});

// UPDATE MY PROFILE
router.put("/profile", authMiddleware, async (req, res) => {
  try {
    const { fullName, phone, email } = req.body;

    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    if (fullName !== undefined) {
      if (typeof fullName !== "string" || !fullName.trim()) {
        return res.status(400).json({
          message: "Full name cannot be empty",
        });
      }

      user.fullName = fullName.trim();
    }

    if (phone !== undefined) {
      if (typeof phone !== "string" || !phone.trim()) {
        return res.status(400).json({
          message: "Phone number cannot be empty",
        });
      }

      // Changing phone invalidates previous verification.
      if (user.phone !== phone.trim()) {
        user.phoneVerified = false;
        user.phoneOtpHash = null;
        user.phoneOtpExpires = null;
        user.phoneOtpAttempts = 0;
      }

      user.phone = phone.trim();
    }

    if (
      email !== undefined &&
      (typeof email !== "string" ||
        email.trim().toLowerCase() !== user.email)
    ) {
      return res.status(400).json({
        message:
          "Changing email requires a separate verification process",
      });
    }

    await user.save();

    return res.status(200).json({
      message: "Profile updated successfully",
      user: safeUser(user),
    });
  } catch (error) {
    console.error("Update profile error:", error);

    return res.status(500).json({
      message: "Failed to update profile",
    });
  }
});

module.exports = router;
