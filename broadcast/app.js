(function () {
  const DATA_URL = "./data/sites.json";
  const NOTICE_URL = "./data/notice.md";
  const CACHE_BUSTER = () => `v=${Date.now()}`;
  const THEME_KEY = "broadcast-theme";
  const THEME_CHOICES = ["light", "dark", "system"];
  const PRIORITY_TAGS = ["全部", "签到", "生图", "DC系", "半DC系", "非DC", "抽奖"];
  const TAG_CLASS = {
    "签到": "checkin",
    "生图": "image"
  };
  const DATE_PATTERN = /(20\d{2})\s*[-/.年]\s*(\d{1,2})\s*[-/.月]\s*(\d{1,2})\s*(?:日)?/g;

  const state = {
    sites: [],
    metadata: {},
    activeTag: "全部",
    query: ""
  };

  const els = {
    searchInput: document.getElementById("searchInput"),
    summaryStrip: document.getElementById("summaryStrip"),
    filterRow: document.getElementById("filterRow"),
    noticeBand: document.getElementById("noticeBand"),
    noticeContent: document.getElementById("noticeContent"),
    cardsArea: document.getElementById("cardsArea"),
    template: document.getElementById("siteCardTemplate"),
    themeButtons: document.querySelectorAll("[data-theme-choice]")
  };

  const colorSchemeQuery =
    window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)");

  function unique(values) {
    return Array.from(new Set(values.filter(Boolean)));
  }

  function getStoredTheme() {
    try {
      const value = localStorage.getItem(THEME_KEY) || "system";
      return THEME_CHOICES.includes(value) ? value : "system";
    } catch {
      return document.documentElement.dataset.themeChoice || "system";
    }
  }

  function resolveTheme(choice) {
    if (choice === "system") {
      return colorSchemeQuery && colorSchemeQuery.matches ? "dark" : "light";
    }
    return choice;
  }

  function applyTheme(choice, persist = false) {
    const safeChoice = THEME_CHOICES.includes(choice) ? choice : "system";
    document.documentElement.dataset.theme = resolveTheme(safeChoice);
    document.documentElement.dataset.themeChoice = safeChoice;

    els.themeButtons.forEach((button) => {
      const active = button.dataset.themeChoice === safeChoice;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });

    if (persist) {
      try {
        localStorage.setItem(THEME_KEY, safeChoice);
      } catch {
        // Storage can be unavailable in strict browser modes.
      }
    }
  }

  function initTheme() {
    els.themeButtons.forEach((button) => {
      button.addEventListener("click", () => {
        applyTheme(button.dataset.themeChoice, true);
      });
    });

    if (colorSchemeQuery) {
      const handleChange = () => {
        if (getStoredTheme() === "system") applyTheme("system");
      };

      if (colorSchemeQuery.addEventListener) {
        colorSchemeQuery.addEventListener("change", handleChange);
      } else if (colorSchemeQuery.addListener) {
        colorSchemeQuery.addListener(handleChange);
      }
    }

    applyTheme(getStoredTheme());
  }

  function todayInShanghai() {
    const parts = new Intl.DateTimeFormat("en", {
      timeZone: "Asia/Shanghai",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).formatToParts(new Date());
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}`;
  }

  function extractDescriptionDates(site) {
    const text = [
      site.checkin,
      site.summary,
      site.register,
      site.models,
      site.rate,
      ...(site.notes || [])
    ]
      .filter(Boolean)
      .join(" ");

    return Array.from(text.matchAll(DATE_PATTERN), (match) => {
      const [, year, month, day] = match;
      return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    });
  }

  function isCurrentDatedSite(site) {
    const dates = extractDescriptionDates(site);
    return !dates.length || dates.every((date) => date === todayInShanghai());
  }

  function matches(site) {
    const haystack = [
      site.name,
      site.url,
      site.checkin,
      site.summary,
      ...(site.tags || []),
      ...(site.notes || [])
    ]
      .join(" ")
      .toLowerCase();

    const queryMatch = !state.query || haystack.includes(state.query.toLowerCase());
    const tagMatch = state.activeTag === "全部" || (site.tags || []).includes(state.activeTag);
    return queryMatch && tagMatch;
  }

  function filteredSites() {
    return state.sites.filter(matches);
  }

  function renderSummary() {
    const visible = filteredSites();
    const stats = [
      ["收录", visible.length],
      ["可签到", visible.filter((site) => (site.tags || []).includes("签到")).length],
      ["可生图", visible.filter((site) => (site.tags || []).includes("生图")).length]
    ];

    els.summaryStrip.replaceChildren(
      ...stats.map(([label, value]) => {
        const item = document.createElement("div");
        item.className = "summary-item";
        const strong = document.createElement("strong");
        strong.textContent = String(value);
        const span = document.createElement("span");
        span.textContent = label;
        item.append(strong, span);
        return item;
      })
    );
  }

  function renderFilters() {
    const allTags = unique(state.sites.flatMap((site) => site.tags || []));
    const ordered = [
      ...PRIORITY_TAGS.filter((tag) => tag === "全部" || allTags.includes(tag)),
      ...allTags.filter((tag) => !PRIORITY_TAGS.includes(tag)).sort((a, b) => a.localeCompare(b, "zh-CN"))
    ];

    els.filterRow.replaceChildren(
      ...ordered.map((tag) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = `filter-button${tag === state.activeTag ? " is-active" : ""}`;
        button.textContent = tag;
        button.addEventListener("click", () => {
          state.activeTag = tag;
          render();
        });
        return button;
      })
    );
  }

  function appendFact(list, label, value) {
    if (!value) return;
    const row = document.createElement("div");
    const dt = document.createElement("dt");
    const dd = document.createElement("dd");
    dt.textContent = label;
    dd.textContent = value;
    row.append(dt, dd);
    list.append(row);
  }

  function makeTags(tags) {
    return (tags || []).map((tag) => {
      const item = document.createElement("li");
      const span = document.createElement("span");
      span.className = `tag ${TAG_CLASS[tag] || ""}`.trim();
      span.textContent = tag;
      item.append(span);
      return item;
    });
  }

  function makeCard(site) {
    const node = els.template.content.firstElementChild.cloneNode(true);

    node.querySelector("h2").textContent = site.name;
    node.querySelector(".summary").textContent = site.summary || "";

    const facts = node.querySelector(".quick-facts");
    appendFact(facts, "签到", site.checkin);
    appendFact(facts, "模型", site.models);
    appendFact(facts, "注册", site.register);
    appendFact(facts, "倍率", site.rate);

    node.querySelector(".tag-list-top").replaceChildren(...makeTags(site.tags));

    const notes = node.querySelector(".notes");
    (site.notes || []).forEach((text) => {
      const p = document.createElement("p");
      p.textContent = text;
      notes.append(p);
    });

    const link = node.querySelector(".visit-link");
    link.href = site.url;
    link.setAttribute("aria-label", `访问 ${site.name}`);
    return node;
  }

  function renderCards() {
    const visible = filteredSites();
    if (!visible.length) {
      const empty = document.createElement("div");
      empty.className = "empty-state";
      empty.textContent = "没有匹配的站点。";
      els.cardsArea.replaceChildren(empty);
      return;
    }

    const grid = document.createElement("div");
    grid.className = "card-grid";
    grid.replaceChildren(...visible.map(makeCard));
    els.cardsArea.replaceChildren(grid);
  }

  function renderNotice(markdown) {
    const text = markdown.trim();
    if (!text) return;

    const paragraphs = text
      .split(/\n{2,}/)
      .map((block) => block.trim())
      .filter(Boolean)
      .slice(0, 3);

    els.noticeContent.replaceChildren(
      ...paragraphs.map((block) => {
        const p = document.createElement("p");
        p.textContent = block.replace(/\n/g, " ");
        return p;
      })
    );
    els.noticeBand.hidden = false;
  }

  function render() {
    renderSummary();
    renderFilters();
    renderCards();
  }

  async function loadJson() {
    const res = await fetch(`${DATA_URL}?${CACHE_BUSTER()}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`sites.json ${res.status}`);
    return res.json();
  }

  async function loadNotice() {
    try {
      const res = await fetch(`${NOTICE_URL}?${CACHE_BUSTER()}`, { cache: "no-store" });
      if (res.ok) renderNotice(await res.text());
    } catch {
      els.noticeBand.hidden = true;
    }
  }

  async function init() {
    try {
      const data = await loadJson();
      state.metadata = data.metadata || {};
      state.sites = (data.sites || []).filter(isCurrentDatedSite);
      render();
      loadNotice();
    } catch (error) {
      const box = document.createElement("div");
      box.className = "error-state";
      box.textContent = `数据加载失败：${error.message}`;
      els.cardsArea.replaceChildren(box);
      els.summaryStrip.replaceChildren();
      els.filterRow.replaceChildren();
    }
  }

  els.searchInput.addEventListener("input", (event) => {
    state.query = event.target.value.trim();
    render();
  });

  initTheme();
  init();
})();
