#!/bin/sh

set -eu

wait_for_tcp() {
    host="$1"
    port="$2"
    label="$3"
    timeout="${4:-60}"

    if [ -z "$host" ] || [ -z "$port" ]; then
        return 0
    fi

    elapsed=0

    echo "Waiting for ${label} at ${host}:${port}..."

    while ! php -r '
        $host = $argv[1];
        $port = (int) $argv[2];
        $timeout = 2;
        $socket = @fsockopen($host, $port, $errno, $errstr, $timeout);
        if (! $socket) {
            exit(1);
        }
        fclose($socket);
    ' "$host" "$port"; do
        elapsed=$((elapsed + 2))

        if [ "$elapsed" -ge "$timeout" ]; then
            echo "Timed out waiting for ${label} at ${host}:${port}." >&2
            exit 1
        fi

        sleep 2
    done

    echo "${label} is reachable."
}

sync_seed_directory() {
    source_dir="$1"
    target_dir="$2"
    marker_source="$3"
    enabled="$4"
    label="$5"

    if [ "$enabled" != "1" ] || [ ! -d "$source_dir" ]; then
        return 0
    fi

    marker_target="${target_dir}/.snag-seed-version"
    needs_sync=0

    if [ ! -d "$target_dir" ] || [ -z "$(ls -A "$target_dir" 2>/dev/null)" ]; then
        needs_sync=1
    elif [ -f "$marker_source" ] && [ ! -f "$marker_target" ]; then
        needs_sync=1
    elif [ -f "$marker_source" ] && ! cmp -s "$marker_source" "$marker_target"; then
        needs_sync=1
    fi

    if [ "$needs_sync" -eq 0 ]; then
        return 0
    fi

    echo "Synchronizing ${label} into ${target_dir}..."

    rm -rf "$target_dir"
    mkdir -p "$target_dir"
    cp -R "$source_dir"/. "$target_dir"/

    if [ -f "$marker_source" ]; then
        cp "$marker_source" "$marker_target"
    fi
}

if [ "${CONTAINER_WAIT_FOR_SERVICES:-1}" = "1" ]; then
    wait_for_tcp "${DB_HOST:-}" "${DB_PORT:-}" "database" "${DB_WAIT_TIMEOUT:-60}"
    wait_for_tcp "${REDIS_HOST:-}" "${REDIS_PORT:-}" "redis" "${REDIS_WAIT_TIMEOUT:-60}"
fi

sync_seed_directory /opt/snag-seed/vendor vendor /opt/snag-seed/composer.lock "${CONTAINER_SYNC_VENDOR:-0}" "vendor"
sync_seed_directory /opt/snag-seed/public-build public/build /opt/snag-seed/public-build-manifest.json "${CONTAINER_SYNC_PUBLIC_BUILD:-0}" "public build assets"
sync_seed_directory /opt/snag-seed/public-root public /opt/snag-seed/public-build-manifest.json "${CONTAINER_SYNC_PUBLIC_ROOT:-0}" "public root"

if [ "${CONTAINER_RUN_MIGRATIONS:-0}" = "1" ]; then
    php artisan migrate --force
fi

if [ "${CONTAINER_STORAGE_LINK:-0}" = "1" ]; then
    php artisan storage:link || true
fi

if [ "${CONTAINER_CACHE_BOOTSTRAP:-0}" = "1" ]; then
    php artisan config:cache
    php artisan route:cache
    php artisan view:cache
fi

exec "$@"
