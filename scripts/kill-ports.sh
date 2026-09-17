#!/usr/bin/env bash

set +e

echo "Killing AIVO local processes..."

pkill -f wrangler || true
pkill -f workerd || true

for port in 8787 8788 8789 9229
do
  lsof -ti tcp:$port | xargs kill -9 2>/dev/null || true
done

echo "AIVO environment cleaned."