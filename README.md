# StellarAid API

Backend API for the StellarAid platform, built with NestJS.

## Setup

```bash
cp .env.example .env
npm install
npm run start:dev
```

## Health Check

```
GET /api/health
```

Returns `{ "status": "ok" }`.
