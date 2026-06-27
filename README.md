# Storyshelf Frontend

Angular 19 SPA for the Storyshelf book platform API.

## Quick start

```bash
npm install
npm start          # http://localhost:3001
```

Requires the Storyshelf API running at `http://localhost:3000` (see `storyshelf_api`).

## Features

- **Guest:** browse books, authors, genres, series, search, pricing
- **User:** register/OTP, account, likes, reading progress, PDF/EPUB reader, notifications, recommendations, Stripe subscription
- **Admin:** dashboard, users, books lifecycle, taxonomy, plans, subscriptions, broadcast notifications

## UI

Based on **guru-able** default vertical layout (Bootstrap 5 + icofont assets).

## Build

```bash
npm run build
```

Output: `dist/storyshelf-fe/`

## Default routes

| Route | Description |
|-------|-------------|
| `/` | Home |
| `/login` | User login |
| `/admin/login` | Admin login |
| `/admin` | Admin dashboard |
| `/pricing` | Subscription plans |
