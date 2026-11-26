#!/usr/bin/env bash
# Write the local Durable Objects config.
#
# Production's durable-objects wrangler.toml deliberately has no [[migrations]]
# (history was reset 2026-06-27; the classes already exist in Cloudflare), but
# miniflare only enables SQLite for classes a migration declares. Without one,
# every Loom DO fails locally with "SQL is not enabled for this Durable Object
# class". This appends a throwaway migration; class names come from the config's
# own bindings so there is still one source of truth.
#
# Used by `dev-stack.sh` and by Aspen's e2e fixture, which runs on a cold CI
# runner where nothing has generated this file yet.
set -euo pipefail

cd "$(dirname "$0")/../.."

src="services/durable-objects/wrangler.toml"
dst="services/durable-objects/wrangler.local.toml"

classes=$(sed -n 's/^class_name = "\(.*\)"/"\1"/p' "$src" | paste -sd, - | sed 's/,/, /g')

{
	cat "$src"
	printf '\n[[migrations]]\ntag = "local-sqlite"\nnew_sqlite_classes = [%s]\n' "$classes"
	# The post-removal probe asks the public origin by default (#1762). Locally
	# that finds no such subdomain — correctly, it never existed — and reports
	# "gone", passing a step nobody tested. Point it at Aspen's dev server, which
	# reads the tenant from ?subdomain= on localhost. This is only safe while the
	# source config declares no [vars] table of its own, which wrangler would
	# reject as a duplicate.
	printf '\n[vars]\nSITE_ORIGIN = "http://localhost:5173/?subdomain={subdomain}"\n'
} >"$dst"

echo "wrote $dst"
