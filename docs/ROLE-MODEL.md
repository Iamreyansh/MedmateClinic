# MedMate Doctor — role & access model

The design for the "role based" layer of the clinic SaaS. Grounded in three sources:

1. The **live product's** own Roles & access matrix (`/staff` → Roles & access), read from the
   running app — this is the product's current opinion about who may open what.
2. The **new stack** in `/Users/rey/Downloads/MedmateDoctor` — Vite+React portal, Spring Boot
   clinic API, identity service, database-per-clinic.
3. The **audit + roadmap** in `packages/docs/doctor/` (F-102 AC4 "no second hardcoded matrix",
   F-105 audit log, F-109 doctor scoping).

## 1. What exists today

| Piece | State |
|---|---|
| Tenancy | **Solved.** Database per clinic, `clinic_registry` maps the JWT's `clinicId` to a database, routing fails closed. Proven by `ClinicApiIT`. |
| Identity | **Solved.** OTP + personal PIN → HS256 JWT carrying `clinicId` + `clinicRole`; refresh rotation; sign-out resets the query cache. |
| Roles | 5 hardcoded: `owner, doctor, nurse, front_desk, admin` (`ClinicRole`). The product needs 6 — **lab technician** and **accounts** are missing. |
| Grants | 4 keys only: `clinic:patients:read`, `clinic:patients:read_clinical`, `clinic:billing:read`, `clinic:staff:read`. Stored per account, seeded by hand in SQL, never written by code. |
| Enforcement | 4 hand-rolled `grants.holds(...)` calls in 2 controllers. No `authorize()` helper. |
| The matrix | **Does not exist.** Two independent hardcoded role→screen lists: `src/app/nav.ts` and `src/features/landing/service/stations.ts`. This is roadmap AC4, still open. |
| Audit log | **Does not exist.** F-105, Not Started. DPDP needs it. |

## 2. The model

One server-owned matrix drives the menu, the routes and the data. Three orthogonal axes:

- **resource** — the 18 things a person may open (17 screens + the scope rule)
- **level** — `none` · `view` (look only) · `use` (work in it)
- **scope** — `own` · `branch` · `clinic` (which rows, for patient-linked resources)

Scope is a separate axis on purpose. The legacy model folded "can a salaried doctor see other
doctors' earnings?" into a yes/no capability, which is why it needed coercion patches later
(F-109). Level answers *what*, scope answers *whose*.

### 2.1 The catalogue

The seed matrix, taken from the running product. `use` / `view` / `—`:

| Resource | Doctor | Nurse | Front desk | Lab tech | Accounts | Clinic admin |
|---|---|---|---|---|---|---|
| Doctor Console & prescriptions | use | — | — | — | — | — |
| Doctor's inbox & templates | use | — | — | — | — | — |
| Nurse Station (vitals) | view | use | — | — | — | — |
| Lab & Diagnostics | view | — | — | use | — | — |
| Teleconsult | use | — | use | — | — | — |
| Patient Kiosk | — | — | use | — | — | — |
| Reception Desk | — | — | use | — | — | — |
| Appointments | use | — | use | — | — | view |
| Patient messages | — | — | use | — | — | view |
| Patients (contact & visits) | use | view | use | view | view | view |
| Billing & POS | — | — | use | — | use | view |
| Reports | view | — | — | — | view | view |
| Doctors | — | — | — | — | — | use |
| Staff & roles | — | — | — | — | — | use |
| Locations | — | — | — | — | — | use |
| Clinic settings & letterhead | — | — | — | — | — | use |
| Subscription | — | — | — | — | — | use |

Two rows are **fixed by law**, not configurable — the product shows a lock and a reason on hover:

| Law row | Rule |
|---|---|
| Diagnoses, notes and prescriptions | Only a doctor may read. The clinic owner always has full access. |
| Patients they can open | Doctor = **own only**. Nurse, front desk, lab tech, accounts, admin = all. |

The owner is never subject to the matrix: the product states "The clinic owner always has full access."

### 2.2 Storage

Every table lives in the clinic's own database, so isolation is physical and no row carries a
`clinic_id` (the tenant boundary is the datasource, not a column).

```sql
create table role_profile (
    id          uuid primary key,
    name        text not null,
    is_system   boolean not null default false,   -- built-ins cannot be deleted
    unique (name)
);

create table role_grant (
    role_id   uuid not null references role_profile(id),
    resource  text not null,      -- 'console' | 'billing' | 'patient' | ...
    level     text not null,      -- 'none' | 'view' | 'use'
    scope     text not null,      -- 'own'  | 'branch' | 'clinic'
    primary key (role_id, resource)
);

create table staff_role (
    account_id uuid primary key,
    role_id    uuid not null references role_profile(id),
    branch_id  uuid,              -- optional: restrict to one branch
    exception  jsonb not null default '{}'   -- per-person overrides: {"billing": "view"}
);
```

`staff_role.exception` is how the product's "give them an exception" works, and it applies on the
person's next request without signing them out.

### 2.3 Enforcement — one place

`packages/apps/medmate-clinic-api` gets a `Policy` component, constructed per request against the
routed datasource so a revoked grant takes effect on the next call, with no new token.

