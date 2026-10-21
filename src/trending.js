const $ = (id) => document.getElementById(id);

// One topic per genre: GitHub's repo search ANDs multiple topics together.
const GENRES = [
  { id: "all", name: "All", q: "stars:>10" },
  { id: "agents", name: "AI Agents", q: "topic:ai-agents" },
  { id: "llm", name: "LLMs", q: "topic:llm" },
  { id: "ml", name: "Machine Learning", q: "topic:machine-learning" },
  { id: "devtools", name: "Dev Tools", q: "topic:developer-tools" },
  { id: "cli", name: "CLI", q: "topic:cli" },
  { id: "automation", name: "Automation", q: "topic:automation" },
  { id: "security", name: "Security", q: "topic:security" },
  { id: "frontend", name: "Frontend", q: "topic:frontend" },
  { id: "games", name: "Games", q: "topic:game-development" },
  { id: "selfhosted", name: "Self-Hosted", q: "topic:self-hosted" },
];
const RANGES = [
  { days: 7, name: "Past week" },
  { days: 30, name: "Past month" },
  { days: 90, name: "Past 3 months" },
];
const CACHE_MS = 30 * 60 * 1000;

const state = { genre: GENRES[0], days: 30, items: [] };

function fmt(n) {
  return n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(n);
}

async function fetchTrending(genre, days) {
  const cacheKey = `trend:${genre.id}:${days}`;
  try {
    const hit = (await chrome.storage.local.get(cacheKey))[cacheKey];
    if (hit && Date.now() - hit.t < CACHE_MS) return hit.items;
  } catch {}

  const since = new Date(Date.now() - days * 864e5).toISOString().slice(0, 10);
  const q = `${genre.q} created:>${since}`;
  const headers = { Accept: "application/vnd.github+json" };
  const token = await RepoVetter.getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(
    `https://api.github.com/search/repositories?q=${encodeURIComponent(q)}&sort=stars&order=desc&per_page=24`,
    { headers }
  );
  if (res.status === 403 || res.status === 429) {
    throw new Error("GitHub search rate limit hit (10/min without a token). Add a token in the popup settings, or wait a minute.");
  }
  if (!res.ok) throw new Error(`GitHub API error ${res.status}`);
  const items = (await res.json()).items.map((r) => ({
    full_name: r.full_name,
    html_url: r.html_url,
    description: r.description,
    stars: r.stargazers_count,
    forks: r.forks_count,
    language: r.language,
    created_at: r.created_at,
  }));
  try {
    await chrome.storage.local.set({ [cacheKey]: { t: Date.now(), items } });
  } catch {}
  return items;
}

function cardHTML(r, i) {
  return `
    <article class="card" data-name="${GCUI.esc(r.full_name)}">
      <div class="rank">${i + 1}</div>
      <div>
        <h2><a href="${GCUI.esc(r.html_url)}" target="_blank" rel="noopener">${GCUI.esc(r.full_name)}</a></h2>
        <p class="desc">${GCUI.esc(r.description || "No description")}</p>
        <div class="meta gc-dim">
          <span>★ ${fmt(r.stars)}</span><span>⑂ ${fmt(r.forks)}</span>
          <span>${GCUI.esc(r.language || "n/a")}</span><span>born ${r.created_at.slice(0, 10)}</span>
        </div>
        <div class="actions">
          <button class="gc-btn gc-sm check">Check</button>
          <button class="gc-btn gc-sm link">Copy link</button>
        </div>
      </div>
      <div class="report" hidden></div>
    </article>`;
}

async function render() {
  const list = $("list");
  $("status").textContent = "loading…";
  list.innerHTML = `<div class="empty gc-cursor">Fetching</div>`;
  try {
    state.items = await fetchTrending(state.genre, state.days);
    $("status").textContent = `${state.items.length} repos`;
    list.innerHTML = state.items.length
      ? state.items.map(cardHTML).join("")
      : `<div class="empty gc-dim">Nothing found. Try a longer window.</div>`;
  } catch (err) {
    state.items = [];
    $("status").textContent = "error";
    list.innerHTML = `<div class="empty gc-err">ERROR: ${GCUI.esc(err.message)}</div>`;
  }
}

function renderTabs() {
  $("genres").innerHTML = GENRES.map(
    (g) => `<button class="gc-btn gc-sm" role="tab" data-id="${g.id}" aria-selected="${g.id === state.genre.id}">${g.name}</button>`
  ).join("");
}

$("genres").addEventListener("click", (e) => {
  const btn = e.target.closest("[data-id]");
  if (!btn) return;
  state.genre = GENRES.find((g) => g.id === btn.dataset.id);
  renderTabs();
  render();
});

$("range").innerHTML = RANGES.map((r) => `<option value="${r.days}">${r.name}</option>`).join("");
$("range").value = state.days;
$("range").addEventListener("change", () => {
  state.days = Number($("range").value);
  render();
});

$("list").addEventListener("click", async (e) => {
  const card = e.target.closest(".card");
  if (!card) return;
  const name = card.dataset.name;
  const item = state.items.find((r) => r.full_name === name);

  if (e.target.classList.contains("link")) {
    e.target.textContent = (await GCUI.copyText(item.html_url)) ? "Copied!" : "Failed";
    setTimeout(() => (e.target.textContent = "Copy link"), 1500);
  }

  if (e.target.classList.contains("check")) {
    const btn = e.target;
    const report = card.querySelector(".report");
    if (!report.hidden) {
      report.hidden = true;
      return;
    }
    report.hidden = false;
    report.innerHTML = `<span class="gc-cursor">Checking</span>`;
    btn.disabled = true;
    try {
      const { info, result, markdown } = await RepoVetter.vet(name);
      report.innerHTML = GCUI.reportHTML(info, result);
      GCUI.wireCopy(report, markdown);
    } catch (err) {
      report.innerHTML = `<div class="gc-err">ERROR: ${GCUI.esc(err.message)}</div>`;
    }
    btn.disabled = false;
  }
});

$("copyAll").addEventListener("click", async (e) => {
  const lines = state.items
    .slice(0, 10)
    .map((r) => `- [${r.full_name}](${r.html_url}) (★ ${fmt(r.stars)}, ${r.language || "n/a"}): ${r.description || ""}`.trim());
  const text = `**Trending in ${state.genre.name}** (${RANGES.find((x) => x.days === state.days).name.toLowerCase()})\n${lines.join("\n")}`;
  e.target.textContent = (await GCUI.copyText(text)) ? "Copied!" : "Failed";
  setTimeout(() => (e.target.textContent = "Copy list for team"), 1500);
});

GCTheme.bindSelect($("theme"), document.documentElement);
renderTabs();
render();
