// app.js - Global Coordination, State Management, and Audio Synthesizer

import './map-manager.js';
import './chat-agent.js';
import './checklist.js';
import './missing-persons.js';
import './drills.js';
import './responder.js';

// Global State Object
export const state = {
  isOffline: false,
  networkOnline: true,
  sirenActive: false,
  audioCtx: null,
  sirenOscillators: [],
  sirenInterval: null,
  
  // Mock Data
  shelters: [
    { id: 'sh-1', name: 'Kanteerava Stadium Relief Camp', lat: 12.9692, lng: 77.5932, capacity: 1000, occupied: 640, food: true, medical: true, power: true, pets: false, status: 'Open' },
    { id: 'sh-2', name: 'Cubbon Park YMCA Center', lat: 12.9760, lng: 77.5950, capacity: 300, occupied: 285, food: true, medical: true, power: true, pets: true, status: 'Near Capacity' },
    { id: 'sh-3', name: 'Chinnaswamy Stadium Hall C', lat: 12.9788, lng: 77.5992, capacity: 500, occupied: 80, food: true, medical: true, power: true, pets: true, status: 'Open' },
    { id: 'sh-4', name: 'Indiranagar Community Hall', lat: 12.9719, lng: 77.6412, capacity: 200, occupied: 0, food: false, medical: false, power: false, pets: false, status: 'Closed' }
  ],
  
  hospitals: [
    { id: 'hosp-1', name: 'Mallya Hospital (Richmond Rd)', lat: 12.9675, lng: 77.5954, beds: 24, oxygen: 'Available', blood: 'A+, B+, O+', status: 'Operational' },
    { id: 'hosp-2', name: 'Bowring & Lady Curzon Hospital', lat: 12.9830, lng: 77.6025, beds: 8, oxygen: 'Critical Supply', blood: 'O-, AB+, A-', status: 'High Load' },
    { id: 'hosp-3', name: 'St. Martha Hospital (Nrupathunga Rd)', lat: 12.9725, lng: 77.5855, beds: 42, oxygen: 'Available', blood: 'O+, B-, AB-', status: 'Operational' }
  ],

  hazards: [
    { id: 'haz-1', type: 'Flood', lat: 12.9642, lng: 77.6011, severity: 'Critical', desc: 'Heavy waterlogging at Richmond Circle Underpass. Impassable.', time: '09:00 AM' },
    { id: 'haz-2', type: 'Blockage', lat: 12.9756, lng: 77.6068, severity: 'Medium', desc: 'Fallen gulmohar tree blocking two lanes on MG Road.', time: '08:45 AM' },
    { id: 'haz-3', type: 'Accident', lat: 12.9731, lng: 77.6170, severity: 'High', desc: 'Waterlogging & broken down bus blocking Trinity Circle.', time: '09:15 AM' }
  ],

  volunteers: [
    { id: 'vol-1', name: 'Dr. Rajesh Kumar', skill: 'First Aid', area: 'Richmond Town', phone: '+91 98450 12345' },
    { id: 'vol-2', name: 'Priya Sharma', skill: 'Logistics', area: 'MG Road', phone: '+91 99000 98765' }
  ],

  helpRequests: [
    { id: 'req-1', name: 'Ravi Hegde', type: 'Supplies', landmark: 'Commercial Street Entrance', urgency: 'High', details: 'Need drinking water and dry rations for 4 elderly residents.', status: 'Pending' },
    { id: 'req-2', name: 'Suresh Murthy', type: 'Medical', landmark: 'Richmond Road, Near HDFC Bank', urgency: 'Critical', details: 'Cardiac patient needing urgent medical transit and oxygen cylinder.', status: 'Assigned' }
  ]
};

// Listeners Registry
const listeners = [];
export function onStateChange(callback) {
  listeners.push(callback);
}
export function notifyStateChange(updatedKey) {
  listeners.forEach(cb => cb(updatedKey, state));
}

