/* =========================================================
   ONLINE COMPLAINT MANAGEMENT PORTAL
   PostgreSQL / Neon Database Connection
   File: lib/db.js

   Required package:
   npm install pg

   Recommended environment variable:

   DATABASE_URL=postgresql://user:password@host/database?sslmode=require

   This file also supports:
   POSTGRES_URL
   NEON_DATABASE_URL

   IMPORTANT:
   This compatibility layer automatically converts:
       ?  ->  $1, $2, $3...

   Therefore the controllers already created for this project
   can continue using their existing SQL statements.
   ========================================================= */

"use strict";

/* =========================================================
   LOAD LOCAL .ENV WHEN AVAILABLE
   ========================================================= */

try {
  require("dotenv").config();
} catch (error) {
  /*
   * dotenv is optional here.
   * Vercel provides environment variables automatically.
   */
}

/* =========================================================
   IMPORT POSTGRESQL
   ========================================================= */

const { Pool } = require("pg");

/* =========================================================
   ENVIRONMENT HELPERS
   ========================================================= */

function getBooleanEnv(name, defaultValue = false) {
  const value = process.env[name];

  if (value === undefined || value === null || value === "") {
    return defaultValue;
  }

  return ["1", "true", "yes", "on"].includes(
    String(value).trim().toLowerCase(),
  );
}

function getNumberEnv(name, defaultValue) {
  const value = Number(process.env[name]);

  return Number.isFinite(value) ? value : defaultValue;
}

/* =========================================================
   GET DATABASE URL
   ========================================================= */

function getDatabaseUrl() {
  return (
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.NEON_DATABASE_URL ||
    ""
  ).trim();
}

/* =========================================================
   DETECT LOCAL DATABASE
   ========================================================= */

function isLocalDatabase(connectionString) {
  if (!connectionString) {
    const host = String(
      process.env.PGHOST || process.env.DB_HOST || "",
    ).toLowerCase();

    return host === "localhost" || host === "127.0.0.1";
  }

  try {
    const url = new URL(connectionString);

    const host = String(url.hostname || "").toLowerCase();

    return host === "localhost" || host === "127.0.0.1";
  } catch (error) {
    return false;
  }
}

/* =========================================================
   DATABASE CONFIGURATION
   ========================================================= */

function buildPoolConfig() {
  const connectionString = getDatabaseUrl();

  /*
   * -----------------------------------------------------
   * RECOMMENDED: NEON DATABASE_URL MODE
   * -----------------------------------------------------
   */

  if (connectionString) {
    const local = isLocalDatabase(connectionString);

    let ssl;

    /*
     * Explicit DB_SSL=false disables SSL.
     */

    if (process.env.DB_SSL !== undefined && !getBooleanEnv("DB_SSL", true)) {
      ssl = false;
    } else if (local) {
      ssl = false;
    } else {
      /*
       * Neon requires SSL.
       */

      ssl = {
        rejectUnauthorized: false,
      };
    }

    return {
      connectionString,

      ssl,

      max: getNumberEnv("DB_POOL_MAX", 5),

      min: 0,

      idleTimeoutMillis: getNumberEnv("DB_IDLE_TIMEOUT", 10000),

      connectionTimeoutMillis: getNumberEnv("DB_CONNECTION_TIMEOUT", 10000),

      allowExitOnIdle: true,

      application_name: "online-complaint-management-portal",
    };
  }

  /*
   * -----------------------------------------------------
   * INDIVIDUAL POSTGRES ENVIRONMENT VARIABLES
   * -----------------------------------------------------
   *
   * Can use:
   *
   * PGHOST
   * PGPORT
   * PGUSER
   * PGPASSWORD
   * PGDATABASE
   *
   * OR:
   *
   * DB_HOST
   * DB_PORT
   * DB_USER
   * DB_PASSWORD
   * DB_NAME
   */

  const host = process.env.PGHOST || process.env.DB_HOST;

  const user = process.env.PGUSER || process.env.DB_USER;

  const password = process.env.PGPASSWORD || process.env.DB_PASSWORD || "";

  const database = process.env.PGDATABASE || process.env.DB_NAME;

  const port = Number(process.env.PGPORT || process.env.DB_PORT || 5432);

  const missing = [];

  if (!host) {
    missing.push("PGHOST / DB_HOST");
  }

  if (!user) {
    missing.push("PGUSER / DB_USER");
  }

  if (!database) {
    missing.push("PGDATABASE / DB_NAME");
  }

  if (missing.length > 0) {
    throw new Error(
      "Database configuration is missing. " +
        "Set DATABASE_URL from Neon. Missing: " +
        missing.join(", "),
    );
  }

  const local = host === "localhost" || host === "127.0.0.1";

  return {
    host,

    port,

    user,

    password,

    database,

    ssl: local
      ? false
      : {
          rejectUnauthorized: false,
        },

    max: getNumberEnv("DB_POOL_MAX", 5),

    idleTimeoutMillis: getNumberEnv("DB_IDLE_TIMEOUT", 10000),

    connectionTimeoutMillis: getNumberEnv("DB_CONNECTION_TIMEOUT", 10000),

    allowExitOnIdle: true,

    application_name: "online-complaint-management-portal",
  };
}

