<script setup>
import { computed } from 'vue';

const props = defineProps({
    value: {
        type: String,
        required: true,
    },
});

const klass = computed(() => `status-pill is-${props.value}`);
</script>

<template>
    <span :class="klass">{{ value }}</span>
</template>
