# Bridge Hand Generator

A web app for bridge teachers to generate hands with custom constraints and download a **LIN file** for use in BBO (Bridge Base Online). Built with React and Vite.

---

## Features

### Vulnerability

- **Vulnerability** (top section): choose how vulnerability is set.
  - **Rotating** — Standard by board number (Board 1 = None, 2 = N-S, 3 = E-W, 4 = Both, then repeats). Dealer and vulnerability stay correct when you add, delete, or reorder boards.
  - **Fixed** — You set vulnerability per board. New boards use the default you choose in the Boards section; each board can be changed individually in the preview.

### Boards

- **Boards to add** — Number of boards (1–32) added each time you click **Add X boards**. Boards accumulate; new runs add to the existing list.
- **Vulnerability** (in Boards section) — Shown only when **Fixed** is selected above. Sets the default vulnerability (None, Both, N-S, E-W) for newly added boards.

### HCP conditions

- **No HCP conditions** — No point constraints.
- **HCP per player (N, S, E, W)** — Min/max Milton HCP for each of North, South, East, and West. Leave blank for no constraint.
- **HCP per Dealer** — Min/max HCP for the dealer and for the dealer’s partner. Dealer rotates by board (1=S, 2=W, 3=N, 4=E), so which pair has the constraint alternates per board.

### Distribution conditions

- **No distribution conditions** — No shape constraints.
- **Distribution per player (N, S, E, W)** — Min/max cards per suit (♠♥♦♣) for each player. Leave blank for no constraint.
- **Distribution per Dealer** — Min/max cards per suit for the dealer and for the dealer’s partner (same rotation as HCP per Dealer).

HCP and distribution filters are applied together. Very tight constraints (e.g. 0 cards in a suit) use higher retry limits and may show a friendly error if no deal is found.

---

## Preview & boards

- **Preview** — All generated boards are shown in a grid. Each board shows:
  - Board number and vulnerability (None / N-S / E-W / Both) with a visual indicator.
  - Dealer (D) and four hands (North, South, East, West) with cards by suit (♠♥♦♣, red/black).
  - **HCP** for each hand in a banner at the bottom of the hand.
  - **Delete** (×) to remove that board (when not in rearrange mode).
  - **Per-board vulnerability** — When vulnerability is **Fixed**, a dropdown on each board lets you set None, N-S, E-W, or Both for that board.

- **Download LIN file** — Builds a LIN file from the current board list (renumbered 1, 2, 3…) and downloads it (e.g. for BBO).
- **Rearrange boards** — Toggles rearrange mode. In this mode you can **drag and drop** boards to reorder them. Other boards move as you drag; the drop target appears as an empty white slot. When you finish, click **Done rearranging**. Board numbers and dealer/vulnerability (in Rotating mode) are updated after reorder and after delete.
- **Clear all boards** — Removes all boards and exits rearrange mode (red button, right-aligned).

---

## Tech

- **React** + **Vite**
- **@bridge-tools/core** — Types, dealer/vulnerability, HCP, hand utilities
- **@bridge-tools/generator** — Constrained random deal generation

---

## Run locally

```bash
npm install
npm run dev
```

Open the URL shown (e.g. `http://localhost:5173`).

**Build for production:**

```bash
npm run build
```

Output is in `dist/`.