// Global UI Elements
document.addEventListener('DOMContentLoaded', () => {
  // Initialize Lucide Icons
  if (window.lucide) {
    window.lucide.createIcons();
  }

  // Navigation Logic
  const navItems = document.querySelectorAll('.nav-links .nav-item');
  const tabs = document.querySelectorAll('.tab-content');
  const pageTitle = document.getElementById('page-title');

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const tabId = item.getAttribute('data-tab');
      
      navItems.forEach(nav => nav.classList.remove('active'));
      tabs.forEach(tab => tab.classList.remove('active'));
      
      item.classList.add('active');
      const targetTab = document.getElementById(`${tabId}-tab`);
      if (targetTab) targetTab.classList.add('active');

      // Update Page Title
      const btnText = item.querySelector('span').innerText;
      pageTitle.innerText = btnText;

      // Leaflet specific fix for rendering when maps are shown
      if (tabId === 'map-view' && window.lifebridgeMap) {
        setTimeout(() => {
          window.lifebridgeMap.invalidateSize();
        }, 100);
      }
    });
  });

  // Offline Toggle Logic
  const offlineToggle = document.getElementById('offline-toggle');
  const networkBadge = document.getElementById('network-badge');

  offlineToggle.addEventListener('change', (e) => {
    state.isOffline = e.target.checked;
    
    if (state.isOffline) {
      networkBadge.innerHTML = '<span class="status-dot offline"></span>Local Grid (Offline)';
      showToast('Offline Mode Activated. Map switching to local vector graphics cache.', 'warning');
    } else {
      networkBadge.innerHTML = '<span class="status-dot"></span>Online';
      showToast('Connection Re-established. Syncing databases with LifeBridge mainframes.', 'success');
    }
    
    notifyStateChange('network');
  });

  // Battery Simulator (Standard Battery API fallback)
  if (navigator.getBattery) {
    navigator.getBattery().then(battery => {
      updateBatteryStatus(battery.level * 100, battery.charging);
      battery.addEventListener('levelchange', () => updateBatteryStatus(battery.level * 100, battery.charging));
      battery.addEventListener('chargingchange', () => updateBatteryStatus(battery.level * 100, battery.charging));
    });
  } else {
    // Simulated power drain
    let batteryLevel = 84;
    setInterval(() => {
      if (batteryLevel > 10) batteryLevel -= 1;
      updateBatteryStatus(batteryLevel, false);
    }, 180000);
  }

  function updateBatteryStatus(level, charging) {
    const batText = document.getElementById('battery-level');
    batText.innerText = `${Math.round(level)}%`;
  }

  // Quick Action Navigation Hooks
  document.getElementById('action-route').addEventListener('click', () => {
    triggerTabNavigation('map-view');
    showToast('Click two points on the map to calculate a route around flood zones.', 'info');
  });
  
  document.getElementById('action-report').addEventListener('click', () => {
    triggerTabNavigation('map-view');
    showToast('Double-click on the map area to log roadblock or flood report.', 'info');
  });

  document.getElementById('action-checklist').addEventListener('click', () => {
    triggerTabNavigation('checklists');
  });

  document.getElementById('action-drill').addEventListener('click', () => {
    triggerTabNavigation('drills');
  });

  // SOS Alarm Interface Hooks
  const sosBtn = document.getElementById('sos-btn');
  const sosOverlay = document.getElementById('sos-overlay');
  const deactivateSos = document.getElementById('btn-deactivate-sos');
  const sirenToggle = document.getElementById('btn-toggle-siren-sound');
  const coordDisplay = document.getElementById('sos-coordinates');

  sosBtn.addEventListener('click', () => {
    sosOverlay.classList.add('active');
    startEmergencySiren();
    
    // Attempt real GPS coords or fallback to mock
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          coordDisplay.innerText = `${position.coords.latitude.toFixed(4)}° N, ${position.coords.longitude.toFixed(4)}° W`;
          state.sosCoords = [position.coords.latitude, position.coords.longitude];
        },
        () => {
          // Bangalore Mock coordinates
          coordDisplay.innerText = `12.9716° N, 77.5946° E (Mock GPS Mode)`;
          state.sosCoords = [12.9716, 77.5946];
        }
      );
    } else {
      coordDisplay.innerText = `12.9716° N, 77.5946° E (Mock GPS Mode)`;
      state.sosCoords = [12.9716, 77.5946];
    }
  });

  deactivateSos.addEventListener('click', () => {
    sosOverlay.classList.remove('active');
    stopEmergencySiren();
    showToast('Distress transmission deactivated.', 'info');
  });

  sirenToggle.addEventListener('click', () => {
    if (state.sirenActive) {
      stopSirenAudio();
      sirenToggle.innerHTML = '<i data-lucide="volume-2" style="display: inline-block; vertical-align: middle; margin-right: 6px; width: 16px;"></i> Unmute Siren Audio';
    } else {
      startSirenAudio();
      sirenToggle.innerHTML = '<i data-lucide="volume-x" style="display: inline-block; vertical-align: middle; margin-right: 6px; width: 16px;"></i> Mute Siren Audio';
    }
    if (window.lucide) window.lucide.createIcons();
  });
});

// Trigger Section Transition
export function triggerTabNavigation(tabName) {
  const tabItem = document.querySelector(`.nav-links [data-tab="${tabName}"]`);
  if (tabItem) tabItem.click();
}

