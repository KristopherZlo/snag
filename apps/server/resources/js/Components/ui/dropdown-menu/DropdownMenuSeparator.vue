<script setup>
import { reactiveOmit } from '@vueuse/core';
import { DropdownMenuSeparator as DropdownMenuSeparatorPrimitive } from 'reka-ui';
import { cn } from '@/lib/utils';

const props = defineProps({
    asChild: { type: Boolean, required: false },
    as: { type: null, required: false },
    class: { type: null, required: false },
});

const delegatedProps = reactiveOmit(props, 'class');
</script>

<template>
    <DropdownMenuSeparatorPrimitive
        v-bind="delegatedProps"
        data-slot="dropdown-menu-separator"
        :class="cn('-mx-1 my-1 h-px bg-border', props.class)"
    />
</template>
