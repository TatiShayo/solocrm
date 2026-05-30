const nameEl = document.getElementById("name");
const companyEl = document.getElementById("company");
const titleEl = document.getElementById("title");
const emailEl = document.getElementById("email");
const phoneEl = document.getElementById("phone");
const notesEl = document.getElementById("notes");
const sourceEl = document.getElementById("source");
const appUrlEl = document.getElementById("appUrl");
const apiKeyEl = document.getElementById("apiKey");
const addBtn = document.getElementById("addBtn");
const errorEl = document.getElementById("error");
const successEl = document.getElementById("success");
const statusBar = document.getElementById("statusBar");
const settingsPanel = document.getElementById("settingsPanel");
const settingsToggle = document.getElementById("settingsToggle");

let profileData = null;

function showError(msg) {
  errorEl.textContent = msg;
  errorEl.classList.add("visible");
  successEl.classList.remove("visible");
}

function showSuccess(msg) {
  successEl.textContent = msg;
  successEl.classList.add("visible");
  errorEl.classList.remove("visible");
}

function clearMessages() {
  errorEl.classList.remove("visible");
  successEl.classList.remove("visible");
}

function getSettings() {
  return {
    appUrl: appUrlEl.value.trim().replace(/\/+$/, ""),
    apiKey: apiKeyEl.value.trim(),
  };
}

function loadSettings() {
  chrome.storage.local.get(["solocrm_appUrl", "solocrm_apiKey"], (result) => {
    if (result.solocrm_appUrl) appUrlEl.value = result.solocrm_appUrl;
    if (result.solocrm_apiKey) apiKeyEl.value = result.solocrm_apiKey;
  });
}

function saveSettings() {
  chrome.storage.local.set({
    solocrm_appUrl: appUrlEl.value.trim().replace(/\/+$/, ""),
    solocrm_apiKey: apiKeyEl.value.trim(),
  });
}

appUrlEl.addEventListener("change", saveSettings);
apiKeyEl.addEventListener("change", saveSettings);

settingsToggle.addEventListener("click", () => {
  const visible = settingsPanel.classList.toggle("visible");
  settingsToggle.textContent = visible ? "▲ Close Settings" : "⚙ API Settings";
});

function populateFields(data) {
  if (!data) return;
  profileData = data;
  if (data.name) nameEl.value = data.name;
  if (data.company) companyEl.value = data.company;
  if (data.title) titleEl.value = data.title;
  if (data.headline && !data.title) titleEl.value = data.headline;
  if (!notesEl.value || notesEl.value === "Auto-captured from LinkedIn") {
    notesEl.value = data.headline
      ? `LinkedIn: ${data.headline}`
      : "Auto-captured from LinkedIn";
  }
  statusBar.textContent = "Profile captured! Review and add to SoloCRM.";
}

addBtn.addEventListener("click", async () => {
  clearMessages();
  const { appUrl, apiKey } = getSettings();

  if (!appUrl || !apiKey) {
    settingsPanel.classList.add("visible");
    settingsToggle.textContent = "▲ Close Settings";
    showError("Please set your App URL and API Key in settings above.");
    return;
  }

  const name = nameEl.value.trim();
  if (!name) {
    showError("Name is required.");
    return;
  }

  addBtn.disabled = true;
  addBtn.textContent = "Saving...";

  const body = {
    name,
    company: companyEl.value.trim() || undefined,
    title: titleEl.value.trim() || undefined,
    email: emailEl.value.trim() || undefined,
    phone: phoneEl.value.trim() || undefined,
    source: sourceEl.value.trim() || "linkedin",
    notes: notesEl.value.trim() || undefined,
  };

  try {
    const res = await fetch(`${appUrl}/api/contacts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (!res.ok) {
      if (res.status === 409) {
        showError("Contact with this email already exists in SoloCRM.");
      } else {
        showError(data.error || `Failed (${res.status}).`);
      }
      addBtn.disabled = false;
      addBtn.textContent = "Add to SoloCRM";
      return;
    }

    showSuccess(`✓ Added "${name}" to SoloCRM!`);
    addBtn.textContent = "Done ✓";
    statusBar.textContent = "Ready for next profile.";

    setTimeout(() => {
      addBtn.disabled = false;
      addBtn.textContent = "Add to SoloCRM";
      clearMessages();
    }, 3000);
  } catch (err) {
    showError("Could not reach SoloCRM. Check your App URL.");
    addBtn.disabled = false;
    addBtn.textContent = "Add to SoloCRM";
  }
});

loadSettings();

chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  const tab = tabs[0];
  if (!tab || !tab.url || !tab.url.includes("linkedin.com/in/")) {
    statusBar.textContent = "Open a LinkedIn profile to capture.";
    return;
  }
  statusBar.textContent = "Scanning LinkedIn profile...";
  chrome.tabs.sendMessage(
    tab.id,
    { type: "EXTRACT_PROFILE" },
    (response) => {
      if (chrome.runtime.lastError) {
        statusBar.textContent = "Refresh the LinkedIn page and try again.";
      } else if (response && response.data) {
        populateFields(response.data);
      }
    }
  );
});
