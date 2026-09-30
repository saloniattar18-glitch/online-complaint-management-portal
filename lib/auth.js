/* =========================================================
   ONLINE COMPLAINT MANAGEMENT PORTAL
   Authentication / Authorization Helpers
   File: lib/auth.js

   Required packages:

   npm install jsonwebtoken bcryptjs

   Required environment variable:

   JWT_SECRET=your_long_random_secret_key

   Optional:

   JWT_EXPIRES_IN=7d
   ========================================================= */

"use strict";

const jwt = require("jsonwebtoken");

const bcrypt = require("bcryptjs");

const db = require("./db");

/* =========================================================
   CONFIGURATION
   ========================================================= */

const DEFAULT_TOKEN_EXPIRY = "7d";

const PASSWORD_SALT_ROUNDS = 12;

/* =========================================================
   CUSTOM AUTH ERROR
   ========================================================= */

function authError(message, statusCode = 401) {
  const error = new Error(message);

  error.statusCode = statusCode;

  return error;
}

/* =========================================================
   GET JWT SECRET
   ========================================================= */

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw authError("JWT_SECRET is not configured.", 500);
  }

  if (process.env.NODE_ENV === "production" && secret.length < 32) {
    throw authError(
      "JWT_SECRET must contain at least 32 characters in production.",
      500,
    );
  }

  return secret;
}

/* =========================================================
   NORMALIZE ROLE
   ========================================================= */

function normalizeRole(role) {
  return String(role || "")
    .trim()
    .toLowerCase();
}

/* =========================================================
   VALID ROLES
   ========================================================= */

const VALID_ROLES = new Set(["user", "staff", "admin"]);

function isValidRole(role) {
  return VALID_ROLES.has(normalizeRole(role));
}

/* =========================================================
   HASH PASSWORD
   ========================================================= */

async function hashPassword(password) {
  if (typeof password !== "string" || password.length < 6) {
    throw authError("Password must contain at least 6 characters.", 400);
  }

  return bcrypt.hash(password, PASSWORD_SALT_ROUNDS);
}

/* =========================================================
   COMPARE PASSWORD
   ========================================================= */

async function comparePassword(password, passwordHash) {
  if (!password || !passwordHash) {
    return false;
  }

  try {
    return await bcrypt.compare(String(password), String(passwordHash));
  } catch (error) {
    console.error("PASSWORD COMPARISON ERROR:", error);

    return false;
  }
}

/* =========================================================
   GENERATE JWT TOKEN
   ========================================================= */

function generateToken(user) {
  if (!user) {
    throw authError("User information is required to generate token.", 500);
  }

  const userId = user.user_id ?? user.id;

  if (!userId) {
    throw authError("User ID is required to generate token.", 500);
  }

  const role = normalizeRole(user.role);

  if (!isValidRole(role)) {
    throw authError("Invalid user role.", 500);
  }

  const payload = {
    /*
     * JWT standard subject.
     */

    sub: String(userId),

    /*
     * Application-specific values.
     */

    userId: Number(userId),

    role: role,

    email: user.email || null,
  };

  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: process.env.JWT_EXPIRES_IN || DEFAULT_TOKEN_EXPIRY,

    issuer: "online-complaint-management-portal",

    audience: "complaint-portal-users",
  });
}

/* =========================================================
   VERIFY JWT TOKEN
   ========================================================= */

function verifyToken(token) {
  if (!token) {
    throw authError("Authentication token is required.", 401);
  }

  try {
    return jwt.verify(token, getJwtSecret(), {
      issuer: "online-complaint-management-portal",

      audience: "complaint-portal-users",
    });
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      throw authError("Your session has expired. Please login again.", 401);
    }

    if (error.name === "JsonWebTokenError") {
      throw authError("Invalid authentication token.", 401);
    }

    if (error.name === "NotBeforeError") {
      throw authError("Authentication token is not active yet.", 401);
    }

    throw authError("Authentication failed.", 401);
  }
}

/* =========================================================
   EXTRACT BEARER TOKEN
   ========================================================= */

function getBearerToken(req) {
  if (!req || !req.headers) {
    throw authError("Invalid request.", 401);
  }

  const authorization = req.headers.authorization || req.headers.Authorization;

  if (!authorization) {
    throw authError("Authorization token is required.", 401);
  }

  const parts = String(authorization).trim().split(/\s+/);

  if (parts.length !== 2 || parts[0].toLowerCase() !== "bearer") {
    throw authError("Authorization header must use Bearer token.", 401);
  }

  const token = parts[1];

  if (!token) {
    throw authError("Authentication token is required.", 401);
  }

  return token;
}

/* =========================================================
   GET USER FROM DATABASE
   ========================================================= */

async function findAuthenticatedUser(userId) {
  const user = await db.getOne(
    `
            SELECT
                user_id,
                full_name,
                email,
                mobile,
                username,
                address,
                role,
                status,
                created_at,
                updated_at
            FROM users
            WHERE user_id = ?
            LIMIT 1
            `,
    [userId],
  );

  return user;
}

