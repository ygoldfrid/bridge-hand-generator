# Bridge Hand Generator

A web app for bridge teachers to generate hands with custom constraints, edit/reorder boards, and export for BBO or print. Built with React and Vite.

---

## Features

### Board generation & vulnerability

- **Boards to add** — Number of boards (1–32) added each time you click **Add X boards**.
- **Rotating vulnerability (BONE cycle)** is automatic by board number and is recomputed when boards are added, deleted, or reordered.
- In each board preview, the vulnerability appears both:
  - visually (square border),
  - and explicitly as `Vul: None / N-S / E-W / Both`.

### Convention presets & custom constraints

- **Hand type / convention presets** are available from the selector.
- If you choose **None**, you can generate with fully custom filters:
  - **HCP per player (N, S, E, W)**,
  - **HCP per Dealer** (dealer + partner, rotating by board),
  - **Distribution per player** (min/max per suit),
  - **Distribution per Dealer** (dealer + partner, min/max per suit).
- HCP and distribution filters can be combined. Tight constraints use higher retry budgets and show a friendly error if no valid deal is found.

### Preview, editing, and board management

- **Preview** — All generated boards are shown in a grid. Each board shows:
  - board number and vulnerability (visual + explicit `Vul:` label),
  - four hands (North, South, East, West) with cards by suit (♠♥♦♣, red/black),
  - dealer marked in the hand header as `(D)`,
  - **HCP** for each hand in a banner at the bottom of the hand.
- **Edit cards (per board)** — Open a board editor modal and swap cards by tapping/clicking two cards.
- **Delete board** — Remove a board from the list.
- **Rearrange boards**:
  - desktop: drag-and-drop,
  - mobile: up/down controls optimized for touch.
- **Clear all boards** — Removes every generated board and exits rearrange mode.

---

## Export options

- **Download LIN** — Exports `bridge-hands.lin` for Bridge Base Online.
- **Print PDF** — Generates a print-ready PDF.
  - On desktop, opens print flow directly.
  - On mobile, downloads the PDF and shows guidance for opening/printing.

---

## Tech

- **React** + **Vite**
- **@bridge-tools/core** — Types, dealer/vulnerability, HCP, hand utilities
- **@bridge-tools/generator** — Constrained random deal generation
- **@react-pdf/renderer** + **pdf-lib** — PDF generation and print flow support

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
