<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">

        <title inertia>{{ config('app.name', 'Laravel') }}</title>

        <script>
            (() => {
                const storageKey = 'snag-theme';
                const root = document.documentElement;

                try {
                    const storedTheme = window.localStorage.getItem(storageKey);
                    const resolvedTheme = storedTheme === 'dark' || storedTheme === 'light'
                        ? storedTheme
                        : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

                    root.classList.toggle('dark', resolvedTheme === 'dark');
                    root.dataset.theme = resolvedTheme;
                    root.style.colorScheme = resolvedTheme;
                } catch {
                    root.classList.remove('dark');
                    root.dataset.theme = 'light';
                    root.style.colorScheme = 'light';
                }
            })();
        </script>

        <!-- Scripts -->
        @routes
        @vite(['resources/js/app.js', "resources/js/Pages/{$page['component']}.vue"])
        @inertiaHead
    </head>
    <body class="antialiased">
        @php
            $pageComponent = $page['component'] ?? '';
            $settingsSection = data_get($page, 'props.section', 'profile');
            $workspaceShell = auth()->check()
                && !str_starts_with($pageComponent, 'Auth/')
                && $pageComponent !== 'Error'
                && !str_ends_with($pageComponent, '/Share');
            $pageVariant = match (true) {
                $pageComponent === 'Dashboard' => 'dashboard',
                $pageComponent === 'Reports/Show' => 'report',
                $pageComponent === 'Bugs/Show' => 'bug',
                $pageComponent === 'Bugs/Index' => 'bugs-index',
                str_starts_with($pageComponent, 'Settings/') => 'settings',
                str_starts_with($pageComponent, 'Extension/') => 'extension',
                str_starts_with($pageComponent, 'Auth/') => 'auth',
                $pageComponent === 'Error' => 'error',
                str_ends_with($pageComponent, '/Share') => 'share',
                default => $workspaceShell ? 'workspace' : 'guest',
            };
        @endphp
        <div id="app-boot-shell" aria-hidden="true" class="fixed inset-0 z-[110] bg-background">
            @if ($workspaceShell)
                <div class="flex h-full">
                    <aside class="hidden w-64 shrink-0 border-r bg-sidebar lg:flex lg:flex-col">
                        <div class="flex items-center justify-between gap-3 border-b px-5 py-4">
                            <div class="h-10 w-28 animate-pulse rounded-md bg-foreground/8"></div>
                            <div class="h-8 w-8 animate-pulse rounded-md bg-foreground/8"></div>
                        </div>
                        <div class="border-b px-5 py-3">
                            <div class="h-4 w-32 animate-pulse rounded-md bg-foreground/8"></div>
                            <div class="mt-2 h-4 w-24 animate-pulse rounded-md bg-foreground/8"></div>
                        </div>
                        <div class="flex-1 space-y-5 px-3 py-4">
                            <div class="space-y-2">
                                <div class="h-3 w-20 animate-pulse rounded-md bg-foreground/8"></div>
                                @for ($i = 0; $i < 3; $i++)
                                    <div class="h-8 w-full animate-pulse rounded-md bg-foreground/8"></div>
                                @endfor
                            </div>
                            <div class="space-y-2">
                                <div class="h-3 w-24 animate-pulse rounded-md bg-foreground/8"></div>
                                @for ($i = 0; $i < 4; $i++)
                                    <div class="h-8 w-full animate-pulse rounded-md bg-foreground/8"></div>
                                @endfor
                            </div>
                        </div>
                        <div class="border-t p-3">
                            <div class="h-12 w-full animate-pulse rounded-md bg-foreground/8"></div>
                        </div>
                    </aside>

                    <div class="flex min-w-0 flex-1 flex-col">
                        <header class="border-b px-4 py-4 md:px-6">
                            <div class="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                                <div class="space-y-3">
                                    <div class="flex items-center gap-2">
                                        <div class="h-4 w-24 animate-pulse rounded-md bg-foreground/8"></div>
                                        <div class="h-4 w-4 animate-pulse rounded-md bg-foreground/8"></div>
                                        <div class="h-4 w-36 animate-pulse rounded-md bg-foreground/8"></div>
                                    </div>
                                    <div class="h-8 w-64 max-w-full animate-pulse rounded-md bg-foreground/8"></div>
                                    <div class="h-4 w-[34rem] max-w-full animate-pulse rounded-md bg-foreground/8"></div>
                                </div>
                                <div class="h-10 w-full max-w-80 animate-pulse rounded-md bg-foreground/8"></div>
                            </div>
                            <div class="mt-4 flex flex-wrap gap-3">
                                @for ($i = 0; $i < 4; $i++)
                                    <div class="h-4 w-24 animate-pulse rounded-md bg-foreground/8"></div>
                                @endfor
                            </div>
                        </header>

                        <div class="px-4 py-6 md:px-6">
                            @if ($pageVariant === 'dashboard')
                                <div class="rounded-lg border bg-card">
                                    <div class="space-y-5 border-b px-6 py-5">
                                        <div class="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                                            <div class="space-y-2">
                                                <div class="h-6 w-40 animate-pulse rounded-md bg-foreground/8"></div>
                                                <div class="h-4 w-[28rem] max-w-full animate-pulse rounded-md bg-foreground/8"></div>
                                            </div>
                                            <div class="flex gap-2">
                                                <div class="h-9 w-24 animate-pulse rounded-md bg-foreground/8"></div>
                                                <div class="h-9 w-24 animate-pulse rounded-md bg-foreground/8"></div>
                                            </div>
                                        </div>
                                        <div class="grid gap-3 lg:grid-cols-[minmax(0,1.6fr)_200px_220px_auto]">
                                            <div class="h-10 w-full animate-pulse rounded-md bg-foreground/8"></div>
                                            <div class="h-10 w-full animate-pulse rounded-md bg-foreground/8"></div>
                                            <div class="h-10 w-full animate-pulse rounded-md bg-foreground/8"></div>
                                            <div class="hidden h-4 w-28 animate-pulse self-center rounded-md bg-foreground/8 lg:block"></div>
                                        </div>
                                    </div>
                                    <div class="grid gap-4 p-6 md:grid-cols-2 2xl:grid-cols-3">
                                        @for ($i = 0; $i < 6; $i++)
                                            <div class="overflow-hidden rounded-lg border">
                                                <div class="aspect-[16/9] animate-pulse bg-foreground/8"></div>
                                                <div class="space-y-3 p-4">
                                                    <div class="h-5 w-2/3 animate-pulse rounded-md bg-foreground/8"></div>
                                                    <div class="h-4 w-full animate-pulse rounded-md bg-foreground/8"></div>
                                                    <div class="h-4 w-5/6 animate-pulse rounded-md bg-foreground/8"></div>
                                                </div>
                                            </div>
                                        @endfor
                                    </div>
                                </div>
                            @elseif ($pageVariant === 'bugs-index')
                                <div class="rounded-lg border bg-card">
                                    <div class="space-y-5 border-b px-6 py-5">
                                        <div class="flex flex-wrap gap-3">
                                            @for ($i = 0; $i < 6; $i++)
                                                <div class="h-4 w-24 animate-pulse rounded-md bg-foreground/8"></div>
                                            @endfor
                                        </div>
                                        <div class="grid gap-3 lg:grid-cols-[minmax(0,1.5fr)_220px_220px_220px_auto]">
                                            @for ($i = 0; $i < 5; $i++)
                                                <div class="h-10 w-full animate-pulse rounded-md bg-foreground/8"></div>
                                            @endfor
                                        </div>
                                    </div>
                                    <div class="overflow-x-auto bg-muted/30 p-4">
                                        <div class="flex min-w-[72rem] gap-4">
                                            @for ($i = 0; $i < 4; $i++)
                                                <div class="w-[18rem] shrink-0 space-y-3 rounded-lg border bg-background p-3">
                                                    <div class="h-4 w-24 animate-pulse rounded-md bg-foreground/8"></div>
                                                    @for ($j = 0; $j < 3; $j++)
                                                        <div class="h-36 w-full animate-pulse rounded-md bg-foreground/8"></div>
                                                    @endfor
                                                </div>
                                            @endfor
                                        </div>
                                    </div>
                                </div>
                            @elseif ($pageVariant === 'settings')
                                <div class="space-y-6">
                                    <div class="border-b pb-4">
                                        <div class="flex flex-wrap gap-2">
                                            @for ($i = 0; $i < 6; $i++)
                                                <div class="h-9 w-24 animate-pulse rounded-md bg-foreground/8"></div>
                                            @endfor
                                        </div>
                                    </div>
                                    @if ($settingsSection === 'members')
                                        <div class="h-72 w-full animate-pulse rounded-lg bg-foreground/8"></div>
                                        <div class="h-40 w-full animate-pulse rounded-lg bg-foreground/8"></div>
                                        <div class="h-64 w-full animate-pulse rounded-lg bg-foreground/8"></div>
                                    @elseif ($settingsSection === 'capture-keys')
                                        <div class="grid gap-4 lg:grid-cols-2">
                                            <div class="h-32 w-full animate-pulse rounded-lg bg-foreground/8"></div>
                                            <div class="h-32 w-full animate-pulse rounded-lg bg-foreground/8"></div>
                                        </div>
                                        <div class="h-56 w-full animate-pulse rounded-lg bg-foreground/8"></div>
                                        <div class="h-72 w-full animate-pulse rounded-lg bg-foreground/8"></div>
                                    @else
                                        <div class="h-48 w-full animate-pulse rounded-lg bg-foreground/8"></div>
                                        <div class="h-72 w-full animate-pulse rounded-lg bg-foreground/8"></div>
                                    @endif
                                </div>
                            @else
                                <div class="grid gap-6 {{ in_array($pageVariant, ['report', 'bug', 'extension'], true) ? 'xl:grid-cols-[minmax(0,1fr)_288px]' : '' }}">
                                    <div class="space-y-6">
                                        <div class="h-72 w-full animate-pulse rounded-lg bg-foreground/8"></div>
                                        <div class="h-80 w-full animate-pulse rounded-lg bg-foreground/8"></div>
                                        @if ($pageVariant !== 'workspace')
                                            <div class="h-64 w-full animate-pulse rounded-lg bg-foreground/8"></div>
                                        @endif
                                    </div>
                                    @if (in_array($pageVariant, ['report', 'bug', 'extension'], true))
                                        <div class="space-y-6">
                                            <div class="h-72 w-full animate-pulse rounded-lg bg-foreground/8"></div>
                                            <div class="h-56 w-full animate-pulse rounded-lg bg-foreground/8"></div>
                                        </div>
                                    @endif
                                </div>
                            @endif
                        </div>
                    </div>
                </div>
            @elseif ($pageVariant === 'share')
                <div class="px-4 py-6 md:px-6">
                    <div class="mx-auto max-w-6xl space-y-6">
                        <div class="h-6 w-28 animate-pulse rounded-md bg-foreground/8"></div>
                        <div class="h-10 w-[32rem] max-w-full animate-pulse rounded-md bg-foreground/8"></div>
                        <div class="h-4 w-[36rem] max-w-full animate-pulse rounded-md bg-foreground/8"></div>
                        <div class="h-40 w-full animate-pulse rounded-lg bg-foreground/8"></div>
                        <div class="aspect-[16/8] animate-pulse rounded-lg bg-foreground/8"></div>
                    </div>
                </div>
            @else
                <div class="flex min-h-screen items-center justify-center px-4 py-6 md:px-6">
                    <div class="w-full max-w-xl space-y-6">
                        <div class="flex items-center justify-between gap-4">
                            <div class="h-10 w-28 animate-pulse rounded-md bg-foreground/8"></div>
                            <div class="h-9 w-24 animate-pulse rounded-md bg-foreground/8"></div>
                        </div>
                        <div class="rounded-lg border bg-card p-6 sm:p-8">
                            <div class="space-y-4">
                                <div class="h-8 w-3/4 animate-pulse rounded-md bg-foreground/8"></div>
                                <div class="h-4 w-full animate-pulse rounded-md bg-foreground/8"></div>
                                <div class="h-4 w-5/6 animate-pulse rounded-md bg-foreground/8"></div>
                                <div class="h-10 w-full animate-pulse rounded-md bg-foreground/8"></div>
                                <div class="h-10 w-full animate-pulse rounded-md bg-foreground/8"></div>
                                <div class="flex gap-3">
                                    <div class="h-10 w-28 animate-pulse rounded-md bg-foreground/8"></div>
                                    <div class="h-10 w-24 animate-pulse rounded-md bg-foreground/8"></div>
                                    @if ($pageVariant === 'error')
                                        <div class="h-10 w-24 animate-pulse rounded-md bg-foreground/8"></div>
                                    @endif
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            @endif
        </div>
        @inertia
    </body>
</html>
