# iDrip Deployment Setup

End-to-end setup for the production stack:

| Piece        | Where                                    | Notes                                       |
| ------------ | ---------------------------------------- | ------------------------------------------- |
| Frontend     | Cloudflare Pages                         | Already wired in `deploy-frontend.yml`      |
| Backend      | Heroku (Eco dyno)                        | `backend/` — auto-deploys on push           |
| AI service   | Hugging Face Spaces (Docker SDK)         | `ai-service/` — auto-deploys on push        |
| Database     | MongoDB Atlas (M0 free tier)             | 512 MB, free forever                        |
| Domain       | `idrip.tech` (via GitHub Student Pack)   | DNS managed by Cloudflare                   |
| HTTPS        | Cloudflare (frontend) + Heroku (backend) + HF (ai) | Free                              |

```
                ┌────────── Cloudflare DNS (free) ──────────┐
                │                                            │
   idrip.tech   ──→  Cloudflare Pages (frontend, proxied ☁️) │
   api.idrip.tech ─→  Heroku backend (DNS only)              │
   ai.idrip.tech  ─→  HF Space ai-service (DNS only)         │
                └────────────────────────────────────────────┘
                                    │
                                    └─→ MongoDB Atlas (free M0)
```

---

## ⚠️ Security note

`.env` at the repo root contains a Cloudflare API token. It is gitignored, but if it was ever committed or shared, **rotate it now** at Cloudflare dashboard → My Profile → API Tokens.

---

## 1. MongoDB Atlas (free 512 MB)

1. Sign up: https://www.mongodb.com/cloud/atlas/register
2. Create free **M0 cluster** (region: closest to Heroku — pick `EU (Ireland)` if Heroku app region is `eu`).
3. **Database Access** → add a user (e.g. `idrip`) with a strong password. Save it.
4. **Network Access** → add IP `0.0.0.0/0` (Heroku and HF dynos have dynamic IPs).
5. **Connect → Drivers** → copy the connection string. It looks like:
   ```
   mongodb+srv://idrip:<password>@cluster0.xxxxx.mongodb.net/idrip?retryWrites=true&w=majority
   ```
   Replace `<password>` with the user's password and append `/idrip` as the database name.

This is your `MONGO_URI`. Save it for step 5.

---

## 2. Domain — `idrip.tech` already purchased ✅

You already own `idrip.tech` via the Student Pack / Get.tech offer.

In the next step we'll point its DNS at Cloudflare's nameservers.

---

## 3. Cloudflare (DNS + free SSL on frontend)

1. Sign up: https://cloudflare.com (free plan).
2. **Add a site** → enter `idrip.tech` → select Free plan.
3. Cloudflare gives you 2 nameservers (e.g. `ada.ns.cloudflare.com`, `kirk.ns.cloudflare.com`).
4. Go to Get.tech (where you registered the domain) → change the nameservers to Cloudflare's. Propagation: minutes to hours.
5. In Cloudflare → SSL/TLS → set encryption mode to **Full**.

DNS records get added in step 6 once we know the Heroku/HF targets.

---

## 4. Hugging Face (ai-service)

1. Sign up: https://huggingface.co/join
2. Create a new Space:
   - **Owner:** your username
   - **Space name:** `idrip-ai`
   - **License:** MIT (or whatever)
   - **SDK:** **Docker** (important — not Gradio)
   - **Visibility:** Public (or Private — both work on free tier)
3. After creation, you don't need to push anything manually — the GitHub Action will do it on the next push to `main`.
4. Generate a write token: Profile → Settings → Access Tokens → New token → role **Write**. Save it. (Used as `HF_TOKEN` secret below.)

The Space will be reachable at `https://<your-username>-idrip-ai.hf.space`.

---

## 5. Heroku (after student credits land)

