# FoodChain AuditHub

## Netlify deployment

Netlify hosts the React client only. Deploy the `server` directory to a Node-compatible host, then configure these environment variables:

For the Netlify build settings, use the repository root as the base directory and use:

- Base directory: leave blank (repository root)
- Package directory: leave blank
- Build command: `cd client && npm run build`
- Publish directory: `client/dist`

Keeping the base directory at the repository root prevents Netlify from automatically prefixing the package and publish directories with `client/`. These settings are also stored in `netlify.toml` at the repository root.

- Netlify: `VITE_API_BASE_URL=https://<your-api-host>/api`
- API host: `SUPABASE_URL`, `SUPABASE_KEY`, `JWT_SECRET`, and `CLIENT_URL=https://<your-site>.netlify.app`

After changing `VITE_API_BASE_URL`, trigger a new Netlify deploy because Vite embeds environment variables during the build. The API should respond at `https://<your-api-host>/api/health` before testing login.

### Supabase database

Run [`supabase_schema.sql`](./supabase_schema.sql) in the Supabase SQL Editor to create or update the required tables and install the one-time administrator bootstrap function. The API uses the `users`, `customers`, `sites`, `audits`, `checklists`, and `findings` tables. Keep `SUPABASE_KEY` on the API host only; never expose a service-role key in the client.

The API requires Supabase and will stop at startup if the database or required tables are unavailable. In local development, values in `server/.env` take precedence over inherited shell variables to avoid accidentally connecting to a different Supabase project. Production deployments use the host's environment variables. The schema creates tables and policies only; it does not insert demo users, sample customers, or audits. Existing Supabase data is not deleted or changed by starting the API.

**Second-Party Food Safety Audit & Compliance Management Platform**

A responsive, mobile-first PWA for managing second-party food safety audits: scheduling, mobile checklist execution, findings, technical review, CAPA management, reporting, analytics, and optional AI-assisted suggestions.

Built incrementally in phases. This README will grow as each phase is added.

---

## Progress so far

- ✅ Phase 1 — Project setup (Vite + React + Tailwind frontend, Express + Supabase backend, health check)
- ✅ Phase 2 — Authentication (JWT, bcrypt, RBAC, protected routes, role-based dashboards)
- ⬜ Phase 3 — Admin: user/customer/auditor/reviewer management
- ⬜ Phase 4 — Audit management
- ⬜ Phase 5 — Standards & checklist builder
- ⬜ Phase 6 — Auditor mobile workflow
- ⬜ Phase 7 — Technical review workflow
- ⬜ Phase 8 — Customer portal & CAPA
- ⬜ Phase 9 — Reports & analytics
- ⬜ Phase 10 — Notifications & PWA
- 🟡 Phase 11 — VERA reviewer analysis and audit Q&A implemented; additional AI features remain planned
- ⬜ Phase 12 — Security hardening & polish

---

## Tech Stack

- **Frontend:** React, Vite, Tailwind CSS, React Router, Axios, Lucide React
- **Backend:** Node.js, Express, Supabase, JWT, bcrypt
- **Roles:** Admin/Audit Planner, Auditor, Technical Reviewer, Customer

---

## Project Structure

```
foodchain-audithub/
  client/     # React + Vite frontend
  server/     # Express + Supabase backend
```

---

## 🐳 Project Setup Using Docker

Follow the steps below to run the project on your laptop or PC.

### 1. Install Docker Desktop

Download and install **Docker Desktop**:

https://www.docker.com/products/docker-desktop/

After installation, **open Docker Desktop** and make sure it is running.

---

### 2. Clone the Project

Open **Command Prompt / PowerShell / Terminal** and run:

```bash
git clone <YOUR-GITHUB-REPOSITORY-URL>
```

Go inside the project folder:

```bash
cd foodchain-audithub
```

---

### 3. Start the Project

Run:

```bash
docker compose up --build
```

Docker will automatically:

* Build the frontend
* Build the backend
* Install the required dependencies
* Create the required containers
* Start the application

**No separate installation of Node.js, npm, or other project dependencies is required.**

> Keep Docker Desktop running while using the application. Configure `server/.env` with the Supabase credentials before starting the backend.

---

### 4. Access the Application

After Docker finishes starting the containers, open the frontend in your browser:

```text
http://localhost:5173
```

The backend API is available at `http://localhost:5000/api`.

---

### 5. Stop the Project

To stop the application:

```bash
docker compose down
```

---

### 6. Run the Project Again

If the project has already been built, run:

```bash
docker compose up
```

If you make changes to the Docker configuration or dependencies, run:

```bash
docker compose up --build
```

---

### ⚠️ Important

* Docker Desktop must be installed and running.
* Do not manually install project dependencies.
* Do not modify the Dockerfiles unless required.
* Make sure the required ports are not being used by another application.
* The project is configured to run using `docker-compose.yml`.

---

## Manual Setup (Without Docker)

### 1. Backend

```bash
cd server
npm install
cp .env.example .env
```

For persistent storage, edit `server/.env` and set:

```
SUPABASE_URL=<your Supabase project URL>
SUPABASE_KEY=<your Supabase service role key>
JWT_SECRET=<any long random string>
ADMIN_BOOTSTRAP_TOKEN=<one-time random token for first admin setup>
```

Generate a strong bootstrap token (for example, `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`), set it only on the API host, and share it securely with the person creating the first administrator. The token is required only while no administrator exists; the database rejects later bootstrap attempts atomically. Remove the token from the API environment after first-admin setup.

The login page links to signup for customer, auditor, planner, reviewer, and first-admin roles. Customer accounts become active immediately. Auditor, planner, and reviewer signup requests stay pending until an administrator approves them from the Admin Dashboard. Signup never signs the user in automatically. First-admin setup requires the one-time token; subsequent administrator accounts must be created by an administrator.

### VERA RAG reviewer tools

Reviewers can run VERA evidence analysis and ask questions about recorded audit observations for audits in `UNDER_REVIEW`. Analysis returns checklist verdicts, retrieved evidence, confidence/explanation details, and anomaly flags. It is advisory and read-only; the reviewer makes all final scoring and release decisions. The Q&A feature returns report excerpts rather than generated answers. Install the packages in `vera_rag/requirements.txt`; the first semantic-analysis request may download the sentence-transformer model. TF-IDF retrieval is used if model embeddings are unavailable.

Run the backend:

```bash
npm run dev
```

Server runs at `http://localhost:5000`. Test it:

```bash
curl http://localhost:5000/api/health
```

### 2. Frontend

```bash
cd client
npm install
cp .env.example .env
npm run dev
```

Frontend runs at `http://localhost:5173`.

### 3. Create an account and sign in

Go to `http://localhost:5173` and create a customer account, or sign in with an account already provisioned in Supabase. There are no built-in demo login credentials.


---

## Security Notes

- Passwords are hashed with bcrypt and never returned by the API.
- JWTs are required on every protected route via `Authorization: Bearer <token>`.
- RBAC is enforced both on the backend (`authorize()` middleware) and the frontend (`ProtectedRoute`).
- No secrets are committed — see `.env.example` files in `client/` and `server/`.
