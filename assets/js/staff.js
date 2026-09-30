/* =========================================================
   ONLINE COMPLAINT MANAGEMENT PORTAL
   Staff Portal JavaScript
   File: assets/js/staff.js
   ========================================================= */

"use strict";

(function () {
  if (!window.Portal) {
    console.error("common.js must be loaded before staff.js");
    return;
  }

  const {
    ready,
    qs,
    api,
    escapeHTML,
    formatDate,
    formatDateTime,
    truncate,
    getQueryParam,
    setButtonLoading,
    toast,
    requireAuth,
    populateCurrentUser,
  } = Portal;

  /* =====================================================
       HELPERS
       ===================================================== */

  function setText(selector, value) {
    const element = qs(selector);

    if (element) {
      element.textContent = value;
    }
  }

  function statusClass(value) {
    return String(value || "pending")
      .toLowerCase()
      .replaceAll("_", "-")
      .replaceAll(" ", "-");
  }

  /* =====================================================
       STAFF DASHBOARD
       ===================================================== */

  async function loadDashboard() {
    if (!qs("[data-staff-dashboard]")) {
      return;
    }

    try {
      const response = await api("/api/staff/dashboard");

      const data = response.data || response;

      const stats = data.stats || data;

      setText("[data-stat-assigned]", stats.assigned_complaints ?? 0);

      setText("[data-stat-progress]", stats.in_progress_complaints ?? 0);

      setText("[data-stat-resolved]", stats.resolved_complaints ?? 0);

      setText("[data-stat-overdue]", stats.overdue_complaints ?? 0);

      const recent = data.recent_complaints || data.complaints || [];

      renderAssignedComplaints(recent, "#recentAssignedComplaints");
    } catch (error) {
      toast(error.message || "Unable to load dashboard.", "error");
    }
  }

  /* =====================================================
       ASSIGNED COMPLAINTS
       ===================================================== */

  async function loadAssignedComplaints() {
    const container = qs("#assignedComplaints");

    if (!container) {
      return;
    }

    container.innerHTML = `
            <div class="loader"></div>
        `;

    try {
      const params = new URLSearchParams();

      const status = qs("#statusFilter")?.value;

      const priority = qs("#priorityFilter")?.value;

      const search = qs("#complaintSearch")?.value;

      if (status) {
        params.set("status", status);
      }

      if (priority) {
        params.set("priority", priority);
      }

      if (search) {
        params.set("search", search.trim());
      }

      const endpoint = params.toString()
        ? `/api/staff/complaints?${params}`
        : "/api/staff/complaints";

      const response = await api(endpoint);

      const complaints =
        response.complaints || response.items || response.data || response;

      renderAssignedComplaints(
        Array.isArray(complaints) ? complaints : [],
        "#assignedComplaints",
      );
    } catch (error) {
      container.innerHTML = `
                <div class="alert alert-danger">
                    ${escapeHTML(error.message)}
                </div>
            `;
    }
  }

  function renderAssignedComplaints(complaints, selector) {
    const container = qs(selector);

    if (!container) {
      return;
    }

    if (!complaints.length) {
      container.innerHTML = `
                <div class="empty-state">

                    <i class="fa fa-check-circle"></i>

                    <h3>No Assigned Complaints</h3>

                    <p>
                        There are currently no complaints assigned to you.
                    </p>

                </div>
            `;

      return;
    }

    container.innerHTML = complaints.map(renderComplaintCard).join("");
  }

  function renderComplaintCard(complaint) {
    const id = complaint.id ?? complaint.complaint_id;

    const code = complaint.complaint_code || complaint.ticket_no || `CMP-${id}`;

    const priority = String(complaint.priority || "medium").toLowerCase();

    const status = complaint.status || "assigned";

    return `
            <div class="assigned-complaint-card priority-${escapeHTML(
              priority,
            )}-card">

                <div class="assigned-card-head">

                    <div>
                        <div class="complaint-code">
                            ${escapeHTML(code)}
                        </div>

                        <h4>
                            ${escapeHTML(complaint.title || "Complaint")}
                        </h4>
                    </div>

                    <span class="status-badge status-${statusClass(status)}">
                        ${escapeHTML(status)}
                    </span>

                </div>

                <div class="assigned-meta">

                    <span>
                        <i class="fa fa-user"></i>
                        ${escapeHTML(
                          complaint.user_name ||
                            complaint.customer_name ||
                            "User",
                        )}
                    </span>

                    <span>
                        <i class="fa fa-folder"></i>
                        ${escapeHTML(
                          complaint.category_name ||
                            complaint.category ||
                            "General",
                        )}
                    </span>

                    <span>
                        <i class="fa fa-calendar"></i>
                        ${formatDate(complaint.created_at)}
                    </span>

                    <span class="priority-${escapeHTML(priority)}">
                        <i class="fa fa-flag"></i>
                        ${escapeHTML(priority)}
                    </span>

                </div>

                <p class="assigned-description">
                    ${escapeHTML(truncate(complaint.description, 180))}
                </p>

                <div class="assigned-actions">

                    <a
                        href="/staff/complaint-details.html?id=${encodeURIComponent(id)}"
                        class="btn btn-info btn-sm"
                    >
                        <i class="fa fa-eye"></i>
                        View / Update
                    </a>

                </div>

            </div>
        `;
  }

  /* =====================================================
       COMPLAINT DETAILS
       ===================================================== */

  async function loadComplaintDetails() {
    const container = qs("#staffComplaintDetails");

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
      const response = await api(
        `/api/staff/complaints/${encodeURIComponent(id)}`,
      );

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
    const container = qs("#staffComplaintDetails");

    if (!container) {
      return;
    }

    const code =
      complaint.complaint_code ||
      complaint.ticket_no ||
      `CMP-${complaint.id || complaint.complaint_id}`;

    const image =
      complaint.image_url || complaint.attachment_url || complaint.image;

    container.innerHTML = `
            <div class="portal-card">

                <div class="panel-header">

                    <h3>
                        ${escapeHTML(complaint.title || "Complaint Details")}
                    </h3>

                    <span class="complaint-id">
                        ${escapeHTML(code)}
                    </span>

                </div>

                <div class="complaint-detail-grid">

                    ${detailItem(
                      "Complainant",
                      complaint.user_name || complaint.customer_name,
                    )}

                    ${detailItem(
                      "Category",
                      complaint.category_name || complaint.category,
                    )}

                    ${detailItem("Priority", complaint.priority || "Medium")}

                    ${detailItem(
                      "Current Status",
                      complaint.status || "Assigned",
                    )}

                    ${detailItem(
                      "Created On",
                      formatDateTime(complaint.created_at),
                    )}

                    ${detailItem(
                      "Due Date",
                      formatDateTime(complaint.due_date),
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

            </div>
        `;

    const statusSelect = qs('#statusUpdateForm [name="status"]');

    if (statusSelect && complaint.status) {
      statusSelect.value = complaint.status;
    }
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
       STATUS UPDATE
       ===================================================== */

  async function updateComplaintStatus(event) {
    event.preventDefault();

    const id = getQueryParam("id");

    if (!id) {
      toast("Complaint ID is missing.", "error");

      return;
    }

    const form = event.currentTarget;

    const status = qs('[name="status"]', form);

    if (!status || !status.value) {
      toast("Please select a status.", "warning");

      return;
    }

    const button = qs('[type="submit"]', form);

    setButtonLoading(button, true, "Updating...");

    try {
      const payload = Object.fromEntries(new FormData(form));

      const response = await api(
        `/api/staff/complaints/${encodeURIComponent(id)}/status`,
        {
          method: "PUT",
          data: payload,
        },
      );

      toast(
        response.message || "Complaint status updated successfully.",
        "success",
      );

      await loadComplaintDetails();
      await loadStatusHistory();
    } catch (error) {
      toast(error.message || "Unable to update complaint.", "error");
    } finally {
      setButtonLoading(button, false);
    }
  }

  /* =====================================================
       STATUS HISTORY
       ===================================================== */

  async function loadStatusHistory() {
    const container = qs("#staffStatusHistory");

    if (!container) {
      return;
    }

    const id = getQueryParam("id");

    if (!id) {
      return;
    }

    try {
      const response = await api(
        `/api/staff/complaints/${encodeURIComponent(id)}/history`,
      );

      const history = response.history || response.data || [];

      if (!history.length) {
        container.innerHTML = `
                    <p class="text-muted">
                        No status updates yet.
                    </p>
                `;

        return;
      }

      container.innerHTML = history
        .map(
          (item) => `
                            <div class="staff-note-item">

                                <div class="staff-note-head">

                                    <strong>
                                        ${escapeHTML(item.status || "Updated")}
                                    </strong>

                                    <small>
                                        ${formatDateTime(item.created_at)}
                                    </small>

                                </div>

                                <p>
                                    ${escapeHTML(
                                      item.remarks || item.message || "",
                                    )}
                                </p>

                            </div>
                        `,
        )
        .join("");
    } catch (error) {
      console.error(error);
    }
  }

  /* =====================================================
       PROFILE
       ===================================================== */

  async function loadProfile() {
    const form = qs("#staffProfileForm");

    if (!form) {
      return;
    }

    try {
      const response = await api("/api/profile");

      const profile =
        response.profile || response.user || response.data || response;

      Object.entries(profile || {}).forEach(([key, value]) => {
        const field = qs(`[name="${key}"]`, form);

        if (field && value !== null && value !== undefined) {
          field.value = value;
        }
      });
    } catch (error) {
      toast(error.message, "error");
    }
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
      toast(error.message, "error");
    } finally {
      setButtonLoading(button, false);
    }
  }

  /* =====================================================
       FILTERS
       ===================================================== */

  function initFilters() {
    const status = qs("#statusFilter");

    const priority = qs("#priorityFilter");

    const search = qs("#complaintSearch");

    if (status) {
      status.addEventListener("change", loadAssignedComplaints);
    }

    if (priority) {
      priority.addEventListener("change", loadAssignedComplaints);
    }

    if (search) {
      let timer;

      search.addEventListener("input", () => {
        clearTimeout(timer);

        timer = setTimeout(loadAssignedComplaints, 350);
      });
    }
  }

  /* =====================================================
       INITIALIZATION
       ===================================================== */

  ready(() => {
    if (!requireAuth("staff")) {
      return;
    }

    populateCurrentUser();

    loadDashboard();
    loadAssignedComplaints();
    loadComplaintDetails();
    loadStatusHistory();
    loadProfile();

    initFilters();

    const updateForm = qs("#statusUpdateForm");

    if (updateForm) {
      updateForm.addEventListener("submit", updateComplaintStatus);
    }

    const profileForm = qs("#staffProfileForm");

    if (profileForm) {
      profileForm.addEventListener("submit", updateProfile);
    }
  });
})();