```bash
# Login
heroku login

# Verify student status (gives ~$13/mo credit for 24 months)
# https://www.heroku.com/github-students/signup

# Create the backend app (region: eu since you're in Romania)
heroku create idrip-backend --region eu

# Set env vars on backend (full reference in section 10 below)
heroku config:set -a idrip-backend \
  MONGO_URI="mongodb+srv://idrip:PASSWORD@cluster0.xxxxx.mongodb.net/idrip" \
  FRONTEND_URL="https://idrip.tech" \
  BACKEND_URL="https://api.idrip.tech" \
  AI_SERVICE_URL="https://<your-hf-username>-idrip-ai.hf.space" \
  NODE_ENV="production" \
  JWT_SECRET="$(openssl rand -hex 48)" \
  GOOGLE_CLIENT_ID="..." \
  GOOGLE_CLIENT_SECRET="..." \
  STRIPE_SECRET_KEY="sk_live_..." \
  STRIPE_WEBHOOK_SECRET="whsec_..." \
  STRIPE_PRICE_PRO_MONTHLY="price_..." \
  STRIPE_PRICE_PRO_YEARLY="price_..." \
  STRIPE_PRICE_LIFETIME="price_..." \
  CLOUDINARY_URL="cloudinary://api_key:api_secret@cloud_name" \
  OPENAI_API_KEY="sk-..." \
  VECTOR_DB="atlas"

# Add custom domain to backend
heroku domains:add api.idrip.tech -a idrip-backend
# Heroku prints the DNS target — that's the value for the api.idrip.tech CNAME.
```

---

## 6. Cloudflare DNS records

Once you have the Heroku and HF targets, add these in Cloudflare → DNS:

| Type  | Name | Target                                       | Proxy            |
| ----- | ---- | -------------------------------------------- | ---------------- |
| CNAME | @    | `idrip.pages.dev` (your Pages project)       | ✅ Proxied        |
| CNAME | www  | `idrip.pages.dev`                            | ✅ Proxied        |
| CNAME | api  | (whatever `heroku domains` printed)          | ❌ DNS only       |
| CNAME | ai   | `<your-hf-username>-idrip-ai.hf.space`       | ❌ Proxied off    |

Then, in the Cloudflare Pages project → Custom domains → add `idrip.tech` and `www.idrip.tech` (this binds the Pages site to the domain).

---

## 7. GitHub Secrets (for auto-deploy workflows)

Repo → Settings → Secrets and variables → Actions → **New repository secret**:

| Secret name                | Value                                             |
| -------------------------- | ------------------------------------------------- |
| `HEROKU_API_KEY`           | output of `heroku auth:token`                     |
| `HEROKU_EMAIL`             | your Heroku account email                         |
| `HEROKU_BACKEND_APP`       | `idrip-backend`                                   |
| `HF_TOKEN`                 | the write token from HF (step 4)                  |
| `HF_USERNAME`              | your HF username                                  |
| `HF_SPACE`                 | `idrip-ai`                                        |
| `CLOUDFLARE_API_TOKEN`     | already in use by `deploy-frontend.yml`           |
| `CLOUDFLARE_ACCOUNT_ID`    | already in use by `deploy-frontend.yml`           |

Optional — for the frontend to know the API URL at build time:

| Secret name      | Value                       |
| ---------------- | --------------------------- |
| `VITE_API_URL`   | `https://api.idrip.tech`    |

If you add `VITE_API_URL`, also update `.github/workflows/deploy-frontend.yml`:
```yaml
- name: Build
  run: npm run build
  env:
    VITE_API_URL: ${{ secrets.VITE_API_URL }}
```

---

## 8. First deploy

Once all secrets are set, push to `main` — all three workflows fire (path-filtered):

```bash
git add .
git commit -m "wire up production deployment"
git push origin main
```

Or trigger manually: GitHub → Actions → pick the workflow → "Run workflow."

---

## 9. Post-deploy checks

```bash
curl https://api.idrip.tech/health
# → {"status":"ok","message":"iDrip Backend is running"}

curl https://ai.idrip.tech/health
# → {"status":"ok","service":"ai-service"}

open https://idrip.tech
```

---

## Local development

Still works exactly as before:

```bash
docker compose up
```

The `docker-compose.yml` runs everything against a local Mongo container, with the AI service on port 8000 (production uses 7460 internally on HF). Production uses Atlas via `MONGO_URI`. No changes to local dev.

---

## 10. Environment variables reference

`.env` files are gitignored. Use `.env.example` in each service folder as the template. **Never commit real keys.**

### Backend (`backend/.env`)

