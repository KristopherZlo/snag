# Capture Keys

Capture keys let an external surface create Snag reports without a signed-in workspace session.

Use them when the reporter is outside the product:

- website feedback widgets
- public bug forms
- embedded "Report a problem" buttons
- server-side upload relays that submit capture data into Snag

Do not use capture keys for the browser extension. The extension has its own one-time exchange flow documented in [Browser Extension](./extension.md).

## What a capture key is

A capture key is an organization-scoped public identifier with three important constraints:

- it belongs to exactly one organization
- it is limited to an explicit list of allowed origins
- it can be revoked at any time

The server stores these fields:

- `public_key`
- `name`
- `status`
- `allowed_origins`
- `last_used_at`
- `revoked_at`

In practice, the key answers one question:

> Can this external website or service open a public upload session for this organization?

## Why this exists

Signed-in workspace members can already create reports through the authenticated upload-session flow. A public website widget cannot.

Capture keys bridge that gap:

1. the workspace owner creates a key in `Settings -> Capture`
2. the external client uses that key to request a short-lived capture token
3. Snag verifies the origin and action
4. Snag returns direct upload instructions
5. the external client uploads artifacts and finalizes the report

This keeps public capture separate from internal workspace auth.

## End-to-end flow

### 1. Create the key

Create a key inside Snag with:

- a human-readable name such as `Marketing site widget`
- one or more allowed origins such as `https://app.example.com`

The API creates a `public_key` that looks like `ck_...`.

### 2. Request a create token

The external client requests a one-time token for the `create` action:

```json
POST /api/v1/public/capture/tokens
{
  "public_key": "ck_...",
  "origin": "https://widget.example.com",
  "action": "create"
}
```

Snag checks that:

- the key exists
- the key is active
- the origin is explicitly allowed

### 3. Create the upload session

Then the client creates a public upload session:

```json
POST /api/v1/public/capture/upload-sessions
{
  "public_key": "ck_...",
  "origin": "https://widget.example.com",
  "capture_token": "...",
  "media_kind": "screenshot",
  "meta": {
    "source": "widget"
  }
}
```

The response includes:

- `upload_session_token`
- `finalize_token`
- signed artifact upload URLs

### 4. Upload the artifacts

The client uploads the files directly to storage using the returned signed PUT URLs.

Depending on the flow, this usually includes:

- screenshot or video
- debugger JSON

### 5. Request a finalize token

Before finalizing, the client asks for a second one-time token:

```json
POST /api/v1/public/capture/tokens
{
  "public_key": "ck_...",
  "origin": "https://widget.example.com",
  "action": "finalize"
}
```

### 6. Finalize the report

```json
POST /api/v1/public/capture/finalize
{
  "public_key": "ck_...",
  "origin": "https://widget.example.com",
  "capture_token": "...",
  "upload_session_token": "...",
  "finalize_token": "...",
  "title": "Checkout button does nothing",
  "summary": "User clicked submit and nothing happened",
  "visibility": "organization"
}
```

For public capture, the response exposes the share URL when the report is public. It does not return an internal workspace report URL.

## Security model

Capture keys are intentionally narrow:

- `allowed_origins` must match exactly
- create and finalize use different one-time tokens
- tokens are signed and single-use
- revoked keys stop working immediately

This is why the client cannot just keep calling the upload endpoints with the bare `public_key`.

## When to use capture keys

Use capture keys when:

- the reporter is anonymous or outside your organization
- the capture entry point lives on another site
- the client cannot authenticate as a workspace member

Do not use capture keys when:

- the user is already signed into Snag
- you are connecting the browser extension
- you need access to internal workspace pages or issue management

## Operational advice

- Create separate keys per surface instead of reusing one key everywhere.
- Keep `allowed_origins` tight. Prefer exact domains over broad lists.
- Revoke keys that are no longer used.
- Name keys by surface, not by team. `Marketing site widget` is better than `Frontend key`.

## Related docs

- [Snag](./index.md)
- [API Contracts](./api.md)
- [Browser Extension](./extension.md)
