# ─── Base stage ───────────────────────────────────────────────────────────────
FROM php:8.4-fpm-alpine AS base

# Системные зависимости для Alpine
RUN apk add --no-cache \
    postgresql-dev \
    libzip-dev \
    zip \
    unzip \
    git \
    curl \
    nginx \
    supervisor \
    linux-headers \
    $PHPIZE_DEPS

# PHP расширения
RUN docker-php-ext-install \
    pdo \
    pdo_pgsql \
    zip \
    opcache \
    pcntl \
    bcmath

# Redis расширение
RUN pecl install redis \
    && docker-php-ext-enable redis

# Убираем build-зависимости чтобы не раздувать образ
RUN apk del $PHPIZE_DEPS linux-headers

# Composer
COPY --from=composer:2.7 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www


# ─── Dev stage ────────────────────────────────────────────────────────────────
FROM base AS dev

COPY composer*.json ./
RUN composer install --no-scripts --no-autoloader

COPY . .
RUN composer dump-autoload --optimize

COPY ./docker/php.dev.ini /usr/local/etc/php/conf.d/custom.ini

EXPOSE 8000
CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=8000"]


# ─── Production stage ─────────────────────────────────────────────────────────
FROM base AS production

COPY composer*.json ./
RUN composer install \
    --no-dev \
    --no-scripts \
    --no-autoloader \
    --prefer-dist

COPY . .

RUN composer dump-autoload --optimize --classmap-authoritative

RUN php artisan config:cache \
    && php artisan route:cache \
    && php artisan view:cache

RUN chown -R www-data:www-data /var/www/storage /var/www/bootstrap/cache \
    && chmod -R 775 /var/www/storage /var/www/bootstrap/cache

RUN mkdir -p /var/log/php && chown www-data:www-data /var/log/php

COPY ./docker/php.prod.ini /usr/local/etc/php/conf.d/custom.ini
COPY ./docker/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

EXPOSE 8000
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
