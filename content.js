// Deep Search Helper: Traverse every element including Shadow Roots
function deepSearchAll(selector) {
  const results = [];

  function search(node) {
    // Check current node
    const matches = node.querySelectorAll(selector);
    results.push(...matches);

    // Recurse into shadow roots
    const allElements = node.querySelectorAll("*");
    for (const el of allElements) {
      if (el.shadowRoot) {
        search(el.shadowRoot);
      }
    }
  }

  search(document);
  return results;
}

// Helper: Remove noise strings from text
function cleanText(text) {
  const noisePatterns = [
    "Copy code",
    "Share",
    "Like",
    "Dislike",
    "Copy",
    "Regenerate",
    "Sources",
    "Citations"
  ];

  return noisePatterns.reduce((clean, pattern) => {
    return clean.split(pattern).join("");
  }, text).trim();
}

// Structural Scraper: Find divs with high text-to-HTML ratio
function structuralScraper() {
  const allDivs = deepSearchAll("div");
  const results = [];

  for (const div of allDivs) {
    const text = div.innerText.trim();
    const html = div.innerHTML;

    // Skip if too short
    if (text.length < 50) continue;

    // Calculate text-to-HTML ratio
    const ratio = text.length / html.length;

    // Keep divs with high text content (ratio > 0.3)
    if (ratio > 0.3) {
      // Exclude sidebar/header elements
      const parent = div.closest("aside, header, nav, [role='navigation'], [role='banner']");
      if (!parent) {
        results.push(div);
      }
    }
  }

  console.log("Structural Scraper: Found", results.length, "divs with high text-to-HTML ratio");

  return results;
}

// Site Adapters
const adapters = {
  gemini: () => {
    let elements = [];

    // Primary: .markdown-main-panel
    elements = deepSearchAll(".markdown-main-panel");

    // Fallback: .message-content
    if (elements.length === 0) {
      elements = deepSearchAll(".message-content");
    }

    // Fallback: div with ID starting with model-response-message-content
    if (elements.length === 0) {
      elements = deepSearchAll("div[id^='model-response-message-content']");
    }

    // Everything fallback: all .markdown elements, excluding sidebar/header
    if (elements.length === 0) {
      const allMarkdown = deepSearchAll(".markdown");
      elements = Array.from(allMarkdown).filter(el => {
        const parent = el.closest("aside, header, nav, [role='navigation'], [role='banner']");
        return !parent;
      });
    }

    console.log("Gemini Adapter: Found", elements.length, "messages");

    return Array.from(elements)
      .map(el => cleanText(el.innerText))
      .filter(text => text.length > 0)
      .join("\n\n");
  },

  claude: () => {
    let elements = [];

    // Primary: .font-claude-message
    elements = deepSearchAll(".font-claude-message");

    // Fallback: div[data-testid='message-container']
    if (elements.length === 0) {
      elements = deepSearchAll("div[data-testid='message-container']");
    }

    console.log("Claude Adapter: Found", elements.length, "messages");

    return Array.from(elements)
      .map(el => cleanText(el.innerText))
      .filter(text => text.length > 0)
      .join("\n\n");
  },

  perplexity: () => {
    let elements = [];

    // Primary: div.prose
    elements = deepSearchAll("div.prose");

    // Fallback: .answer-text
    if (elements.length === 0) {
      elements = deepSearchAll(".answer-text");
    }

    console.log("Perplexity Adapter: Found", elements.length, "messages");

    return Array.from(elements)
      .map(el => cleanText(el.innerText))
      .filter(text => text.length > 0)
      .join("\n\n");
  },

  chatgpt: () => {
    const elements = document.querySelectorAll("[data-message-author-role]");

    console.log("ChatGPT Adapter: Found", elements.length, "messages");

    return Array.from(elements)
      .map(el => cleanText(el.innerText))
      .filter(text => text.length > 0)
      .join("\n\n");
  }
};

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "CAPTURE_CONVERSATION") {
    const hostname = window.location.hostname;
    let capturedText = "";

    // Route to appropriate adapter
    if (hostname.includes("gemini.google.com")) {
      capturedText = adapters.gemini();
    }
    else if (hostname.includes("claude.ai")) {
      capturedText = adapters.claude();
    }
    else if (hostname.includes("perplexity.ai")) {
      capturedText = adapters.perplexity();
    }
    else if (hostname.includes("chatgpt.com") || hostname.includes("chat.openai.com")) {
      capturedText = adapters.chatgpt();
    }
    else {
      // Fallback: structural scraper
      const elements = structuralScraper();
      capturedText = Array.from(elements)
        .map(el => cleanText(el.innerText))
        .filter(text => text.length > 0)
        .join("\n\n");
    }

    // Send result back to popup using sendResponse
    sendResponse({ data: capturedText });
  }
});
