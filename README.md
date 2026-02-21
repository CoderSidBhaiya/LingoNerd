# LingoNerd Chrome Extension (MV3)

LingoNerd is a Chrome Extension that helps translate Google Slides content and write results into **Speaker Notes only**.

## What this project does

- Adds a popup UI with a **Translate** action.
- Extracts visible text from Google Slides (`https://docs.google.com/presentation/*`) in a read-only way.
- Sends text to a Google Apps Script web app endpoint that uses `LanguageApp.translate`.
- Writes translated output back into **Speaker Notes** (not slide body content).

## Features

- Manifest V3 extension setup.
- Target language selector:
  - Portuguese (`pt`)
  - Spanish (`es`)
  - French (`fr`)
  - Japanese (`ja`)
  - German (`de`)
- Translation scope:
  - All visible slides
  - Current active slide only
- Optional additional context input (toggle-enabled).
- Popup preference persistence via `chrome.storage.sync`.
- Graceful error logs for messaging/network failures.

## Project structure

```text
.
├── manifest.json          # Chrome Extension manifest (MV3)
├── popup.html             # Popup UI
├── popup.js               # Popup behavior and message dispatch
├── content.js             # Google Slides extraction + translation + notes write
└── apps-script/
    └── Code.gs            # Apps Script doPost(e) translation endpoint
```

## Requirements

- Google Chrome (or Chromium-based browser with extension loading support).
- A deployed Google Apps Script Web App URL.
- Access to Google Slides documents.

## Setup

### 1) Configure Apps Script backend

1. Open Google Apps Script and create a new project.
2. Paste contents of `apps-script/Code.gs`.
3. Deploy as **Web app**:
   - Execute as: `Me`
   - Who has access: `Anyone` (or the minimal access mode that works for your use case)
4. Copy the deployment URL.

### 2) Configure extension endpoint

1. Open `content.js`.
2. Replace:

```js
const APPS_SCRIPT_WEB_APP_URL = 'https://script.google.com/macros/s/REPLACE_WITH_DEPLOYMENT_ID/exec';
```

with your deployed Apps Script URL.

### 3) Load extension in Chrome

1. Go to `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked** and select this project folder.

## How to use

1. Open a Google Slides presentation.
2. Click the LingoNerd extension icon.
3. Choose target language and scope.
4. (Optional) Enable **Additional context** and provide custom instructions.
5. Click **Translate**.

The content script will:
- extract visible slide text,
- request translation from Apps Script,
- write translated text into speaker notes.

## Notes on behavior

- LingoNerd is designed to update **Speaker Notes only**.
- It does not intentionally edit slide body text.
- If speaker notes panel is closed, it attempts to open it before writing.
- Toggle defaults to OFF in popup initialization.

## Compliance / constraints

This implementation is intentionally constrained to:

- No deprecated APIs like `window.status`.
- No external translation APIs.
- No LLM usage.
- No paid services.
- No background analytics.
- Speaker Notes-only writing behavior.

## Troubleshooting

- **"Apps Script URL is not configured."**
  - Set your deployed web app URL in `content.js`.

- **No message response from content script**
  - Ensure active tab is a Google Slides URL matching:
    `https://docs.google.com/presentation/*`

- **No notes editor found**
  - Verify you are in edit mode and the deck supports speaker notes.
  - UI selectors in Google Slides can change over time; update selectors in `content.js` if needed.

## Development checks

Example local checks used in this repo:

```bash
python -m json.tool manifest.json
node --check popup.js
node --check content.js
```

## Security and privacy

- Translation requests are sent only to your configured Apps Script endpoint.
- No storage/database layer is used by backend code.
- No API keys are required for `LanguageApp.translate` in this setup.

---

If you want, next step can be adding a small in-popup "Connection test" button to verify Apps Script availability before translating.
