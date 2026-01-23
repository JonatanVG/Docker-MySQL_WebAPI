#!/bin/bash

set -e

# Read passwords
ROOT_PASS="${MYSQL_ROOT_PASSWORD}"
APP_PASS="${MYSQL_PASSWORD}"
APP_USER="${MYSQL_USER}"
DATABASE="${MYSQL_DATABASE}"

# Wait for MySQL
for i in {1..30}; do
  if mysql -uroot -p"${ROOT_PASS}" -h localhost -e "SELECT 1" 2>/dev/null; then
    break
  fi
  sleep 2
done

# Create user
mysql -uroot -p"${ROOT_PASS}" -h localhost <<SQL
CREATE USER IF NOT EXISTS '${APP_USER}'@'%' IDENTIFIED BY '${APP_PASS}';
GRANT ALL PRIVILEGES ON ${DATABASE}.* TO '${APP_USER}'@'%';
FLUSH PRIVILEGES;
SQL

echo "User '${APP_USER}' created"