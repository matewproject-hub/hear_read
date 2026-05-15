const audio = new Audio();

chrome.runtime.onMessage.addListener((request) => {
  if (request.offscreenAction === "playAudio") {
    audio.src = request.src;
    audio.play();
    audio.onended = () => {
      chrome.runtime.sendMessage({ action: "audioEnded" });
    };
  } else if (request.offscreenAction === "pauseAudio") {
    audio.pause();
  } else if (request.offscreenAction === "resumeAudio") {
    audio.play();
  }
});
