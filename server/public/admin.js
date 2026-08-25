// Secure Admin Dashboard Logic
const tableBody = document.getElementById('contactTableBody');
const totalContactsEl = document.getElementById('totalContacts');
const newContactsEl = document.getElementById('newContacts');
const readContactsEl = document.getElementById('readContacts');
const repliedContactsEl = document.getElementById('repliedContacts');
const recordsCountEl = document.getElementById('recordsCount');
const searchInput = document.getElementById('searchInput');
const statusFilter = document.getElementById('statusFilter');

let contacts = [];
const AUTH_STORAGE_KEY = 'vedang_admin_auth_token';

// HTML Entity Escaper to prevent Stored & Reflected XSS
const escapeHtml = (str) => {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
};

// Get stored auth token
const getAuthToken = () => {
    return sessionStorage.getItem(AUTH_STORAGE_KEY) || '';
};

// Set stored auth token
const setAuthToken = (token) => {
    sessionStorage.setItem(AUTH_STORAGE_KEY, token);
};

// Clear stored auth token
const clearAuthToken = () => {
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
};

// Format date safely
const formatDate = (value) => {
    if (!value) return '—';
    try {
        return new Intl.DateTimeFormat('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(new Date(value));
    } catch (e) {
        return '—';
    }
};

const serviceDisplayName = (service) => {
    const map = {
        weddings: 'Wedding Cinematography',
        events: 'Event Cinematography',
        corporate: 'Corporate Films',
        concerts: 'Concert Cinematography',
        product: 'Product Photography',
        food: 'Food Photography',
        advertisement: 'Advertisement Films'
    };

    return map[service] || service || 'Unknown';
};

const renderStats = (stats) => {
    const overview = stats?.overview || {};
    if (totalContactsEl) totalContactsEl.textContent = overview.total || 0;
    if (newContactsEl) newContactsEl.textContent = overview.newMessages || 0;
    if (readContactsEl) readContactsEl.textContent = overview.readMessages || 0;
    if (repliedContactsEl) repliedContactsEl.textContent = overview.repliedMessages || 0;
};

const renderRows = () => {
    if (!tableBody) return;
    const query = searchInput ? searchInput.value.trim().toLowerCase() : '';
    const selectedStatus = statusFilter ? statusFilter.value : '';

    const filteredContacts = contacts.filter((contact) => {
        const matchesSearch = !query || [contact.name, contact.email, contact.service].join(' ').toLowerCase().includes(query);
        const matchesStatus = !selectedStatus || contact.status === selectedStatus;
        return matchesSearch && matchesStatus;
    });

    if (recordsCountEl) {
        recordsCountEl.textContent = `${filteredContacts.length} record${filteredContacts.length === 1 ? '' : 's'}`;
    }

    if (!filteredContacts.length) {
        tableBody.innerHTML = '<tr><td colspan="6" class="empty-state">No contact enquiries found.</td></tr>';
        return;
    }

    // Safely render rows with escapeHtml
    tableBody.innerHTML = filteredContacts.map((contact) => {
        const safeId = escapeHtml(contact._id);
        const safeName = escapeHtml(contact.name || 'Unknown');
        const safeEmail = escapeHtml(contact.email || '—');
        const safeService = escapeHtml(serviceDisplayName(contact.service));
        const safeDate = escapeHtml(formatDate(contact.submittedAt));
        const safeStatus = escapeHtml(contact.status || 'new');

        return `
            <tr>
                <td><strong>${safeName}</strong></td>
                <td>${safeEmail}</td>
                <td><span class="service-pill">${safeService}</span></td>
                <td>
                    <select class="status-select" data-id="${safeId}">
                        <option value="new" ${contact.status === 'new' ? 'selected' : ''}>New</option>
                        <option value="read" ${contact.status === 'read' ? 'selected' : ''}>Read</option>
                        <option value="replied" ${contact.status === 'replied' ? 'selected' : ''}>Replied</option>
                        <option value="archived" ${contact.status === 'archived' ? 'selected' : ''}>Archived</option>
                    </select>
                </td>
                <td>${safeDate}</td>
                <td>
                    <button class="message-btn" type="button" data-id="${safeId}">View message</button>
                </td>
            </tr>
        `;
    }).join('');

    // Attach event listeners for status dropdowns
    document.querySelectorAll('.status-select').forEach((select) => {
        select.addEventListener('change', async (event) => {
            const id = event.target.dataset.id;
            const status = event.target.value;

            try {
                const token = getAuthToken();
                const response = await fetch(`/api/contact/${encodeURIComponent(id)}/status`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ status })
                });

                if (response.status === 401) {
                    clearAuthToken();
                    showAuthModal();
                    return;
                }

                const result = await response.json();
                if (!response.ok) throw new Error(result.message || 'Unable to update status');
                await loadDashboard();
            } catch (error) {
                alert(error.message || 'Unable to update status.');
            }
        });
    });

    // Attach event listeners for view message buttons
    document.querySelectorAll('.message-btn').forEach((button) => {
        button.addEventListener('click', () => {
            const id = button.dataset.id;
            const contact = contacts.find(c => String(c._id) === String(id));
            if (contact) {
                showModalMessage(contact.name || 'Unknown', contact.email || '', contact.service || '', contact.message || '', contact.submittedAt);
            }
        });
    });
};

