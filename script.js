// ============================================
//  OFFLINE DICE
// ============================================

// --- OPTIONAL AUDIO (won't break if files are missing) ---
let startSound = null;
let endSound = null;
try {
  startSound = new Audio('dicesoundeffectroll.mp3');
  startSound.preload = 'auto';
  endSound = new Audio('rollend.mp3');
  endSound.preload = 'auto';
} catch (e) {
  console.log('Audio not available');
}

function safePlay(sound, startAt) {
  if (!sound) return;
  try {
    sound.currentTime = startAt || 0;
    const p = sound.play();
    if (p) p.catch(() => {});
  } catch (e) {}
}

// --- DICE COLORS ---
const diceColors = [
  { name: 'Red',    hex: '#FF0000' },
  { name: 'Orange', hex: '#FFA500' },
  { name: 'Yellow', hex: '#FFFF00' },
  { name: 'Green',  hex: '#008000' },
  { name: 'Blue',   hex: '#0000FF' },
  { name: 'Purple', hex: '#800080' }
];

// ============================================
//  RIG SYSTEM
//  Single tap R/O/Y/G/B/P  = block that color
//  Double tap (fast)       = force that color to appear
// ============================================
const hiddenColorNames = new Set();
const forcedColorNames = new Set();
const lastKeyTime = {};
const DOUBLE_TAP_MS = 350;

function buildRigDots() {
  const wrap = document.getElementById('rigDots');
  if (!wrap) return;
  wrap.innerHTML = '';
  diceColors.forEach(c => {
    const col = document.createElement('div');
    col.className = 'rig-col';

    const dot = document.createElement('div');
    dot.className = 'rig-dot';
    dot.dataset.name = c.name;
    dot.style.backgroundColor = c.hex;

    const force = document.createElement('div');
    force.className = 'rig-force-dot';
    force.dataset.force = c.name;
    force.style.backgroundColor = c.hex;

    col.appendChild(dot);
    col.appendChild(force);
    wrap.appendChild(col);
  });
}

function updateRigDots() {
  document.querySelectorAll('#rigDots .rig-dot').forEach(dot => {
    if (hiddenColorNames.has(dot.dataset.name)) {
      dot.classList.add('blocked');
    } else {
      dot.classList.remove('blocked');
    }
  });
  document.querySelectorAll('#rigDots .rig-force-dot').forEach(dot => {
    if (forcedColorNames.has(dot.dataset.force)) {
      dot.classList.add('forced');
    } else {
      dot.classList.remove('forced');
    }
  });
}

document.addEventListener('keydown', (e) => {
  if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
  if (e.repeat) return;

  const key = e.key.toUpperCase();
  const matched = diceColors.find(c => c.name.charAt(0).toUpperCase() === key);
  if (!matched) return;

  const now = Date.now();
  const isDouble = lastKeyTime[key] && (now - lastKeyTime[key]) < DOUBLE_TAP_MS;
  lastKeyTime[key] = now;

  if (isDouble) {
    // Double tap = force this color to appear
    lastKeyTime[key] = 0;
    hiddenColorNames.delete(matched.name);
    if (forcedColorNames.has(matched.name)) {
      forcedColorNames.delete(matched.name);
    } else {
      forcedColorNames.add(matched.name);
    }
  } else {
    // Single tap = block / unblock
    if (hiddenColorNames.has(matched.name)) {
      hiddenColorNames.delete(matched.name);
    } else {
      hiddenColorNames.add(matched.name);
      forcedColorNames.delete(matched.name);
    }
  }

  updateRigDots();
});

// --- STATE ---
let rollHistory = [];
let rollsToday = 0;
let currentCounter = 0;
let isRolling = false;
let gameSessionID = '';

// --- HELPERS ---
function getSecureRandomIndex(max) {
  const a = new Uint32Array(1);
  window.crypto.getRandomValues(a);
  return a[0] % max;
}

function generateGameID() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 10; i++) {
    const a = new Uint32Array(1);
    window.crypto.getRandomValues(a);
    result += chars[a[0] % chars.length];
  }
  return result;
}

