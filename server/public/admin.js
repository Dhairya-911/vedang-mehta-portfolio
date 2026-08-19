const tableBody = document.getElementById('contactTableBody');
const totalContactsEl = document.getElementById('totalContacts');
const newContactsEl = document.getElementById('newContacts');
const readContactsEl = document.getElementById('readContacts');
const repliedContactsEl = document.getElementById('repliedContacts');
const recordsCountEl = document.getElementById('recordsCount');
const searchInput = document.getElementById('searchInput');
const statusFilter = document.getElementById('statusFilter');

let contacts = [];

const formatDate = (value) => {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value));
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
  totalContactsEl.textContent = overview.total || 0;
  newContactsEl.textContent = overview.newMessages || 0;
  readContactsEl.textContent = overview.readMessages || 0;
  repliedContactsEl.textContent = overview.repliedMessages || 0;
};

const renderRows = () => {
  const query = searchInput.value.trim().toLowerCase();
  const selectedStatus = statusFilter.value;

  const filteredContacts = contacts.filter((contact) => {
    const matchesSearch = !query || [contact.name, contact.email, contact.service].join(' ').toLowerCase().includes(query);
    const matchesStatus = !selectedStatus || contact.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  recordsCountEl.textContent = `${filteredContacts.length} record${filteredContacts.length === 1 ? '' : 's'}`;

  if (!filteredContacts.length) {
    tableBody.innerHTML = '<tr><td colspan="6" class="empty-state">No contact enquiries found.</td></tr>';
    return;
  }

  tableBody.innerHTML = filteredContacts.map((contact) => `
    <tr>
      <td><strong>${contact.name || 'Unknown'}</strong></td>
      <td>${contact.email || '—'}</td>
      <td><span class="service-pill">${serviceDisplayName(contact.service)}</span></td>
      <td>
        <select class="status-select" data-id="${contact._id}">
          <option value="new" ${contact.status === 'new' ? 'selected' : ''}>New</option>
          <option value="read" ${contact.status === 'read' ? 'selected' : ''}>Read</option>
          <option value="replied" ${contact.status === 'replied' ? 'selected' : ''}>Replied</option>
          <option value="archived" ${contact.status === 'archived' ? 'selected' : ''}>Archived</option>
        </select>
      </td>
      <td>${formatDate(contact.submittedAt)}</td>
      <td>
        <button class="message-btn" type="button" data-message="${encodeURIComponent(contact.message || '')}" data-name="${encodeURIComponent(contact.name || 'Unknown')}">View message</button>
      </td>
    </tr>
  `).join('');

  document.querySelectorAll('.status-select').forEach((select) => {
    select.addEventListener('change', async (event) => {
      const id = event.target.dataset.id;
      const status = event.target.value;

      try {
        const response = await fetch(`/api/contact/${id}/status`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status })
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.message || 'Unable to update status');
        await loadDashboard();
      } catch (error) {
        alert(error.message || 'Unable to update status.');
      }
    });
  });

  document.querySelectorAll('.message-btn').forEach((button) => {
    button.addEventListener('click', () => {
      const message = decodeURIComponent(button.dataset.message || '');
      const name = decodeURIComponent(button.dataset.name || 'Unknown');
      alert(`${name}\n\n${message}`);
    });
  });
};

const loadDashboard = async () => {
  try {
    const [contactsResponse, statsResponse] = await Promise.all([
      fetch('/api/contact?limit=100&page=1'),
      fetch('/api/contact/stats')
    ]);

    if (!contactsResponse.ok || !statsResponse.ok) {
      throw new Error('Unable to load contact data.');
    }

    const contactsResult = await contactsResponse.json();
    const statsResult = await statsResponse.json();

    contacts = contactsResult.data || [];
    renderStats(statsResult.data || {});
    renderRows();
  } catch (error) {
    tableBody.innerHTML = `<tr><td colspan="6" class="empty-state">${error.message}</td></tr>`;
  }
};

searchInput.addEventListener('input', renderRows);
statusFilter.addEventListener('change', renderRows);

loadDashboard();