| Variable                        | Required | Default                                 | Purpose                                                                            |
| ------------------------------- | -------- | --------------------------------------- | ---------------------------------------------------------------------------------- |
| `PORT`                          | no       | `5000`                                  | HTTP port                                                                          |
| `MONGO_URI`                     | **yes**  | `mongodb://localhost:27017/idrip`       | Mongo connection string                                                            |
| `FRONTEND_URL`                  | **yes**  | `http://localhost:5173`                 | CORS allowlist + redirect target after OAuth                                       |
| `BACKEND_URL`                   | **yes**  | `http://localhost:5000`                 | Used to build the Google OAuth `redirect_uri`                                      |
| `GOOGLE_CLIENT_ID`              | **yes**  | —                                       | Google OAuth — get from Google Cloud Console → Credentials                         |
| `GOOGLE_CLIENT_SECRET`          | **yes**  | —                                       | Google OAuth client secret                                                         |
| `JWT_SECRET`                    | **yes**  | `dev-secret` (dev only)                 | **Must rotate for prod** — `openssl rand -hex 48`                                  |
| `JWT_EXPIRES_IN`                | no       | `7d`                                    | jsonwebtoken expiry format                                                         |
| `STRIPE_SECRET_KEY`             | **yes**  | —                                       | `sk_live_...` (prod) or `sk_test_...` (test mode)                                  |
| `STRIPE_WEBHOOK_SECRET`         | **yes**  | —                                       | `whsec_...` — printed by `stripe listen` or the Dashboard endpoint config          |
| `STRIPE_PRICE_PRO_MONTHLY`      | **yes**  | —                                       | Price ID from Stripe Dashboard                                                     |
| `STRIPE_PRICE_PRO_YEARLY`       | **yes**  | —                                       | Price ID from Stripe Dashboard                                                     |
| `STRIPE_PRICE_LIFETIME`         | **yes**  | —                                       | Price ID from Stripe Dashboard                                                     |
| `CLOUDINARY_URL`                | **yes**  | —                                       | `cloudinary://api_key:api_secret@cloud_name` from Cloudinary Dashboard             |
| `OPENAI_API_KEY`                | **yes**\* | —                                      | Primary LLM provider for clothing analysis                                         |
| `OPENAI_MODEL`                  | no       | `gpt-4o`                                | Model used for vision analysis                                                     |
| `OPENAI_BASE_URL`               | no       | `https://api.openai.com/v1`             | Override for OpenAI-compatible endpoints                                           |
| `FEATHERLESS_API_KEY`           | no\*     | —                                       | Fallback provider — used if OpenAI is unset/errors                                 |
| `FEATHERLESS_MODEL`             | no       | `Qwen/Qwen3.6-27B`                      | Featherless model id                                                               |
| `FEATHERLESS_BASE_URL`          | no       | `https://api.featherless.ai/v1`         | Featherless endpoint                                                               |
| `AI_SERVICE_URL`                | **yes**  | `http://localhost:8000`                 | URL of the Python LangGraph service                                                |
| `VECTOR_DB`                     | no       | `memory`                                | `memory` for dev, `atlas` for prod (Atlas Vector Search)                           |
| `SKIP_SEED`                     | no       | `false`                                 | Set to `true` to skip the demo data seeder on startup                              |
| `RATE_LIMIT_MAX`                | no       | `60`                                    | Requests/minute/user for the global API limiter                                    |
| `RATE_LIMIT_WINDOW_MS`          | no       | `60000`                                 | Limiter window in ms                                                               |

\* At least one of `OPENAI_API_KEY` or `FEATHERLESS_API_KEY` must be set for AI features to work.

### AI service (`ai-service/.env`)

| Variable        | Required | Default                       | Purpose                                                                  |
| --------------- | -------- | ----------------------------- | ------------------------------------------------------------------------ |
| `LLM_API_KEY`   | **yes**  | —                             | OpenAI-compatible API key. Falls back to `OPENAI_API_KEY` if unset       |
| `LLM_MODEL`     | no       | `gpt-4o`                      | Model ID                                                                 |
| `LLM_BASE_URL`  | no       | `https://api.openai.com/v1`   | Override for OpenAI-compatible providers (Featherless, Together, etc.)   |
| `BACKEND_URL`   | no       | `http://backend:5000`         | Reverse lookup back to the Node backend                                  |

