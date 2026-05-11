.PHONY: install dev dev-web dev-api build clean

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
