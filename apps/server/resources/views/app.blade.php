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
        @inertia
    </body>
</html>
