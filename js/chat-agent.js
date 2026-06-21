// chat-agent.js - AI Assistant with NLP rules and Text-to-Speech (TTS)

import { state, triggerTabNavigation, showToast } from './app.js';

document.addEventListener('DOMContentLoaded', () => {
  const chatForm = document.getElementById('chat-form');
  const chatInput = document.getElementById('chat-input');
  const chatMessages = document.getElementById('chat-messages');
  const suggestChips = document.querySelectorAll('.suggest-chip');

  // Submit query handler
  chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const query = chatInput.value.trim();
    if (!query) return;

    appendMessage(query, 'user');
    chatInput.value = '';

    // Thinking delay
    setTimeout(() => {
      const response = processQuery(query);
      appendMessage(response, 'assistant');
    }, 600);
  });

  // Suggestion chips handler
  suggestChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const query = chip.getAttribute('data-query');
      appendMessage(query, 'user');
      setTimeout(() => {
        const response = processQuery(query);
        appendMessage(response, 'assistant');
      }, 500);
    });
  });
});

// Process Natural Language query
function processQuery(query) {
  const q = query.toLowerCase();
  
  // 1. Shelter Queries
  if (q.includes('shelter') || q.includes('stay') || q.includes('evacuate') || q.includes('home')) {
    const openShelters = state.shelters.filter(s => s.status !== 'Closed');
    if (openShelters.length === 0) {
      return "⚠️ Warning: All local shelters are currently occupied or closed. Try moving to higher ground or neighboring counties. Monitoring coordinates...";
    }
    
    let reply = `Found **${openShelters.length} open shelters**. The closest is **${openShelters[0].name}** located at Lat: ${openShelters[0].lat}, Lng: ${openShelters[0].lng}. It is currently operating at ${openShelters[0].occupied}/${openShelters[0].capacity} capacity.<br/><br/>`;
    reply += `🎒 Resources available there: Food, Clean Water, and Medical Personnel. <a href="#" onclick="window.focusMapOn(${openShelters[0].lat}, ${openShelters[0].lng}); return false;" style="color:var(--color-cyan); font-weight:bold; text-decoration:underline;">Click here to show on Map.</a>`;
    return reply;
  }

  // 2. Road Safety Queries
  if (q.includes('road') || q.includes('street') || q.includes('safe') || q.includes('mg road') || q.includes('trinity') || q.includes('richmond') || q.includes('route') || q.includes('block')) {
    const hazardList = state.hazards;
    if (hazardList.length === 0) {
      return "All monitored street intersections are currently reported as safe. However, please travel with extreme caution as flood waters can rise rapidly.";
    }

    let reply = `There are currently **${hazardList.length} active road blockages**:<br/>`;
    hazardList.forEach(haz => {
      reply += `- 🚨 **${haz.type}**: Lat: ${haz.lat}, Lng: ${haz.lng} (${haz.desc}) - *Severity: ${haz.severity}*<br/>`;
    });
    reply += `<br/>To find a safe path bypassing these coordinates, use our <a href="#" onclick="window.openRoutePlanner(); return false;" style="color:var(--color-cyan); font-weight:bold; text-decoration:underline;">Safe Route Planner</a>.`;
    return reply;
  }

  // 3. Medical First Aid Queries
  if (q.includes('medical') || q.includes('hospital') || q.includes('bleed') || q.includes('doctor') || q.includes('burn') || q.includes('cpr') || q.includes('hurt')) {
    if (q.includes('bleed')) {
      return `🤕 **First Aid Guide: Heavy Bleeding**<br/>
      1. Apply firm, direct pressure on the wound with a clean cloth/bandage.<br/>
      2. Keep pressure applied consistently. Do not check if bleeding has stopped.<br/>
      3. Elevate the wounded limb above the level of the heart if possible.<br/>
      4. Seek professional medical help. The nearest operational center is **St. Martha Hospital** (ICU Beds available: ${state.hospitals[2].beds}).`;
    }
    
    if (q.includes('burn')) {
      return `🔥 **First Aid Guide: Thermal Burns**<br/>
      1. Cool the burn immediately with cool, running water for 10-20 minutes. Do NOT use ice.<br/>
      2. Remove jewelry or tight clothing before swelling starts.<br/>
      3. Cover the burn loosely with sterile, non-stick gauze.<br/>
      4. Do NOT pop blisters. Seek medical attention immediately.`;
    }

    const availableHosp = state.hospitals.find(h => h.status === 'Operational');
    return `🩺 **Emergency Medical Centers** are operational. The nearest hospital is **${availableHosp.name}** with **${availableHosp.beds} vacant ICU beds** and ${availableHosp.oxygen} oxygen reserves. <a href="#" onclick="window.focusMapOn(${availableHosp.lat}, ${availableHosp.lng}); return false;" style="color:var(--color-green); font-weight:bold; text-decoration:underline;">Show Hospital Map Location.</a>`;
  }

  // 4. Emergency supply queries
  if (q.includes('supply') || q.includes('pack') || q.includes('kit') || q.includes('water') || q.includes('food') || q.includes('supplies')) {
    return `🎒 **Disaster Kit Essentials**:<br/>
    - Drinking water (1 gallon per person per day)<br/>
    - Non-perishable food (3-day supply)<br/>
    - First Aid kit & prescriptions<br/>
    - Flashlight & spare batteries<br/>
    - Emergency whistle & charging cables<br/><br/>
    I can load our full interactive inventory checks. <a href="#" onclick="window.openChecklistTab(); return false;" style="color:var(--color-cyan); font-weight:bold; text-decoration:underline;">Open Supplies Checklist Tab.</a>`;
  }

  // 5. Default Response
  return "I understand you are asking about emergency coordinates or procedures. You can ask about:<br/>" +
         "- 🏠 **Open Shelters** ('Where is the shelter?')<br/>" +
         "- 🚨 **Road blocks & hazards** ('Is Elm St safe?')<br/>" +
         "- 🩸 **First Aid procedures** ('How to treat bleeding')<br/>" +
         "- 🎒 **Emergency kits** ('What supplies do I need?')";
}

