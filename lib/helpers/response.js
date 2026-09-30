/* =========================================================
   ONLINE COMPLAINT MANAGEMENT PORTAL
   API Response Helpers
   File: lib/helpers/response.js
   ========================================================= */

"use strict";

/* =========================================================
   CHECK WHETHER RESPONSE WAS ALREADY SENT
   ========================================================= */

function isResponseSent(res) {
  if (!res) {
    return true;
  }

  return Boolean(res.writableEnded || res.headersSent);
}

/* =========================================================
   SET JSON CONTENT TYPE
   ========================================================= */

function setJsonHeader(res) {
  if (!res) {
    return;
  }

  if (!res.headersSent) {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
  }
}

/* =========================================================
   SEND JSON RESPONSE
   ========================================================= */

function json(res, statusCode, data) {
  if (!res) {
    throw new Error("Response object is required.");
  }

  if (isResponseSent(res)) {
    return;
  }

  const code = Number(statusCode);

  res.statusCode = Number.isInteger(code) ? code : 200;

  setJsonHeader(res);

  const payload = data === undefined ? {} : data;

  res.end(JSON.stringify(payload));
}

/* =========================================================
   SUCCESS RESPONSE
   ========================================================= */

function success(res, data = {}, statusCode = 200) {
  const payload = {
    success: true,
  };

  if (data && typeof data === "object" && !Array.isArray(data)) {
    Object.assign(payload, data);
  } else {
    payload.data = data;
  }

  return json(res, statusCode, payload);
}

/* =========================================================
   ERROR RESPONSE
   ========================================================= */

function error(
  res,
  statusCode = 500,
  message = "Internal server error.",
  extra = {},
) {
  const payload = {
    success: false,
    message: String(message || "Internal server error."),
  };

  if (extra && typeof extra === "object" && !Array.isArray(extra)) {
    Object.assign(payload, extra);
  }

  return json(res, statusCode, payload);
}

/* =========================================================
   CREATED RESPONSE
   ========================================================= */

function created(res, data = {}) {
  return success(res, data, 201);
}

/* =========================================================
   NO CONTENT RESPONSE
   ========================================================= */

function noContent(res) {
  if (!res || isResponseSent(res)) {
    return;
  }

  res.statusCode = 204;

  res.end();
}

/* =========================================================
   BAD REQUEST
   ========================================================= */

function badRequest(res, message = "Bad request.", extra = {}) {
  return error(res, 400, message, extra);
}

/* =========================================================
   UNAUTHORIZED
   ========================================================= */

function unauthorized(res, message = "Authentication is required.") {
  return error(res, 401, message);
}

/* =========================================================
   FORBIDDEN
   ========================================================= */

function forbidden(
  res,
  message = "You do not have permission to access this resource.",
) {
  return error(res, 403, message);
}

/* =========================================================
   NOT FOUND
   ========================================================= */

function notFound(res, message = "Requested resource was not found.") {
  return error(res, 404, message);
}

/* =========================================================
   CONFLICT
   ========================================================= */

function conflict(res, message = "Resource already exists.") {
  return error(res, 409, message);
}

/* =========================================================
   METHOD NOT ALLOWED
   ========================================================= */

function methodNotAllowed(res, allowedMethods = []) {
  if (Array.isArray(allowedMethods) && allowedMethods.length) {
    res.setHeader("Allow", allowedMethods.join(", "));
  }

  return error(res, 405, "HTTP method not allowed.");
}

/* =========================================================
   VALIDATION ERROR RESPONSE
   ========================================================= */

function validationError(res, errors, message = "Validation failed.") {
  return error(res, 422, message, {
    errors: errors || {},
  });
}

/* =========================================================
   INTERNAL SERVER ERROR
   ========================================================= */

function serverError(res, err = null) {
  if (err) {
    console.error("SERVER ERROR:", err);
  }

  const production = process.env.NODE_ENV === "production";

  const message = production
    ? "Internal server error."
    : err?.message || "Internal server error.";

  return error(res, 500, message);
}

/* =========================================================
   HANDLE CONTROLLER ERROR
   ========================================================= */

function handleError(res, err) {
  if (isResponseSent(res)) {
    return;
  }

  console.error("REQUEST ERROR:", err);

  const statusCode = Number(err?.statusCode || err?.status || 500);

  let message = err?.message || "Internal server error.";

  if (process.env.NODE_ENV === "production" && statusCode >= 500) {
    message = "Internal server error.";
  }

  const extra = {};

  if (err?.errors && typeof err.errors === "object") {
    extra.errors = err.errors;
  }

  return error(res, statusCode, message, extra);
}

/* =========================================================
   ASYNC HANDLER WRAPPER
   ========================================================= */

/*
   Example:

   const {
       asyncHandler
   } = require("../helpers/response");

   const handler = asyncHandler(
       async (req, res) => {

           const data = await doSomething();

           return success(
               res,
               { data }
           );
       }
   );
*/

function asyncHandler(handler) {
  if (typeof handler !== "function") {
    throw new TypeError("asyncHandler expects a function.");
  }

  return async function wrappedHandler(req, res) {
    try {
      return await handler(req, res);
    } catch (err) {
      return handleError(res, err);
    }
  };
}

/* =========================================================
   CONTROLLER RESULT HANDLER
   ========================================================= */

/*
   Controllers in this project normally return an object.

   Example:

   const result =
       await controller(req, res);

   sendControllerResult(
       res,
       result
   );
*/

function sendControllerResult(res, result, statusCode = 200) {
  if (isResponseSent(res)) {
    return;
  }

  if (result === undefined) {
    return success(res, {}, statusCode);
  }

  if (result !== null && typeof result === "object" && !Array.isArray(result)) {
    return success(res, result, statusCode);
  }

  return success(
    res,
    {
      data: result,
    },
    statusCode,
  );
}

/* =========================================================
   EXPORTS
   ========================================================= */

module.exports = {
  json,

  success,

  created,

  noContent,

  error,

  badRequest,

  unauthorized,

  forbidden,

  notFound,

  conflict,

  methodNotAllowed,

  validationError,

  serverError,

  handleError,

  asyncHandler,

  sendControllerResult,

  isResponseSent,
};
