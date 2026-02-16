const qs = (sel) => document.querySelector(sel);

const qtyEl = qs("#qty");
const dieEl = qs("#die");
const btnRoll = qs("#btnRoll");
const btnClear = qs("#btnClear");
const output = qs("#output");
const btnAD = qs("#btnAD");

const btnCombat = qs("#btnCombat");
const combatPanel = qs("#combatPanel");
const btnCombatClose = qs("#btnCombatClose");
const btnCombatReset = qs("#btnCombatReset");

const acEl = qs("#ac");
const maxHpEl = qs("#maxhp");
const hpEl = qs("#hp");
const counterEl = qs("#counter");
const statusEl = qs("#status");

const combatHud = qs("#combatHud");
const hudAc = qs("#hudAc");
const hudMaxHp = qs("#hudMaxHp");
const hudHp = qs("#hudHp");
const hudCounter = qs("#hudCounter");
const hudOpenCombat = qs("#hudOpenCombat");


// ADV/DIS states: normal -> adv -> dis -> normal
const AD_STATES = ["normal", "adv", "dis"];
let adState = "normal";

// Remember last roll config (not a "history", just last settings)
let lastRoll = { qty: 1, sides: 20, ad: "normal" };

// LocalStorage keys
const LS = {
  AC: "diceapp_ac",
  MAXHP: "diceapp_maxhp",
  HP: "diceapp_hp",
  COUNTER: "diceapp_counter",
};

function clampInt(n, min, max) {
  const x = Number.parseInt(n, 10);
  if (Number.isNaN(x)) return min;
  return Math.max(min, Math.min(max, x));
}

