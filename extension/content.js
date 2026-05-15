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
  console.log("📩 HearRead Message:", request.action, request);

  if (request.action === "getScroll") {
    sendResponse({ x: window.scrollX, y: window.scrollY });

  } else if (request.action === "initPlayer") {
    console.log("🛠 Initializing Player UI...");
    setupShadowDOM();
    createPlayerBar();
    if (request.blocks && request.offset) {
      console.log(`✨ Creating ${request.blocks.length} interactive overlays...`);
      createInteractiveOverlays(request.blocks, request.offset);
    }
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
  document.body.appendChild(container); // More reliable than documentElement
  shadowRoot = container.attachShadow({ mode: "open" });

  const style = document.createElement("style");
  style.textContent = `
    #hr-floating-player {
      position: fixed;
      bottom: 40px; left: 50%;
      transform: translateX(-50%);
      width: 680px; height: 85px;
      background: rgba(15, 23, 42, 0.9);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 42.5px;
      display: flex; align-items: center;
      padding: 0 32px;
      color: white; font-family: 'Inter', system-ui, -apple-system, sans-serif;
      box-shadow: 0 25px 60px rgba(0,0,0,0.6);
      pointer-events: auto;
      user-select: none;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      z-index: 2147483647;
    }
    .hr-content {
      display: flex; justify-content: space-between;
      align-items: center; width: 100%; gap: 24px;
    }
    #hr-text-preview {
      flex: 1; font-size: 15px; line-height: 1.5;
      white-space: nowrap; overflow: hidden;
      text-overflow: ellipsis; 
      color: #f1f5f9;
      font-weight: 500;
    }
    #hr-text-preview.hr-error { color: #f43f5e; }
    .hr-controls { display: flex; gap: 16px; align-items: center; }
    .hr-controls button {
      background: none; border: none;
      cursor: pointer; font-weight: 700;
      transition: all 0.25s;
      display: flex; align-items: center; gap: 8px;
    }
    #hr-read-all-btn {
      color: #10b981; font-size: 12px;
      border: 1.5px solid rgba(16, 185, 129, 0.3);
      border-radius: 20px; padding: 8px 18px;
      text-transform: uppercase; letter-spacing: 0.8px;
    }
    #hr-read-all-btn:hover { background: rgba(16, 185, 129, 0.1); border-color: #10b981; transform: translateY(-1px); }
    
    #hr-read-btn {
      background: #4f46e5; color: white;
      font-size: 13px; border-radius: 25px;
      padding: 10px 24px; text-transform: uppercase;
      letter-spacing: 0.8px; box-shadow: 0 8px 20px rgba(79, 70, 229, 0.3);
    }
    #hr-read-btn:hover { background: #6366f1; transform: translateY(-2px); box-shadow: 0 10px 25px rgba(79, 70, 229, 0.4); }
    #hr-read-btn:active { transform: translateY(0); }
    #hr-read-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; box-shadow: none; }
    
    #hr-close { 
        color: #64748b; font-size: 24px; 
        padding: 5px;
    }
    #hr-close:hover { color: #ef4444; transform: rotate(90deg); }

    .hr-block-overlay {
      position: absolute;
      color: transparent !important;
      user-select: text !important;
      white-space: nowrap !important;
      overflow: hidden !important;
      cursor: text !important;
      /* Better selection bounds */
      padding: 2px 0;
      margin-top: -1px;
    }
    .hr-block-overlay::selection {
      background: rgba(99, 102, 241, 0.4) !important;
    }
    .hr-block-overlay.hr-playing {
      background: rgba(99, 102, 241, 0.1);
      border-bottom: 2px solid #6366f1;
    }

    @keyframes hr-shake {
      0%, 100% { transform: translateX(-50%); }
      20%, 60% { transform: translateX(calc(-50% - 10px)); }
      40%, 80% { transform: translateX(calc(-50% + 10px)); }
    }
    .hr-shake { animation: hr-shake 0.5s cubic-bezier(.36,.07,.19,.97) both; }
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
      <span id="hr-text-preview" style="transition: all 0.2s;">Scan or select text to begin…</span>
      <div class="hr-controls">
        <button id="hr-read-all-btn">▶ READ ALL</button>
        <button id="hr-read-btn"><span id="hr-btn-icon">🔊</span> <span id="hr-btn-text">READ SELECTION</span></button>
        <button id="hr-close" title="Close">✕</button>
      </div>
    </div>
  `;
  shadowRoot.appendChild(playerBar);

  let isPlaying = false;

  const updatePlayState = (playing) => {
    isPlaying = playing;
    const btnText = shadowRoot.getElementById("hr-btn-text");
    const btnIcon = shadowRoot.getElementById("hr-btn-icon");
    if (isPlaying) {
      btnText.innerText = "PAUSE";
      btnIcon.innerText = "⏸";
    } else {
      btnText.innerText = "READ SELECTION";
      btnIcon.innerText = "🔊";
    }
  };

  shadowRoot.getElementById("hr-read-btn").addEventListener("click", async () => {
    if (isPlaying) {
      chrome.runtime.sendMessage({ action: "pause" });
      updatePlayState(false);
      return;
    }

    const sel = window.getSelection()?.toString().trim();
    const text = sel || capturedSelection;

    if (!text) {
      playerBar.classList.remove("hr-shake");
      void playerBar.offsetWidth; 
      playerBar.classList.add("hr-shake");
      setPreviewText("Highlight some text first!", true);
      setTimeout(() => setPreviewText("Select text or click a box to read…"), 2000);
      return;
    }

    updatePlayState(true);
    chrome.runtime.sendMessage({ action: "readThisText", text });
  });

  shadowRoot.getElementById("hr-read-all-btn").addEventListener("click", () => {
    updatePlayState(true);
    chrome.runtime.sendMessage({ action: "audioEnded" }); 
    setPreviewText("Reading all blocks...");
  });

  shadowRoot.getElementById("hr-close").addEventListener("click", () => {
    destroyPlayer();
    chrome.runtime.sendMessage({ action: "pause" });
  });

  // Listen for audio ended to reset button
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.action === "audioFinished") {
      updatePlayState(false);
    }
  });
}

