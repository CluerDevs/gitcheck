const $ = (id) => document.getElementById(id);

async function run(input) {
  const out = $("out");
  out.innerHTML = `<span class="gc-cursor">Checking</span>`;
  try {
    const { info, result, markdown } = await RepoVetter.vet(input);
    out.innerHTML = GCUI.reportHTML(info, result);
    GCUI.wireCopy(out, markdown);
  } catch (err) {
    out.innerHTML = `<div class="gc-err">ERROR: ${GCUI.esc(err.message)}</div>`;
  }
}

$("form").addEventListener("submit", (e) => {
  e.preventDefault();
  run($("url").value);
});

$("trending").addEventListener("click", () => {
  chrome.tabs.create({ url: chrome.runtime.getURL("src/trending.html") });
  window.close();
});

$("save").addEventListener("click", async () => {
  await chrome.storage.local.set({ token: $("token").value.trim() });
  $("save").textContent = "Saved";
});

(async () => {
  GCTheme.bindSelect($("theme"), document.documentElement);
  $("token").value = await RepoVetter.getToken();

  // Prefill from the active tab if it's a repo page.
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab && tab.url && tab.url.startsWith("https://github.com/")) {
    const parsed = RepoVetter.parseRepo(tab.url.replace("https://github.com/", "").split("/").slice(0, 2).join("/"));
    if (parsed) {
      $("url").value = `${parsed.owner}/${parsed.repo}`;
      run($("url").value);
    }
  }
})();
