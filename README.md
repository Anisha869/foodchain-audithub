# FoodChain AuditHub

**Second-Party Food Safety Audit & Compliance Management Platform**

A responsive, mobile-first PWA for managing second-party food safety audits: scheduling, mobile checklist execution, findings, technical review, CAPA management, reporting, analytics, and optional AI-assisted suggestions.

Built incrementally in phases. This README will grow as each phase is added.

---

## Progress so far

- ✅ Phase 1 — Project setup (Vite + React + Tailwind frontend, Express + MongoDB backend, health check)
- ✅ Phase 2 — Authentication (JWT, bcrypt, RBAC, protected routes, role-based dashboards)
- ⬜ Phase 3 — Admin: user/customer/auditor/reviewer management
- ⬜ Phase 4 — Audit management
- ⬜ Phase 5 — Standards & checklist builder
- ⬜ Phase 6 — Auditor mobile workflow
- ⬜ Phase 7 — Technical review workflow
- ⬜ Phase 8 — Customer portal & CAPA
- ⬜ Phase 9 — Reports & analytics
- ⬜ Phase 10 — Notifications & PWA
- ⬜ Phase 11 — AI features
- ⬜ Phase 12 — Security hardening & polish

---

## Tech Stack

- **Frontend:** React, Vite, Tailwind CSS, React Router, Axios, Lucide React
- **Backend:** Node.js, Express, MongoDB (Mongoose), JWT, bcrypt
- **Roles:** Admin/Audit Planner, Auditor, Technical Reviewer, Customer

---

## Project Structure

```
foodchain-audithub/
  client/     # React + Vite frontend
  server/     # Express + MongoDB backend
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

> Keep Docker Desktop running while using the application.

---

### 4. Access the Application

After Docker finishes starting the containers, open the frontend in your browser:

```text
http://localhost:<frontend-port>
```

The backend/API will run on the port configured in `docker-compose.yml`.

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

Edit `server/.env` and set at minimum:

```
MONGODB_URI=<your MongoDB Atlas connection string>
JWT_SECRET=<any long random string>
```

Seed the first admin account:

```bash
npm run seed
```

This creates:

- Email: `admin@foodchainaudithub.com`
- Password: `Admin@12345`

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

### 3. Login

Go to `http://localhost:5173`, sign in with the seeded admin credentials above. You'll land on `/admin/dashboard`.

To test other roles, use the admin's JWT to call `POST /api/auth/register` (admin-only) with a `role` of `auditor`, `reviewer`, or `customer` — a proper "Create User" UI for this arrives in Phase 3.

Example:

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Authorization: Bearer <admin_token_from_login_response>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Auditor","email":"auditor1@example.com","password":"Auditor@123","role":"auditor"}'
```

---

## Security Notes

- Passwords are hashed with bcrypt and never returned by the API.
- JWTs are required on every protected route via `Authorization: Bearer <token>`.
- RBAC is enforced both on the backend (`authorize()` middleware) and the frontend (`ProtectedRoute`).
- No secrets are committed — see `.env.example` files in `client/` and `server/`.