function createInteractiveOverlays(blocks, offset) {
  // Remove existing overlays if any
  const existing = document.getElementById("hr-overlay-container");
  if (existing) existing.remove();

  const container = document.createElement("div");
  container.id = "hr-overlay-container";
  Object.assign(container.style, {
    position: "absolute", // Changed to absolute for full-page scroll sync
    top: "0", left: "0",
    width: "100%", height: `${Math.max(document.body.scrollHeight, document.documentElement.scrollHeight)}px`,
    pointerEvents: "none",
    zIndex: "2147483645",
  });
  document.documentElement.appendChild(container); // Attach to root for best scroll stability

  const dpr = window.devicePixelRatio || 1;

  blocks.forEach((block, index) => {
    const coords = block.coordinates;
    if (!coords || !coords.length || !coords[0]) {
      console.warn(`⚠️ Skipping block ${index} due to missing coordinates`);
      return;
    }

    // PDF viewers often have a toolbar offset. Let's try to detect it.
    const pdfToolbarHeight = document.querySelector('embed, object, #toolbar, .pdf-toolbar')?.offsetHeight || 0;
    
    const x = (coords[0][0] / dpr) + offset.x;
    const y = (coords[0][1] / dpr) + offset.y + pdfToolbarHeight;
    const w = (coords[1][0] - coords[0][0]) / dpr;
    const h = (coords[2][1] - coords[0][1]) / dpr;

    const overlay = document.createElement("div");
    overlay.className = "hr-block-overlay";
    overlay.innerText = block.content;
    
    const fontSize = h * 0.85;
    Object.assign(overlay.style, {
      position: "absolute",
      left: `${x}px`, 
      top: `${y}px`,
      width: `${w}px`, 
      height: `${h}px`,
      fontSize: `${fontSize}px`,
      lineHeight: `${h}px`,
      color: "rgba(99, 102, 241, 0.03)", // Very faint text to help alignment
      backgroundColor: "rgba(99, 102, 241, 0.02)", // Very faint background
      userSelect: "text",
      webkitUserSelect: "text",
      pointerEvents: "auto",
      zIndex: "2147483645",
      fontFamily: "monospace",
      whiteSpace: "nowrap",
      overflow: "hidden",
      border: "1px solid rgba(99, 102, 241, 0.1)" // Faint border
    });

    overlay.addEventListener("mousedown", () => {
        // Clear previous selection on click
        capturedSelection = "";
    });

    overlay.addEventListener("click", () => {
      capturedSelection = block.content;
      setPreviewText("✅ Block Selected");
      const preview = shadowRoot.getElementById("hr-text-preview");
      preview.style.color = "#10b981";
      setTimeout(() => {
          preview.style.color = "#f1f5f9";
          setPreviewText(block.content);
      }, 800);
      highlightBlock(coords, offset);
    });

    container.appendChild(overlay);
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
  if (!coords || !coords.length || !coords[0]) return;
  
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
  const overlayContainer = document.getElementById("hr-overlay-container");
  if (overlayContainer) overlayContainer.remove();
  if (highlightDiv) { highlightDiv.remove(); highlightDiv = null; }
  if (shadowRoot)   { shadowRoot.host.remove(); shadowRoot = null; }
  playerBar = null;
  capturedSelection = "";
}
// Add a global scroll listener to detect if the PDF container moves
window.addEventListener('scroll', () => {
    const container = document.getElementById("hr-overlay-container");
    if (container) {
        // Since overlays are absolute, they should move with the body
        // If they don't, it means the PDF viewer is using its own internal scroll
    }
}, { passive: true });
