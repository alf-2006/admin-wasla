# Wasla Dashboard Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the single-page Wasla administration dashboard into a distinctive RTL Wasla Tech interface without changing its application logic.

**Architecture:** Keep the existing single HTML, CSS, and inline JavaScript structure. Replace only presentation markup and CSS, adding custom SVG navigation marks while retaining current IDs, click handlers, data rendering, and Supabase calls.

**Tech Stack:** HTML, CSS, vanilla JavaScript, local `wasla-logo.png`, Cairo from the existing Google Fonts import.

---

### Task 1: Rebuild the brand navigation rail

**Files:**
- Modify: `C:\Users\aboha\Desktop\adminstrationsystem\index.html:145-183`
- Modify: `C:\Users\aboha\Desktop\adminstrationsystem\style.css`

- [ ] Replace the generic sidebar brand icon with the local logo image and expose it with useful alt text.
- [ ] Insert a decorative `nav-connection` SVG path and node layer inside the existing navigation list; retain each navigation item's `data-page` contract.
- [ ] Override sidebar/nav styles with `#0F172A` surfaces, Cairo labels, an active connected-loop state, visible `:focus-visible` styles, and the single reduced-motion-safe path animation.

### Task 2: Establish surface hierarchy and action semantics

**Files:**
- Modify: `C:\Users\aboha\Desktop\adminstrationsystem\style.css`

- [ ] Define refined design tokens for the approved color roles and 8px spacing scale.
- [ ] Replace generic dashboard-card treatments with differentiated KPI instruments, primary progress/achievement surface, members panel, analytics area, and table shell treatments.
- [ ] Make purple exclusive to active/action/achievement states; remove decorative gradients and uniform hover lifts.

### Task 3: Refine utility controls and responsive behavior

**Files:**
- Modify: `C:\Users\aboha\Desktop\adminstrationsystem\style.css`

- [ ] Apply the 12px action control radius, 14px table shell radius, and specified focus styles to existing controls without changing handlers.
- [ ] Add mobile styles that hide the decorative connector without breaking the existing off-canvas sidebar behavior.
- [ ] Add `prefers-reduced-motion` handling for the connector animation and all legacy transitions.

### Task 4: Verify the visual-only redesign

**Files:**
- Verify: `C:\Users\aboha\Desktop\adminstrationsystem\index.html`
- Verify: `C:\Users\aboha\Desktop\adminstrationsystem\style.css`

- [ ] Confirm retained IDs and existing `data-page` values with `Select-String`.
- [ ] Run the locally configured browser preview or a static HTML check, inspect the result at desktop and narrow widths, and fix any clipping or RTL regression.
- [ ] Inspect the final diff to confirm no authentication, ranking calculations, notes data, or backend code changed.
