// checklist.js - Disaster Preparedness Supply Kits and Local Storage Saving

const checklists = {
  flood: [
    "Bottled water (3 litres/person/day for 3 days)",
    "Non-perishable food / dry snacks (MTR packs, biscuits) (3-day supply)",
    "Manual can opener / pocket knife",
    "Waterproof high-lumen flashlight",
    "Emergency solar/hand-crank radio",
    "Personal prescriptions & first aid kit",
    "Waterproof pouch for Aadhaar Cards, Voter IDs & ration cards",
    "Lighter or waterproof matches"
  ],
  earthquake: [
    "Sturdy closed-toe shoes (placed near bed)",
    "Thick leather work gloves",
    "N95 dust masks (for plaster/debris dust)",
    "Emergency whistle (to signal rescue teams)",
    "Wrench/pliers to shut off gas and main water valve",
    "Heavy-duty garbage bags for sanitation",
    "Flashlight with extra batteries"
  ],
  cyclone: [
    "Heavy tarps and tie-down paracords",
    "Emergency cash reserve (ATMs and card terminals may be down)",
    "Fully-charged 20,000mAh power bank",
    "Rain jackets and rubber boots",
    "Multi-tool pocket knife",
    "Emergency safety matches/candles",
    "Feminine hygiene & baby supplies"
  ],
  accident: [
    "Sterile gauze pads of various sizes",
    "Adhesive fabric bandages (band-aids)",
    "Antiseptic wipes and burn treatment cream",
    "Medical shears (scissors) & metal tweezers",
    "Instant chemical cold packs",
    "Reflective warning triangle (for vehicle breakdowns)",
    "Disposable nitrile gloves (3 pairs)"
  ]
};

let currentCategory = 'flood';

document.addEventListener('DOMContentLoaded', () => {
  setupChecklistTabs();
  renderChecklist();
});

function setupChecklistTabs() {
  const tabs = document.querySelectorAll('.checklist-cat-btn');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentCategory = tab.getAttribute('data-cat');
      renderChecklist();
    });
  });
}

function renderChecklist() {
  const container = document.getElementById('checklist-items-container');
  if (!container) return;

  container.innerHTML = '';
  const items = checklists[currentCategory];

  // Retrieve saved states
  const savedState = JSON.parse(localStorage.getItem(`lifebridge_checklist_${currentCategory}`)) || {};

  let checkedCount = 0;

  items.forEach((item, index) => {
    const isChecked = savedState[index] || false;
    if (isChecked) checkedCount++;

    const div = document.createElement('div');
    div.className = `checklist-item ${isChecked ? 'checked' : ''}`;
    div.innerHTML = `
      <input type="checkbox" id="chk-${index}" ${isChecked ? 'checked' : ''}>
      <span>${item}</span>
    `;

    // Click handler for checklist card
    div.addEventListener('click', (e) => {
      // Don't double trigger if clicking input directly
      if (e.target.tagName !== 'INPUT') {
        const checkbox = div.querySelector('input');
        checkbox.checked = !checkbox.checked;
        handleCheckboxChange(index, checkbox.checked, div);
      }
    });

    const checkbox = div.querySelector('input');
    checkbox.addEventListener('change', (e) => {
      handleCheckboxChange(index, e.target.checked, div);
    });

    container.appendChild(div);
  });

  updateProgress(checkedCount, items.length);
}

function handleCheckboxChange(index, isChecked, element) {
  if (isChecked) {
    element.classList.add('checked');
  } else {
    element.classList.remove('checked');
  }

  // Save to LocalStorage
  const savedState = JSON.parse(localStorage.getItem(`lifebridge_checklist_${currentCategory}`)) || {};
  savedState[index] = isChecked;
  localStorage.setItem(`lifebridge_checklist_${currentCategory}`, JSON.stringify(savedState));

  // Recalculate Progress
  const items = checklists[currentCategory];
  let checkedCount = 0;
  items.forEach((_, idx) => {
    if (savedState[idx]) checkedCount++;
  });

  updateProgress(checkedCount, items.length);
}

function updateProgress(checked, total) {
  const fill = document.getElementById('checklist-progress-fill');
  const text = document.getElementById('checklist-progress-text');
  
  if (!fill || !text) return;

  const pct = total > 0 ? Math.round((checked / total) * 100) : 0;
  fill.style.width = `${pct}%`;
  text.innerText = `${pct}% Completed (${checked}/${total})`;
}
