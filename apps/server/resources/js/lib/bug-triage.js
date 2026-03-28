export const workflowStateOptions = [
    { label: 'Not done', value: 'todo' },
    { label: 'Done', value: 'done' },
];

export const urgencyOptions = [
    { label: 'Low', value: 'low' },
    { label: 'Medium', value: 'medium' },
    { label: 'High', value: 'high' },
    { label: 'Critical', value: 'critical' },
];

export const triageTagOptions = [
    { label: 'Unresolved', value: 'unresolved' },
    { label: 'Unreproducible', value: 'unreproducible' },
    { label: 'Needs info', value: 'needs_info' },
    { label: 'Duplicate', value: 'duplicate' },
    { label: 'Blocked', value: 'blocked' },
    { label: 'Fixed', value: 'fixed' },
    { label: "Won't fix", value: 'wontfix' },
];

export const reportSortOptions = [
    { label: 'Newest first', value: 'newest' },
    { label: 'Oldest first', value: 'oldest' },
    { label: 'Title A-Z', value: 'title_asc' },
    { label: 'Title Z-A', value: 'title_desc' },
    { label: 'Urgency high-low', value: 'urgency_desc' },
    { label: 'Urgency low-high', value: 'urgency_asc' },
];
