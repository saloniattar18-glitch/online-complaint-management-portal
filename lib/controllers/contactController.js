/* =========================================================
   ONLINE COMPLAINT MANAGEMENT PORTAL
   Contact Controller
   File: lib/controllers/contactController.js
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

      if (body.length > 1024 * 1024) {
        reject(error("Request is too large.", 413));
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

/* =========================================================
   PUBLIC CONTACT
   ========================================================= */

async function submitContact(req) {
  const body = await readBody(req);

  const name = String(body.name || "").trim();

  const email = String(body.email || "")
    .trim()
    .toLowerCase();

  const subject = String(body.subject || "").trim();

  const message = String(body.message || "").trim();

  if (name.length < 2) {
    throw error("Please enter your name.");
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw error("Please enter a valid email address.");
  }

  if (subject.length < 3) {
    throw error("Please enter a subject.");
  }

  if (message.length < 10) {
    throw error("Please enter a detailed message.");
  }

  await db.insert(
    `
        INSERT INTO contact_messages
        (
            name,
            email,
            subject,
            message,
            status,
            created_at
        )
        VALUES
        (?, ?, ?, ?, 'unread', NOW())
        `,
    [name, email, subject, message],
  );

  return {
    message: "Your message has been sent successfully.",
  };
}

/* =========================================================
   ADMIN LIST MESSAGES
   ========================================================= */

async function listMessages() {
  const messages = await db.query(
    `
            SELECT
                message_id,
                message_id AS id,
                name,
                email,
                subject,
                message,
                status,
                created_at
            FROM contact_messages
            ORDER BY created_at DESC
            `,
  );

  return {
    messages,
  };
}

/* =========================================================
   ADMIN SINGLE MESSAGE
   ========================================================= */

async function getMessage(req) {
  const messageId = Number(req.params.messageId);

  if (!messageId) {
    throw error("Invalid message ID.");
  }

  const message = await db.getOne(
    `
            SELECT
                message_id,
                message_id AS id,
                name,
                email,
                subject,
                message,
                status,
                created_at
            FROM contact_messages
            WHERE message_id = ?
            LIMIT 1
            `,
    [messageId],
  );

  if (!message) {
    throw error("Message not found.", 404);
  }

  if (message.status === "unread") {
    await db.modify(
      `
            UPDATE contact_messages
            SET status = 'read'
            WHERE message_id = ?
            `,
      [messageId],
    );

    message.status = "read";
  }

  return {
    message_data: message,

    data: message,
  };
}

module.exports = {
  submitContact,
  listMessages,
  getMessage,
};
