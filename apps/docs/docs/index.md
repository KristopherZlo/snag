# Snag

Snag is a Laravel-first bug capture platform built around direct-to-storage uploads, shareable report pages, and organization-scoped access control.

## Platform shape

- Laravel monolith for auth, reporting, billing, invitations, and signed artifact access
- Inertia + Vue frontend for dashboard, settings, share pages, and extension connect flow
- TypeScript workspaces for shared contracts, capture transport, SDK shell, and browser extension
- Private object storage with presigned PUT uploads and signed viewer URLs

## Core flows

1. Create an upload session with either an authenticated token or a public capture key.
2. Upload media and debugger artifacts directly to object storage.
3. Finalize the session into a report.
4. Allow queue workers to ingest debugger payloads and broadcast status updates.

## Plans

- `free`: 3 members, screenshot capture only
- `pro`: 10 members, video capture up to 300 seconds
- `studio`: 50 members, video capture up to 1800 seconds
