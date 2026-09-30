/* =========================================================
   ONLINE COMPLAINT MANAGEMENT PORTAL
   Admin Portal JavaScript
   File: assets/js/admin.js
   ========================================================= */

"use strict";

(function () {
  if (!window.Portal) {
    console.error("common.js must be loaded before admin.js");
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

  function getArray(response, keys = []) {
    for (const key of keys) {
      if (Array.isArray(response?.[key])) {
        return response[key];
      }
    }

    if (Array.isArray(response?.data)) {
      return response.data;
    }

    if (Array.isArray(response)) {
      return response;
    }

    return [];
  }

  function statusClass(status) {
    return String(status || "pending")
      .toLowerCase()
      .replaceAll("_", "-")
      .replaceAll(" ", "-");
  }

  /* =====================================================
       DASHBOARD
       ===================================================== */

  async function loadDashboard() {
    if (!qs("[data-admin-dashboard]")) {
      return;
    }

    try {
      const response = await api("/api/admin/dashboard");

      const data = response.data || response;

      const stats = data.stats || data;

      setText("[data-stat-users]", stats.total_users ?? 0);

      setText("[data-stat-complaints]", stats.total_complaints ?? 0);

      setText("[data-stat-pending]", stats.pending_complaints ?? 0);

      setText("[data-stat-resolved]", stats.resolved_complaints ?? 0);

      setText("[data-stat-staff]", stats.total_staff ?? 0);

      setText("[data-stat-departments]", stats.total_departments ?? 0);

      renderRecentComplaints(data.recent_complaints || []);
    } catch (error) {
      toast(error.message || "Unable to load admin dashboard.", "error");
    }
  }

  function renderRecentComplaints(complaints) {
    const tbody = qs("#recentComplaintsTable");

    if (!tbody) {
      return;
    }

    if (!complaints.length) {
      tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center">
                        No complaints found.
                    </td>
                </tr>
            `;

      return;
    }

    tbody.innerHTML = complaints
      .map(
        (item) => `
                        <tr>

                            <td>
                                ${escapeHTML(
                                  item.complaint_code ||
                                    `CMP-${item.id || item.complaint_id}`,
                                )}
                            </td>

                            <td>
                                ${escapeHTML(item.title || "-")}
                            </td>

                            <td>
                                ${escapeHTML(item.user_name || "-")}
                            </td>

                            <td>
                                ${escapeHTML(item.category_name || "-")}
                            </td>

                            <td>
                                <span class="status-badge status-${statusClass(
                                  item.status,
                                )}">
                                    ${escapeHTML(item.status || "Pending")}
                                </span>
                            </td>

                            <td>
                                ${formatDate(item.created_at)}
                            </td>

                            <td class="actions">

                                <a
                                    href="/admin/complaint-details.html?id=${encodeURIComponent(
                                      item.id || item.complaint_id,
                                    )}"
                                    class="btn btn-info btn-sm"
                                >
                                    View
                                </a>

                            </td>

                        </tr>
                    `,
      )
      .join("");
  }

  /* =====================================================
       ADMIN COMPLAINT LIST
       ===================================================== */

  async function loadComplaints() {
    const tbody = qs("#complaintsTableBody");

    if (!tbody) {
      return;
    }

    tbody.innerHTML = `
            <tr>
                <td colspan="9" class="text-center">
                    Loading...
                </td>
            </tr>
        `;

    try {
      const params = new URLSearchParams();

      const status = qs("#statusFilter")?.value;

      const priority = qs("#priorityFilter")?.value;

      const department = qs("#departmentFilter")?.value;

      const category = qs("#categoryFilter")?.value;

      const search = qs("#complaintSearch")?.value;

      if (status) {
        params.set("status", status);
      }

      if (priority) {
        params.set("priority", priority);
      }

      if (department) {
        params.set("department_id", department);
      }

      if (category) {
        params.set("category_id", category);
      }

      if (search) {
        params.set("search", search.trim());
      }

      const endpoint = params.toString()
        ? `/api/admin/complaints?${params}`
        : "/api/admin/complaints";

      const response = await api(endpoint);

      const complaints = getArray(response, ["complaints", "items"]);

      renderComplaintsTable(complaints);
    } catch (error) {
      tbody.innerHTML = `
                <tr>
                    <td colspan="9">
                        <div class="alert alert-danger">
                            ${escapeHTML(error.message)}
                        </div>
                    </td>
                </tr>
            `;
    }
  }

  function renderComplaintsTable(complaints) {
    const tbody = qs("#complaintsTableBody");

    if (!tbody) {
      return;
    }

    if (!complaints.length) {
      tbody.innerHTML = `
                <tr>
                    <td colspan="9" class="text-center">
                        No complaints found.
                    </td>
                </tr>
            `;

      return;
    }

    tbody.innerHTML = complaints
      .map(
        (item) => `
                        <tr>

                            <td>
                                ${escapeHTML(
                                  item.complaint_code ||
                                    `CMP-${item.id || item.complaint_id}`,
                                )}
                            </td>

                            <td>
                                ${escapeHTML(truncate(item.title, 40))}
                            </td>

                            <td>
                                ${escapeHTML(item.user_name || "-")}
                            </td>

                            <td>
                                ${escapeHTML(item.category_name || "-")}
                            </td>

                            <td>
                                ${escapeHTML(
                                  item.department_name || "Unassigned",
                                )}
                            </td>

                            <td class="priority-${escapeHTML(
                              String(item.priority || "medium").toLowerCase(),
                            )}">
                                ${escapeHTML(item.priority || "Medium")}
                            </td>

                            <td>
                                <span class="status-badge status-${statusClass(
                                  item.status,
                                )}">
                                    ${escapeHTML(item.status || "Pending")}
                                </span>
                            </td>

                            <td>
                                ${formatDate(item.created_at)}
                            </td>

                            <td class="actions">

                                <a
                                    href="/admin/complaint-details.html?id=${encodeURIComponent(
                                      item.id || item.complaint_id,
                                    )}"
                                    class="btn btn-info btn-sm"
                                >
                                    <i class="fa fa-eye"></i>
                                </a>

                            </td>

                        </tr>
                    `,
      )
      .join("");
  }

  /* =====================================================
       COMPLAINT DETAILS
       ===================================================== */

  async function loadComplaintDetails() {
    const container = qs("#adminComplaintDetails");

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
        `/api/admin/complaints/${encodeURIComponent(id)}`,
      );

      const complaint = response.complaint || response.data || response;

      renderComplaintDetails(complaint);

      await loadAssignmentOptions();
    } catch (error) {
      container.innerHTML = `
                <div class="alert alert-danger">
                    ${escapeHTML(error.message)}
                </div>
            `;
    }
  }

  function renderComplaintDetails(complaint) {
    const container = qs("#adminComplaintDetails");

    if (!container) {
      return;
    }

    const code =
      complaint.complaint_code ||
      `CMP-${complaint.id || complaint.complaint_id}`;

    const image =
      complaint.image_url || complaint.attachment_url || complaint.image;

    container.innerHTML = `
            <div class="portal-card">

                <div class="panel-header panel-header-with-action">

                    <div>
                        <h3>
                            ${escapeHTML(complaint.title || "Complaint")}
                        </h3>

                        <span class="complaint-id">
                            ${escapeHTML(code)}
                        </span>
                    </div>

                    <span class="status-badge status-${statusClass(
                      complaint.status,
                    )}">
                        ${escapeHTML(complaint.status || "Pending")}
                    </span>

                </div>

                <div class="admin-detail-grid">

                    ${detail(
                      "User",
                      complaint.user_name || complaint.customer_name,
                    )}

                    ${detail("Email", complaint.user_email || complaint.email)}

                    ${detail("Category", complaint.category_name)}

                    ${detail(
                      "Department",
                      complaint.department_name || "Not Assigned",
                    )}

                    ${detail(
                      "Assigned Staff",
                      complaint.staff_name || "Not Assigned",
                    )}

                    ${detail("Priority", complaint.priority || "Medium")}

                    ${detail(
                      "Submitted On",
                      formatDateTime(complaint.created_at),
                    )}

                    ${detail(
                      "Last Updated",
                      formatDateTime(complaint.updated_at),
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
                                        alt="Complaint Attachment"
                                        class="complaint-image"
                                    >
                                </a>

                            </div>
                        `
                    : ""
                }

            </div>
        `;

    const status = qs('#adminStatusForm [name="status"]');

    if (status && complaint.status) {
      status.value = complaint.status;
    }
  }

  function detail(label, value) {
    return `
            <div class="admin-detail-item">

                <span>
                    ${escapeHTML(label)}
                </span>

                <strong>
                    ${escapeHTML(value || "-")}
                </strong>

            </div>
        `;
  }

  /* =====================================================
       ASSIGN COMPLAINT
       ===================================================== */

  async function loadAssignmentOptions() {
    const departmentSelect = qs('#assignComplaintForm [name="department_id"]');

    const staffSelect = qs('#assignComplaintForm [name="staff_id"]');

    if (!departmentSelect && !staffSelect) {
      return;
    }

    try {
      if (departmentSelect) {
        const response = await api("/api/departments");

        const departments = getArray(response, ["departments"]);

        fillSelect(
          departmentSelect,
          departments,
          "Select Department",
          "department_id",
        );
      }

      if (staffSelect) {
        const response = await api("/api/admin/staff");

        const staff = getArray(response, ["staff", "users"]);

        fillSelect(staffSelect, staff, "Select Staff", "staff_id");
      }
    } catch (error) {
      console.error(error);
    }
  }

  function fillSelect(select, items, placeholder, idField) {
    select.innerHTML = `
            <option value="">
                ${escapeHTML(placeholder)}
            </option>
        `;

    items.forEach((item) => {
      const id = item[idField] ?? item.id ?? item.user_id;

      const name =
        item.full_name || item.name || item.department_name || item.staff_name;

      const option = document.createElement("option");

      option.value = id;
      option.textContent = name || `#${id}`;

      select.appendChild(option);
    });
  }

  async function assignComplaint(event) {
    event.preventDefault();

    const id = getQueryParam("id");

    if (!id) {
      return;
    }

    const form = event.currentTarget;

    const button = qs('[type="submit"]', form);

    setButtonLoading(button, true, "Assigning...");

    try {
      const payload = Object.fromEntries(new FormData(form));

      const response = await api(
        `/api/admin/complaints/${encodeURIComponent(id)}/assign`,
        {
          method: "PUT",
          data: payload,
        },
      );

      toast(response.message || "Complaint assigned successfully.", "success");

      await loadComplaintDetails();
    } catch (error) {
      toast(error.message, "error");
    } finally {
      setButtonLoading(button, false);
    }
  }

  /* =====================================================
       ADMIN STATUS UPDATE
       ===================================================== */

  async function updateStatus(event) {
    event.preventDefault();

    const id = getQueryParam("id");

    if (!id) {
      return;
    }

    const form = event.currentTarget;

    const button = qs('[type="submit"]', form);

    setButtonLoading(button, true, "Updating...");

    try {
      const response = await api(
        `/api/admin/complaints/${encodeURIComponent(id)}/status`,
        {
          method: "PUT",
          data: Object.fromEntries(new FormData(form)),
        },
      );

      toast(response.message || "Status updated successfully.", "success");

      await loadComplaintDetails();
    } catch (error) {
      toast(error.message, "error");
    } finally {
      setButtonLoading(button, false);
    }
  }

  /* =====================================================
       USERS
       ===================================================== */

  async function loadUsers() {
    const tbody = qs("#usersTableBody");

    if (!tbody) {
      return;
    }

    try {
      const response = await api("/api/admin/users");

      const users = getArray(response, ["users"]);

      if (!users.length) {
        tbody.innerHTML = `
                    <tr>
                        <td colspan="7" class="text-center">
                            No users found.
                        </td>
                    </tr>
                `;

        return;
      }

      tbody.innerHTML = users
        .map(
          (user) => `
                            <tr>

                                <td>
                                    ${escapeHTML(user.id || user.user_id)}
                                </td>

                                <td>
                                    <div class="table-user">

                                        <div class="table-avatar">
                                            ${escapeHTML(
                                              (
                                                user.full_name ||
                                                user.name ||
                                                "U"
                                              )
                                                .charAt(0)
                                                .toUpperCase(),
                                            )}
                                        </div>

                                        <div class="table-user-info">

                                            <strong>
                                                ${escapeHTML(
                                                  user.full_name ||
                                                    user.name ||
                                                    "-",
                                                )}
                                            </strong>

                                            <small>
                                                ${escapeHTML(user.email || "")}
                                            </small>

                                        </div>

                                    </div>
                                </td>

                                <td>
                                    ${escapeHTML(user.mobile || "-")}
                                </td>

                                <td>
                                    ${escapeHTML(user.role || "user")}
                                </td>

                                <td>
                                    <span class="status-badge status-${
                                      user.status === "inactive"
                                        ? "closed"
                                        : "active"
                                    }">
                                        ${escapeHTML(user.status || "active")}
                                    </span>
                                </td>

                                <td>
                                    ${formatDate(user.created_at)}
                                </td>

                                <td class="actions">

                                    <a
                                        href="/admin/user-details.html?id=${encodeURIComponent(
                                          user.id || user.user_id,
                                        )}"
                                        class="btn btn-info btn-sm"
                                    >
                                        View
                                    </a>

                                </td>

                            </tr>
                        `,
        )
        .join("");
    } catch (error) {
      tbody.innerHTML = `
                <tr>
                    <td colspan="7">
                        ${escapeHTML(error.message)}
                    </td>
                </tr>
            `;
    }
  }

  /* =====================================================
       USER DETAILS
       ===================================================== */

  async function loadUserDetails() {
    const container = qs("#userDetails");

    if (!container) {
      return;
    }

    const id = getQueryParam("id");

    if (!id) {
      return;
    }

    try {
      const response = await api(`/api/admin/users/${encodeURIComponent(id)}`);

      const user = response.user || response.data || response;

      container.innerHTML = `
                <div class="portal-card">

                    <div class="panel-header">
                        <h3>
                            ${escapeHTML(user.full_name || user.name || "User")}
                        </h3>
                    </div>

                    <div class="admin-detail-grid">

                        ${detail("Email", user.email)}

                        ${detail("Mobile", user.mobile)}

                        ${detail("Role", user.role)}

                        ${detail("Status", user.status || "Active")}

                        ${detail("Registered", formatDateTime(user.created_at))}

                        ${detail(
                          "Total Complaints",
                          user.total_complaints ?? 0,
                        )}

                    </div>

                </div>
            `;
    } catch (error) {
      container.innerHTML = `
                <div class="alert alert-danger">
                    ${escapeHTML(error.message)}
                </div>
            `;
    }
  }

  /* =====================================================
       CATEGORIES
       ===================================================== */

  async function loadCategories() {
    const tbody = qs("#categoriesTableBody");

    if (!tbody) {
      return;
    }

    try {
      const response = await api("/api/categories");

      const categories = getArray(response, ["categories"]);

      tbody.innerHTML = categories.length
        ? categories
            .map(
              (category) => `
                                <tr>

                                    <td>
                                        ${escapeHTML(
                                          category.id || category.category_id,
                                        )}
                                    </td>

                                    <td>
                                        ${escapeHTML(
                                          category.name ||
                                            category.category_name,
                                        )}
                                    </td>

                                    <td>
                                        ${escapeHTML(
                                          category.description || "-",
                                        )}
                                    </td>

                                    <td>
                                        ${formatDate(category.created_at)}
                                    </td>

                                    <td class="actions">

                                        <button
                                            type="button"
                                            class="btn btn-danger btn-sm"
                                            data-delete-category="${escapeHTML(
                                              category.id ||
                                                category.category_id,
                                            )}"
                                        >
                                            Delete
                                        </button>

                                    </td>

                                </tr>
                            `,
            )
            .join("")
        : `
                        <tr>
                            <td colspan="5" class="text-center">
                                No categories found.
                            </td>
                        </tr>
                    `;
    } catch (error) {
      tbody.innerHTML = `
                <tr>
                    <td colspan="5">
                        ${escapeHTML(error.message)}
                    </td>
                </tr>
            `;
    }
  }

  async function saveCategory(event) {
    event.preventDefault();

    const form = event.currentTarget;

    const id =
      qs('[name="id"]', form)?.value || qs('[name="category_id"]', form)?.value;

    const button = qs('[type="submit"]', form);

    setButtonLoading(button, true, "Saving...");

    try {
      const payload = Object.fromEntries(new FormData(form));

      delete payload.id;
      delete payload.category_id;

      const response = await api(
        id ? `/api/categories/${encodeURIComponent(id)}` : "/api/categories",
        {
          method: id ? "PUT" : "POST",
          data: payload,
        },
      );

      toast(response.message || "Category saved successfully.", "success");

      form.reset();

      await loadCategories();
    } catch (error) {
      toast(error.message, "error");
    } finally {
      setButtonLoading(button, false);
    }
  }

  async function deleteCategory(id) {
    const confirmed = await confirmAction(
      "Are you sure you want to delete this category?",
    );

    if (!confirmed) {
      return;
    }

    try {
      const response = await api(`/api/categories/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });

      toast(response.message || "Category deleted.", "success");

      await loadCategories();
    } catch (error) {
      toast(error.message, "error");
    }
  }

  /* =====================================================
       DEPARTMENTS
       ===================================================== */

  async function loadDepartments() {
    const tbody = qs("#departmentsTableBody");

    if (!tbody) {
      return;
    }

    try {
      const response = await api("/api/departments");

      const departments = getArray(response, ["departments"]);

      tbody.innerHTML = departments.length
        ? departments
            .map(
              (department) => `
                                <tr>

                                    <td>
                                        ${escapeHTML(
                                          department.id ||
                                            department.department_id,
                                        )}
                                    </td>

                                    <td>
                                        ${escapeHTML(
                                          department.name ||
                                            department.department_name,
                                        )}
                                    </td>

                                    <td>
                                        ${escapeHTML(
                                          department.description || "-",
                                        )}
                                    </td>

                                    <td>
                                        ${escapeHTML(
                                          department.staff_count ?? 0,
                                        )}
                                    </td>

                                    <td class="actions">

                                        <button
                                            class="btn btn-danger btn-sm"
                                            type="button"
                                            data-delete-department="${escapeHTML(
                                              department.id ||
                                                department.department_id,
                                            )}"
                                        >
                                            Delete
                                        </button>

                                    </td>

                                </tr>
                            `,
            )
            .join("")
        : `
                        <tr>
                            <td colspan="5" class="text-center">
                                No departments found.
                            </td>
                        </tr>
                    `;
    } catch (error) {
      tbody.innerHTML = `
                <tr>
                    <td colspan="5">
                        ${escapeHTML(error.message)}
                    </td>
                </tr>
            `;
    }
  }

  async function saveDepartment(event) {
    event.preventDefault();

    const form = event.currentTarget;

    const id =
      qs('[name="id"]', form)?.value ||
      qs('[name="department_id"]', form)?.value;

    const button = qs('[type="submit"]', form);

    setButtonLoading(button, true, "Saving...");

    try {
      const payload = Object.fromEntries(new FormData(form));

      delete payload.id;
      delete payload.department_id;

      const response = await api(
        id ? `/api/departments/${encodeURIComponent(id)}` : "/api/departments",
        {
          method: id ? "PUT" : "POST",
          data: payload,
        },
      );

      toast(response.message || "Department saved successfully.", "success");

      form.reset();

      await loadDepartments();
    } catch (error) {
      toast(error.message, "error");
    } finally {
      setButtonLoading(button, false);
    }
  }

  async function deleteDepartment(id) {
    const confirmed = await confirmAction("Delete this department?");

    if (!confirmed) {
      return;
    }

    try {
      const response = await api(`/api/departments/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });

      toast(response.message || "Department deleted.", "success");

      await loadDepartments();
    } catch (error) {
      toast(error.message, "error");
    }
  }

  /* =====================================================
       STAFF
       ===================================================== */

  async function loadStaff() {
    const tbody = qs("#staffTableBody");

    if (!tbody) {
      return;
    }

    try {
      const response = await api("/api/admin/staff");

      const staff = getArray(response, ["staff", "users"]);

      tbody.innerHTML = staff.length
        ? staff
            .map(
              (member) => `
                                <tr>

                                    <td>
                                        ${escapeHTML(
                                          member.id || member.staff_id,
                                        )}
                                    </td>

                                    <td>
                                        ${escapeHTML(
                                          member.full_name || member.name,
                                        )}
                                    </td>

                                    <td>
                                        ${escapeHTML(member.email)}
                                    </td>

                                    <td>
                                        ${escapeHTML(
                                          member.department_name || "-",
                                        )}
                                    </td>

                                    <td>
                                        ${escapeHTML(
                                          member.assigned_count ?? 0,
                                        )}
                                    </td>

                                    <td>
                                        <span class="status-badge status-${
                                          member.status === "inactive"
                                            ? "closed"
                                            : "active"
                                        }">
                                            ${escapeHTML(
                                              member.status || "active",
                                            )}
                                        </span>
                                    </td>

                                </tr>
                            `,
            )
            .join("")
        : `
                        <tr>
                            <td colspan="6" class="text-center">
                                No staff found.
                            </td>
                        </tr>
                    `;
    } catch (error) {
      tbody.innerHTML = `
                <tr>
                    <td colspan="6">
                        ${escapeHTML(error.message)}
                    </td>
                </tr>
            `;
    }
  }

  async function saveStaff(event) {
    event.preventDefault();

    const form = event.currentTarget;

    const button = qs('[type="submit"]', form);

    setButtonLoading(button, true, "Saving...");

    try {
      const response = await api("/api/admin/staff", {
        method: "POST",
        data: Object.fromEntries(new FormData(form)),
      });

      toast(
        response.message || "Staff account created successfully.",
        "success",
      );

      form.reset();

      await loadStaff();
    } catch (error) {
      toast(error.message, "error");
    } finally {
      setButtonLoading(button, false);
    }
  }

  /* =====================================================
       REPORTS
       ===================================================== */

  async function loadReports() {
    const container = qs("#reportsContainer");

    if (!container) {
      return;
    }

    try {
      const params = new URLSearchParams();

      const from = qs("#reportFrom")?.value;

      const to = qs("#reportTo")?.value;

      const department = qs("#reportDepartment")?.value;

      if (from) {
        params.set("from", from);
      }

      if (to) {
        params.set("to", to);
      }

      if (department) {
        params.set("department_id", department);
      }

      const endpoint = params.toString()
        ? `/api/admin/reports?${params}`
        : "/api/admin/reports";

      const response = await api(endpoint);

      const data = response.data || response;

      setText("[data-report-total]", data.total_complaints ?? 0);

      setText("[data-report-resolved]", data.resolved_complaints ?? 0);

      setText("[data-report-pending]", data.pending_complaints ?? 0);

      setText("[data-report-resolution-rate]", `${data.resolution_rate ?? 0}%`);
    } catch (error) {
      toast(error.message, "error");
    }
  }

  /* =====================================================
       MESSAGES
       ===================================================== */

  async function loadMessages() {
    const container = qs("#adminMessageList");

    if (!container) {
      return;
    }

    try {
      const response = await api("/api/admin/messages");

      const messages = getArray(response, ["messages"]);

      if (!messages.length) {
        container.innerHTML = `
                    <div class="empty-state">
                        <i class="fa fa-envelope"></i>
                        <h3>No Messages</h3>
                    </div>
                `;

        return;
      }

      container.innerHTML = messages
        .map(
          (message) => `
                            <a
                                href="#"
                                class="admin-message-item"
                                data-message-id="${escapeHTML(
                                  message.id || message.message_id,
                                )}"
                            >

                                <strong>
                                    ${escapeHTML(
                                      message.name ||
                                        message.sender_name ||
                                        "Visitor",
                                    )}
                                </strong>

                                <p>
                                    ${escapeHTML(truncate(message.message, 80))}
                                </p>

                                <small>
                                    ${formatDateTime(message.created_at)}
                                </small>

                            </a>
                        `,
        )
        .join("");
    } catch (error) {
      container.innerHTML = `
                <div class="alert alert-danger">
                    ${escapeHTML(error.message)}
                </div>
            `;
    }
  }

  async function loadSingleMessage(id) {
    const container = qs("#adminMessageContent");

    if (!container) {
      return;
    }

    try {
      const response = await api(
        `/api/admin/messages/${encodeURIComponent(id)}`,
      );

      const message =
        response.message_data || response.data || response.message || response;

      container.innerHTML = `
                <h3>
                    ${escapeHTML(message.subject || "Message")}
                </h3>

                <p>
                    <strong>From:</strong>
                    ${escapeHTML(message.name || message.sender_name || "-")}
                </p>

                <p>
                    <strong>Email:</strong>
                    ${escapeHTML(message.email || "-")}
                </p>

                <p class="text-muted">
                    ${formatDateTime(message.created_at)}
                </p>

                <hr>

                <p>
                    ${escapeHTML(message.message || "-")}
                </p>
            `;
    } catch (error) {
      toast(error.message, "error");
    }
  }

  /* =====================================================
       ADMIN PROFILE
       ===================================================== */

  async function loadProfile() {
    const form = qs("#adminProfileForm");

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
       EVENT DELEGATION
       ===================================================== */

  function initDelegatedEvents() {
    document.addEventListener("click", async (event) => {
      const categoryButton = event.target.closest("[data-delete-category]");

      if (categoryButton) {
        await deleteCategory(categoryButton.dataset.deleteCategory);

        return;
      }

      const departmentButton = event.target.closest("[data-delete-department]");

      if (departmentButton) {
        await deleteDepartment(departmentButton.dataset.deleteDepartment);

        return;
      }

      const message = event.target.closest("[data-message-id]");

      if (message) {
        event.preventDefault();

        qsa("[data-message-id]").forEach((item) => {
          item.classList.remove("active");
        });

        message.classList.add("active");

        await loadSingleMessage(message.dataset.messageId);
      }
    });
  }

  /* =====================================================
       FILTERS
       ===================================================== */

  function initFilters() {
    const filters = [
      "#statusFilter",
      "#priorityFilter",
      "#departmentFilter",
      "#categoryFilter",
    ];

    filters.forEach((selector) => {
      const field = qs(selector);

      if (field) {
        field.addEventListener("change", loadComplaints);
      }
    });

    const search = qs("#complaintSearch");

    if (search) {
      let timer;

      search.addEventListener("input", () => {
        clearTimeout(timer);

        timer = setTimeout(loadComplaints, 350);
      });
    }

    const reportButton = qs("#generateReport");

    if (reportButton) {
      reportButton.addEventListener("click", loadReports);
    }
  }

  /* =====================================================
       INITIALIZATION
       ===================================================== */

  ready(() => {
    if (!requireAuth("admin")) {
      return;
    }

    populateCurrentUser();

    loadDashboard();
    loadComplaints();
    loadComplaintDetails();
    loadUsers();
    loadUserDetails();
    loadCategories();
    loadDepartments();
    loadStaff();
    loadReports();
    loadMessages();
    loadProfile();

    loadAssignmentOptions();

    initFilters();
    initDelegatedEvents();

    const assignForm = qs("#assignComplaintForm");

    if (assignForm) {
      assignForm.addEventListener("submit", assignComplaint);
    }

    const statusForm = qs("#adminStatusForm");

    if (statusForm) {
      statusForm.addEventListener("submit", updateStatus);
    }

    const categoryForm = qs("#categoryForm");

    if (categoryForm) {
      categoryForm.addEventListener("submit", saveCategory);
    }

    const departmentForm = qs("#departmentForm");

    if (departmentForm) {
      departmentForm.addEventListener("submit", saveDepartment);
    }

    const staffForm = qs("#staffForm");

    if (staffForm) {
      staffForm.addEventListener("submit", saveStaff);
    }

    const profileForm = qs("#adminProfileForm");

    if (profileForm) {
      profileForm.addEventListener("submit", updateProfile);
    }
  });
})();
