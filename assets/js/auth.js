/* =========================================================
   ONLINE COMPLAINT MANAGEMENT PORTAL
   Authentication JavaScript
   File: assets/js/auth.js
   ========================================================= */

"use strict";

(function () {
  if (!window.Portal) {
    console.error("common.js must be loaded before auth.js");
    return;
  }

  const {
    ready,
    qs,
    qsa,
    api,
    formToObject,
    setButtonLoading,
    clearFormErrors,
    showFieldError,
    toast,
    saveSession,
    getUser,
    getToken,
    redirectToDashboard,
    getPageRole,
  } = Portal;

  /* =====================================================
       DETECT LOGIN ROLE
       ===================================================== */

  function detectRequestedRole() {
    const roleFromForm = qs("#loginForm")?.dataset.role;

    if (roleFromForm) {
      return roleFromForm.toLowerCase();
    }

    return getPageRole() || "user";
  }

  /* =====================================================
       VALIDATION
       ===================================================== */

  function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function validateLoginForm(form) {
    clearFormErrors(form);

    let valid = true;

    const email = qs('[name="email"]', form);
    const password = qs('[name="password"]', form);

    if (!email || !email.value.trim()) {
      showFieldError(email, "Email is required.");
      valid = false;
    } else if (!validateEmail(email.value.trim())) {
      showFieldError(email, "Enter a valid email address.");
      valid = false;
    }

    if (!password || !password.value) {
      showFieldError(password, "Password is required.");
      valid = false;
    }

    return valid;
  }

  function validateRegisterForm(form) {
    clearFormErrors(form);

    let valid = true;

    const fullName =
      qs('[name="full_name"]', form) || qs('[name="name"]', form);

    const email = qs('[name="email"]', form);
    const mobile = qs('[name="mobile"]', form);
    const password = qs('[name="password"]', form);

    const confirmPassword =
      qs('[name="confirm_password"]', form) ||
      qs('[name="confirmPassword"]', form);

    if (!fullName || fullName.value.trim().length < 2) {
      showFieldError(fullName, "Please enter your full name.");

      valid = false;
    }

    if (!email || !email.value.trim()) {
      showFieldError(email, "Email is required.");
      valid = false;
    } else if (!validateEmail(email.value.trim())) {
      showFieldError(email, "Enter a valid email address.");

      valid = false;
    }

    if (mobile && mobile.value.trim()) {
      const mobileValue = mobile.value.replace(/\D/g, "");

      if (mobileValue.length !== 10) {
        showFieldError(mobile, "Enter a valid 10-digit mobile number.");

        valid = false;
      }
    }

    if (!password || password.value.length < 6) {
      showFieldError(password, "Password must contain at least 6 characters.");

      valid = false;
    }

    if (
      confirmPassword &&
      password &&
      confirmPassword.value !== password.value
    ) {
      showFieldError(confirmPassword, "Passwords do not match.");

      valid = false;
    }

    return valid;
  }

  /* =====================================================
       LOGIN
       ===================================================== */

  async function login(event) {
    event.preventDefault();

    const form = event.currentTarget;

    if (!validateLoginForm(form)) {
      return;
    }

    const submitButton = qs('[type="submit"]', form);

    setButtonLoading(submitButton, true, "Signing in...");

    try {
      const payload = formToObject(form);

      payload.email = String(payload.email || "")
        .trim()
        .toLowerCase();

      payload.role = detectRequestedRole();

      const response = await api("/api/auth/login", {
        method: "POST",
        data: payload,
        auth: false,
      });

      const token = response.token || response.access_token;

      const user = response.user || response.data?.user;

      if (!token || !user) {
        throw new Error("Invalid login response from server.");
      }

      const requestedRole = detectRequestedRole();

      if (
        requestedRole &&
        user.role &&
        String(user.role).toLowerCase() !== requestedRole
      ) {
        throw new Error(`This account cannot log in as ${requestedRole}.`);
      }

      saveSession(token, user);

      toast("Login successful.", "success", 1200);

      setTimeout(() => {
        redirectToDashboard(user.role || requestedRole);
      }, 500);
    } catch (error) {
       console.error("LOGIN ERROR:", error);

  toast(
    error instanceof Error
      ? error.message
      : "Login failed.",
    "error"
  );
    } finally {
      setButtonLoading(submitButton, false);
    }
  }

  /* =====================================================
       REGISTER
       ===================================================== */

  async function register(event) {
    event.preventDefault();

    const form = event.currentTarget;

    if (!validateRegisterForm(form)) {
      return;
    }

    const submitButton = qs('[type="submit"]', form);

    setButtonLoading(submitButton, true, "Creating account...");

    try {
      const payload = formToObject(form);

      if (payload.name && !payload.full_name) {
        payload.full_name = payload.name;
      }

      delete payload.name;
      delete payload.confirm_password;
      delete payload.confirmPassword;

      payload.email = String(payload.email || "")
        .trim()
        .toLowerCase();

      payload.role = "user";

      const response = await api("/api/auth/register", {
        method: "POST",
        data: payload,
        auth: false,
      });

      toast(
        response.message || "Registration successful. Please login.",
        "success",
      );

      form.reset();

      setTimeout(() => {
        window.location.href = "/user/login.html";
      }, 800);
    } catch (error) {
      toast(error.message || "Registration failed.", "error");
    } finally {
      setButtonLoading(submitButton, false);
    }
  }

  /* =====================================================
       FORGOT PASSWORD
       ===================================================== */

  async function forgotPassword(event) {
    event.preventDefault();

    const form = event.currentTarget;
    const email = qs('[name="email"]', form);

    clearFormErrors(form);

    if (!email || !validateEmail(email.value.trim())) {
      showFieldError(email, "Enter a valid email address.");

      return;
    }

    const submitButton = qs('[type="submit"]', form);

    setButtonLoading(submitButton, true, "Submitting...");

    try {
      const response = await api("/api/auth/forgot-password", {
        method: "POST",
        data: {
          email: email.value.trim().toLowerCase(),
        },
        auth: false,
      });

      toast(
        response.message || "Password reset instructions have been sent.",
        "success",
      );

      form.reset();
    } catch (error) {
      toast(error.message || "Unable to process request.", "error");
    } finally {
      setButtonLoading(submitButton, false);
    }
  }

  /* =====================================================
       REDIRECT LOGGED-IN USER
       ===================================================== */

  function redirectExistingSession() {
    const user = getUser();
    const token = getToken();

    if (!user || !token) {
      return;
    }

    const path = window.location.pathname.toLowerCase();

    if (path.endsWith("/login.html") || path.endsWith("/register.html")) {
      redirectToDashboard(user.role || "user");
    }
  }

  /* =====================================================
       INITIALIZATION
       ===================================================== */

  ready(() => {
    redirectExistingSession();

    const loginForm = qs("#loginForm");

    if (loginForm) {
      loginForm.addEventListener("submit", login);
    }

    const registerForm = qs("#registerForm");

    if (registerForm) {
      registerForm.addEventListener("submit", register);
    }

    const forgotForm = qs("#forgotPasswordForm");

    if (forgotForm) {
      forgotForm.addEventListener("submit", forgotPassword);
    }

    qsa('[data-trim="true"]').forEach((input) => {
      input.addEventListener("blur", () => {
        input.value = input.value.trim();
      });
    });
  });
})();
