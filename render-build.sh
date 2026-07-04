#!/bin/bash
# Render build script - installs backend dependencies

set -e

echo "=== Installing backend dependencies ==="
pip install -r backend/requirements.txt

echo "=== Build complete ==="
