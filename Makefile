.PHONY: install env setup dev start build typecheck test lint lint-fix check ci db-up db-down db-migrate db-migrate-test db-seed-owner

install:
	pnpm install --frozen-lockfile

env:
	@test -f .env || cp .env.example .env

setup: install env db-up db-migrate db-migrate-test

dev:
	pnpm run dev

start:
	pnpm start

build:
	pnpm run build

typecheck:
	pnpm run typecheck

test: build
	pnpm test

lint:
	pnpm run lint
	pnpm run format:check

lint-fix:
	pnpm run lint:fix

check: lint typecheck test

ci: install env db-migrate-test check

db-up:
	docker compose up -d --wait

db-down:
	docker compose down

db-migrate:
	pnpm run db:migrate

db-migrate-test:
	pnpm run db:migrate:test

db-seed-owner:
	pnpm --silent run db:seed-owner
