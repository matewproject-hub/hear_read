const API = "http://localhost:8000/api/v1";

const uploadInput = document.getElementById("pdfUpload");
const pauseBtn =
  document.getElementById("pauseBtn");

const prevBtn =
  document.getElementById("prevBtn");

const nextBtn =
  document.getElementById("nextBtn");

const currentText = document.getElementById("currentText");
const speedControl =
  document.getElementById("speedControl");

const viewer = document.getElementById("viewer");
const transcriptPanel =
  document.getElementById("transcriptPanel");

// Speed Control

speedControl.addEventListener("change", () => {

  audio.playbackRate =
    parseFloat(speedControl.value);

});

// =====================================
// GLOBAL STATE
// =====================================

let blocks = [];
let currentIndex = 0;

const audio = new Audio();


audio.addEventListener("play", () => {
  console.log("Audio started");
});

audio.addEventListener("pause", () => {
  console.log("Audio paused");
});

audio.addEventListener("ended", () => {
  console.log("Audio ended");
});

audio.addEventListener("error", (e) => {
  console.error("Audio error:", e);
});

// =====================================
// AUTO PLAY NEXT BLOCK
// =====================================

audio.onended = async () => {

  currentIndex++;

  if (currentIndex >= blocks.length) {

    pauseBtn.innerText = "▶";

    currentIndex = 0;

    return;
  }

  await playBlock(blocks[currentIndex]);

};
audio.crossOrigin = "anonymous";

let isPlaying = false;


// =====================================
// AUDIO AUTO NEXT
// =====================================

audio.onended = async () => {

  try {

    currentIndex++;

    // Finished document

    if (currentIndex >= blocks.length) {

      currentIndex = 0;

      isPlaying = false;

      pauseBtn.innerText = "▶";

      

      return;
    }

    await playBlock(blocks[currentIndex]);

  } catch (err) {

    console.error("AUTO NEXT ERROR:", err);

  }

};


// =====================================
// PDF UPLOAD
// =====================================

