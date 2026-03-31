<script setup>
import { computed } from 'vue';
import { Link } from '@inertiajs/vue3';
import { ChevronsUpDown, MoonStar, Settings2 } from 'lucide-vue-next';
import { Avatar, AvatarFallback } from '@/Components/ui/avatar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/Components/ui/dropdown-menu';
import { Switch } from '@/Components/ui/switch';
import { useThemePreference } from '@/lib/theme';
import { cn } from '@/lib/utils';

const props = defineProps({
    initial: {
        type: String,
        required: true,
    },
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
    },
    triggerClass: {
        type: null,
        required: false,
    },
});

const { isDarkTheme, setTheme } = useThemePreference();
const themeLabel = computed(() => (isDarkTheme.value ? 'Dark' : 'Light'));

const handleThemeChange = (value) => {
    setTheme(value ? 'dark' : 'light');
};
</script>

<template>
    <DropdownMenu>
        <DropdownMenuTrigger as-child>
            <button
                type="button"
                data-testid="workspace-account-menu-trigger"
                :class="
                    cn(
                        'flex w-full items-center gap-3 rounded-md border bg-background px-3 py-3 text-left transition-colors hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40',
                        triggerClass,
                    )
                "
            >
                <Avatar class="size-9 shrink-0">
                    <AvatarFallback>{{ initial }}</AvatarFallback>
                </Avatar>
                <div class="min-w-0 flex-1">
                    <div class="truncate text-sm font-medium">{{ name }}</div>
                    <div class="truncate text-xs text-muted-foreground">{{ email }}</div>
                </div>
                <div class="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                    <span>{{ themeLabel }}</span>
                    <ChevronsUpDown class="size-4" />
                </div>
            </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="start" side="top" class="w-72">
            <DropdownMenuLabel class="space-y-1">
                <div class="truncate text-sm font-medium">{{ name }}</div>
                <div class="truncate text-xs font-normal text-muted-foreground">{{ email }}</div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            <DropdownMenuItem as-child>
                <Link :href="route('profile.edit')">
                    <Settings2 class="size-4" />
                    <span>Profile settings</span>
                </Link>
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <div class="flex items-start justify-between gap-4 px-2 py-2" data-testid="workspace-theme-toggle-row">
                <div class="space-y-1">
                    <div class="flex items-center gap-2 text-sm font-medium">
                        <MoonStar class="size-4 text-muted-foreground" />
                        <span>Dark theme</span>
                    </div>
                    <p class="text-xs text-muted-foreground">Switch the workspace appearance.</p>
                </div>

                <Switch
                    :model-value="isDarkTheme"
                    data-testid="workspace-theme-switch"
                    @update:model-value="handleThemeChange"
                />
            </div>
        </DropdownMenuContent>
    </DropdownMenu>
</template>
