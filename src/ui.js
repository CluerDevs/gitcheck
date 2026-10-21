// Shared markup helpers so popup, trending page and on-page panel render reports identically.
(function (root) {
  function esc(s) {
    return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  }

  const tone = (score) => (score >= 75 ? "good" : score >= 50 ? "ok" : "bad");

  // Glyphs, not emoji, so the retro themes stay monochrome. The Markdown copy keeps emoji for Slack/Teams.
  function reportHTML(info, result, { copy = true } = {}) {
    const t = tone(result.score);
    return `
      <div class="gc-report">
        <div class="gc-scorebox gc-${t}"><span class="gc-big">${result.score}</span><span class="gc-of">/100</span></div>
        <div>
          <div class="gc-name">${esc(info.full_name)}</div>
          <div class="gc-verdict gc-${t}">${esc(result.verdict)}</div>
        </div>
        <div class="gc-bar gc-${t}" role="img" aria-label="Score ${result.score} out of 100"><span style="width:${result.score}%"></span></div>
        <ul class="gc-list">
          ${result.good.map((g) => `<li class="gc-good"><span class="gc-tag">[+]</span><span>${esc(g)}</span></li>`).join("")}
          ${result.flags.map((f) => `<li class="gc-flag"><span class="gc-tag">[!]</span><span>${esc(f)}</span></li>`).join("")}
        </ul>
      </div>
      ${copy ? `<button class="gc-btn gc-block gc-copy">Copy for team</button>` : ""}`;
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }

  function wireCopy(container, text, label = "Copy for team") {
    const btn = container.querySelector(".gc-copy");
    if (!btn) return;
    btn.onclick = async () => {
      btn.textContent = (await copyText(text)) ? "Copied!" : "Copy failed";
      setTimeout(() => (btn.textContent = label), 1500);
    };
  }

  root.GCUI = { esc, tone, reportHTML, copyText, wireCopy };
})(self);
