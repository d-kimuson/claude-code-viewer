#!/usr/bin/env bash

set -euxo pipefail

if [ -d "dist/.next" ]; then
  rm -rf dist/.next
fi

if [ -d "dist/standalone" ]; then
  rm -rf dist/standalone
fi

pnpm exec next build
cp -r public .next/standalone/
cp -r .next/static .next/standalone/.next/

cp -r .next/standalone ./dist/
