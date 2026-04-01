<script setup>
import { reactiveOmit } from '@vueuse/core';
import { DropdownMenuItem as DropdownMenuItemPrimitive, useForwardPropsEmits } from 'reka-ui';
import { cn } from '@/lib/utils';

const props = defineProps({
    disabled: { type: Boolean, required: false },
    textValue: { type: String, required: false },
    asChild: { type: Boolean, required: false },
    as: { type: null, required: false },
    inset: { type: Boolean, required: false },
    class: { type: null, required: false },
});
const emits = defineEmits(['select']);

const delegatedProps = reactiveOmit(props, 'class', 'inset');
const forwardedProps = useForwardPropsEmits(delegatedProps, emits);
</script>

<template>
    <DropdownMenuItemPrimitive
        v-bind="forwardedProps"
        data-slot="dropdown-menu-item"
        :class="
            cn(
                'relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:cursor-not-allowed data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=\'size-\'])]:size-4',
                props.inset ? 'pl-8' : undefined,
                props.class,
            )
        "
    >
        <slot />
    </DropdownMenuItemPrimitive>
</template>
