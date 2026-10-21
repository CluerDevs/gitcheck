# Chrome Web Store listing: GitCheck

Paste these into the Developer Dashboard. Fields match the dashboard's labels.

## Store listing tab

**Name:** GitCheck

**Summary (118/132 chars):**
Vet any GitHub repo in one click: health, license and risk score, plus trending repos by genre. Retro themes included.

**Category:** Developer Tools  **Language:** English

**Description:**
```
Is this GitHub repo actually worth your time? GitCheck tells you in seconds.

Open any repo and click the GitCheck button. You get a 0–100 score and a plain-English list of green lights and red flags, so you can decide before you clone, install, or send the link to your team.

WHAT IT CHECKS
• Activity: when the last push happened
• Community: contributors and stars
• Maintenance: tagged releases and issue load
• License: permissive, copyleft, non-standard, or missing
• Hygiene: tests, CI, README
• Red flags: archived repos, forks, bus factor (one person doing everything), and suspicious star spikes on brand-new repos

TRENDING REPOS BY GENRE
A built-in page of fresh, fast-rising repos for AI Agents, LLMs, Machine Learning, Dev Tools, CLI, Automation, Security, Frontend, Games and Self-Hosted. Choose a time window, check any repo in one click, and copy a ready-made list to paste into Slack or Teams.

SHARE WITH YOUR TEAM
"Copy for team" puts a clean Markdown summary on your clipboard: name, score, stars, license and flags.

FIVE RETRO THEMES
Green Terminal, Amber CRT, Win 95, Synthwave and Game Boy. Pick one and it applies everywhere.

PRIVATE BY DESIGN
No account, no tracking, no analytics. GitCheck talks only to the public GitHub API. An optional GitHub token (for higher rate limits) stays in your browser.

Notes: "Trending" ranks recently created repos by stars, because GitHub offers no official trending API. Scores are a quick heuristic to help you decide, not a security audit. GitCheck is an independent tool and is not affiliated with or endorsed by GitHub.
```

## Graphic assets
- Icon: `store/icon-128.png`
- Screenshots (1280×800): `store/screenshots/1…5`
- Small promo tile (440×280): `store/promo-small-440x280.png`
- Marquee (1400×560, optional): `store/promo-marquee-1400x560.png`

## Privacy tab

**Single purpose:**
Show a quality and risk summary for the GitHub repository the user is viewing, and browse trending GitHub repositories by genre.

**Permission justifications**
| Permission | Justification |
|---|---|
| `storage` | Saves the user's chosen theme and optional GitHub API token locally, and caches trending results for 30 minutes. |
| `activeTab` | Lets the toolbar popup read the URL of the current tab to pre-fill the repo being checked. |
| `clipboardWrite` | Powers the "Copy for team" and "Copy link" buttons. |
| Host `https://api.github.com/*` | Fetches public repository metadata (stars, license, releases, contributors, file list) and search results to compute the score and trending lists. |
| Content script on `https://github.com/*` | Shows the GitCheck button and results panel on repository pages. |

**Remote code:** No. All code ships in the package.

**Data usage disclosures:** Tick none of the data-type boxes. GitCheck does not collect or transmit user data to the developer. Then certify all three statements (no sale of data, no use unrelated to the single purpose, no use for creditworthiness or lending).

**Privacy policy URL:** host `store/privacy.html` somewhere public (GitHub Pages, your site, or a published page) and paste the URL.

## Distribution tab
- Visibility: Public
- Pricing: the Chrome Web Store no longer supports paid extensions, so the $1 charge has to come from your own checkout (Gumroad or Lemon Squeezy license key). The store listing itself is free.
- Developer account: one-time $5 registration fee.

## Before you submit
- [ ] Add your support email in the dashboard
- [ ] Host the privacy policy and paste its URL
- [ ] Upload `store/gitcheck-0.2.0.zip`
- [ ] Search the Web Store and USPTO for "GitCheck" conflicts
