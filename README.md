<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/icons/favicon/vector.svg" />
    <img src="docs/icons/favicon/vector.svg" alt="ToopSet" width="120" />
  </picture>
</p>

<h1 align="center">توپ‌سِت | ToopSet</h1>

<p align="center">
  <strong>پلتفرم هوشمند رزرو آنلاین مجموعه‌های ورزشی</strong><br />
  <em>Online sports court booking platform for Qom, Iran 🇮🇷</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black" alt="Next.js 16" />
  <img src="https://img.shields.io/badge/FastAPI-Latest-009688" alt="FastAPI" />
  <img src="https://img.shields.io/badge/PostgreSQL-17-336791" alt="PostgreSQL 17" />
  <img src="https://img.shields.io/badge/Redis-7-DC382D" alt="Redis 7" />
  <img src="https://img.shields.io/badge/Tailwind-v4-06B6D4" alt="Tailwind v4" />
  <img src="https://img.shields.io/badge/Python-3.12-3776AB" alt="Python 3.12" />
</p>

<br />

## 📸 Screenshots

<table>
  <tr>
    <td align="center">
      <img src="docs/images/main%20light.png" alt="صفحه اصلی - حالت روشن" width="400" />
      <br />
      <em>صفحه اصلی — حالت روشن</em>
    </td>
    <td align="center">
      <img src="docs/images/main%20dark.png" alt="صفحه اصلی - حالت تاریک" width="400" />
      <br />
      <em>صفحه اصلی — حالت تاریک</em>
    </td>
  </tr>
  <tr>
    <td align="center" colspan="2">
      <img src="docs/images/dashboard%20light.png" alt="داشبورد مدیریت" width="600" />
      <br />
      <em>داشبورد مدیریت مجموعه‌ها</em>
    </td>
  </tr>
</table>

## 🚀 Quick Start

```bash
make install     # Install all dependencies
make db          # Start Postgres + Redis
make db-seed     # Seed with test data
make dev-backend # Backend on :8000
make dev-frontend# Frontend on :3000
```

See [context/commands.md](context/commands.md) for all available commands.

## 🧱 Stack

| Layer        | Technology                                                   |
| ------------ | ------------------------------------------------------------ |
| **Frontend** | Next.js 16 + React 19 + TypeScript + Tailwind v4 + shadcn/ui |
| **Backend**  | Python 3.12 + FastAPI + SQLAlchemy (async)                   |
| **Database** | PostgreSQL 17 + Redis 7                                      |
| **Maps**     | Neshan Maps SDK (Qom‑bounded)                                |
| **Locale**   | Persian (fa‑IR) — RTL layout, Persian date/time              |

## 📁 Project Structure

```
├── frontend/          # Next.js app
│   ├── app/           # Pages & layouts
│   ├── components/    # UI components
│   └── public/        # Static assets
├── backend/           # FastAPI server
│   └── app/           # API routes, services, models
├── docs/              # Documentation & screenshots
└── context/           # Project context & conventions
```

## 📖 Docs

| File                                 | Content                         |
| ------------------------------------ | ------------------------------- |
| [architect.md](context/architect.md) | Architecture & data flow        |
| [backend.md](context/backend.md)     | Models, services, key decisions |
| [frontend.md](context/frontend.md)   | Pages, components, API, maps    |
| [ui.md](context/ui.md)               | Theming, layout, conventions    |
| [commands.md](context/commands.md)   | Makefile reference              |
| [commit.md](context/commit.md)       | Commit conventions              |

## 📦 Version

`0.4.0` — single source of truth in [VERSION](VERSION).

## 📄 License

MIT
