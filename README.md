<p align="center">
  <img src="./images/snag-logo.svg" alt="Snag" width="88" />
</p>

<h1 align="center">Snag</h1>

<p align="center">
  Capture browser bugs with evidence, review them in one workspace, and hand them off cleanly without losing screenshots, recordings, steps, console logs, or debugger payloads.
</p>

<p align="center">
  <a href="#why-snag">Why Snag</a>
  &middot;
  <a href="#product-flow">Product Flow</a>
  &middot;
  <a href="#what-ships-in-this-repo">What Ships</a>
  &middot;
  <a href="#quick-start">Quick Start</a>
  &middot;
  <a href="#monorepo-map">Monorepo Map</a>
  &middot;
  <a href="#development-commands">Commands</a>
</p>

<p align="center">
  <img alt="Monorepo" src="https://img.shields.io/badge/monorepo-pnpm-F69220?style=flat-square&logo=pnpm&logoColor=white" />
  <img alt="Backend" src="https://img.shields.io/badge/backend-Laravel%2012-FF2D20?style=flat-square&logo=laravel&logoColor=white" />
  <img alt="Frontend" src="https://img.shields.io/badge/frontend-Vue%203%20%2B%20Inertia-42B883?style=flat-square&logo=vue.js&logoColor=white" />
  <img alt="Extension" src="https://img.shields.io/badge/extension-Chromium-4285F4?style=flat-square&logo=googlechrome&logoColor=white" />
</p>

## Why Snag

Snag is the evidence layer around delivery tools.

It does not try to replace Jira, GitHub, or Trello. It complements them.

Snag owns:

- capture
- screenshots and recordings
- reproduction context
- share links and handoff packages
- verification-friendly issue review

Your external tracker still owns delivery execution. Snag makes sure the bug arrives there with the context intact.

## Product Flow

```mermaid
flowchart LR
    A[Capture the broken state] --> B[Review in the reports queue]
    B --> C[Turn it into a bug issue]
    C --> D[Share or sync outward]
    D --> E[Jira / GitHub / Trello]
    E --> F[Verify the fix back in Snag]
```

The core product shape is simple:

- capture the bug
- keep the evidence attached
- triage it in one queue
- hand it off without rewriting context
- verify the fix with the same evidence trail

## What Ships in This Repo

| Surface | What it does |
| --- | --- |
| Reports queue | Incoming bug reports with screenshots, recordings, steps, console output, and network traces |
| Bug backlog | Issue-centric triage and verification workspace with external sync awareness |
| Public sharing | Share bug records safely without exposing private debugger payloads by default |
| Capture keys | Public intake for widgets, forms, and server-side relay flows outside signed-in workspace sessions |
| Browser extension | One-time code connect flow for fast in-browser capture and submission |
| Integrations | Sync-oriented handoff model for external delivery systems while Snag remains the evidence layer |
| Billing and org controls | Plans, members, invitations, and workspace-level settings |

## Real Usage Scenarios

### 1. Internal QA triage

A QA lead records a broken checkout flow, sends the report into Snag, reviews the attached evidence in the queue, and turns it into a tracked bug issue.

### 2. Public website feedback widget

A customer-facing site uses a capture key to open a public upload session and create a report without requiring a signed-in Snag session.

### 3. Handoff to delivery tools

The team keeps evidence and verification in Snag, but pushes delivery work into Jira or GitHub when the bug is ready for execution.

## Where Snag Fits

| Snag owns | Your delivery tracker owns |
| --- | --- |
| bug capture | sprint planning |
| screenshots and recordings | backlog execution |
| console and network evidence | engineering workflow management |
| reproduction context | delivery status conventions |
| share links and handoff packages | release process |
| verification context | ticket lifecycle inside the tracker |

That split is intentional. Snag is strongest when it stays focused on evidence, review, and handoff quality.

## Quick Start

### 1. Install workspace dependencies

```bash
pnpm bootstrap
```

This installs root workspace packages and Composer dependencies for `apps/server`.

### 2. Choose a local runtime

#### Option A: XAMPP mode

This repo includes a Windows-friendly XAMPP command that assumes Apache and MySQL already exist outside the app runtime.

```bash
cd apps/server
php artisan snag:xampp
```

What it does:

- derives a local `/snag` app URL
- ensures the database exists
- applies migrations
- starts Vite, queue worker, scheduler, and Reverb
- keeps Apache and MySQL external under XAMPP

#### Option B: Docker dev stack

Use this if you want a local Docker runtime without XAMPP.

```bash
cp apps/server/.env.example apps/server/.env
pwsh ./scripts/docker/dev-up.ps1
docker compose -f docker-compose.yml -f docker-compose.dev.yml exec app php artisan key:generate
```

Raw compose equivalent:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

Docker dev services include:

- `nginx`
- `app`
- `worker`
- `scheduler`
- `reverb`
- `postgres`
- `redis`
- `minio`
- `mailpit`

