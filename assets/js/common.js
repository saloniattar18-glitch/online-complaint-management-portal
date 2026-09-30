/* =========================================================
   ONLINE COMPLAINT MANAGEMENT PORTAL
   Common JavaScript
   File: assets/js/common.js
   ========================================================= */

"use strict";

(function () {
  const TOKEN_KEY = "ocmp_token";
  const USER_KEY = "ocmp_user";

  /* =====================================================
       BASIC HELPERS
       ===================================================== */

  function ready(callback) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", callback);
    } else {
      callback();
    }
  }

  function qs(selector, parent = document) {
    return parent.querySelector(selector);
  }

  function qsa(selector, parent = document) {
    return Array.from(parent.querySelectorAll(selector));
  }

  function escapeHTML(value) {
    if (value === null || value === undefined) {
      return "";
    }

    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function getQueryParam(name) {
    const params = new URLSearchParams(window.location.search);
    return params.get(name);
  }

  function formatDate(value) {
    if (!value) {
      return "-";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  function formatDateTime(value) {
    if (!value) {
      return "-";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function capitalize(value) {
    if (!value) {
      return "";
    }

    const str = String(value);

    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  function truncate(value, length = 100) {
    if (!value) {
      return "";
    }

    const text = String(value);

    if (text.length <= length) {
      return text;
    }

    return text.substring(0, length) + "...";
  }

  /* =====================================================
       STORAGE / SESSION
       ===================================================== */

  function setToken(token) {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    }
  }

  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  function removeToken() {
    localStorage.removeItem(TOKEN_KEY);
  }

  function setUser(user) {
    if (user) {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    }
  }

  function getUser() {
    const value = localStorage.getItem(USER_KEY);

    if (!value) {
      return null;
    }

    try {
      return JSON.parse(value);
    } catch (error) {
      localStorage.removeItem(USER_KEY);
      return null;
    }
  }

  function clearSession() {
    removeToken();
    localStorage.removeItem(USER_KEY);
  }

  function saveSession(token, user) {
    setToken(token);
    setUser(user);
  }

  function isLoggedIn() {
    return Boolean(getToken());
  }

  /* =====================================================
       ROLE / REDIRECTION
       ===================================================== */

  function getPageRole() {
    const path = window.location.pathname.toLowerCase();

    if (path.includes("/admin/")) {
      return "admin";
    }

    if (path.includes("/staff/")) {
      return "staff";
    }

    if (path.includes("/user/")) {
      return "user";
    }

    return null;
  }

  function getDashboardPath(role) {
    switch (role) {
      case "admin":
        return "/admin/dashboard.html";

      case "staff":
        return "/staff/dashboard.html";

      default:
        return "/user/dashboard.html";
    }
  }

  function getLoginPath(role) {
    switch (role) {
      case "admin":
        return "/admin/login.html";

      case "staff":
        return "/staff/login.html";

      default:
        return "/user/login.html";
    }
  }

  function redirectToDashboard(role) {
    window.location.href = getDashboardPath(role);
  }

  function redirectToLogin(role = "user") {
    clearSession();
    window.location.href = getLoginPath(role);
  }

  /* =====================================================
       API REQUEST HANDLER
       ===================================================== */

  async function api(url, options = {}) {
    const { method = "GET", data = null, headers = {}, auth = true } = options;

    const requestHeaders = {
      Accept: "application/json",
      ...headers,
    };

    const token = getToken();

    if (auth && token) {
      requestHeaders.Authorization = `Bearer ${token}`;
    }

    const requestOptions = {
      method,
      headers: requestHeaders,
    };

    if (data !== null && method !== "GET") {
      if (data instanceof FormData) {
        requestOptions.body = data;
      } else {
        requestHeaders["Content-Type"] = "application/json";
        requestOptions.body = JSON.stringify(data);
      }
    }

    let response;

    try {
      response = await fetch(url, requestOptions);
    } catch (error) {
      throw new Error(
        "Unable to connect to the server. Please check your internet connection.",
      );
    }

    let result = {};

    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      try {
        result = await response.json();
      } catch (error) {
        result = {};
      }
    } else {
      const text = await response.text();

      result = {
        message: text,
      };
    }

    if (response.status === 401 && auth) {
      clearSession();

      const role = getPageRole();

      if (role) {
        setTimeout(() => {
          window.location.href = getLoginPath(role);
        }, 300);
      }
    }

    if (!response.ok) {
      throw new Error(
        result.message ||
          result.error ||
          `Request failed with status ${response.status}`,
      );
    }

    return result;
  }

  /* =====================================================
       AUTHORIZATION GUARD
       ===================================================== */

  function requireAuth(requiredRole = null) {
    const token = getToken();
    const user = getUser();

    if (!token || !user) {
      redirectToLogin(requiredRole || getPageRole() || "user");
      return false;
    }

    if (
      requiredRole &&
      user.role &&
      String(user.role).toLowerCase() !== requiredRole.toLowerCase()
    ) {
      redirectToDashboard(user.role);
      return false;
    }

    return true;
  }

  /* =====================================================
       FORM HELPERS
       ===================================================== */

  function formToObject(form) {
    const formData = new FormData(form);
    const object = {};

    for (const [key, value] of formData.entries()) {
      if (Object.prototype.hasOwnProperty.call(object, key)) {
        if (!Array.isArray(object[key])) {
          object[key] = [object[key]];
        }

        object[key].push(value);
      } else {
        object[key] = value;
      }
    }

    qsa('input[type="checkbox"]', form).forEach((checkbox) => {
      if (!checkbox.name) {
        return;
      }

      if (
        !checkbox.checked &&
        !Object.prototype.hasOwnProperty.call(object, checkbox.name)
      ) {
        object[checkbox.name] = false;
      }
    });

    return object;
  }

  function setButtonLoading(button, loading, loadingText = "Please wait...") {
    if (!button) {
      return;
    }

    if (loading) {
      if (!button.dataset.originalText) {
        button.dataset.originalText = button.innerHTML;
      }

      button.disabled = true;
      button.innerHTML = `<i class="fa fa-spinner fa-spin"></i> ${escapeHTML(loadingText)}`;
    } else {
      button.disabled = false;

      if (button.dataset.originalText) {
        button.innerHTML = button.dataset.originalText;
      }
    }
  }

  function clearFormErrors(form) {
    qsa(".form-error", form).forEach((element) => element.remove());

    qsa(".form-control.error", form).forEach((element) => {
      element.classList.remove("error");
    });
  }

  function showFieldError(field, message) {
    if (!field) {
      return;
    }

    field.classList.add("error");

    const error = document.createElement("div");
    error.className = "form-error";
    error.textContent = message;

    field.insertAdjacentElement("afterend", error);
  }

  /* =====================================================
       TOAST NOTIFICATIONS
       ===================================================== */

  function ensureToastStyles() {
    if (document.getElementById("portal-toast-style")) {
      return;
    }

    const style = document.createElement("style");

    style.id = "portal-toast-style";

    style.textContent = `
            #portal-toast-container {
                position: fixed;
                top: 80px;
                right: 20px;
                z-index: 99999;
                width: min(360px, calc(100% - 40px));
            }

            .portal-toast {
                display: flex;
                align-items: flex-start;
                gap: 10px;
                padding: 13px 15px;
                margin-bottom: 10px;
                border-radius: 4px;
                color: #fff;
                box-shadow: 0 5px 18px rgba(0,0,0,.18);
                animation: portalToastIn .25s ease;
            }

            .portal-toast.success {
                background: #48cfad;
            }

            .portal-toast.error {
                background: #ed5565;
            }

            .portal-toast.warning {
                background: #fcb322;
            }

            .portal-toast.info {
                background: #4fc1e9;
            }

            .portal-toast-message {
                flex: 1;
            }

            .portal-toast-close {
                border: 0;
                background: transparent;
                color: #fff;
                font-size: 16px;
                padding: 0;
                cursor: pointer;
            }

            @keyframes portalToastIn {
                from {
                    transform: translateX(25px);
                    opacity: 0;
                }

                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
        `;

    document.head.appendChild(style);
  }

  function toast(message, type = "info", timeout = 3500) {
    ensureToastStyles();

    let container = document.getElementById("portal-toast-container");

    if (!container) {
      container = document.createElement("div");
      container.id = "portal-toast-container";
      document.body.appendChild(container);
    }

    const toastElement = document.createElement("div");

    toastElement.className = `portal-toast ${type}`;

    let icon = "fa-info-circle";

    if (type === "success") {
      icon = "fa-check-circle";
    }

    if (type === "error") {
      icon = "fa-times-circle";
    }

    if (type === "warning") {
      icon = "fa-exclamation-triangle";
    }

    toastElement.innerHTML = `
            <i class="fa ${icon}"></i>

            <div class="portal-toast-message">
                ${escapeHTML(message)}
            </div>

            <button type="button" class="portal-toast-close">
                &times;
            </button>
        `;

    container.appendChild(toastElement);

    const remove = () => {
      if (toastElement.parentNode) {
        toastElement.remove();
      }
    };

    qs(".portal-toast-close", toastElement)?.addEventListener("click", remove);

    setTimeout(remove, timeout);
  }

  /* =====================================================
       CONFIRM MODAL
       ===================================================== */

  function confirmAction(message, title = "Confirm") {
    return new Promise((resolve) => {
      const existing = document.getElementById("portal-confirm-modal");

      if (existing) {
        existing.remove();
      }

      const modal = document.createElement("div");

      modal.id = "portal-confirm-modal";
      modal.className = "modal show";

      modal.innerHTML = `
                <div class="modal-dialog" style="max-width:420px;">
                    <div class="modal-content">

                        <div class="modal-header">
                            <h4 class="modal-title">
                                ${escapeHTML(title)}
                            </h4>

                            <button
                                type="button"
                                class="modal-close"
                                data-confirm="false"
                            >
                                &times;
                            </button>
                        </div>

                        <div class="modal-body">
                            <p style="margin:0;">
                                ${escapeHTML(message)}
                            </p>
                        </div>

                        <div class="modal-footer">
                            <button
                                type="button"
                                class="btn btn-light"
                                data-confirm="false"
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                class="btn btn-danger"
                                data-confirm="true"
                            >
                                Confirm
                            </button>
                        </div>

                    </div>
                </div>
            `;

      document.body.appendChild(modal);

      modal.addEventListener("click", (event) => {
        const button = event.target.closest("[data-confirm]");

        if (!button) {
          return;
        }

        const result = button.dataset.confirm === "true";

        modal.remove();
        resolve(result);
      });
    });
  }

  /* =====================================================
       SIDEBAR
       ===================================================== */

  function initSidebar() {
    const toggle = qs(".sidebar-toggle-box");
    const sidebar = qs("#sidebar");

    if (!toggle || !sidebar) {
      return;
    }

    toggle.addEventListener("click", (event) => {
      event.preventDefault();

      if (window.innerWidth <= 900) {
        document.body.classList.toggle("sidebar-open");
      } else {
        const container = qs("#container");

        if (container) {
          container.classList.toggle("sidebar-closed");
        }
      }
    });

    document.addEventListener("click", (event) => {
      if (window.innerWidth > 900) {
        return;
      }

      if (
        document.body.classList.contains("sidebar-open") &&
        !sidebar.contains(event.target) &&
        !toggle.contains(event.target)
      ) {
        document.body.classList.remove("sidebar-open");
      }
    });
  }

  /* =====================================================
       ACTIVE MENU
       ===================================================== */

  function setActiveMenu() {
    const currentPath = window.location.pathname.split("/").pop().toLowerCase();

    qsa("#sidebar a").forEach((link) => {
      const href = (link.getAttribute("href") || "")
        .split("?")[0]
        .split("/")
        .pop()
        .toLowerCase();

      if (href && href === currentPath) {
        link.classList.add("active");
      }
    });
  }

  /* =====================================================
       PASSWORD SHOW / HIDE
       ===================================================== */

  function initPasswordToggles() {
    qsa(".password-toggle").forEach((button) => {
      button.addEventListener("click", () => {
        const wrapper = button.closest(".password-wrapper");

        if (!wrapper) {
          return;
        }

        const input = qs('input[type="password"], input[type="text"]', wrapper);

        if (!input) {
          return;
        }

        const hidden = input.type === "password";

        input.type = hidden ? "text" : "password";

        const icon = qs("i", button);

        if (icon) {
          icon.className = hidden ? "fa fa-eye-slash" : "fa fa-eye";
        }
      });
    });
  }

  /* =====================================================
       LOGOUT
       ===================================================== */

  async function logout() {
    const role = getUser()?.role || getPageRole() || "user";

    try {
      await api("/api/auth/logout", {
        method: "POST",
      });
    } catch (error) {
      // Local logout should still work even if server logout fails.
    }

    clearSession();

    window.location.href = getLoginPath(role);
  }

  function initLogoutButtons() {
    qsa("[data-logout], .logout").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        logout();
      });
    });
  }

  /* =====================================================
       USER DISPLAY
       ===================================================== */

  function populateCurrentUser() {
    const user = getUser();

    if (!user) {
      return;
    }

    qsa("[data-user-name]").forEach((element) => {
      element.textContent =
        user.full_name || user.name || user.username || "User";
    });

    qsa("[data-user-email]").forEach((element) => {
      element.textContent = user.email || "";
    });

    qsa("[data-user-role]").forEach((element) => {
      element.textContent = capitalize(user.role || "");
    });

    qsa("[data-user-initial]").forEach((element) => {
      const name = user.full_name || user.name || user.username || "U";

      element.textContent = name.charAt(0).toUpperCase();
    });
  }

  /* =====================================================
       FILE PREVIEW
       ===================================================== */

  function previewImage(fileInput, imageElement) {
    if (!fileInput || !imageElement) {
      return;
    }

    const file = fileInput.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast("Please select a valid image file.", "warning");
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      imageElement.src = reader.result;
    };

    reader.readAsDataURL(file);
  }

  /* =====================================================
       GENERIC MODALS
       ===================================================== */

  function initModals() {
    qsa("[data-modal-open]").forEach((button) => {
      button.addEventListener("click", () => {
        const selector = button.dataset.modalOpen;
        const modal = qs(selector);

        if (modal) {
          modal.classList.add("show");
          document.body.classList.add("no-scroll");
        }
      });
    });

    qsa("[data-modal-close]").forEach((button) => {
      button.addEventListener("click", () => {
        const modal = button.closest(".modal");

        if (modal) {
          modal.classList.remove("show");
          document.body.classList.remove("no-scroll");
        }
      });
    });

    qsa(".modal").forEach((modal) => {
      modal.addEventListener("click", (event) => {
        if (event.target === modal) {
          modal.classList.remove("show");
          document.body.classList.remove("no-scroll");
        }
      });
    });
  }

  /* =====================================================
       GLOBAL ERROR HANDLING
       ===================================================== */

  window.addEventListener("unhandledrejection", (event) => {
    console.error("Unhandled promise rejection:", event.reason);
  });

  /* =====================================================
       INITIALIZATION
       ===================================================== */

  ready(() => {
    initSidebar();
    setActiveMenu();
    initPasswordToggles();
    initLogoutButtons();
    initModals();
    populateCurrentUser();
  });

  /* =====================================================
       GLOBAL PORTAL OBJECT
       ===================================================== */

  window.Portal = {
    ready,
    qs,
    qsa,

    api,

    escapeHTML,
    formatDate,
    formatDateTime,
    capitalize,
    truncate,

    getQueryParam,

    formToObject,
    setButtonLoading,
    clearFormErrors,
    showFieldError,

    toast,
    confirmAction,

    setToken,
    getToken,
    setUser,
    getUser,
    saveSession,
    clearSession,
    isLoggedIn,

    getPageRole,
    getDashboardPath,
    getLoginPath,
    redirectToDashboard,
    redirectToLogin,
    requireAuth,

    populateCurrentUser,
    previewImage,
    logout,
  };
})();
