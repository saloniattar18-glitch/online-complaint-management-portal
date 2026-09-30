/* =========================================================
   ONLINE COMPLAINT MANAGEMENT PORTAL
   Department Controller
   File: lib/controllers/departmentController.js
   ========================================================= */

"use strict";

const db = require("../db");

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
   LIST
   ========================================================= */

async function listDepartments() {
  const departments = await db.query(
    `
            SELECT
                d.department_id,
                d.department_id AS id,
                d.name,
                d.description,
                d.status,
                d.created_at,
                d.updated_at,

                COUNT(
                    CASE
                        WHEN u.role = 'staff'
                         AND u.status = 'active'
                        THEN 1
                    END
                ) AS staff_count

            FROM departments d

            LEFT JOIN users u
                ON u.department_id = d.department_id

            WHERE d.status = 'active'

            GROUP BY
                d.department_id,
                d.name,
                d.description,
                d.status,
                d.created_at,
                d.updated_at

            ORDER BY d.name ASC
            `,
  );

  return {
    departments,
  };
}

/* =========================================================
   CREATE
   ========================================================= */

async function createDepartment(req) {
  const body = await readBody(req);

  const name = String(body.name || "").trim();

  const description = String(body.description || "").trim();

  if (name.length < 2) {
    throw error("Department name is required.");
  }

  const existing = await db.getOne(
    `
            SELECT department_id
            FROM departments
            WHERE LOWER(name) = LOWER(?)
            LIMIT 1
            `,
    [name],
  );

  if (existing) {
    throw error("This department already exists.", 409);
  }

  const result = await db.insert(
    `
            INSERT INTO departments
            (
                name,
                description,
                status,
                created_at,
                updated_at
            )
            VALUES
            (?, ?, 'active', NOW(), NOW())
            `,
    [name, description || null],
  );

  return {
    message: "Department created successfully.",

    department: {
      department_id: result.insertId,

      id: result.insertId,

      name,
      description,
      status: "active",
    },
  };
}

/* =========================================================
   UPDATE
   ========================================================= */

async function updateDepartment(req) {
  const departmentId = Number(req.params.departmentId);

  const body = await readBody(req);

  const name = String(body.name || "").trim();

  const description = String(body.description || "").trim();

  if (!departmentId) {
    throw error("Invalid department ID.");
  }

  if (name.length < 2) {
    throw error("Department name is required.");
  }

  const department = await db.getOne(
    `
            SELECT department_id
            FROM departments
            WHERE department_id = ?
            LIMIT 1
            `,
    [departmentId],
  );

  if (!department) {
    throw error("Department not found.", 404);
  }

  const duplicate = await db.getOne(
    `
            SELECT department_id
            FROM departments
            WHERE LOWER(name) = LOWER(?)
              AND department_id <> ?
            LIMIT 1
            `,
    [name, departmentId],
  );

  if (duplicate) {
    throw error("Another department already uses this name.", 409);
  }

  await db.modify(
    `
        UPDATE departments
        SET
            name = ?,
            description = ?,
            updated_at = NOW()
        WHERE department_id = ?
        `,
    [name, description || null, departmentId],
  );

  return {
    message: "Department updated successfully.",
  };
}

/* =========================================================
   DELETE
   ========================================================= */

async function deleteDepartment(req) {
  const departmentId = Number(req.params.departmentId);

  if (!departmentId) {
    throw error("Invalid department ID.");
  }

  const usage = await db.getOne(
    `
            SELECT
                (
                    SELECT COUNT(*)
                    FROM complaints
                    WHERE department_id = ?
                )
                +
                (
                    SELECT COUNT(*)
                    FROM users
                    WHERE department_id = ?
                ) AS total
            `,
    [departmentId, departmentId],
  );

  if (Number(usage?.total || 0) > 0) {
    await db.modify(
      `
            UPDATE departments
            SET
                status = 'inactive',
                updated_at = NOW()
            WHERE department_id = ?
            `,
      [departmentId],
    );

    return {
      message: "Department is currently in use and has been deactivated.",
    };
  }

  const result = await db.modify(
    `
            DELETE FROM departments
            WHERE department_id = ?
            `,
    [departmentId],
  );

  if (!result.affectedRows) {
    throw error("Department not found.", 404);
  }

  return {
    message: "Department deleted successfully.",
  };
}

module.exports = {
  listDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
};
