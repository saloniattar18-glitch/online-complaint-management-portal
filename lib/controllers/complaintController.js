/* =========================================================
   ONLINE COMPLAINT MANAGEMENT PORTAL
   Complaint Controller
   File: lib/controllers/complaintController.js

   Required:
   npm install formidable

   Complaint image is stored as a Base64 data URL in
   complaints.image_url. This works without permanent
   filesystem storage.
   ========================================================= */

"use strict";

const fs = require("fs/promises");

const formidablePackage = require("formidable");

const db = require("../db");

const formidable = formidablePackage.formidable || formidablePackage;

/* =========================================================
   HELPERS
   ========================================================= */

function error(message, statusCode = 400) {
  const err = new Error(message);

  err.statusCode = statusCode;

  return err;
}

function first(value) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

async function readJson(req) {
  if (req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) {
    return req.body;
  }

  return new Promise((resolve, reject) => {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk.toString();

      if (body.length > 2 * 1024 * 1024) {
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
        reject(error("Invalid JSON request.", 400));
      }
    });

    req.on("error", reject);
  });
}

async function readRequestBody(req) {
  const contentType = String(req.headers["content-type"] || "");

  if (!contentType.includes("multipart/form-data")) {
    return {
      fields: await readJson(req),

      files: {},
    };
  }

  return new Promise((resolve, reject) => {
    const form = formidable({
      multiples: false,

      maxFileSize: 5 * 1024 * 1024,

      allowEmptyFiles: false,

      keepExtensions: true,
    });

    form.parse(req, (err, fields, files) => {
      if (err) {
        return reject(
          error(err.message || "Unable to process uploaded file.", 400),
        );
      }

      const normalized = {};

      for (const [key, value] of Object.entries(fields)) {
        normalized[key] = first(value);
      }

      resolve({
        fields: normalized,

        files,
      });
    });
  });
}

async function imageToDataUrl(file) {
  file = first(file);

  if (!file) {
    return null;
  }

  const allowed = ["image/jpeg", "image/png", "image/webp"];

  if (!allowed.includes(file.mimetype)) {
    try {
      await fs.unlink(file.filepath);
    } catch {
      // ignore
    }

    throw error("Only JPG, PNG and WEBP images are allowed.");
  }

  const buffer = await fs.readFile(file.filepath);

  try {
    await fs.unlink(file.filepath);
  } catch {
    // ignore temporary file cleanup error
  }

  return `data:${file.mimetype};base64,` + buffer.toString("base64");
}

function normalizeStatus(status) {
  return String(status || "")
    .trim()
    .toLowerCase()
    .replaceAll(" ", "_")
    .replaceAll("-", "_");
}

function normalizePriority(priority) {
  return String(priority || "medium")
    .trim()
    .toLowerCase();
}

function complaintCode(id) {
  return "CMP-" + String(id).padStart(6, "0");
}

/* =========================================================
   COMMON COMPLAINT SELECT
   ========================================================= */

const COMPLAINT_SELECT = `
    SELECT
        c.complaint_id,
        c.complaint_id AS id,
        c.complaint_code,
        c.user_id,
        c.category_id,
        c.department_id,
        c.assigned_staff_id,
        c.title,
        c.description,
        c.priority,
        c.status,
        c.location,
        c.address,
        c.pincode,
        c.image_url,
        c.resolution,
        c.due_date,
        c.created_at,
        c.updated_at,

        u.full_name AS user_name,
        u.email AS user_email,
        u.mobile AS user_mobile,

        cat.name AS category_name,

        d.name AS department_name,

        s.full_name AS staff_name

    FROM complaints c

    INNER JOIN users u
        ON u.user_id = c.user_id

    LEFT JOIN categories cat
        ON cat.category_id =
           c.category_id

    LEFT JOIN departments d
        ON d.department_id =
           c.department_id

    LEFT JOIN users s
        ON s.user_id =
           c.assigned_staff_id
`;

/* =========================================================
   USER DASHBOARD
   ========================================================= */

