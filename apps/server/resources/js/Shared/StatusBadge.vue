<script setup>
import { computed } from 'vue';
import Tag from 'primevue/tag';

const props = defineProps({
    value: {
        type: String,
        required: true,
    },
});

const severity = computed(() => {
    if (['ready', 'active'].includes(props.value)) {
        return 'success';
    }

    if (props.value === 'processing') {
        return 'warn';
    }

    if (['failed', 'deleted', 'revoked'].includes(props.value)) {
        return 'danger';
    }

    if (['uploaded', 'draft'].includes(props.value)) {
        return 'contrast';
    }

    return 'secondary';
});
</script>

<template>
    <Tag :value="value" :severity="severity" rounded />
</template>
