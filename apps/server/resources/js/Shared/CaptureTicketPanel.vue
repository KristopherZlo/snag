<script setup>
import { computed, ref, watch } from 'vue';
import axios from 'axios';
import { Link } from '@inertiajs/vue3';
import StatusBadge from '@/Shared/StatusBadge.vue';
import { Button, buttonVariants } from '@/Components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/Components/ui/dialog';
import { Label } from '@/Components/ui/label';
import { NativeSelect, NativeSelectOption } from '@/Components/ui/native-select';
import { cn } from '@/lib/utils';

const props = defineProps({
    reportId: {
        type: Number,
        required: true,
    },
    linkedTicket: {
        type: Object,
        default: null,
    },
    availableTickets: {
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
});

const emit = defineEmits(['updated']);

const linkedTicketState = ref(props.linkedTicket);
const dialogOpen = ref(false);
const selectedTicketId = ref('');
const busy = ref(false);
const feedback = ref('');
const failure = ref('');

watch(
    () => props.linkedTicket,
    (value) => {
        linkedTicketState.value = value;
    },
    { immediate: true },
);

const selectableTickets = computed(() =>
    props.availableTickets.filter((ticket) => ticket.id !== linkedTicketState.value?.id),
);
const canLinkToExistingTicket = computed(() => selectableTickets.value.length > 0);
const isLinked = computed(() => Boolean(linkedTicketState.value));
const dialogTitle = computed(() => (isLinked.value ? 'Move capture to another ticket' : 'Link capture to an existing ticket'));
const dialogDescription = computed(() => (isLinked.value
    ? 'This capture will be removed from its current ticket and linked to the selected ticket.'
    : 'Choose the existing ticket that should collect this capture as evidence.'));
const confirmButtonLabel = computed(() => (isLinked.value ? 'Move capture' : 'Link to selected ticket'));

const applyTicketUpdate = (ticket, message = '') => {
    linkedTicketState.value = ticket;
    feedback.value = message;
    failure.value = '';
    selectedTicketId.value = '';
    emit('updated', ticket);
};

const createTicket = async () => {
    if (busy.value) {
        return;
    }

    busy.value = true;
    feedback.value = '';
    failure.value = '';

    try {
        const payload = {};

        if (props.suggestedTitle) {
            payload.title = props.suggestedTitle;
        }

        if (props.suggestedSummary) {
            payload.summary = props.suggestedSummary;
        }

        const { data } = await axios.post(route('api.v1.reports.issue', props.reportId), payload);
        applyTicketUpdate(data.issue, `Capture added to ${data.issue.key}.`);
    } catch (error) {
        failure.value = error?.response?.data?.message ?? 'Unable to create a ticket from this capture.';
    } finally {
        busy.value = false;
    }
};

const openLinkDialog = () => {
    feedback.value = '';
    failure.value = '';
    selectedTicketId.value = '';
    dialogOpen.value = true;
};

const closeLinkDialog = () => {
    dialogOpen.value = false;
    selectedTicketId.value = '';
};

const confirmLink = async () => {
    if (busy.value || selectedTicketId.value === '') {
        return;
    }

    const nextTicketId = Number(selectedTicketId.value);
    const currentTicketId = linkedTicketState.value?.id ?? null;
    const changingTicket = currentTicketId !== null && currentTicketId !== nextTicketId;

    busy.value = true;
    feedback.value = '';
    failure.value = '';

    try {
        if (changingTicket) {
            await axios.delete(route('api.v1.issues.reports.destroy', {
                bugIssue: currentTicketId,
                bugReport: props.reportId,
            }));

            applyTicketUpdate(null, '');
        }

        const { data } = await axios.post(route('api.v1.reports.issue', props.reportId), {
            bug_issue_id: nextTicketId,
        });

        applyTicketUpdate(
            data.issue,
            changingTicket
                ? `Capture moved to ${data.issue.key}.`
                : `Capture linked to ${data.issue.key}.`,
        );
        closeLinkDialog();
    } catch (error) {
        failure.value = changingTicket
            ? 'The capture was removed from the previous ticket, but linking the new ticket failed.'
            : (error?.response?.data?.message ?? 'Unable to link this capture to the selected ticket.');
    } finally {
        busy.value = false;
    }
};

const removeFromTicket = async () => {
    if (busy.value || !linkedTicketState.value) {
        return;
    }

    busy.value = true;
    feedback.value = '';
    failure.value = '';

    try {
        await axios.delete(route('api.v1.issues.reports.destroy', {
            bugIssue: linkedTicketState.value.id,
            bugReport: props.reportId,
        }));

        applyTicketUpdate(null, 'Capture removed from ticket.');
    } catch (error) {
        failure.value = error?.response?.data?.message ?? 'Unable to remove this capture from the ticket.';
    } finally {
        busy.value = false;
    }
};
</script>

<template>
    <div class="space-y-4" data-testid="capture-ticket-panel">
        <div class="rounded-xl border bg-muted/30 p-4">
            <div class="text-sm font-medium">How this works</div>
            <p class="mt-1 text-sm text-muted-foreground">
                A capture is one concrete recording with evidence. A ticket is the problem that can group several captures together.
            </p>
        </div>

        <div v-if="linkedTicketState" class="space-y-4 rounded-xl border p-4">
            <div class="space-y-2">
                <div class="flex flex-wrap items-center gap-2">
                    <span class="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">{{ linkedTicketState.key }}</span>
                    <StatusBadge :value="linkedTicketState.workflow_state" />
                    <StatusBadge :value="linkedTicketState.resolution" />
                    <StatusBadge :value="linkedTicketState.urgency" />
                </div>
                <div class="text-base font-semibold">{{ linkedTicketState.title }}</div>
                <div class="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <span>{{ linkedTicketState.linked_reports_count }} captures in this ticket</span>
                    <span>{{ linkedTicketState.reporters_count }} reporters</span>
                </div>
                <p class="text-sm text-muted-foreground">
                    Manage sharing, external sync, and all evidence from the ticket page.
                </p>
            </div>

            <div class="flex flex-wrap gap-2">
                <Link
                    :href="linkedTicketState.issue_url"
                    :class="cn(buttonVariants({ variant: 'default', size: 'sm' }), 'rounded-md')"
                    data-testid="capture-ticket-open"
                    aria-label="Open ticket"
                >
                    Open ticket
                </Link>
                <Button
                    variant="outline"
                    size="sm"
                    class="rounded-md"
                    data-testid="capture-ticket-change"
                    aria-label="Change ticket"
                    :disabled="busy || !canLinkToExistingTicket"
                    @click="openLinkDialog"
                >
                    Change ticket
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    class="rounded-md"
                    data-testid="capture-ticket-remove"
                    aria-label="Remove capture from ticket"
                    :disabled="busy"
                    @click="removeFromTicket"
                >
                    Remove from ticket
                </Button>
            </div>

            <p v-if="!canLinkToExistingTicket" class="text-sm text-muted-foreground">
                No other open tickets are available right now.
            </p>
        </div>

        <div v-else class="space-y-4 rounded-xl border p-4">
            <div class="space-y-2">
                <div class="text-base font-semibold">This capture is not in a ticket yet.</div>
                <p class="text-sm text-muted-foreground">
                    Create a new ticket for this problem, or link the capture to an existing ticket if this is a duplicate or follow-up reproduction.
                </p>
            </div>

            <div class="flex flex-wrap gap-2">
                <Button
                    size="sm"
                    class="rounded-md"
                    data-testid="capture-ticket-create"
                    aria-label="Create ticket"
                    :disabled="busy"
                    @click="createTicket"
                >
                    Create ticket
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    class="rounded-md"
                    data-testid="capture-ticket-link-existing"
                    aria-label="Link capture to existing ticket"
                    :disabled="busy || !canLinkToExistingTicket"
                    @click="openLinkDialog"
                >
                    Link existing ticket
                </Button>
            </div>

            <p v-if="!canLinkToExistingTicket" class="text-sm text-muted-foreground">
                No open tickets are available. Create a new ticket from this capture.
            </p>
        </div>

        <p v-if="feedback" class="text-sm text-primary">{{ feedback }}</p>
        <p v-if="failure" class="text-sm text-rose-700">{{ failure }}</p>

        <Dialog v-model:open="dialogOpen">
            <DialogContent class="sm:max-w-lg" data-testid="capture-ticket-dialog">
                <DialogHeader>
                    <DialogTitle>{{ dialogTitle }}</DialogTitle>
                    <DialogDescription>
                        {{ dialogDescription }}
                    </DialogDescription>
                </DialogHeader>

                <div class="space-y-2">
                    <Label for="capture-ticket-target">Ticket</Label>
                    <NativeSelect
                        id="capture-ticket-target"
                        v-model="selectedTicketId"
                        data-testid="capture-ticket-target"
                    >
                        <NativeSelectOption value="">Choose a ticket</NativeSelectOption>
                        <NativeSelectOption
                            v-for="ticket in selectableTickets"
                            :key="ticket.id"
                            :value="String(ticket.id)"
                        >
                            {{ ticket.key }} - {{ ticket.title }}
                        </NativeSelectOption>
                    </NativeSelect>
                </div>

                <DialogFooter class="gap-2 sm:justify-end">
                    <Button variant="outline" :disabled="busy" @click="closeLinkDialog">
                        Cancel
                    </Button>
                    <Button
                        data-testid="capture-ticket-confirm-link"
                        :disabled="busy || selectedTicketId === ''"
                        @click="confirmLink"
                    >
                        {{ busy ? 'Saving...' : confirmButtonLabel }}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
</template>
