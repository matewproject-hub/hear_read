const API = "http://localhost:8000/api/v1";

// =====================================
// ELEMENTS
// =====================================

const uploadInput =
  document.getElementById("pdfUpload");

const pauseBtn =
  document.getElementById("pauseBtn");

const prevBtn =
  document.getElementById("prevBtn");

const nextBtn =
  document.getElementById("nextBtn");

const speedControl =
  document.getElementById("speedControl");

const viewer =
  document.getElementById("viewer");

const transcriptPanel =
  document.getElementById("transcriptPanel");

// =====================================
// GLOBAL STATE
// =====================================

let blocks = [];

let blockTimings = [];

let currentIndex = 0;

let currentDocId = null;

let documentAudioLoaded = false;

const audio = new Audio();

audio.crossOrigin = "anonymous";

// =====================================
// AUDIO EVENTS
// =====================================

console.log(audio);

audio.addEventListener("play", () => {

  console.log("Audio started");

});

audio.addEventListener("pause", () => {

  console.log("Audio paused");

});

audio.addEventListener("ended", () => {

  console.log("Audio ended");

  pauseBtn.innerText = "▶";

});

audio.addEventListener("timeupdate", () => {

  updateHighlightByTime();

});

audio.addEventListener("error", (e) => {

  console.error("Audio error:", e);

});

// =====================================
// SPEED CONTROL
// =====================================

speedControl.addEventListener("change", () => {

  audio.playbackRate =
    parseFloat(speedControl.value);

});

// =====================================
// PDF UPLOAD
// =====================================

uploadInput.addEventListener(
  "change",
  async (e) => {

    const file = e.target.files[0];

    if (!file) return;

    if (file.type !== "application/pdf") {

      alert("Only PDF allowed");

      return;

    }

    // =====================================
    // RESET STATE
    // =====================================

    audio.pause();

    audio.src = "";

    blocks = [];

    blockTimings = [];

    currentIndex = 0;

    documentAudioLoaded = false;

    transcriptPanel.innerHTML = "";

    viewer.innerHTML = `
      <div style="
        padding:60px;
        text-align:center;
        color:white;
      ">
        Uploading PDF...
      </div>
    `;

    try {

      const formData = new FormData();

      formData.append("file", file);

      const uploadResp = await fetch(
        `${API}/documents/upload`,
        {
          method: "POST",
          body: formData
        }
      );

      if (!uploadResp.ok) {

        const errorText =
          await uploadResp.text();

        console.error(errorText);

        alert("Upload failed");

        return;

      }

      const uploadData =
        await uploadResp.json();

      currentDocId = uploadData.id;

      waitForProcessing(currentDocId);

    }

    catch (err) {

      console.error(err);

      alert("Server error");

    }

  }
);

// =====================================
// WAIT FOR OCR + AUDIO
// =====================================

async function waitForProcessing(docId) {

  const interval = setInterval(
    async () => {

      try {

        const resp = await fetch(
          `${API}/documents/${docId}`
        );

        if (!resp.ok) return;

        const doc = await resp.json();

        console.log("Document:", doc);

        // =====================================
        // PROCESSING COMPLETE
        // =====================================

        if (doc.status === "completed") {

          clearInterval(interval);

          // =========================
          // LOAD BLOCKS
          // =========================

          const blockResp = await fetch(
            `${API}/documents/${docId}/blocks`
          );

          blocks =
            await blockResp.json();

          // =========================
          // LOAD TIMINGS
          // =========================

          const timingResp = await fetch(
            `${API}/documents/${docId}/timings`
          );

          if (timingResp.ok) {

            blockTimings =
              await timingResp.json();

            console.log(
              "Timings:",
              blockTimings
            );

          }

          // =========================
          // SORT BLOCKS
          // =========================

          blocks.sort((a, b) => {

            if (a.page !== b.page) {

              return a.page - b.page;

            }

            return (
              a.sequence_index -
              b.sequence_index
            );

          });

          // =========================
          // RENDER UI
          // =========================

          renderReader(blocks);

          renderTranscript(blocks);

          // =========================
          // LOAD AUDIO
          // =========================

          await loadDocumentAudio(doc);

        }

        // =====================================
        // FAILED
        // =====================================

        if (doc.status === "failed") {

          clearInterval(interval);

          alert("Processing failed");

        }

      }

      catch (err) {

        console.error(err);

      }

    },

    2000
  );

}

// =====================================
// LOAD FULL AUDIO
// =====================================

