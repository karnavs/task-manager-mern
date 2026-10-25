import { useCallback, useEffect, useRef, useState } from "react";
import { apiRequest } from "../api";
import { useAuth } from "../context/AuthContext";

const initialForm = {
  title: "",
  description: "",
  status: "pending",
  priority: "medium",
  dueDate: "",
};

function formatDate(date) {
  if (!date) return "No deadline";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Invalid date";
  }

  return parsedDate.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function Dashboard() {
    const { token, user, updateUser, logout } = useAuth();

  const avatarInputRef = useRef(null);
  const [selectedAvatar, setSelectedAvatar] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState("");
  const [avatarNotice, setAvatarNotice] = useState("");

  const API_ORIGIN = (
    import.meta.env.VITE_API_URL || "http://localhost:5000/api"
  ).replace(/\/api\/?$/, "");

  const [tasks, setTasks] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [sort, setSort] = useState("newest");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadTasks = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();

      if (search.trim()) {
        params.set("search", search.trim());
      }

      if (statusFilter) {
        params.set("status", statusFilter);
      }

      if (priorityFilter) {
        params.set("priority", priorityFilter);
      }

      params.set("sort", sort);

      const result = await apiRequest(
        `/tasks?${params.toString()}`,
        { token }
      );

      if (!result || !Array.isArray(result.tasks)) {
        throw new Error("The server returned an unexpected task response.");
      }

      setTasks(result.tasks);
    } catch (requestError) {
      setError(requestError.message || "Unable to load tasks.");
    } finally {
      setLoading(false);
    }
  }, [token, search, statusFilter, priorityFilter, sort]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadTasks();
    }, 250);

    return () => clearTimeout(timer);
  }, [loadTasks]);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  function resetForm() {
    setForm(initialForm);
    setEditingId(null);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setNotice("");

    if (!form.title.trim()) {
      setError("Please enter a task title.");
      return;
    }

    if (form.title.trim().length > 100) {
      setError("Task title cannot exceed 100 characters.");
      return;
    }

    setSaving(true);

    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      status: form.status,
      priority: form.priority,
      dueDate: form.dueDate || null,
    };

    try {
      if (editingId) {
        await apiRequest(`/tasks/${editingId}`, {
          method: "PUT",
          token,
          body: payload,
        });

        setNotice("Task updated successfully.");
      } else {
        await apiRequest("/tasks", {
          method: "POST",
          token,
          body: payload,
        });

        setNotice("Task created successfully.");
      }

      resetForm();
      await loadTasks();
    } catch (requestError) {
      setError(requestError.message || "Unable to save the task.");
    } finally {
      setSaving(false);
    }
  }

  function startEditing(task) {
    setEditingId(task._id);

    setForm({
      title: task.title,
      description: task.description || "",
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate
        ? new Date(task.dueDate).toISOString().slice(0, 10)
        : "",
    });

    setNotice("");
    setError("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function handleDelete(task) {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${task.title}"?`
    );

    if (!confirmed) return;

    setError("");
    setNotice("");

    try {
      await apiRequest(`/tasks/${task._id}`, {
        method: "DELETE",
        token,
      });

      setNotice("Task deleted successfully.");

      if (editingId === task._id) {
        resetForm();
      }

      await loadTasks();
    } catch (requestError) {
      setError(requestError.message || "Unable to delete the task.");
    }
  }

  async function handleStatusChange(task, newStatus) {
    setError("");
    setNotice("");

    try {
      await apiRequest(`/tasks/${task._id}`, {
        method: "PUT",
        token,
        body: {
          status: newStatus,
        },
      });

      setNotice("Task status updated.");
      await loadTasks();
    } catch (requestError) {
      setError(
        requestError.message || "Unable to update task status."
      );
    }
  }

  function handleAvatarSelection(event) {
    const file = event.target.files?.[0];

    setAvatarError("");
    setAvatarNotice("");

    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      setAvatarError("Choose a JPEG, PNG, or WebP image.");
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setAvatarError("The image must be 5 MB or smaller.");
      event.target.value = "";
      return;
    }

    setAvatarPreview((previousPreview) => {
      if (previousPreview) URL.revokeObjectURL(previousPreview);
      return URL.createObjectURL(file);
    });

    setSelectedAvatar(file);
  }

  async function handleAvatarUpload() {
    if (!selectedAvatar) {
      setAvatarError("Please select an image first.");
      return;
    }

    setAvatarUploading(true);
    setAvatarError("");
    setAvatarNotice("");

    try {
      const formData = new FormData();
      formData.append("avatar", selectedAvatar);

      const result = await apiRequest("/avatar", {
        method: "POST",
        token,
        body: formData,
      });

      const updatedUser = {
        ...(result.user || {}),
        avatar: result.avatar || result.user?.avatar || "",
      };
      updateUser(updatedUser);

      setAvatarPreview((previousPreview) => {
        if (previousPreview) URL.revokeObjectURL(previousPreview);
        return "";
      });
      setSelectedAvatar(null);

      if (avatarInputRef.current) {
        avatarInputRef.current.value = "";
      }

      setAvatarNotice("Profile picture uploaded successfully.");
    } catch (uploadError) {
      setAvatarError(
        uploadError.message || "Unable to upload the profile picture."
      );
    } finally {
      setAvatarUploading(false);
    }
  }

  function cancelAvatarSelection() {
    setAvatarPreview((previousPreview) => {
      if (previousPreview) URL.revokeObjectURL(previousPreview);
      return "";
    });

    setSelectedAvatar(null);
    setAvatarError("");
    setAvatarNotice("");

    if (avatarInputRef.current) {
      avatarInputRef.current.value = "";
    }
  }

  const avatarPath = avatarPreview || user?.avatar || "";
  const avatarUrl = avatarPath
    ? `${API_ORIGIN}${avatarPath.startsWith("/") ? "" : "/"}${avatarPath}`
    : "";

  const completedCount = tasks.filter(
    (task) => task.status === "completed"
  ).length;

  const pendingCount = tasks.filter(
    (task) => task.status === "pending"
  ).length;

  const inProgressCount = tasks.filter(
    (task) => task.status === "in-progress"
  ).length;

  const firstName =
    user?.name?.trim().split(/\s+/)[0] || "there";

  return (
    <main className="dashboard-page">
      <header className="dashboard-header">
        <a className="dashboard-brand" href="/dashboard">
          <span className="brand-mark small">TM</span>
          <span>Task Manager</span>
        </a>

        <div className="header-user">
          <button
            type="button"
            className="avatar avatar-button"
            onClick={() => avatarInputRef.current?.click()}
            aria-label="Choose a profile picture"
            title="Change profile picture"
            disabled={avatarUploading}
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={`${user?.name || "User"}'s profile`}
                className="avatar-image"
              />
            ) : (
              user?.name?.charAt(0)?.toUpperCase() || "U"
            )}
          </button>

          <input
            ref={avatarInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            hidden
            onChange={handleAvatarSelection}
          />

          <div className="user-details">
            <strong>{user?.name || "User"}</strong>
            <span>{user?.email || ""}</span>
          </div>

          <button
            type="button"
            className="logout-button"
            onClick={logout}
          >
            Log out
          </button>
        </div>
      </header>

      {(selectedAvatar || avatarError || avatarNotice) && (
        <section className="avatar-upload-panel" aria-label="Profile picture upload">
          {selectedAvatar && (
            <p>
              Selected: <strong>{selectedAvatar.name}</strong>
            </p>
          )}

          {avatarError && (
            <p className="error-message" role="alert">
              {avatarError}
            </p>
          )}

          {avatarNotice && (
            <p className="success-message" role="status">
              {avatarNotice}
            </p>
          )}

          {selectedAvatar && (
            <div className="avatar-upload-actions">
              <button
                type="button"
                className="primary-button"
                onClick={handleAvatarUpload}
                disabled={avatarUploading}
              >
                {avatarUploading ? "Uploading..." : "Upload Avatar"}
              </button>

              <button
                type="button"
                className="secondary-button"
                onClick={cancelAvatarSelection}
                disabled={avatarUploading}
              >
                Cancel
              </button>
            </div>
          )}

          {!selectedAvatar && avatarError && (
            <button
              type="button"
              className="secondary-button"
              onClick={() => avatarInputRef.current?.click()}
            >
              Choose another image
            </button>
          )}
        </section>
      )}

      <section className="dashboard-content">
        <div className="welcome-section">
          <div>
            <p className="eyebrow">YOUR WORKSPACE</p>
            <h1>Good to see you, {firstName}.</h1>
            <p className="welcome-subtitle">
              Plan your work, track your progress, and get things done.
            </p>
          </div>

          <div className="today-badge">
            {new Date().toLocaleDateString("en-IN", {
              weekday: "short",
              day: "numeric",
              month: "short",
            })}
          </div>
        </div>

        <section className="stats-grid" aria-label="Task statistics">
          <article className="stat-card">
            <span className="stat-label">Total tasks shown</span>
            <strong>{tasks.length}</strong>
            <span className="stat-caption">
              Based on current filters
            </span>
          </article>

          <article className="stat-card">
            <span className="stat-label">Pending</span>
            <strong>{pendingCount}</strong>
            <span className="stat-caption">
              Waiting to be started
            </span>
          </article>

          <article className="stat-card">
            <span className="stat-label">In progress</span>
            <strong>{inProgressCount}</strong>
            <span className="stat-caption">
              Currently being worked on
            </span>
          </article>

          <article className="stat-card">
            <span className="stat-label">Completed</span>
            <strong>{completedCount}</strong>
            <span className="stat-caption">
              Finished tasks shown
            </span>
          </article>
        </section>

        {error && (
          <div
            className="dashboard-alert error-message"
            role="alert"
          >
            {error}
          </div>
        )}

        {notice && (
          <div
            className="dashboard-alert success-message"
            role="status"
          >
            {notice}
          </div>
        )}

        <section className="dashboard-layout">
          <aside className="task-form-card">
            <div className="section-heading">
              <div>
                <p className="eyebrow">
                  {editingId ? "UPDATE TASK" : "NEW TASK"}
                </p>

                <h2>
                  {editingId ? "Edit task" : "Create a task"}
                </h2>
              </div>

              {editingId && (
                <button
                  type="button"
                  className="text-button"
                  onClick={resetForm}
                >
                  Cancel
                </button>
              )}
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="title">Task title</label>

                <input
                  id="title"
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  placeholder="What needs to be done?"
                  maxLength={100}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="description">Description</label>

                <textarea
                  id="description"
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  placeholder="Add some details..."
                  maxLength={2000}
                  rows={4}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="status">Status</label>

                  <select
                    id="status"
                    name="status"
                    value={form.status}
                    onChange={handleChange}
                  >
                    <option value="pending">Pending</option>
                    <option value="in-progress">In progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="priority">Priority</label>

                  <select
                    id="priority"
                    name="priority"
                    value={form.priority}
                    onChange={handleChange}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="dueDate">
                  Due date (optional)
                </label>

                <input
                  id="dueDate"
                  name="dueDate"
                  type="date"
                  value={form.dueDate}
                  onChange={handleChange}
                />
              </div>

              <button
                type="submit"
                className="primary-button"
                disabled={saving}
              >
                {saving
                  ? "Saving..."
                  : editingId
                    ? "Save changes"
                    : "Create task"}
              </button>
            </form>
          </aside>

          <section className="task-list-section">
            <div className="task-list-heading">
              <div>
                <p className="eyebrow">YOUR TASKS</p>
                <h2>Task overview</h2>
              </div>

              <span className="task-count">
                {tasks.length}{" "}
                {tasks.length === 1 ? "task" : "tasks"}
              </span>
            </div>

            <div className="filter-card">
              <div className="search-field">
                <span aria-hidden="true">⌕</span>

                <input
                  type="search"
                  aria-label="Search tasks"
                  placeholder="Search title or description..."
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                />
              </div>

              <div className="filter-row">
                <select
                  aria-label="Filter by status"
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(event.target.value)
                  }
                >
                  <option value="">All statuses</option>
                  <option value="pending">Pending</option>
                  <option value="in-progress">In progress</option>
                  <option value="completed">Completed</option>
                </select>

                <select
                  aria-label="Filter by priority"
                  value={priorityFilter}
                  onChange={(event) =>
                    setPriorityFilter(event.target.value)
                  }
                >
                  <option value="">All priorities</option>
                  <option value="low">Low priority</option>
                  <option value="medium">Medium priority</option>
                  <option value="high">High priority</option>
                </select>

                <select
                  aria-label="Sort tasks"
                  value={sort}
                  onChange={(event) => setSort(event.target.value)}
                >
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                  <option value="dueDate">Due date</option>
                </select>
              </div>
            </div>

            {loading ? (
              <div
                className="empty-state"
                role="status"
                aria-live="polite"
              >
                <div className="loading-spinner" />
                <p>Loading your tasks...</p>
              </div>
            ) : error ? (
              <div className="empty-state" role="alert">
                <h3>Couldn't load tasks</h3>
                <p>{error}</p>

                <button
                  type="button"
                  className="secondary-button"
                  onClick={loadTasks}
                >
                  Try again
                </button>
              </div>
            ) : tasks.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">✓</div>
                <h3>No tasks found</h3>

                <p>
                  {search || statusFilter || priorityFilter
                    ? "Try changing your search or filters."
                    : "Create your first task to get started."}
                </p>
              </div>
            ) : (
              <div className="task-list">
                {tasks.map((task) => (
                  <article
                    className="task-card"
                    key={task._id}
                  >
                    <div className="task-card-top">
                      <div className="task-main">
                        <h3
                          className={
                            task.status === "completed"
                              ? "task-title completed-title"
                              : "task-title"
                          }
                        >
                          {task.title}
                        </h3>

                        {task.description && (
                          <p className="task-description">
                            {task.description}
                          </p>
                        )}
                      </div>

                      <span
                        className={`priority-badge priority-${task.priority}`}
                      >
                        {task.priority}
                      </span>
                    </div>

                    <div className="task-meta">
                      <span className="due-date">
                        Due: {formatDate(task.dueDate)}
                      </span>

                      <span
                        className={`status-badge status-${task.status}`}
                      >
                        {task.status === "in-progress"
                          ? "In progress"
                          : task.status.charAt(0).toUpperCase() +
                            task.status.slice(1)}
                      </span>
                    </div>

                    <div className="task-card-actions">
                      <label className="quick-status">
                        <span>Update status</span>

                        <select
                          aria-label={`Update status for ${task.title}`}
                          value={task.status}
                          onChange={(event) =>
                            handleStatusChange(
                              task,
                              event.target.value
                            )
                          }
                        >
                          <option value="pending">Pending</option>
                          <option value="in-progress">
                            In progress
                          </option>
                          <option value="completed">Completed</option>
                        </select>
                      </label>

                      <div className="action-buttons">
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => startEditing(task)}
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          className="delete-button"
                          onClick={() => handleDelete(task)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </section>

        <footer className="dashboard-footer">
          <span>Task Manager</span>
          <span>One task at a time.</span>
        </footer>
      </section>
    </main>
  );
}