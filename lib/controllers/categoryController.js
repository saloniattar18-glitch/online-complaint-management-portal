/* =========================================================
   ONLINE COMPLAINT MANAGEMENT PORTAL
   Category Controller
   File: lib/controllers/categoryController.js
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

async function listCategories() {
  const categories = await db.query(
    `
            SELECT
                category_id,
                category_id AS id,
                name,
                description,
                status,
                created_at,
                updated_at
            FROM categories
            WHERE status = 'active'
            ORDER BY name ASC
            `,
  );

  return {
    categories,
  };
}

/* =========================================================
   CREATE
   ========================================================= */

async function createCategory(req) {
  const body = await readBody(req);

  const name = String(body.name || "").trim();

  const description = String(body.description || "").trim();

  if (name.length < 2) {
    throw error("Category name is required.");
  }

  const existing = await db.getOne(
    `
            SELECT category_id
            FROM categories
            WHERE LOWER(name) = LOWER(?)
            LIMIT 1
            `,
    [name],
  );

  if (existing) {
    throw error("This category already exists.", 409);
  }

  const result = await db.insert(
    `
            INSERT INTO categories
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
    message: "Category created successfully.",

    category: {
      category_id: result.insertId,
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

async function updateCategory(req) {
  const categoryId = Number(req.params.categoryId);

  const body = await readBody(req);

  const name = String(body.name || "").trim();

  const description = String(body.description || "").trim();

  if (!categoryId) {
    throw error("Invalid category ID.");
  }

  if (name.length < 2) {
    throw error("Category name is required.");
  }

  const category = await db.getOne(
    `
            SELECT category_id
            FROM categories
            WHERE category_id = ?
            LIMIT 1
            `,
    [categoryId],
  );

  if (!category) {
    throw error("Category not found.", 404);
  }

  const duplicate = await db.getOne(
    `
            SELECT category_id
            FROM categories
            WHERE LOWER(name) = LOWER(?)
              AND category_id <> ?
            LIMIT 1
            `,
    [name, categoryId],
  );

  if (duplicate) {
    throw error("Another category already uses this name.", 409);
  }

  await db.modify(
    `
        UPDATE categories
        SET
            name = ?,
            description = ?,
            updated_at = NOW()
        WHERE category_id = ?
        `,
    [name, description || null, categoryId],
  );

  return {
    message: "Category updated successfully.",
  };
}

/* =========================================================
   DELETE
   ========================================================= */

async function deleteCategory(req) {
  const categoryId = Number(req.params.categoryId);

  if (!categoryId) {
    throw error("Invalid category ID.");
  }

  const usage = await db.getOne(
    `
            SELECT COUNT(*) AS total
            FROM complaints
            WHERE category_id = ?
            `,
    [categoryId],
  );

  if (Number(usage?.total || 0) > 0) {
    /*
     * Soft delete protects old complaint records.
     */

    await db.modify(
      `
            UPDATE categories
            SET
                status = 'inactive',
                updated_at = NOW()
            WHERE category_id = ?
            `,
      [categoryId],
    );

    return {
      message: "Category is in use and has been deactivated.",
    };
  }

  const result = await db.modify(
    `
            DELETE FROM categories
            WHERE category_id = ?
            `,
    [categoryId],
  );

  if (!result.affectedRows) {
    throw error("Category not found.", 404);
  }

  return {
    message: "Category deleted successfully.",
  };
}

module.exports = {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
};
