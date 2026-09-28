#!/bin/sh
set -e

echo "Applying database migrations..."
until python manage.py migrate --noinput; do
  echo "Database not ready yet, retrying in 2s..."
  sleep 2
done

exec "$@"
