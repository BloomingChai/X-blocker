(function initShared(global) {
  const STORAGE_KEY = "xhb-settings";
  const DEFAULT_SHORT_KEYWORDS = [
    "哥哥",
    "弟弟",
    "主人",
    "小狗",
    "抱抱",
    "单身哥哥",
    "单身弟弟",
    "求主人",
    "会疼人",
    "领我",
    "认识吗",
    "快来领我",
    "约p",
    "同城",
    "骚货",
    "打✈️",
    "好涩",
    "她骚",
    "她sao",
    "sao货",
    "真人",
    "谁来",
    "quark",
    "娃",
    "调教",
    "回馈",
    "第一强",
    "⬇️",
    "👇",
    "约吗",
    "保存视频",
    "is it true",
    "🔻"
  ];
  const PROFILE_BLOCK_KEYWORDS = [
    "约炮",
    "同城",
    "免费",
    "破处",
    "约p",
    "主页",
    "附近",
    "代购",
    "母狗",
    "线下",
    "头像",
    "大秀",
    "今晚",
    "单男",
    "返佣",
    "eth"
  ];

  function normalizeWhitespace(text) {
    return text.replace(/\s+/g, " ").trim();
  }

  function normalizeHandleForRule(handle) {
    const normalized = normalizeWhitespace(handle || "").replace(/^@+/, "").toLowerCase();
    if (!normalized) {
      return "";
    }

    const cleaned = normalized.replace(/[^a-z0-9_]/g, "");
    return cleaned ? `@${cleaned}` : "";
  }

  function containsBlockedProfileEmoji(text) {
    return (text || "").includes("🌸");
  }

  function countEmoji(text) {
    const matches = (text || "").match(/[\p{Extended_Pictographic}\uFE0F]/gu);
    return matches ? matches.length : 0;
  }

  function sanitizeForRule(text) {
    return normalizeWhitespace(text || "").replace(/[^\p{Script=Han}\p{Letter}\p{Number}\p{Symbol}\p{Extended_Pictographic}\uFE0F\u200D ]/gu, "");
  }

  function hasChinese(text) {
    return /[\u4e00-\u9fff]/.test(text);
  }

  function countChineseAwareLength(text) {
    return normalizeWhitespace(text).replace(/\s/g, "").length;
  }

  function createDefaultSettings() {
    return {
      shortKeywords: [...DEFAULT_SHORT_KEYWORDS],
      profileKeywords: [...PROFILE_BLOCK_KEYWORDS],
      whitelistHandles: [],
      customShortKeywords: []
    };
  }

  async function getSettings() {
    const stored = await chrome.storage.local.get(STORAGE_KEY);
    const merged = {
      ...createDefaultSettings(),
      ...(stored[STORAGE_KEY] || {})
    };

    merged.shortKeywords = Array.from(new Set(merged.shortKeywords.filter(Boolean)));
    merged.profileKeywords = Array.from(new Set((merged.profileKeywords || PROFILE_BLOCK_KEYWORDS).filter(Boolean)));
    merged.whitelistHandles = Array.from(
      new Set((merged.whitelistHandles || []).map((item) => normalizeHandleForRule(item)).filter(Boolean))
    );
    merged.customShortKeywords = Array.from(new Set(merged.customShortKeywords.filter(Boolean)));

    return merged;
  }

  async function saveSettings(settings) {
    const normalized = {
      shortKeywords: Array.from(new Set((settings.shortKeywords || []).map((item) => normalizeWhitespace(item)).filter(Boolean))),
      profileKeywords: Array.from(new Set((settings.profileKeywords || []).map((item) => normalizeWhitespace(item)).filter(Boolean))),
      whitelistHandles: Array.from(new Set((settings.whitelistHandles || []).map((item) => normalizeHandleForRule(item)).filter(Boolean))),
      customShortKeywords: Array.from(new Set((settings.customShortKeywords || []).map((item) => normalizeWhitespace(item)).filter(Boolean)))
    };

    await chrome.storage.local.set({
      [STORAGE_KEY]: normalized
    });

    return normalized;
  }

  async function resetDefaultShortKeywords() {
    const settings = await getSettings();
    settings.shortKeywords = [...DEFAULT_SHORT_KEYWORDS];
    return saveSettings(settings);
  }

  async function resetDefaultProfileKeywords() {
    const settings = await getSettings();
    settings.profileKeywords = [...PROFILE_BLOCK_KEYWORDS];
    return saveSettings(settings);
  }

  function buildCustomKeywordList(settings) {
    return (settings.customShortKeywords || [])
      .map((item) => sanitizeForRule(item))
      .filter(Boolean);
  }

  function buildDefaultKeywordList(settings) {
    return (settings.shortKeywords || [])
      .map((item) => sanitizeForRule(item))
      .filter(Boolean);
  }

  function isWhitelistedHandle(handle, settings = createDefaultSettings()) {
    const normalizedHandle = normalizeHandleForRule(handle);
    if (!normalizedHandle) {
      return false;
    }

    const whitelistHandles = (settings.whitelistHandles || [])
      .map((item) => normalizeHandleForRule(item))
      .filter(Boolean);
    return whitelistHandles.includes(normalizedHandle);
  }

  function matchPriorityText(rawText, settings) {
    const rawNormalized = normalizeWhitespace(rawText || "");
    if (countEmoji(rawNormalized) >= 3) {
      return {
        matched: true,
        reason: "emoji-threshold",
        keyword: "正文含3个及以上emoji",
        cleanedText: normalizeWhitespace(sanitizeForRule(rawText)),
        priority: "emoji-threshold"
      };
    }

    const cleaned = sanitizeForRule(rawText);
    const normalized = normalizeWhitespace(cleaned);

    if (!normalized) {
      return {
        matched: false,
        reason: "empty-text",
        cleanedText: normalized
      };
    }

    const customKeyword = buildCustomKeywordList(settings).find((entry) => normalized.includes(entry));
    if (customKeyword) {
      return {
        matched: true,
        reason: "custom-keyword",
        keyword: customKeyword,
        cleanedText: normalized,
        priority: "manual"
      };
    }

    return {
      matched: false,
      reason: "no-priority-keyword",
      cleanedText: normalized
    };
  }

  function matchText(rawText, settings) {
    const priorityMatch = matchPriorityText(rawText, settings);
    if (priorityMatch.matched) {
      return priorityMatch;
    }

    const normalized = priorityMatch.cleanedText;

    if (!hasChinese(normalized)) {
      return {
        matched: false,
        reason: "not-chinese",
        cleanedText: normalized
      };
    }

    if (countChineseAwareLength(normalized) > 40) {
      return {
        matched: false,
        reason: "too-long",
        cleanedText: normalized
      };
    }

    const keyword = buildDefaultKeywordList(settings).find((entry) => normalized.includes(entry));
    if (keyword) {
      return {
        matched: true,
        reason: "keyword",
        keyword,
        cleanedText: normalized
      };
    }

    return {
      matched: false,
      reason: "no-keyword",
      cleanedText: normalized
    };
  }

  function matchProfile(displayName, handle, hasEmojiNode = false, settings = createDefaultSettings()) {
    const normalizedName = normalizeWhitespace(displayName || "");
    const normalizedHandle = normalizeWhitespace(handle || "").replace(/^@/, "");
    const profileKeywords = (settings.profileKeywords || PROFILE_BLOCK_KEYWORDS)
      .map((item) => normalizeWhitespace(item))
      .filter(Boolean);
    const matchedProfileKeyword = profileKeywords.find((keyword) => normalizedName.includes(keyword)) || "";

    if (matchedProfileKeyword) {
      return {
        matched: true,
        reason: "profile-keyword",
        keyword: `昵称命中:${matchedProfileKeyword}`,
        cleanedText: normalizedName
      };
    }

    if (containsBlockedProfileEmoji(normalizedName)) {
      return {
        matched: true,
        reason: "flower-emoji",
        keyword: "昵称含🌸",
        cleanedText: normalizedName
      };
    }

    if (hasEmojiNode) {
      if (!/\d{5,}$/.test(normalizedHandle)) {
        return {
          matched: false,
          reason: "emoji-without-numeric-tail"
        };
      }

      return {
        matched: true,
        reason: "emoji-numeric-tail-id",
        keyword: "昵称含emoji + 账号尾号至少5位数字",
        cleanedText: normalizedHandle
      };
    }

    return {
      matched: false,
      reason: "no-profile-signal"
    };
  }

  function matchTweet(rawText, settings, profile = {}) {
    const profileMatch = matchProfile(profile.displayName, profile.handle, profile.hasEmojiNode, settings);
    if (profileMatch.matched) {
      return profileMatch;
    }

    return matchText(rawText, settings);
  }

  global.XHB = {
    DEFAULT_SHORT_KEYWORDS,
    STORAGE_KEY,
    containsBlockedProfileEmoji,
    countEmoji,
    createDefaultSettings,
    getSettings,
    saveSettings,
    resetDefaultShortKeywords,
    resetDefaultProfileKeywords,
    sanitizeForRule,
    normalizeHandleForRule,
    isWhitelistedHandle,
    matchPriorityText,
    matchProfile,
    matchText,
    matchTweet
  };
})(window);
