#!/bin/bash

# Test API endpoint with API key from .env
# Usage: bash test-api.sh

set -e

# Load API_KEY from .env file
if [ ! -f .env ]; then
  echo "Error: .env file not found"
  exit 1
fi

# Extract API_KEY from .env (handles API_KEY=value and API_KEY="value" formats)
API_KEY=$(grep "^API_KEY=" .env | head -1 | cut -d '=' -f2- | sed 's/^["'\'']//;s/["'\'']$//' | tr -d '[:space:]')

if [ -z "$API_KEY" ]; then
  echo "Error: API_KEY not found in .env file"
  echo ""
  echo "Please add API_KEY to your .env file:"
  echo "  API_KEY=nb_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
  exit 1
fi

echo "Testing API endpoint: https://api.neobot.cz/api/me"
echo "Using API_KEY: ${API_KEY:0:10}..." # Show only first 10 chars for security
echo ""

# Call API endpoint
response=$(curl -s -w "\n%{http_code}" \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.neobot.cz/api/me")

# Split response body and HTTP status code
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

echo "HTTP Status: $http_code"
echo ""
echo "Response:"

# Try to pretty-print JSON if jq is available, otherwise print raw
if command -v jq &> /dev/null; then
  echo "$body" | jq .
else
  echo "$body"
fi

# Exit with error if HTTP code is not 2xx
if [[ ! "$http_code" =~ ^2[0-9]{2}$ ]]; then
  echo ""
  echo "❌ API call failed with HTTP $http_code"
  exit 1
fi

echo ""
echo "✅ API test successful"
