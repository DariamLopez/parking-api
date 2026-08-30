# Parking API

RESTful API for parking management, built with NestJS, PostgreSQL and MongoDB.

## Tech Stack

- **Framework**: NestJS + Express
- **Language**: TypeScript
- **Main database**: PostgreSQL + TypeORM
- **Logs database**: MongoDB + Mongoose
- **Authentication**: JWT (JSON Web Tokens)
- **Authorization**: Role-based access control (admin, employee, client)
- **Testing**: Jest + Supertest (e2e)
- **Containers**: Docker + Docker Compose

## Prerequisites

- Node.js >= 18
- Docker and Docker Compose
- Yarn

## Installation & Setup

### 1. Clone the repository

```bash
git clone https://github.com/DariamLopez/parking-api.git
cd parking-api
```

### 2. Install dependencies

```bash
yarn install
```

### 3. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` with your values. See [Environment Variables](#environment-variables) section.

### 4. Start the databases

```bash
docker compose up -d
```
> ⚠️ Before running `docker compose up -d` for the first time, make sure `docker/init-db.sh` uses **LF** line endings (not CRLF). In VS Code, open the file, click on `CRLF` in the bottom-right status bar and select `LF`, then save. Without this, the test database `parking_test_db` will not be created on Windows.

This starts:
- **PostgreSQL** on the configured port (default 5432), with `parking_db` and `parking_test_db` databases
- **MongoDB** on the configured port (default 27017)

### 5. Start the server

```bash
# Development (with hot-reload)
yarn start:dev

# Production
yarn build
yarn start:prod
```

The server will be available at `http://localhost:3000/api`

### 6. Load initial data (seed)

```bash
POST http://localhost:3000/api/seed
```

The seed creates:
- 1 **admin** user: `admin@parking.com` / `Admin1234!`
- 1 **employee** user: `employee@parking.com` / `Admin1234!`
- 1 **client** user: `client@parking.com` / `Admin1234!`
- 20 parking spots (P001–P020)

> ⚠️ The seed is only available in `development` and `test` environments. It deletes all existing data before inserting.

## Environment Variables

| Variable | Description | Example |
|---|---|---|
| `PORT` | Server port | `3000` |
| `API_HOST` | API host | `http://localhost` |
| `NODE_ENV` | Runtime environment | `development` |
| `DB_HOST` | PostgreSQL host | `localhost` |
| `DB_PORT` | PostgreSQL port | `5432` |
| `DB_USER` | PostgreSQL user | `parking_user` |
| `DB_PASSWORD` | PostgreSQL password | `parking_pass` |
| `DB_NAME` | Database name | `parking_db` |
| `TEST_DB_NAME` | Test database name | `parking_test_db` |
| `MONGO_HOST` | MongoDB host | `localhost` |
| `MONGO_PORT` | MongoDB port | `27017` |
| `MONGO_USER` | MongoDB user | `parking_user` |
| `MONGO_PASSWORD` | MongoDB password | `parking_pass` |
| `MONGO_DB` | Logs database name | `parking_logs` |
| `JWT_SECRET` | JWT secret key | `super_secret_key` |

## API Endpoints

All endpoints are prefixed with `/api`.

### Authentication

| Method | Route | Access | Description |
|---|---|---|---|
| POST | `/api/auth/register` | Public | Register a new user (default role: client) |
| POST | `/api/auth/login` | Public | Log in, returns JWT token |
| GET | `/api/auth/check-auth-status` | Authenticated | Verify and renew token |

### Users

| Method | Route | Required role | Description |
|---|---|---|---|
| GET | `/api/users` | admin | List all users (paginated) |
| GET | `/api/users/me` | Authenticated | View own profile |
| GET | `/api/users/:id` | admin | Get user by ID |
| PUT | `/api/users/:id` | admin | Update user details |
| DELETE | `/api/users/:id` | admin | Delete user |