// Append message to UI
function appendMessage(text, sender) {
  const chatMessages = document.getElementById('chat-messages');
  const bubble = document.createElement('div');
  bubble.className = `message-bubble ${sender}`;
  bubble.innerHTML = text;

  // Append TTS Speaker Button to Assistant Messages
  if (sender === 'assistant') {
    const ttsBtn = document.createElement('button');
    ttsBtn.className = 'tts-btn';
    ttsBtn.innerHTML = '🔊 Listen';
    ttsBtn.addEventListener('click', () => {
      // Strip html tags from text for synthesis
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = text;
      const plainText = tempDiv.textContent || tempDiv.innerText || "";
      speakText(plainText);
    });
    bubble.appendChild(ttsBtn);
  }

  chatMessages.appendChild(bubble);
  chatMessages.scrollTop = chatMessages.scrollHeight;

  // Re-run Lucide Icons for dynamic buttons
  if (window.lucide) window.lucide.createIcons();
}

// Text-to-Speech synthesizer wrapper
function speakText(text) {
  if ('speechSynthesis' in window) {
    // Cancel ongoing speech
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    
    window.speechSynthesis.speak(utterance);
    showToast('Voice playback started.', 'success');
  } else {
    showToast('Text-to-Speech not supported on this browser.', 'error');
  }
}

// Global functions for inline links in Chat
window.focusMapOn = function(lat, lng) {
  triggerTabNavigation('map-view');
  if (window.lifebridgeMap) {
    window.lifebridgeMap.setView([lat, lng], 16);
  }
};

window.openRoutePlanner = function() {
  triggerTabNavigation('map-view');
  showToast('Route Planner active. Please select start and end points.', 'info');
};

window.openChecklistTab = function() {
  triggerTabNavigation('checklists');
};
