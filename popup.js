const MESSAGE_TYPE = 'LINGONERD_TRANSLATE';
const STORAGE_KEY = 'lingonerd.preferences';

const targetLangEl = document.getElementById('targetLang');
const scopeSelectEl = document.getElementById('scopeSelect');
const advancedToggleEl = document.getElementById('advancedToggle');
const advancedPanelEl = document.getElementById('advancedPanel');
const instructionTextEl = document.getElementById('instructionText');
const instructionCountEl = document.getElementById('instructionCount');
const statusTextEl = document.getElementById('statusText');
const translateBtnEl = document.getElementById('translateBtn');

init().catch((error) => {
  console.warn('[LingoNerd] Popup initialization failed:', error);
  setStatus('Initialization failed. Please reopen popup.');
});

async function init() {
  const stored = await chrome.storage.sync.get(STORAGE_KEY);
  const prefs = stored[STORAGE_KEY] || {};

  if (typeof prefs.targetLang === 'string') {
    targetLangEl.value = prefs.targetLang;
  }

  if (prefs.scope === 'all' || prefs.scope === 'current') {
    scopeSelectEl.value = prefs.scope;
  }

  if (typeof prefs.instruction === 'string') {
    instructionTextEl.value = prefs.instruction;
  }

  const advancedEnabled = false;
  advancedToggleEl.checked = advancedEnabled;
  setAdvancedPanelVisible(advancedEnabled);
  updateInstructionCount();

  advancedToggleEl.addEventListener('change', () => {
    setAdvancedPanelVisible(advancedToggleEl.checked);
    void persistPreferences();
  });

  targetLangEl.addEventListener('change', () => {
    void persistPreferences();
  });

  scopeSelectEl.addEventListener('change', () => {
    void persistPreferences();
  });

  instructionTextEl.addEventListener('input', () => {
    updateInstructionCount();
    void persistPreferences();
  });

  translateBtnEl.addEventListener('click', () => {
    void triggerTranslation();
  });

}

function updateInstructionCount() {
  instructionCountEl.textContent = `${instructionTextEl.value.trim().length} chars`;
}

function setAdvancedPanelVisible(visible) {
  advancedPanelEl.classList.toggle('visible', visible);
  advancedPanelEl.setAttribute('aria-hidden', String(!visible));
}

async function persistPreferences() {
  await chrome.storage.sync.set({
    [STORAGE_KEY]: {
      targetLang: targetLangEl.value,
      scope: scopeSelectEl.value,
      advancedEnabled: advancedToggleEl.checked,
      instruction: instructionTextEl.value.trim()
    }
  });
}

async function triggerTranslation() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab?.id) {
    setStatus('No active tab found.');
    return;
  }

  const instruction = advancedToggleEl.checked ? instructionTextEl.value.trim() : '';
  const payload = {
    type: MESSAGE_TYPE,
    targetLang: targetLangEl.value,
    scope: scopeSelectEl.value,
    instruction
  };

  await persistPreferences();
  setStatus('Sending translation request...');

  chrome.tabs.sendMessage(tab.id, payload, () => {
    if (chrome.runtime.lastError) {
      setStatus('Open a Google Slides presentation and try again.');
      console.warn('[LingoNerd] Unable to reach content script:', chrome.runtime.lastError.message);
      return;
    }

    const lang = targetLangEl.options[targetLangEl.selectedIndex].text;
    const scope = scopeSelectEl.value === 'current' ? 'current slide' : 'all visible slides';
    setStatus(`Started translation to ${lang} for ${scope}.`);
  });
}

function setStatus(message) {
  statusTextEl.textContent = message;
}
