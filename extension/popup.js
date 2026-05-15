const captureBtn = document.getElementById('capture-btn');
const statusText = document.getElementById('status-text');

captureBtn.addEventListener('click', () => {
    captureBtn.disabled = true;
    statusText.innerText = "Analyzing Screen...";
    
    chrome.runtime.sendMessage({ action: "captureAndRead" }, (response) => {
        if (response.status === "success") {
            statusText.innerText = "Ready! Look at the bottom of your page.";
            setTimeout(() => window.close(), 2000); // Close popup after success
        } else {
            statusText.innerText = "Error: " + response.message;
            captureBtn.disabled = false;
        }
    });
});