async function userDashboard(req) {
  const userId = Number(req.user.user_id);

  const stats = await db.getOne(
    `
            SELECT

                COUNT(*) AS total_complaints,

                SUM(
                    CASE
                        WHEN status = 'pending'
                        THEN 1
                        ELSE 0
                    END
                ) AS pending_complaints,

                SUM(
                    CASE
                        WHEN status IN
                        (
                            'assigned',
                            'in_progress'
                        )
                        THEN 1
                        ELSE 0
                    END
                ) AS in_progress_complaints,

                SUM(
                    CASE
                        WHEN status IN
                        (
                            'resolved',
                            'closed'
                        )
                        THEN 1
                        ELSE 0
                    END
                ) AS resolved_complaints

            FROM complaints

            WHERE user_id = ?
            `,
    [userId],
  );

  const recent = await db.query(
    `
            ${COMPLAINT_SELECT}

            WHERE c.user_id = ?

            ORDER BY c.created_at DESC

            LIMIT 5
            `,
    [userId],
  );

  return {
    stats: {
      total_complaints: Number(stats?.total_complaints || 0),

      pending_complaints: Number(stats?.pending_complaints || 0),

      in_progress_complaints: Number(stats?.in_progress_complaints || 0),

      resolved_complaints: Number(stats?.resolved_complaints || 0),
    },

    recent_complaints: recent,
  };
}

/* =========================================================
   CREATE COMPLAINT
   ========================================================= */

async function createComplaint(req) {
  const { fields, files } = await readRequestBody(req);

  const userId = Number(req.user.user_id);

  const title = String(fields.title || "").trim();

  const description = String(fields.description || "").trim();

  const categoryId = Number(fields.category_id);

  const departmentId = fields.department_id
    ? Number(fields.department_id)
    : null;

  const priority = normalizePriority(fields.priority);

  const location = String(fields.location || "").trim();

  const address = String(fields.address || "").trim();

  const pincode = String(fields.pincode || "").trim();

  if (title.length < 5) {
    throw error("Complaint title must contain at least 5 characters.");
  }

  if (description.length < 10) {
    throw error("Please enter a detailed complaint description.");
  }

  if (!categoryId) {
    throw error("Please select a complaint category.");
  }

  if (!["low", "medium", "high", "urgent"].includes(priority)) {
    throw error("Invalid complaint priority.");
  }

  const category = await db.getOne(
    `
            SELECT category_id
            FROM categories
            WHERE category_id = ?
              AND status = 'active'
            `,
    [categoryId],
  );

  if (!category) {
    throw error("Selected complaint category was not found.", 404);
  }

  if (departmentId) {
    const department = await db.getOne(
      `
                SELECT department_id
                FROM departments
                WHERE department_id = ?
                  AND status = 'active'
                `,
      [departmentId],
    );

    if (!department) {
      throw error("Selected department was not found.", 404);
    }
  }

  const imageFile = files.image || files.attachment;

  const imageUrl = imageFile ? await imageToDataUrl(imageFile) : null;

  const result = await db.transaction(async (connection) => {
    const [insertResult] = await connection.execute(
      `
                        INSERT INTO complaints
                        (
                            user_id,
                            category_id,
                            department_id,
                            title,
                            description,
                            priority,
                            status,
                            location,
                            address,
                            pincode,
                            image_url,
                            created_at,
                            updated_at
                        )
                        VALUES
                        (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, NOW(), NOW())
                        `,
      [
        userId,
        categoryId,
        departmentId,
        title,
        description,
        priority,
        location || null,
        address || null,
        pincode || null,
        imageUrl,
      ],
    );

    const id = insertResult.insertId;

    const code = complaintCode(id);

    await connection.execute(
      `
                    UPDATE complaints
                    SET complaint_code = ?
                    WHERE complaint_id = ?
                    `,
      [code, id],
    );

    await connection.execute(
      `
                    INSERT INTO complaint_status_history
                    (
                        complaint_id,
                        status,
                        remarks,
                        updated_by,
                        created_at
                    )
                    VALUES
                    (?, 'pending', 'Complaint submitted by user.', ?, NOW())
                    `,
      [id, userId],
    );

    return {
      id,
      code,
    };
  });

  return {
    message: "Complaint submitted successfully.",

    complaint: {
      complaint_id: result.id,

      id: result.id,

      complaint_code: result.code,
    },
  };
}

/* =========================================================
   USER COMPLAINT LIST
   ========================================================= */

async function listUserComplaints(req) {
  const userId = Number(req.user.user_id);

  const conditions = ["c.user_id = ?"];

  const params = [userId];

  if (req.query.status) {
    conditions.push("c.status = ?");

    params.push(normalizeStatus(req.query.status));
  }

  if (req.query.category_id) {
    conditions.push("c.category_id = ?");

    params.push(Number(req.query.category_id));
  }

  if (req.query.search) {
    conditions.push(
      `
            (
                c.title LIKE ?
                OR c.description LIKE ?
                OR c.complaint_code LIKE ?
            )
            `,
    );

    const term = `%${String(req.query.search).trim()}%`;

    params.push(term, term, term);
  }

  const complaints = await db.query(
    `
            ${COMPLAINT_SELECT}

            WHERE
                ${conditions.join(" AND ")}

            ORDER BY c.created_at DESC
            `,
    params,
  );

  return {
    complaints,
  };
}

