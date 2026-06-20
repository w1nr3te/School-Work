/* ============================================================
   RESONANCE — Task Manager
   Script
   ============================================================ */

/* ── State ──────────────────────────────────────────────────── */
const STORAGE_KEY = 'resonance_tasks';

/** @type {Array<{id:string, title:string, desc:string, completed:boolean, createdAt:number}>} */
let tasks = [];

// Track which task is pending deletion or editing
let pendingDeleteId = null;
let pendingEditId   = null;

/* ── DOM References ─────────────────────────────────────────── */
const taskTitleInput  = document.getElementById('task-title');
const taskDescInput   = document.getElementById('task-desc');
const addTaskBtn      = document.getElementById('add-task-btn');
const taskList        = document.getElementById('task-list');
const emptyState      = document.getElementById('empty-state');
const searchInput     = document.getElementById('search-input');
const filterSelect    = document.getElementById('filter-select');
const sortSelect      = document.getElementById('sort-select');
const toastContainer  = document.getElementById('toast-container');
const headerDate      = document.getElementById('header-date');

// Stats
const statTotal     = document.getElementById('stat-total');
const statActive    = document.getElementById('stat-active');
const statCompleted = document.getElementById('stat-completed');
const statPercent   = document.getElementById('stat-percent');

// Progress
const progressFill  = document.getElementById('progress-fill');
const progressValue = document.getElementById('progress-value');
const progressTrack = document.getElementById('progress-track');

// Edit modal
const editModal     = document.getElementById('edit-modal');
const editTitle     = document.getElementById('edit-title');
const editDesc      = document.getElementById('edit-desc');
const modalCloseBtn = document.getElementById('modal-close-btn');
const modalCancelBtn= document.getElementById('modal-cancel-btn');
const modalSaveBtn  = document.getElementById('modal-save-btn');

// Confirm modal
const confirmModal    = document.getElementById('confirm-modal');
const confirmCancelBtn= document.getElementById('confirm-cancel-btn');
const confirmDeleteBtn= document.getElementById('confirm-delete-btn');

/* ── Initialise ─────────────────────────────────────────────── */
function init() {
  loadFromStorage();
  renderDate();
  render();
  bindEvents();
}

/* ── Local Storage ──────────────────────────────────────────── */

/** Load tasks array from localStorage. */
function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    tasks = raw ? JSON.parse(raw) : [];
  } catch (e) {
    tasks = [];
  }
}

/** Persist current tasks array to localStorage. */
function saveToStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

/* ── Task CRUD ──────────────────────────────────────────────── */

/** Generate a unique ID. */
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/** Add a new task from form inputs. */
function addTask() {
  const title = taskTitleInput.value.trim();
  if (!title) {
    shakeFocus(taskTitleInput);
    return;
  }

  const task = {
    id:        uid(),
    title:     title,
    desc:      taskDescInput.value.trim(),
    completed: false,
    createdAt: Date.now()
  };

  tasks.unshift(task);
  saveToStorage();
  render();
  showToast('Task added', 'added');

  taskTitleInput.value = '';
  taskDescInput.value  = '';
  taskTitleInput.focus();
}

/** Toggle completed state for a task. */
function toggleTask(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;
  task.completed = !task.completed;
  saveToStorage();
  render();
  showToast(task.completed ? 'Task completed!' : 'Task reopened', 'completed');
}

/** Open edit modal for a task. */
function openEditModal(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;
  pendingEditId   = id;
  editTitle.value = task.title;
  editDesc.value  = task.desc;
  editModal.hidden = false;
  editTitle.focus();
}

/** Save edits from modal. */
function saveEdit() {
  const title = editTitle.value.trim();
  if (!title) { shakeFocus(editTitle); return; }

  const task = tasks.find(t => t.id === pendingEditId);
  if (task) {
    task.title = title;
    task.desc  = editDesc.value.trim();
    saveToStorage();
    render();
    showToast('Task updated', 'updated');
  }
  closeEditModal();
}

/** Close edit modal. */
function closeEditModal() {
  editModal.hidden = true;
  pendingEditId = null;
}

/** Open delete confirmation modal. */
function openConfirmDelete(id) {
  pendingDeleteId = id;
  confirmModal.hidden = false;
  confirmDeleteBtn.focus();
}

/** Execute deletion after confirmation. */
function confirmDelete() {
  if (!pendingDeleteId) return;

  const card = taskList.querySelector(`[data-id="${pendingDeleteId}"]`);
  if (card) {
    card.classList.add('is-removing');
    card.addEventListener('animationend', () => {
      tasks = tasks.filter(t => t.id !== pendingDeleteId);
      saveToStorage();
      render();
      showToast('Task deleted', 'deleted');
      pendingDeleteId = null;
    }, { once: true });
  } else {
    tasks = tasks.filter(t => t.id !== pendingDeleteId);
    saveToStorage();
    render();
    showToast('Task deleted', 'deleted');
    pendingDeleteId = null;
  }
  confirmModal.hidden = true;
}

/* ── Render ─────────────────────────────────────────────────── */

/** Main render: stats, progress, task list. */
function render() {
  const search = searchInput.value.trim().toLowerCase();
  const filter = filterSelect.value;
  const sort   = sortSelect.value;

  let visible = tasks.filter(t => {
    if (filter === 'active'    && t.completed) return false;
    if (filter === 'completed' && !t.completed) return false;
    if (search) {
      return t.title.toLowerCase().includes(search) ||
             t.desc.toLowerCase().includes(search);
    }
    return true;
  });

  if (sort === 'newest')  visible.sort((a, b) => b.createdAt - a.createdAt);
  if (sort === 'oldest')  visible.sort((a, b) => a.createdAt - b.createdAt);
  if (sort === 'alpha')   visible.sort((a, b) => a.title.localeCompare(b.title));

  renderStats();
  renderProgress();
  renderTaskList(visible);
}