/* =========================================================
   CREATE / REUSE CONNECTION POOL
   ========================================================= */

/*
 * Reuse the PostgreSQL pool in development/serverless
 * environments whenever the runtime remains warm.
 */

const GLOBAL_POOL_KEY = "__onlineComplaintPortalPostgresPool";

function createPool() {
  return new Pool(buildPoolConfig());
}

if (!globalThis[GLOBAL_POOL_KEY]) {
  globalThis[GLOBAL_POOL_KEY] = createPool();

  globalThis[GLOBAL_POOL_KEY].on("error", (error) => {
    console.error("POSTGRES POOL ERROR:", error);
  });
}

const pool = globalThis[GLOBAL_POOL_KEY];

/* =========================================================
   SQL PLACEHOLDER CONVERTER
   ========================================================= */

/*
 * Existing project controllers use MySQL-style:
 *
 * WHERE email = ?
 * AND user_id = ?
 *
 * PostgreSQL needs:
 *
 * WHERE email = $1
 * AND user_id = $2
 *
 * This function performs that conversion automatically.
 *
 * It avoids replacing question marks inside:
 * - single quoted strings
 * - double quoted identifiers
 * - line comments
 * - block comments
 */

function convertPlaceholders(sql) {
  if (typeof sql !== "string") {
    throw new TypeError("SQL must be a string.");
  }

  let result = "";

  let parameterIndex = 1;

  let inSingleQuote = false;

  let inDoubleQuote = false;

  let inLineComment = false;

  let inBlockComment = false;

  for (let i = 0; i < sql.length; i++) {
    const char = sql[i];

    const next = sql[i + 1];

    /*
     * ---------------------------------------------
     * LINE COMMENT
     * ---------------------------------------------
     */

    if (inLineComment) {
      result += char;

      if (char === "\n") {
        inLineComment = false;
      }

      continue;
    }

    /*
     * ---------------------------------------------
     * BLOCK COMMENT
     * ---------------------------------------------
     */

    if (inBlockComment) {
      result += char;

      if (char === "*" && next === "/") {
        result += next;

        i++;

        inBlockComment = false;
      }

      continue;
    }

    /*
     * ---------------------------------------------
     * START COMMENT
     * ---------------------------------------------
     */

    if (!inSingleQuote && !inDoubleQuote && char === "-" && next === "-") {
      result += "--";

      i++;

      inLineComment = true;

      continue;
    }

    if (!inSingleQuote && !inDoubleQuote && char === "/" && next === "*") {
      result += "/*";

      i++;

      inBlockComment = true;

      continue;
    }

    /*
     * ---------------------------------------------
     * SINGLE QUOTED STRING
     * ---------------------------------------------
     */

    if (char === "'" && !inDoubleQuote) {
      /*
       * PostgreSQL escaped single quote:
       * ''
       */

      if (inSingleQuote && next === "'") {
        result += "''";

        i++;

        continue;
      }

      inSingleQuote = !inSingleQuote;

      result += char;

      continue;
    }

    /*
     * ---------------------------------------------
     * DOUBLE QUOTED IDENTIFIER
     * ---------------------------------------------
     */

    if (char === '"' && !inSingleQuote) {
      if (inDoubleQuote && next === '"') {
        result += '""';

        i++;

        continue;
      }

      inDoubleQuote = !inDoubleQuote;

      result += char;

      continue;
    }

    /*
     * ---------------------------------------------
     * QUESTION MARK PLACEHOLDER
     * ---------------------------------------------
     */

    if (char === "?" && !inSingleQuote && !inDoubleQuote) {
      result += `$${parameterIndex}`;

      parameterIndex++;

      continue;
    }

    result += char;
  }

  return result;
}

