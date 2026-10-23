# REGENT — A Higher Standard for Your Time

> **Plan with intent. Execute with discipline. Build a life you are proud of.**  
> A premium, full-stack personal productivity SaaS platform crafted with an obsidian-and-gold aesthetic, backed by real PostgreSQL data and Row Level Security.

---

## 🏛 Platform Overview

REGENT is designed for students, software engineers, ambitious professionals, creators, and fitness enthusiasts who demand precision and continuity in life execution.

### Key Modules

- **Today Command Center (`/app`):** Dynamic greeting, daily execution metrics, priority tasks checklist, active habits progress bar, and evening reflection recorder.
- **Continuity Calendar (`/app/calendar`):** Historical consistency log with strict visual rules: **Black/Gold** = Success, **White** = Target Missed, **Grey** = Future / Untracked. Future dates are never marked missed.
- **Quantitative Habits (`/app/habits`):** Numeric habit tracking (e.g. 100 pages, 3000 ml, 45 mins), partial progress visualization, and streak algorithms that strictly protect designated rest days and off-schedule days.
- **Task Matrix (`/app/tasks`):** Action items with due dates, priority tiers (Urgent, High, Medium, Low), tags, and project linkage.
- **Focus & Flow Chamber (`/app/focus`):** Circular Pomodoro countdown timer with ambient Web Audio synthesizer chime, task attachment, and session duration logging.
- **Academic & Study (`/app/study`):** Course management with syllabus checkpoints, assignment trackers, and study hour logs.
- **Projects & Milestones (`/app/projects`):** Strategic initiatives with milestone checklists and automatic progress recalculation.
- **Insights & Velocity (`/app/insights`):** Visual performance charts powered by Recharts (task velocity, focus minutes, habit adherence).
- **Settings & Data Sovereignty (`/app/settings`):** Customizable modules, daily success criteria, profile customization, and one-click JSON backup export.

---

## 🛠 Tech Stack

- **Framework:** Next.js 16 (App Router with Turbopack)
- **Language:** TypeScript
- **Styling:** Tailwind CSS with custom Obsidian & Gold Design System tokens
- **Database & Auth:** Supabase Cloud (PostgreSQL 15+, Row Level Security, Auth Triggers)
- **Visual Analytics:** Recharts
- **Icons:** Lucide React

---

## 🚀 Getting Started

### 1. Prerequisites

- Node.js 18+ (tested on v22)
- npm or pnpm

### 2. Environment Variables

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=https://rxbfowrhilxpvbpuvzeb.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_c9rJTWskcPJTGhrPrlHGzA_Ts0eOx55
```

### 3. Database Migration

Run the consolidated SQL migration located at `supabase/migrations/000_full_setup.sql` in your **Supabase Dashboard SQL Editor**:
- Provisions all 13 core tables
- Enforces strict Row Level Security (RLS) on all tables with `auth.uid()` isolation
- Configures automated profile & preferences provisioning trigger on signup

### 4. Install Dependencies & Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to access the application.

---

## 🔒 Security & Data Sovereignty

All data is partitioned by cryptographic user IDs using PostgreSQL Row Level Security. Users maintain complete sovereignty over their data with full JSON export capabilities at any time.

---

© 2026 REGENT. All rights reserved.
