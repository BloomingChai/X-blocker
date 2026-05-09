(function initOptions() {
  const shortForm = document.getElementById("short-keyword-form");
  const shortInput = document.getElementById("short-keyword-input");
  const profileForm = document.getElementById("profile-keyword-form");
  const profileInput = document.getElementById("profile-keyword-input");
  const whitelistForm = document.getElementById("whitelist-handle-form");
  const whitelistInput = document.getElementById("whitelist-handle-input");

  const whitelistTable = document.getElementById("whitelist-table");
  const profileTable = document.getElementById("profile-table");
  const customShortTable = document.getElementById("custom-short-table");

  const whitelistCount = document.getElementById("whitelist-count");
  const customShortCount = document.getElementById("custom-short-count");
  const resetProfileKeywordsButton = document.getElementById("reset-profile-keywords");

  function createEmptyRow(colspan, text) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = colspan;
    cell.className = "empty-row";
    cell.textContent = text;
    row.appendChild(cell);
    return row;
  }

  function createTypePill(text) {
    const pill = document.createElement("span");
    pill.className = "type-pill";
    pill.textContent = text;
    return pill;
  }

  function createRow(index, text, typeText, onRemove) {
    const row = document.createElement("tr");
    row.id = `row-${index + 1}-${encodeURIComponent(text).slice(0, 12)}`;

    const indexCell = document.createElement("td");
    indexCell.textContent = String(index + 1);

    const wordCell = document.createElement("td");
    wordCell.className = "word-cell";
    wordCell.textContent = text;

    const typeCell = document.createElement("td");
    typeCell.appendChild(createTypePill(typeText));

    const actionCell = document.createElement("td");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "row-action";
    button.textContent = "删除";
    button.addEventListener("click", onRemove);
    actionCell.appendChild(button);

    row.append(indexCell, wordCell, typeCell, actionCell);
    return row;
  }

  async function updateSettings(mutator) {
    const settings = await window.XHB.getSettings();
    mutator(settings);
    await window.XHB.saveSettings(settings);
    await render();
  }

  function renderTable(root, items, typeText, onRemove, emptyText) {
    root.innerHTML = "";
    if (items.length === 0) {
      root.appendChild(createEmptyRow(4, emptyText));
      return;
    }

    items.forEach((item, index) => {
      root.appendChild(createRow(index, item, typeText, () => onRemove(item)));
    });
  }

  async function render() {
    const settings = await window.XHB.getSettings();

    whitelistCount.textContent = String(settings.whitelistHandles.length);
    customShortCount.textContent = String(settings.customShortKeywords.length);

    renderTable(
      whitelistTable,
      settings.whitelistHandles,
      "白名单账号",
      async (handle) => {
        await updateSettings((draft) => {
          draft.whitelistHandles = draft.whitelistHandles.filter((item) => item !== handle);
        });
      },
      "暂无白名单账号"
    );

    renderTable(
      profileTable,
      settings.profileKeywords,
      "账号敏感词",
      async (keyword) => {
        await updateSettings((draft) => {
          draft.profileKeywords = draft.profileKeywords.filter((item) => item !== keyword);
        });
      },
      "暂无账号敏感词"
    );

    renderTable(
      customShortTable,
      settings.customShortKeywords,
      "自定义短词",
      async (keyword) => {
        await updateSettings((draft) => {
          draft.customShortKeywords = draft.customShortKeywords.filter((item) => item !== keyword);
        });
      },
      "暂无自定义短词"
    );
  }

  shortForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const cleaned = window.XHB.sanitizeForRule(shortInput.value.trim());
    if (!cleaned) {
      return;
    }

    await updateSettings((draft) => {
      draft.customShortKeywords = Array.from(new Set([...draft.customShortKeywords, cleaned]));
    });
    shortInput.value = "";
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

  resetProfileKeywordsButton.addEventListener("click", async () => {
    if (!window.confirm("恢复账号敏感词到默认内容？你之前删除或新增的账号词会被默认列表覆盖。")) {
      return;
    }

    await window.XHB.resetDefaultProfileKeywords();
    await render();
  });

  render();
})();
