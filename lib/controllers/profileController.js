/* =========================================================
   ONLINE COMPLAINT MANAGEMENT PORTAL
   Profile Controller
   File: lib/controllers/profileController.js
   ========================================================= */

"use strict";

const db = require("../db");

const { sanitizeUser } = require("../auth");

function error(message, statusCode = 400) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

async function readBody(req) {
  if (req.body && typeof req.body === "object") {
    return req.body;
  }

  return new Promise((resolve, reject) => {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk.toString();
    });

    req.on("end", () => {
      if (!body.trim()) {
        return resolve({});
      }

      try {
        resolve(JSON.parse(body));
      } catch {
        reject(error("Invalid JSON request.", 400));
      }
    });

    req.on("error", reject);
  });
}

/* =========================================================
   GET PROFILE
   ========================================================= */

async function getProfile(req) {
  const userId = Number(req.user.user_id);

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
                department_id,
                created_at,
                updated_at
            FROM users
            WHERE user_id = ?
            LIMIT 1
            `,
    [userId],
  );

  if (!user) {
    throw error("Profile not found.", 404);
  }

  return {
    profile: sanitizeUser(user),

    user: sanitizeUser(user),
  };
}

/* =========================================================
   UPDATE PROFILE
   ========================================================= */

async function updateProfile(req) {
  const userId = Number(req.user.user_id);

  const body = await readBody(req);

  const current = await db.getOne(
    `
            SELECT *
            FROM users
            WHERE user_id = ?
            LIMIT 1
            `,
    [userId],
  );

  if (!current) {
    throw error("User account not found.", 404);
  }

  const fullName = String(body.full_name ?? current.full_name ?? "").trim();

  const email = String(body.email ?? current.email ?? "")
    .trim()
    .toLowerCase();

  const mobile = String(body.mobile ?? current.mobile ?? "").trim();

  const username = String(body.username ?? current.username ?? "").trim();

  const address = String(body.address ?? current.address ?? "").trim();

  if (fullName.length < 2) {
    throw error("Full name is required.");
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw error("Please enter a valid email address.");
  }

  if (mobile && !/^\d{10}$/.test(mobile)) {
    throw error("Mobile number must contain 10 digits.");
  }

  const duplicate = await db.getOne(
    `
            SELECT user_id
            FROM users
            WHERE email = ?
              AND user_id <> ?
            LIMIT 1
            `,
    [email, userId],
  );

  if (duplicate) {
    throw error("Another account already uses this email address.", 409);
  }

  await db.modify(
    `
        UPDATE users
        SET
            full_name = ?,
            email = ?,
            mobile = ?,
            username = ?,
            address = ?,
            updated_at = NOW()
        WHERE user_id = ?
        `,
    [
      fullName,
      email,
      mobile || null,
      username || null,
      address || null,
      userId,
    ],
  );

  const updated = await db.getOne(
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
                department_id,
                created_at,
                updated_at
            FROM users
            WHERE user_id = ?
            LIMIT 1
            `,
    [userId],
  );

  return {
    message: "Profile updated successfully.",

    user: sanitizeUser(updated),

    profile: sanitizeUser(updated),
  };
}

module.exports = {
  getProfile,
  updateProfile,
};
