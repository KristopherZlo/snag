export const issueWorkflowOptions = [
    { label: 'Inbox', value: 'inbox' },
    { label: 'Triaged', value: 'triaged' },
    { label: 'In progress', value: 'in_progress' },
    { label: 'Ready to verify', value: 'ready_to_verify' },
    { label: 'Done', value: 'done' },
];

export const issueResolutionOptions = [
    { label: 'Unresolved', value: 'unresolved' },
    { label: 'Fixed', value: 'fixed' },
    { label: 'Duplicate', value: 'duplicate' },
    { label: 'Unreproducible', value: 'unreproducible' },
    { label: 'Needs info', value: 'needs_info' },
    { label: 'Blocked', value: 'blocked' },
    { label: "Won't fix", value: 'wontfix' },
];

export const issueUrgencyOptions = [
    { label: 'Low', value: 'low' },
    { label: 'Medium', value: 'medium' },
    { label: 'High', value: 'high' },
    { label: 'Critical', value: 'critical' },
];

export const issueExternalProviderOptions = [
    { label: 'Jira', value: 'jira' },
    { label: 'GitHub', value: 'github' },
    { label: 'Trello', value: 'trello' },
];

export const backlogViewOptions = [
    { label: 'Board', value: 'board' },
    { label: 'List', value: 'list' },
    { label: 'My work', value: 'my_work' },
    { label: 'Verification', value: 'verification' },
];

export const issueBoardColumns = [
    {
        value: 'inbox',
        label: 'Inbox',
        description: 'Fresh evidence that still needs triage.',
        emptyMessage: 'No new issues are waiting in the inbox.',
    },
    {
        value: 'triaged',
        label: 'Triaged',
        description: 'Scoped bugs with enough context to assign.',
        emptyMessage: 'No issues are ready for assignment.',
    },
    {
        value: 'in_progress',
        label: 'In progress',
        description: 'Actively being worked on in the delivery tracker.',
        emptyMessage: 'No issues are currently in progress.',
    },
    {
        value: 'ready_to_verify',
        label: 'Ready to verify',
        description: 'Handed back to QA for validation.',
        emptyMessage: 'No issues are waiting for verification.',
    },
    {
        value: 'done',
        label: 'Done',
        description: 'Closed with a final resolution.',
        emptyMessage: 'No completed issues match these filters.',
    },
];

export const integrationProviderDefinitions = [
    {
        value: 'github',
        label: 'GitHub Issues',
        description: 'Push Snag issues into a repository and pull assignee or state changes back via webhooks.',
        configFields: [
            { key: 'repository', label: 'Repository', placeholder: 'owner/repository' },
            { key: 'token', label: 'Personal access token', placeholder: 'ghp_xxx', type: 'password' },
        ],
    },
    {
        value: 'jira',
        label: 'Jira Cloud',
        description: 'Create synced Jira tickets with mapped priority and status categories.',
        configFields: [
            { key: 'base_url', label: 'Base URL', placeholder: 'https://company.atlassian.net' },
            { key: 'email', label: 'Jira account email', placeholder: 'qa@company.com' },
            { key: 'api_token', label: 'API token', placeholder: 'Atlassian API token', type: 'password' },
            { key: 'project_key', label: 'Project key', placeholder: 'BUG' },
        ],
    },
    {
        value: 'trello',
        label: 'Trello',
        description: 'Reference-only card sharing for lighter workflows. Linking existing cards works today; full sync comes later.',
        configFields: [
            { key: 'board_url', label: 'Board URL', placeholder: 'https://trello.com/b/...' },
            { key: 'workspace', label: 'Workspace label', placeholder: 'Product QA' },
        ],
    },
];
