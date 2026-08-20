// ==========================================================================
// PLANNINGEASY - TASK MANAGEMENT & "MY TASKS" MODULE
// Permissions: Admin can Create, Assign, Edit, Delete, and Track all tasks.
// Members can View their assigned tasks & Update task status (Pending / In Progress / Completed).
// ==========================================================================

import { Auth } from './auth.js';
import { Storage } from './storage.js';

export const Tasks = {
  activeStatusFilter: 'all', // 'all' | 'pending' | 'in_progress' | 'completed'

  render(container) {
    const user = Auth.getCurrentUser();
    if (!user) return;

    const allTasks = Storage.getAll('tasks');
    const allUsers = Storage.getAll('users');

    // Filter tasks based on role: Admin sees all, Member sees ONLY their assigned tasks
    let taskList = Auth.isAdmin()
      ? allTasks
      : allTasks.filter((t) => t.assignedToUid === user.uid);

    // Apply status filter
    if (this.activeStatusFilter !== 'all') {
      taskList = taskList.filter((t) => (t.status || 'pending') === this.activeStatusFilter);
    }

    // Sort by due date ascending
    taskList.sort((a, b) => new Date(a.dueDate || a.createdAt) - new Date(b.dueDate || b.createdAt));

    const totalCount = Auth.isAdmin() ? allTasks.length : allTasks.filter((t) => t.assignedToUid === user.uid).length;

    container.innerHTML = `
      <div class="tasks-view">
        <!-- Module Top Header -->
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
          <div>
            <h2 style="font-size: 18px; font-weight: 800; color: var(--text-main);">
              ${Auth.isAdmin() ? 'Task Management' : 'My Tasks'}
            </h2>
            <div style="font-size: 12px; color: var(--text-muted);">
              ${Auth.isAdmin() ? 'Assign and track group responsibilities' : 'Tasks assigned to you'}
            </div>
          </div>
          ${Auth.isAdmin() ? `
            <button class="btn btn-primary btn-sm" id="openAddTaskBtn">
              <span>+ Create Task</span>
            </button>
          ` : ''}
        </div>

        <!-- Status Filter Chips -->
        <div class="chip-group">
          <button class="chip ${this.activeStatusFilter === 'all' ? 'active' : ''}" data-task-filter="all">All (${totalCount})</button>
          <button class="chip ${this.activeStatusFilter === 'pending' ? 'active' : ''}" data-task-filter="pending">Pending</button>
          <button class="chip ${this.activeStatusFilter === 'in_progress' ? 'active' : ''}" data-task-filter="in_progress">In Progress</button>
          <button class="chip ${this.activeStatusFilter === 'completed' ? 'active' : ''}" data-task-filter="completed">Completed</button>
        </div>

        <!-- Tasks List -->
        <div class="tasks-list">
          ${taskList.length === 0 ? `
            <div class="empty-state">
              <div class="empty-state-icon">✅</div>
              <div class="empty-state-title">No tasks found</div>
              <div class="empty-state-text">
                ${Auth.isAdmin() ? 'No tasks created matching this filter.' : 'You have no tasks assigned in this status.'}
              </div>
              ${Auth.isAdmin() ? `<button class="btn btn-primary btn-sm" id="emptyAddTaskBtn">+ Create First Task</button>` : ''}
            </div>
          ` : `
            <div>
              ${taskList.map((t) => {
                const status = t.status || 'pending';
                const statusBadgeClass = status === 'completed' ? 'badge-completed' : (status === 'in_progress' ? 'badge-progress' : 'badge-todo');
                const statusLabel = status === 'completed' ? 'Completed' : (status === 'in_progress' ? 'In Progress' : 'Pending');
                const priorityColor = t.priority === 'high' ? 'var(--danger)' : (t.priority === 'medium' ? 'var(--warning)' : 'var(--neutral)');

                return `
                  <div class="task-card">
                    <div class="task-card-header">
                      <div style="flex: 1;">
                        <div class="flex items-center gap-2 mb-1">
                          <span class="badge ${statusBadgeClass}">${statusLabel}</span>
                          <span style="font-size: 11px; font-weight: 700; color: ${priorityColor}; text-transform: uppercase;">
                            ● ${t.priority || 'Normal'} Priority
                          </span>
                        </div>
                        <div class="task-title">${t.title}</div>
                      </div>
                      ${Auth.isAdmin() ? `
                        <div class="flex items-center gap-1">
                          <button class="btn btn-ghost btn-sm btn-icon-only edit-task-btn" data-id="${t.id}" title="Edit Task" style="width: 26px; height: 26px; min-height: 26px;">
                            ✏️
                          </button>
                          <button class="btn btn-ghost btn-sm btn-icon-only delete-task-btn" data-id="${t.id}" title="Delete Task" style="width: 26px; height: 26px; min-height: 26px; color: var(--danger);">
                            🗑️
                          </button>
                        </div>
                      ` : ''}
                    </div>

                    ${t.description ? `<div class="task-desc">${t.description}</div>` : ''}

                    <div class="task-footer">
                      <div>
                        <div><b>Assigned to:</b> ${t.assignedToName || 'Unassigned'}</div>
                        <div style="margin-top: 2px;">
                          <b>Assigned:</b> ${new Date(t.createdAt).toLocaleDateString()} &bull; 
                          <b>Due:</b> ${t.dueDate || 'No deadline'} &bull; 
                          By ${t.createdByName || 'Admin'}
                        </div>
                      </div>
                      <div>
                        <select class="task-status-select update-task-status-select" data-id="${t.id}">
                          <option value="pending" ${status === 'pending' ? 'selected' : ''}>Pending</option>
                          <option value="in_progress" ${status === 'in_progress' ? 'selected' : ''}>In Progress</option>
                          <option value="completed" ${status === 'completed' ? 'selected' : ''}>Completed</option>
                        </select>
                      </div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          `}
        </div>
      </div>
    `;

    // Event Handlers
    container.querySelector('#openAddTaskBtn')?.addEventListener('click', () => this.openAddModal(allUsers));
    container.querySelector('#emptyAddTaskBtn')?.addEventListener('click', () => this.openAddModal(allUsers));

    // Status Filter chips
    container.querySelectorAll('[data-task-filter]').forEach((chip) => {
      chip.addEventListener('click', () => {
        this.activeStatusFilter = chip.getAttribute('data-task-filter');
        this.render(container);
      });
    });

    // Task Status dropdown updater (Allowed for both Admin & Assigned Member)
    container.querySelectorAll('.update-task-status-select').forEach((sel) => {
      sel.addEventListener('change', (e) => {
        const id = sel.getAttribute('data-id');
        const newStatus = e.target.value;
        const task = Storage.getById('tasks', id);
        
        Storage.update('tasks', id, { status: newStatus }, Auth.getCurrentUser());

        // Notify Admin of member's status update
        const admins = Storage.getAll('users').filter((u) => u.role === 'admin').map((u) => u.uid);
        Storage.createNotification({
          type: 'task_status',
          title: 'Task Status Updated',
          message: `${user.name} changed task "${task?.title || 'Task'}" to ${newStatus.replace('_', ' ')}`,
          recipientUids: admins,
          targetTab: 'tasks',
          targetId: id
        });

        window.dispatchEvent(new CustomEvent('pe_show_toast', { detail: { message: `Task status updated to ${newStatus.replace('_', ' ')}`, type: 'info' } }));
      });
    });

    if (Auth.isAdmin()) {
      container.querySelectorAll('.edit-task-btn').forEach((b) => {
        b.addEventListener('click', () => {
          const id = b.getAttribute('data-id');
          this.openEditModal(id, allUsers);
        });
      });

      container.querySelectorAll('.delete-task-btn').forEach((b) => {
        b.addEventListener('click', () => {
          const id = b.getAttribute('data-id');
          this.confirmDelete(id);
        });
      });
    }
  },

  // Modal: Add Task (Admin Only)
  openAddModal(allUsers) {
    if (!Auth.isAdmin()) return;

    const modalBackdrop = document.getElementById('globalModalBackdrop');
    const modalContent = document.getElementById('globalModalContent');
    if (!modalBackdrop || !modalContent) return;

    const members = allUsers.filter((u) => u.status !== 'disabled');

    modalContent.innerHTML = `
      <div class="modal-sheet">
        <div class="modal-sheet-header">
          <div class="modal-sheet-title">Create & Assign Task</div>
          <button class="btn btn-ghost btn-sm close-modal-btn">&times;</button>
        </div>
        <form id="addTaskForm" class="modal-sheet-body">
          <div class="form-group">
            <label class="form-label">Task Title</label>
            <input type="text" required class="form-input" id="tskTitle" placeholder="e.g. Audit Q2 Expenses">
          </div>

          <div class="form-group">
            <label class="form-label">Assign To Member</label>
            <select class="form-select" id="tskAssignedTo" required>
              <option value="">-- Select Member --</option>
              ${members.map((m) => `
                <option value="${m.uid}" data-name="${m.name}">${m.name} (${m.position || m.username})</option>
              `).join('')}
            </select>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
            <div class="form-group">
              <label class="form-label">Priority</label>
              <select class="form-select" id="tskPriority">
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Initial Status</label>
              <select class="form-select" id="tskStatus">
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Due Date</label>
            <input type="date" class="form-input" id="tskDueDate">
          </div>

          <div class="form-group">
            <label class="form-label">Task Details / Instructions</label>
            <textarea class="form-textarea" id="tskDescription" placeholder="Optional details..."></textarea>
          </div>

          <div class="modal-sheet-footer" style="padding: 16px 0 0 0; margin-top: 16px;">
            <button type="button" class="btn btn-outline close-modal-btn">Cancel</button>
            <button type="submit" class="btn btn-primary">Assign Task</button>
          </div>
        </form>
      </div>
    `;

    modalBackdrop.classList.add('show');

    modalContent.querySelectorAll('.close-modal-btn').forEach((b) => {
      b.addEventListener('click', () => modalBackdrop.classList.remove('show'));
    });

    const form = modalContent.querySelector('#addTaskForm');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const memberSelect = form.querySelector('#tskAssignedTo');
      const selectedOption = memberSelect.options[memberSelect.selectedIndex];

      const newTask = {
        title: form.querySelector('#tskTitle').value.trim(),
        assignedToUid: memberSelect.value,
        assignedToName: selectedOption.getAttribute('data-name'),
        priority: form.querySelector('#tskPriority').value,
        status: form.querySelector('#tskStatus').value,
        dueDate: form.querySelector('#tskDueDate').value,
        description: form.querySelector('#tskDescription').value.trim(),
        createdByUid: Auth.getCurrentUser().uid,
        createdByName: Auth.getCurrentUser().name
      };

      const added = Storage.add('tasks', newTask, Auth.getCurrentUser());

      // Notify the assigned member
      Storage.createNotification({
        type: 'task',
        title: 'New Task Assigned',
        message: `You have been assigned: "${newTask.title}" (Due: ${newTask.dueDate || 'No deadline'})`,
        recipientUids: [newTask.assignedToUid],
        targetTab: 'tasks',
        targetId: added.id
      });

      modalBackdrop.classList.remove('show');
      window.dispatchEvent(new CustomEvent('pe_show_toast', { detail: { message: 'Task assigned successfully!', type: 'success' } }));
    });
  },

  // Modal: Edit Task (Admin Only)
  openEditModal(id, allUsers) {
    if (!Auth.isAdmin()) return;

    const task = Storage.getById('tasks', id);
    if (!task) return;

    const modalBackdrop = document.getElementById('globalModalBackdrop');
    const modalContent = document.getElementById('globalModalContent');
    if (!modalBackdrop || !modalContent) return;

    const members = allUsers.filter((u) => u.status !== 'disabled');

    modalContent.innerHTML = `
      <div class="modal-sheet">
        <div class="modal-sheet-header">
          <div class="modal-sheet-title">Edit Task</div>
          <button class="btn btn-ghost btn-sm close-modal-btn">&times;</button>
        </div>
        <form id="editTaskForm" class="modal-sheet-body">
          <div class="form-group">
            <label class="form-label">Task Title</label>
            <input type="text" required class="form-input" id="editTskTitle" value="${task.title}">
          </div>

          <div class="form-group">
            <label class="form-label">Assign To Member</label>
            <select class="form-select" id="editTskAssignedTo" required>
              ${members.map((m) => `
                <option value="${m.uid}" data-name="${m.name}" ${task.assignedToUid === m.uid ? 'selected' : ''}>
                  ${m.name} (${m.position || m.username})
                </option>
              `).join('')}
            </select>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
            <div class="form-group">
              <label class="form-label">Priority</label>
              <select class="form-select" id="editTskPriority">
                <option value="low" ${task.priority === 'low' ? 'selected' : ''}>Low</option>
                <option value="medium" ${task.priority === 'medium' ? 'selected' : ''}>Medium</option>
                <option value="high" ${task.priority === 'high' ? 'selected' : ''}>High</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Status</label>
              <select class="form-select" id="editTskStatus">
                <option value="pending" ${task.status === 'pending' ? 'selected' : ''}>Pending</option>
                <option value="in_progress" ${task.status === 'in_progress' ? 'selected' : ''}>In Progress</option>
                <option value="completed" ${task.status === 'completed' ? 'selected' : ''}>Completed</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Due Date</label>
            <input type="date" class="form-input" id="editTskDueDate" value="${task.dueDate || ''}">
          </div>

          <div class="form-group">
            <label class="form-label">Task Details / Instructions</label>
            <textarea class="form-textarea" id="editTskDescription">${task.description || ''}</textarea>
          </div>

          <div class="modal-sheet-footer" style="padding: 16px 0 0 0; margin-top: 16px;">
            <button type="button" class="btn btn-outline close-modal-btn">Cancel</button>
            <button type="submit" class="btn btn-primary">Update Task</button>
          </div>
        </form>
      </div>
    `;

    modalBackdrop.classList.add('show');

    modalContent.querySelectorAll('.close-modal-btn').forEach((b) => {
      b.addEventListener('click', () => modalBackdrop.classList.remove('show'));
    });

    const form = modalContent.querySelector('#editTaskForm');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const memberSelect = form.querySelector('#editTskAssignedTo');
      const selectedOption = memberSelect.options[memberSelect.selectedIndex];

      const updates = {
        title: form.querySelector('#editTskTitle').value.trim(),
        assignedToUid: memberSelect.value,
        assignedToName: selectedOption.getAttribute('data-name'),
        priority: form.querySelector('#editTskPriority').value,
        status: form.querySelector('#editTskStatus').value,
        dueDate: form.querySelector('#editTskDueDate').value,
        description: form.querySelector('#editTskDescription').value.trim()
      };

      Storage.update('tasks', id, updates, Auth.getCurrentUser());
      modalBackdrop.classList.remove('show');
      window.dispatchEvent(new CustomEvent('pe_show_toast', { detail: { message: 'Task updated!', type: 'success' } }));
    });
  },

  // Confirmation: Admin Delete Task
  confirmDelete(id) {
    if (!Auth.isAdmin()) return;

    const task = Storage.getById('tasks', id);
    if (!task) return;

    if (confirm(`Are you sure you want to delete task "${task.title}"?`)) {
      Storage.delete('tasks', id, Auth.getCurrentUser());
      window.dispatchEvent(new CustomEvent('pe_show_toast', { detail: { message: 'Task deleted.', type: 'info' } }));
    }
  }
};
