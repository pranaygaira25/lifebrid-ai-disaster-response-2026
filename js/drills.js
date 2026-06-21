// drills.js - Interactive Disaster Training Drills Game

import { showToast } from './app.js';

const drillData = {
  earthquake: [
    {
      scenario: "Ground Shaking: You are sitting in an office room when the ground suddenly shakes violently. Plaster begins cracking.",
      choices: [
        { text: "A. Run outside immediately to get away from walls.", correct: false, feedback: "Incorrect. Running during shaking is dangerous due to falling glass, facade tiles, and structural debris directly outside." },
        { text: "B. Drop, Cover, and Hold On under a sturdy desk or table.", correct: true, feedback: "Correct! Dropping low, covering your head/neck, and holding onto a table leg is the safest immediate action." },
        { text: "C. Stand directly under a doorway for structural support.", correct: false, feedback: "Incorrect. Modern door frames are not structurally stronger than walls and offer zero protection from flying objects." }
      ]
    },
    {
      scenario: "Post-Quake Evacuation: The primary shaking stops. You are on the 5th floor of a high-rise. Fire alarms are ringing.",
      choices: [
        { text: "A. Use the building elevators to reach the lobby quickly.", correct: false, feedback: "Incorrect. Power cuts, aftershocks, or cable damage can trap you inside elevator shafts indefinitely." },
        { text: "B. Take the emergency staircases, holding onto handrails.", correct: true, feedback: "Correct! Stairwells are reinforced, and walking down is the only safe evacuation route." },
        { text: "C. Wait in your office room for search and rescue teams.", correct: false, feedback: "Incorrect. With fire alarms ringing, structural hazards may be mounting; you must evacuate safely if able." }
      ]
    },
    {
      scenario: "Aftershock Awareness: While walking in the open courtyard outside, a strong aftershock begins. Brick walls are nearby.",
      choices: [
        { text: "A. Run close to the building walls for cover.", correct: false, feedback: "Incorrect. Building perimeters are the most dangerous zones due to shattering windows and falling brick facade." },
        { text: "B. Move to the center of the open courtyard, drop low, and shield your head.", correct: true, feedback: "Correct! Staying in wide open spaces protects you from falling structures." },
        { text: "C. Climb inside a parked car for safety.", correct: false, feedback: "Incorrect. Cars can be crushed by falling bricks, trees, or powerlines; stay clear in open fields." }
      ]
    }
  ],
  flood: [
    {
      scenario: "Flash Flood Warning: Heavy rainfall triggers a flash flood warning. Water starts filling your street and driveway.",
      choices: [
        { text: "A. Move to the basement to protect valuable belongings.", correct: false, feedback: "Incorrect. Basements fill rapidly during flash floods, trapping occupants. Avoid low ground." },
        { text: "B. Switch off main power (if dry), pack essentials, and move to top floors/roof.", correct: true, feedback: "Correct! Elevating yourself above the water level is critical during flash floods." },
        { text: "C. Drive your car to escape the neighborhood immediately.", correct: false, feedback: "Incorrect. Most flood deaths occur in vehicles. Less than 2 feet of water can sweep a car away." }
      ]
    },
    {
      scenario: "Stalled Vehicle: Your vehicle stalls in a flooded dip. Water level is rapidly rising above the tires.",
      choices: [
        { text: "A. Roll down the window, climb out, and get on top of the roof.", correct: true, feedback: "Correct! If the car is filling with water, escape to the roof of the car and call for rescue." },
        { text: "B. Lock doors, keep windows rolled up, and wait for emergency services.", correct: false, feedback: "Incorrect. Water pressure will lock doors, and rising water can fill the cabin rapidly." },
        { text: "C. Open the door and attempt to swim to dry land.", correct: false, feedback: "Incorrect. Moving floodwater has immense force. Swimming in deep currents is highly fatal." }
      ]
    }
  ]
};

