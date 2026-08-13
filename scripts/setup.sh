#!/usr/bin/env sh
set -eu
node -v
npm install
npm test
npm link
echo "Ready. You can now run: gb help"