Notes:

- if `APP_KEY` was empty, generate it once and rerun `pwsh ./scripts/docker/dev-up.ps1`
- the dev overlay runs migrations automatically on `app` startup
- frontend assets come from the built image and are synced into a shared volume
- this is a stable no-HMR Docker flow; after frontend changes, rebuild the stack or run `pnpm --dir apps/server build` before restarting it

#### Option C: Prod-like Docker smoke

Use this when you want an immutable-image style stack with separate `nginx` and `php-fpm`, but still on one local machine.

```bash
cp apps/server/.env.example apps/server/.env
pwsh ./scripts/docker/prod-build.ps1
docker compose -f docker-compose.yml -f docker-compose.prod.yml run --rm app php artisan key:generate
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
docker compose -f docker-compose.yml -f docker-compose.prod.yml run --rm app php artisan migrate --force
```

Notes:

- if `APP_KEY` was empty, generate it once before the long-running `up -d` cycle
- the prod overlay keeps `nginx`, `app`, `worker`, `scheduler`, and `reverb` separate
- production services run as non-root where possible and use read-only filesystems with writable volumes only for required paths
- for real production, point `.env` at managed Postgres/Redis/object storage instead of the bundled local containers

### 3. Grant yourself a plan

For local development, you can create or upgrade a workspace user directly:

```bash
cd apps/server
php artisan snag:grant-plan you@example.com studio --create-missing
```

## Browser Extension

The Chromium extension uses an explicit one-time code exchange instead of relying on ambient first-party cookies.

Build it with:

```bash
pnpm --dir apps/extension build
```

Then load:

1. `chrome://extensions`
2. enable `Developer mode`
3. choose `Load unpacked`
4. select `apps/extension/dist`

Connect flow:

1. open `Settings -> Extension Connect` in Snag
2. copy the one-time code
3. paste the code into the extension popup with the API base URL and device name
4. exchange it for a revocable token
5. capture the active tab and submit the report

Full reference: [Browser Extension](./apps/docs/docs/extension.md)

## Public Capture Keys

Capture keys let external surfaces create Snag reports without a signed-in workspace session.

Use them for:

- website feedback widgets
- public bug forms
- embedded "Report a problem" buttons
- server-side relays

The public flow lives under:

- `POST /api/v1/public/capture/tokens`
- `POST /api/v1/public/capture/upload-sessions`
- `POST /api/v1/public/capture/finalize`

Full reference: [Capture Keys](./apps/docs/docs/capture.md)

## Architecture at a Glance

```mermaid
flowchart LR
    UI[Inertia and Vue workspace] --> HTTP[Laravel controllers and requests]
    HTTP --> WORKFLOWS[Report and issue workflows]
    WORKFLOWS --> DB[(Organization data)]
    WORKFLOWS --> STORAGE[(Artifact storage)]
    WORKFLOWS --> EVENTS[Reverb and queue jobs]
    EXT[Chromium extension] --> API[Authenticated and public capture APIs]
    PUBLIC[Widgets and public forms] --> API
    API --> WORKFLOWS
```

## Monorepo Map

| Path | Purpose |
| --- | --- |
| `apps/server` | Main Laravel + Inertia application |
| `apps/extension` | Chromium extension for browser-side capture |
| `apps/docs` | VitePress documentation site |
| `packages/capture-core` | Shared capture client for authenticated and public upload flows |
| `packages/shared` | Shared DTOs and contracts |
| `packages/ui` | Shared Vue UI package |
| `tests` | End-to-end coverage |

## Development Commands

From the repository root:

```bash
pnpm bootstrap
pnpm build
pnpm test
pnpm typecheck
pnpm lint
pnpm analyze
```

Useful app-level commands:

```bash
cd apps/server
php artisan test
php artisan snag:xampp
php artisan snag:grant-plan you@example.com studio --create-missing
```

Useful Docker commands:

```bash
pwsh ./scripts/docker/dev-up.ps1
pwsh ./scripts/docker/dev-down.ps1
pwsh ./scripts/docker/dev-down.ps1 -RemoveVolumes
pwsh ./scripts/docker/prod-build.ps1
docker compose -f docker-compose.yml -f docker-compose.dev.yml config
docker compose -f docker-compose.yml -f docker-compose.prod.yml config
```

## Documentation

- [Docs home](./apps/docs/docs/index.md)
- [Getting started](./apps/docs/docs/getting-started.md)
- [API contracts](./apps/docs/docs/api.md)
- [Capture keys](./apps/docs/docs/capture.md)
- [Browser extension](./apps/docs/docs/extension.md)

## Repo Summary

Snag is a real product-shaped monorepo, not a single demo screen.

It combines:

- a Laravel application
- a Vue workspace
- a Chromium extension
- a public capture API
- shared SDK packages
- a dedicated docs site

If your team needs a better way to move from "something broke in the browser" to "here is the exact evidence and handoff package," this is what the repo is built for.
