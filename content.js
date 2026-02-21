(() => {
  const MESSAGE_TYPE = 'LINGONERD_TRANSLATE';
  const APPS_SCRIPT_WEB_APP_URL = 'https://script.google.com/macros/s/REPLACE_WITH_DEPLOYMENT_ID/exec';

  console.log('🤓 LingoNerd content script injected');

  chrome.runtime.onMessage.addListener((message) => {
    if (!message || message.type !== MESSAGE_TYPE) {
      return;
    }

    const targetLang = normalizeLang(message.targetLang);
    const instruction = typeof message.instruction === 'string' ? message.instruction.trim() : '';
    const scope = normalizeScope(message.scope);

    void handleTranslateRequest({ targetLang, instruction, scope });
  });

  async function handleTranslateRequest({ targetLang, instruction, scope }) {
    const extractedSlides = extractVisibleSlideText();
    const slides = scope === 'current' ? extractedSlides.slice(0, 1) : extractedSlides;

    if (!slides.length) {
      console.log('[LingoNerd] No visible non-empty slide text found.');
      return;
    }

    for (const slide of slides) {
      try {
        const translatedText = await fetchTranslation({
          text: slide.text,
          targetLang,
          instruction
        });

        console.log(`[LingoNerd] Slide ${slide.index} (${targetLang}) translation:`, translatedText);
        await writeSpeakerNotes(slide.index, translatedText);
      } catch (error) {
        console.warn(`[LingoNerd] Translation failed for slide ${slide.index}:`, error);
      }
    }
  }

  function extractVisibleSlideText() {
    const textNodes = getVisibleCanvasTextNodes();
    const grouped = new Map();

    for (const node of textNodes) {
      const text = readTextNodeValue(node);
      if (!text) {
        continue;
      }

      const key = getSlideGroupKey(node);
      const current = grouped.get(key) || [];
      current.push(text);
      grouped.set(key, current);
    }

    const results = Array.from(grouped.values())
      .map((parts, idx) => ({
        index: idx + 1,
        text: dedupeAndJoin(parts)
      }))
      .filter((entry) => entry.text.length > 0);

    console.log('[LingoNerd] Extracted visible slide text:', results);
    return results;
  }

  function getVisibleCanvasTextNodes() {
    const nodes = Array.from(document.querySelectorAll('svg text, svg tspan'));
    return nodes.filter((node) => {
      const element = node instanceof SVGElement ? node : null;
      if (!element) {
        return false;
      }

      const svg = element.closest('svg');
      if (!svg || !isElementVisible(svg)) {
        return false;
      }

      const svgRect = svg.getBoundingClientRect();
      const isLikelySlideCanvas = svgRect.width > 300 && svgRect.height > 180;
      if (!isLikelySlideCanvas) {
        return false;
      }

      const rect = element.getBoundingClientRect();
      if (!rect.width && !rect.height) {
        return false;
      }

      const inViewport =
        rect.bottom >= 0 &&
        rect.right >= 0 &&
        rect.top <= window.innerHeight &&
        rect.left <= window.innerWidth;

      return inViewport;
    });
  }

  function readTextNodeValue(node) {
    const text = (node.textContent || '').replace(/\s+/g, ' ').trim();
    return text;
  }

  function getSlideGroupKey(node) {
    const pageGroup = node.closest('g[id^="page"], g[id*="page"]');
    if (pageGroup && pageGroup.id) {
      return pageGroup.id;
    }

    const svg = node.closest('svg');
    if (svg) {
      const rect = svg.getBoundingClientRect();
      return `svg-${Math.round(rect.left)}-${Math.round(rect.top)}-${Math.round(rect.width)}-${Math.round(rect.height)}`;
    }

    return 'default';
  }

  function dedupeAndJoin(parts) {
    const seen = new Set();
    const clean = [];

    for (const part of parts) {
      if (!part || seen.has(part)) {
        continue;
      }
      seen.add(part);
      clean.push(part);
    }

    return clean.join(' ').trim();
  }

  function isElementVisible(element) {
    const style = window.getComputedStyle(element);
    return (
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      style.opacity !== '0' &&
      element.getClientRects().length > 0
    );
  }

  function normalizeLang(lang) {
    const supported = new Set(['pt', 'es', 'fr', 'ja', 'de']);
    return supported.has(lang) ? lang : 'es';
  }

  function normalizeScope(scope) {
    return scope === 'current' ? 'current' : 'all';
  }

  async function fetchTranslation({ text, targetLang, instruction }) {
    if (APPS_SCRIPT_WEB_APP_URL.includes('REPLACE_WITH_DEPLOYMENT_ID')) {
      throw new Error('Apps Script URL is not configured.');
    }

    let response;
    try {
      response = await fetch(APPS_SCRIPT_WEB_APP_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text, targetLang, instruction })
      });
    } catch (error) {
      throw new Error(`Network error while contacting Apps Script: ${String(error)}`);
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return String(data.translatedText || '');
  }

  async function writeSpeakerNotes(slideIndex, translatedText) {
    const notesEditors = await getOrOpenSpeakerNotesEditors();
    const editor = notesEditors[slideIndex - 1];

    if (!editor) {
      console.warn(`[LingoNerd] No speaker notes editor found for slide ${slideIndex}.`);
      return;
    }

    editor.focus();
    document.execCommand('selectAll', false);
    document.execCommand('insertText', false, translatedText);
  }

  async function getOrOpenSpeakerNotesEditors() {
    let editors = querySpeakerNotesEditors();
    if (editors.length) {
      return editors;
    }

    const notesToggle =
      document.querySelector('[aria-label*="Speaker notes" i]') ||
      document.querySelector('[data-tooltip*="Speaker notes" i]') ||
      document.querySelector('[aria-label*="Show speaker notes" i]');

    if (notesToggle instanceof HTMLElement) {
      notesToggle.click();
      await new Promise((resolve) => setTimeout(resolve, 500));
      editors = querySpeakerNotesEditors();
    }

    return editors;
  }

  function querySpeakerNotesEditors() {
    return Array.from(
      document.querySelectorAll(
        '[aria-label*="speaker notes" i][contenteditable="true"], [data-placeholder*="speaker notes" i][contenteditable="true"]'
      )
    );
  }
})();
