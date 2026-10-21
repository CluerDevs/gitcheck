// Floating GitCheck pill on GitHub repo pages. Click to run a check, themed like the popup.
(function () {
  const ID = "repo-vetter-pill";
  const cache = new Map();
  let theme = "terminal";

  function currentRepo() {
    const parts = location.pathname.split("/").filter(Boolean);
    if (parts.length < 2) return null;
    return RepoVetter.parseRepo(`${parts[0]}/${parts[1]}`);
  }

  function titleBar(onClose) {
    return `<div class="gc-title"><span>GitCheck.exe</span>${onClose ? `<button class="gc-x" aria-label="Close">×</button>` : ""}</div>`;
  }

  function showButton(pill) {
    pill.innerHTML = `<button class="gc-btn gc-launch">▶ GitCheck this repo</button>`;
    pill.querySelector(".gc-launch").onclick = () => run(pill);
  }

  function showPanel(pill, bodyHTML, onClose = true) {
    pill.innerHTML = `<div class="gc-panel">${titleBar(onClose)}<div class="gc-body">${bodyHTML}</div></div>`;
    const x = pill.querySelector(".gc-x");
    if (x) x.onclick = () => showButton(pill);
  }

  async function run(pill) {
    const repo = currentRepo();
    if (!repo) return;
    const key = `${repo.owner}/${repo.repo}`;
    showPanel(pill, `<span class="gc-cursor">Checking ${GCUI.esc(key)}</span>`, false);
    try {
      if (!cache.has(key)) cache.set(key, await RepoVetter.vet(key));
      const { info, result, markdown } = cache.get(key);
      showPanel(pill, GCUI.reportHTML(info, result));
      GCUI.wireCopy(pill, markdown);
    } catch (err) {
      showPanel(pill, `<div class="gc-err">ERROR: ${GCUI.esc(err.message)}</div>`);
    }
  }

  function mount() {
    const existing = document.getElementById(ID);
    const repo = currentRepo();
    if (!repo) {
      if (existing) existing.remove();
      return;
    }
    const key = `${repo.owner}/${repo.repo}`;
    if (existing && existing.dataset.repo === key) return;
    if (existing) existing.remove();

    const pill = document.createElement("div");
    pill.id = ID;
    pill.dataset.repo = key;
    GCTheme.apply(pill, theme);
    showButton(pill);
    document.body.appendChild(pill);
  }

  GCTheme.watch((id) => {
    theme = id;
    const pill = document.getElementById(ID);
    if (pill) GCTheme.apply(pill, id);
  });

  // GitHub navigates without full reloads, so re-check on its events and on URL change.
  let lastPath = location.pathname;
  const check = () => {
    if (location.pathname !== lastPath) {
      lastPath = location.pathname;
      mount();
    }
  };
  document.addEventListener("turbo:render", check);
  document.addEventListener("pjax:end", check);
  setInterval(check, 1000);

  GCTheme.get().then((id) => {
    theme = id;
    mount();
  });
})();