// --- BACKGROUND SWITCHING ---
function changeBackground() {
  const imageName = document.getElementById('bgSelect').value;

  const themes = {
    'sabblack.jpg':              { accent:'#9e9e9e', dark:'#212121', border:'#bdbdbd', panelBg:'rgba(15,15,15,0.85)' },
    'sabblue.jpg':               { accent:'#2196F3', dark:'#0D47A1', border:'#90CAF9', panelBg:'rgba(13,71,161,0.85)' },
    'sabgreen.jpg':              { accent:'#4CAF50', dark:'#2E7D32', border:'#81C784', panelBg:'rgba(27,71,30,0.85)' },
    'sabyellow.jpg':             { accent:'#FFEB3B', dark:'#FBC02D', border:'#FFF59D', panelBg:'rgba(90,74,10,0.85)' },
    'sabred.jpg':                { accent:'#F44336', dark:'#B71C1C', border:'#E57373', panelBg:'rgba(90,14,14,0.85)' },
    'sabpurple.jpg':             { accent:'#9C27B0', dark:'#4B0082', border:'#CE93D8', panelBg:'rgba(45,12,70,0.85)' },
    'saborange.jpg':             { accent:'#FF9800', dark:'#E65100', border:'#FFB74D', panelBg:'rgba(90,32,0,0.85)' },
    'darkfantasy.jpg':           { accent:'#C0C0C0', dark:'#2A2A30', border:'#A0A0A5', panelBg:'rgba(25,25,30,0.85)' },
    'dessertbackground.jpg':     { accent:'#E09F3E', dark:'#936639', border:'#F4D35E', panelBg:'rgba(70,42,18,0.85)' },
    'blossom.jpg':               { accent:'#ff85a2', dark:'#c94f70', border:'#ffb3c6', panelBg:'rgba(90,35,50,0.85)' },
    'underwater.jpg':            { accent:'#00BFFF', dark:'#002244', border:'#4682B4', panelBg:'rgba(10,40,80,0.85)' },
    'fuellingbackground.jpg':    { accent:'#D3D3D3', dark:'#1A1A1A', border:'#A9A9A9', panelBg:'rgba(15,15,15,0.85)' },
    'arielchbackgroundd.jpg':    { accent:'#7986CB', dark:'#283593', border:'#9FA8DA', panelBg:'rgba(20,20,35,0.85)' },
    'liamtradesbackground.jpg':  { accent:'#b71c1c', dark:'#0D47A1', border:'#2a9df4', panelBg:'rgba(40,10,15,0.85)' },
    'frozybackground.jpg':       { accent:'#00FF66', dark:'#004D40', border:'#69F0AE', panelBg:'rgba(10,35,25,0.85)' },
    'itamarbackground.jpg':      { accent:'#FFB300', dark:'#E65100', border:'#FFE082', panelBg:'rgba(40,25,10,0.85)' }
  };

  const t = themes[imageName];
  if (t) {
    document.documentElement.style.setProperty('--theme-accent', t.accent);
    document.documentElement.style.setProperty('--theme-accent-dark', t.dark);
    document.documentElement.style.setProperty('--theme-panel-border', t.border);
    document.documentElement.style.setProperty('--theme-panel-bg', t.panelBg);
  }

  document.body.style.backgroundImage = "url('" + imageName + "')";

  const overlay = document.getElementById('rollOverlay');
  if (overlay) {
    overlay.style.backgroundImage = "url('" + imageName + "')";
  }
}

// --- COUNTER ---
function adjustCounter(amount) {
  currentCounter = parseFloat((currentCounter + amount).toFixed(2));
  const el = document.getElementById('mainCounter');
  el.innerText = currentCounter >= 0 ? '+' + currentCounter : '' + currentCounter;
}

// --- ROLL RESULT ---
function finishRollUpdate(colors) {
  const container = document.getElementById('diceContainer');
  container.innerHTML = '';

  const frag = document.createDocumentFragment();
  colors.forEach(color => {
    const die = document.createElement('div');
    die.className = 'die';
    die.style.backgroundColor = color.hex;
    const dot = document.createElement('div');
    dot.className = 'die-dot';
    die.appendChild(dot);
    frag.appendChild(die);
  });
  container.appendChild(frag);

  rollsToday++;
  document.getElementById('rollsTodayCount').innerText = rollsToday;

  rollHistory.unshift(colors);
  if (rollHistory.length > 25) rollHistory.pop();

  updateHistoryView();

  safePlay(endSound, 0.80);
  setTimeout(() => {
    if (endSound) { try { endSound.pause(); } catch (e) {} }
  }, 1500);
}