### Parking Spots

| Method | Route | Required role | Description |
|---|---|---|---|
| GET | `/api/parking-spot` | admin, employee | List spots (paginated, filterable by `isActive`) |
| GET | `/api/parking-spot/occupancy` | admin, employee | Get current parking occupancy |
| GET | `/api/parking-spot/:id` | admin, employee | Get spot by ID |
| POST | `/api/parking-spot` | admin | Create new spot |
| PUT | `/api/parking-spot/:id` | admin | Update spot |
| DELETE | `/api/parking-spot/:id` | admin | Delete spot |

### Reservations

| Method | Route | Required role | Description |
|---|---|---|---|
| POST | `/api/reservation` | client | Create a reservation |
| GET | `/api/reservation` | Authenticated | List reservations (clients see only their own) |
| GET | `/api/reservation/:id` | Authenticated | Get reservation by ID |
| DELETE | `/api/reservation/:id` | client, admin | Cancel reservation (up to 2h before start) |
| PATCH | `/api/reservation/arrived/:id` | admin, employee | Mark vehicle as arrived |
| PATCH | `/api/reservation/done/:id` | admin, employee | Mark vehicle as departed |

**Date and time format for reservations:**
- `date`: `dd/mm/yyyy` (e.g. `04/09/2026`)
- `startTime` / `endTime`: `h:mm` in 24h format (e.g. `14:30`)

**Business rules:**
- The assigned spot is returned in the reservation creation response
- Reservations can only be cancelled up to **2 hours before** the start time
- A reservation with status `arrived` or `done` cannot be cancelled
- Status flow: `active` → `arrived` → `done` / `cancelled`

### Logs

| Method | Route | Required role | Description |
|---|---|---|---|
| GET | `/api/logs` | admin | View activity logs (filterable by `type`, `userId`) |

**Registered log types:** `reservation_created`, `reservation_cancelled`, `reservation_arrived`, `reservation_done`, `user_updated`, `user_registered`, `occupancy_checked`, `seed_executed`

### Seed

| Method | Route | Access | Description |
|---|---|---|---|
| POST | `/api/seed` | development/test only | Reset database with demo data |

## Role System

| Role | Description |
|---|---|
| `admin` | Full access: user management, spots, reservations and logs |
| `employee` | Can check occupancy and manage vehicle arrivals/departures |
| `client` | Can create and cancel their own reservations |

To authenticate requests, include the JWT token in the header:
```
Authorization: Bearer <token>
```

## Database Architecture

### PostgreSQL (business entities)

```
User ──────── Reservation ──────── ParkingSpot
              (userId FK)          (spotId FK)
```

**Tables:** `user`, `reservations`, `parking_spots`

### MongoDB (activity logs)

**Collection:** `activitylogs`

```json
{
  "type": "reservation_created",
  "user": { "id": "...", "name": "...", "email": "..." },
  "details": { ... },
  "createdAt": "..."
}
```

## Tests

### Run e2e tests

```bash
yarn test:e2e
```

The e2e tests cover the 3 main use cases:
- **UC1**: Reserve a parking spot (`test/reservation.e2e-spec.ts`)
- **UC2**: Check parking occupancy (`test/occupancy.e2e-spec.ts`)
- **UC3**: Update user details (`test/users.e2e-spec.ts`)

Tests use the `parking_test_db` database (separate from development) and automatically run the seed before each suite.

## Project Structure

```
src/
  auth/           — JWT authentication, strategy, decorators
  users/          — User CRUD
  parking-spot/   — Spot CRUD + occupancy query
  reservation/    — Reservation management and business logic
  logs/           — Activity logging in MongoDB
  seed/           — Initial data for development and testing
  common/         — Shared guards, decorators, enums
test/
  reservation.e2e-spec.ts
  occupancy.e2e-spec.ts
  users.e2e-spec.ts
docker/
  init-db.sh      — Database initialization script
```