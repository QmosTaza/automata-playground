# Automata Playground

An interactive, browser-based visual editor and simulation engine for formal language theory. This playground currently allows users to visually design, validate, and debug Deterministic (DFA), Non-Deterministic (NFA), and Empty-Transition ($\lambda$-NFA) finite state machines.

---

## ✨✨ Features ✨✨

* **Interactive Graph Canvas:** Seamless node creation and custom transitions powered by React Flow.
* **Multi-Paradigm Engines:** Support for:
    * **DFA:** Linear, deterministic string processing.
    * **NFA:** Recursive non-deterministic branching tracking parallel execution states.
    * **$\lambda$-NFA:** Graph traversal utilizing recursive $\lambda$-closures without consuming string characters.
* **Time-Travel Stepper UI:** Step forward/backward through specific execution timelines. For NFAs/$\lambda$-NFAs, an execution path panel dynamically handles concurrent tree paths, showcasing exactly where a branch dies or gets accepted.
* **Real-time Integrity Validation:** Active error-tracking panel monitoring missing transitions, incorrect structural schemas or missing initial states.
* **DFA Minimization and Completion:** An optimization tool to automatically merge equivalent states and compress any DFA into its smallest possible version, or complete any DFA that has missing transitions.
* **Automata Conversions:** Algorithms to convert $\lambda$-NFAs down to standard NFAs or DFAs, and NFAs to DFAs (Subset Construction).
* **Regex Engine:** A feature to type in a Regular Expression and watch the playground automatically generate the corresponding $\lambda$-NFA for it.

---

## Tech Stack

* **Frontend Library:** React
* **Graph Rendering:** React Flow (@xyflow/react)
* **Styling:** Tailwind CSS
* **Language:** TypeScript

---

## Roadmap

`automata-playground` is a work in progress! Here are the features currently planned or being actively developed:

* **Pushdown Automata (PDA):** Expanding the canvas and simulation engine to support stack memory, allowing users to build and step through Context-Free Languages.
* **Turing Machines:** Infinite tape visualizer to support full Turing Machine simulations.
* **Save & Export:** The ability to save your custom state machines as a JSON file or export the canvas as an image (PNG/SVG) to share.

---
---

## ➡➡ Getting Started ⬅⬅

### Prerequisites
* Node.js (v18+ recommended)
* pnpm / npm / yarn

### Installation

1. Clone the repository:
```bash
git clone [https://github.com/QmosTaza/automata-playground.git](https://github.com/QmosTaza/automata-playground.git)
cd automata-playground
```
2. Install dependencies:
```bash
npm install
```
3. Run the development server:
```bash
npm run dev
```
4. Open http://localhost:3000 in your browser to start building!