# Structure and conventions

The conventions the code follows. They exist so that the next person to add a
screen does not have to guess.

## The shape of the repository

```
src/
  app/                  routes, and nothing else
    routes/             the route table, the session guard, the 404
    providers/          the store and the router
  components/
    ui/                 primitives: Icon, Button, Chip, Input, Avatar, Card
    layout/             the app chrome: AppShell, Sidebar, Topbar, mobile
  features/             one folder per product area
    auth/               sign-in, the lock screen
    dashboard/          the owner's dashboard
    queue/              the doctor's queue
    consult/            the consult and the prescription
    reports/            the four report views
    …                   one folder per screen
  services/             the API layer
    api/                the facade, the client, and the mock behind it
  store/                the Redux store — the only place that knows every slice
  constants/            the nav model
  types/                the shapes more than one feature draws
  lib/
    design/tokens.ts    the palette and the type scale
    cn.ts               the class joiner
  styles/
    medmate.css         the product stylesheet — copied, never edited
    app.css             our own rules, and nothing else
  assets/icons.json     the icon set
backend/                the Java service
verify/                 the fidelity harness
docs/                   the contracts
```

### The seven kinds of module

The code is split by **what a thing is**, not by what it does:

| Kind | Where | What it may import |
|---|---|---|
| `app` | `src/app/` | everything |
| `shell` | `src/components/layout/` | everything |
| `feature` | `src/features/*` | itself, `shell`, `shared`, `infra`, `store` |
| `shared` | `src/components/ui/`, `src/lib/`, `src/types/` | itself, `infra` |
| `infra` | `src/services/` | itself, `shared` |
| `store` | `src/store/` | itself, `feature`, `shared`, `infra` |

`eslint-plugin-boundaries` holds these apart, and `npm run lint` fails if one is
broken. Two rules matter most:

- **a feature is entered through its `index.ts`**, never through its internals
- **a feature may not import another feature**

### Rules

1. **`app/` holds routes and composition only.** A route composes components; it
   does not draw them. Anything a route needs that another route will need is a
   component.
2. **A component lives in the folder of what it is for**, not in a `misc` or a
   `shared` bucket. `ui` is primitives only — a component that needs product
   knowledge (a plan card, a manage row) is not a primitive.
3. **A feature holds its own types.** The shape a screen draws belongs to the
   feature that draws it; the mock answers with those shapes, it does not define
   them. A shape more than one feature prints — the visit — lives in
   `src/types/`.
4. **Nothing in `app/` or `components/` talks to a database.** Data comes from
   the API through `src/services/api`, and the mock answers with the shapes the
   API returns, so the swap is one flag.
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
about a thousand classes in a consistent language — `.st-` for stations, `.q-` for
queue, `.pz-` for pricing, `.lp-` for landing, `.su-` for sign-up. A new
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
- [ ] `npm test` passes.
- [ ] Keyboard reachable, focus visible, `prefers-reduced-motion` respected.
- [ ] Empty, loading and error states exist, in the product's voice.
- [ ] No hardcoded value that the data layer should own.