// Message Modal
const showModalMessage = (name, email, service, message, date) => {
    let modal = document.getElementById('messageViewModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'messageViewModal';
        modal.className = 'modal-backdrop';
        document.body.appendChild(modal);
    }

    modal.innerHTML = `
        <div class="modal-dialog">
            <div class="modal-header">
                <h3>Message Details</h3>
                <button type="button" class="modal-close" onclick="closeMessageModal()">&times;</button>
            </div>
            <div class="modal-body">
                <p><strong>From:</strong> ${escapeHtml(name)} (${escapeHtml(email)})</p>
                <p><strong>Service:</strong> ${escapeHtml(serviceDisplayName(service))}</p>
                <p><strong>Received:</strong> ${escapeHtml(formatDate(date))}</p>
                <hr style="margin: 12px 0; border: 0; border-top: 1px solid var(--line);" />
                <div class="message-content" style="white-space: pre-wrap; background: var(--panel-soft); padding: 14px; border-radius: 8px; font-size: 14px;">${escapeHtml(message)}</div>
            </div>
            <div class="modal-footer" style="margin-top: 18px; text-align: right;">
                <button type="button" class="message-btn" onclick="closeMessageModal()">Close</button>
            </div>
        </div>
    `;

    modal.style.display = 'flex';
};

window.closeMessageModal = () => {
    const modal = document.getElementById('messageViewModal');
    if (modal) modal.style.display = 'none';
};

// Auth Modal
const showAuthModal = (errorMessage = '') => {
    let modal = document.getElementById('authModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'authModal';
        modal.className = 'modal-backdrop';
        document.body.appendChild(modal);
    }

    modal.innerHTML = `
        <div class="modal-dialog auth-dialog">
            <div class="modal-header">
                <h3>🔒 Admin Authentication</h3>
            </div>
            <div class="modal-body">
                <p style="margin-bottom: 12px; color: var(--muted); font-size: 14px;">Please enter your Admin API Key to access the portfolio dashboard.</p>
                ${errorMessage ? `<div class="auth-error" style="color: #d32f2f; background: #ffebee; padding: 8px 12px; border-radius: 6px; font-size: 13px; margin-bottom: 12px;">${escapeHtml(errorMessage)}</div>` : ''}
                <form id="adminLoginForm" onsubmit="handleLogin(event)">
                    <div style="margin-bottom: 14px;">
                        <input type="password" id="adminKeyInput" placeholder="Enter Admin API Key" required style="width: 100%; padding: 10px 14px; border: 1px solid var(--line); border-radius: 8px; font-size: 14px;" />
                    </div>
                    <button type="submit" class="message-btn" style="width: 100%; background: var(--primary); color: #fff; padding: 10px; border-radius: 8px; font-weight: 600;">Unlock Dashboard</button>
                </form>
            </div>
        </div>
    `;

    modal.style.display = 'flex';
    setTimeout(() => {
        const input = document.getElementById('adminKeyInput');
        if (input) input.focus();
    }, 100);
};

window.handleLogin = async (e) => {
    e.preventDefault();
    const input = document.getElementById('adminKeyInput');
    if (!input) return;
    const token = input.value.trim();

    try {
        const response = await fetch('/api/contact/verify-auth', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            showAuthModal('Invalid Admin Key. Please try again.');
            return;
        }

        // Success
        setAuthToken(token);
        const modal = document.getElementById('authModal');
        if (modal) modal.style.display = 'none';
        await loadDashboard();
    } catch (err) {
        showAuthModal('Connection error. Please try again.');
    }
};

window.logoutAdmin = () => {
    clearAuthToken();
    contacts = [];
    renderRows();
    renderStats({});
    showAuthModal();
};

const loadDashboard = async () => {
    const token = getAuthToken();
    if (!token) {
        showAuthModal();
        return;
    }

    try {
        const headers = {
            'Authorization': `Bearer ${token}`
        };

        const [contactsResponse, statsResponse] = await Promise.all([
            fetch('/api/contact?limit=100&page=1', { headers }),
            fetch('/api/contact/stats', { headers })
        ]);

        if (contactsResponse.status === 401 || statsResponse.status === 401) {
            clearAuthToken();
            showAuthModal('Session expired or invalid credentials.');
            return;
        }

        if (!contactsResponse.ok || !statsResponse.ok) {
            throw new Error('Unable to load contact data.');
        }

        const contactsResult = await contactsResponse.json();
        const statsResult = await statsResponse.json();

        contacts = contactsResult.data || [];
        renderStats(statsResult.data || {});
        renderRows();
    } catch (error) {
        if (tableBody) {
            tableBody.innerHTML = `<tr><td colspan="6" class="empty-state">${escapeHtml(error.message)}</td></tr>`;
        }
    }
};

if (searchInput) searchInput.addEventListener('input', renderRows);
if (statusFilter) statusFilter.addEventListener('change', renderRows);

// Initial bootstrap
document.addEventListener('DOMContentLoaded', () => {
    loadDashboard();
});
