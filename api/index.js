/* =========================================================
   ONLINE COMPLAINT MANAGEMENT PORTAL
   Main API Entry Point
   File: api/index.js

   This file acts as the central API router for:
   - Authentication
   - User complaints
   - Staff complaints
   - Admin management
   - Categories
   - Departments
   - Staff
   - Profiles
   - Feedback
   - Contact messages
   - Reports
   ========================================================= */

"use strict";

/* =========================================================
   CONTROLLERS
   ========================================================= */

const authController = require("../lib/controllers/authController");
const complaintController = require("../lib/controllers/complaintController");
const categoryController = require("../lib/controllers/categoryController");
const departmentController = require("../lib/controllers/departmentController");
const staffController = require("../lib/controllers/staffController");
const feedbackController = require("../lib/controllers/feedbackController");
const profileController = require("../lib/controllers/profileController");
const contactController = require("../lib/controllers/contactController");
const adminController = require("../lib/controllers/adminController");

/* =========================================================
   AUTHENTICATION MIDDLEWARE
   ========================================================= */

const { authenticate, requireRole } = require("../lib/auth");

/* =========================================================
   CORS
   ========================================================= */

function setCorsHeaders(req, res) {
  const allowedOrigin = process.env.FRONTEND_URL || process.env.APP_URL || "*";

  const requestOrigin = req.headers.origin || "";

  /*
   * If FRONTEND_URL is provided, allow that URL.
   * Otherwise allow all origins during development.
   */
  if (allowedOrigin === "*") {
    res.setHeader("Access-Control-Allow-Origin", "*");
  } else if (requestOrigin === allowedOrigin || !requestOrigin) {
    res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
  }

  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  );

  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With",
  );

  res.setHeader("Access-Control-Max-Age", "86400");
}

/* =========================================================
   SECURITY HEADERS
   ========================================================= */

function setSecurityHeaders(res) {
  res.setHeader("X-Content-Type-Options", "nosniff");

  res.setHeader("X-Frame-Options", "SAMEORIGIN");

  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

  res.setHeader("Cache-Control", "no-store");
}

/* =========================================================
   JSON RESPONSE HELPERS
   ========================================================= */

function sendJson(res, statusCode, data) {
  if (res.writableEnded) {
    return;
  }

  res.statusCode = statusCode;

  res.setHeader("Content-Type", "application/json; charset=utf-8");

  res.end(JSON.stringify(data));
}

function sendSuccess(res, data = {}, statusCode = 200) {
  sendJson(res, statusCode, {
    success: true,
    ...data,
  });
}

function sendError(res, statusCode, message, extra = {}) {
  sendJson(res, statusCode, {
    success: false,
    message,
    ...extra,
  });
}

/* =========================================================
   URL / PATH HELPERS
   ========================================================= */

function getRequestUrl(req) {
  const host = req.headers.host || "localhost";

  const protocol = req.headers["x-forwarded-proto"] || "http";

  return new URL(req.url, `${protocol}://${host}`);
}

function normalizePath(pathname) {
  let path = pathname || "/";

  /*
   * Remove /api prefix because this file itself
   * is inside the /api directory.
   */

  if (path === "/api") {
    path = "/";
  } else if (path.startsWith("/api/")) {
    path = path.substring(4);
  }

  /*
   * Remove trailing slash except root.
   */

  if (path.length > 1 && path.endsWith("/")) {
    path = path.slice(0, -1);
  }

  return path;
}

function getQueryObject(url) {
  const query = {};

  for (const [key, value] of url.searchParams.entries()) {
    /*
     * Support repeated query parameters.
     */

    if (Object.prototype.hasOwnProperty.call(query, key)) {
      if (!Array.isArray(query[key])) {
        query[key] = [query[key]];
      }

      query[key].push(value);
    } else {
      query[key] = value;
    }
  }

  return query;
}

/* =========================================================
   ROUTE MATCHING
   ========================================================= */

function matchRoute(pattern, path) {
  const match = path.match(pattern);

  if (!match) {
    return null;
  }

  return match;
}

/* =========================================================
   AUTHORIZATION
   ========================================================= */

