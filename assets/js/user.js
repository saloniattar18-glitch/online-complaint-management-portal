/* =========================================================
   ONLINE COMPLAINT MANAGEMENT PORTAL
   User Portal JavaScript
   File: assets/js/user.js
   ========================================================= */

"use strict";

(function () {
  if (!window.Portal) {
    console.error("common.js must be loaded before user.js");
    return;
  }

  const {
    ready,
    qs,
    qsa,
    api,
    escapeHTML,
    formatDate,
    formatDateTime,
    truncate,
    getQueryParam,
    setButtonLoading,
    toast,
    confirmAction,
    requireAuth,
    populateCurrentUser,
    previewImage,
  } = Portal;

  /* =====================================================
       DASHBOARD
       ===================================================== */

  async function loadDashboard() {
    const dashboard = qs("[data-user-dashboard]");

    if (!dashboard) {
      return;
    }

    try {
      const response = await api("/api/user/dashboard");

      const data = response.data || response;

      const stats = data.stats || data;

      setText("[data-stat-total]", stats.total_complaints ?? 0);

      setText("[data-stat-pending]", stats.pending_complaints ?? 0);

      setText("[data-stat-progress]", stats.in_progress_complaints ?? 0);

      setText("[data-stat-resolved]", stats.resolved_complaints ?? 0);

      const recent = data.recent_complaints || data.complaints || [];

      renderRecentComplaints(recent);
    } catch (error) {
      toast(error.message || "Unable to load dashboard.", "error");
    }
  }

  function setText(selector, value) {
    const element = qs(selector);

    if (element) {
      element.textContent = value;
    }
  }

  function renderRecentComplaints(complaints) {
    const container = qs("#recentComplaints");

    if (!container) {
      return;
    }

    if (!complaints.length) {
      container.innerHTML = `
                <div class="empty-state">
                    <i class="fa fa-inbox"></i>
                    <h3>No Complaints Yet</h3>
                    <p>
                        You have not submitted any complaints.
                    </p>
                </div>
            `;

      return;
    }

    container.innerHTML = complaints
      .slice(0, 5)
      .map(renderComplaintCard)
      .join("");
  }

  /* =====================================================
       SUBMIT COMPLAINT
       ===================================================== */

  async function loadComplaintOptions() {
    const categorySelect = qs('[name="category_id"]');

    const departmentSelect = qs('[name="department_id"]');

    if (categorySelect) {
      try {
        const response = await api("/api/categories");

        const categories = response.categories || response.data || response;

        fillSelect(categorySelect, categories, "Select Category");
      } catch (error) {
        console.error(error);
      }
    }

    if (departmentSelect) {
      try {
        const response = await api("/api/departments");

        const departments = response.departments || response.data || response;

        fillSelect(departmentSelect, departments, "Select Department");
      } catch (error) {
        console.error(error);
      }
    }
  }

  function fillSelect(select, items, placeholder) {
    if (!select || !Array.isArray(items)) {
      return;
    }

    select.innerHTML = `
            <option value="">
                ${escapeHTML(placeholder)}
            </option>
        `;

    items.forEach((item) => {
      const id = item.id ?? item.category_id ?? item.department_id;

      const name = item.name ?? item.category_name ?? item.department_name;

      const option = document.createElement("option");

      option.value = id;
      option.textContent = name;

      select.appendChild(option);
    });
  }

  async function submitComplaint(event) {
    event.preventDefault();

    const form = event.currentTarget;

    const title = qs('[name="title"]', form);

    const description = qs('[name="description"]', form);

    const category = qs('[name="category_id"]', form);

    let valid = true;

    qsa(".form-error", form).forEach((el) => el.remove());

    if (!title || title.value.trim().length < 5) {
      showInlineError(
        title,
        "Complaint title must contain at least 5 characters.",
      );

      valid = false;
    }

    if (!description || description.value.trim().length < 10) {
      showInlineError(description, "Please describe your complaint in detail.");

      valid = false;
    }

    if (!category || !category.value) {
      showInlineError(category, "Please select a category.");

      valid = false;
    }

    if (!valid) {
      return;
    }

    const button = qs('[type="submit"]', form);

    setButtonLoading(button, true, "Submitting...");

    try {
      const formData = new FormData(form);

      const response = await api("/api/complaints", {
        method: "POST",
        data: formData,
      });

      toast(response.message || "Complaint submitted successfully.", "success");

      const complaint = response.complaint || response.data;

      const complaintId = complaint?.id || complaint?.complaint_id;

      form.reset();

      const preview = qs("#complaintImagePreview");

      if (preview) {
        preview.src = "";
        preview.style.display = "none";
      }

      setTimeout(() => {
        if (complaintId) {
          window.location.href = `/user/complaint-details.html?id=${encodeURIComponent(
            complaintId,
          )}`;
        } else {
          window.location.href = "/user/complaints.html";
        }
      }, 600);
    } catch (error) {
      toast(error.message || "Unable to submit complaint.", "error");
    } finally {
      setButtonLoading(button, false);
    }
  }

  function showInlineError(field, message) {
    if (!field) {
      return;
    }

    field.classList.add("error");

    const div = document.createElement("div");

    div.className = "form-error";
    div.textContent = message;

    field.insertAdjacentElement("afterend", div);
  }

  /* =====================================================
       COMPLAINT LIST
       ===================================================== */

  async function loadComplaints() {
    const container = qs("#complaintsList");

    if (!container) {
      return;
    }

    container.innerHTML = `
            <div class="loader"></div>
        `;

    try {
      const params = new URLSearchParams();

      const status = qs("#statusFilter")?.value;

      const category = qs("#categoryFilter")?.value;

      const search = qs("#complaintSearch")?.value;

      if (status) {
        params.set("status", status);
      }

      if (category) {
        params.set("category_id", category);
      }

      if (search) {
        params.set("search", search.trim());
      }

      const url = params.toString()
        ? `/api/complaints?${params}`
        : "/api/complaints";

      const response = await api(url);

      const complaints =
        response.complaints || response.items || response.data || response;

      renderComplaintList(Array.isArray(complaints) ? complaints : []);
    } catch (error) {
      container.innerHTML = `
                <div class="alert alert-danger">
                    ${escapeHTML(error.message)}
                </div>
            `;
    }
  }

  function renderComplaintList(complaints) {
    const container = qs("#complaintsList");

    if (!container) {
      return;
    }

    if (!complaints.length) {
      container.innerHTML = `
                <div class="empty-state">
                    <i class="fa fa-inbox"></i>

                    <h3>No Complaints Found</h3>

                    <p>
                        No complaints match your current filters.
                    </p>
                </div>
            `;

      return;
    }

    container.innerHTML = complaints.map(renderComplaintCard).join("");
  }

  function renderComplaintCard(complaint) {
    const id = complaint.id ?? complaint.complaint_id;

    const complaintCode =
      complaint.complaint_code || complaint.ticket_no || `CMP-${id}`;

    const status = complaint.status || "pending";

    const priority = complaint.priority || "medium";

    return `
            <div class="complaint-card">

                <div class="complaint-header">

                    <div>
                        <div class="complaint-id">
                            ${escapeHTML(complaintCode)}
                        </div>

                        <div class="complaint-title">
                            ${escapeHTML(complaint.title || "Complaint")}
                        </div>
                    </div>

                    <span class="status-badge status-${statusClass(status)}">
                        ${escapeHTML(status)}
                    </span>

                </div>

                <div class="complaint-meta">

                    <span>
                        <i class="fa fa-folder"></i>
                        ${escapeHTML(
                          complaint.category_name ||
                            complaint.category ||
                            "Uncategorized",
                        )}
                    </span>

                    <span>
                        <i class="fa fa-calendar"></i>
                        ${formatDate(
                          complaint.created_at || complaint.created_date,
                        )}
                    </span>

                    <span class="priority-${escapeHTML(
                      String(priority).toLowerCase(),
                    )}">
                        <i class="fa fa-flag"></i>
                        ${escapeHTML(priority)}
                    </span>

                </div>

                <div class="complaint-description">
                    ${escapeHTML(truncate(complaint.description, 180))}
                </div>

                <div class="complaint-card-actions">

                    <a
                        href="/user/complaint-details.html?id=${encodeURIComponent(id)}"
                        class="btn btn-theme btn-sm"
                    >
                        <i class="fa fa-eye"></i>
                        View Details
                    </a>

                    <a
                        href="/user/complaint-status.html?id=${encodeURIComponent(id)}"
                        class="btn btn-info btn-sm"
                    >
                        <i class="fa fa-history"></i>
                        Track Status
                    </a>

                </div>

            </div>
        `;
  }

  function statusClass(status) {
    return String(status)
      .toLowerCase()
      .replaceAll("_", "-")
      .replaceAll(" ", "-");
  }

  /* =====================================================
       COMPLAINT DETAILS
       ===================================================== */

  async function loadComplaintDetails() {
    const container = qs("#complaintDetails");

    if (!container) {
      return;
    }

    const id = getQueryParam("id");

    if (!id) {
      container.innerHTML = `
                <div class="alert alert-danger">
                    Complaint ID is missing.
                </div>
            `;

      return;
    }

    try {
      const response = await api(`/api/complaints/${encodeURIComponent(id)}`);

      const complaint = response.complaint || response.data || response;

      renderComplaintDetails(complaint);
    } catch (error) {
      container.innerHTML = `
                <div class="alert alert-danger">
                    ${escapeHTML(error.message)}
                </div>
            `;
    }
  }

  function renderComplaintDetails(complaint) {
    const container = qs("#complaintDetails");

    if (!container) {
      return;
    }

    const code =
      complaint.complaint_code ||
      complaint.ticket_no ||
      `CMP-${complaint.id || complaint.complaint_id}`;

    const image =
      complaint.image_url || complaint.image || complaint.attachment_url;

    container.innerHTML = `
            <div class="portal-card">

                <div class="panel-header panel-header-with-action">

                    <div>
                        <h3>
                            ${escapeHTML(
                              complaint.title || "Complaint Details",
                            )}
                        </h3>

                        <small class="complaint-id">
                            ${escapeHTML(code)}
                        </small>
                    </div>

                    <span class="status-badge status-${statusClass(
                      complaint.status || "pending",
                    )}">
                        ${escapeHTML(complaint.status || "Pending")}
                    </span>

                </div>

                <div class="complaint-detail-grid">

                    ${detailItem(
                      "Category",
                      complaint.category_name || complaint.category,
                    )}

                    ${detailItem(
                      "Department",
                      complaint.department_name ||
                        complaint.department ||
                        "Not Assigned",
                    )}

                    ${detailItem("Priority", complaint.priority || "Medium")}

                    ${detailItem(
                      "Submitted On",
                      formatDateTime(complaint.created_at),
                    )}

                </div>

                <div class="mt-20">
                    <h4>Description</h4>

                    <p>
                        ${escapeHTML(complaint.description || "-")}
                    </p>
                </div>

                ${
                  image
                    ? `
                            <div class="mt-20">
                                <h4>Attachment</h4>

                                <a
                                    href="${escapeHTML(image)}"
                                    target="_blank"
                                    rel="noopener"
                                >
                                    <img
                                        src="${escapeHTML(image)}"
                                        class="complaint-image"
                                        alt="Complaint Attachment"
                                    >
                                </a>
                            </div>
                        `
                    : ""
                }

                ${
                  complaint.resolution
                    ? `
                            <div class="alert alert-success mt-20">
                                <strong>Resolution:</strong>
                                ${escapeHTML(complaint.resolution)}
                            </div>
                        `
                    : ""
                }

            </div>
        `;
  }

  function detailItem(label, value) {
    return `
            <div class="detail-item">
                <span class="detail-label">
                    ${escapeHTML(label)}
                </span>

                <span class="detail-value">
                    ${escapeHTML(value || "-")}
                </span>
            </div>
        `;
  }

  /* =====================================================
       STATUS TIMELINE
       ===================================================== */

  async function loadComplaintStatus() {
    const container = qs("#complaintStatusTimeline");

    if (!container) {
      return;
    }

    const id = getQueryParam("id");

    if (!id) {
      return;
    }

    try {
      const response = await api(
        `/api/complaints/${encodeURIComponent(id)}/status`,
      );

      const history =
        response.history || response.status_history || response.data || [];

      renderStatusTimeline(Array.isArray(history) ? history : []);
    } catch (error) {
      container.innerHTML = `
                <div class="alert alert-danger">
                    ${escapeHTML(error.message)}
                </div>
            `;
    }
  }

  function renderStatusTimeline(history) {
    const container = qs("#complaintStatusTimeline");

    if (!container) {
      return;
    }

    if (!history.length) {
      container.innerHTML = `
                <div class="alert alert-info">
                    No status updates are available yet.
                </div>
            `;

      return;
    }

    container.innerHTML = `
            <div class="status-timeline">

                ${history
                  .map(
                    (item, index) => `
                            <div
                                class="timeline-item ${
                                  index === history.length - 1
                                    ? "current"
                                    : "completed"
                                }"
                            >
                                <h5>
                                    ${escapeHTML(
                                      item.status || item.title || "Updated",
                                    )}
                                </h5>

                                <p>
                                    ${escapeHTML(
                                      item.message || item.remarks || "",
                                    )}
                                </p>

                                <p>
                                    ${formatDateTime(
                                      item.created_at || item.updated_at,
                                    )}
                                </p>
                            </div>
                        `,
                  )
                  .join("")}

            </div>
        `;
  }

  /* =====================================================
       USER PROFILE
       ===================================================== */

  async function loadProfile() {
    const form = qs("#profileForm");

    if (!form) {
      return;
    }

    try {
      const response = await api("/api/profile");

      const user =
        response.user || response.profile || response.data || response;

      fillProfileForm(form, user);
    } catch (error) {
      toast(error.message || "Unable to load profile.", "error");
    }
  }

  function fillProfileForm(form, data) {
    Object.entries(data || {}).forEach(([key, value]) => {
      const field = qs(`[name="${key}"]`, form);

      if (field && value !== null && value !== undefined) {
        field.value = value;
      }
    });
  }

  async function updateProfile(event) {
    event.preventDefault();

    const form = event.currentTarget;

    const button = qs('[type="submit"]', form);

    setButtonLoading(button, true, "Saving...");

    try {
      const response = await api("/api/profile", {
        method: "PUT",
        data: Object.fromEntries(new FormData(form)),
      });

      if (response.user) {
        Portal.setUser(response.user);
        populateCurrentUser();
      }

      toast(response.message || "Profile updated successfully.", "success");
    } catch (error) {
      toast(error.message || "Unable to update profile.", "error");
    } finally {
      setButtonLoading(button, false);
    }
  }

  /* =====================================================
       FEEDBACK
       ===================================================== */

  async function submitFeedback(event) {
    event.preventDefault();

    const form = event.currentTarget;

    const button = qs('[type="submit"]', form);

    setButtonLoading(button, true, "Submitting...");

    try {
      const payload = Object.fromEntries(new FormData(form));

      const complaintId = getQueryParam("id");

      if (complaintId && !payload.complaint_id) {
        payload.complaint_id = complaintId;
      }

      const response = await api("/api/feedback", {
        method: "POST",
        data: payload,
      });

      toast(response.message || "Thank you for your feedback.", "success");

      form.reset();
    } catch (error) {
      toast(error.message || "Unable to submit feedback.", "error");
    } finally {
      setButtonLoading(button, false);
    }
  }

  /* =====================================================
       IMAGE PREVIEW
       ===================================================== */

  function initComplaintImagePreview() {
    const input = qs(
      '#complaintForm input[type="file"][name="image"], ' +
        '#complaintForm input[type="file"][name="attachment"]',
    );

    const image = qs("#complaintImagePreview");

    if (!input || !image) {
      return;
    }

    input.addEventListener("change", () => {
      previewImage(input, image);

      image.style.display = input.files?.length ? "block" : "none";
    });
  }

  /* =====================================================
       FILTER EVENTS
       ===================================================== */

  function initComplaintFilters() {
    const status = qs("#statusFilter");

    const category = qs("#categoryFilter");

    const search = qs("#complaintSearch");

    const filterButton = qs("#filterComplaints");

    if (status) {
      status.addEventListener("change", loadComplaints);
    }

    if (category) {
      category.addEventListener("change", loadComplaints);
    }

    if (filterButton) {
      filterButton.addEventListener("click", loadComplaints);
    }

    if (search) {
      let timer;

      search.addEventListener("input", () => {
        clearTimeout(timer);

        timer = setTimeout(loadComplaints, 350);
      });
    }
  }

  /* =====================================================
       INITIALIZATION
       ===================================================== */

  ready(() => {
    if (!requireAuth("user")) {
      return;
    }

    populateCurrentUser();

    loadDashboard();
    loadComplaintOptions();
    loadComplaints();
    loadComplaintDetails();
    loadComplaintStatus();
    loadProfile();

    initComplaintImagePreview();
    initComplaintFilters();

    const complaintForm = qs("#complaintForm");

    if (complaintForm) {
      complaintForm.addEventListener("submit", submitComplaint);
    }

    const profileForm = qs("#profileForm");

    if (profileForm) {
      profileForm.addEventListener("submit", updateProfile);
    }

    const feedbackForm = qs("#feedbackForm");

    if (feedbackForm) {
      feedbackForm.addEventListener("submit", submitFeedback);
    }
  });
})();
