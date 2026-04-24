# 5. The board

This page explains the board on your project page and what every lane and card means.

## What the board is

A simple, visual list of everything going on in your project. Each piece
of work is a **card**. Cards live in a **lane**, and they move from left
to right as they get done.

## The four lanes

From left to right:

1. **To Do** — planned, waiting to be picked up. Usually queued by **BOSS**
   after you described what you want in the chat.
2. **In Progress** — **FIXER** is actively working on it right now.
3. **Done** — **FIXER** finished the work. **TESTEES** is about to check it.
4. **Merged** — it's been tested, approved, and is now part of your project.
   (You'll often see the result in the live preview.)

A card usually flows **To Do → In Progress → Done → Merged**. If something
fails testing, it can move back a lane while your squad fixes it.

## Anatomy of a card

Every card shows:

- **Card ID** (top-left, e.g. `CP-142`) — a short unique ID. Handy when
  referring to a specific card in chat: *"Can you push CP-142 before the
  others?"*
- **Lane badge** (top-right) — the dot and label of the current lane.
- **Title** — the short headline of the work. Click the card to see more.
- **Tags** — small coloured labels like `design`, `bug`, `copy`,
  `mobile`. They help you scan.
- **Agent avatar** — a tiny face showing who's currently assigned
  (**BOSS**, **FIXER**, or **TESTEES**).

## What you can do with a card

- **Click** a card to open its full view: the description, activity log,
  and any notes from the squad.
- **Hover** a card to see the quick arrows for moving it forward or back a
  lane (good for when you want to override what the squad decided).
- From the open card view you can **rename**, **retag**, **reassign**, or
  **delete** it.

If you'd rather just talk, say it in chat: *"Move CP-142 to Done"* or
*"Please delete the old landing page cards"* works fine.

## Adding your own cards

Two ways:

1. **From chat** — describe what you want (e.g. *"Add a contact form"*).
   BOSS will add one or more cards to **To Do** automatically.
2. **Manually** — click **New issue** in the top bar. A dialog opens where
   you type a title, pick an agent, and add tags. Full walkthrough in
   [Issues and tasks](./06-issues-and-tasks.md).

## Reading the board at a glance

- A lot of cards in **To Do**? Your squad has a full plate — you can
  prioritize by saying *"Do CP-142 and CP-143 first."*
- A card stuck in **In Progress** for a long time? Ask about it in chat:
  *"What's happening with CP-148?"*
- Cards piling up in **Done**? Open the live preview — that's where you
  review the result (see [QA and live preview](./08-qa-and-preview.md)).
- Lots of cards in **Merged**? Congrats — that's your project shipping.

## Tips

- **Don't over-manage the board.** You don't need to move every card by
  hand — your squad does that. The arrows are there for when *you*
  disagree.
- **Tags help you filter later.** Ask *"Show me every card tagged
  `mobile`"* and your squad can pull them up.
- **One card = one clear outcome.** If a card feels huge, ask the squad to
  split it: *"Can you break CP-150 into smaller tasks?"*

## If something goes wrong

- **"I accidentally deleted a card."** Say so in chat: *"Please recreate the
  card I just deleted."* Your squad can bring it back.
- **"The board looks empty."** Give the squad a first task in the chat —
  cards only appear once there's work to do.
- **"A card is stuck in Done forever."** Ask: *"Can TESTEES finish checking
  CP-142?"*

---

Next up: [Issues and tasks](./06-issues-and-tasks.md)
