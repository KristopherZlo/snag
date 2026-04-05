<script setup>
import { reactiveOmit } from '@vueuse/core';
import { DropdownMenuContent as DropdownMenuContentPrimitive, DropdownMenuPortal } from 'reka-ui';
import { cn } from '@/lib/utils';

const props = defineProps({
    align: { type: String, required: false, default: 'center' },
    side: { type: String, required: false, default: 'bottom' },
    sideOffset: { type: Number, required: false, default: 4 },
    collisionPadding: { type: [Number, Object], required: false, default: 8 },
    avoidCollisions: { type: Boolean, required: false, default: true },
    asChild: { type: Boolean, required: false },
    as: { type: null, required: false },
    class: { type: null, required: false },
});

const delegatedProps = reactiveOmit(props, 'class');
const portalWrapper = import.meta.env.MODE === 'test' ? 'div' : DropdownMenuPortal;
</script>

<template>
    <component :is="portalWrapper">
        <DropdownMenuContentPrimitive
            v-bind="delegatedProps"
            data-slot="dropdown-menu-content"
            :class="
                cn(
                    'z-50 min-w-56 overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md outline-none data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=open]:animate-in data-[side=bottom]:slide-in-from-top-1 data-[side=left]:slide-in-from-right-1 data-[side=right]:slide-in-from-left-1 data-[side=top]:slide-in-from-bottom-1',
                    props.class,
                )
            "
        >
            <slot />
        </DropdownMenuContentPrimitive>
    </component>
</template>
