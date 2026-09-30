/* =========================================================
   ONLINE COMPLAINT MANAGEMENT PORTAL
   Routing Helpers
   File: lib/helpers/router.js

   Designed for Node.js / Vercel serverless routing.
   ========================================================= */

"use strict";

/* =========================================================
   NORMALIZE HTTP METHOD
   ========================================================= */

function normalizeMethod(method) {
  return String(method || "GET")
    .trim()
    .toUpperCase();
}

/* =========================================================
   GET REQUEST URL
   ========================================================= */

function getRequestUrl(req) {
  if (!req) {
    throw new Error("Request object is required.");
  }

  const host = req.headers?.host || "localhost";

  const protocol = req.headers?.["x-forwarded-proto"] || "http";

  return new URL(req.url || "/", `${protocol}://${host}`);
}

/* =========================================================
   NORMALIZE PATH
   ========================================================= */

function normalizePath(pathname, options = {}) {
  const { removeApiPrefix = true } = options;

  let path = String(pathname || "/").trim();

  if (!path.startsWith("/")) {
    path = "/" + path;
  }

  /*
   * Remove duplicate slashes.
   */

  path = path.replace(/\/{2,}/g, "/");

  /*
   * api/index.js receives requests such as:
   *
   * /api/auth/login
   *
   * Controllers/routes normally work with:
   *
   * /auth/login
   */

  if (removeApiPrefix) {
    if (path === "/api") {
      path = "/";
    } else if (path.startsWith("/api/")) {
      path = path.substring(4);
    }
  }

  /*
   * Remove trailing slash except root.
   */

  if (path.length > 1 && path.endsWith("/")) {
    path = path.slice(0, -1);
  }

  return path;
}

/* =========================================================
   GET QUERY PARAMETERS
   ========================================================= */

