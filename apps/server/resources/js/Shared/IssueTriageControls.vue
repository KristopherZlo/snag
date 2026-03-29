<script setup>
import { reactive, ref, watch } from 'vue';
import axios from 'axios';
import ChipSelect from '@/Shared/ChipSelect.vue';
import { Label } from '@/components/ui/label';
import { issueResolutionOptions, issueUrgencyOptions, issueWorkflowOptions } from '@/lib/bug-issues';

const props = defineProps({
    issueId: {
        type: Number,
        required: true,
    },
    workflowState: {
        type: String,
        required: true,
    },
    urgency: {
        type: String,
        required: true,
    },
    resolution: {
        type: String,
        required: true,
    },
    compact: {
        type: Boolean,
        default: false,
    },
    disabled: {
        type: Boolean,
        default: false,
    },
    showLabels: {
        type: Boolean,
        default: true,
    },
});

const emit = defineEmits(['updated', 'error']);

const saving = ref(false);
const failure = ref('');
const form = reactive({
    workflow_state: props.workflowState,
    urgency: props.urgency,
    resolution: props.resolution,
});

const syncFromProps = () => {
    form.workflow_state = props.workflowState;
    form.urgency = props.urgency;
    form.resolution = props.resolution;
};

watch(
    () => [props.workflowState, props.urgency, props.resolution],
    () => {
        if (!saving.value) {
            syncFromProps();
        }
    },
    { immediate: true },
);

const save = async () => {
    if (saving.value || props.disabled) {
        return;
    }

    if (form.workflow_state === 'done' && form.resolution === 'unresolved') {
        failure.value = 'Pick a final resolution before moving an issue to done.';
        emit('error', failure.value);
        syncFromProps();
        return;
    }

    saving.value = true;

    try {
        const { data } = await axios.patch(route('api.v1.issues.update', props.issueId), {
            workflow_state: form.workflow_state,
            urgency: form.urgency,
            resolution: form.resolution,
        });

        failure.value = '';
        emit('updated', data.issue);
    } catch (error) {
        syncFromProps();
        failure.value = error?.response?.data?.message ?? 'Unable to update issue triage.';
        emit('error', failure.value);
    } finally {
        saving.value = false;
    }
};

const updateField = (field, value) => {
    if (form[field] === value) {
        return;
    }

    form[field] = value;
    save();
};
</script>

<template>
    <div class="space-y-2">
        <div :class="compact ? 'grid gap-1.5 sm:grid-cols-3' : 'grid gap-3 md:grid-cols-3'">
            <div :class="compact ? 'space-y-1.5' : 'space-y-2'">
                <Label v-if="showLabels" :for="`issue-workflow-${issueId}`">Stage</Label>
                <ChipSelect
                    :id="`issue-workflow-${issueId}`"
                    :model-value="form.workflow_state"
                    :options="issueWorkflowOptions"
                    :disabled="disabled || saving"
                    :trigger-class="compact ? 'h-7 w-full justify-between rounded-md bg-stone-50 px-2 text-[12px]' : 'w-full justify-between px-3'"
                    :content-class="compact ? 'min-w-[11rem]' : 'min-w-[13rem]'"
                    :test-id-prefix="`issue-workflow-${issueId}`"
                    @update:model-value="updateField('workflow_state', $event)"
                />
            </div>

            <div :class="compact ? 'space-y-1.5' : 'space-y-2'">
                <Label v-if="showLabels" :for="`issue-urgency-${issueId}`">Urgency</Label>
                <ChipSelect
                    :id="`issue-urgency-${issueId}`"
                    :model-value="form.urgency"
                    :options="issueUrgencyOptions"
                    :disabled="disabled || saving"
                    :trigger-class="compact ? 'h-7 w-full justify-between rounded-md bg-stone-50 px-2 text-[12px]' : 'w-full justify-between px-3'"
                    :content-class="compact ? 'min-w-[10rem]' : 'min-w-[12rem]'"
                    :test-id-prefix="`issue-urgency-${issueId}`"
                    @update:model-value="updateField('urgency', $event)"
                />
            </div>

            <div :class="compact ? 'space-y-1.5' : 'space-y-2'">
                <Label v-if="showLabels" :for="`issue-resolution-${issueId}`">Resolution</Label>
                <ChipSelect
                    :id="`issue-resolution-${issueId}`"
                    :model-value="form.resolution"
                    :options="issueResolutionOptions"
                    :disabled="disabled || saving"
                    :trigger-class="compact ? 'h-7 w-full justify-between rounded-md bg-stone-50 px-2 text-[12px]' : 'w-full justify-between px-3'"
                    :content-class="compact ? 'min-w-[11rem]' : 'min-w-[13rem]'"
                    :test-id-prefix="`issue-resolution-${issueId}`"
                    @update:model-value="updateField('resolution', $event)"
                />
            </div>
        </div>

        <p v-if="failure" class="text-sm text-rose-700">
            {{ failure }}
        </p>
    </div>
</template>
