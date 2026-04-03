FROM php:8.2-fpm-alpine AS php-base

RUN apk add --no-cache \
    git \
    unzip \
    icu-dev \
    libzip-dev \
    oniguruma-dev \
    postgresql-dev \
    libpng-dev \
    freetype-dev \
    libjpeg-turbo-dev \
    $PHPIZE_DEPS \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install \
        bcmath \
        gd \
        intl \
        opcache \
        pcntl \
        pdo \
        pdo_pgsql \
        zip \
    && pecl install redis \
    && docker-php-ext-enable redis

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

ENV COMPOSER_ALLOW_SUPERUSER=1
WORKDIR /var/www/html

FROM php-base AS composer-deps

COPY apps/server/composer.json apps/server/composer.lock ./

RUN composer install \
    --no-interaction \
    --no-scripts \
    --no-progress \
    --prefer-dist \
    --optimize-autoloader

FROM node:22-alpine AS node-build

WORKDIR /workspace

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/docs/package.json apps/docs/package.json
COPY apps/extension/package.json apps/extension/package.json
COPY apps/server/package.json apps/server/package.json
COPY packages/ui/package.json packages/ui/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/capture-core/package.json packages/capture-core/package.json
COPY sdks/capture/package.json sdks/capture/package.json

RUN pnpm install --frozen-lockfile

COPY apps/server apps/server
COPY packages/shared packages/shared
COPY packages/capture-core packages/capture-core

RUN pnpm --dir apps/server build

FROM php-base AS app-runtime

COPY apps/server ./
COPY --from=composer-deps /var/www/html/vendor ./vendor
COPY --from=node-build /workspace/apps/server/public/build ./public/build
COPY --from=composer-deps /var/www/html/vendor /opt/snag-seed/vendor
COPY apps/server/composer.lock /opt/snag-seed/composer.lock
COPY --from=node-build /workspace/apps/server/public/build /opt/snag-seed/public-build
COPY --from=node-build /workspace/apps/server/public/build/manifest.json /opt/snag-seed/public-build-manifest.json
COPY apps/server/docker/php.ini /usr/local/etc/php/conf.d/zz-app.ini
COPY apps/server/docker/php-fpm-www.conf /usr/local/etc/php-fpm.d/www.conf
COPY apps/server/docker/entrypoint.sh /usr/local/bin/snag-entrypoint

RUN mkdir -p \
    bootstrap/cache \
    /opt/snag-seed \
    storage/app \
    storage/framework/cache/data \
    storage/framework/sessions \
    storage/framework/testing \
    storage/framework/views \
    storage/logs \
    && addgroup -g 1000 -S snag \
    && adduser -u 1000 -S -D -G snag snag \
    && rm -rf /opt/snag-seed/public-root \
    && cp -R public /opt/snag-seed/public-root \
    && chmod +x /usr/local/bin/snag-entrypoint \
    && php artisan package:discover --ansi \
    && chown -R snag:snag /opt/snag-seed /var/www/html

EXPOSE 9000
ENTRYPOINT ["snag-entrypoint"]
CMD ["php-fpm"]
USER snag
