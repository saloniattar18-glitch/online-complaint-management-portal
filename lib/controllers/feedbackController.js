/* =========================================================
   ONLINE COMPLAINT MANAGEMENT PORTAL
   Feedback Controller
   File: lib/controllers/feedbackController.js
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
   SUBMIT FEEDBACK
   ========================================================= */

async function submitFeedback(req) {
  const body = await readBody(req);

  const userId = Number(req.user.user_id);

  const complaintId = body.complaint_id ? Number(body.complaint_id) : null;

  const rating = Number(body.rating);

  const feedbackType = String(
    body.feedback_type || "complaint_resolution",
  ).trim();

  const comments = String(body.comments || "").trim();

  const recommend = String(body.recommend || "yes").toLowerCase();

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw error("Rating must be between 1 and 5.");
  }

  if (comments.length < 3) {
    throw error("Please enter your feedback comments.");
  }

  if (!["yes", "no"].includes(recommend)) {
    throw error("Invalid recommendation value.");
  }

  if (complaintId) {
    const complaint = await db.getOne(
      `
                SELECT complaint_id
                FROM complaints
                WHERE complaint_id = ?
                  AND user_id = ?
                LIMIT 1
                `,
      [complaintId, userId],
    );

    if (!complaint) {
      throw error("Complaint not found.", 404);
    }

    const existing = await db.getOne(
      `
                SELECT feedback_id
                FROM feedback
                WHERE complaint_id = ?
                  AND user_id = ?
                LIMIT 1
                `,
      [complaintId, userId],
    );

    if (existing) {
      throw error(
        "You have already submitted feedback for this complaint.",
        409,
      );
    }
  }

  const result = await db.insert(
    `
            INSERT INTO feedback
            (
                user_id,
                complaint_id,
                rating,
                feedback_type,
                comments,
                recommend,
                created_at
            )
            VALUES
            (?, ?, ?, ?, ?, ?, NOW())
            `,
    [userId, complaintId, rating, feedbackType, comments, recommend],
  );

  return {
    message: "Thank you for your feedback.",

    feedback_id: result.insertId,
  };
}

module.exports = {
  submitFeedback,
};
