// responder.js - First Responder Portal, Shelter Creation, and Volunteer Dispatch

import { state, showToast, notifyStateChange, loadLiveFeed } from './app.js';
import { updateMapMarkers } from './map-manager.js';

document.addEventListener('DOMContentLoaded', () => {
  setupResponderForms();
  setupVolunteerHandlers();
  renderResponderPortal();
  renderVolunteerMatches();

  // Re-render when global state updates
  notifyStateChange('init');
});

// 1. Setup Responder Portal Admin Panel
function setupResponderForms() {
  const shelterForm = document.getElementById('responder-shelter-form');
  if (!shelterForm) return;

  shelterForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const newShelter = {
      id: `sh-${Date.now()}`,
      name: document.getElementById('sh-name').value.trim(),
      lat: parseFloat(document.getElementById('sh-lat').value),
      lng: parseFloat(document.getElementById('sh-lng').value),
      capacity: parseInt(document.getElementById('sh-capacity').value),
      occupied: 0,
      food: document.getElementById('sh-food').checked,
      medical: document.getElementById('sh-medical').checked,
      power: document.getElementById('sh-power').checked,
      pets: document.getElementById('sh-pets').checked,
      status: 'Open'
    };

    state.shelters.push(newShelter);
    updateMapMarkers();
    updateDashboardMetrics();
    shelterForm.reset();

    showToast(`Successfully registered new shelter: ${newShelter.name}`, 'success');
  });
}

// 2. Setup Community Help & Volunteer Signup
function setupVolunteerHandlers() {
  const volunteerForm = document.getElementById('volunteer-signup-form');
  const helpForm = document.getElementById('help-request-form');

  if (volunteerForm) {
    volunteerForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const newVol = {
        id: `vol-${Date.now()}`,
        name: document.getElementById('vol-name').value.trim(),
        skill: document.getElementById('vol-skill').value,
        area: document.getElementById('vol-area').value.trim(),
        phone: '+91 99000 12345' // Simulated phone number
      };

      state.volunteers.push(newVol);
      updateDashboardMetrics();
      volunteerForm.reset();

      showToast(`Thank you, ${newVol.name}! Registered as ${newVol.skill} volunteer.`, 'success');
    });
  }

  if (helpForm) {
    helpForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const newReq = {
        id: `req-${Date.now()}`,
        name: document.getElementById('help-req-name').value.trim(),
        type: document.getElementById('help-req-category').value,
        landmark: document.getElementById('help-req-landmark').value.trim(),
        urgency: document.getElementById('help-req-urgency').value,
        details: document.getElementById('help-req-details').value.trim(),
        status: 'Pending'
      };

      state.helpRequests.unshift(newReq);
      updateDashboardMetrics();
      updateMapMarkers();
      loadLiveFeed();
      renderVolunteerMatches();
      helpForm.reset();

      showToast('Assistance request broadcasted to community volunteers.', 'success');
    });
  }
}

// 3. Render Responder alerts table
export function renderResponderPortal() {
  const tbody = document.querySelector('#responder-alerts-table tbody');
  if (!tbody) return;

  tbody.innerHTML = '';

  const allAlerts = [
    ...state.hazards.map(h => ({ id: h.id, source: 'Hazard', type: h.type, details: h.desc, loc: `Lat: ${h.lat.toFixed(4)}, Lng: ${h.lng.toFixed(4)}`, urgency: h.severity })),
    ...state.helpRequests.map(r => ({ id: r.id, source: 'SOS Request', type: r.type, details: r.details, loc: r.landmark, urgency: r.urgency }))
  ];

  if (allAlerts.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--color-text-muted);">No active incoming dispatcher alerts. Area secured.</td></tr>`;
    return;
  }

  allAlerts.forEach(alert => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="font-family: var(--font-mono); font-size:11px;">${alert.id}</td>
      <td><span style="color: var(--color-${alert.source === 'Hazard' ? 'orange' : 'red'}); font-weight:700;">${alert.source}: ${alert.type}</span></td>
      <td>${alert.details}</td>
      <td>${alert.loc}</td>
      <td><span class="mp-badge ${alert.urgency === 'Critical' ? 'missing' : 'safe'}">${alert.urgency}</span></td>
      <td>
        <button class="action-badge resolve-alert-btn" data-id="${alert.id}" data-source="${alert.source}">
          Resolve/Clear
        </button>
      </td>
    `;

    tr.querySelector('.resolve-alert-btn').addEventListener('click', (e) => {
      const id = e.target.getAttribute('data-id');
      const source = e.target.getAttribute('data-source');
      resolveEmergencyItem(id, source);
    });

    tbody.appendChild(tr);
  });
}

function resolveEmergencyItem(id, source) {
  if (source === 'Hazard') {
    state.hazards = state.hazards.filter(h => h.id !== id);
    showToast(`Road hazard resolved and marked safe.`, 'success');
  } else {
    state.helpRequests = state.helpRequests.filter(r => r.id !== id);
    showToast(`Community SOS request resolved. Dispatch stand-down.`, 'success');
  }

  updateMapMarkers();
  updateDashboardMetrics();
  loadLiveFeed();
  renderResponderPortal();
  renderVolunteerMatches();
}

// 4. Render Volunteer Matches
function renderVolunteerMatches() {
  const container = document.getElementById('active-matches-container');
  if (!container) return;

  container.innerHTML = '';

  const pending = state.helpRequests.filter(r => r.status === 'Pending');

  if (pending.length === 0) {
    container.innerHTML = `<div style="text-align:center; padding:20px; font-size:12px; color:var(--color-text-muted);">No pending volunteer assistance requests.</div>`;
    return;
  }

  pending.forEach(req => {
    const div = document.createElement('div');
    div.className = 'match-list-item';
    div.innerHTML = `
      <div>
        <h4 style="font-size:13px; font-weight:700;">${req.type} Assistance</h4>
        <span style="font-size:11px; color:var(--color-text-muted);">${req.landmark}</span>
        <p style="font-size:11px; margin-top:4px; line-height:1.4;">${req.details}</p>
      </div>
      <button class="btn-primary assign-vol-btn" style="width:auto; margin-top:0; font-size:11px; padding:6px 12px; background:var(--color-purple); color:white;">
        Dispatch Volunteer
      </button>
    `;

    div.querySelector('.assign-vol-btn').addEventListener('click', () => {
      req.status = 'Assigned';
      showToast(`Assigned nearest volunteer to dispatch location.`, 'success');
      renderVolunteerMatches();
    });

    container.appendChild(div);
  });
}

// 5. Update dashboard metric numbers dynamically
function updateDashboardMetrics() {
  const sh = document.getElementById('count-shelters');
  const haz = document.getElementById('count-hazards');
  const hosp = document.getElementById('count-hospitals');
  const vol = document.getElementById('count-volunteers');

  if (sh) sh.innerText = state.shelters.filter(s => s.status !== 'Closed').length;
  if (haz) haz.innerText = state.hazards.length;
  if (hosp) hosp.innerText = state.hospitals.filter(h => h.status === 'Operational').length;
  if (vol) vol.innerText = state.volunteers.length;
}