/* =========================================================
   REMOVE ENDING SEMICOLON
   ========================================================= */

function removeEndingSemicolon(sql) {
  return String(sql).trim().replace(/;\s*$/, "");
}

/* =========================================================
   SQL COMMAND DETECTION
   ========================================================= */

function getSqlCommand(sql) {
  const cleaned = String(sql || "")
    .trim()
    .replace(/^\/\*[\s\S]*?\*\//, "")
    .trim();

  const match = cleaned.match(/^([a-zA-Z]+)/);

  return match ? match[1].toUpperCase() : "";
}

/* =========================================================
   DETECT RETURNING
   ========================================================= */

function hasReturningClause(sql) {
  return /\bRETURNING\b/i.test(String(sql));
}

/* =========================================================
   PRIMARY KEY MAP
   ========================================================= */

const PRIMARY_KEYS = {
  users: "user_id",

  departments: "department_id",

  categories: "category_id",

  complaints: "complaint_id",

  complaint_status_history: "history_id",

  feedback: "feedback_id",

  contact_messages: "message_id",
};

/* =========================================================
   GET INSERT TABLE NAME
   ========================================================= */

function getInsertTableName(sql) {
  const match = String(sql || "").match(
    /\bINSERT\s+INTO\s+(?:"?([a-zA-Z_][a-zA-Z0-9_]*)"?\.)?"?([a-zA-Z_][a-zA-Z0-9_]*)"?/i,
  );

  if (!match) {
    return null;
  }

  return match[2] || match[1] || null;
}

/* =========================================================
   ADD RETURNING TO INSERT
   ========================================================= */

function ensureInsertReturning(sql) {
  const command = getSqlCommand(sql);

  if (command !== "INSERT" || hasReturningClause(sql)) {
    return sql;
  }

  const table = getInsertTableName(sql);

  const primaryKey = table ? PRIMARY_KEYS[table.toLowerCase()] : null;

  const clean = removeEndingSemicolon(sql);

  if (primaryKey) {
    return clean + ` RETURNING ${primaryKey}`;
  }

  /*
   * Generic fallback.
   */

  return clean + " RETURNING *";
}

/* =========================================================
   FIND INSERT ID
   ========================================================= */

function extractInsertId(sql, rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return null;
  }

  const row = rows[0];

  const table = getInsertTableName(sql);

  if (table) {
    const primaryKey = PRIMARY_KEYS[table.toLowerCase()];

    if (primaryKey && row[primaryKey] !== undefined) {
      const value = row[primaryKey];

      const numeric = Number(value);

      return Number.isSafeInteger(numeric) ? numeric : value;
    }
  }

  /*
   * Generic fallback:
   * find first field ending with "_id".
   */

  const idKey = Object.keys(row).find(
    (key) => key === "id" || key.endsWith("_id"),
  );

  if (!idKey) {
    return null;
  }

  const value = row[idKey];

  const numeric = Number(value);

  return Number.isSafeInteger(numeric) ? numeric : value;
}

/* =========================================================
   POSTGRES RESULT -> MYSQL COMPATIBILITY RESULT
   ========================================================= */

function createCompatibilityResult(pgResult, originalSql) {
  const command = String(
    pgResult.command || getSqlCommand(originalSql),
  ).toUpperCase();

  const rowCount = Number(pgResult.rowCount || 0);

  const result = {
    command,

    rowCount,

    rows: pgResult.rows || [],

    affectedRows: rowCount,

    changedRows: rowCount,

    warningStatus: 0,

    insertId: null,
  };

  if (command === "INSERT") {
    result.insertId = extractInsertId(originalSql, pgResult.rows);
  }

  return result;
}

/* =========================================================
   EXECUTE RAW POSTGRES QUERY
   ========================================================= */

async function executePg(executor, sql, params = [], options = {}) {
  if (typeof sql !== "string" || !sql.trim()) {
    throw new Error("SQL query must be a non-empty string.");
  }

  if (!Array.isArray(params)) {
    throw new TypeError("SQL parameters must be an array.");
  }

  let queryText = sql;

  if (options.ensureInsertId) {
    queryText = ensureInsertReturning(queryText);
  }

  queryText = convertPlaceholders(queryText);

  try {
    return await executor.query(queryText, params);
  } catch (error) {
    console.error("POSTGRES QUERY ERROR:", {
      code: error.code,

      severity: error.severity,

      detail: error.detail,

      constraint: error.constraint,

      message: error.message,
    });

    throw error;
  }
}

