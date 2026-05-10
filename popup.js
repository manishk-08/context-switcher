// DOM Elements
const captureBtn = document.getElementById("captureBtn");
const capsulesList = document.getElementById("capsulesList");

// Capture button click handler
captureBtn.addEventListener("click", () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, { type: "CAPTURE_CONVERSATION" }, (response) => {
        // Error handling
        if (chrome.runtime.lastError) {
          alert("Cannot capture on this page.");
          return;
        }

        // Empty check
        if (response && response.data && response.data.trim().length > 0) {
          saveCapsule(response.data, tabs[0].url);
        }
      });
    }
  });
});

// Save capsule to storage
function saveCapsule(content, url) {
  const domain = new URL(url).hostname;

  const capsule = {
    id: Date.now(),
    timestamp: new Date().toLocaleString(),
    domain: domain,
    content: content
  };

  chrome.storage.local.get(["capsules"], (result) => {
    const capsules = result.capsules || [];
    capsules.unshift(capsule);
    const limitedCapsules = capsules.slice(0, 20);

    chrome.storage.local.set({ capsules: limitedCapsules }, () => {
      renderList();
    });
  });
}

// Delete capsule from storage
function deleteCapsule(id) {
  chrome.storage.local.get(["capsules"], (result) => {
    const capsules = result.capsules || [];
    const filtered = capsules.filter(capsule => capsule.id !== id);
    chrome.storage.local.set({ capsules: filtered }, () => {
      renderList();
    });
  });
}

// Render capsules list
function renderList() {
  capsulesList.innerHTML = "";

  chrome.storage.local.get(["capsules"], (result) => {
    const capsules = result.capsules || [];

    capsules.forEach(capsule => {
      const item = document.createElement("div");
      item.className = "capsule-item";

      const header = document.createElement("div");
      header.className = "capsule-header";
      header.textContent = `${capsule.domain} - ${capsule.timestamp}`;

      const buttons = document.createElement("div");
      buttons.className = "capsule-buttons";

      const copyBtn = document.createElement("button");
      copyBtn.className = "copy-btn";
      copyBtn.textContent = "Copy";
      copyBtn.addEventListener("click", () => {
        copyToClipboard(capsule.content, copyBtn);
      });

      const deleteBtn = document.createElement("button");
      deleteBtn.className = "delete-btn";
      deleteBtn.textContent = "Delete";
      deleteBtn.addEventListener("click", () => {
        deleteCapsule(capsule.id);
      });

      buttons.appendChild(copyBtn);
      buttons.appendChild(deleteBtn);

      item.appendChild(header);
      item.appendChild(buttons);
      capsulesList.appendChild(item);
    });
  });
}

// Copy to clipboard with toast notification
function copyToClipboard(text, button) {
  navigator.clipboard.writeText(text).then(() => {
    const originalText = button.textContent;
    button.textContent = "Copied!";
    button.disabled = true;

    setTimeout(() => {
      button.textContent = originalText;
      button.disabled = false;
    }, 1500);
  });
}

// Auto-refresh on storage changes
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "local" && changes.capsules) {
    renderList();
  }
});

// Initialize on load
document.addEventListener("DOMContentLoaded", renderList);
