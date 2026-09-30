/* =========================================================
   ONLINE COMPLAINT MANAGEMENT PORTAL
   Admin Controller
   File: lib/controllers/adminController.js
   ========================================================= */

"use strict";

const db = require("../db");

function error(message, statusCode = 400) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

/* =========================================================
   ADMIN DASHBOARD
   ========================================================= */

async function dashboard() {
  const stats = await db.getOne(
    `
            SELECT

                (
                    SELECT COUNT(*)
                    FROM users
                    WHERE role = 'user'
                ) AS total_users,

                (
                    SELECT COUNT(*)
                    FROM users
                    WHERE role = 'staff'
                ) AS total_staff,

                (
                    SELECT COUNT(*)
                    FROM departments
                    WHERE status = 'active'
                ) AS total_departments,

                (
                    SELECT COUNT(*)
                    FROM complaints
                ) AS total_complaints,

                (
                    SELECT COUNT(*)
                    FROM complaints
                    WHERE status = 'pending'
                ) AS pending_complaints,

                (
                    SELECT COUNT(*)
                    FROM complaints
                    WHERE status = 'resolved'
                ) AS resolved_complaints
            `,
  );

  const recentComplaints = await db.query(
    `
            SELECT
                c.complaint_id,
                c.complaint_id AS id,
                c.complaint_code,
                c.title,
                c.priority,
                c.status,
                c.created_at,

                u.full_name AS user_name,

                cat.name AS category_name,

                d.name AS department_name

            FROM complaints c

            INNER JOIN users u
                ON u.user_id = c.user_id

            LEFT JOIN categories cat
                ON cat.category_id = c.category_id

            LEFT JOIN departments d
                ON d.department_id = c.department_id

            ORDER BY c.created_at DESC

            LIMIT 10
            `,
  );

  return {
    stats,
    recent_complaints: recentComplaints,
  };
}

/* =========================================================
   LIST USERS
   ========================================================= */

async function listUsers(req) {
  const search = String(req.query.search || "").trim();

  const params = [];

  let where = `
        WHERE u.role = 'user'
        `;

  if (search) {
    where += `
            AND
            (
                u.full_name LIKE ?
                OR u.email LIKE ?
                OR u.mobile LIKE ?
            )
        `;

    const term = `%${search}%`;

    params.push(term, term, term);
  }

  const users = await db.query(
    `
            SELECT
                u.user_id,
                u.user_id AS id,
                u.full_name,
                u.email,
                u.mobile,
                u.username,
                u.role,
                u.status,
                u.created_at,

                COUNT(c.complaint_id)
                    AS total_complaints

            FROM users u

            LEFT JOIN complaints c
                ON c.user_id = u.user_id

            ${where}

            GROUP BY
                u.user_id,
                u.full_name,
                u.email,
                u.mobile,
                u.username,
                u.role,
                u.status,
                u.created_at

            ORDER BY u.created_at DESC
            `,
    params,
  );

  return {
    users,
  };
}

/* =========================================================
   USER DETAILS
   ========================================================= */

async function getUserDetails(req) {
  const userId = Number(req.params.userId);

  if (!userId) {
    throw error("Invalid user ID.");
  }

  const user = await db.getOne(
    `
            SELECT
                u.user_id,
                u.user_id AS id,
                u.full_name,
                u.email,
                u.mobile,
                u.username,
                u.address,
                u.role,
                u.status,
                u.created_at,
                u.updated_at,

                COUNT(c.complaint_id)
                    AS total_complaints

            FROM users u

            LEFT JOIN complaints c
                ON c.user_id = u.user_id

            WHERE u.user_id = ?
              AND u.role = 'user'

            GROUP BY
                u.user_id,
                u.full_name,
                u.email,
                u.mobile,
                u.username,
                u.address,
                u.role,
                u.status,
                u.created_at,
                u.updated_at

            LIMIT 1
            `,
    [userId],
  );

  if (!user) {
    throw error("User not found.", 404);
  }

  return {
    user,
  };
}

/* =========================================================
   REPORTS
   ========================================================= */

async function reports(req) {
  const from = String(req.query.from || "").trim();

  const to = String(req.query.to || "").trim();

  const departmentId = req.query.department_id
    ? Number(req.query.department_id)
    : null;

  const conditions = ["1 = 1"];

  const params = [];

  if (from) {
    conditions.push("DATE(created_at) >= ?");

    params.push(from);
  }

  if (to) {
    conditions.push("DATE(created_at) <= ?");

    params.push(to);
  }

  if (departmentId) {
    conditions.push("department_id = ?");

    params.push(departmentId);
  }

  const where = conditions.join(" AND ");

  const summary = await db.getOne(
    `
            SELECT

                COUNT(*) AS total_complaints,

                SUM(
                    CASE
                        WHEN status = 'resolved'
                        THEN 1
                        ELSE 0
                    END
                ) AS resolved_complaints,

                SUM(
                    CASE
                        WHEN status IN
                        (
                            'pending',
                            'assigned',
                            'in_progress'
                        )
                        THEN 1
                        ELSE 0
                    END
                ) AS pending_complaints

            FROM complaints

            WHERE ${where}
            `,
    params,
  );

  const total = Number(summary?.total_complaints || 0);

  const resolved = Number(summary?.resolved_complaints || 0);

  const resolutionRate =
    total > 0 ? Number(((resolved / total) * 100).toFixed(2)) : 0;

  const byDepartment = await db.query(
    `
            SELECT
                COALESCE(
                    d.name,
                    'Unassigned'
                ) AS department_name,

                COUNT(c.complaint_id)
                    AS total

            FROM complaints c

            LEFT JOIN departments d
                ON d.department_id =
                   c.department_id

            WHERE ${where
              .replaceAll("created_at", "c.created_at")
              .replaceAll("department_id", "c.department_id")}

            GROUP BY
                d.department_id,
                d.name

            ORDER BY total DESC
            `,
    params,
  );

  return {
    total_complaints: total,

    resolved_complaints: resolved,

    pending_complaints: Number(summary?.pending_complaints || 0),

    resolution_rate: resolutionRate,

    by_department: byDepartment,
  };
}

module.exports = {
  dashboard,
  listUsers,
  getUserDetails,
  reports,
};
