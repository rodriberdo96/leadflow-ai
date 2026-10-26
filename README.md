# LeadFlow AI

> Modern multi-tenant B2B SaaS for marketing and web development agencies to track inbound leads, accelerate sales pipelines, automate client follow-ups, and prepare for AI-driven lead scoring and communication assistance.

Built for solo founders and small agency teams prioritizing code maintainability, clean B2B design aesthetics, strict TypeScript safety, and incremental development.

---

## 🚀 Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router, React 19)
- **Language**: [TypeScript](https://www.typescriptlang.org/) (Strict Mode)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Form Handling & Validation**: [React Hook Form](https://react-hook-form.com/) & [Zod](https://zod.dev/)
- **Database & Auth**: [Supabase](https://supabase.com/) (PostgreSQL + Row Level Security)
- **AI Architecture**: Server-side OpenAI integration abstraction (Phase 2)
- **Deployment Target**: Vercel

---

## 📁 Architecture & Folder Structure

```text
├── src/
│   ├── app/
│   │   ├── (dashboard)/
│   │   │   ├── dashboard/       # Main visual dashboard with sales metrics
│   │   │   ├── leads/           # Lead creation, search, filter, and table
│   │   │   ├── pipeline/        # Visual sales pipeline Kanban stages
│   │   │   ├── tasks/           # Follow-up touchpoints & action checklist
│   │   │   ├── activities/      # Lead activity audit trail
│   │   │   └── settings/        # Workspace & Supabase / AI settings
│   │   ├── globals.css          # Design system & Tailwind v4 tokens
│   │   ├── layout.tsx           # Root application layout
│   │   └── page.tsx             # Root redirect to /dashboard
│   ├── components/
│   │   ├── ui/                  # Reusable UI primitives (Button, Input, Card, Badge, Dialog)
│   │   ├── layout/              # Sidebar, Header, DashboardShell
│   │   ├── dashboard/           # MetricsOverview, PipelineOverview, RecentLeads, Tasks
│   │   ├── leads/               # LeadTable, LeadFilters, StatusBadge, LeadFormDialog
│   │   └── pipeline/            # PipelineBoard
│   ├── features/
│   │   ├── leads/               # Lead state context, mock data, and store
│   │   ├── dashboard/           # Metrics calculation and stage configuration
│   │   └── ai/                  # Server-side AI interface & Zod schemas
│   ├── lib/
│   │   ├── supabase/            # Client and Server Supabase instances
│   │   ├── validation/          # Zod validation schemas
│   │   └── utils.ts             # Tailwind class merging & formatters
│   └── types/                   # Explicit TypeScript domain definitions
├── supabase/
│   └── migrations/
│       └── 20250101000000_initial_schema.sql  # Multi-tenant PostgreSQL schema + RLS
├── .env.example                 # Template environment variables
└── README.md
```

---

## 🛠️ Getting Started

### Prerequisites

- Node.js 18.18+ or 20+ (tested on v22.16.0)
- npm, pnpm, or yarn

### 1. Installation

Clone the repository and install the dependencies:

```bash
git clone <repository-url>
cd "LeadFlow AI"
npm install
```

### 2. Environment Configuration

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Fill in your configuration keys:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# OpenAI Configuration (Server-side only)
OPENAI_API_KEY=your-openai-api-key

# App Settings
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

> **Note for Milestone 1**: If Supabase credentials are not provided, LeadFlow AI automatically runs in an interactive **In-Memory Demo Mode** with persistent browser state. You can fully test lead creation, status updates, search, filters, and metrics without database setup.

### 3. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🗄️ Multi-Tenant Database Architecture

LeadFlow AI utilizes PostgreSQL Row Level Security (RLS) to enforce strict tenant isolation across multiple agencies.

### Schema Design (`supabase/migrations/20250101000000_initial_schema.sql`)

- **`workspaces`**: Agency accounts with unique slugs.
- **`workspace_members`**: Agency team members linked to Supabase Auth (`owner`, `admin`, `member`).
- **`leads`**: Prospect records (`new`, `qualified`, `proposal`, `won`, `lost`) scoped by `workspace_id`.
- **`activities`**: Timeline of notes, calls, meetings, and stage changes.
- **`tasks`**: Follow-up reminders with due dates.
- **`subscriptions`**: Agency SaaS subscription plans and status.
- **`ai_usage`**: Per-workspace AI token consumption tracking.

### Applying Migrations to Supabase

1. Open your Supabase project dashboard.
2. Navigate to the **SQL Editor**.
3. Open `supabase/migrations/20250101000000_initial_schema.sql`, paste its content, and click **Run**.

---

## 🧪 Available Scripts

- `npm run dev`: Starts the Next.js development server with Turbopack.
- `npm run build`: Compiles production build and validates static types.
- `npm run lint`: Runs ESLint analysis.
- `npm run type-check`: Runs strict TypeScript check (`tsc --noEmit`).

---

## 📌 Milestone 1 Deliverables & Known Limitations

### Included in Milestone 1:
- Complete Next.js 16 (React 19) App Router structure with strict TypeScript.
- Polished, responsive B2B SaaS dashboard (desktop, tablet, mobile).
- Real-time sales metrics: Total leads, New leads, Follow-ups due, Closed opportunities won, and Pipeline value.
- Visual Sales Pipeline breakdown with stage distribution.
- Lead management table with search, service filtering, and status filtering.
- Interactive **Create and Edit Lead** modal with Zod schema and React Hook Form validation.
- Complete multi-tenant PostgreSQL migration file with RLS policies and indexes.
- Modular server-side AI interface prepared for OpenAI integration.

### Known Limitations (Deferred to Milestone 2+):
- **Live Supabase Auth & CRUD**: Currently running in reactive in-memory state with localStorage persistence until live Supabase credentials are configured.
- **OpenAI Live Calls**: AI service abstraction is in place; API calls will be enabled in Phase 2 with server rate limiting and Zod structured outputs.
- **Stripe Billing**: SaaS billing and webhook handling will be implemented in a dedicated phase.
