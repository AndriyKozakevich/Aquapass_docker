# AquaPass — Pool Complex Management & Ticket Booking System

**AquaPass** is a high-concurrency booking and ticket verification platform built for outdoor pool complexes and resorts. It automates online sunbed selection, real-time ticket sales, payment processing, transactional email dispatch with PDF tickets, and staff entry validation.

The system is designed to eliminate double-booking race conditions during peak summer traffic through distributed atomic locks and to provide an end-to-end audit trail.

---

## Tech Stack

- **Backend:** .NET 10 / ASP.NET Core Web API
- **Frontend:** Next.js (App Router, React, Tailwind CSS)
- **Primary Database:** PostgreSQL 16
- **Distributed Cache & State:** Redis (atomic seat locking, key expiration/TTL)
- **ORM:** Entity Framework Core (Code First Migrations)
- **Acquiring / Payments:** Monobank Checkout API integration (Mock & Production Webhook workflows)
- **Document Generation:** QuestPDF (vector PDF rendering) & QRCoder
- **Email Delivery:** MailKit / MimeKit (SMTP with dynamic PDF attachments)
- **Security & Authorization:** JWT Bearer authentication with Role-Based Access Control (`Admin`, `Cashier`) + BCrypt password hashing
- **Logging & Monitoring:** Serilog (structured JSON logging, console output, daily rotating file sinks in `Logs/`)
- **Unit Testing:** xUnit, Moq, FluentAssertions
- **Containerization & Orchestration:** Docker, Docker Compose

---

## Key Features

1. **Interactive Sunbed Map & Atomic Seat Holding:**
   - Visual sunbed picker by zone.
   - Redis-backed distributed locks prevent two users from booking the same sunbed simultaneously (10–15 min hold timeout / TTL).

2. **Automated Order & Payment Lifecycle:**
   - Multi-ticket checkout calculation across different tariff plans (weekday/weekend rates).
   - Asynchronous payment webhook ingestion updates order status, generates documents, and frees Redis locks automatically.

3. **Instant Ticket & PDF Generation:**
   - Dynamically generated vector PDF passes featuring secure, high-contrast QR codes.
   - Automatic dispatch to customer email via background SMTP service.

4. **Cashier & Turnstile Entry Validation:**
   - Dedicated authenticated dashboard for complex staff (`Cashier` / `Admin`).
   - Fast QR-code scanning with real-time status transitions to `Used` to prevent ticket reuse and fraud.

5. **Structured Audit Trail & Health Diagnostics:**
   - Non-blocking Serilog integration with daily rotation policies and database EF Core noise suppression.

---

## Application URLs & Endpoints

When running via Docker, all services bind to standard local ports:

| Component | Target URL | Description |
| :--- | :--- | :--- |
| **Frontend Web App** | [http://localhost:3000](http://localhost:3000) | Customer booking interface & staff validation portal |
| **Backend Swagger UI** | [http://localhost:5000/swagger](http://localhost:5000/swagger) | Interactive API exploration and OpenAPI documentation |
| **Backend Raw API** | `http://localhost:5000/api` | REST API base route |
| **PostgreSQL Database** | `localhost:5432` | DB: `aquapass_db` (User: `postgres` / Pass: `postgres`) |
| **Redis Cache** | `localhost:6379` | Distributed cache & atomic locks |

---

## Quick Start with Docker Compose

Running the entire platform requires only Docker Desktop installed.

### 1. Clone the repository

```bash
git clone https://github.com/AndriyKozakevich/Aquapass_docker
cd aquapass
```

### 2. Launch all services

Run the following command from the root directory (where `docker-compose.yml` is located):

```bash
docker-compose up --build -d
```

Docker will:
- Spin up PostgreSQL and Redis containers.
- Build the ASP.NET Core backend and apply pending EF Core migrations.
- Build the Next.js standalone production bundle.
- Wire all services together on an isolated internal network.

### 3. Verify container status

```bash
docker-compose ps
```

### 4. View real-time logs

```bash
# View combined logs across all services:
docker-compose logs -f

# View backend API logs specifically:
docker-compose logs -f backend
```

### 5. Stop and clean up

```bash
# Graceful stop:
docker-compose down

# Reset completely (including persistent database volumes):
docker-compose down -v
```