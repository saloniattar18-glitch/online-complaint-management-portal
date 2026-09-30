/* =========================================================
   ONLINE COMPLAINT MANAGEMENT PORTAL
   Staff Controller
   File: lib/controllers/staffController.js
   ========================================================= */

"use strict";

const db = require("../db");

const { hashPassword, sanitizeUser } = require("../auth");

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
   LIST STAFF
   ========================================================= */

async function listStaff() {
  const staff = await db.query(
    `
            SELECT
                u.user_id,
                u.user_id AS id,
                u.user_id AS staff_id,
                u.full_name,
                u.email,
                u.mobile,
                u.username,
                u.status,
                u.department_id,
                d.name AS department_name,
                u.created_at,

                COUNT(
                    CASE
                        WHEN c.status NOT IN ('resolved', 'closed', 'rejected')
                        THEN 1
                    END
                ) AS assigned_count

            FROM users u

            LEFT JOIN departments d
                ON d.department_id = u.department_id

            LEFT JOIN complaints c
                ON c.assigned_staff_id = u.user_id

            WHERE u.role = 'staff'

            GROUP BY
                u.user_id,
                u.full_name,
                u.email,
                u.mobile,
                u.username,
                u.status,
                u.department_id,
                d.name,
                u.created_at

            ORDER BY u.full_name ASC
            `,
  );

  return {
    staff,
  };
}

/* =========================================================
   CREATE STAFF
   ========================================================= */

async function createStaff(req) {
  const body = await readBody(req);

  const fullName = String(body.full_name || "").trim();

  const email = String(body.email || "")
    .trim()
    .toLowerCase();

  const mobile = String(body.mobile || "").trim();

  const username = String(body.username || "").trim();

  const password = String(body.password || "");

  const departmentId = Number(body.department_id);

  const status = String(body.status || "active").toLowerCase();

  if (fullName.length < 2) {
    throw error("Staff full name is required.");
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw error("Please enter a valid email address.");
  }

  if (password.length < 6) {
    throw error("Password must contain at least 6 characters.");
  }

  if (!departmentId) {
    throw error("Department is required.");
  }

  if (!["active", "inactive"].includes(status)) {
    throw error("Invalid staff status.");
  }

  const department = await db.getOne(
    `
            SELECT department_id
            FROM departments
            WHERE department_id = ?
              AND status = 'active'
            LIMIT 1
            `,
    [departmentId],
  );

  if (!department) {
    throw error("Selected department was not found.", 404);
  }

  const duplicate = await db.getOne(
    `
            SELECT user_id
            FROM users
            WHERE email = ?
            LIMIT 1
            `,
    [email],
  );

  if (duplicate) {
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
                password_hash,
                role,
                status,
                department_id,
                created_at,
                updated_at
            )
            VALUES
            (?, ?, ?, ?, ?, 'staff', ?, ?, NOW(), NOW())
            `,
    [
      fullName,
      email,
      mobile || null,
      username || null,
      passwordHash,
      status,
      departmentId,
    ],
  );

  const user = await db.getOne(
    `
            SELECT
                user_id,
                full_name,
                email,
                mobile,
                username,
                role,
                status,
                department_id,
                created_at,
                updated_at
            FROM users
            WHERE user_id = ?
            `,
    [result.insertId],
  );

  return {
    message: "Staff account created successfully.",

    user: sanitizeUser(user),
  };
}

module.exports = {
  listStaff,
  createStaff,
};
