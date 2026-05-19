# Querify

Querify is a small query playground built for quick testing:

- a browser app for writing queries and exploring database concepts
- an API that spins up sandboxed sessions for engines outside the browser

It is not trying to be a full database client. The point is to give you a fast place to test queries, poke at ideas, and switch between engines without much setup.

## Running it locally

Install dependencies:

```bash
make install
```

Start both apps:

```bash
make dev
```

Or run them separately:

```bash
make dev-web
make dev-api
```

Build everything:

```bash
make build
```

Run database migrations for the API:

```bash
make db-migrate
```

## Local notes

- The local app database defaults to `apps/api/querify.db`.
- A root encryption key file is created at `apps/api/.querify-root.key`.

## Why i created this

Sometimes you just want to test a query, confirm a result, or try a rough idea on the browser without necessarily spinning it up locally. Querify is meant for that kind of quick loop, while still leaving room for learning how the underlying database pieces work.