```java
public final class Policy {
    Map<Resource, Level> levels(ClinicPrincipal p);      // for the UI
    void require(ClinicPrincipal p, Resource r, Level atLeast);
    <T> T project(ClinicPrincipal p, Resource r, T row);  // strip what the level forbids
    void scope(ClinicPrincipal p, Resource r, Query q);   // own | branch | clinic predicate
}
```

- `require` → 403 with a plain reason ("This action is not allowed.").
- `project` → strips diagnoses, notes, prescriptions, allergies and conditions from any row when
  the caller lacks `clinical:read`; strips money when the caller lacks `billing:view`.
- `scope` → adds the doctor predicate for `scope = own`; the branch predicate for `scope = branch`.

Controllers stop hand-rolling checks; they ask the policy. That is the F-103/F-104/F-109 fix in
one shape, and it closes the "no second hardcoded matrix" gap.

### 2.4 The UI reads it, it does not decide it

`GET /clinic/me` returns the resolved capability set, and the portal derives everything from it:

```json
{ "clinicId": "…", "clinicName": "…", "role": "front_desk",
  "levels": { "kiosk": "use", "desk": "use", "billing": "use", "console": "none", … },
  "scopes":  { "patient": "clinic" }, "exceptions": { "billing": "view" } }
```

`src/app/nav.ts` and `src/features/landing/service/stations.ts` stop switching on the role name.
One list of stations, each carrying its resource key; the filter is `levels[resource] !== 'none'`.
Two matrices become one, and the server is the only place that can be wrong.

## 3. Build order

The first slice is the model, because every later screen inherits it.

1. **Policy + catalogue** (clinic-api). `Resource` enum, `Level`, `Scope`, `Policy`, the six
   seeded role profiles and their grants, `staff_role` migration (V4).
2. **Migrate the four grant checks** to `Policy.require` / `project`. Delete `GrantChecker` and
   `ClinicPermissions.KEYS` — two copies of the same list is the drift that caused F1.
3. **`/clinic/me` returns levels and scopes.** Portal nav + landing derive from it. Delete the
   role switches. Close AC4.
4. **Seed the 6 role templates** from the matrix in §2.1, including the two law rows and the
   owner exemption, and add a parity test that fails if the seed and the spec drift.
5. **Audit log** (F-105). Who did what, when, from where — the reason roles exist at all, and a
   DPDP requirement. It must be in place before the first role is granted to a real person.
6. **Own/branch scoping** (F-109) for queue, invoices, day-close and patient lists.

Then the screens, in the order the roadmap already sequences them: nurse station → doctor console →
reception desk → billing, each needing the endpoint above it.

## 4. Tests that prove it

| Test | Where | Asserts |
|---|---|---|
| `RoleMatrixParityTest` | clinic-api | seeded role profiles == the §2.1 matrix, law rows included |
| `PolicyProjectionTest` | clinic-api | each role sees and does not see the right fields, row by row |
| `DoctorScopeTest` | clinic-api | a salaried doctor cannot read another doctor's patient, invoice or report |
| `RevocationTest` | clinic-api | removing a grant changes the next call, no new token |
| `SecondClinicTest` | clinic-api | a token cannot reach another clinic's data (exists today as `ClinicApiIT`) |
| `navMatchesCapabilities` | doctor app | the rendered menu equals the capabilities from `/clinic/me` — the AC4 test |
| `roleMatrix.test.tsx` | doctor app | each seeded role lands on its own landing screen |

## 5. Open decisions

1. **Chief complaint for the front desk.** The legacy fix keeps it ("what are you here for?"),
   the strict DPA reading strips it. The matrix says "Diagnoses, notes and prescriptions" are
   locked for non-doctors; a chief complaint is neither. Pick one and encode it in the law rows.
2. **Can a salaried doctor see clinic-wide revenue?** The matrix says `Reports: view` for a doctor
   and "patients they can open: own only". Revenue is the money side of the same question.
3. **Lab technician and accounts are real roles now.** The product's matrix has six columns; the
   identity service has five roles. Add both, or fold accounts into clinic admin?
4. **Does the kiosk's device lock (HTTP 423) carry into the new stack?** It is the one mechanism
   the legacy product has that competitors do not, and the roadmap says not to weaken it.
5. **Two products, one permission model.** The legacy Netlify app and the new portal both exist.
   The legacy one is deliberately not in the repo (ADR 0001). Do we port its screens into the new
   stack, or keep it as the demo and build the new stack to the same spec?

## 6. Files this touches

```
packages/apps/medmate-clinic-api
  .../access/{Resource,Level,Scope,Policy}.java        (new)
  .../grants/GrantChecker.java                         (delete)
  .../db/migration/V4__role_profiles.sql                (new)
  .../db/migration/V5__staff_roles.sql                  (new)
  .../me/MeController.java, .../patients/PatientController.java   (use Policy)
packages/apps/medmate-server/medmate-server-identity
  .../access/ClinicPermissions.java                    (delete — drift source)
  .../access/ClinicRole.java                            (add LAB_TECHNICIAN, ACCOUNTS)
packages/apps/doctor
  src/app/nav.ts                                        (derive from capabilities)
  src/features/landing/service/stations.ts              (derive from capabilities)
  src/types/clinic.types.ts                             (ClinicMe gains levels/scopes)
```
