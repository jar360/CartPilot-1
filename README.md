# CartPilot

CartPilot is a customer intelligence and abandoned-cart recovery dashboard built for growing direct-to-consumer (D2C) e-commerce teams. This preview workspace is configured for a fictional Indian D2C skincare store (**VedaGlow Botanicals**) with all monetary figures displayed in Indian Rupees (`INR`, `₹`).

> **Preview & Data Notice:** All customer profiles, abandoned cart records, storefront activity baselines, and priority scores in this version are simulated locally in the browser (`localStorage`). No live storefront webhooks, external CRM syncs, Gemini API calls, or real Email/WhatsApp dispatches are executed.

---

## Key Features

1. **Overview Dashboard**
   - Live KPI cards derived from active state: **Total Customers**, **Active Abandoned Carts**, **Potential Recovery Value (`₹`)**, and **High-Priority Customers**.
   - Interactive SVG **Customer Activity** and **Abandoned Cart Trend** charts (6-day simulated baseline + live today snapshot).
   - Ranked **High-Priority Recovery Opportunities**, **Recovery Status Overview**, and **Recent Customer Interactions**.

2. **Customer Management**
   - Searchable, filterable (Purchase Status and Intent), and sortable customer directory (`Customer ID`, `Name`, `Email`, `Cart Value`, `Purchase Status`, `Last Activity`, `Customer Intent`).
   - Slide-over **Customer Profile Drawer** displaying skin profile, deterministic priority breakdown, itemized cart summary, storefront activity timeline, and interaction logs.

3. **Customer Intelligence (Deterministic Scoring)**
   - Rule-based scoring engine (`0–100`) evaluating each customer across three bounded components:
     - **Cart Value (`0–35` pts)**: Tiered by basket value in `₹` (`≥ ₹4,500`, `≥ ₹3,000`, `≥ ₹2,000`, `≥ ₹1,200`, `> ₹0`).
     - **Purchase Intent & Funnel Depth (`0–40` pts)**: Base intent (`High: 28`, `Medium: 18`, `Low: 8`) + checkout step reached (`Payment Page: +8`, `Shipping Details: +5`, `Cart Review: +2`) + repeat buyer bonus (`+4`).
     - **Abandonment Window Recency (`0–25` pts)**: Tiered by hours since abandonment (`≤ 4h: 25`, `≤ 12h: 21`, `≤ 24h: 16`, `≤ 48h: 11`, `> 48h: 6`).
   - **Priority Thresholds**: `High` (`≥ 72`), `Medium` (`46–71`), `Low` (`< 46`).
   - **Resolved Records**: Recovered carts and directly converted orders with no open cart receive `0/100` (`Low` active recovery priority) so they never displace open abandonment opportunities.

4. **Cart Recovery Workflow**
   - Filterable pipeline across `Pending`, `Message generated`, `Awaiting approval`, `Approved`, and `Recovered` statuses.
   - Slide-over **Cart Detail Drawer** with itemized SKU breakdown, channel (`Email` / `WhatsApp`) and tone (`Warm Reminder` / `Gentle Incentive` / `VIP Concierge`) selectors, deterministic template draft generator, editable message preview, and working **Submit for Approval**, **Approve**, **Reject**, and **Mark Recovered** transitions.
   - Includes a typed `RecoveryAIServiceContract` interface in `src/types/cartpilot.ts` for future server-side Gemini API integration without modifying UI components.

5. **Analytics**
   - Derived metrics and charts for **Average Active Abandoned Basket**, **Recovery Rate**, **Recovered Cart Revenue**, **Mean Active Priority Score**, **Recovery Status Distribution**, **Customer Intent Distribution**, and **Active Abandoned Value by Skincare Category**.

---

## Architecture & Directory Structure

```text
src/
├── App.tsx                                 # Root state, localStorage sync, drawers & route switching
├── main.tsx                                # React DOM entry point
├── index.css                               # Tailwind CSS v4 theme & typography tokens
├── types/
│   └── cartpilot.ts                        # Domain interfaces & Stage-2 RecoveryAIServiceContract
├── data/
│   └── mockData.ts                         # 12 fictional customers, 11 cart records, 7-day baseline series
├── services/
│   ├── scoringEngine.ts                    # Deterministic 0–100 scoring algorithm & duration helpers
│   └── recoveryService.ts                  # Metrics reconciliation, INR formatting, draft generator, persistence
└── components/
    ├── charts/Charts.tsx                   # Custom responsive SVG charts with hover tooltips
    ├── drawers/
    │   ├── CustomerProfileDrawer.tsx       # Customer profile, timeline, and interaction drawer
    │   └── CartDetailDrawer.tsx            # Itemized cart view, draft editor, and approval workflow
    ├── layout/
    │   ├── Sidebar.tsx                     # Persistent desktop sidebar & mobile navigation drawer
    │   └── TopBar.tsx                      # Global search dropdown, recovery alerts, store profile & reset
    ├── ui/StatusIndicators.tsx             # Semantic status labels, priority indicators & empty states
    └── views/
        ├── OverviewView.tsx
        ├── CustomersView.tsx
        ├── IntelligenceView.tsx
        ├── CartRecoveryView.tsx
        └── AnalyticsView.tsx
```

---

## Tech Stack

- **Framework**: React 19 + TypeScript
- **Build Tool**: Vite 8
- **Styling**: Tailwind CSS v4 (`@tailwindcss/vite`)
- **Icons**: `lucide-react`

---

## Local Setup & Commands

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Environment variables**
   - Copy `.env.example` to `.env.local` if preparing for future backend/Gemini integration.
   - `.env` and `.env.local` are excluded from Git via `.gitignore`; never commit real API keys.

3. **Run development server**
   ```bash
   npm run dev
   ```
   Opens the app on `http://localhost:3000`.

4. **Type-check and build**
   ```bash
   npm run lint
   npm run build
   ```
