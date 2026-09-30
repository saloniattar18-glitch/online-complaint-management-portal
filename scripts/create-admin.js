/* =========================================================
   ONLINE COMPLAINT MANAGEMENT PORTAL
   Admin Account Creation Script

   File:
   scripts/create-admin.js

   Database:
   PostgreSQL / Neon

   Run:
   node scripts/create-admin.js

   Optional .env values:

   ADMIN_NAME=System Administrator
   ADMIN_EMAIL=admin@complaintportal.com
   ADMIN_PASSWORD=Admin@123
   ADMIN_USERNAME=admin
   ADMIN_MOBILE=9999999999

   If these variables are not provided, safe demo defaults
   below will be used.
   ========================================================= */

"use strict";

/* =========================================================
   LOAD ENVIRONMENT VARIABLES
   ========================================================= */

try {
  require("dotenv").config();
} catch (error) {
  // dotenv is optional if environment variables
  // are provided directly by the operating system.
}

/* =========================================================
   IMPORT PROJECT MODULES
   ========================================================= */

const db = require("../lib/db");

const { hashPassword } = require("../lib/auth");

/* =========================================================
   DEFAULT ADMIN DETAILS
   ========================================================= */

/*
 * These defaults are suitable for the college project.
 *
 * You can override every value through .env.
 */

const ADMIN_NAME = String(
  process.env.ADMIN_NAME || "System Administrator",
).trim();

const ADMIN_EMAIL = String(
  process.env.ADMIN_EMAIL || "admin@complaintportal.com",
)
  .trim()
  .toLowerCase();

const ADMIN_PASSWORD = String(process.env.ADMIN_PASSWORD || "Admin@123");

const ADMIN_USERNAME = String(process.env.ADMIN_USERNAME || "admin").trim();

const ADMIN_MOBILE = String(process.env.ADMIN_MOBILE || "9999999999").trim();

const ADMIN_ADDRESS = String(
  process.env.ADMIN_ADDRESS || "Complaint Portal Administration",
).trim();

/* =========================================================
   VALIDATION HELPERS
   ========================================================= */

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || ""));
}

function validateMobile(mobile) {
  if (!mobile) {
    return true;
  }

  return /^\d{10}$/.test(String(mobile));
}

function validateAdminData() {
  if (!ADMIN_NAME || ADMIN_NAME.length < 2) {
    throw new Error("ADMIN_NAME must contain at least 2 characters.");
  }

  if (!validateEmail(ADMIN_EMAIL)) {
    throw new Error("ADMIN_EMAIL is not a valid email address.");
  }

  if (ADMIN_PASSWORD.length < 6) {
    throw new Error("ADMIN_PASSWORD must contain at least 6 characters.");
  }

  if (ADMIN_USERNAME && ADMIN_USERNAME.length < 3) {
    throw new Error("ADMIN_USERNAME must contain at least 3 characters.");
  }

  if (!validateMobile(ADMIN_MOBILE)) {
    throw new Error("ADMIN_MOBILE must contain exactly 10 digits.");
  }
}

/* =========================================================
   CHECK DATABASE CONNECTION
   ========================================================= */

async function checkDatabase() {
  const result = await db.testConnection();

  if (!result.success) {
    throw new Error(
      "Unable to connect to PostgreSQL / Neon database: " + result.message,
    );
  }

  console.log("✓ Connected to PostgreSQL / Neon database.");
}

/* =========================================================
   CHECK REQUIRED TABLE
   ========================================================= */

async function checkUsersTable() {
  const table = await db.getOne(
    `
            SELECT EXISTS
            (
                SELECT 1
                FROM information_schema.tables
                WHERE table_schema = 'public'
                  AND table_name = 'users'
            ) AS table_exists
            `,
  );

  if (!table || !table.table_exists) {
    throw new Error(
      "The users table does not exist. Run database/schema.sql first.",
    );
  }
}

/* =========================================================
   CHECK USERNAME CONFLICT
   ========================================================= */

async function checkUsernameConflict(currentUserId = null) {
  if (!ADMIN_USERNAME) {
    return;
  }

  let existing;

  if (currentUserId) {
    existing = await db.getOne(
      `
                SELECT
                    user_id,
                    email
                FROM users
                WHERE LOWER(username) = LOWER(?)
                  AND user_id <> ?
                LIMIT 1
                `,
      [ADMIN_USERNAME, currentUserId],
    );
  } else {
    existing = await db.getOne(
      `
                SELECT
                    user_id,
                    email
                FROM users
                WHERE LOWER(username) = LOWER(?)
                LIMIT 1
                `,
      [ADMIN_USERNAME],
    );
  }

  if (existing) {
    throw new Error(
      `Username "${ADMIN_USERNAME}" is already used by ${existing.email}.`,
    );
  }
}

/* =========================================================
   FIND EXISTING ACCOUNT
   ========================================================= */

async function findExistingAccount() {
  return db.getOne(
    `
        SELECT
            user_id,
            full_name,
            email,
            username,
            role,
            status
        FROM users
        WHERE LOWER(email) = LOWER(?)
        LIMIT 1
        `,
    [ADMIN_EMAIL],
  );
}

/* =========================================================
   CREATE NEW ADMIN
   ========================================================= */