/* =========================================================
   USER SINGLE COMPLAINT
   ========================================================= */

async function getUserComplaint(req) {
  const complaintId = Number(req.params.complaintId);

  const userId = Number(req.user.user_id);

  const complaint = await db.getOne(
    `
            ${COMPLAINT_SELECT}

            WHERE
                c.complaint_id = ?
                AND c.user_id = ?

            LIMIT 1
            `,
    [complaintId, userId],
  );

  if (!complaint) {
    throw error("Complaint not found.", 404);
  }

  return {
    complaint,
  };
}

/* =========================================================
   USER STATUS HISTORY
   ========================================================= */

async function getUserComplaintStatus(req) {
  const complaintId = Number(req.params.complaintId);

  const userId = Number(req.user.user_id);

  const complaint = await db.getOne(
    `
            SELECT complaint_id
            FROM complaints
            WHERE complaint_id = ?
              AND user_id = ?
            `,
    [complaintId, userId],
  );

  if (!complaint) {
    throw error("Complaint not found.", 404);
  }

  const history = await db.query(
    `
            SELECT
                h.history_id,
                h.status,
                h.remarks,
                h.created_at,
                u.full_name AS updated_by_name

            FROM complaint_status_history h

            LEFT JOIN users u
                ON u.user_id =
                   h.updated_by

            WHERE h.complaint_id = ?

            ORDER BY h.created_at ASC,
                     h.history_id ASC
            `,
    [complaintId],
  );

  return {
    history,
  };
}

/* =========================================================
   STAFF DASHBOARD
   ========================================================= */

async function staffDashboard(req) {
  const staffId = Number(req.user.user_id);

  const stats = await db.getOne(
    `
            SELECT

                COUNT(*) AS assigned_complaints,

                SUM(
                    CASE
                        WHEN status = 'in_progress'
                        THEN 1
                        ELSE 0
                    END
                ) AS in_progress_complaints,

                SUM(
                    CASE
                        WHEN status IN
                        (
                            'resolved',
                            'closed'
                        )
                        THEN 1
                        ELSE 0
                    END
                ) AS resolved_complaints,

                SUM(
                    CASE
                        WHEN due_date IS NOT NULL
                         AND due_date < NOW()
                         AND status NOT IN
                         (
                            'resolved',
                            'closed',
                            'rejected'
                         )
                        THEN 1
                        ELSE 0
                    END
                ) AS overdue_complaints

            FROM complaints

            WHERE assigned_staff_id = ?
            `,
    [staffId],
  );

  const recent = await db.query(
    `
            ${COMPLAINT_SELECT}

            WHERE
                c.assigned_staff_id = ?

            ORDER BY c.updated_at DESC

            LIMIT 5
            `,
    [staffId],
  );

  return {
    stats: {
      assigned_complaints: Number(stats?.assigned_complaints || 0),

      in_progress_complaints: Number(stats?.in_progress_complaints || 0),

      resolved_complaints: Number(stats?.resolved_complaints || 0),

      overdue_complaints: Number(stats?.overdue_complaints || 0),
    },

    recent_complaints: recent,
  };
}

/* =========================================================
   STAFF LIST
   ========================================================= */

async function listStaffComplaints(req) {
  const staffId = Number(req.user.user_id);

  const conditions = ["c.assigned_staff_id = ?"];

  const params = [staffId];

  if (req.query.status) {
    conditions.push("c.status = ?");

    params.push(normalizeStatus(req.query.status));
  }

  if (req.query.priority) {
    conditions.push("c.priority = ?");

    params.push(normalizePriority(req.query.priority));
  }

  if (req.query.search) {
    conditions.push(
      `
            (
                c.title LIKE ?
                OR c.description LIKE ?
                OR c.complaint_code LIKE ?
            )
            `,
    );

    const term = `%${String(req.query.search).trim()}%`;

    params.push(term, term, term);
  }

  const complaints = await db.query(
    `
            ${COMPLAINT_SELECT}

            WHERE
                ${conditions.join(" AND ")}

            ORDER BY

                CASE c.priority
                    WHEN 'urgent' THEN 1
                    WHEN 'high' THEN 2
                    WHEN 'medium' THEN 3
                    ELSE 4
                END,

                c.created_at ASC
            `,
    params,
  );

  return {
    complaints,
  };
}

