<script setup>
import { onMounted, ref } from 'vue';

const model = defineModel({
    type: String,
    required: true,
});

const input = ref(null);

onMounted(() => {
    if (input.value.hasAttribute('autofocus')) {
        input.value.focus();
    }
});

defineExpose({ focus: () => input.value.focus() });
</script>

<template>
    <input
        class="w-full rounded-lg border border-[color:var(--line)] bg-white px-3 py-2 text-sm text-[color:var(--text)] shadow-none focus:border-[color:var(--accent)] focus:ring-0"
        v-model="model"
        ref="input"
    />
</template>