async function protectRoute(req, role = null) {
  /*
   * authenticate() should:
   *
   * 1. Read Authorization: Bearer TOKEN
   * 2. Verify token
   * 3. Load user
   * 4. Set req.user
   */

  await authenticate(req);

  if (role) {
    requireRole(req, role);
  }
}

/* =========================================================
   RUN CONTROLLER
   ========================================================= */

async function runController(controller, req, res) {
  if (typeof controller !== "function") {
    throw Object.assign(new Error("API controller is not implemented."), {
      statusCode: 500,
    });
  }

  const result = await controller(req, res);

  /*
   * Controllers may either:
   *
   * 1. Send response themselves, or
   * 2. Return an object.
   */

  if (!res.writableEnded && !res.headersSent && result !== undefined) {
    sendSuccess(
      res,
      typeof result === "object"
        ? result
        : {
            data: result,
          },
    );
  }
}

/* =========================================================
   MAIN API HANDLER
   ========================================================= */

async function handler(req, res) {
  /* -----------------------------------------------------
       CORS + SECURITY
       ----------------------------------------------------- */

  setCorsHeaders(req, res);

  setSecurityHeaders(res);

  /* -----------------------------------------------------
       OPTIONS PREFLIGHT
       ----------------------------------------------------- */

  if (req.method === "OPTIONS") {
    res.statusCode = 204;

    return res.end();
  }

  /* -----------------------------------------------------
       REQUEST INFORMATION
       ----------------------------------------------------- */

  const method = String(req.method || "GET").toUpperCase();

  const requestUrl = getRequestUrl(req);

  const path = normalizePath(requestUrl.pathname);

  /*
   * Make query parameters available
   * to controllers.
   */

  req.query = getQueryObject(requestUrl);

  req.params = {};

  try {
    /* =================================================
           HEALTH CHECK
           ================================================= */

    if (method === "GET" && path === "/") {
      return sendSuccess(res, {
        message: "Online Complaint Management Portal API is running.",
        service: "online-complaint-management-portal",
        version: "1.0.0",
      });
    }

    if (method === "GET" && path === "/health") {
      return sendSuccess(res, {
        status: "healthy",
        timestamp: new Date().toISOString(),
      });
    }

    /* =================================================
           AUTHENTICATION ROUTES
           ================================================= */

    /* -------------------------------------------------
           USER / STAFF / ADMIN LOGIN

           POST /api/auth/login
           ------------------------------------------------- */

    if (method === "POST" && path === "/auth/login") {
      return runController(authController.login, req, res);
    }

    /* -------------------------------------------------
           USER REGISTRATION

           POST /api/auth/register
           ------------------------------------------------- */

    if (method === "POST" && path === "/auth/register") {
      return runController(authController.register, req, res);
    }

    /* -------------------------------------------------
           LOGOUT

           POST /api/auth/logout
           ------------------------------------------------- */

    if (method === "POST" && path === "/auth/logout") {
      /*
       * Logout works with or without token because
       * frontend also clears local storage.
       */

      return runController(authController.logout, req, res);
    }

    /* -------------------------------------------------
           FORGOT PASSWORD

           POST /api/auth/forgot-password
           ------------------------------------------------- */

    if (method === "POST" && path === "/auth/forgot-password") {
      return runController(authController.forgotPassword, req, res);
    }

    /* =================================================
           PUBLIC CONTACT
           ================================================= */

    /* -------------------------------------------------
           SUBMIT CONTACT MESSAGE

           POST /api/contact
           ------------------------------------------------- */

    if (method === "POST" && path === "/contact") {
      return runController(contactController.submitContact, req, res);
    }

    /* =================================================
           PROFILE
           ================================================= */

    /* -------------------------------------------------
           GET PROFILE

           GET /api/profile
           ------------------------------------------------- */

    if (method === "GET" && path === "/profile") {
      await protectRoute(req);

      return runController(profileController.getProfile, req, res);
    }

    /* -------------------------------------------------
           UPDATE PROFILE

           PUT /api/profile
           ------------------------------------------------- */

    if (method === "PUT" && path === "/profile") {
      await protectRoute(req);

      return runController(profileController.updateProfile, req, res);
    }

    /* =================================================
           CATEGORIES
           ================================================= */

    /* -------------------------------------------------
           LIST CATEGORIES

           GET /api/categories

           User, Staff and Admin may read categories.
           ------------------------------------------------- */

    if (method === "GET" && path === "/categories") {
      await protectRoute(req);

      return runController(categoryController.listCategories, req, res);
    }

    /* -------------------------------------------------
           CREATE CATEGORY

           POST /api/categories
           ------------------------------------------------- */

    if (method === "POST" && path === "/categories") {
      await protectRoute(req, "admin");

      return runController(categoryController.createCategory, req, res);
    }

    /* -------------------------------------------------
           CATEGORY BY ID
           ------------------------------------------------- */

    let match = matchRoute(/^\/categories\/(\d+)$/, path);

    if (match) {
      req.params.categoryId = Number(match[1]);

      /*
       * PUT /api/categories/:id
       */

      if (method === "PUT") {
        await protectRoute(req, "admin");

        return runController(categoryController.updateCategory, req, res);
      }

      /*
       * DELETE /api/categories/:id
       */

      if (method === "DELETE") {
        await protectRoute(req, "admin");

        return runController(categoryController.deleteCategory, req, res);
      }
    }

    /* =================================================
           DEPARTMENTS
           ================================================= */

    /* -------------------------------------------------
           LIST DEPARTMENTS

           GET /api/departments
           ------------------------------------------------- */

    if (method === "GET" && path === "/departments") {
      await protectRoute(req);

      return runController(departmentController.listDepartments, req, res);
    }

    /* -------------------------------------------------
           CREATE DEPARTMENT

           POST /api/departments
           ------------------------------------------------- */

    if (method === "POST" && path === "/departments") {
      await protectRoute(req, "admin");

      return runController(departmentController.createDepartment, req, res);
    }

    /* -------------------------------------------------
           DEPARTMENT BY ID
           ------------------------------------------------- */

    match = matchRoute(/^\/departments\/(\d+)$/, path);

    if (match) {
      req.params.departmentId = Number(match[1]);

      /*
       * PUT /api/departments/:id
       */

      if (method === "PUT") {
        await protectRoute(req, "admin");

        return runController(departmentController.updateDepartment, req, res);
      }

      /*
       * DELETE /api/departments/:id
       */

      if (method === "DELETE") {
        await protectRoute(req, "admin");

        return runController(departmentController.deleteDepartment, req, res);
      }
    }

    /* =================================================
           USER DASHBOARD
           ================================================= */

    /* -------------------------------------------------
           GET USER DASHBOARD

           GET /api/user/dashboard
           ------------------------------------------------- */

    if (method === "GET" && path === "/user/dashboard") {
      await protectRoute(req, "user");

      return runController(complaintController.userDashboard, req, res);
    }

    /* =================================================
           USER COMPLAINTS
           ================================================= */

    /* -------------------------------------------------
           GET USER COMPLAINTS

           GET /api/complaints
           ------------------------------------------------- */

    if (method === "GET" && path === "/complaints") {
      await protectRoute(req, "user");

      return runController(complaintController.listUserComplaints, req, res);
    }

    /* -------------------------------------------------
           CREATE COMPLAINT

           POST /api/complaints

           Supports multipart/form-data for image uploads.
           Body should NOT be consumed in this router.
           complaintController handles upload parsing.
           ------------------------------------------------- */

    if (method === "POST" && path === "/complaints") {
      await protectRoute(req, "user");

      return runController(complaintController.createComplaint, req, res);
    }

    /* -------------------------------------------------
           COMPLAINT STATUS HISTORY

           GET /api/complaints/:id/status
           ------------------------------------------------- */

    match = matchRoute(/^\/complaints\/(\d+)\/status$/, path);

    if (match && method === "GET") {
      req.params.complaintId = Number(match[1]);

      await protectRoute(req, "user");

      return runController(
        complaintController.getUserComplaintStatus,
        req,
        res,
      );
    }

    /* -------------------------------------------------
           SINGLE USER COMPLAINT

           GET /api/complaints/:id
           ------------------------------------------------- */

    match = matchRoute(/^\/complaints\/(\d+)$/, path);

    if (match && method === "GET") {
      req.params.complaintId = Number(match[1]);

      await protectRoute(req, "user");

      return runController(complaintController.getUserComplaint, req, res);
    }

    /* =================================================
           FEEDBACK
           ================================================= */

    /* -------------------------------------------------
           SUBMIT FEEDBACK

           POST /api/feedback
           ------------------------------------------------- */

    if (method === "POST" && path === "/feedback") {
      await protectRoute(req, "user");

      return runController(feedbackController.submitFeedback, req, res);
    }

    /* =================================================
           STAFF DASHBOARD
           ================================================= */

    /* -------------------------------------------------
           GET STAFF DASHBOARD

           GET /api/staff/dashboard
           ------------------------------------------------- */

    if (method === "GET" && path === "/staff/dashboard") {
      await protectRoute(req, "staff");

      return runController(complaintController.staffDashboard, req, res);
    }

    /* =================================================
           STAFF COMPLAINTS
           ================================================= */

    /* -------------------------------------------------
           GET ASSIGNED COMPLAINTS

           GET /api/staff/complaints
           ------------------------------------------------- */

    if (method === "GET" && path === "/staff/complaints") {
      await protectRoute(req, "staff");

      return runController(complaintController.listStaffComplaints, req, res);
    }

    /* -------------------------------------------------
           STAFF COMPLAINT HISTORY

           GET /api/staff/complaints/:id/history
           ------------------------------------------------- */

    match = matchRoute(/^\/staff\/complaints\/(\d+)\/history$/, path);

    if (match && method === "GET") {
      req.params.complaintId = Number(match[1]);

      await protectRoute(req, "staff");

      return runController(
        complaintController.getStaffComplaintHistory,
        req,
        res,
      );
    }

    /* -------------------------------------------------
           STAFF STATUS UPDATE

           PUT /api/staff/complaints/:id/status
           ------------------------------------------------- */

    match = matchRoute(/^\/staff\/complaints\/(\d+)\/status$/, path);

    if (match && method === "PUT") {
      req.params.complaintId = Number(match[1]);

      await protectRoute(req, "staff");

      return runController(
        complaintController.updateStaffComplaintStatus,
        req,
        res,
      );
    }

    /* -------------------------------------------------
           SINGLE STAFF COMPLAINT

           GET /api/staff/complaints/:id
           ------------------------------------------------- */

    match = matchRoute(/^\/staff\/complaints\/(\d+)$/, path);

    if (match && method === "GET") {
      req.params.complaintId = Number(match[1]);

      await protectRoute(req, "staff");

      return runController(complaintController.getStaffComplaint, req, res);
    }

    /* =================================================
           ADMIN DASHBOARD
           ================================================= */

    /* -------------------------------------------------
           GET ADMIN DASHBOARD

           GET /api/admin/dashboard
           ------------------------------------------------- */

    if (method === "GET" && path === "/admin/dashboard") {
      await protectRoute(req, "admin");

      return runController(adminController.dashboard, req, res);
    }

    /* =================================================
           ADMIN COMPLAINTS
           ================================================= */

    /* -------------------------------------------------
           LIST ALL COMPLAINTS

           GET /api/admin/complaints
           ------------------------------------------------- */

    if (method === "GET" && path === "/admin/complaints") {
      await protectRoute(req, "admin");

      return runController(complaintController.listAdminComplaints, req, res);
    }

    /* -------------------------------------------------
           ASSIGN COMPLAINT

           PUT /api/admin/complaints/:id/assign
           ------------------------------------------------- */

    match = matchRoute(/^\/admin\/complaints\/(\d+)\/assign$/, path);

    if (match && method === "PUT") {
      req.params.complaintId = Number(match[1]);

      await protectRoute(req, "admin");

      return runController(complaintController.assignComplaint, req, res);
    }

    /* -------------------------------------------------
           ADMIN STATUS UPDATE

           PUT /api/admin/complaints/:id/status
           ------------------------------------------------- */

    match = matchRoute(/^\/admin\/complaints\/(\d+)\/status$/, path);

    if (match && method === "PUT") {
      req.params.complaintId = Number(match[1]);

      await protectRoute(req, "admin");

      return runController(
        complaintController.updateAdminComplaintStatus,
        req,
        res,
      );
    }

    /* -------------------------------------------------
           SINGLE ADMIN COMPLAINT

           GET /api/admin/complaints/:id
           ------------------------------------------------- */

    match = matchRoute(/^\/admin\/complaints\/(\d+)$/, path);

    if (match && method === "GET") {
      req.params.complaintId = Number(match[1]);

      await protectRoute(req, "admin");

      return runController(complaintController.getAdminComplaint, req, res);
    }

    /* =================================================
           ADMIN USERS
           ================================================= */

    /* -------------------------------------------------
           LIST USERS

           GET /api/admin/users
           ------------------------------------------------- */

    if (method === "GET" && path === "/admin/users") {
      await protectRoute(req, "admin");

      return runController(adminController.listUsers, req, res);
    }

    /* -------------------------------------------------
           USER DETAILS

           GET /api/admin/users/:id
           ------------------------------------------------- */

    match = matchRoute(/^\/admin\/users\/(\d+)$/, path);

    if (match && method === "GET") {
      req.params.userId = Number(match[1]);

      await protectRoute(req, "admin");

      return runController(adminController.getUserDetails, req, res);
    }

    /* =================================================
           ADMIN STAFF
           ================================================= */

    /* -------------------------------------------------
           LIST STAFF

           GET /api/admin/staff
           ------------------------------------------------- */

    if (method === "GET" && path === "/admin/staff") {
      await protectRoute(req, "admin");

      return runController(staffController.listStaff, req, res);
    }

    /* -------------------------------------------------
           CREATE STAFF ACCOUNT

           POST /api/admin/staff
           ------------------------------------------------- */

    if (method === "POST" && path === "/admin/staff") {
      await protectRoute(req, "admin");

      return runController(staffController.createStaff, req, res);
    }

    /* =================================================
           ADMIN REPORTS
           ================================================= */

    /* -------------------------------------------------
           GET REPORTS

           GET /api/admin/reports
           ------------------------------------------------- */

    if (method === "GET" && path === "/admin/reports") {
      await protectRoute(req, "admin");

      return runController(adminController.reports, req, res);
    }

    /* =================================================
           ADMIN CONTACT MESSAGES
           ================================================= */

    /* -------------------------------------------------
           LIST CONTACT MESSAGES

           GET /api/admin/messages
           ------------------------------------------------- */

    if (method === "GET" && path === "/admin/messages") {
      await protectRoute(req, "admin");

      return runController(contactController.listMessages, req, res);
    }

    /* -------------------------------------------------
           SINGLE CONTACT MESSAGE

           GET /api/admin/messages/:id
           ------------------------------------------------- */

    match = matchRoute(/^\/admin\/messages\/(\d+)$/, path);

    if (match && method === "GET") {
      req.params.messageId = Number(match[1]);

      await protectRoute(req, "admin");

      return runController(contactController.getMessage, req, res);
    }

    /* =================================================
           ROUTE NOT FOUND
           ================================================= */

    return sendError(res, 404, `API route not found: ${method} ${path}`);
  } catch (error) {
    /* =================================================
           GLOBAL ERROR HANDLER
           ================================================= */

    console.error("API ERROR:", {
  message: error.message,
  stack: error.stack,
  code: error.code,
  detail: error.detail,
});

return res.status(error.statusCode || 500).json({
  message:
    process.env.NODE_ENV === "production"
      ? error.statusCode
        ? error.message
        : "A server error occurred."
      : error.message,
});

    /*
     * Controllers / authentication middleware can
     * set error.statusCode.
     */

    const statusCode = Number(error.statusCode || error.status || 500);

    /*
     * Do not expose database/server details in
     * production.
     */

    let message = error.message || "Internal server error.";

    if (process.env.NODE_ENV === "production" && statusCode >= 500) {
      message = "Internal server error.";
    }

    return sendError(res, statusCode, message);
  }
}

/* =========================================================
   EXPORT FOR VERCEL SERVERLESS FUNCTION
   ========================================================= */

module.exports = handler;

/* =========================================================
   ALSO EXPORT HANDLER FOR LOCAL TESTING
   ========================================================= */

module.exports.handler = handler;
