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

if [ "${CONTAINER_WAIT_FOR_SERVICES:-1}" = "1" ]; then
    wait_for_tcp "${DB_HOST:-}" "${DB_PORT:-}" "database" "${DB_WAIT_TIMEOUT:-60}"
    wait_for_tcp "${REDIS_HOST:-}" "${REDIS_PORT:-}" "redis" "${REDIS_WAIT_TIMEOUT:-60}"
fi

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
