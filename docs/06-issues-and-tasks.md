# 6. Issues and tasks

This page shows how to create issues, read their status, and review what your squad delivered.

## What an "issue" is in Codapac

An **issue** is one clear thing that needs to happen — a new feature, a
fix, a polish pass. Every issue becomes a **card** on the board and flows
through the lanes until it's merged. "Issue," "task," and "card" all
refer to the same thing — we use them interchangeably.

## Two ways to create an issue

### 1. Just say it in chat (easiest)

Type what you want in the project chat. For example:

> *"Please add a FAQ section at the bottom of the homepage with 5 questions."*

**BOSS** will:

1. Write a short, clear title for the card.
2. Add useful tags (e.g. `homepage`, `content`).
3. Drop it into **To Do** so **FIXER** can pick it up.

For bigger asks, BOSS will split it into multiple cards — one per piece.
You don't have to do anything.

### 2. Use the New issue dialog

When you want to add an issue without going through chat:

1. Click **New issue** in the top bar of your project.
2. Fill in:
   - **Title** — a short sentence, e.g. *"Add FAQ section to homepage."*
   - **Assign to** — pick **BOSS**, **FIXER**, or **TESTEES**. (If you're
     not sure, pick BOSS.)
   - **Tags** (optional) — type words separated by commas or spaces, like
     `homepage, copy, polish`. You can add up to four.
3. Click **Create issue**.

The new card appears in **To Do** instantly.

## Reading an issue

Click any card on the board to open its full view. You'll see:

- **Title and description** — the full ask, not just the short title.
- **Current lane** — To Do, In Progress, Done, or Merged.
- **Who's on it** — the agent currently assigned.
- **Activity log** — every update, in order: "BOSS created this card",
  "FIXER started", "TESTEES ran checks", etc.
- **Notes from the squad** — anything FIXER or TESTEES wants you to know
  ("I renamed the pricing tier to match the rest of the site" or "Found a
  bug when resizing to mobile — fixed it").
- **Links** — if the work produced a preview, a link to open it.

## Reviewing what got built

When a card reaches **Done**, it's waiting on your review.

1. Open the card.
2. Click the **preview link** (or click **Open preview** in the top bar).
3. Look at the change, try it yourself.
4. Back in chat:
   - Happy? *"Looks good, ship CP-142."* — it moves to **Merged**.
   - Small tweak? *"Great, but bump the font up one size."*
   - Not right? *"This isn't quite what I meant — can you try a simpler
     layout?"*

You can also use the quick arrows on the card to move it back a lane and
let the squad take another pass.

## Tips for writing great issues

- **One outcome per issue.** *"Add a FAQ section"* is good.
  *"Redo the whole homepage and add FAQ and change the colours"* is three
  different issues.
- **Say where.** *"on the homepage"*, *"in the top nav"*, *"on the
  pricing page"* — saves a round-trip.
- **Say how you'll know it's done.** *"Five questions, collapsible"* or
  *"mobile-friendly"* — this gives BOSS clear done-criteria.
- **Attach examples.** Paste a link or describe something similar: *"like
  Notion's FAQ section."*

## If something goes wrong

- **"My card disappeared."** It probably moved to **Merged** — scroll the
  board to the far right.
- **"The card has no notes."** That's normal before the squad picks it up.
  Notes show up once FIXER or TESTEES is on it.
- **"I can't find a card I know I made."** Use the filter by tag, or just
  ask in chat: *"Where's the card about the FAQ section?"*

---

Next up: [Your agent squad](./07-agents.md)
