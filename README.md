# 💦 iDrip — AI Personal Stylist & Virtual Wardrobe

> Proiect realizat pentru cursul de Medii de Dezvoltare Software.

**iDrip** este o aplicație web mobile-first care funcționează ca o garderobă virtuală inteligentă. Utilizatorii își pot încărca poze cu propriile haine, iar cu ajutorul Inteligenței Artificiale, aplicația generează outfituri complete. Mai mult, iDrip recomandă piese vestimentare noi care se potrivesc cu stilul și bugetul utilizatorului, completând astfel garderoba existentă.

## ✨ Funcționalități principale

- 👗 **Garderobă digitală (Virtual Closet):** încarci poze cu hainele tale și le organizezi pe categorii / sezoane / culori.
- 🧠 **AI Outfit Generator:** creează automat ținute pornind de la piesele din garderobă.
- 🛍️ **Recomandări personalizate:** sugerează achiziții noi care completează stilul și se încadrează în buget.
- 🎨 **UI/UX premium:** design alb-negru cu glassmorphism, optimizat pentru mobil.

## 🌐 Live URLs

| Service     | URL                                                | Hosted on              |
| ----------- | -------------------------------------------------- | ---------------------- |
| Frontend    | https://idrip.tech                                 | Cloudflare Pages       |
| Backend API | https://api.idrip.tech                             | Heroku (Eco dyno, EU)  |
| AI service  | https://bogdan-ca-idrip-ai.hf.space                | Hugging Face Spaces    |
| Database    | _(internal)_ MongoDB Atlas M0                      | Atlas (free tier)      |

Health checks: `/health` on backend and AI service.

## 🏗️ Arhitectură

```
                    ┌──── Cloudflare DNS + CDN ────┐
                    │                              │
   Browser ────────→│ idrip.tech (Pages, proxied)  │
                    │                              │
                    │ api.idrip.tech (DNS only) ───┼──→ Heroku ──→ MongoDB Atlas
                    │                              │       │
                    └──────────────────────────────┘       │
                                                           ▼
                                    Hugging Face Space (bogdan-ca-idrip-ai.hf.space)
                                    via `AI_SERVICE_URL` env var (no public DNS)
```

| Module        | Stack                                                       |
| ------------- | ----------------------------------------------------------- |
| `frontend/`   | React 18 + Vite + TypeScript + Tailwind v4 + Zustand        |
| `backend/`    | Express 5 + Mongoose + TypeScript + dotenv                  |
| `ai-service/` | FastAPI + LangChain + LangGraph (agent — work in progress)  |

## 🚀 Deploy pipeline

Three GitHub Actions workflows, each path-filtered on `main`:

| Workflow                  | Trigger              | Target                       |
| ------------------------- | -------------------- | ---------------------------- |
| `deploy-frontend.yml`     | `frontend/**`        | Cloudflare Pages             |
| `deploy-backend.yml`      | `backend/**`         | Heroku app `idrip-backend`   |
| `deploy-ai-service.yml`   | `ai-service/**`      | HF Space `Bogdan-ca/idrip-ai`|

Push to `main` → only the affected service rebuilds.

Detalii complete de setup (Atlas, DNS, Heroku, GitHub secrets): vezi [`SETUP.md`](./SETUP.md).

## 💻 Local development

```bash
docker compose up
```

| Service     | Local port | Notes                                     |
| ----------- | ---------- | ----------------------------------------- |
| frontend    | 5173       | Vite dev server with HMR                  |
| backend     | 5000       | Auto-seeds demo data on first connection  |
| ai-service  | 8000       | FastAPI on port 8000 in dev (7860 in prod)|
| mongo       | 27017      | Replaced by Atlas in prod                 |

## 📂 Repository layout

```text
iDrip/
├── frontend/         # React SPA (deployed to Cloudflare Pages)
├── backend/          # Express + Mongoose REST API (deployed to Heroku)
├── ai-service/       # FastAPI LangGraph agent (deployed to HF Spaces)
├── .github/workflows # Auto-deploy CI for all three services
├── docker-compose.yml
├── BACKLOG.md        # Product backlog and user stories
└── SETUP.md          # End-to-end deployment setup guide
```