let currentDrillType = null;
let currentQuestionIndex = 0;
let score = 0;

window.startDrill = function(type) {
  currentDrillType = type;
  currentQuestionIndex = 0;
  score = 0;

  document.getElementById('drill-welcome-screen').style.display = 'none';
  document.getElementById('drill-active-screen').style.display = 'block';
  document.getElementById('drill-score-screen').style.display = 'none';

  loadQuestion();
};

function loadQuestion() {
  const list = drillData[currentDrillType];
  const q = list[currentQuestionIndex];

  document.getElementById('drill-title').innerText = `${currentDrillType.toUpperCase()} Drill`;
  document.getElementById('drill-progress').innerText = `Question ${currentQuestionIndex + 1}/${list.length}`;
  document.getElementById('drill-scenario-text').innerText = q.scenario;

  const choicesContainer = document.getElementById('drill-choices-container');
  choicesContainer.innerHTML = '';

  const feedbackBox = document.getElementById('drill-feedback-box');
  feedbackBox.style.display = 'none';
  document.getElementById('drill-next-btn').style.display = 'none';

  q.choices.forEach((choice, idx) => {
    const btn = document.createElement('button');
    btn.className = 'drill-choice-btn';
    btn.innerText = choice.text;
    
    btn.addEventListener('click', () => {
      handleChoice(choice, btn);
    });

    choicesContainer.appendChild(btn);
  });
}

function handleChoice(choice, btn) {
  // Disable all choice buttons
  const buttons = document.querySelectorAll('.drill-choice-btn');
  buttons.forEach(b => b.disabled = true);

  const feedbackBox = document.getElementById('drill-feedback-box');
  feedbackBox.innerText = choice.feedback;
  
  if (choice.correct) {
    btn.style.borderColor = 'var(--color-green)';
    btn.style.background = 'rgba(16, 185, 129, 0.1)';
    feedbackBox.className = 'drill-feedback correct';
    score += 10;
  } else {
    btn.style.borderColor = 'var(--color-red)';
    btn.style.background = 'rgba(239, 68, 68, 0.1)';
    feedbackBox.className = 'drill-feedback incorrect';
  }

  // Show continue button
  document.getElementById('drill-next-btn').style.display = 'block';
}

document.addEventListener('DOMContentLoaded', () => {
  const nextBtn = document.getElementById('drill-next-btn');
  nextBtn.addEventListener('click', () => {
    currentQuestionIndex++;
    const list = drillData[currentDrillType];
    
    if (currentQuestionIndex < list.length) {
      loadQuestion();
    } else {
      showScore();
    }
  });
});

function showScore() {
  document.getElementById('drill-active-screen').style.display = 'none';
  document.getElementById('drill-score-screen').style.display = 'block';

  const list = drillData[currentDrillType];
  const maxScore = list.length * 10;
  const pct = (score / maxScore) * 100;

  let emoji = '⭐️';
  let title = 'Needs Improvement';
  let rating = 'Novice Responder';

  if (pct === 100) {
    emoji = '🏆';
    title = 'Perfect Survival instincts!';
    rating = 'Expert Safety Commander';
  } else if (pct >= 60) {
    emoji = '🎖️';
    title = 'Great Job!';
    rating = 'Capable Responder';
  }

  document.getElementById('drill-score-emoji').innerText = emoji;
  document.getElementById('drill-score-title').innerText = title;
  document.getElementById('drill-score-text').innerHTML = `
    You scored <strong>${score} / ${maxScore}</strong> (${pct}%).<br/>
    Badge Awarded: <strong style="color:var(--color-cyan);">${rating}</strong>
  `;

  showToast(`Completed the drill with score: ${score}!`, 'success');
}

window.resetDrillHub = function() {
  document.getElementById('drill-welcome-screen').style.display = 'block';
  document.getElementById('drill-active-screen').style.display = 'none';
  document.getElementById('drill-score-screen').style.display = 'none';
};
