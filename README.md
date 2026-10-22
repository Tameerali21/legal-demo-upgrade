# ⚖️ Copperline Legal Group — "Never Miss a Customer" Legal Demo

Interactive demo for Tameer's outreach system, niche #6 of 8 (Legal).

## What this is

A fictional Denver law-firm site (**Copperline Legal Group**, 1420 Wazee St,
Suite 210, Denver, CO 80202, (303) 555-0184 — all fictional, 555-range) with
**Jordan**, an AI client coordinator chat widget.

## The demo moment (open the page, try these)

| Try | What Jordan does |
|---|---|
| "emergency" / "I was just arrested" | After-hours 11:47 PM notice → urgent intake with **HIGH** urgency flag → owner-dashboard lead card ("See that card? That's what the firm wakes up to…") |
| "Free consultation" chip | Guided booking: matter → name → phone (validated, skippable) → day → time → confirmation with **CL-XXXX** ref |
| "Do I have a case?" chip | 2-minute intake: matter → when → injured? → description → name → phone → "attorney reviews within one business day" |
| "drunk driving defense cost" | DUI guidance + free first consult |
| "I was hurt in a crash" | Contingency explainer ("no fee unless we win") |
| "divorce" / "will cost" / "how much do you charge" | Family / estate / fee Q&A |
| "I want to leave a review" | 5★ → Google review button; <5★ → private feedback saved for the managing partner |
| "🧲 60-sec case quiz" chip | Lead-capture pilot (fleet pattern): matter → timeline → name → phone (validated) → "✅ Quiz complete!" case-profile card + "Case-match quiz — qualified lead" saved to the inbox — Jordan promises a personalized consultation plan, never invented outcomes/fees |

Leads persist in the browser only (`localStorage` key `nmc_legal_leads`) — no
server, no external requests. The on-page **"Captured leads" inbox preview**
under Hours & Location renders every captured lead (newest first, count badge,
browser-local label) straight from that localStorage key — it's the
prospect-visible proof of the "Saved to your dashboard" promise.

## Personalization

Append to the URL — the page rebrands itself:

```
?biz=Summit+Legal+Group&city=Aurora%2C+CO&address=...&phone=...
```

Name, tagline, city, address, phone, title, and booking ref prefix (e.g.
`SL-XXXX`) all follow `?biz=`.

## Run it locally

```bash
cd demo-legal && python3 -m http.server 8006
# open http://localhost:8006
```

Add `?fast=1` to skip typing delays (used by the verifier).

## Automated checks

151 end-to-end checks (incl. the Captured-leads inbox panel + the 2026-10-22
60-sec case-match quiz), zero console errors, zero network requests:

```bash
NODE_PATH=~/workspace/tools/pptr-setup/node_modules node ~/workspace/outreach/demo-deploy-zips/legal-verify-2026-10-22.js
```

## Files

- `index.html` — fictional firm site (hero, practice areas, how-it-works, hours/location)
- `assets/style.css` — navy + gold theme
- `assets/widget.js` — Jordan chat widget (6 flows)

## Honest limits (say these on calls)

- Jordan is a *demo* of the outreach system, not a real legal AI. A live
  version would need real attorney review and state-bar advertising compliance.
- Reviews are routed privately; nothing is ever posted without the client.
- This demo is 100% fictional — no real firm, no real clients, no real results.
