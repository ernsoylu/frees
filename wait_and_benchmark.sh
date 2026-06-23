#!/bin/bash
URL="https://frees-api-production.up.railway.app/actuator/health"
echo "Waiting for Railway deployment to finish building and become healthy..."
while true; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$URL")
  if [ "$STATUS" -eq 200 ] || [ "$STATUS" -eq 401 ]; then
    echo "Service is up!"
    break
  fi
  sleep 5
done
echo "Running remote benchmark..."
python3 benchmark.py https://frees-api-production.up.railway.app
