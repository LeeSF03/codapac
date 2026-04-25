# 8. QA and live preview

This page explains how Codapac checks the work and how you open the live preview to see it for yourself.

## What "QA" means here

**QA** stands for *quality assurance* — the checks that happen before a
change is considered shipped. In Codapac, **TESTEES** (your testing
agent) runs these checks automatically every time **FIXER** finishes a
card.

You don't run QA yourself. You just see the result.

## Reading QA status on a card

Open any card on the board. Near the top you'll see a QA status:

- **Not started** — the card hasn't reached **Done** yet. Nothing to check
  so far.
- **Running** — TESTEES is checking it right now. A small spinner or
  pulsing dot shows it's live.
- **Passed (green)** — all checks are green. The card is ready to ship
  (move to **Merged**).
- **Failed (red)** — something's wrong. Open the card to see TESTEES'
  notes — they'll list each problem in plain English.

The activity feed also mirrors this:

- *"TESTEES started checking CP-142."*
- *"TESTEES found 2 issues on CP-142."*
- *"TESTEES approved CP-142 — ready to ship."*

## The live preview

Every project has a **live preview** — a real, working version of what
your squad has built so far. Think of it as a website you can visit and
click around, updated automatically every time a card is merged.

### Opening the preview

1. Open your project.
2. Click **Open preview** in the top bar.
3. A new browser tab opens with your live version, at an address like:

   `codapac.app/project/acme-landing`

It's a real, shareable URL. Send it to a friend, teammate, or anyone you
want to show.

### Previewing a specific change

Some cards produce their **own** preview link before they're merged, so
you can review just that change in isolation:

1. Open the card.
2. Click the preview link near the top (if one is shown).
3. A new tab opens with the change applied on top of the current project.

Once you approve, move the card to **Merged** (or tell the squad in chat).
The change then becomes part of the main live preview.

## Requesting fixes after you review

After looking at the preview, go back to the chat or the card and say what
you want:

- **All good:** *"Looks great, ship CP-142."*
- **Small tweak:** *"The button feels cramped — add a little more padding
  and a hover state."*
- **Bigger rethink:** *"This layout isn't working. Let's try a split
  design with the image on the right."*
- **Found a bug:** *"On mobile, the pricing cards stack weirdly — please
  fix."*

Your squad handles the rest. Cards move back a lane automatically while
the work is being redone.

## Sharing the preview

The live preview link is public by default — anyone with the URL can
open it. If you want to keep your project private, you can make it
private from the project menu (the "..." in the top bar) → **Visibility**.

## Tips

- **Refresh the preview** after a card merges — you might be looking at an
  older version otherwise.
- **Test on mobile.** Open the preview on your phone, or resize the
  browser. Most issues hide on mobile.
- **Ask for specific checks.** *"TESTEES, please check this on mobile and
  in dark mode"* gets you a thorough review.

## If something goes wrong

- **"The preview link gives an error."** It may still be building. Wait a
  minute and refresh.
- **"The preview is showing an old version."** Hard-refresh the tab
  (Ctrl+Shift+R on Windows, Cmd+Shift+R on Mac).
- **"TESTEES says everything's fine, but I can see a bug."** You're the
  tiebreaker. Point it out in chat: *"CP-142 still has a bug — when I
  click the CTA on mobile nothing happens."*

---

Next up: [Profile and account](./09-profile-and-account.md)
