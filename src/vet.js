// Core vetting logic. Loaded as a plain script in both the content script and the popup,
// so everything hangs off a single global.
(function (root) {
  const API = "https://api.github.com";
  const DAY = 86400000;

  const PERMISSIVE = ["mit", "apache-2.0", "bsd-2-clause", "bsd-3-clause", "isc", "unlicense", "0bsd", "cc0-1.0"];
  const COPYLEFT = ["gpl-2.0", "gpl-3.0", "agpl-3.0", "lgpl-2.1", "lgpl-3.0", "mpl-2.0"];

  // Non-repo top-level GitHub paths, so /settings/profile isn't treated as owner/repo.
  const RESERVED = new Set([
    "settings", "orgs", "marketplace", "explore", "topics", "trending", "notifications",
    "login", "signup", "pricing", "features", "sponsors", "collections", "issues", "pulls", "search",
  ]);

  function parseRepo(input) {
    const m = String(input || "").trim().match(/^(?:https?:\/\/github\.com\/)?([\w.-]+)\/([\w.-]+?)(?:\.git)?(?:[/?#].*)?$/);
    if (!m || RESERVED.has(m[1].toLowerCase())) return null;
    return { owner: m[1], repo: m[2] };
  }

  async function gh(path, token) {
    const headers = { Accept: "application/vnd.github+json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(API + path, { headers });
    if (res.status === 404) return null;
    if (res.status === 403 || res.status === 429) {
      const reset = res.headers.get("x-ratelimit-reset");
      const when = reset ? new Date(reset * 1000).toLocaleTimeString() : "later";
      throw new Error(`GitHub rate limit hit. Add a token in settings or retry after ${when}.`);
    }
    if (!res.ok) throw new Error(`GitHub API error ${res.status}`);
    return res.json();
  }

  async function fetchRepoData(owner, repo, token) {
    const base = `/repos/${owner}/${repo}`;
    const info = await gh(base, token);
    if (!info) throw new Error(`Repo ${owner}/${repo} not found (or private).`);
    const [contributors, release, contents] = await Promise.all([
      gh(`${base}/contributors?per_page=100`, token),
      gh(`${base}/releases/latest`, token),
      gh(`${base}/contents/`, token),
    ]);
    return { info, contributors: contributors || [], release, contents: Array.isArray(contents) ? contents : [] };
  }

  function daysSince(iso) {
    return iso ? (Date.now() - new Date(iso).getTime()) / DAY : Infinity;
  }

  function score({ info, contributors, release, contents }) {
    const flags = [];
    const good = [];
    const parts = {};

    // Activity (30)
    const idle = daysSince(info.pushed_at);
    parts.activity = idle < 30 ? 30 : idle < 90 ? 22 : idle < 180 ? 12 : idle < 365 ? 5 : 0;
    if (idle < 30) good.push("Pushed to in the last 30 days");
    else if (idle > 365) flags.push(`No pushes in ${Math.round(idle / 30)} months`);
    else if (idle > 180) flags.push("No pushes in 6+ months");

    // Community (20): stars (log scale) + contributors
    const stars = info.stargazers_count;
    const contribCount = contributors.length;
    parts.community =
      Math.min(10, Math.round(Math.log10(stars + 1) * 2.5)) + Math.min(10, Math.round(contribCount / 2));
    if (contribCount >= 10) good.push(`${contribCount >= 100 ? "100+" : contribCount} contributors`);

    // Bus factor
    const total = contributors.reduce((n, c) => n + c.contributions, 0);
    if (total > 0 && contribCount > 0) {
      const share = contributors[0].contributions / total;
      if (share > 0.8 && total > 50) flags.push(`Bus factor: one person made ${Math.round(share * 100)}% of commits`);
    }

    // Maintenance (20): releases + issue load
    let maint = 0;
    if (release) {
      const relAge = daysSince(release.published_at);
      maint += relAge < 365 ? 10 : 4;
      if (relAge < 180) good.push("Recent tagged release");
    } else {
      flags.push("No tagged releases");
    }
    const issueLoad = info.open_issues_count / Math.max(1, stars);
    maint += issueLoad < 0.02 ? 10 : issueLoad < 0.08 ? 6 : 2;
    parts.maintenance = maint;

    // License (15)
    const spdx = (info.license && info.license.spdx_id || "").toLowerCase();
    if (PERMISSIVE.includes(spdx)) {
      parts.license = 15;
      good.push(`${info.license.spdx_id} license (permissive)`);
    } else if (COPYLEFT.includes(spdx)) {
      parts.license = 10;
      flags.push(`${info.license.spdx_id} is copyleft; check it fits commercial use`);
    } else if (spdx) {
      parts.license = 6;
      flags.push(`Non-standard license (${info.license.spdx_id}); read it`);
    } else {
      parts.license = 0;
      flags.push("No license: legally you can't use it");
    }

    // Hygiene (15): tests, CI, readme, description
    const names = contents.map((c) => c.name.toLowerCase());
    const hasTests = names.some((n) => /^(tests?|__tests__|spec|e2e)$/.test(n));
    const hasCI = names.includes(".github") || names.includes(".circleci") || names.includes(".gitlab-ci.yml");
    const hasReadme = names.some((n) => n.startsWith("readme"));
    parts.hygiene = (hasTests ? 6 : 0) + (hasCI ? 4 : 0) + (hasReadme ? 3 : 0) + (info.description ? 2 : 0);
    if (!hasTests) flags.push("No top-level tests directory");
    else good.push("Has tests");
    if (!hasReadme) flags.push("No README");

    // Trust flags (no points, only warnings)
    if (info.archived) {
      flags.unshift("Archived: read-only, no maintenance");
      parts.activity = 0;
    }
    if (info.fork) flags.push("This is a fork; check the upstream");
    if (stars > 1000 && info.forks_count / stars < 0.01) {
      flags.push("Unusually few forks for its star count (possible star inflation)");
    }
    const ageDays = daysSince(info.created_at);
    if (ageDays < 30 && stars > 500) flags.push(`${stars} stars in ${Math.max(1, Math.round(ageDays))} days; verify it isn't hype`);

    const total100 = Math.max(0, Math.min(100, Object.values(parts).reduce((a, b) => a + b, 0)));
    const verdict = total100 >= 75 ? "Solid" : total100 >= 50 ? "Okay, with caveats" : total100 >= 30 ? "Risky" : "Avoid";
    return { score: total100, verdict, parts, flags, good };
  }

  function toMarkdown(info, result) {
    const lines = [
      `**[${info.full_name}](${info.html_url})** — ${result.score}/100 (${result.verdict})`,
      info.description ? `> ${info.description}` : null,
      `⭐ ${info.stargazers_count.toLocaleString()} · 🍴 ${info.forks_count.toLocaleString()} · ${info.language || "n/a"} · last push ${info.pushed_at.slice(0, 10)}`,
      ...result.good.map((g) => `✅ ${g}`),
      ...result.flags.map((f) => `⚠️ ${f}`),
    ];
    return lines.filter(Boolean).join("\n");
  }

  async function getToken() {
    try {
      const { token } = await chrome.storage.local.get("token");
      return token || "";
    } catch {
      return "";
    }
  }

  async function vet(input) {
    const parsed = parseRepo(input);
    if (!parsed) throw new Error("That doesn't look like a GitHub repo URL.");
    const data = await fetchRepoData(parsed.owner, parsed.repo, await getToken());
    const result = score(data);
    return { info: data.info, result, markdown: toMarkdown(data.info, result) };
  }

  root.RepoVetter = { parseRepo, vet, score, toMarkdown, getToken };
})(typeof self !== "undefined" ? self : this);
