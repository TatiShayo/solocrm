Build the SoloCRM Analytics Dashboard at /dashboard/analytics.

You are a senior fullstack engineer. Read the existing codebase patterns and build exactly what's specified below. Output every file as COMPLETE code — no "..." or "// rest stays the same".

═══ CURRENT STATE ═══
Build passes. Dashboard layout has nav for Contacts, Pipeline, Tasks, Sequences, Settings. No analytics page yet.

═══ TASKS ═══

Task 1: Add "Analytics" nav link to dashboard layout
File: src/app/dashboard/layout.tsx
Add a BarChart3 icon link to /dashboard/analytics next to Settings in both desktop and mobile navs.

Task 2: Create analytics dashboard page
File: src/app/dashboard/analytics/page.tsx
Server component that fetches summary stats and renders child client components. Fetch:
- Pipeline: all deals with status, value, probability, close_date, source, created_at
- Contacts: all contacts with source, created_at
- Won deals count, total value won this month
Pass data to client components.

Task 3: Pipeline velocity card
File: src/app/dashboard/analytics/_components/pipeline-velocity.tsx
"use client". Shows average days per stage. Input: deals[] with stage info. 
Calculate: for each deal in a stage, how many days was it there. Average per stage. Display as a horizontal bar chart (CSS bars, not recharts) with stage name and avg days label. Color: blue-500 bars.

Task 4: Win rate by source card
File: src/app/dashboard/analytics/_components/win-rate-source.tsx
"use client". Recharts pie chart. Input: contacts[] with source field. Group contacts by source (cold/referral/inbound). For each source: total deals ÷ won deals = win rate %. Show PieChart with 3 slices (cold=blue, referral=green, inbound=purple). Below chart: table with source name, total deals, won deals, win rate %.

Task 5: Deal size distribution card
File: src/app/dashboard/analytics/_components/deal-size-dist.tsx
"use client". Input: deals[] with value. Bucket deals into ranges: $0-1K, $1K-5K, $5K-10K, $10K-50K, $50K+. Show BarChart (recharts) with range labels and deal count. Color: indigo.

Task 6: Monthly closed revenue chart
File: src/app/dashboard/analytics/_components/monthly-revenue.tsx
"use client". Input: won deals with close_date and value. Group by month for last 12 months. Show AreaChart (recharts) with month label on x-axis and revenue on y-axis. Gradient fill. Color: emerald.

Task 7: Top contacts & export
File: src/app/dashboard/analytics/page.tsx (update the existing file)
Add "Top 10 Contacts by Deal Value" table below charts. Table: rank, contact name, company, total deal value, deal count. Add "Export CSV" button on top right that downloads a CSV of all analytics data.

═══ DESIGN ═══
Neutral/clean palette: slate backgrounds, blue primary (#3b82f6), gray borders.
Recharts library is already installed.
Use shadcn Card component wrapper for each chart section.
Each chart card has a title, the chart, and a small summary text below.
All charts must be responsive (width="100%" height={300}).
Responsive grid: 2 columns on desktop, 1 on mobile.

═══ RULES ═══
Create all files. Output COMPLETE file contents with ## File: path header.
npm run build must pass.
Each component must be a proper React component with correct imports.
Use existing types from @/lib/types.
