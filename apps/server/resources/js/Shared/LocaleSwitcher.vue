<script setup>
import { computed } from 'vue';
import { Languages } from 'lucide-vue-next';
import { Label } from '@/Components/ui/label';
import { NativeSelect, NativeSelectOption } from '@/Components/ui/native-select';
import { useLocalePreference } from '@/lib/locale';

const props = defineProps({
    compact: {
        type: Boolean,
        default: false,
    },
    label: {
        type: String,
        default: 'Language',
    },
});

const { currentLocale, availableLocales, updateLocale } = useLocalePreference();

const selectedLocale = computed({
    get: () => currentLocale.value,
    set: (value) => updateLocale(value),
});
</script>

<template>
    <div :class="compact ? 'flex items-center gap-2' : 'space-y-2'" data-testid="locale-switcher">
        <Label v-if="!compact" class="text-xs font-medium text-muted-foreground">
            {{ label }}
        </Label>

        <div class="flex items-center gap-2">
            <Languages class="size-4 text-muted-foreground" />
            <NativeSelect
                v-model="selectedLocale"
                :aria-label="label"
                :class="compact ? 'h-8 min-w-[8.5rem] text-sm' : 'h-9 min-w-[11rem] text-sm'"
                data-testid="locale-switcher-select"
            >
                <NativeSelectOption
                    v-for="locale in availableLocales"
                    :key="locale.code"
                    :value="locale.code"
                >
                    {{ locale.native_name }}
                </NativeSelectOption>
            </NativeSelect>
        </div>
    </div>
</template>