/** Render stats cards. */
function renderStats() {
  const total     = tasks.length;
  const completed = tasks.filter(t => t.completed).length;
  const active    = total - completed;
  const percent   = total === 0 ? 0 : Math.round((completed / total) * 100);

  statTotal.textContent     = total;
  statActive.textContent    = active;
  statCompleted.textContent = completed;
  statPercent.textContent   = percent + '%';
}

/** Render progress bar. */
function renderProgress() {
  const total     = tasks.length;
  const completed = tasks.filter(t => t.completed).length;
  const pct       = total === 0 ? 0 : Math.round((completed / total) * 100);

  progressFill.style.width  = pct + '%';
  progressValue.textContent = pct + '%';
  progressTrack.setAttribute('aria-valuenow', pct);
}

/** Render the visible task list. */
function renderTaskList(visible) {
  if (visible.length === 0) {
    taskList.innerHTML = '';
    emptyState.hidden  = false;
    return;
  }
  emptyState.hidden = true;

  taskList.innerHTML = visible.map(task => taskCardHTML(task)).join('');

  taskList.querySelectorAll('.task-card').forEach(card => {
    const id = card.dataset.id;

    card.querySelector('.btn-complete')
      .addEventListener('click', () => toggleTask(id));

    card.querySelector('.btn-edit')
      .addEventListener('click', () => openEditModal(id));

    card.querySelector('.btn-delete')
      .addEventListener('click', () => openConfirmDelete(id));
  });
}

/** Build HTML string for a single task card. */
function taskCardHTML(task) {
  const date      = formatDate(task.createdAt);
  const completed = task.completed;

  const safeTitle = escapeHTML(task.title);
  const safeDesc  = escapeHTML(task.desc);

  const checkIcon = completed
    ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>`
    : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="12" cy="12" r="9"/></svg>`;

  return `
    <div class="task-card${completed ? ' is-completed' : ''}" data-id="${task.id}" role="article" aria-label="Task: ${safeTitle}">
      <div class="task-check-area">
        <button
          class="btn btn-icon btn-complete${completed ? ' completed-check' : ''}"
          aria-label="${completed ? 'Mark incomplete' : 'Mark complete'}"
          title="${completed ? 'Mark incomplete' : 'Mark complete'}"
        >${checkIcon}</button>
      </div>
      <div class="task-body">
        <div class="task-title">${safeTitle}</div>
        ${safeDesc ? `<div class="task-desc">${safeDesc}</div>` : ''}
        <div class="task-meta">Added ${date}</div>
      </div>
      <div class="task-actions">
        <button class="btn btn-icon btn-edit"   aria-label="Edit task"   title="Edit">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button class="btn btn-icon btn-delete" aria-label="Delete task" title="Delete">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
        </button>
      </div>
    </div>
  `;
}

/* ── Helpers ─────────────────────────────────────────────────── */

/** Format a timestamp into a human-readable date string. */
function formatDate(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/** Render today's date in the header. */
function renderDate() {
  const d = new Date();
  headerDate.textContent = d.toLocaleDateString('en-US', {
    weekday: 'short', month: 'long', day: 'numeric', year: 'numeric'
  });
}

/** Escape HTML entities to prevent XSS. */
function escapeHTML(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Shake an input to indicate a validation error. */
function shakeFocus(el) {
  el.focus();
  el.style.borderColor = 'var(--danger)';
  el.style.boxShadow   = '0 0 0 3px rgba(239,68,68,0.15)';
  setTimeout(() => {
    el.style.borderColor = '';
    el.style.boxShadow   = '';
  }, 1000);
}

/* ── Toast Notifications ────────────────────────────────────── */

/**
 * Show a toast notification.
 * @param {string} message - Text to display.
 * @param {'added'|'updated'|'completed'|'deleted'} type - Controls dot color.
 */
function showToast(message, type) {
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.setAttribute('role', 'status');
  toast.innerHTML = `<span class="toast-dot" aria-hidden="true"></span>${escapeHTML(message)}`;

  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('is-hiding');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
  }, 2800);
}

/* ── Event Bindings ───────────────────────────────────────────────── */
function bindEvents() {
  addTaskBtn.addEventListener('click', addTask);
  taskTitleInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') addTask();
  });
  taskDescInput.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addTask(); }
  });

  searchInput.addEventListener('input',  render);
  filterSelect.addEventListener('change', render);
  sortSelect.addEventListener('change',  render);

  modalCloseBtn.addEventListener('click',  closeEditModal);
  modalCancelBtn.addEventListener('click', closeEditModal);
  modalSaveBtn.addEventListener('click',   saveEdit);
  editTitle.addEventListener('keydown', e => { if (e.key === 'Enter') saveEdit(); });

  editModal.addEventListener('click', e => {
    if (e.target === editModal) closeEditModal();
  });

  confirmCancelBtn.addEventListener('click', () => {
    confirmModal.hidden = true;
    pendingDeleteId = null;
  });
  confirmDeleteBtn.addEventListener('click', confirmDelete);

  confirmModal.addEventListener('click', e => {
    if (e.target === confirmModal) {
      confirmModal.hidden = true;
      pendingDeleteId = null;
    }
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (!editModal.hidden)    closeEditModal();
      if (!confirmModal.hidden) {
        confirmModal.hidden = true;
        pendingDeleteId = null;
      }
    }
  });
}

/* ── Boot ────────────────────────────────────────────────────── */
init();