# Structure and conventions

The conventions the code follows. They exist so that the next person to add a
screen does not have to guess.

## The shape of the repository

```
src/
  app/                  routes, and nothing else
    layout.tsx          the document: fonts, the two stylesheets
    page.tsx            the landing page — composes sections, draws nothing
    start/page.tsx      the clinic sign-up
    dashboard/page.tsx  the staff shell
    icon.svg            the app icon
  components/
    ui/                 primitives: Icon, Button, Chip, Input, Avatar, Card
    layout/             the app chrome: AppShell, Sidebar, Topbar, mobile
    marketing/          the landing page's pieces, plus the product cards
    onboarding/         the clinic sign-up flow and its steps
    dev/                developer tooling that never ships
  lib/
    design/tokens.ts    the palette and the type scale
    nav.ts              the nav model
    fixtures/           data shaped like the API's responses
    cn.ts               the class joiner
  styles/
    medmate.css         the product stylesheet — copied, never edited
    app.css             our own rules, shell and landing only
  assets/icons.json     the icon set
verify/                 the fidelity harness
docs/                   the contracts
```

### Rules

1. **`app/` holds routes and composition only.** A page composes components; it
   does not draw them. Anything a page needs that another page will need is a
   component.
2. **A component lives in the folder of what it is for**, not in a `misc` or a
   `shared` bucket. `ui` is primitives only — a component that needs product
   knowledge (a plan card, a manage row) is not a primitive.
3. **`lib/` holds what is not React**: tokens, the nav model, the class joiner,
   the fixtures.
4. **Nothing in `app/` or `components/` talks to a database.** Data comes from
   `lib/fixtures` until the API lands, and the shapes there are the shapes the
   API returns, so the swap is one line per field.
5. **A service call is named and isolated.** `lookupHpr` is a file with one
   function, not a call buried in a component. When the ABDM registry is
   connected, that file is the only thing that changes.

## Naming

| Thing | Convention | Example |
|---|---|---|
| Component file | PascalCase, one export | `StationCard.tsx` |
| Function | camelCase, verb-first for actions | `lookupHpr` |
| Boolean prop | `is` / `has` / `on` | `active`, `popular`, `onNext` |
| Callback prop | `on` + the event | `onNext`, `onToggle` |
| Event handler | `handle` + the event | `handleToggle` |
| CSS class | the product's own vocabulary | `.st-card`, `.pz-price` |
| Type | PascalCase, no suffix for props | `Form`, `StationCardProps` |
| File holding one function | camelCase | `lookupHpr.ts` |

**CSS classes are the exception, and it is deliberate.** The stylesheet has
about a thousand classes in a consistent language — `.st-` for stations, `.q-`
for queue, `.pz-` for pricing, `.lp-` for landing, `.su-` for sign-up. A new
one-off class is how a product drifts, so new rules go into `app.css` under
the section they belong to, named with the same prefix as the screen.

## TypeScript

- `strict` is on and stays on.
- Props are typed at the component, not at the call site.
- A form is one flat object when it is filled in once (the sign-up) and a list
  of records when it repeats (the queue).
- `cn()` joins class names; there is no CSS-in-JS and no utility framework.

## The stylesheet

`src/styles/medmate.css` is the deployed product's stylesheet, byte for byte.
It is the pixel reference, and `npm run fidelity` fails if it drifts from
production. **It is never edited.** Our own rules live in `src/styles/app.css`,
which redefines no token.

## Before a screen is done

- [ ] It matches the Figma frame it was built from.
- [ ] `npm run fidelity` reports 0 drift.
- [ ] `npm run build` and `npm run lint` are clean.
- [ ] Keyboard reachable, focus visible, `prefers-reduced-motion` respected.
- [ ] Empty, loading and error states exist, in the product's voice.
- [ ] No hardcoded value that the data layer should own.
