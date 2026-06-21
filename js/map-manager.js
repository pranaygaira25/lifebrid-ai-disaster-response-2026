// map-manager.js - Leaflet Map Integration & Safe Path Routing

import { state, showToast, onStateChange, loadLiveFeed } from './app.js';

let map;
let layers = {
  shelters: L.layerGroup(),
  hazards: L.layerGroup(),
  hospitals: L.layerGroup(),
  volunteers: L.layerGroup()
};

let routeStartNode = null;
let routeEndNode = null;
let routeLine = null;
let graphLines = L.layerGroup();

// Local Street Network Graph for Safe Routing (Bangalore Coordinates)
const network = {
  nodes: {
    N1: { name: 'Cubbon Park Metro', lat: 12.9796, lng: 77.5984 },
    N2: { name: 'MG Road Crossing', lat: 12.9756, lng: 77.6068 },
    N3: { name: 'Commercial Street Junction', lat: 12.9822, lng: 77.6083 },
    N4: { name: 'Trinity Circle', lat: 12.9731, lng: 77.6170 },
    N5: { name: 'Richmond Town Flyover', lat: 12.9642, lng: 77.6011 },
    N6: { name: 'Brigade Road Crossing', lat: 12.9711, lng: 77.6068 }
  },
  edges: [
    { from: 'N1', to: 'N2', dist: 0.9, name: 'Kasturba Road / MG Road' },
    { from: 'N2', to: 'N3', dist: 0.8, name: 'Kamraj Road' },
    { from: 'N2', to: 'N4', dist: 1.1, name: 'MG Road' },
    { from: 'N4', to: 'N6', dist: 1.2, name: 'Trinity Circle link' },
    { from: 'N6', to: 'N5', dist: 1.0, name: 'Brigade Road' },
    { from: 'N5', to: 'N1', dist: 1.8, name: 'Richmond Road / Queens Road' },
    { from: 'N2', to: 'N6', dist: 0.5, name: 'Brigade Road Crossing' },
    { from: 'N3', to: 'N4', dist: 1.4, name: 'Trinity circle link via Commercial' }
  ]
};

document.addEventListener('DOMContentLoaded', () => {
  initMap();
  setupFilterHandlers();
  setupRoutingHandlers();
});

// Custom Icon Builders using styled inline SVGs
function createMarkerIcon(type, color, badge = '') {
  let svg = '';
  
  if (type === 'shelter') {
    svg = `<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>`;
  } else if (type === 'hazard') {
    svg = `<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`;
  } else if (type === 'hospital') {
    svg = `<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg>`;
  } else {
    svg = `<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>`;
  }

  const iconClass = type === 'hazard' && badge === 'Critical' ? 'pulse-marker-red' : (type === 'hazard' ? 'pulse-marker' : '');

  return L.divIcon({
    html: `<div class="${iconClass}" style="display:flex; justify-content:center; align-items:center; width:34px; height:34px; border-radius:50%; background:rgba(0,0,0,0.6); border:1px solid ${color}">${svg}</div>`,
    className: 'custom-leaflet-icon',
    iconSize: [34, 34],
    iconAnchor: [17, 17]
  });
}

function initMap() {
  // Center on Bangalore
  map = L.map('map', {
    center: [12.9716, 77.5946],
    zoom: 14,
    zoomControl: false
  });

  L.control.zoom({ position: 'bottomleft' }).addTo(map);
  window.lifebridgeMap = map;

  // Add Default Dark Matter Tiles (Online Mode)
  const defaultTile = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager_labels_under/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; CartoDB',
    subdomains: 'abcd',
    maxZoom: 20
  }).addTo(map);

  // Bind Layers
  Object.values(layers).forEach(layer => layer.addTo(map));
  graphLines.addTo(map);

  // Render Markers
  updateMapMarkers();

  // Double Click handler to report road hazard / flood
  map.on('dblclick', (e) => {
    handleMapDoubleClick(e.latlng);
  });

  // Listen to state offline mode switches
  onStateChange((key) => {
    if (key === 'network') {
      if (state.isOffline) {
        // Simulating Offline map by switching tile layer opacity or adding grid
        defaultTile.setOpacity(0.3);
        showToast('Map is currently operating in Local Vector Cache.', 'warning');
      } else {
        defaultTile.setOpacity(1.0);
      }
    }
  });

  // Render initial network road grid lightly on map
  renderStreetNetwork();
}

