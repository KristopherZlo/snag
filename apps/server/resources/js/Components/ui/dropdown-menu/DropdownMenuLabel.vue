<script setup>
import { reactiveOmit } from '@vueuse/core';
import { DropdownMenuLabel as DropdownMenuLabelPrimitive, useForwardProps } from 'reka-ui';
import { cn } from '@/lib/utils';

const props = defineProps({
    asChild: { type: Boolean, required: false },
    as: { type: null, required: false },
    inset: { type: Boolean, required: false },
    class: { type: null, required: false },
});

const delegatedProps = reactiveOmit(props, 'class', 'inset');
const forwardedProps = useForwardProps(delegatedProps);
</script>

<template>
    <DropdownMenuLabelPrimitive
        v-bind="forwardedProps"
        data-slot="dropdown-menu-label"
        :class="cn('px-2 py-1.5 text-sm font-semibold', props.inset ? 'pl-8' : undefined, props.class)"
    >
        <slot />
    </DropdownMenuLabelPrimitive>
</template>
