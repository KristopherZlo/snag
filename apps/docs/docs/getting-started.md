# Getting Started

Snag is the evidence layer around your delivery tools. Use it to capture the bug, review the full context, and hand the result off to Jira, GitHub, or Trello without losing screenshots, recordings, steps, or debugger payloads.

## Choose the right intake flow

### Signed-in workspace capture

Use the authenticated upload flow when the reporter is already inside your organization.

- Best for internal QA, support, and engineering teams
- Uploads go straight into the workspace queue
- Reports can be triaged, linked to backlog issues, and shared internally

### Browser extension

Use the extension when the reporter needs to capture the active tab with a fast, explicit connect flow.

- Connect through a one-time code
- Capture screenshots without opening the full workspace first
- Submit through the authenticated report upload flow

Read more in [Browser Extension](./extension.md).

### Public capture keys

Use capture keys when the reporter is outside Snag and the entry point lives on another site or service.

- Website feedback widgets
- Public bug forms
- Embedded "report a problem" buttons
- Server-side relay flows

Read more in [Capture Keys](./capture.md).

## Review and triage inside Snag

Once a report lands in the queue, Snag becomes the place where the evidence stays organized.

- Review screenshots, recordings, steps, console output, and network traces together
- Decide whether the report becomes a tracked issue
- Generate share links or handoff packages without exposing private debugger payloads by default

## Handoff to delivery systems

Snag is not a replacement for Jira, GitHub, or Trello. It complements them.

- Snag owns capture, evidence, reproduction context, sharing, and verification
- External trackers remain the place where delivery execution happens
- Issue links, sync status, and handoff packages keep both systems aligned

## Where to go next

- [API Contracts](./api.md) for endpoint-level integration details
- [Capture Keys](./capture.md) for public intake
- [Browser Extension](./extension.md) for the one-time connect model