function renderStreetNetwork() {
  graphLines.clearLayers();
  
  network.edges.forEach(edge => {
    const nodeFrom = network.nodes[edge.from];
    const nodeTo = network.nodes[edge.to];
    
    // Draw street lines
    L.polyline([[nodeFrom.lat, nodeFrom.lng], [nodeTo.lat, nodeTo.lng]], {
      color: 'rgba(255,255,255,0.15)',
      weight: 4,
      dashArray: '5, 10'
    }).addTo(graphLines);
  });
}

export function updateMapMarkers() {
  // 1. Clear existing layers
  layers.shelters.clearLayers();
  layers.hazards.clearLayers();
  layers.hospitals.clearLayers();
  layers.volunteers.clearLayers();

  // 2. Load Shelters
  state.shelters.forEach(shelter => {
    const color = shelter.status === 'Closed' ? 'var(--color-red)' : shelter.status === 'Near Capacity' ? 'var(--color-orange)' : 'var(--color-cyan)';
    const marker = L.marker([shelter.lat, shelter.lng], {
      icon: createMarkerIcon('shelter', color)
    });
    
    const popupContent = `
      <div style="color:#fff; font-family:var(--font-main); min-width:200px;">
        <h4 style="margin:0 0 6px 0; color:var(--color-cyan);">${shelter.name}</h4>
        <div style="font-size:12px; margin-bottom:8px;">
          <span>Status: <strong style="color:${color};">${shelter.status}</strong></span><br/>
          <span>Occupancy: <strong>${shelter.occupied} / ${shelter.capacity}</strong></span>
        </div>
        <div style="font-size:11px; border-top:1px solid #333; padding-top:6px;">
          ⚡ Power: ${shelter.power ? '🟢 Yes' : '🔴 No'}<br/>
          🩺 Medical Staff: ${shelter.medical ? '🟢 Yes' : '🔴 No'}<br/>
          🐱 Pets: ${shelter.pets ? '🟢 Yes' : '🔴 No'}
        </div>
      </div>
    `;
    
    marker.bindPopup(popupContent).addTo(layers.shelters);
  });

  // 3. Load Hospitals
  state.hospitals.forEach(hospital => {
    const color = hospital.status === 'High Load' ? 'var(--color-orange)' : 'var(--color-green)';
    const marker = L.marker([hospital.lat, hospital.lng], {
      icon: createMarkerIcon('hospital', color)
    });

    const popupContent = `
      <div style="color:#fff; font-family:var(--font-main); min-width:200px;">
        <h4 style="margin:0 0 6px 0; color:var(--color-green);">${hospital.name}</h4>
        <div style="font-size:12px; margin-bottom:8px;">
          <span>Status: <strong>${hospital.status}</strong></span><br/>
          <span>ICU Beds Available: <strong style="color:var(--color-cyan);">${hospital.beds}</strong></span><br/>
          <span>Oxygen Reserve: <strong>${hospital.oxygen}</strong></span>
        </div>
        <div style="font-size:11px; border-top:1px solid #333; padding-top:6px;">
          🩸 Blood Bank Supply: <strong>${hospital.blood}</strong>
        </div>
      </div>
    `;
    marker.bindPopup(popupContent).addTo(layers.hospitals);
  });

  // 4. Load Hazards
  state.hazards.forEach(hazard => {
    const color = hazard.severity === 'Critical' ? 'var(--color-red)' : 'var(--color-orange)';
    const marker = L.marker([hazard.lat, hazard.lng], {
      icon: createMarkerIcon('hazard', color, hazard.severity)
    });

    const popupContent = `
      <div style="color:#fff; font-family:var(--font-main); min-width:180px;">
        <h4 style="margin:0 0 4px 0; color:${color};">${hazard.type} Roadblock</h4>
        <p style="font-size:12px; margin:0 0 8px 0;">${hazard.desc}</p>
        <span style="font-size:11px; color:var(--color-text-muted);">Logged at ${hazard.time} (${hazard.severity})</span>
      </div>
    `;
    marker.bindPopup(popupContent).addTo(layers.hazards);
  });

  // 5. Load Volunteers / Active SOS
  state.helpRequests.forEach(req => {
    // Treat pending requests as a purple heart icon
    const marker = L.marker([12.9716 + (Math.random() - 0.5)*0.03, 77.5946 + (Math.random() - 0.5)*0.03], {
      icon: createMarkerIcon('volunteer', 'var(--color-purple)')
    });
    const popupContent = `
      <div style="color:#fff; font-family:var(--font-main); min-width:180px;">
        <h4 style="margin:0 0 4px 0; color:var(--color-purple);">Rescue Help: ${req.type}</h4>
        <p style="font-size:12px; margin:0 0 8px 0;">By: ${req.name}<br/>Details: ${req.details}</p>
        <span style="font-size:11px; color:var(--color-text-muted);">Location: ${req.landmark}</span>
      </div>
    `;
    marker.bindPopup(popupContent).addTo(layers.volunteers);
  });
}

