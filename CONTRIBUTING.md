# Contributing

Thank you for helping. Bethesda EMR runs in a real clinic, so changes are judged first by
whether an existing install keeps working after an update.

## Run it

```sh
./setup.sh          # Linux / macOS / NAS   (Windows: .\setup.ps1)
```

`setup` writes a `.env` with random secrets on first run and starts the stack with Docker
Compose; the EMR is then at http://localhost:9080. Never commit `.env`.

## Work on an isolated stack

Do not run development code or tests against the stack on port 9080 - on a clinic server
that is the live EMR. `docker-compose.session.yml` gives a development session its own
containers, database volume, image tags and port:

```sh
SESSION=mywork SESSION_PORT=9190 \
  docker compose -p bethesda-s-mywork -f docker-compose.yml -f docker-compose.session.yml up -d --build
# ... work, test ...
docker compose -p bethesda-s-mywork -f docker-compose.yml -f docker-compose.session.yml down -v --rmi local
```

`-p` is what keeps the database separate; the tests refuse to run against port 9080.

## Test

The tests in `backend/test/*.mjs` call the API of a running isolated stack (Node 18+, no
dependencies). Each file says at its top which variable holds the address, for example:

```sh
RC_TEST_BASE=http://127.0.0.1:9190/api node backend/test/reception.api.mjs
PH_TEST_BASE=http://127.0.0.1:9190/api node backend/test/pharmacy.api.mjs
```

On a fresh stack a test creates the first administrator with a random password and makes
its own fixtures (patients, drugs, supplies); it never needs site data.

## Database changes

Migrations are `backend/sql/NNN_*.sql`, applied in order on backend start and recorded in
`schema_migrations`. Never edit or renumber a migration that has shipped - add the next
number. Make each one safe to run on both a fresh and an existing database
(`IF NOT EXISTS`, guarded updates).

## Commits

- One subject line saying what changed for the user or the operator, then a short body with
  the why when it is not obvious.
- Bump the version in `backend/package.json` and `frontend/package.json` together and add a
  `CHANGELOG.md` entry for each release.
- The UI is French first (`frontend/src/i18n/fr.js`), with English and Korean; a new string
  goes into all three. The staff guide in `docs/manual-fr` uses the screen's exact words.
- No real patient data, clinic data, passwords or tokens in code, tests, docs or commits.

By contributing you agree that your contribution is licensed under GPL-3.0 (see `LICENSE`).