async function loadDocumentAudio(doc) {

  try {

    if (!doc.audio_path) {

      console.error(
        "No audio path from backend"
      );

      return;

    }

    console.log(
      "Loading audio:",
      doc.audio_path
    );

    // reset first

    audio.pause();

    audio.removeAttribute("src");

    audio.load();

    // set actual source

    audio.src = doc.audio_path;

    // wait until browser confirms audio is loaded

    audio.onloadedmetadata = () => {

      console.log(
        "Audio metadata loaded"
      );

      console.log(
        "Duration:",
        audio.duration
      );

      documentAudioLoaded = true;

    };

    audio.onerror = (err) => {

      console.error(
        "AUDIO LOAD FAILED:",
        err
      );

      console.log(
        "Audio src:",
        audio.src
      );

    };

    audio.load();

  }

  catch (err) {

    console.error(err);

  }

}
// =====================================
// PLAY / PAUSE
// =====================================

pauseBtn.addEventListener(
  "click",
  async () => {

    try {

      if (!documentAudioLoaded || !audio.src) {

        console.log("Audio not ready");

        return;

      }

      if (audio.paused) {

        await audio.play();

        pauseBtn.innerText = "⏸";

      }

      else {

        audio.pause();

        pauseBtn.innerText = "▶";

      }

    }

    catch (err) {

      console.error(err);

    }

  }
);

// =====================================
// NEXT BUTTON
// =====================================

nextBtn.addEventListener(
  "click",
  () => {

    audio.currentTime += 10;

  }
);

// =====================================
// PREV BUTTON
// =====================================

prevBtn.addEventListener(
  "click",
  () => {

    audio.currentTime -= 10;

  }
);

// =====================================
// RENDER READER
// =====================================

function renderReader(blocks) {

  viewer.innerHTML = "";

  const reader =
    document.createElement("div");

  reader.className =
    "readerContainer";

  blocks.forEach((block, index) => {

    const paragraph =
      document.createElement("div");

    paragraph.className =
      "readerBlock";

    paragraph.dataset.blockId =
      block.id;

    paragraph.innerText =
      block.content;

    paragraph.addEventListener(
      "click",
      () => {

        currentIndex = index;

        highlightCurrentBlock(block);

      }
    );

    reader.appendChild(paragraph);

  });

  viewer.appendChild(reader);

}

// =====================================
// RENDER TRANSCRIPT
// =====================================

function renderTranscript(blocks) {

  transcriptPanel.innerHTML = "";

  blocks.forEach((block, index) => {

    const line =
      document.createElement("div");

    line.className =
      "transcriptLine";

    line.dataset.blockId =
      block.id;

    line.innerText =
      block.content;

    line.addEventListener(
      "click",
      () => {

        currentIndex = index;

        highlightCurrentBlock(block);

      }
    );

    transcriptPanel.appendChild(line);

  });

}

// =====================================
// HIGHLIGHT CURRENT BLOCK
// =====================================

function highlightCurrentBlock(block) {

  // Reader

  document
    .querySelectorAll(".readerBlock")
    .forEach(el =>
      el.classList.remove("active")
    );

  // Transcript

  document
    .querySelectorAll(".transcriptLine")
    .forEach(el =>
      el.classList.remove("active")
    );

  // Active Reader Block

  const readerTarget =
    document.querySelector(
      `.readerBlock[data-block-id="${block.id}"]`
    );

  if (readerTarget) {

    readerTarget.classList.add(
      "active"
    );

    readerTarget.scrollIntoView({
      behavior: "smooth",
      block: "center"
    });

  }

  // Active Transcript Block

  const transcriptTarget =
    document.querySelector(
      `.transcriptLine[data-block-id="${block.id}"]`
    );

  if (transcriptTarget) {

    transcriptTarget.classList.add(
      "active"
    );

    transcriptTarget.scrollIntoView({
      behavior: "smooth",
      block: "center"
    });

  }

}

// =====================================
// UPDATE HIGHLIGHT BY AUDIO TIME
// =====================================

function updateHighlightByTime() {

  if (!blockTimings.length) return;

  const currentTime =
    audio.currentTime;

  const activeTiming =
    blockTimings.find(
      t =>
        currentTime >= t.start &&
        currentTime <= t.end
    );

  if (!activeTiming) return;

  const block = blocks.find(
    b => b.id === activeTiming.id
  );

  if (!block) return;

  highlightCurrentBlock(block);

}