// Map Double-Click Hazard Creation Dialog
function handleMapDoubleClick(latlng) {
  const type = prompt("Enter Hazard Type:\n1. Flood\n2. Blockage\n3. Accident");
  if (!type) return;

  let hazardType = 'Blockage';
  let desc = 'Debris on road.';
  
  if (type === '1') {
    hazardType = 'Flood';
    desc = 'Flooding water. Road blocked.';
  } else if (type === '3') {
    hazardType = 'Accident';
    desc = 'Vehicle collision. Blocked.';
  }

  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const newHazard = {
    id: `haz-${state.hazards.length + 1}`,
    type: hazardType,
    lat: latlng.lat,
    lng: latlng.lng,
    severity: 'High',
    desc: desc,
    time: timeStr
  };

  state.hazards.push(newHazard);
  updateMapMarkers();
  loadLiveFeed();
  showToast(`Logged a new ${hazardType} hazard at coordinates!`, 'success');
}

// Layer filtering
function setupFilterHandlers() {
  document.getElementById('layer-shelters').addEventListener('change', (e) => {
    if (e.target.checked) map.addLayer(layers.shelters);
    else map.removeLayer(layers.shelters);
  });

  document.getElementById('layer-hazards').addEventListener('change', (e) => {
    if (e.target.checked) map.addLayer(layers.hazards);
    else map.removeLayer(layers.hazards);
  });

  document.getElementById('layer-hospitals').addEventListener('change', (e) => {
    if (e.target.checked) map.addLayer(layers.hospitals);
    else map.removeLayer(layers.hospitals);
  });

  document.getElementById('layer-volunteers').addEventListener('change', (e) => {
    if (e.target.checked) map.addLayer(layers.volunteers);
    else map.removeLayer(layers.volunteers);
  });
}

// Safe Route Finder Logic using Dijkstra snap grid
function setupRoutingHandlers() {
  const startBtn = document.getElementById('route-start-display');
  const endBtn = document.getElementById('route-end-display');
  const calcBtn = document.getElementById('btn-calc-route');
  const clearBtn = document.getElementById('btn-clear-route');

  let choosingStart = false;
  let choosingEnd = false;

  startBtn.addEventListener('click', () => {
    choosingStart = true;
    choosingEnd = false;
    showToast('Click a point on the map to snap to nearest intersection.', 'info');
  });

  endBtn.addEventListener('click', () => {
    choosingStart = false;
    choosingEnd = true;
    showToast('Click a point on the map to select destination.', 'info');
  });

  map.on('click', (e) => {
    if (choosingStart) {
      routeStartNode = findNearestNode(e.latlng);
      document.getElementById('route-start-display').innerHTML = `
        <span>${network.nodes[routeStartNode].name}</span>
        <i data-lucide="check-circle" style="color:var(--color-green); width:12px;"></i>
      `;
      choosingStart = false;
    } else if (choosingEnd) {
      routeEndNode = findNearestNode(e.latlng);
      document.getElementById('route-end-display').innerHTML = `
        <span>${network.nodes[routeEndNode].name}</span>
        <i data-lucide="check-circle" style="color:var(--color-green); width:12px;"></i>
      `;
      choosingEnd = false;
    }
    if (window.lucide) window.lucide.createIcons();
  });

  calcBtn.addEventListener('click', () => {
    if (!routeStartNode || !routeEndNode) {
      showToast('Please select both Start and End points.', 'error');
      return;
    }

    calculateSafeRoute(routeStartNode, routeEndNode);
  });

  clearBtn.addEventListener('click', () => {
    if (routeLine) {
      map.removeLayer(routeLine);
      routeLine = null;
    }
    routeStartNode = null;
    routeEndNode = null;
    document.getElementById('route-start-display').innerHTML = `<span>Click on map to select...</span>`;
    document.getElementById('route-end-display').innerHTML = `<span>Click on map to select...</span>`;
    document.getElementById('route-instructions-box').style.display = 'none';
    if (window.lucide) window.lucide.createIcons();
  });
}