/* =========================================================
   QUERY
   ========================================================= */

/*
 * Used mainly for SELECT queries.
 *
 * Example:
 *
 * const users = await db.query(
 *     "SELECT * FROM users WHERE role = ?",
 *     ["user"]
 * );
 */

async function query(sql, params = []) {
  const result = await executePg(pool, sql, params);

  return result.rows;
}

/* =========================================================
   EXECUTE
   ========================================================= */

/*
 * Returns a MySQL-compatible result object:
 *
 * {
 *     insertId,
 *     affectedRows,
 *     changedRows,
 *     rows
 * }
 */

async function execute(sql, params = []) {
  const command = getSqlCommand(sql);

  const result = await executePg(pool, sql, params, {
    ensureInsertId: command === "INSERT",
  });

  return createCompatibilityResult(result, sql);
}

/* =========================================================
   GET SINGLE ROW
   ========================================================= */

async function getOne(sql, params = []) {
  const rows = await query(sql, params);

  if (!Array.isArray(rows) || rows.length === 0) {
    return null;
  }

  return rows[0];
}

/* =========================================================
   CHECK IF RECORD EXISTS
   ========================================================= */

async function exists(sql, params = []) {
  const row = await getOne(sql, params);

  return Boolean(row);
}

/* =========================================================
   INSERT HELPER
   ========================================================= */

/*
 * Compatible with existing controllers:
 *
 * const result = await db.insert(...);
 *
 * result.insertId
 */

async function insert(sql, params = []) {
  const result = await execute(sql, params);

  return {
    insertId: result.insertId,

    affectedRows: result.affectedRows,

    warningStatus: 0,

    rows: result.rows,
  };
}

/* =========================================================
   UPDATE / DELETE HELPER
   ========================================================= */

async function modify(sql, params = []) {
  const result = await execute(sql, params);

  return {
    affectedRows: result.affectedRows,

    changedRows: result.changedRows,

    warningStatus: 0,

    rows: result.rows,
  };
}

/* =========================================================
   CREATE CONNECTION WRAPPER
   ========================================================= */

/*
 * Existing complaintController.js uses:
 *
 * const [result] =
 *     await connection.execute(...)
 *
 * This wrapper preserves that syntax.
 */

function createConnectionWrapper(client) {
  return {
    /* -------------------------------------------------
           MYSQL-COMPATIBLE EXECUTE
           ------------------------------------------------- */

    async execute(sql, params = []) {
      const command = getSqlCommand(sql);

      const pgResult = await executePg(client, sql, params, {
        ensureInsertId: command === "INSERT",
      });

      if (command === "SELECT") {
        /*
         * mysql2 format:
         *
         * const [rows] =
         *     await connection.execute(...)
         */

        return [pgResult.rows, []];
      }

      const result = createCompatibilityResult(pgResult, sql);

      /*
       * mysql2 write format:
       *
       * const [result] =
       *     await connection.execute(...)
       */

      return [result, []];
    },

    /* -------------------------------------------------
           QUERY
           ------------------------------------------------- */

    async query(sql, params = []) {
      const pgResult = await executePg(client, sql, params);

      return [pgResult.rows, []];
    },

    /* -------------------------------------------------
           BEGIN TRANSACTION
           ------------------------------------------------- */

    async beginTransaction() {
      await client.query("BEGIN");
    },

    /* -------------------------------------------------
           COMMIT
           ------------------------------------------------- */

    async commit() {
      await client.query("COMMIT");
    },

    /* -------------------------------------------------
           ROLLBACK
           ------------------------------------------------- */

    async rollback() {
      await client.query("ROLLBACK");
    },

    /* -------------------------------------------------
           RELEASE
           ------------------------------------------------- */

    release() {
      client.release();
    },

    /*
     * Raw PostgreSQL client if ever needed.
     */

    rawClient: client,
  };
}

/* =========================================================
   TRANSACTION HELPER
   ========================================================= */

