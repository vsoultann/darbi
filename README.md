<div align="center">

# Darbi · دربي

**More than just a bus tracking system.. it's peace of mind.**

A bilingual (Arabic / English) school-bus tracking web app with a simulated iOS
**Dynamic Island**, a **notch** live activity for older iPhones, an **always-on lock
screen**, and two independent demo modes — one you drive yourself, one an admin drives
from another device.

</div>

---

## Run it in three commands

```bash
npm install          # approve the better-sqlite3 build script if npm asks
npm run seed         # creates darbi.db with the Al Ain school, routes and 24 students
npm run dev          # API + sockets on :5174, Vite on :5173
```

Open <http://localhost:5173>, type **Khalid Alnuaimi** / **123456**, and you are on the
tracking screen. For a production run on a single port (what Replit does):

```bash
npm run build && npm start     # everything on http://localhost:5174
```

## How the remote demo works — for a presentation audience

Every phone that opens the tracking screen quietly registers with the school server and
is given a short code, like `DRB-4K7X`. The presenter opens the admin console on a
second device, sees that code in a list, and selects it. From that moment every control
in the console — start the trip, set the arrival to two minutes, inject a nine-minute
traffic delay, expand the Dynamic Island, push the phone to its lock screen, fire the
arrival animation — happens on the audience's phone in under a third of a second,
because the server holds the single authoritative copy of the trip and pushes each
frame over a WebSocket. Nothing is pre-recorded, and the console shows a live mirror of
exactly what the parent is looking at.

## Routes

| Route | What it is |
|---|---|
| `/` | Landing. Brand hero and the name + ID lookup. No account needed. |
| `/track/:studentNo` | The main screen: live map, route line, stop rail, ETA. The island lives here. |
| `/lock` | Always-on lock-screen simulator: clock, countdown ring, progress rail. |
| `/settings` | Language, theme, motion, live-activity style, and the self-serve Demo Mode panel. |
| `/admin` | PIN gate → fleet dashboard. |
| `/admin/demo` | The Remote Demo Console. |
| `/driver` | Driver view: start / end a trip, mark a stop, report a delay. |
| `/about` | Problem, solution, technology. |

Default PINs for development: **admin `1970`**, **driver `4040`**. Override them with
`ADMIN_PIN` / `DRIVER_PIN`; they never reach the client bundle.

## The live activity adapts to the phone

| Device | What renders |
|---|---|
| iPhone 14 Pro and newer | The **Dynamic Island** pill: a single element that springs between 56×34, 220×38 and 360×190, with a gooey filter so the morph looks liquid. |
| iPhone X – 14 (notch) | A **notch** activity: a black status strip that merges with the hardware cutout, content in the ears on either side of it, and a panel that unfolds downward when expanded. |
| Android, tablets, desktop | The floating pill, shown on desktop inside an iPhone bezel mock so it reads correctly. |

Detection uses the known iPhone screen sizes first and `env(safe-area-inset-top)` as the
future-proof fallback (Dynamic Island phones report ~59 px, notched phones 44–48 px).
Only iPhones ever get the notch treatment. Settings → *Live activity style* lets you
force any of them, which is how you demo both on one device.

## Two demo modes

**Demo Mode** (Settings) runs a `DemoEngine` in the browser: the same `TripSimulator`
class the server runs, fed by the same scenario scripts, emitting the same
`trip:update` payload into the same store. The UI cannot tell the difference — that is
the point of the `TripSource` interface (`SocketTripSource` | `DemoTripSource`). It
needs no server at all.

**Remote Demo Console** (`/admin/demo`) is the opposite: it drives a real viewer's
screen from another device. Admin commands override Demo Mode while the admin is
connected and hand control back on *Hand control back*.

Six scenarios are shared by both: Morning Pickup, Afternoon Drop-off, Traffic Delay,
Arriving Now, Emergency Stop, Full Journey Loop.

## Architecture

```
shared/          types.ts · geo.ts · simulation.ts · scenarios.ts   ← one copy of the truth
server/          Express + Socket.IO on ONE port, SQLite behind db/repo.ts
client/          React 18 + Vite + Tailwind + Framer Motion + MapLibre
```

* The server ticks every active trip **every 250 ms**, interpolating the bus along the
  route polyline, and pushes each frame to the trip's room. Clients only render.
* `speedMultiplier` compresses wall-clock time, not the countdown: at 5× a 12-minute
  ETA still reads *12 minutes* and simply elapses five times faster.
* Every DB query lives in `server/db/repo.ts`, so SQLite can be swapped for MySQL
  without touching a route.
* Maps use OpenFreeMap vector tiles — no API key, no billing — and fall back to OSM
  raster, then to a plain sand canvas, if the network is blocked.

## Deployment

**Replit (the full app).** One Node process serves the built client *and* Socket.IO on
`process.env.PORT`; `.replit` and `replit.nix` are committed. Put `ADMIN_PIN` and
`JWT_SECRET` in Secrets, and use a Reserved VM or Autoscale deployment so the socket
stays alive through a presentation. `npm run seed:reset` rebuilds `darbi.db`.

**GitHub Pages (demo only).** Pages is static and cannot run the socket server, so
`.github/workflows/pages.yml` builds the `VITE_DEMO_ONLY=true` variant: Demo Mode on by
default, the whole journey simulated in the browser from a bundled snapshot, admin and
driver views hidden. Enable Pages → *Source: GitHub Actions* once and every push to
`main` republishes it. It is installable as a PWA and works offline.

## Phase 2 — the real Dynamic Island

This is a faithful web simulation. A genuine Live Activity needs a native iOS app:
SwiftUI + **ActivityKit** with `.compactLeading`, `.compactTrailing`, `.minimal` and
`.expanded` regions, and the same Node server pushing to APNs with the activity's push
token. The `trip:update` payload would not change — only an APNs sender module is
missing. It needs a Mac with Xcode, an Apple Developer account, and iOS 16.1+ (the
Island itself needs iPhone 14 Pro or newer).

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Server (tsx watch) + Vite together |
| `npm run build` | Builds the client into `dist/client` |
| `npm start` | Production: one process, one port |
| `npm run seed` / `seed:reset` | Seed or rebuild `darbi.db` |
| `npm run typecheck` | Strict TypeScript over server, shared and client |
| `npm run icons` | Regenerates the PWA icons from SVG |