// --- MAIN ROLL ---
function rollDice() {
  if (isRolling) return;

  // Only roll colors that aren't blocked
  const available = diceColors.filter(c => !hiddenColorNames.has(c.name));
  if (available.length === 0) {
    alert('All colors are disabled! Press the color shortcut keys again to enable at least one color.');
    return;
  }

  isRolling = true;
  const rollBtn = document.getElementById('rollBtn');
  rollBtn.disabled = true;

  const diceCount = parseInt(document.getElementById('diceCount').value);

  const currentRollColors = [];
  for (let i = 0; i < diceCount; i++) {
    currentRollColors.push(available[getSecureRandomIndex(available.length)]);
  }

  // Guarantee any forced colors appear, in random slots
  const forced = diceColors.filter(c => forcedColorNames.has(c.name));
  if (forced.length > 0) {
    const slots = [];
    for (let i = 0; i < diceCount; i++) slots.push(i);
    for (let i = slots.length - 1; i > 0; i--) {
      const j = getSecureRandomIndex(i + 1);
      const tmp = slots[i];
      slots[i] = slots[j];
      slots[j] = tmp;
    }
    forced.slice(0, diceCount).forEach((c, idx) => {
      currentRollColors[slots[idx]] = c;
    });
  }

  let revealed = false;

  const overlay = document.getElementById('rollOverlay');
  const overlayTitle = document.getElementById('overlayTitle');
  const overlayContainer = document.getElementById('overlayDiceContainer');

  const loadingSentences = [
    "You're Cooked...",
    "Good Luck :)",
    "Bituah Leumi",
    "Amazing!",
    "Let's See...",
    "Offline Dice On TOP!",
    "Rolling..."
  ];
  overlayTitle.innerText = loadingSentences[getSecureRandomIndex(loadingSentences.length)];

  overlayContainer.innerHTML = '';
  const animFrag = document.createDocumentFragment();
  for (let i = 0; i < diceCount; i++) {
    const die = document.createElement('div');
    die.className = 'big-die';
    const dot = document.createElement('div');
    dot.className = 'big-die-dot';
    die.appendChild(dot);
    animFrag.appendChild(die);
  }
  overlayContainer.appendChild(animFrag);

  // Short delay to avoid lag, then show overlay
  setTimeout(() => {
    overlayContainer.querySelectorAll('.big-die').forEach(d => d.classList.add('initial-shake'));
    overlay.classList.remove('hidden');

    safePlay(startSound, 0);

    setTimeout(() => {
      if (revealed) return;
      revealed = true;

      overlay.classList.add('hidden');
      finishRollUpdate(currentRollColors);

      rollBtn.disabled = false;
      isRolling = false;
    }, 1200);

  }, 700);
}

// --- HISTORY ---
function updateHistoryView() {
  const list = document.getElementById('inlineHistoryList');
  list.innerHTML = '';

  if (rollHistory.length === 0) {
    list.innerHTML = '<div class="empty-history">Roll the dice to see your history!</div>';
    return;
  }

  const frag = document.createDocumentFragment();

  rollHistory.forEach((roll, index) => {
    const row = document.createElement('div');
    row.className = 'history-row';

    const num = document.createElement('div');
    num.className = 'history-number';
    num.innerText = (index + 1) + '.';

    const group = document.createElement('div');
    group.className = 'history-dice-group';

    roll.forEach(color => {
      const die = document.createElement('div');
      die.className = 'mini-die';
      die.style.backgroundColor = color.hex;
      group.appendChild(die);
    });

    row.appendChild(num);
    row.appendChild(group);
    frag.appendChild(row);
  });

  list.appendChild(frag);
}

// --- INIT ---
window.onload = () => {
  changeBackground();
  gameSessionID = generateGameID();
  document.getElementById('gameIdDisplay').innerText = gameSessionID;
  buildRigDots();
  updateRigDots();
  updateHistoryView();
};