/*
 * Existing controllers already use:
 *
 * await db.transaction(
 *     async connection => {
 *
 *         const [result] =
 *             await connection.execute(
 *                 "INSERT INTO ... VALUES (?, ?)",
 *                 [value1, value2]
 *             );
 *
 *         return result.insertId;
 *     }
 * );
 */

async function transaction(callback) {
  if (typeof callback !== "function") {
    throw new TypeError("Transaction callback must be a function.");
  }

  const client = await pool.connect();

  const connection = createConnectionWrapper(client);

  try {
    await client.query("BEGIN");

    const result = await callback(connection);

    await client.query("COMMIT");

    return result;
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      console.error("POSTGRES ROLLBACK ERROR:", rollbackError);
    }

    throw error;
  } finally {
    client.release();
  }
}

/* =========================================================
   GET CONNECTION
   ========================================================= */

async function getConnection() {
  const client = await pool.connect();

  return createConnectionWrapper(client);
}

/* =========================================================
   DATABASE CONNECTION TEST
   ========================================================= */

async function testConnection() {
  try {
    const result = await pool.query(
      `
                SELECT
                    1 AS database_test,
                    CURRENT_TIMESTAMP AS server_time
                `,
    );

    return {
      success: true,

      message: "PostgreSQL / Neon database connected successfully.",

      server_time: result.rows[0]?.server_time || null,
    };
  } catch (error) {
    console.error("POSTGRES CONNECTION ERROR:", error);

    return {
      success: false,

      message: error.message,
    };
  }
}

/* =========================================================
   PING DATABASE
   ========================================================= */

async function ping() {
  const result = await pool.query(
    `
            SELECT

                CURRENT_TIMESTAMP
                    AS server_time,

                CURRENT_DATABASE()
                    AS database_name,

                VERSION()
                    AS postgres_version
            `,
  );

  return result.rows[0] || null;
}

/* =========================================================
   DATABASE INFORMATION
   ========================================================= */

async function databaseInfo() {
  const result = await pool.query(
    `
            SELECT

                CURRENT_DATABASE()
                    AS database_name,

                CURRENT_USER
                    AS database_user,

                CURRENT_TIMESTAMP
                    AS server_time,

                VERSION()
                    AS postgres_version
            `,
  );

  return result.rows[0] || null;
}

/* =========================================================
   HEALTH CHECK
   ========================================================= */

async function healthCheck() {
  try {
    const start = Date.now();

    await pool.query("SELECT 1");

    const duration = Date.now() - start;

    return {
      healthy: true,

      database: "PostgreSQL",

      provider: "Neon",

      response_time_ms: duration,
    };
  } catch (error) {
    return {
      healthy: false,

      database: "PostgreSQL",

      provider: "Neon",

      error: error.message,
    };
  }
}

/* =========================================================
   CLOSE DATABASE
   ========================================================= */

/*
 * IMPORTANT:
 *
 * Normally DO NOT call db.close() inside an API request.
 *
 * The connection pool must remain available for subsequent
 * Vercel requests.
 *
 * This method is mainly useful in command-line scripts.
 */

async function close() {
  const activePool = globalThis[GLOBAL_POOL_KEY];

  if (!activePool) {
    return;
  }

  try {
    await activePool.end();
  } finally {
    delete globalThis[GLOBAL_POOL_KEY];
  }
}

/* =========================================================
   POSTGRES ERROR HELPERS
   ========================================================= */

function isUniqueViolation(error) {
  return error?.code === "23505";
}

function isForeignKeyViolation(error) {
  return error?.code === "23503";
}

function isNotNullViolation(error) {
  return error?.code === "23502";
}

function isCheckViolation(error) {
  return error?.code === "23514";
}

/* =========================================================
   EXPORTS
   ========================================================= */

module.exports = {
  /* Main PostgreSQL pool */

  pool,

  /* Query helpers */

  query,

  execute,

  getOne,

  exists,

  insert,

  modify,

  /* Transaction helpers */

  transaction,

  getConnection,

  /* Connection checks */

  testConnection,

  ping,

  databaseInfo,

  healthCheck,

  /* SQL compatibility helpers */

  convertPlaceholders,

  getSqlCommand,

  ensureInsertReturning,

  /* PostgreSQL error helpers */

  isUniqueViolation,

  isForeignKeyViolation,

  isNotNullViolation,

  isCheckViolation,

  /* Shutdown */

  close,
};
