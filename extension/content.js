let shadowRoot = null;
let playerBar = null;
let highlightDiv = null;
let capturedSelection = "";

// Capture selection before click steals focus
document.addEventListener("mouseup", () => {
  const sel = window.getSelection()?.toString().trim();
  if (sel) capturedSelection = sel;
});

// ── Message listener ──────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getScroll") {
    sendResponse({ x: window.scrollX, y: window.scrollY });

  } else if (request.action === "initPlayer") {
    setupShadowDOM();
    createPlayerBar();
    sendResponse({ status: "ok" });

  } else if (request.action === "syncUI") {
    if (!shadowRoot) return true;
    const preview = shadowRoot.getElementById("hr-text-preview");
    if (preview && request.content) preview.innerText = request.content;
    request.coords && request.offset
      ? highlightBlock(request.coords, request.offset)
      : hideHighlight();

  } else if (request.action === "ttsError") {
    setPreviewText("Error — please try again.");
  }

  return true;
});

// ── Shadow DOM ────────────────────────────────────────────────────────────────

function setupShadowDOM() {
  if (shadowRoot) return;

  const container = document.createElement("div");
  container.id = "hr-shadow-container";
  // fixed + zero size so it never blocks page interaction
  Object.assign(container.style, {
    position: "fixed",
    top: "0", left: "0",
    width: "0", height: "0",
    overflow: "visible",
    pointerEvents: "none",
    zIndex: "2147483647",
  });
  document.documentElement.appendChild(container);
  shadowRoot = container.attachShadow({ mode: "open" });

  const style = document.createElement("style");
  style.textContent = `
    #hr-floating-player {
      position: fixed;
      bottom: 40px; left: 50%;
      transform: translateX(-50%);
      width: 560px; height: 70px;
      background: #0f172a;
      border-radius: 35px;
      display: flex; align-items: center;
      padding: 0 25px;
      color: white; font-family: sans-serif;
      box-shadow: 0 10px 40px rgba(0,0,0,0.6);
      pointer-events: auto;
      user-select: none;
    }
    .hr-content {
      display: flex; justify-content: space-between;
      align-items: center; width: 100%;
    }
    #hr-text-preview {
      flex: 1; font-size: 14px;
      white-space: nowrap; overflow: hidden;
      text-overflow: ellipsis; margin-right: 20px;
      color: #cbd5e1;
      transition: color 0.2s;
    }
    #hr-text-preview.hr-error { color: #f43f5e; }
    .hr-controls { display: flex; gap: 12px; align-items: center; }
    .hr-controls button {
      background: none; border: none;
      cursor: pointer; font-weight: 600;
      transition: opacity 0.15s;
    }
    .hr-controls button:hover { opacity: 0.75; }
    #hr-read-btn {
      color: #818cf8; font-size: 14px;
      border: 1.5px solid #818cf8;
      border-radius: 20px; padding: 5px 14px;
      letter-spacing: 0.4px;
    }
    #hr-read-btn:disabled {
      opacity: 0.4; cursor: not-allowed;
    }
    #hr-close { color: #f43f5e; font-size: 20px; }

    @keyframes hr-shake {
      0%, 100% { transform: translateX(-50%); }
      20%, 60% { transform: translateX(calc(-50% - 6px)); }
      40%, 80% { transform: translateX(calc(-50% + 6px)); }
    }
    .hr-shake { animation: hr-shake 0.35s ease; }
  `;
  shadowRoot.appendChild(style);
}

// ── Player bar ────────────────────────────────────────────────────────────────

function createPlayerBar() {
  if (!shadowRoot || shadowRoot.getElementById("hr-floating-player")) return;

  playerBar = document.createElement("div");
  playerBar.id = "hr-floating-player";
  playerBar.innerHTML = `
    <div class="hr-content">
      <span id="hr-text-preview">Highlight text to read…</span>
      <div class="hr-controls">
        <button id="hr-read-btn">🔊 READ SELECTION</button>
        <button id="hr-close" title="Close">✕</button>
      </div>
    </div>
  `;
  shadowRoot.appendChild(playerBar);

  shadowRoot.getElementById("hr-read-btn").addEventListener("click", async () => {
    const text = capturedSelection || window.getSelection()?.toString().trim();

    if (!text) {
      // Shake instead of alert
      playerBar.classList.remove("hr-shake");
      void playerBar.offsetWidth; // reflow to restart animation
      playerBar.classList.add("hr-shake");
      setPreviewText("Highlight some text first!", true);
      setTimeout(() => setPreviewText("Highlight text to read…"), 2000);
      return;
    }

    const btn = shadowRoot.getElementById("hr-read-btn");
    btn.disabled = true;
    setPreviewText("Processing…");
    capturedSelection = "";

    // Timeout fallback in case background never responds
    const timeout = setTimeout(() => {
      setPreviewText("Taking longer than expected…");
      btn.disabled = false;
    }, 8000);

    chrome.runtime.sendMessage({ action: "readThisText", text }, () => {
      clearTimeout(timeout);
      btn.disabled = false;
    });
  });

  shadowRoot.getElementById("hr-close").addEventListener("click", () => {
    destroyPlayer();
    chrome.runtime.sendMessage({ action: "pause" });
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function setPreviewText(text, isError = false) {
  const preview = shadowRoot?.getElementById("hr-text-preview");
  if (!preview) return;
  preview.innerText = text;
  preview.classList.toggle("hr-error", isError);
}

function highlightBlock(coords, offset) {
  if (!highlightDiv) {
    highlightDiv = document.createElement("div");
    Object.assign(highlightDiv.style, {
      position: "absolute",
      pointerEvents: "none",
      borderRadius: "4px",
      background: "rgba(99, 102, 241, 0.3)",
      border: "2px solid #818cf8",
      boxShadow: "0 0 15px rgba(99,102,241,0.4)",
      zIndex: "2147483646",
      transition: "all 0.15s ease",
    });
    document.documentElement.appendChild(highlightDiv); // real DOM, not shadow
  }

  const dpr = window.devicePixelRatio || 1;
  const x = coords[0][0] / dpr + offset.x;
  const y = coords[0][1] / dpr + offset.y;
  const w = (coords[1][0] - coords[0][0]) / dpr;
  const h = (coords[2][1] - coords[0][1]) / dpr;

  Object.assign(highlightDiv.style, {
    display: "block",
    left: `${x}px`, top: `${y}px`,
    width: `${w}px`, height: `${h}px`,
  });

  window.scrollTo({ top: y - 200, behavior: "smooth" });
}

function hideHighlight() {
  if (highlightDiv) highlightDiv.style.display = "none";
}

function destroyPlayer() {
  hideHighlight();
  if (highlightDiv) { highlightDiv.remove(); highlightDiv = null; }
  if (shadowRoot)   { shadowRoot.host.remove(); shadowRoot = null; }
  playerBar = null;
  capturedSelection = "";
}