/* =========================================================
   STAFF SINGLE COMPLAINT
   ========================================================= */

async function getStaffComplaint(req) {
  const complaintId = Number(req.params.complaintId);

  const staffId = Number(req.user.user_id);

  const complaint = await db.getOne(
    `
            ${COMPLAINT_SELECT}

            WHERE
                c.complaint_id = ?
                AND c.assigned_staff_id = ?

            LIMIT 1
            `,
    [complaintId, staffId],
  );

  if (!complaint) {
    throw error("Complaint not found or not assigned to you.", 404);
  }

  return {
    complaint,
  };
}

/* =========================================================
   STAFF UPDATE STATUS
   ========================================================= */

async function updateStaffComplaintStatus(req) {
  const complaintId = Number(req.params.complaintId);

  const staffId = Number(req.user.user_id);

  const body = await readJson(req);

  const status = normalizeStatus(body.status);

  const remarks = String(body.remarks || "").trim();

  const allowed = ["assigned", "in_progress", "resolved", "closed"];

  if (!allowed.includes(status)) {
    throw error("Invalid complaint status.");
  }

  const complaint = await db.getOne(
    `
            SELECT complaint_id
            FROM complaints
            WHERE complaint_id = ?
              AND assigned_staff_id = ?
            `,
    [complaintId, staffId],
  );

  if (!complaint) {
    throw error("Complaint not found or not assigned to you.", 404);
  }

  await db.transaction(async (connection) => {
    await connection.execute(
      `
                UPDATE complaints
                SET
                    status = ?,
                    resolution =
                        CASE
                            WHEN ? IN ('resolved', 'closed')
                            THEN ?
                            ELSE resolution
                        END,
                    updated_at = NOW()
                WHERE complaint_id = ?
                `,
      [status, status, remarks || null, complaintId],
    );

    await connection.execute(
      `
                INSERT INTO complaint_status_history
                (
                    complaint_id,
                    status,
                    remarks,
                    updated_by,
                    created_at
                )
                VALUES
                (?, ?, ?, ?, NOW())
                `,
      [complaintId, status, remarks || null, staffId],
    );
  });

  return {
    message: "Complaint status updated successfully.",
  };
}

/* =========================================================
   STAFF HISTORY
   ========================================================= */

async function getStaffComplaintHistory(req) {
  const complaintId = Number(req.params.complaintId);

  const staffId = Number(req.user.user_id);

  const complaint = await db.getOne(
    `
            SELECT complaint_id
            FROM complaints
            WHERE complaint_id = ?
              AND assigned_staff_id = ?
            `,
    [complaintId, staffId],
  );

  if (!complaint) {
    throw error("Complaint not found.", 404);
  }

  const history = await db.query(
    `
            SELECT
                h.history_id,
                h.status,
                h.remarks,
                h.created_at,
                u.full_name AS updated_by_name

            FROM complaint_status_history h

            LEFT JOIN users u
                ON u.user_id =
                   h.updated_by

            WHERE h.complaint_id = ?

            ORDER BY h.created_at ASC,
                     h.history_id ASC
            `,
    [complaintId],
  );

  return {
    history,
  };
}

/* =========================================================
   ADMIN LIST COMPLAINTS
   ========================================================= */

async function listAdminComplaints(req) {
  const conditions = ["1 = 1"];

  const params = [];

  if (req.query.status) {
    conditions.push("c.status = ?");

    params.push(normalizeStatus(req.query.status));
  }

  if (req.query.priority) {
    conditions.push("c.priority = ?");

    params.push(normalizePriority(req.query.priority));
  }

  if (req.query.department_id) {
    conditions.push("c.department_id = ?");

    params.push(Number(req.query.department_id));
  }

  if (req.query.category_id) {
    conditions.push("c.category_id = ?");

    params.push(Number(req.query.category_id));
  }

  if (req.query.search) {
    conditions.push(
      `
            (
                c.title LIKE ?
                OR c.description LIKE ?
                OR c.complaint_code LIKE ?
                OR u.full_name LIKE ?
            )
            `,
    );

    const term = `%${String(req.query.search).trim()}%`;

    params.push(term, term, term, term);
  }

  const complaints = await db.query(
    `
            ${COMPLAINT_SELECT}

            WHERE
                ${conditions.join(" AND ")}

            ORDER BY c.created_at DESC
            `,
    params,
  );

  return {
    complaints,
  };
}