function getQueryParams(url) {
  const query = {};

  if (!url?.searchParams) {
    return query;
  }

  for (const [key, value] of url.searchParams.entries()) {
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
   PARSE REQUEST ROUTE DATA
   ========================================================= */

function parseRequest(req) {
  const url = getRequestUrl(req);

  return {
    method: normalizeMethod(req.method),

    url,

    path: normalizePath(url.pathname),

    query: getQueryParams(url),
  };
}

/* =========================================================
   ESCAPE REGEXP
   ========================================================= */

function escapeRegExp(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/* =========================================================
   CONVERT ROUTE PATTERN TO REGEXP
   ========================================================= */

/*
   Example:

   routeToRegExp(
       "/admin/complaints/:id"
   )

   Matches:

   /admin/complaints/25

   Result params:

   {
       id: "25"
   }
*/

function routeToRegExp(routePattern) {
  if (typeof routePattern !== "string") {
    throw new TypeError("Route pattern must be a string.");
  }

  const normalized = normalizePath(routePattern, {
    removeApiPrefix: false,
  });

  const paramNames = [];

  const segments = normalized.split("/").filter(Boolean);

  const regexSegments = segments.map((segment) => {
    /*
     * :id
     */

    if (segment.startsWith(":")) {
      const name = segment.substring(1);

      if (!name) {
        throw new Error("Route parameter name cannot be empty.");
      }

      paramNames.push(name);

      return "([^/]+)";
    }

    /*
     * *
     */

    if (segment === "*") {
      paramNames.push("wildcard");

      return "(.*)";
    }

    return escapeRegExp(segment);
  });

  let source = "^";

  if (regexSegments.length === 0) {
    source += "\\/";
  } else {
    source += "\\/" + regexSegments.join("\\/");
  }

  source += "$";

  return {
    regex: new RegExp(source),

    paramNames,
  };
}

/* =========================================================
   MATCH ROUTE
   ========================================================= */

function matchRoute(routePattern, actualPath) {
  /*
   * Support raw RegExp routes too.
   */

  if (routePattern instanceof RegExp) {
    const match = actualPath.match(routePattern);

    if (!match) {
      return null;
    }

    return {
      params: {},
      match,
    };
  }

  const { regex, paramNames } = routeToRegExp(routePattern);

  const path = normalizePath(actualPath, {
    removeApiPrefix: false,
  });

  const match = path.match(regex);

  if (!match) {
    return null;
  }

  const params = {};

  paramNames.forEach((name, index) => {
    let value = match[index + 1];

    try {
      value = decodeURIComponent(value);
    } catch {
      // Keep original value.
    }

    params[name] = value;
  });

  return {
    params,
    match,
  };
}

/* =========================================================
   CREATE ROUTE
   ========================================================= */

function createRoute(method, path, handler, options = {}) {
  if (typeof handler !== "function") {
    throw new TypeError("Route handler must be a function.");
  }

  return {
    method: normalizeMethod(method),

    path,

    handler,

    auth: Boolean(options.auth),

    role: options.role || null,
  };
}

/* =========================================================
   FIND MATCHING ROUTE
   ========================================================= */

function findRoute(routes, method, path) {
  const requestMethod = normalizeMethod(method);

  for (const route of routes || []) {
    if (normalizeMethod(route.method) !== requestMethod) {
      continue;
    }

    const result = matchRoute(route.path, path);

    if (result) {
      return {
        route,

        params: result.params,

        match: result.match,
      };
    }
  }

  return null;
}

/* =========================================================
   FIND ALLOWED METHODS FOR PATH
   ========================================================= */

function allowedMethodsForPath(routes, path) {
  const methods = new Set();

  for (const route of routes || []) {
    if (matchRoute(route.path, path)) {
      methods.add(normalizeMethod(route.method));
    }
  }

  return [...methods];
}

/* =========================================================
   SIMPLE ROUTER CLASS
   ========================================================= */

/*
   Example:

   const router = new Router();

   router.get(
       "/health",
       async (req, res) => {
           ...
       }
   );

   router.get(
       "/complaints/:id",
       controller
   );

   await router.handle(req, res);
*/

class Router {
  constructor() {
    this.routes = [];
  }

  add(method, path, handler, options = {}) {
    this.routes.push(createRoute(method, path, handler, options));

    return this;
  }

  get(path, handler, options = {}) {
    return this.add("GET", path, handler, options);
  }

  post(path, handler, options = {}) {
    return this.add("POST", path, handler, options);
  }

  put(path, handler, options = {}) {
    return this.add("PUT", path, handler, options);
  }

  patch(path, handler, options = {}) {
    return this.add("PATCH", path, handler, options);
  }

  delete(path, handler, options = {}) {
    return this.add("DELETE", path, handler, options);
  }

  /* =====================================================
       HANDLE REQUEST
       ===================================================== */

  async handle(req, res, options = {}) {
    const {
      authenticate = null,
      requireRole = null,
      onNotFound = null,
      onMethodNotAllowed = null,
    } = options;

    const parsed = parseRequest(req);

    req.query = parsed.query;

    req.params = req.params || {};

    /*
     * Find exact method + route.
     */

    const matched = findRoute(this.routes, parsed.method, parsed.path);

    if (!matched) {
      const allowed = allowedMethodsForPath(this.routes, parsed.path);

      if (allowed.length > 0) {
        if (typeof onMethodNotAllowed === "function") {
          return onMethodNotAllowed(req, res, allowed);
        }

        const err = new Error("HTTP method not allowed.");

        err.statusCode = 405;
        err.allowedMethods = allowed;

        throw err;
      }

      if (typeof onNotFound === "function") {
        return onNotFound(req, res);
      }

      const err = new Error(
        `API route not found: ${parsed.method} ${parsed.path}`,
      );

      err.statusCode = 404;

      throw err;
    }

    req.params = {
      ...req.params,
      ...matched.params,
    };

    const route = matched.route;

    /*
     * Authentication.
     */

    if (route.auth || route.role) {
      if (typeof authenticate !== "function") {
        const err = new Error(
          "Router authentication handler is not configured.",
        );

        err.statusCode = 500;

        throw err;
      }

      await authenticate(req);
    }

    /*
     * Role authorization.
     */

    if (route.role) {
      if (typeof requireRole !== "function") {
        const err = new Error(
          "Router role authorization handler is not configured.",
        );

        err.statusCode = 500;

        throw err;
      }

      requireRole(req, route.role);
    }

    return route.handler(req, res);
  }
}

/* =========================================================
   ROUTE PARAMETER INTEGER
   ========================================================= */

function integerParam(req, name) {
  const raw = req?.params?.[name];

  const value = Number(raw);

  if (!Number.isInteger(value) || value <= 0) {
    const error = new Error(`Invalid ${name}.`);

    error.statusCode = 400;

    throw error;
  }

  return value;
}

/* =========================================================
   EXPORTS
   ========================================================= */

module.exports = {
  Router,

  createRoute,

  matchRoute,

  routeToRegExp,

  findRoute,

  allowedMethodsForPath,

  normalizeMethod,

  normalizePath,

  getRequestUrl,

  getQueryParams,

  parseRequest,

  integerParam,
};
