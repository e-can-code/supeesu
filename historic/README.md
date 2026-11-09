
# スペース — Supeesu
自分のスペース

A minimalist, modular browser start page designed as a quiet digital sanctuary. Built to replace distracting daily news feeds with a calming, atmospheric environment, *Supeesu* functions as a personal dashboard that channels the serene visual essence of lanterns drifting in a midnight sky.

[Live Demo](https://e-can-code.github.io/supeesu/) <!-- Replace with your actual GitHub Pages link -->

---

## ✦ Key Features

*   **Modular "Tile" Interface:** A clean, responsive grid system that houses independent content windows, keeping layout components separate and structured.
*   **Zero-Click UX:** Automated script focus immediately sets the cursor inside the search bar upon page load for seamless navigation.
*   **Search Engine Persistence:** Built-in engine toggling (Google & DuckDuckGo) that utilizes localized browser memory (`localStorage`) to remember user preferences across sessions.
*   **Atmospheric Motion & Glow:** Custom CSS transitions and blur filters that create a subtle, reactive "lantern-brightening" glow when interacting with dashboard elements.

---

---

## ✦ Design Philosophy & Intentionality

*   **A Sanctuary from Digital Noise:** Typical modern browsers default to opening new tabs that aggressively force metrics, invasive advertisements, continuous news feeds, clickbait headlines, and the ambient anxiety of online job boards directly in front of your eyeballs every single day. *Supeesu* was born out of a desire to create a deliberate boundary against this constant friction. It serves as a focused antidote, ensuring that when you open a tab, you are met with a clean break rather than an inescapable stream of distractions.
*   **Restoring Intentionality:** By replacing external noise with an empty, beautiful environment, the dashboard returns agency to the user. You are greeted by a blank canvas rather than a stream of distractions, ensuring your first interaction with the browser is calm, purposeful, and entirely your own.
*   **The Atmospheric Palette:** Utilizes a deep night sky purple (`#0c031f`), muted lavender text, and rich glowing gold accents (`#ffd700`) to simulate the quiet warmth of floating lantern light.
*   **Specialized Typography:** Styled using specialized, elegant Japanese typography (Hina-Mincho) to emphasize a reflective, literary mood that honors a slower, more deliberate aesthetic.

---

## ✦ Technical Stack

*   **Structure:** Semantic HTML5
*   **Styling:** Modern CSS3 (Grid Layout, Flexbox, BackDrop-Filter, Custom Bezier Transitions)
*   **Logic:** Vanilla JavaScript (DOM Manipulation, State Persistence via Web Storage API)

---

## ✦ Architecture

This dashboard is intentionally optimized as a high-performance, single-file deployment (`index.html`). This structure minimizes HTTP requests for instant browser loading while maintaining perfectly organized, commented code compartments for easy future modular expansion (e.g., custom data modules or automated local text scrapers).
