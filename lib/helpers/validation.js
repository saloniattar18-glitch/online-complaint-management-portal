/* =========================================================
   ONLINE COMPLAINT MANAGEMENT PORTAL
   Validation Helpers
   File: lib/helpers/validation.js
   ========================================================= */

"use strict";

/* =========================================================
   CREATE VALIDATION ERROR
   ========================================================= */

function validationError(message, errors = null, statusCode = 400) {
  const error = new Error(message);

  error.statusCode = statusCode;

  if (errors) {
    error.errors = errors;
  }

  return error;
}

/* =========================================================
   STRING HELPERS
   ========================================================= */

function cleanString(value, defaultValue = "") {
  if (value === undefined || value === null) {
    return defaultValue;
  }

  return String(value).trim();
}

function cleanLowercase(value, defaultValue = "") {
  return cleanString(value, defaultValue).toLowerCase();
}

/* =========================================================
   REQUIRED VALUE
   ========================================================= */

function required(value, fieldName = "Field") {
  if (value === undefined || value === null || cleanString(value) === "") {
    throw validationError(`${fieldName} is required.`);
  }

  return value;
}

/* =========================================================
   EMAIL VALIDATION
   ========================================================= */

function isValidEmail(email) {
  const value = cleanString(email).toLowerCase();

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function validateEmail(email, fieldName = "Email") {
  const value = cleanLowercase(email);

  if (!value) {
    throw validationError(`${fieldName} is required.`);
  }

  if (!isValidEmail(value)) {
    throw validationError(`Please enter a valid ${fieldName.toLowerCase()}.`);
  }

  return value;
}

/* =========================================================
   PASSWORD VALIDATION
   ========================================================= */

function validatePassword(password, options = {}) {
  const { fieldName = "Password", minLength = 6, maxLength = 128 } = options;

  if (password === undefined || password === null) {
    throw validationError(`${fieldName} is required.`);
  }

  const value = String(password);

  if (value.length < minLength) {
    throw validationError(
      `${fieldName} must contain at least ${minLength} characters.`,
    );
  }

  if (value.length > maxLength) {
    throw validationError(
      `${fieldName} cannot exceed ${maxLength} characters.`,
    );
  }

  return value;
}

/* =========================================================
   MOBILE NUMBER
   ========================================================= */

function isValidMobile(mobile) {
  const value = cleanString(mobile);

  if (!value) {
    return false;
  }

  return /^\d{10}$/.test(value);
}

function validateMobile(mobile, options = {}) {
  const { required: isRequired = false, fieldName = "Mobile number" } = options;

  const value = cleanString(mobile);

  if (!value) {
    if (isRequired) {
      throw validationError(`${fieldName} is required.`);
    }

    return null;
  }

  if (!/^\d{10}$/.test(value)) {
    throw validationError(`${fieldName} must contain exactly 10 digits.`);
  }

  return value;
}

/* =========================================================
   PINCODE
   ========================================================= */

function validatePincode(pincode, options = {}) {
  const { required: isRequired = false } = options;

  const value = cleanString(pincode);

  if (!value) {
    if (isRequired) {
      throw validationError("Pincode is required.");
    }

    return null;
  }

  if (!/^\d{6}$/.test(value)) {
    throw validationError("Pincode must contain exactly 6 digits.");
  }

  return value;
}

/* =========================================================
   POSITIVE INTEGER
   ========================================================= */

function toPositiveInteger(value, fieldName = "ID", options = {}) {
  const { required: isRequired = true } = options;

  if (value === undefined || value === null || value === "") {
    if (isRequired) {
      throw validationError(`${fieldName} is required.`);
    }

    return null;
  }

  const number = Number(value);

  if (!Number.isInteger(number) || number <= 0) {
    throw validationError(`${fieldName} must be a valid positive integer.`);
  }

  return number;
}

/* =========================================================
   NUMBER VALIDATION
   ========================================================= */

function toNumber(value, fieldName = "Value", options = {}) {
  const { required: isRequired = true, min = null, max = null } = options;

  if (value === undefined || value === null || value === "") {
    if (isRequired) {
      throw validationError(`${fieldName} is required.`);
    }

    return null;
  }

  const number = Number(value);

  if (!Number.isFinite(number)) {
    throw validationError(`${fieldName} must be a valid number.`);
  }

  if (min !== null && number < min) {
    throw validationError(`${fieldName} must be at least ${min}.`);
  }

  if (max !== null && number > max) {
    throw validationError(`${fieldName} cannot be greater than ${max}.`);
  }

  return number;
}

/* =========================================================
   STRING LENGTH VALIDATION
   ========================================================= */

function validateString(value, options = {}) {
  const {
    fieldName = "Field",
    required: isRequired = true,
    minLength = 0,
    maxLength = null,
  } = options;

  const cleaned = cleanString(value);

  if (!cleaned) {
    if (isRequired) {
      throw validationError(`${fieldName} is required.`);
    }

    return "";
  }

  if (cleaned.length < minLength) {
    throw validationError(
      `${fieldName} must contain at least ${minLength} characters.`,
    );
  }

  if (maxLength !== null && cleaned.length > maxLength) {
    throw validationError(
      `${fieldName} cannot exceed ${maxLength} characters.`,
    );
  }

  return cleaned;
}

/* =========================================================
   ENUM VALIDATION
   ========================================================= */

function validateEnum(value, allowedValues, options = {}) {
  const {
    fieldName = "Value",
    required: isRequired = true,
    lowercase = true,
  } = options;

  if (!Array.isArray(allowedValues) || allowedValues.length === 0) {
    throw new Error("allowedValues must be a non-empty array.");
  }

  let cleaned = cleanString(value);

  if (!cleaned) {
    if (isRequired) {
      throw validationError(`${fieldName} is required.`);
    }

    return null;
  }

  if (lowercase) {
    cleaned = cleaned.toLowerCase();
  }

  const normalizedAllowed = allowedValues.map((item) =>
    lowercase ? String(item).toLowerCase() : String(item),
  );

  if (!normalizedAllowed.includes(cleaned)) {
    throw validationError(
      `Invalid ${fieldName.toLowerCase()}. Allowed values: ${normalizedAllowed.join(", ")}.`,
    );
  }

  return cleaned;
}

/* =========================================================
   USER ROLE
   ========================================================= */

function validateRole(role) {
  return validateEnum(role, ["user", "staff", "admin"], {
    fieldName: "Role",
  });
}

/* =========================================================
   ACCOUNT STATUS
   ========================================================= */

function validateAccountStatus(status) {
  return validateEnum(status, ["active", "inactive"], {
    fieldName: "Account status",
  });
}

/* =========================================================
   COMPLAINT STATUS
   ========================================================= */

function normalizeComplaintStatus(status) {
  return cleanLowercase(status).replaceAll("-", "_").replaceAll(" ", "_");
}

function validateComplaintStatus(status, options = {}) {
  const {
    allowed = [
      "pending",
      "assigned",
      "in_progress",
      "resolved",
      "closed",
      "rejected",
    ],
  } = options;

  const normalized = normalizeComplaintStatus(status);

  return validateEnum(normalized, allowed, {
    fieldName: "Complaint status",
  });
}

/* =========================================================
   COMPLAINT PRIORITY
   ========================================================= */

function validatePriority(priority, options = {}) {
  const { required: isRequired = true, defaultValue = "medium" } = options;

  let value = cleanLowercase(priority);

  if (!value && !isRequired) {
    value = defaultValue;
  }

  return validateEnum(
    value || defaultValue,
    ["low", "medium", "high", "urgent"],
    {
      fieldName: "Complaint priority",
    },
  );
}

/* =========================================================
   FEEDBACK RATING
   ========================================================= */

function validateRating(rating) {
  const number = Number(rating);

  if (!Number.isInteger(number) || number < 1 || number > 5) {
    throw validationError("Rating must be between 1 and 5.");
  }

  return number;
}

/* =========================================================
   YES / NO
   ========================================================= */

function validateYesNo(value, fieldName = "Value") {
  return validateEnum(value, ["yes", "no"], {
    fieldName,
  });
}

/* =========================================================
   DATE VALIDATION
   ========================================================= */

function validateDate(value, options = {}) {
  const { required: isRequired = false, fieldName = "Date" } = options;

  const text = cleanString(value);

  if (!text) {
    if (isRequired) {
      throw validationError(`${fieldName} is required.`);
    }

    return null;
  }

  /*
   * Accept YYYY-MM-DD.
   */

  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    throw validationError(`${fieldName} must use YYYY-MM-DD format.`);
  }

  const date = new Date(`${text}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    throw validationError(`${fieldName} is invalid.`);
  }

  return text;
}

/* =========================================================
   PAGINATION
   ========================================================= */

function validatePagination(query = {}) {
  let page = Number(query.page || 1);

  let limit = Number(query.limit || 20);

  if (!Number.isInteger(page) || page < 1) {
    page = 1;
  }

  if (!Number.isInteger(limit) || limit < 1) {
    limit = 20;
  }

  /*
   * Prevent very large database queries.
   */

  if (limit > 100) {
    limit = 100;
  }

  return {
    page,

    limit,

    offset: (page - 1) * limit,
  };
}

/* =========================================================
   BOOLEAN
   ========================================================= */

function toBoolean(value, defaultValue = false) {
  if (value === undefined || value === null || value === "") {
    return defaultValue;
  }

  if (typeof value === "boolean") {
    return value;
  }

  const normalized = String(value).trim().toLowerCase();

  if (["true", "1", "yes", "on"].includes(normalized)) {
    return true;
  }

  if (["false", "0", "no", "off"].includes(normalized)) {
    return false;
  }

  return defaultValue;
}

/* =========================================================
   SAFE SEARCH TEXT
   ========================================================= */

function sanitizeSearch(value, maxLength = 100) {
  return cleanString(value).slice(0, maxLength);
}

/* =========================================================
   OBJECT FIELD VALIDATION
   ========================================================= */

/*
   Example:

   const result = validateFields(body, {
       full_name: value =>
           validateString(value, {
               fieldName: "Full name",
               minLength: 2
           }),

       email: validateEmail
   });
*/

function validateFields(object, validators) {
  const source = object || {};

  const result = {};

  const errors = {};

  for (const [key, validator] of Object.entries(validators || {})) {
    try {
      result[key] = validator(source[key]);
    } catch (err) {
      errors[key] = err.message;
    }
  }

  if (Object.keys(errors).length > 0) {
    throw validationError("Validation failed.", errors, 422);
  }

  return result;
}

/* =========================================================
   EXPORTS
   ========================================================= */

module.exports = {
  validationError,

  cleanString,

  cleanLowercase,

  required,

  isValidEmail,

  validateEmail,

  validatePassword,

  isValidMobile,

  validateMobile,

  validatePincode,

  toPositiveInteger,

  toNumber,

  validateString,

  validateEnum,

  validateRole,

  validateAccountStatus,

  normalizeComplaintStatus,

  validateComplaintStatus,

  validatePriority,

  validateRating,

  validateYesNo,

  validateDate,

  validatePagination,

  toBoolean,

  sanitizeSearch,

  validateFields,
};
