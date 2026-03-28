FROM php:8.2-fpm-alpine

RUN apk add --no-cache \
    git \
    unzip \
    libzip-dev \
    icu-dev \
    postgresql-dev \
    oniguruma-dev \
    nodejs \
    npm \
    $PHPIZE_DEPS \
    && docker-php-ext-install pdo pdo_pgsql intl zip \
    && pecl install redis \
    && docker-php-ext-enable redis

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html
