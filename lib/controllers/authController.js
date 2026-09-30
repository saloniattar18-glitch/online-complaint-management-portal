/* =========================================================
   ONLINE COMPLAINT MANAGEMENT PORTAL
   Authentication Controller
   File: lib/controllers/authController.js
   ========================================================= */

"use strict";

const db = require("../db");

const {
  hashPassword,
  comparePassword,
  createLoginResponse,
  sanitizeUser,
  normalizeRole,
} = require("../auth");

/* =========================================================
   HELPERS
   ========================================================= */

function error(message, statusCode = 400) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

async function readBody(req) {
  if (req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) {
    return req.body;
  }

  return new Promise((resolve, reject) => {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk.toString();

      if (body.length > 1024 * 1024) {
        reject(error("Request body is too large.", 413));
      }
    });

    req.on("end", () => {
      if (!body.trim()) {
        return resolve({});
      }

      try {
        resolve(JSON.parse(body));
      } catch {
        reject(error("Invalid JSON request body.", 400));
      }
    });

    req.on("error", reject);
  });
}

function validEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || ""));
}

/* =========================================================
   REGISTER
   POST /api/auth/register
   ========================================================= */

async function register(req) {
  const body = await readBody(req);

  const fullName = String(body.full_name || "").trim();

  const email = String(body.email || "")
    .trim()
    .toLowerCase();

  const mobile = String(body.mobile || "").trim();

  const username = String(body.username || "").trim();

  const address = String(body.address || "").trim();

  const password = String(body.password || "");

  if (fullName.length < 2) {
    throw error("Please enter your full name.");
  }

  if (!validEmail(email)) {
    throw error("Please enter a valid email address.");
  }

  if (password.length < 6) {
    throw error("Password must contain at least 6 characters.");
  }

  if (mobile && !/^\d{10}$/.test(mobile)) {
    throw error("Mobile number must contain 10 digits.");
  }

  const existing = await db.getOne(
    `
            SELECT user_id
            FROM users
            WHERE email = ?
            LIMIT 1
            `,
    [email],
  );

  if (existing) {
    throw error("An account with this email already exists.", 409);
  }

  const passwordHash = await hashPassword(password);

  const result = await db.insert(
    `
            INSERT INTO users
            (
                full_name,
                email,
                mobile,
                username,
                address,
                password_hash,
                role,
                status,
                created_at,
                updated_at
            )
            VALUES
            (?, ?, ?, ?, ?, ?, 'user', 'active', NOW(), NOW())
            `,
    [
      fullName,
      email,
      mobile || null,
      username || null,
      address || null,
      passwordHash,
    ],
  );

  return {
    message: "Registration successful. You can now login.",

    user: {
      user_id: result.insertId,
      id: result.insertId,
      full_name: fullName,
      email,
      mobile,
      username,
      address,
      role: "user",
      status: "active",
    },
  };
}

/* =========================================================
   LOGIN
   POST /api/auth/login
   ========================================================= */

async function login(req) {
  const body = await readBody(req);

  const email = String(body.email || "")
    .trim()
    .toLowerCase();

  const password = String(body.password || "");

  const requestedRole = normalizeRole(body.role || "");

  if (!validEmail(email)) {
    throw error("Please enter a valid email address.");
  }

  if (!password) {
    throw error("Password is required.");
  }

  const user = await db.getOne(
    `
            SELECT
                user_id,
                full_name,
                email,
                mobile,
                username,
                address,
                password_hash,
                role,
                status,
                department_id,
                created_at,
                updated_at
            FROM users
            WHERE email = ?
            LIMIT 1
            `,
    [email],
  );

  if (!user) {
    throw error("Invalid email or password.", 401);
  }

  const passwordMatches = await comparePassword(password, user.password_hash);

  if (!passwordMatches) {
    throw error("Invalid email or password.", 401);
  }

  if (String(user.status || "").toLowerCase() !== "active") {
    throw error(
      "Your account is inactive. Please contact the administrator.",
      403,
    );
  }

  const actualRole = normalizeRole(user.role);

  if (requestedRole && requestedRole !== actualRole) {
    throw error(`This account cannot login as ${requestedRole}.`, 403);
  }

  const response = createLoginResponse(user);

  return {
    message: "Login successful.",

    ...response,
  };
}

/* =========================================================
   LOGOUT
   POST /api/auth/logout
   ========================================================= */

async function logout() {
  /*
   * JWT authentication is stateless.
   *
   * The frontend deletes the JWT token from localStorage.
   */

  return {
    message: "Logged out successfully.",
  };
}

/* =========================================================
   FORGOT PASSWORD
   POST /api/auth/forgot-password
   ========================================================= */

async function forgotPassword(req) {
  const body = await readBody(req);

  const email = String(body.email || "")
    .trim()
    .toLowerCase();

  if (!validEmail(email)) {
    throw error("Please enter a valid email address.");
  }

  /*
   * Do not expose whether an account exists.
   */

  await db.getOne(
    `
        SELECT user_id
        FROM users
        WHERE email = ?
        LIMIT 1
        `,
    [email],
  );

  /*
   * There is currently no email provider/reset page
   * in this project.
   *
   * The endpoint remains safe and functional.
   */

  return {
    message:
      "If this email is registered, please contact the administrator for password assistance.",
  };
}

/* =========================================================
   EXPORTS
   ========================================================= */

module.exports = {
  register,
  login,
  logout,
  forgotPassword,
};
