# Repository Guidelines

## Project Structure & Module Organization

Two independent apps in one repo: a Vite/React SPA at the root (`src/`) and a Django REST API in `backend/`. No monorepo tooling — install and run each separately.

Features live in extra modules alongside the stock Django files: `equipment/package_models.py` + `package_views.py`, `loans/views_loan_request.py`, `loans/pdf_service.py`, `loans/services.py`, `accounts/atribuidor_views.py`. All app routers mount under `/api/v1/` in `backend/equipahub/urls.py`.

Frontend HTTP goes through `src/lib/api.ts` only — per-domain objects (`equipmentAPI`, `loansAPI`, `loanRequestsAPI`, …) that inject the `auth_token` Bearer header. Never `fetch` a view directly.

Authorization is enforced in three places that must stay in sync: `User.ROLE_CHOICES` / `ADMIN_ROLES` / `TECHNICIAN_ROLES` in `backend/accounts/models.py`, route gates via `<ProtectedRoute allowedRoles={...}>` in `src/App.tsx`, and feature flags in `src/hooks/usePermissions.ts` — whose `rolePermissions` map has no `admin` entry, so `admin` users get `undefined` there.

`qrcode_hash` is generated in `save()` on both `Equipment` and `LoanRequest`; the public `/consulta/:hash` route resolves against both.

`src/components/ui/` is generated shadcn/ui (`components.json`) — don't hand-edit.

## Build, Test, and Development Commands

```bash
npm install && npm run dev      # SPA on :8080 (vite.config.ts, not 5173)
npm run build && npm run lint
cd backend && python -m venv venv && source venv/bin/activate
pip install -r requirements.txt && python manage.py migrate
python manage.py create_initial_data   # seed users/equipment; --reset wipes
python manage.py runserver             # API on :8000
python manage.py test loans            # single app's suite
```

`setup.bat` does the whole Windows bootstrap. Other commands: `generate_qrcodes`, `add_test_equipment`, `auto_cancel_requests`, `check_loan_notifications` (cron in `backend/scripts/loan_notifications_cron`).

## Coding Style & Naming Conventions

TypeScript is non-strict (`strict: false`, `noImplicitAny: false`) and ESLint disables `no-unused-vars`; lint failures are real signal, so keep `npm run lint` clean. Import via the `@/` alias. Identifiers, UI strings, and comments are Portuguese (`LANGUAGE_CODE = 'pt-br'`) — match that.

## Testing Guidelines

There is no automated suite: every `backend/*/tests.py` is an empty stub and the frontend has no test runner. Verification is manual — follow `GUIA_TESTE.md` and `TESTE_FINAL.md`, and exercise each role.

## Commit & Pull Request Guidelines

`tipo: descrição` — Portuguese, lowercase, unaccented, subject only, no body. Types in use: `feat`, `fix`.

## Configuration Notes

DRF paginates lists (`PAGE_SIZE: 20`); read `results`, not the bare array — a past bug came from missing this. Settings hardcode SQLite (`backend/equipahub/settings.py`), so the `DB_*` vars in `backend/.env` and the README's MySQL claim are inert. Both `.env` files are tracked in git despite `.gitignore` — treat those credentials as compromised. Three lockfiles are committed; `setup.bat` uses npm.
