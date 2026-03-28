<script setup>
import { reactive, ref, watch } from 'vue';
import axios from 'axios';
import { Label } from '@/components/ui/label';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
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
</script>

<template>
    <div class="space-y-2">
        <div :class="compact ? 'grid gap-3 sm:grid-cols-3' : 'grid gap-3'">
            <div class="space-y-2">
                <Label v-if="showLabels" :for="`triage-workflow-${reportId}`">State</Label>
                <NativeSelect
                    :id="`triage-workflow-${reportId}`"
                    v-model="form.workflow_state"
                    class="w-full"
                    :disabled="disabled || saving"
                    @change="save"
                >
                    <NativeSelectOption
                        v-for="option in workflowStateOptions"
                        :key="option.value"
                        :value="option.value"
                    >
                        {{ option.label }}
                    </NativeSelectOption>
                </NativeSelect>
            </div>

            <div class="space-y-2">
                <Label v-if="showLabels" :for="`triage-urgency-${reportId}`">Urgency</Label>
                <NativeSelect
                    :id="`triage-urgency-${reportId}`"
                    v-model="form.urgency"
                    class="w-full"
                    :disabled="disabled || saving"
                    @change="save"
                >
                    <NativeSelectOption
                        v-for="option in urgencyOptions"
                        :key="option.value"
                        :value="option.value"
                    >
                        {{ option.label }}
                    </NativeSelectOption>
                </NativeSelect>
            </div>

            <div class="space-y-2">
                <Label v-if="showLabels" :for="`triage-tag-${reportId}`">Tag</Label>
                <NativeSelect
                    :id="`triage-tag-${reportId}`"
                    v-model="form.tag"
                    class="w-full"
                    :disabled="disabled || saving"
                    @change="save"
                >
                    <NativeSelectOption
                        v-for="option in triageTagOptions"
                        :key="option.value"
                        :value="option.value"
                    >
                        {{ option.label }}
                    </NativeSelectOption>
                </NativeSelect>
            </div>
        </div>

        <p v-if="failure" class="text-sm text-rose-700">
            {{ failure }}
        </p>
    </div>
</template>
