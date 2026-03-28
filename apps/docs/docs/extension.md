# Browser Extension

The Chromium extension uses an explicit one-time code exchange instead of ambient first-party cookies.

## Flow

1. Open `Settings -> Extension Connect` in the web app.
2. Copy the one-time code.
3. Paste the code into the popup with the API base URL and device name.
4. Exchange it for a revocable Sanctum token.
5. Capture the active tab and submit the screenshot through the authenticated upload-session flow.

## Recovery model

- Hotkeys and popup-triggered captures both store pending screenshots in `chrome.storage.local`.
- The popup reloads the pending capture on open, so a browser refresh does not lose the screenshot before submission.

## Commands

- `Ctrl+Shift+Y`: capture the current tab
