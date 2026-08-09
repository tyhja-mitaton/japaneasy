# SSL certificates for production nginx

The production nginx config (`nginx/nginx.prod.conf.template`) expects two
certificate files mounted from `./ssl` into `/etc/nginx/ssl`:

```
./ssl/fullchain.pem   # full certificate chain (domain cert + intermediate(s))
./ssl/privkey.pem     # private key (permissions 600, never commit to git)
```

## Recommended: Let's Encrypt via certbot

```bash
sudo certbot certonly --standalone \
  --email you@example.com \
  --domains your-domain.example \
  --agree-tos

# symlink into ./ssl
ln -s /etc/letsencrypt/live/your-domain.example/fullchain.pem ./ssl/fullchain.pem
ln -s /etc/letsencrypt/live/your-domain.example/privkey.pem   ./ssl/privkey.pem
```

Certbot renews via a cron/systemd timer; after renewal reload nginx:

```bash
docker compose -f docker-compose.prod.yml exec nginx nginx -s reload
```

## Alternative: self-signed (testing only)

```bash
mkdir -p ssl
openssl req -x509 -nodes -newkey rsa:2048 -days 365 \
  -keyout ssl/privkey.pem -out ssl/fullchain.pem \
  -subj "/CN=localhost"
```

## Also required

- `APP_DOMAIN` env var (e.g. `japaneasy.example.com`) — the nginx template
  substitutes it via envsubst and only allows that host (`Host`-header
  injection guard). Certificates must match this domain.
- Nginx will refuse to start until both files exist in `./ssl`.
