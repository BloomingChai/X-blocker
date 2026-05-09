(function initPopup() {
  const contentForm = document.getElementById("content-keyword-form");
  const contentInput = document.getElementById("content-keyword-input");
  const profileForm = document.getElementById("profile-keyword-form");
  const profileInput = document.getElementById("profile-keyword-input");
  const whitelistForm = document.getElementById("whitelist-handle-form");
  const whitelistInput = document.getElementById("whitelist-handle-input");

  const whitelistRoot = document.getElementById("whitelist-handles");
  const profileKeywordsRoot = document.getElementById("profile-keywords");
  const contentKeywordsRoot = document.getElementById("content-keywords");

  const whitelistCount = document.getElementById("whitelist-count");
  const profileCount = document.getElementById("profile-count");
  const contentCount = document.getElementById("content-count");

  function createChip(text, onRemove) {
    const chip = document.createElement("div");
    chip.className = "chip";

    const label = document.createElement("span");
    label.className = "chip__label";
    label.textContent = text;
    chip.appendChild(label);

    const button = document.createElement("button");
    button.type = "button";
    button.className = "chip__remove";
    button.setAttribute("aria-label", `删除 ${text}`);
    button.textContent = "×";
    button.addEventListener("click", onRemove);
    chip.appendChild(button);

    return chip;
  }

  function createEmptyState(text) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = text;
    return empty;
  }

  function renderList(root, items, onRemove, emptyText) {
    root.innerHTML = "";
    if (items.length === 0) {
      root.appendChild(createEmptyState(emptyText));
      return;
    }

    items.forEach((item) => {
      root.appendChild(createChip(item, () => onRemove(item)));
    });
  }

  async function updateSettings(mutator) {
    const settings = await window.XHB.getSettings();
    mutator(settings);
    await window.XHB.saveSettings(settings);
    await render();
  }

  async function render() {
    const settings = await window.XHB.getSettings();

    whitelistCount.textContent = String(settings.whitelistHandles.length);
    profileCount.textContent = String(settings.profileKeywords.length);
    contentCount.textContent = String(settings.shortKeywords.length);

    renderList(
      whitelistRoot,
      settings.whitelistHandles,
      async (handle) => {
        await updateSettings((draft) => {
          draft.whitelistHandles = draft.whitelistHandles.filter((item) => item !== handle);
        });
      },
      "还没有白名单账号。"
    );

    renderList(
      profileKeywordsRoot,
      settings.profileKeywords,
      async (keyword) => {
        await updateSettings((draft) => {
          draft.profileKeywords = draft.profileKeywords.filter((item) => item !== keyword);
        });
      },
      "还没有账号敏感词。"
    );

    renderList(
      contentKeywordsRoot,
      settings.shortKeywords,
      async (keyword) => {
        await updateSettings((draft) => {
          draft.shortKeywords = draft.shortKeywords.filter((item) => item !== keyword);
        });
      },
      "还没有内容敏感词。"
    );
  }

  contentForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const cleaned = window.XHB.sanitizeForRule(contentInput.value.trim());
    if (!cleaned) {
      return;
    }

    await updateSettings((draft) => {
      draft.shortKeywords = Array.from(new Set([...(draft.shortKeywords || []), cleaned]));
    });
    contentInput.value = "";
  });

  profileForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const cleaned = window.XHB.sanitizeForRule(profileInput.value.trim());
    if (!cleaned) {
      return;
    }

    await updateSettings((draft) => {
      draft.profileKeywords = Array.from(new Set([...(draft.profileKeywords || []), cleaned]));
    });
    profileInput.value = "";
  });

  whitelistForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const cleaned = window.XHB.normalizeHandleForRule(whitelistInput.value.trim());
    if (!cleaned) {
      return;
    }

    await updateSettings((draft) => {
      draft.whitelistHandles = Array.from(new Set([...(draft.whitelistHandles || []), cleaned]));
    });
    whitelistInput.value = "";
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "local" && changes[window.XHB.STORAGE_KEY]) {
      render();
    }
  });

  render();
})();
