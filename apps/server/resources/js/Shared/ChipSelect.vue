<script setup>
import { computed } from 'vue';
import { Check, ChevronDown } from 'lucide-vue-next';
import {
    DropdownMenuContent,
    DropdownMenuItemIndicator,
    DropdownMenuPortal,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuRoot,
    DropdownMenuTrigger,
} from 'reka-ui';
import { cn } from '@/lib/utils';

const props = defineProps({
    id: {
        type: String,
        default: undefined,
    },
    modelValue: {
        type: String,
        required: true,
    },
    options: {
        type: Array,
        required: true,
    },
    prefixLabel: {
        type: String,
        default: '',
    },
    disabled: {
        type: Boolean,
        default: false,
    },
    triggerClass: {
        type: null,
        required: false,
    },
    contentClass: {
        type: null,
        required: false,
    },
    itemClass: {
        type: null,
        required: false,
    },
    valueClass: {
        type: null,
        required: false,
    },
    testIdPrefix: {
        type: String,
        default: '',
    },
});

const emit = defineEmits(['update:modelValue']);

const contentWrapper = import.meta.env.MODE === 'test' ? 'div' : DropdownMenuPortal;
const selectedOption = computed(() => props.options.find((option) => option.value === props.modelValue) ?? props.options[0] ?? null);
const selectedLabel = computed(() => selectedOption.value?.label ?? 'Select');

const normalizeToken = (value) => String(value === '' ? 'empty' : value).replaceAll(/[^a-zA-Z0-9_-]+/g, '-');

const triggerTestId = computed(() => (props.testIdPrefix ? `${props.testIdPrefix}-trigger` : undefined));
const optionTestId = (value) => (props.testIdPrefix ? `${props.testIdPrefix}-option-${normalizeToken(value)}` : undefined);

const updateValue = (value) => {
    if (value === props.modelValue) {
        return;
    }

    emit('update:modelValue', value);
};
</script>

<template>
    <DropdownMenuRoot>
        <DropdownMenuTrigger as-child>
            <button
                :id="id"
                type="button"
                :disabled="disabled"
                :data-testid="triggerTestId"
                :class="
                    cn(
                        'inline-flex h-8 max-w-full items-center gap-2 rounded-full border border-stone-300 bg-white px-3 text-sm text-stone-700 shadow-sm transition-colors hover:border-stone-400 hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-300 disabled:pointer-events-none disabled:opacity-50',
                        props.triggerClass,
                    )
                "
            >
                <span v-if="prefixLabel" class="shrink-0 text-stone-500">
                    {{ prefixLabel }}
                </span>
                <span :class="cn('min-w-0 truncate font-medium', props.valueClass)">
                    {{ selectedLabel }}
                </span>
                <ChevronDown class="size-3.5 shrink-0 text-stone-500" />
            </button>
        </DropdownMenuTrigger>

        <select
            tabindex="-1"
            aria-hidden="true"
            class="sr-only"
            :value="modelValue"
            :disabled="disabled"
            :data-testid="testIdPrefix ? `${testIdPrefix}-native` : undefined"
            @change="updateValue($event.target.value)"
        >
            <option v-for="option in options" :key="option.value === '' ? '__native-empty__' : option.value" :value="option.value">
                {{ option.label }}
            </option>
        </select>

        <component :is="contentWrapper">
            <DropdownMenuContent
                align="start"
                :side-offset="8"
                :class="
                    cn(
                        'z-50 min-w-[12rem] rounded-xl border border-stone-200 bg-white p-1 shadow-[0_12px_28px_rgba(28,25,23,0.12)] outline-none',
                        props.contentClass,
                    )
                "
            >
                <DropdownMenuRadioGroup :model-value="modelValue" @update:model-value="updateValue">
                    <DropdownMenuRadioItem
                        v-for="option in options"
                        :key="option.value === '' ? '__empty__' : option.value"
                        :value="option.value"
                        :data-testid="optionTestId(option.value)"
                        :class="
                            cn(
                                'relative flex cursor-default select-none items-center gap-3 rounded-lg px-3 py-2 text-sm text-stone-700 outline-none transition-colors data-[highlighted]:bg-stone-100 data-[state=checked]:bg-stone-100 data-[state=checked]:font-medium',
                                props.itemClass,
                            )
                        "
                    >
                        <span class="grid size-4 shrink-0 place-items-center rounded-sm border border-stone-300 bg-white">
                            <DropdownMenuItemIndicator>
                                <Check class="size-3 text-stone-700" />
                            </DropdownMenuItemIndicator>
                        </span>
                        <span class="truncate">{{ option.label }}</span>
                    </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
            </DropdownMenuContent>
        </component>
    </DropdownMenuRoot>
</template>
