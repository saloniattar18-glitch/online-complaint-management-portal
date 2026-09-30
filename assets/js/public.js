/* =========================================================
   ONLINE COMPLAINT MANAGEMENT PORTAL
   Public Website JavaScript
   File: assets/js/public.js
   ========================================================= */

"use strict";

(function () {
  if (!window.Portal) {
    console.error("common.js must be loaded before public.js");
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
  } = Portal;

  /* =====================================================
       PUBLIC NAVIGATION
       ===================================================== */

  function initPublicNavigation() {
    const currentPage =
      window.location.pathname.split("/").pop().toLowerCase() || "index.html";

    qsa(".public-nav a").forEach((link) => {
      const href = (link.getAttribute("href") || "")
        .split("/")
        .pop()
        .toLowerCase();

      if (href === currentPage) {
        link.classList.add("active");
      }
    });

    const toggle = qs("[data-public-menu-toggle]");

    const nav = qs(".public-nav");

    if (toggle && nav) {
      toggle.addEventListener("click", () => {
        nav.classList.toggle("mobile-open");
      });
    }
  }

  /* =====================================================
       CONTACT FORM
       ===================================================== */

  async function submitContactForm(event) {
    event.preventDefault();

    const form = event.currentTarget;

    clearFormErrors(form);

    const name = qs('[name="name"]', form);

    const email = qs('[name="email"]', form);

    const subject = qs('[name="subject"]', form);

    const message = qs('[name="message"]', form);

    let valid = true;

    if (!name || name.value.trim().length < 2) {
      showFieldError(name, "Please enter your name.");

      valid = false;
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) {
      showFieldError(email, "Please enter a valid email.");

      valid = false;
    }

    if (subject && subject.value.trim().length < 3) {
      showFieldError(subject, "Please enter a subject.");

      valid = false;
    }

    if (!message || message.value.trim().length < 10) {
      showFieldError(message, "Message must contain at least 10 characters.");

      valid = false;
    }

    if (!valid) {
      return;
    }

    const button = qs('[type="submit"]', form);

    setButtonLoading(button, true, "Sending...");

    try {
      const response = await api("/api/contact", {
        method: "POST",
        data: formToObject(form),
        auth: false,
      });

      toast(
        response.message || "Your message has been sent successfully.",
        "success",
      );

      form.reset();
    } catch (error) {
      toast(error.message || "Unable to send message.", "error");
    } finally {
      setButtonLoading(button, false);
    }
  }

  /* =====================================================
       FAQ / ACCORDION
       ===================================================== */

  function initAccordions() {
    qsa("[data-accordion-button]").forEach((button) => {
      button.addEventListener("click", () => {
        const item = button.closest("[data-accordion-item]");

        if (!item) {
          return;
        }

        const content = qs("[data-accordion-content]", item);

        if (!content) {
          return;
        }

        const open = item.classList.toggle("open");

        content.style.display = open ? "block" : "none";
      });
    });
  }

  /* =====================================================
       SMOOTH ANCHOR SCROLL
       ===================================================== */

  function initAnchorScroll() {
    qsa('a[href^="#"]').forEach((link) => {
      link.addEventListener("click", (event) => {
        const targetId = link.getAttribute("href");

        if (!targetId || targetId === "#") {
          return;
        }

        const target = qs(targetId);

        if (!target) {
          return;
        }

        event.preventDefault();

        target.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
    });
  }

  /* =====================================================
       INITIALIZATION
       ===================================================== */

  ready(() => {
    initPublicNavigation();
    initAccordions();
    initAnchorScroll();

    const contactForm = qs("#contactForm");

    if (contactForm) {
      contactForm.addEventListener("submit", submitContactForm);
    }
  });
})();
