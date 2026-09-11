# Wasla Dashboard Design

## Direction

The dashboard is a calm operational surface framed by a dark Wasla navigation rail. Its signature element is a curved connection path, shaped like an open loop from the Wasla mark, that visually plugs the active destination into the application.

## Color roles

| Token | Role in the dashboard |
| --- | --- |
| `#0F172A` | Sidebar, navigation structure, and high-contrast brand surface |
| `#F3F4F6` | Application canvas and quiet table backgrounds |
| `#64748B` | Supporting copy, dividers, and neutral status information |
| `#6D28D9` | Primary actions, selected navigation, and confirmed achievements |
| `#8B5CF6` | Progress, rank movement, and immediate action feedback |

Purple never appears as a decorative page wash. It communicates active, actionable, or achieved states.

## Typography and spacing

The interface uses Cairo only: Bold at 28–32px for page titles, 18–20px for section titles, and Regular at 13–15px for interface text. Numeric data uses Cairo 700–800 for a native Arabic visual rhythm. Spacing follows an 8px unit: 12px, 16px, 24px, and 32px.

| Surface | Radius | Treatment |
| --- | --- | --- |
| Primary action | 12px | Solid `#6D28D9`, no decorative gradient |
| Operational instrument | 18px | Structured edge, directional accent only when useful |
| Dashboard pulse feature | 28px | Reserved for the hierarchy-leading achievement/progress surface |
| Table shell | 14px | Crisp container; internal rows stay square and separated |

## Icon treatment

Primary navigation uses compact, custom SVG line icons at 1.8px stroke with round caps and joins. The icon language is built from linked curves, a short diagonal bolt cut, and open nodes; stock icons remain only for secondary utility affordances where they do not define the brand.

## Signature interaction

The sidebar contains a looping SVG path behind navigation nodes. When navigation changes, the active node gains a purple connected arc and a small, one-time path-draw animation. With `prefers-reduced-motion`, it renders immediately.

## Principles

- Purple means a team action has a consequence.
- Navigation is a connection map, not a list of buttons.
- Operational data earns its visual treatment from what the team does with it.

## Constraint review

The design avoids uniform card recipes, ambient purple decoration, default stock navigation icons, blanket entrance/hover motion, ornamental uppercase eyebrows, and unneeded data fonts. It uses the local Wasla logo asset, remains RTL-first, and keeps the current application logic untouched.