uploadInput.addEventListener("change", async (e) => {

  const file = e.target.files[0];

  if (!file) return;

  // PDF validation

  if (file.type !== "application/pdf") {

    alert("Only PDF files are allowed.");

    return;
  }

  // Reset state

  audio.pause();

  

  blocks = [];

  currentIndex = 0;

  isPlaying = false;

  pauseBtn.innerText = "⏸";

  // Loading UI

  viewer.innerHTML = `
    <div style="
      padding:60px;
      text-align:center;
      color:#cbd5e1;
      font-size:18px;
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

    // Upload failed

    if (!uploadResp.ok) {

      const errorText =
        await uploadResp.text();

      console.error(errorText);

      alert("Upload failed");

    

      return;
    }

    const uploadData =
      await uploadResp.json();

    const docId = uploadData.id;

    

    waitForProcessing(docId);

  } catch (err) {

    console.error(err);

    alert("Server connection failed");

    

  }

});


// =====================================
// WAIT FOR OCR
// =====================================

async function waitForProcessing(docId) {

  const interval = setInterval(async () => {

    try {

      const resp = await fetch(
        `${API}/documents/${docId}`
      );

      if (!resp.ok) {
        return;
      }

      const doc = await resp.json();

      console.log("Document:", doc);

      // OCR completed

      if (doc.status === "completed") {

        clearInterval(interval);

        

        // Fetch blocks

        const blockResp = await fetch(
          `${API}/documents/${docId}/blocks`
        );

        if (!blockResp.ok) {

        

          return;
        }

        blocks = await blockResp.json();

        renderTranscript(blocks);

        console.log("Blocks:", blocks);

        // Sort properly

        blocks.sort((a, b) => {

          if (a.page !== b.page) {
            return a.page - b.page;
          }

          return (
            a.sequence_index -
            b.sequence_index
          );

        });

        renderReader(blocks);

      

      }

      // OCR failed

      if (doc.status === "failed") {

        clearInterval(interval);

        

        alert("OCR processing failed");

      }

    } catch (err) {

      console.error(err);

    }

  }, 2000);

}


// =====================================
// RENDER READER MODE
// =====================================

function renderReader(blocks) {

  viewer.innerHTML = "";

  const reader =
    document.createElement("div");

  reader.className = "readerContainer";

  blocks.forEach((block, index) => {

    const paragraph =
      document.createElement("div");

    paragraph.className = "readerBlock";

    paragraph.dataset.blockId = block.id;

    paragraph.innerText = block.content;

    // Click paragraph

    paragraph.addEventListener(
      "click",
      async () => {

        currentIndex = index;

        await playBlock(block);

      }
    );

    reader.appendChild(paragraph);

  });

  viewer.appendChild(reader);

}


// =====================================
// PLAY BLOCK
// =====================================

async function playBlock(block) {

  try {

    if (!block) return;

    

    const audioUrl =
      `${API}/audio/stream/${block.id}?voice=af_bella`;

    // stop existing audio

    audio.pause();

    // set new source directly

    audio.src = audioUrl;

    // play audio

    await audio.play();

    isPlaying = true;

    pauseBtn.innerText = "⏸";

    highlightCurrentBlock(block);

  } catch (err) {

    console.error(
      "Audio playback error:",
      err
    );

  }

}


// =====================================
// PLAY / PAUSE BUTTON
// =====================================

pauseBtn.addEventListener("click", async () => {

  try {

    // START playback first time

    if (!audio.src && blocks.length > 0) {

      currentIndex = 0;

      await playBlock(blocks[0]);

      return;

    }

    // RESUME

    if (audio.paused) {

      await audio.play();

      pauseBtn.innerText = "⏸";

    }

    // PAUSE

    else {

      audio.pause();

      pauseBtn.innerText = "▶";

    }

  }

  catch (err) {

    console.error(err);

  }

});

nextBtn.addEventListener("click", async () => {

  try {

    if (currentIndex < blocks.length - 1) {

      currentIndex++;

      await playBlock(blocks[currentIndex]);

    }

  }

  catch (err) {

    console.error(err);

  }

});

prevBtn.addEventListener("click", async () => {

  try {

    if (currentIndex > 0) {

      currentIndex--;

      await playBlock(blocks[currentIndex]);

    }

  }

  catch (err) {

    console.error(err);

  }

});


// =====================================
// HIGHLIGHT ACTIVE BLOCK
// =====================================

function highlightCurrentBlock(block) {

  // PDF highlights

  document
    .querySelectorAll(".textBlock")
    .forEach(el =>
      el.classList.remove("active")
    );

  // Transcript highlights

  document
    .querySelectorAll(".transcriptLine")
    .forEach(el =>
      el.classList.remove("active")
    );

  // PDF block

  const pdfTarget =
    document.querySelector(
      `.textBlock[data-block-id="${block.id}"]`
    );

  if (pdfTarget) {

    pdfTarget.classList.add("active");

  }

  // Transcript block

  const transcriptTarget =
    document.querySelector(
      `.transcriptLine[data-block-id="${block.id}"]`
    );

  if (transcriptTarget) {

    transcriptTarget.classList.add("active");

    transcriptTarget.scrollIntoView({
      behavior: "smooth",
      block: "center"
    });

  }

}

// =====================================
// RENDER TRANSCRIPT PANEL
// =====================================

function renderTranscript(blocks) {

  transcriptPanel.innerHTML = "";

  blocks.forEach((block, index) => {

    const line = document.createElement("div");

    line.className = "transcriptLine";

    line.dataset.blockId = block.id;

    line.innerText = block.content;

    // CLICK TO PLAY

    line.addEventListener("click", async () => {

      currentIndex = index;

      highlightCurrentBlock(block);

      await playBlock(block);

    });

    transcriptPanel.appendChild(line);

  });

}