/* =========================================================
   AUTHENTICATE REQUEST
   ========================================================= */

/*
 * Used by api/index.js:
 *
 * await authenticate(req);
 *
 * After success:
 *
 * req.user = {
 *     user_id,
 *     full_name,
 *     email,
 *     role,
 *     ...
 * }
 */

async function authenticate(req) {
  const token = getBearerToken(req);

  const decoded = verifyToken(token);

  const userId = Number(decoded.userId || decoded.sub);

  if (!Number.isInteger(userId) || userId <= 0) {
    throw authError("Invalid authentication token.", 401);
  }

  const user = await findAuthenticatedUser(userId);

  if (!user) {
    throw authError("User account no longer exists.", 401);
  }

  const status = String(user.status || "active").toLowerCase();

  if (status !== "active") {
    throw authError(
      "Your account is inactive. Please contact the administrator.",
      403,
    );
  }

  const role = normalizeRole(user.role);

  if (!isValidRole(role)) {
    throw authError("Your account has an invalid role.", 403);
  }

  /*
   * Protect against a token being used after
   * the user's role has been changed.
   */

  if (decoded.role && normalizeRole(decoded.role) !== role) {
    throw authError(
      "Your account permissions have changed. Please login again.",
      401,
    );
  }

  req.user = {
    ...user,

    id: user.user_id,

    role: role,
  };

  req.authToken = token;

  req.tokenPayload = decoded;

  return req.user;
}

/* =========================================================
   REQUIRE ROLE
   ========================================================= */

/*
 * Used by api/index.js:
 *
 * await authenticate(req);
 * requireRole(req, "admin");
 */

function requireRole(req, allowedRoles) {
  if (!req || !req.user) {
    throw authError("Authentication is required.", 401);
  }

  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  const normalizedAllowedRoles = roles.map(normalizeRole).filter(Boolean);

  if (normalizedAllowedRoles.length === 0) {
    throw authError("No authorized roles were configured.", 500);
  }

  const currentRole = normalizeRole(req.user.role);

  if (!normalizedAllowedRoles.includes(currentRole)) {
    throw authError("You do not have permission to access this resource.", 403);
  }

  return true;
}

/* =========================================================
   OPTIONAL AUTHENTICATION
   ========================================================= */

/*
 * Useful for public endpoints where authentication
 * is optional.
 *
 * It does NOT throw when Authorization header is absent.
 */

async function optionalAuthenticate(req) {
  const authorization =
    req?.headers?.authorization || req?.headers?.Authorization;

  if (!authorization) {
    req.user = null;

    return null;
  }

  return authenticate(req);
}

/* =========================================================
   REQUIRE ANY AUTHENTICATED USER
   ========================================================= */

function requireAuthenticated(req) {
  if (!req || !req.user) {
    throw authError("Please login to continue.", 401);
  }

  return true;
}

/* =========================================================
   REQUIRE ADMIN
   ========================================================= */

function requireAdmin(req) {
  return requireRole(req, "admin");
}

/* =========================================================
   REQUIRE STAFF
   ========================================================= */

function requireStaff(req) {
  return requireRole(req, "staff");
}

/* =========================================================
   REQUIRE NORMAL USER
   ========================================================= */

function requireUser(req) {
  return requireRole(req, "user");
}

/* =========================================================
   CHECK ROLE
   ========================================================= */

function hasRole(req, role) {
  if (!req?.user) {
    return false;
  }

  return normalizeRole(req.user.role) === normalizeRole(role);
}

/* =========================================================
   PUBLIC USER OBJECT
   ========================================================= */

/*
 * Never return password hashes to the frontend.
 */

function sanitizeUser(user) {
  if (!user) {
    return null;
  }

  return {
    user_id: user.user_id ?? user.id,

    id: user.user_id ?? user.id,

    full_name: user.full_name || "",

    username: user.username || "",

    email: user.email || "",

    mobile: user.mobile || "",

    address: user.address || "",

    role: normalizeRole(user.role),

    status: user.status || "active",

    created_at: user.created_at || null,

    updated_at: user.updated_at || null,
  };
}

/* =========================================================
   TOKEN RESPONSE HELPER
   ========================================================= */

/*
 * Useful inside authController.login():
 *
 * const tokenData = createLoginResponse(user);
 */

function createLoginResponse(user) {
  const cleanUser = sanitizeUser(user);

  return {
    token: generateToken(user),

    user: cleanUser,
  };
}

/* =========================================================
   EXPORTS
   ========================================================= */

module.exports = {
  authenticate,

  optionalAuthenticate,

  requireRole,

  requireAuthenticated,

  requireAdmin,

  requireStaff,

  requireUser,

  hasRole,

  hashPassword,

  comparePassword,

  generateToken,

  verifyToken,

  getBearerToken,

  sanitizeUser,

  createLoginResponse,

  normalizeRole,

  isValidRole,

  authError,
};