/* =========================================================
   ADMIN SINGLE COMPLAINT
   ========================================================= */

async function getAdminComplaint(req) {
  const complaintId = Number(req.params.complaintId);

  const complaint = await db.getOne(
    `
            ${COMPLAINT_SELECT}

            WHERE c.complaint_id = ?

            LIMIT 1
            `,
    [complaintId],
  );

  if (!complaint) {
    throw error("Complaint not found.", 404);
  }

  return {
    complaint,
  };
}

/* =========================================================
   ADMIN ASSIGN COMPLAINT
   ========================================================= */

async function assignComplaint(req) {
  const complaintId = Number(req.params.complaintId);

  const adminId = Number(req.user.user_id);

  const body = await readJson(req);

  const departmentId = Number(body.department_id);

  const staffId = Number(body.staff_id);

  if (!departmentId || !staffId) {
    throw error("Department and staff member are required.");
  }

  const complaint = await db.getOne(
    `
            SELECT complaint_id
            FROM complaints
            WHERE complaint_id = ?
            `,
    [complaintId],
  );

  if (!complaint) {
    throw error("Complaint not found.", 404);
  }

  const staff = await db.getOne(
    `
            SELECT user_id
            FROM users
            WHERE user_id = ?
              AND role = 'staff'
              AND status = 'active'
              AND department_id = ?
            `,
    [staffId, departmentId],
  );

  if (!staff) {
    throw error(
      "Selected staff member is not active in the selected department.",
      400,
    );
  }

  await db.transaction(async (connection) => {
    await connection.execute(
      `
                UPDATE complaints
                SET
                    department_id = ?,
                    assigned_staff_id = ?,
                    status = 'assigned',
                    updated_at = NOW()
                WHERE complaint_id = ?
                `,
      [departmentId, staffId, complaintId],
    );

    await connection.execute(
      `
                INSERT INTO complaint_status_history
                (
                    complaint_id,
                    status,
                    remarks,
                    updated_by,
                    created_at
                )
                VALUES
                (?, 'assigned', 'Complaint assigned to staff.', ?, NOW())
                `,
      [complaintId, adminId],
    );
  });

  return {
    message: "Complaint assigned successfully.",
  };
}

/* =========================================================
   ADMIN UPDATE STATUS
   ========================================================= */

async function updateAdminComplaintStatus(req) {
  const complaintId = Number(req.params.complaintId);

  const adminId = Number(req.user.user_id);

  const body = await readJson(req);

  const status = normalizeStatus(body.status);

  const remarks = String(body.remarks || "").trim();

  const allowed = [
    "pending",
    "assigned",
    "in_progress",
    "resolved",
    "closed",
    "rejected",
  ];

  if (!allowed.includes(status)) {
    throw error("Invalid complaint status.");
  }

  const complaint = await db.getOne(
    `
            SELECT complaint_id
            FROM complaints
            WHERE complaint_id = ?
            `,
    [complaintId],
  );

  if (!complaint) {
    throw error("Complaint not found.", 404);
  }

  await db.transaction(async (connection) => {
    await connection.execute(
      `
                UPDATE complaints
                SET
                    status = ?,
                    resolution =
                        CASE
                            WHEN ? IN
                            (
                                'resolved',
                                'closed',
                                'rejected'
                            )
                            THEN ?
                            ELSE resolution
                        END,
                    updated_at = NOW()
                WHERE complaint_id = ?
                `,
      [status, status, remarks || null, complaintId],
    );

    await connection.execute(
      `
                INSERT INTO complaint_status_history
                (
                    complaint_id,
                    status,
                    remarks,
                    updated_by,
                    created_at
                )
                VALUES
                (?, ?, ?, ?, NOW())
                `,
      [complaintId, status, remarks || null, adminId],
    );
  });

  return {
    message: "Complaint status updated successfully.",
  };
}

/* =========================================================
   EXPORTS
   ========================================================= */

module.exports = {
  userDashboard,

  createComplaint,

  listUserComplaints,

  getUserComplaint,

  getUserComplaintStatus,

  staffDashboard,

  listStaffComplaints,

  getStaffComplaint,

  updateStaffComplaintStatus,

  getStaffComplaintHistory,

  listAdminComplaints,

  getAdminComplaint,

  assignComplaint,

  updateAdminComplaintStatus,
};