### Frontend (`frontend/.env`)

| Variable                       | Required | Default                          | Purpose                                                         |
| ------------------------------ | -------- | -------------------------------- | --------------------------------------------------------------- |
| `VITE_API_URL`                 | **yes**  | `http://localhost:5000/api`      | Backend base URL — baked into the bundle at build time          |
| `VITE_STRIPE_PUBLISHABLE_KEY`  | **yes**  | —                                | `pk_live_...` (prod) or `pk_test_...` (test mode)               |

---

## 11. CI/CD pipeline

Eleven path-filtered workflows, all on `ubuntu-latest`. Three categories:

### Deploy workflows (existing)

| File                           | Trigger                              | What it does                                       |
| ------------------------------ | ------------------------------------ | -------------------------------------------------- |
| `deploy-frontend.yml`          | `push:main` + `pull_request:main`    | Builds Vite app, publishes to Cloudflare Pages (production for main, preview for PRs)  |
| `deploy-backend.yml`           | `push:main` only                     | Sets Heroku config vars + `git push heroku main`   |
| `deploy-ai-service.yml`        | `push:main` only                     | Force-pushes `ai-service/` subtree to HF Space     |

### CI workflows (per-service quality gate)

| File                  | Steps                                                                                |
| --------------------- | ------------------------------------------------------------------------------------ |
| `ci-frontend.yml`     | `npm run lint` (ESLint) + `npm run build` (`tsc -b && vite build`) + `npm audit`     |
| `ci-backend.yml`      | `npx tsc --noEmit` + `npm run build` + `npm audit`                                   |
| `ci-ai-service.yml`   | `pip install -r requirements.txt` + `python -m compileall .` + `import main` + `pip-audit` |

All three trigger on `push:main`, `pull_request:main` (path-filtered to their subdir), `workflow_dispatch`, and a weekly Monday 06:00 UTC cron that re-runs audits against unchanged lockfiles to catch newly disclosed CVEs.

### Test workflows (per-service automated tests)

| File                   | Runtime / framework                                          |
| ---------------------- | ------------------------------------------------------------ |
| `test-backend.yml`     | Vitest + supertest + mongodb-memory-server — **36 tests**    |
| `test-ai-service.yml`  | pytest + httpx.AsyncClient (FastAPI ASGI transport) — **8 tests**  |
| `test-frontend.yml`    | Playwright (chromium, Vite preview on 4173) — **~20 e2e tests**   |

Each caches its heavy dependency (mongodb binaries / pip wheels / Playwright browsers) and uploads `playwright-report/` as a workflow artifact on failure (frontend only). Triggered on `push:main` + `pull_request:main` + dispatch.

### Cross-cutting security workflows

| File              | What it does                                                                              |
| ----------------- | ----------------------------------------------------------------------------------------- |
| `codeql.yml`      | CodeQL static analysis — JS/TS + Python matrix, `security-and-quality` queries. Weekly cron Tue 06:00 UTC. |
| `gitleaks.yml`    | Secret scanning across the repo for leaked API keys, Mongo URIs, JWT secrets. Weekly cron Wed 06:00 UTC. |

### Automated dependency updates

`.github/dependabot.yml` opens weekly PRs (Mon 06:00 UTC) for four ecosystems with minor + patch grouped:
- `npm /frontend`
- `npm /backend`
- `pip /ai-service`
- `github-actions /` (keeps `actions/checkout@v4` etc. up to date)

### Workflow hygiene

