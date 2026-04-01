---
layout: home

hero:
  name: Snag Docs
  text: Capture the bug, keep the evidence, and hand it off cleanly.
  tagline: Snag centralizes screenshots, recordings, debugger traces, review context, and share flows while Jira, GitHub, and Trello stay optional execution layers.
  actions:
    - theme: brand
      text: Get started
      link: /getting-started
    - theme: alt
      text: API contracts
      link: /api
    - theme: alt
      text: Capture keys
      link: /capture

features:
  - title: Pick the right intake surface
    details: Use authenticated uploads for internal teams, the browser extension for fast in-browser capture, or public capture keys for widgets and forms outside the workspace.
  - title: Review with full context
    details: Keep screenshots, recordings, steps, console logs, and network traces attached to the same report instead of splitting context across tools.
  - title: Handoff without losing evidence
    details: Link backlog issues, share reproducible context, and sync delivery work outward while Snag remains the evidence and verification layer.
---

## Start with the workflow

1. Create the report through the authenticated flow, the browser extension, or a capture key.
2. Review the incoming report in the workspace queue with visual and debugger evidence attached.
3. Convert the report into a tracked issue, share it, or sync it into an external delivery system.

## Documentation map

- [Getting started](./getting-started.md) for the product model and where each capture flow fits
- [Capture Keys](./capture.md) for public forms, widgets, and external intake surfaces
- [API Contracts](./api.md) for stable endpoint and DTO references
- [Browser Extension](./extension.md) for the one-time connect flow

## Product shape

- Laravel monolith for auth, reporting, billing, invitations, and signed artifact access
- Inertia and Vue workspace for queue review, bug backlog, settings, and share pages
- Direct-to-storage uploads with presigned instructions and explicit finalize steps
- Organization-scoped access control around reports, issue triage, public sharing, and integrations
