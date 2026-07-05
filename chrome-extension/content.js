function extractProfileData() {
  const data = {
    name: "",
    title: "",
    company: "",
    location: "",
    headline: "",
  };

  const nameEl =
    document.querySelector("h1") ||
    document.querySelector('[class*="text-heading-xlarge"]') ||
    document.querySelector('[class*="pv-text-details__left-panel"] h1');
  if (nameEl) {
    data.name = nameEl.textContent.trim().replace(/\s+/g, " ");
  }

  const headlineEl =
    document.querySelector('[class*="text-body-medium"]') ||
    document.querySelector('[class*="pv-text-details__left-panel"] [class*="text-body-medium"]');
  if (headlineEl) {
    data.headline = headlineEl.textContent.trim().replace(/\s+/g, " ");
  }

  const experienceSection = document.querySelector("#experience ~ div");
  if (experienceSection) {
    const positions = experienceSection.querySelectorAll("li");
    for (const pos of positions) {
      const text = pos.textContent.toLowerCase();
      if (text.includes("current") || text.includes("present")) {
        const companyEl = pos.querySelector(
          '[class*="t-16"], [class*="t-normal"], span[class*="bold"]'
        );
        if (companyEl) {
          data.company = companyEl.textContent.trim().replace(/\s+/g, " ");
        }
        break;
      }
    }
  }

  if (!data.company) {
    const companyLink = document.querySelector(
      'a[href*="/company/"], [class*="pv-text-details__left-panel"] a[href*="/company/"]'
    );
    if (companyLink) {
      data.company = companyLink.textContent.trim().replace(/\s+/g, " ");
    }
  }

  const locationEl =
    document.querySelector('[class*="pv-text-details__left-panel"] [class*="t-black--light"]') ||
    document.querySelector('[class*="text-body-small"]:not([class*="inline"])');
  if (locationEl) {
    data.location = locationEl.textContent.trim().replace(/\s+/g, " ");
  }

  if (!data.title && data.headline) {
    const parts = data.headline.split(" at ");
    if (parts.length > 1) {
      data.title = parts[0].trim();
      if (!data.company) {
        data.company = parts[1].trim();
      }
    } else {
      data.title = data.headline;
    }
  }

  return data;
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "EXTRACT_PROFILE") {
    const data = extractProfileData();
    sendResponse({ data });
  }
  return true;
});
