<script setup>
import { computed, ref, watch } from 'vue';
import axios from 'axios';
import ChipSelect from '@/Shared/ChipSelect.vue';
import StatusBadge from '@/Shared/StatusBadge.vue';
import TextLink from '@/Shared/TextLink.vue';
import { Button } from '@/Components/ui/button';

const props = defineProps({
    reportId: {
        type: Number,
        required: true,
    },
    linkedIssue: {
        type: Object,
        default: null,
    },
    availableIssues: {
        type: Array,
        default: () => [],
    },
    suggestedTitle: {
        type: String,
        default: '',
    },
    suggestedSummary: {
        type: String,
        default: '',
    },
    compact: {
        type: Boolean,
        default: false,
    },
});

const emit = defineEmits(['linked']);

const selectedIssueId = ref('');
const busy = ref(false);
const failure = ref('');
const linkedIssueState = ref(props.linkedIssue);

watch(
    () => props.linkedIssue,
    (value) => {
        linkedIssueState.value = value;
    },
    { immediate: true },
);

const issueOptions = computed(() =>
    props.availableIssues.map((issue) => ({
        label: `${issue.key} ${issue.title}`,
        value: String(issue.id),
    })),
);
const primaryExternalLink = computed(() => linkedIssueState.value?.primary_external_link ?? null);
const hasGuestShare = computed(() => Boolean(linkedIssueState.value?.guest_share_url));

const createIssue = async () => {
    if (busy.value || linkedIssueState.value) {
        return;
    }

    busy.value = true;

    try {
        const payload = {};

        if (props.suggestedTitle) {
            payload.title = props.suggestedTitle;
        }

        if (props.suggestedSummary) {
            payload.summary = props.suggestedSummary;
        }

        const { data } = await axios.post(route('api.v1.reports.issue', props.reportId), payload);
        linkedIssueState.value = data.issue;
        failure.value = '';
        emit('linked', data.issue);
    } catch (error) {
        failure.value = error?.response?.data?.message ?? 'Unable to create an issue from this report.';
    } finally {
        busy.value = false;
    }
};

const attachIssue = async () => {
    if (busy.value || linkedIssueState.value || selectedIssueId.value === '') {
        return;
    }

    busy.value = true;

    try {
        const { data } = await axios.post(route('api.v1.reports.issue', props.reportId), {
            bug_issue_id: Number(selectedIssueId.value),
        });
        linkedIssueState.value = data.issue;
        failure.value = '';
        emit('linked', data.issue);
    } catch (error) {
        failure.value = error?.response?.data?.message ?? 'Unable to attach this report to an existing issue.';
    } finally {
        busy.value = false;
    }
};
</script>

<template>
    <div :class="compact ? 'space-y-2' : 'space-y-3'">
        <div
            v-if="linkedIssueState"
            class="rounded-md border border-border/70 bg-muted/40 px-3 py-2.5"
            :data-testid="`linked-issue-${reportId}`"
        >
            <div class="flex items-start justify-between gap-3">
                <div class="min-w-0 space-y-1">
                    <div class="flex flex-wrap items-center gap-2">
                        <span class="text-xs font-medium text-muted-foreground">{{ linkedIssueState.key }}</span>
                        <StatusBadge :value="linkedIssueState.workflow_state" />
                        <StatusBadge :value="linkedIssueState.resolution" />
                    </div>
                    <div class="truncate text-sm font-medium">{{ linkedIssueState.title }}</div>
                </div>

                <TextLink :href="linkedIssueState.issue_url" class="shrink-0 text-sm font-medium text-primary hover:underline">
                    Open issue
                </TextLink>
            </div>

            <div class="mt-2 flex flex-wrap gap-2">
                <StatusBadge :value="linkedIssueState.urgency" />
                <StatusBadge
                    v-if="primaryExternalLink"
                    :value="primaryExternalLink.provider"
                />
            </div>

            <div class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span>{{ linkedIssueState.linked_reports_count }} linked reports</span>
                <span>{{ linkedIssueState.reporters_count }} reporters</span>
                <TextLink
                    v-if="primaryExternalLink"
                    :href="primaryExternalLink.external_url"
                    native
                    target="_blank"
                    rel="noreferrer"
                    class="text-xs font-medium text-primary hover:underline"
                >
                    {{ primaryExternalLink.external_key }}
                </TextLink>
                <TextLink
                    v-if="hasGuestShare"
                    :href="linkedIssueState.guest_share_url"
                    native
                    target="_blank"
                    rel="noreferrer"
                    class="text-xs font-medium text-primary hover:underline"
                >
                    Guest share
                </TextLink>
            </div>
        </div>

        <template v-else>
            <div
                :class="compact ? 'flex flex-col gap-2' : 'grid gap-2 md:grid-cols-[auto_minmax(0,1fr)_auto]'"
                :data-testid="compact ? `report-issue-linker-actions-${reportId}` : undefined"
            >
                <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    :disabled="busy"
                    :class="compact ? 'w-full justify-center rounded-md' : 'rounded-md'"
                    @click="createIssue"
                >
                    Create issue
                </Button>

                <div class="min-w-0">
                    <ChipSelect
                        :id="`report-link-issue-${reportId}`"
                        v-model="selectedIssueId"
                        :options="[{ label: 'Attach to existing issue', value: '' }, ...issueOptions]"
                        :disabled="busy || issueOptions.length === 0"
                        prefix-label=""
                        :trigger-class="compact ? 'w-full justify-between rounded-md px-3' : 'w-full justify-between rounded-md px-3'"
                        content-class="min-w-[18rem]"
                    />
                </div>

                <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    :disabled="busy || selectedIssueId === '' || issueOptions.length === 0"
                    :class="compact ? 'w-full rounded-md' : 'rounded-md'"
                    @click="attachIssue"
                >
                    Attach
                </Button>
            </div>

            <p v-if="issueOptions.length === 0" class="text-sm text-muted-foreground">
                No open issues available. Create a new one from this report.
            </p>
        </template>

        <p v-if="failure" class="text-sm text-rose-700">
            {{ failure }}
        </p>
    </div>
</template>
