# Health & Wellness Dashboard

A private, local-only health dashboard. All data is stored in a SQLite file on your machine — nothing is sent to any server or cloud service.

## Features

- **Lab Results** — Track medical test results with values, reference ranges, and status (normal/high/low)
- **Appointments** — Manage upcoming and past medical appointments
- **Notes** — Record insights from doctors, research, books, or personal observations
- **Nutrition Tracker** — Search 1M+ foods via the USDA FoodData Central API and log daily nutrition

## Requirements

- [Node.js](https://nodejs.org/) v18 or later

## Setup

### 1. Install dependencies

```bash
npm run install:all
```

### 2. (Optional) Get a free USDA API key

The app works immediately using `DEMO_KEY`, which allows 30 requests/hour and 50/day.

For unlimited free access, register at: https://fdc.nal.usda.gov/api-key-signup.html

Then create `server/.env`:
```
USDA_API_KEY=your_key_here
```

### 3. Start the app

```bash
npm run dev
```

This starts both the backend (port 3001) and frontend (port 5173). Open http://localhost:5173 in your browser.

## Data Storage

All data lives in `server/data/health.db` — a single SQLite file. Back it up by copying that file.

## Project Structure

```
health-wellness-dashboard/
├── server/              # Express API + SQLite
│   ├── data/           # health.db lives here (auto-created)
│   ├── routes/         # API route handlers
│   ├── db.js           # Database schema
│   └── index.js        # Server entry point
└── client/              # React frontend
    └── src/
        ├── pages/      # Dashboard, TestResults, Appointments, Notes, Nutrition
        └── components/ # Layout, Sidebar
```