Every CI/test/security workflow has a concurrency group:

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: ${{ github.event_name == 'pull_request' }}
```

This cancels superseded runs on a PR (push 3 commits in a minute → only the last one runs) while letting `main` runs always finish. **Deploy workflows are deliberately excluded** from this rule — never cancel a mid-deploy.

### Recommended branch protection

After the first run of each `test-*` and `ci-*` on `main`, configure **Settings → Branches → Add rule** for `main` requiring these checks to pass before merging:
- `Lint + Build + Audit` (ci-frontend)
- `Type-check + Build + Audit` (ci-backend)
- `Compile + Import + Audit` (ci-ai-service)
- `Vitest (integration)` (test-backend)
- `pytest` (test-ai-service)
- `Playwright (chromium)` (test-frontend)
- `Analyze (javascript-typescript)` + `Analyze (python)` (codeql)
- `Scan repo for leaked secrets` (gitleaks)

---

## 12. Local development & testing

### Bring up the full stack

```bash
docker compose up
```

Runs all 4 services: frontend `:5173`, backend `:5000`, ai-service `:8000`, mongo `:27017`. The `docker-compose.yml` sets `PORT=8000` for ai-service so local dev mirrors production behavior (HF Space uses 7860 internally).

### Run tests per service

**Backend (Vitest + supertest + in-memory MongoDB)**
```bash
cd backend
npm test                  # one-shot
npm run test:watch        # watch mode
npm run test:coverage     # with @vitest/coverage-v8 report
```
No `MONGO_URI` env var needed — `tests/setup.ts` boots its own in-memory Mongo per test run and wipes collections between tests. External services (Stripe, Cloudinary, axios, OpenAI) are mocked via `vi.mock`. The setup file forces `RATE_LIMIT_MAX=10000` so the global limiter doesn't trip during volume tests.

**AI service (pytest + httpx.AsyncClient)**
```bash
cd ai-service
pip install -r requirements-dev.txt   # chains requirements.txt + adds pytest, pytest-asyncio, httpx
pytest
```
Tests do not need a real `LLM_API_KEY`. The 503-when-key-unset test sets it to empty; the happy-path tests mock `agent.invoke` so no LLM call leaves the process.

**Frontend (Playwright)**
```bash
cd frontend
npx playwright install --with-deps chromium   # one-time, ~200 MB
npm run test:e2e                              # one-shot, runs the Vite production build first
npm run test:e2e:ui                           # interactive mode with time-travel debugger
```
Tests mock backend reads via `page.route()` and seed Zustand persist state via `localStorage`, so they run without a backend or DB.

### Coverage caveat for testing

The Playwright config runs `vite preview --host 0.0.0.0 --port 4173` (the `0.0.0.0` bind is required on Linux CI — `localhost`-only resolves to `::1` first there and Playwright's IPv4 healthcheck would hang for the full 3-minute timeout).

---

## Files added/changed for deployment + testing

**Backend (Heroku):**
- `backend/Procfile` — Heroku web dyno entry
- `backend/package.json` — added `heroku-postbuild` + test scripts
- `backend/src/app.ts` — extracted `createApp()` factory so supertest can drive Express without a port
- `backend/src/index.ts` — CORS restricted to `FRONTEND_URL` in prod; entry point delegates to `createApp()`
- `backend/src/middleware/rateLimit.ts` — per-userId limiter applied to every `/api/*` mount
- `backend/tests/` — 10 Vitest spec files, setup, helpers
- `backend/vitest.config.ts`

**AI service (Hugging Face Spaces):**
- `ai-service/main.py` — full FastAPI + LangGraph service
- `ai-service/requirements.txt` — runtime deps
- `ai-service/requirements-dev.txt` — adds pytest, pytest-asyncio, httpx
- `ai-service/Dockerfile` — listens on `$PORT` (defaults to 7860 for HF)
- `ai-service/README.md` — HF Space frontmatter (`sdk: docker`, `app_port: 7860`)
- `ai-service/pytest.ini`
- `ai-service/tests/` — 3 pytest spec files + conftest

**Frontend:**
- `frontend/playwright.config.ts`
- `frontend/e2e/` — 6 Playwright spec files + fixtures
- `frontend/eslint.config.js` — globalIgnores extended with `playwright-report`, `test-results`, `e2e`

**CI/CD (11 workflows total):**
- `deploy-frontend.yml`, `deploy-backend.yml`, `deploy-ai-service.yml` — production deploy
- `ci-frontend.yml`, `ci-backend.yml`, `ci-ai-service.yml` — lint + build + audit
- `test-frontend.yml`, `test-backend.yml`, `test-ai-service.yml` — automated tests
- `codeql.yml`, `gitleaks.yml` — repo-wide security scans
- `.github/dependabot.yml` — weekly grouped dependency updates

**Docs:**
- `SETUP.md` — this file