async function createNewAdmin(passwordHash) {
  await checkUsernameConflict();

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
                department_id,
                created_at,
                updated_at
            )
            VALUES
            (
                ?,
                ?,
                ?,
                ?,
                ?,
                ?,
                'admin',
                'active',
                NULL,
                CURRENT_TIMESTAMP,
                CURRENT_TIMESTAMP
            )
            `,
    [
      ADMIN_NAME,
      ADMIN_EMAIL,
      ADMIN_MOBILE || null,
      ADMIN_USERNAME || null,
      ADMIN_ADDRESS || null,
      passwordHash,
    ],
  );

  return result.insertId;
}

/* =========================================================
   UPDATE EXISTING ACCOUNT TO ADMIN
   ========================================================= */

async function updateExistingAdmin(existingUser, passwordHash) {
  await checkUsernameConflict(existingUser.user_id);

  await db.modify(
    `
        UPDATE users
        SET
            full_name = ?,
            email = ?,
            mobile = ?,
            username = ?,
            address = ?,
            password_hash = ?,
            role = 'admin',
            status = 'active',
            department_id = NULL,
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
        `,
    [
      ADMIN_NAME,
      ADMIN_EMAIL,
      ADMIN_MOBILE || null,
      ADMIN_USERNAME || null,
      ADMIN_ADDRESS || null,
      passwordHash,
      existingUser.user_id,
    ],
  );

  return existingUser.user_id;
}

/* =========================================================
   GET FINAL ADMIN RECORD
   ========================================================= */

async function getAdmin(adminId) {
  return db.getOne(
    `
        SELECT
            user_id,
            full_name,
            email,
            mobile,
            username,
            role,
            status,
            created_at,
            updated_at
        FROM users
        WHERE user_id = ?
        LIMIT 1
        `,
    [adminId],
  );
}

/* =========================================================
   MAIN SCRIPT
   ========================================================= */

async function main() {
  console.log("");
  console.log("==============================================");

  console.log(" Online Complaint Management Portal");

  console.log(" Create Admin Account");

  console.log("==============================================");

  console.log("");

  /* -----------------------------------------------------
       Validate configuration
       ----------------------------------------------------- */

  validateAdminData();

  /* -----------------------------------------------------
       Test Neon database
       ----------------------------------------------------- */

  console.log("Checking database connection...");

  await checkDatabase();

  /* -----------------------------------------------------
       Make sure schema has already been created
       ----------------------------------------------------- */

  await checkUsersTable();

  /* -----------------------------------------------------
       Hash password securely
       ----------------------------------------------------- */

  console.log("Hashing admin password...");

  const passwordHash = await hashPassword(ADMIN_PASSWORD);

  /* -----------------------------------------------------
       Check existing email
       ----------------------------------------------------- */

  const existingUser = await findExistingAccount();

  let adminId;

  if (existingUser) {
    console.log("");
    console.log("An account with this email already exists.");

    console.log("Updating the existing account as administrator...");

    adminId = await updateExistingAdmin(existingUser, passwordHash);

    console.log("✓ Existing account updated successfully.");
  } else {
    console.log("Creating administrator account...");

    adminId = await createNewAdmin(passwordHash);

    console.log("✓ Administrator account created successfully.");
  }

  /* -----------------------------------------------------
       Verify saved account
       ----------------------------------------------------- */

  const admin = await getAdmin(adminId);

  if (!admin) {
    throw new Error("Admin account was saved but could not be verified.");
  }

  /* -----------------------------------------------------
       SUCCESS MESSAGE
       ----------------------------------------------------- */

  console.log("");
  console.log("==============================================");

  console.log(" ADMIN ACCOUNT READY");

  console.log("==============================================");

  console.log(`ID       : ${admin.user_id}`);

  console.log(`Name     : ${admin.full_name}`);

  console.log(`Email    : ${admin.email}`);

  console.log(`Username : ${admin.username || "-"}`);

  console.log(`Role     : ${admin.role}`);

  console.log(`Status   : ${admin.status}`);

  console.log("");
  console.log("Login Credentials");

  console.log("----------------------------------------------");

  console.log(`Email    : ${ADMIN_EMAIL}`);

  console.log(`Password : ${ADMIN_PASSWORD}`);

  console.log("----------------------------------------------");

  console.log("");

  console.log("Admin login page:");

  console.log("/admin/login.html");

  console.log("");
}

/* =========================================================
   RUN SCRIPT
   ========================================================= */

main()
  .catch((error) => {
    console.error("");
    console.error("==============================================");

    console.error(" CREATE ADMIN FAILED");

    console.error("==============================================");

    console.error(error.message);

    /*
     * Helpful PostgreSQL errors.
     */

    if (error.code === "42P01") {
      console.error(
        "Database table is missing. Run database/schema.sql first.",
      );
    }

    if (error.code === "23505") {
      console.error("A unique value such as email or username already exists.");
    }

    if (error.code === "23503") {
      console.error("A referenced database record does not exist.");
    }

    if (error.code === "28P01") {
      console.error("Neon database username or password is incorrect.");
    }

    if (error.code === "3D000") {
      console.error("The configured PostgreSQL database does not exist.");
    }

    process.exitCode = 1;
  })

  .finally(async () => {
    try {
      await db.close();
    } catch (closeError) {
      console.error(
        "Database connection could not be closed cleanly:",
        closeError.message,
      );
    }
  });