// Toast Notifications System
export function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = 'glass-panel';
  toast.style.padding = '12px 20px';
  toast.style.borderRadius = '8px';
  toast.style.borderLeft = `4px solid var(--color-${type === 'error' ? 'red' : type === 'success' ? 'green' : type === 'warning' ? 'orange' : 'cyan'})`;
  toast.style.fontSize = '13px';
  toast.style.fontWeight = '600';
  toast.style.boxShadow = 'var(--glass-shadow)';
  toast.style.transform = 'translateY(20px)';
  toast.style.opacity = '0';
  toast.style.transition = 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
  
  toast.innerHTML = `
    <div style="display: flex; align-items: center; gap: 8px;">
      <span style="color: var(--color-${type === 'error' ? 'red' : type === 'success' ? 'green' : type === 'warning' ? 'orange' : 'cyan'}); font-size: 16px;">
        ${type === 'success' ? '✓' : type === 'error' ? '🗙' : 'ℹ'}
      </span>
      <span>${message}</span>
    </div>
  `;
  
  container.appendChild(toast);
  
  // Animate in
  setTimeout(() => {
    toast.style.transform = 'translateY(0)';
    toast.style.opacity = '1';
  }, 50);
  
  // Remove after duration
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-10px)';
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 4000);
}

// Audio Siren Synthesizer using Web Audio API
function startEmergencySiren() {
  state.sirenActive = true;
  document.getElementById('siren-status-text').innerHTML = '<span class="status-dot" style="background: var(--color-red); box-shadow: 0 0 8px var(--color-red);"></span>Active';
  startSirenAudio();
}

function startSirenAudio() {
  try {
    if (!state.audioCtx) {
      state.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    // Clean old nodes
    stopSirenAudio();

    // Create 2 oscillators for a dual-tone wailing siren
    const osc1 = state.audioCtx.createOscillator();
    const osc2 = state.audioCtx.createOscillator();
    
    const gainNode1 = state.audioCtx.createGain();
    const gainNode2 = state.audioCtx.createGain();

    osc1.type = 'sawtooth';
    osc2.type = 'sine';

    osc1.connect(gainNode1);
    osc2.connect(gainNode2);
    
    gainNode1.connect(state.audioCtx.destination);
    gainNode2.connect(state.audioCtx.destination);

    gainNode1.gain.setValueAtTime(0.08, state.audioCtx.currentTime);
    gainNode2.gain.setValueAtTime(0.12, state.audioCtx.currentTime);

    osc1.start();
    osc2.start();

    state.sirenOscillators = [osc1, osc2];

    // LFO Modulation simulating a wailing sound (600Hz to 1200Hz back and forth)
    let direction = 1;
    let freq = 600;
    
    state.sirenInterval = setInterval(() => {
      if (direction === 1) {
        freq += 40;
        if (freq >= 1200) direction = -1;
      } else {
        freq -= 40;
        if (freq <= 600) direction = 1;
      }
      
      osc1.frequency.setValueAtTime(freq, state.audioCtx.currentTime);
      osc2.frequency.setValueAtTime(freq * 1.5, state.audioCtx.currentTime);
    }, 30);

  } catch (error) {
    console.error('AudioContext synthesis blocked or unsupported: ', error);
  }
}

function stopEmergencySiren() {
  state.sirenActive = false;
  document.getElementById('siren-status-text').innerHTML = 'Ready';
  stopSirenAudio();
}

function stopSirenAudio() {
  if (state.sirenInterval) {
    clearInterval(state.sirenInterval);
    state.sirenInterval = null;
  }
  state.sirenOscillators.forEach(osc => {
    try {
      osc.stop();
    } catch (e) {}
  });
  state.sirenOscillators = [];
}

// Initial Live Feed Loader
export function loadLiveFeed() {
  const tbody = document.querySelector('#dashboard-feed-table tbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  const allAlerts = [
    ...state.hazards.map(h => ({ type: 'Hazard', location: `Lat: ${h.lat}, Lng: ${h.lng}`, desc: `${h.type}: ${h.desc}`, time: h.time, urgency: h.severity })),
    ...state.helpRequests.map(r => ({ type: 'SOS Request', location: r.landmark, desc: `By ${r.name}: ${r.details}`, time: '09:30 AM', urgency: r.urgency })),
  ];

  allAlerts.sort((a, b) => b.time.localeCompare(a.time));

  allAlerts.forEach(alert => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="font-family: var(--font-mono);">${alert.time}</td>
      <td><span style="color: var(--color-${alert.type === 'Hazard' ? 'orange' : 'red'}); font-weight: 700;">${alert.type}</span></td>
      <td>${alert.location}</td>
      <td>${alert.desc}</td>
      <td><span class="mp-badge ${alert.urgency === 'Critical' ? 'missing' : 'safe'}" style="font-size: 9px;">${alert.urgency}</span></td>
    `;
    tbody.appendChild(tr);
  });

  document.getElementById('live-feed-count').innerText = `${allAlerts.length} reports logged`;
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
  loadLiveFeed();
});
