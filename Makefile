.PHONY: install dev dev-web dev-api build clean db-migrate db-rollback db-make

install:
	cd apps/web && pnpm install
	cd apps/api && pnpm install

dev-web:
	cd apps/web && pnpm dev

dev-api:
	cd apps/api && pnpm dev

dev:
	make -j2 dev-web dev-api

build:
	cd apps/web && pnpm build
	cd apps/api && pnpm build

clean:
	rm -rf apps/web/dist apps/api/dist

db-migrate:
	cd apps/api && pnpm db:migrate

db-rollback:
	cd apps/api && pnpm db:rollback

db-make:
	cd apps/api && pnpm db:make $(name)
