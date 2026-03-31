<script setup>
import { reactive, ref, watch } from 'vue';
import axios from 'axios';
import ChipSelect from '@/Shared/ChipSelect.vue';
import { Label } from '@/components/ui/label';
import { triageTagOptions, urgencyOptions, workflowStateOptions } from '@/lib/bug-triage';

const props = defineProps({
    reportId: {
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
    tag: {
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
    tag: props.tag,
});

const syncFromProps = () => {
    form.workflow_state = props.workflowState;
    form.urgency = props.urgency;
    form.tag = props.tag;
};

watch(
    () => [props.workflowState, props.urgency, props.tag],
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

    saving.value = true;

    try {
        const { data } = await axios.patch(route('api.v1.reports.triage', props.reportId), {
            workflow_state: form.workflow_state,
            urgency: form.urgency,
            tag: form.tag,
        });

        failure.value = '';
        emit('updated', data);
    } catch (error) {
        syncFromProps();

        failure.value = error?.response?.data?.message ?? 'Unable to update bug triage.';
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
        <div :class="compact ? 'grid gap-1.5 sm:grid-cols-3' : 'grid gap-3'">
            <div :class="compact ? 'space-y-1.5' : 'space-y-2'">
                <Label v-if="showLabels" :for="`triage-workflow-${reportId}`">State</Label>
                <ChipSelect
                    :id="`triage-workflow-${reportId}`"
                    :model-value="form.workflow_state"
                    :options="workflowStateOptions"
                    :disabled="disabled || saving"
                    :trigger-class="compact ? 'h-7 w-full justify-between rounded-md bg-muted/60 px-2 text-[12px]' : 'w-full justify-between px-3'"
                    :content-class="compact ? 'min-w-[10rem]' : undefined"
                    :test-id-prefix="`triage-workflow-${reportId}`"
                    @update:model-value="updateField('workflow_state', $event)"
                />
            </div>

            <div :class="compact ? 'space-y-1.5' : 'space-y-2'">
                <Label v-if="showLabels" :for="`triage-urgency-${reportId}`">Urgency</Label>
                <ChipSelect
                    :id="`triage-urgency-${reportId}`"
                    :model-value="form.urgency"
                    :options="urgencyOptions"
                    :disabled="disabled || saving"
                    :trigger-class="compact ? 'h-7 w-full justify-between rounded-md bg-muted/60 px-2 text-[12px]' : 'w-full justify-between px-3'"
                    :content-class="compact ? 'min-w-[10rem]' : undefined"
                    :test-id-prefix="`triage-urgency-${reportId}`"
                    @update:model-value="updateField('urgency', $event)"
                />
            </div>

            <div :class="compact ? 'space-y-1.5' : 'space-y-2'">
                <Label v-if="showLabels" :for="`triage-tag-${reportId}`">Tag</Label>
                <ChipSelect
                    :id="`triage-tag-${reportId}`"
                    :model-value="form.tag"
                    :options="triageTagOptions"
                    :disabled="disabled || saving"
                    :trigger-class="compact ? 'h-7 w-full justify-between rounded-md bg-muted/60 px-2 text-[12px]' : 'w-full justify-between px-3'"
                    :content-class="compact ? 'min-w-[11rem]' : undefined"
                    :test-id-prefix="`triage-tag-${reportId}`"
                    @update:model-value="updateField('tag', $event)"
                />
            </div>
        </div>

        <p v-if="failure" class="text-sm text-rose-700">
            {{ failure }}
        </p>
    </div>
</template>
