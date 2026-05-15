let playerBar = null;
let highlightDiv = null;
let capturedText = "";

// Selection tracking
document.addEventListener("selectionchange", () => {
    capturedText = window.getSelection()?.toString().trim() || "";
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getScroll") {
        sendResponse({ x: window.scrollX, y: window.scrollY });
    } else if (request.action === "initPlayer") {
        injectPlayerUI();
        sendResponse({ status: "ok" });
    } else if (request.action === "syncUI") {
        const status = document.getElementById('hr-status');
        if (status && request.content) status.innerText = request.content.substring(0, 40) + "...";
        if (request.coords && request.offset) highlightBlock(request.coords, request.offset);
    }
    return true;
});

function injectPlayerUI() {
    if (document.getElementById('hr-player-bar')) return;

    playerBar = document.createElement('div');
    playerBar.id = 'hr-player-bar';
    playerBar.style.cssText = `
        position: fixed !important; 
        bottom: 30px !important; 
        left: 50% !important;
        transform: translateX(-50%) !important; 
        width: 500px !important; 
        height: 60px !important;
        background: #1e293b !important; 
        color: white !important; 
        z-index: 2147483647 !important;
        border-radius: 30px !important; 
        display: flex !important; 
        align-items: center !important;
        padding: 0 20px !important; 
        border: 1px solid #475569 !important; 
        box-shadow: 0 10px 30px rgba(0,0,0,0.5) !important;
        font-family: sans-serif !important; 
        justify-content: space-between !important;
        pointer-events: auto !important;
    `;

    playerBar.innerHTML = `
        <span id="hr-status" style="font-size: 13px !important; color: #cbd5e1 !important; flex: 1 !important; white-space: nowrap !important; overflow: hidden !important; text-overflow: ellipsis !important; margin-right: 15px !important;">Highlight text to read...</span>
        <div style="display: flex !important; gap: 15px !important; align-items: center !important;">
            <button id="hr-btn-read" style="background: #6366f1 !important; color: white !important; border: none !important; padding: 6px 16px !important; border-radius: 18px !important; cursor: pointer !important; font-weight: bold !important; font-size: 12px !important; white-space: nowrap !important;">🔊 READ</button>
            <button id="hr-btn-close" style="background: none !important; color: #ef4444 !important; border: none !important; cursor: pointer !important; font-size: 20px !important; padding: 0 !important; line-height: 1 !important;">✕</button>
        </div>
    `;
    document.body.appendChild(playerBar);

    document.getElementById('hr-btn-read').onclick = () => {
        const text = window.getSelection()?.toString().trim() || capturedText;
        if (text) {
            document.getElementById('hr-status').innerText = "Generating voice...";
            chrome.runtime.sendMessage({ action: "readThisText", text: text });
        } else {
            document.getElementById('hr-status').innerText = "Highlight text first!";
        }
    };

    document.getElementById('hr-btn-close').onclick = () => {
        playerBar.remove();
        if (highlightDiv) highlightDiv.remove();
        chrome.runtime.sendMessage({ action: "pause" });
    };
}

function highlightBlock(coords, offset) {
    if (!highlightDiv) {
        highlightDiv = document.createElement("div");
        highlightDiv.id = "hr-highlight-overlay";
        highlightDiv.style.cssText = `position: absolute !important; pointer-events: none !important; background: rgba(99, 102, 241, 0.2) !important; border: 2px solid #6366f1 !important; z-index: 2147483646 !important; border-radius: 4px !important;`;
        document.body.appendChild(highlightDiv);
    }
    const dpr = window.devicePixelRatio || 1;
    const x = coords[0][0] / dpr + offset.x;
    const y = coords[0][1] / dpr + offset.y;
    const w = (coords[1][0] - coords[0][0]) / dpr;
    const h = (coords[2][1] - coords[0][1]) / dpr;
    
    highlightDiv.style.left = `${x}px`;
    highlightDiv.style.top = `${y}px`;
    highlightDiv.style.width = `${w}px`;
    highlightDiv.style.height = `${h}px`;
    highlightDiv.style.display = "block";
}