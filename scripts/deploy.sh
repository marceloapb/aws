#!/bin/bash
set -e
echo "Building SAM application..."
cd apps/api
sam build
echo "Deploying to AWS..."
sam deploy --no-confirm-changeset --no-fail-on-empty-changeset
echo "Deploy complete!"
