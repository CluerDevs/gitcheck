// Theme selection, persisted in chrome.storage and shared by popup, trending page and on-page panel.
(function (root) {
  const THEMES = [
    { id: "terminal", name: "Green Terminal" },
    { id: "amber", name: "Amber CRT" },
    { id: "win95", name: "Win 95" },
    { id: "synthwave", name: "Synthwave" },
    { id: "gameboy", name: "Game Boy" },
  ];
  const KEY = "theme";

  async function get() {
    try {
      const o = await chrome.storage.local.get(KEY);
      return THEMES.some((t) => t.id === o[KEY]) ? o[KEY] : THEMES[0].id;
    } catch {
      return THEMES[0].id;
    }
  }

  async function set(id) {
    try {
      await chrome.storage.local.set({ [KEY]: id });
    } catch {}
  }

  function apply(el, id) {
    el.setAttribute("data-theme", id);
  }

  function watch(cb) {
    try {
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area === "local" && changes[KEY]) cb(changes[KEY].newValue);
      });
    } catch {}
  }

  // Fills a <select> with the theme list and keeps it in sync with `target`.
  async function bindSelect(select, target) {
    select.innerHTML = THEMES.map((t) => `<option value="${t.id}">${t.name}</option>`).join("");
    const current = await get();
    select.value = current;
    apply(target, current);
    select.addEventListener("change", () => {
      apply(target, select.value);
      set(select.value);
    });
    watch((id) => {
      select.value = id;
      apply(target, id);
    });
  }

  root.GCTheme = { THEMES, get, set, apply, watch, bindSelect };
})(self);