function findNearestNode(latlng) {
  let nearestNode = null;
  let minDist = Infinity;
  
  Object.keys(network.nodes).forEach(nodeKey => {
    const node = network.nodes[nodeKey];
    const dist = map.distance([latlng.lat, latlng.lng], [node.lat, node.lng]);
    if (dist < minDist) {
      minDist = dist;
      nearestNode = nodeKey;
    }
  });

  return nearestNode;
}

// Custom pathfinder routing algorithm (Dijkstra) avoiding hazard coordinates
function calculateSafeRoute(start, end) {
  // 1. Identify which edges are blocked by hazards
  // An edge is blocked if any hazard is located within 200m of the edge's midpoint or path
  const blockedEdges = new Set();
  
  network.edges.forEach((edge, idx) => {
    const fromNode = network.nodes[edge.from];
    const toNode = network.nodes[edge.to];
    
    // Midpoint of road segment
    const midLat = (fromNode.lat + toNode.lat) / 2;
    const midLng = (fromNode.lng + toNode.lng) / 2;

    state.hazards.forEach(hazard => {
      // Distance from hazard to midpoint of edge
      const dist = map.distance([midLat, midLng], [hazard.lat, hazard.lng]);
      if (dist < 300) { // 300 meters proximity roadblock alert
        blockedEdges.add(idx);
      }
    });
  });

  // 2. Dijkstra Algorithm
  const distances = {};
  const previous = {};
  const queue = [];

  Object.keys(network.nodes).forEach(node => {
    distances[node] = Infinity;
    previous[node] = null;
    queue.push(node);
  });
  distances[start] = 0;

  while (queue.length > 0) {
    // Sort queue
    queue.sort((a, b) => distances[a] - distances[b]);
    const u = queue.shift();

    if (u === end) break;
    if (distances[u] === Infinity) break;

    // Find neighbors of u
    network.edges.forEach((edge, idx) => {
      // Avoid blocked edges!
      if (blockedEdges.has(idx)) return;

      let v = null;
      if (edge.from === u) v = edge.to;
      else if (edge.to === u) v = edge.from;

      if (v && queue.includes(v)) {
        const alt = distances[u] + edge.dist;
        if (alt < distances[v]) {
          distances[v] = alt;
          previous[v] = u;
        }
      }
    });
  }

  // 3. Render Route path
  if (routeLine) {
    map.removeLayer(routeLine);
  }

  if (distances[end] === Infinity) {
    showToast('No safe route found! All pathways are blocked by active hazards.', 'error');
    document.getElementById('route-instructions-box').style.display = 'block';
    document.getElementById('route-instructions-box').innerHTML = `
      <div class="route-path-details" style="background:rgba(239,68,68,0.08); border-color:rgba(239,68,68,0.3); color:#fca5a5;">
        ❌ ALL STREETS EN ROUTE ARE BLOCKED BY FLOODS / COLLISION. EVACUATE TO NEAREST SHELTER.
      </div>
    `;
    return;
  }

  // Backtrack path
  const path = [];
  let curr = end;
  while (curr) {
    path.unshift(network.nodes[curr]);
    curr = previous[curr];
  }

  const coordinates = path.map(node => [node.lat, node.lng]);
  routeLine = L.polyline(coordinates, {
    color: '#10b981',
    weight: 6,
    opacity: 0.95,
    lineCap: 'round',
    lineJoin: 'round'
  }).addTo(map);

  // Zoom to path
  map.fitBounds(routeLine.getBounds(), { padding: [50, 50] });

  // Render Path Instructions
  const instBox = document.getElementById('route-instructions-box');
  instBox.style.display = 'block';
  
  let instructionsHtml = `
    <div class="route-path-details">
      ✓ Route Calculated. Distance: ${distances[end].toFixed(1)} km.<br/>
      🟢 STATUS: SAFE FROM ROADBLOCKS.
    </div>
    <ol style="padding-left: 16px; margin: 0; font-size: 11.5px; display:flex; flex-direction:column; gap:6px;">
  `;

  for (let i = 0; i < path.length - 1; i++) {
    // Find edge name
    const nodeA = path[i];
    const nodeB = path[i+1];
    const edge = network.edges.find(e => 
      (network.nodes[e.from] === nodeA && network.nodes[e.to] === nodeB) ||
      (network.nodes[e.from] === nodeB && network.nodes[e.to] === nodeA)
    );
    instructionsHtml += `<li>Take <strong>${edge ? edge.name : 'Safe Street'}</strong> towards ${nodeB.name}</li>`;
  }
  instructionsHtml += '</ol>';
  instBox.innerHTML = instructionsHtml;
  
  showToast('Safe path calculated successfully!', 'success');
}