function randInt(min, max) {
  // inclusive
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shouldShowAD() {
  const qty = clampInt(qtyEl.value, 1, 100);
  const sides = clampInt(dieEl.value, 2, 100);
  return qty === 1 && sides === 20;
}

function updateADVisibility() {
  const show = shouldShowAD();
  btnAD.style.display = show ? "inline-block" : "none";

  if (!show) {
    adState = "normal";
    paintADButton();
  }
}

// Qty: al tocar, selecciona todo (móvil-friendly)
function selectAll(el) {
  // iOS/Android a veces necesitan un micro-delay
  setTimeout(() => {
    try {
      el.focus({ preventScroll: true });
      el.select();
      // fallback por si select() no funciona en algún dispositivo
      if (typeof el.setSelectionRange === "function") {
        el.setSelectionRange(0, el.value.length);
      }
    } catch {}
  }, 0);
}

function paintADButton() {
  btnAD.classList.remove("state-normal", "state-adv", "state-dis");
  if (adState === "normal") {
    btnAD.textContent = "A/D";
    btnAD.classList.add("state-normal");
  } else if (adState === "adv") {
    btnAD.textContent = "ADV";
    btnAD.classList.add("state-adv");
  } else {
    btnAD.textContent = "DIS";
    btnAD.classList.add("state-dis");
  }
}

function nextADState() {
  const i = AD_STATES.indexOf(adState);
  adState = AD_STATES[(i + 1) % AD_STATES.length];
  paintADButton();
}

function renderRollLine({ qty, sides, rolls, total }) {
  // Output: "3d6 : 2+3+6 = 11" (with min/max colored)
  const left = `${qty}d${sides} : `;
  const parts = rolls.map((v) => {
    const isMin = v === 1;
    const isMax = v === sides;
    const cls = isMin ? "num min" : isMax ? "num max" : "num";
    return `<span class="${cls}">${v}</span>`;
  });

  const join = parts.join(`<span class="sep">+</span>`);
  const right = ` = <span class="total">${total}</span>`;

  return `<div class="rollLine">${escapeHtml(left)}${join}${right}</div>`;
}

function renderADLine({ mode, a, b, chosen }) {
  const label = mode === "adv" ? "ADV" : "DIS";
  const labelCls = mode === "adv" ? "advTag" : "disTag";

  const spanA = coloredNum(a, 20);
  const spanB = coloredNum(b, 20);
  const spanChosen = coloredNum(chosen, 20);

  return `<div class="rollLine">1d20 <span class="${labelCls}">${label}</span> = (${spanA}, ${spanB}) -> ${spanChosen}</div>`;
}


function coloredNum(v, sides) {
  const isMin = v === 1;
  const isMax = v === sides;
  const cls = isMin ? "num min" : isMax ? "num max" : "num";
  return `<span class="${cls}">${v}</span>`;
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function setOutput(html) {
  output.innerHTML = html;

  // Auto-scroll al final para ver el resultado más nuevo
  requestAnimationFrame(() => {
    output.scrollTop = output.scrollHeight;
  });
}


function clearOutput() {
  setOutput(`<div class="outputEmpty">Ready to roll!</div>`);
}

function rollDice() {
  const qty = clampInt(qtyEl.value, 1, 100);
  const sides = clampInt(dieEl.value, 2, 100);

  // ADV/DIS only when visible (1d20 and qty=1)
  const useAD = (qty === 1 && sides === 20 && adState !== "normal");

  if (useAD) {
    const a = randInt(1, 20);
    const b = randInt(1, 20);
    const chosen = (adState === "adv") ? Math.max(a, b) : Math.min(a, b);

    lastRoll = { qty, sides, ad: adState };
    setOutput(renderADLine({ mode: adState, a, b, chosen }));
    return;
  }

  const rolls = [];
  let total = 0;
  for (let i = 0; i < qty; i++) {
    const v = randInt(1, sides);
    rolls.push(v);
    total += v;
  }

  lastRoll = { qty, sides, ad: "normal" };
  setOutput(renderRollLine({ qty, sides, rolls, total }));
}

function repeatLastRoll() {
  // Repeats based on current UI settings (simpler & expected),
  // but keeps "tap to repeat" behavior.
  rollDice();
}

function resetDiceUI() {
  qtyEl.value = "1";
  dieEl.value = "20";
  adState = "normal";
  paintADButton();
  updateADVisibility();
  clearOutput();
}

function toggleCombatPanel(forceOpen = null) {
  const open = forceOpen == null ? combatPanel.classList.contains("hidden") : forceOpen;
  combatPanel.classList.toggle("hidden", !open);
}

function loadCombatState() {
  const ac = localStorage.getItem(LS.AC);
  const maxhp = localStorage.getItem(LS.MAXHP);
  const hp = localStorage.getItem(LS.HP);
  const counter = localStorage.getItem(LS.COUNTER);

  if (ac !== null) acEl.value = ac;
  if (maxhp !== null) maxHpEl.value = maxhp;
  if (hp !== null) hpEl.value = hp;
  if (counter !== null) counterEl.value = counter;
  refreshHud();
}


function saveCombatState() {
  localStorage.setItem(LS.AC, acEl.value ?? "");
  localStorage.setItem(LS.MAXHP, maxHpEl.value ?? "");
  localStorage.setItem(LS.HP, hpEl.value ?? "");
  localStorage.setItem(LS.COUNTER, counterEl.value ?? "");
  refreshHud();
}


function resetCombatState() {
  acEl.value = "";
  maxHpEl.value = "";
  hpEl.value = "";
  counterEl.value = "";
  saveCombatState();
}


function initEvents() {
  // UI updates
  qtyEl.addEventListener("input", () => {
    qtyEl.value = String(clampInt(qtyEl.value, 1, 100));
    updateADVisibility();
  });

  dieEl.addEventListener("change", () => {
    updateADVisibility();
  });

  btnAD.addEventListener("click", () => {
    nextADState();
  });

  // Roll on button
  btnRoll.addEventListener("click", rollDice);

  // Clear
  btnClear.addEventListener("click", resetDiceUI);

  // Tap output to repeat
  output.addEventListener("click", repeatLastRoll);

  // Combat panel
  btnCombat.addEventListener("click", () => toggleCombatPanel());
  // btnCombatClose.addEventListener("click", () => toggleCombatPanel(false));
  btnCombatReset.addEventListener("click", resetCombatState);

  // Save combat fields live
  const saveOnInput = () => saveCombatState();
  acEl.addEventListener("input", saveOnInput);
  maxHpEl.addEventListener("input", saveOnInput);
  hpEl.addEventListener("input", saveOnInput);
  counterEl.addEventListener("input", saveOnInput);

  // Keyboard: Enter to roll (nice in desktop)
  document.addEventListener("keydown", (e) => {
    if (e.key === "Enter") rollDice();
  });

qtyEl.addEventListener("focus", () => selectAll(qtyEl));
qtyEl.addEventListener("click", () => selectAll(qtyEl));

  // HUD: editar HP/Counter sin abrir panel
   // HUD: editar HP/Counter sin abrir panel (sync 2-way)
  if (hudHp && hudCounter) {
    hudHp.addEventListener("input", () => {
      // 1) HUD -> Combat input
      hpEl.value = hudHp.value;

      // 2) Guardar y refrescar (HUD se repinta, pero con el mismo valor)
      saveCombatState();
    });

    hudCounter.addEventListener("input", () => {
      counterEl.value = hudCounter.value;
      saveCombatState();
    });
  }


  // Al cerrar el panel, refresca HUD (solo UNA vez)
  btnCombatClose.addEventListener("click", () => {
    toggleCombatPanel(false);
    refreshHud();
  });
}

function refreshHud() {
  const ac = acEl.value || localStorage.getItem(LS.AC) || "";
  const maxhp = maxHpEl.value || localStorage.getItem(LS.MAXHP) || "";
  const hp = hpEl.value || localStorage.getItem(LS.HP) || "";
  const counter = counterEl.value || localStorage.getItem(LS.COUNTER) || "";

  // mostrar HUD solo si hay “algo” guardado
  const any = (ac || maxhp || hp || counter);
  combatHud.classList.toggle("hidden", !any);

  hudAc.textContent = ac || "—";
  hudMaxHp.textContent = maxhp || "—";

  // Si el usuario está escribiendo en HUD, no le pises el input en caliente
  if (document.activeElement !== hudHp) hudHp.value = hp;
  if (document.activeElement !== hudCounter) hudCounter.value = counter;

}


function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    statusEl.textContent = "Sin Service Worker.";
    return;
  }

  window.addEventListener("load", async () => {
    try {
      await navigator.serviceWorker.register("./service-worker.js");
      statusEl.textContent = "© Wildcrow";
    } catch (err) {
      statusEl.textContent = "SW fallo: " + (err?.message || "error");
    }
  });
}

function init() {
  // Defaults
  paintADButton();
  updateADVisibility();
  loadCombatState();
  initEvents();
  registerServiceWorker();
}

document.addEventListener("DOMContentLoaded", init);
