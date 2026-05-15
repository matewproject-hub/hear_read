const API_BASE = "http://localhost:8000/api/v1";
let currentBlocks = [];
let currentIndex = 0;
let currentTabId = null;
let captureScroll = { x: 0, y: 0 };
let isManualMode = false;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "captureAndRead") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs || tabs.length === 0) return;
      const tab = tabs[0];
      currentTabId = tab.id;
      
      chrome.tabs.sendMessage(tab.id, { action: "getScroll" }, (scroll) => {
        captureScroll = scroll || { x: 0, y: 0 };
        // Choose between full PDF processing or screenshot
        if (tab.url.toLowerCase().endsWith(".pdf") || tab.url.includes("blob:") || tab.url.startsWith("file:///")) {
            processFullPDF(tab.url, tab.id, sendResponse);
        } else {
            captureTab(sendResponse);
        }
      });
    });
    return true; 
  } else if (request.action === "readThisText") {
    isManualMode = true;
    playText(request.text);
    sendResponse({ status: "ok" });
  } else if (request.action === "audioEnded") {
    currentIndex++;
    if (!isManualMode && currentIndex < currentBlocks.length) {
        playBlock(currentIndex);
    } else {
        if (currentTabId) {
            chrome.tabs.sendMessage(currentTabId, { action: "audioFinished" });
        }
        isManualMode = false;
    }
  } else if (request.action === "play") {
    chrome.runtime.sendMessage({ offscreenAction: "resumeAudio" });
  } else if (request.action === "pause") {
    chrome.runtime.sendMessage({ offscreenAction: "pauseAudio" });
  }
});

async function processFullPDF(url, tabId, sendResponse) {
    try {
        console.log("📄 Processing Full PDF Document:", url);
        const response = await fetch(url);
        const blob = await response.blob();
        
        const formData = new FormData();
        formData.append("file", blob, "document.pdf");
        
        const uploadResp = await fetch(`${API_BASE}/documents/upload`, { method: "POST", body: formData });
        const result = await uploadResp.json();
        
        await setupOffscreen();
        pollForCompletion(result.id, tabId, sendResponse);
    } catch (error) {
        console.warn("⚠️ Full PDF fetch failed, falling back to screenshot:", error.message);
        captureTab(sendResponse);
    }
}

async function captureTab(sendResponse) {
    try {
        const dataUrl = await chrome.tabs.captureVisibleTab(null, { format: "png" });
        const blob = await (await fetch(dataUrl)).blob();
        const formData = new FormData();
        formData.append("file", blob, "screenshot.png");
        
        const uploadResp = await fetch(`${API_BASE}/documents/upload`, { method: "POST", body: formData });
        const result = await uploadResp.json();
        
        await setupOffscreen();
        pollForCompletion(result.id, currentTabId, sendResponse);
    } catch (error) {
        sendResponse({ status: "error", message: error.message });
    }
}

async function setupOffscreen() {
  if (await chrome.offscreen.hasDocument()) return;
  await chrome.offscreen.createDocument({
    url: 'offscreen.html',
    reasons: ['AUDIO_PLAYBACK'],
    justification: 'Playing TTS audio'
  });
}

async function playText(text) {
    await setupOffscreen();
    const response = await fetch(`${API_BASE}/audio/text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text, voice: 'af_bella' })
    });
    const blob = await response.blob();
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onloadend = () => {
        chrome.runtime.sendMessage({ 
            offscreenAction: "playAudio", 
            src: reader.result 
        });
    }
}

function pollForCompletion(docId, tabId, sendResponse) {
  const interval = setInterval(async () => {
    try {
      if (!tabId) return;
      const response = await fetch(`${API_BASE}/documents/`);
      const docs = await response.json();
      const doc = docs.find(d => d.id === docId);
      
      if (doc && doc.status === "completed") {
        clearInterval(interval);
        const bResp = await fetch(`${API_BASE}/documents/${docId}/blocks`);
        currentBlocks = await bResp.json();
        
        sendResponse({ status: "success" });
        chrome.tabs.sendMessage(tabId, { 
          action: "initPlayer", 
          blocks: currentBlocks,
          offset: captureScroll 
        });
      }
    } catch (e) {
      clearInterval(interval);
      sendResponse({ status: "error", message: e.message });
    }
  }, 2000);
}

function playBlock(index) {
  if (index < 0 || index >= currentBlocks.length || !currentTabId) return;
  currentIndex = index;
  const block = currentBlocks[index];

  chrome.tabs.sendMessage(currentTabId, { 
    action: "syncUI", 
    content: block.content, 
    coords: block.coordinates,
    offset: captureScroll 
  });

  chrome.runtime.sendMessage({ 
    offscreenAction: "playAudio", 
    src: `${API_BASE}/audio/stream/${block.id}?voice=af_bella` 
  });
}
