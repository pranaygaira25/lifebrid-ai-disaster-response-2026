// missing-persons.js - Missing Persons Bulletin Board

import { showToast } from './app.js';

let missingPersons = [
  { id: 'mp-1', name: 'Aarav Sharma', age: 45, gender: 'Male', lastSeen: 'Cubbon Park Metro', details: 'Wearing a white kurta and blue jeans. Silver bracelet on right hand.', contact: 'Sunita Sharma (+91 98451 02938)', status: 'Missing' },
  { id: 'mp-2', name: 'Pooja Patel', age: 22, gender: 'Female', lastSeen: 'MG Road Crossing', details: 'Black hair, yellow salwar kameez, carrying a brown handbag.', contact: 'Vikram Patel (+91 99002 88471)', status: 'Located Safe' },
  { id: 'mp-3', name: 'Baldev Singh', age: 71, gender: 'Male', lastSeen: 'Trinity Circle', details: 'Speaks Kannada and Hindi, suffers from mild dementia. Wearing a white Gandhi topi.', contact: 'Sanjay Singh (+91 88844 77123)', status: 'Missing' }
];

document.addEventListener('DOMContentLoaded', () => {
  loadMissingPersons();
  setupMissingPersonsHandlers();
});

function loadMissingPersons() {
  // Merge local storage items if any
  const saved = JSON.parse(localStorage.getItem('lifebridge_missing_persons'));
  if (saved && saved.length > 0) {
    // filter duplicates from hardcoded mock list
    const ids = new Set(missingPersons.map(p => p.id));
    saved.forEach(item => {
      if (!ids.has(item.id)) {
        missingPersons.push(item);
      }
    });
  } else {
    localStorage.setItem('lifebridge_missing_persons', JSON.stringify(missingPersons));
  }
  
  renderMissingPersonsGrid(missingPersons);
}

function renderMissingPersonsGrid(dataList) {
  const container = document.getElementById('mp-grid-container');
  if (!container) return;

  container.innerHTML = '';

  if (dataList.length === 0) {
    container.innerHTML = `
      <div class="col-12 glass-panel" style="padding:40px; text-align:center; color:var(--color-text-muted);">
        No reports match your current search queries.
      </div>
    `;
    return;
  }

  dataList.forEach(person => {
    const card = document.createElement('div');
    card.className = 'glass-panel mp-card';
    
    const initial = person.name.charAt(0);
    const statusClass = person.status === 'Missing' ? 'missing' : 'safe';
    
    card.innerHTML = `
      <div class="mp-card-header">
        <div style="display:flex; align-items:center; gap:12px;">
          <div class="mp-avatar">${initial}</div>
          <div>
            <h3 style="font-size:15px; font-weight:700;">${person.name}</h3>
            <span style="font-size:11px; color:var(--color-text-muted);">${person.gender}, Age ${person.age}</span>
          </div>
        </div>
        <span class="mp-badge ${statusClass}">${person.status}</span>
      </div>
      
      <div class="mp-details">
        <div class="mp-details-row">
          <span class="mp-label">Last Seen:</span>
          <span>${person.lastSeen}</span>
        </div>
        <div style="margin-top:4px;">
          <span class="mp-label">Details:</span>
          <p style="font-size:11.5px; margin-top:2px; line-height:1.4;">${person.details}</p>
        </div>
        <div class="mp-details-row" style="margin-top:6px; border-top:1px solid var(--border-light); padding-top:6px;">
          <span class="mp-label">Contact:</span>
          <span>${person.contact}</span>
        </div>
      </div>

      <div style="margin-top:10px; display:flex; gap:8px;">
        <button class="btn-secondary toggle-status-btn" style="padding:6px 10px; font-size:11px; flex-grow:1;">
          Toggle Found Status
        </button>
      </div>
    `;

    // Toggle Safe Status Button Action
    card.querySelector('.toggle-status-btn').addEventListener('click', () => {
      togglePersonStatus(person.id);
    });

    container.appendChild(card);
  });
}

function togglePersonStatus(id) {
  missingPersons = missingPersons.map(person => {
    if (person.id === id) {
      const newStatus = person.status === 'Missing' ? 'Located Safe' : 'Missing';
      showToast(`${person.name} marked as ${newStatus}!`, 'success');
      return { ...person, status: newStatus };
    }
    return person;
  });

  localStorage.setItem('lifebridge_missing_persons', JSON.stringify(missingPersons));
  
  // Re-filter search or re-render
  const searchInput = document.getElementById('mp-search-input');
  applyFilters(searchInput.value);
}

function setupMissingPersonsHandlers() {
  const searchInput = document.getElementById('mp-search-input');
  const formPanel = document.getElementById('missing-report-panel');
  const toggleFormBtn = document.getElementById('btn-report-missing-toggle');
  const closeFormBtn = document.getElementById('btn-close-mp-report');
  const form = document.getElementById('mp-report-form');

  searchInput.addEventListener('input', (e) => {
    applyFilters(e.target.value);
  });

  toggleFormBtn.addEventListener('click', () => {
    formPanel.style.display = formPanel.style.display === 'none' ? 'block' : 'none';
  });

  closeFormBtn.addEventListener('click', () => {
    formPanel.style.display = 'none';
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const newPerson = {
      id: `mp-${Date.now()}`,
      name: document.getElementById('mp-name').value.trim(),
      age: parseInt(document.getElementById('mp-age').value),
      gender: document.getElementById('mp-gender').value,
      lastSeen: document.getElementById('mp-last-seen').value.trim(),
      details: document.getElementById('mp-details').value.trim(),
      contact: document.getElementById('mp-contact').value.trim(),
      status: 'Missing'
    };

    missingPersons.unshift(newPerson);
    localStorage.setItem('lifebridge_missing_persons', JSON.stringify(missingPersons));
    
    form.reset();
    formPanel.style.display = 'none';
    
    applyFilters(searchInput.value);
    showToast(`Registered missing report for ${newPerson.name}!`, 'success');
  });
}

function applyFilters(query) {
  const q = query.toLowerCase().trim();
  if (!q) {
    renderMissingPersonsGrid(missingPersons);
    return;
  }

  const filtered = missingPersons.filter(person => {
    return person.name.toLowerCase().includes(q) ||
           person.lastSeen.toLowerCase().includes(q) ||
           person.details.toLowerCase().includes(q);
  });

  renderMissingPersonsGrid(filtered);
}
