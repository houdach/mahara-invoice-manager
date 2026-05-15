# Mahara Style — Invoice Manager
### Project Reference Document
> Keep this file. Share it with Claude at the start of every session.

---

## Project Identity

| | |
|---|---|
| **Client** | Mahara Style — Coopérative Al Mahara Al Hirafia |
| **Location** | Marrakech, Maroc |
| **Tool** | Internal invoice & payment management system |
| **Primary language** | French |
| **User** | Owner only (non-technical) |
| **Goal** | Replace the standalone HTML invoice generator with a full persistent web app |

---

## Brand Identity

| Token | Value |
|---|---|
| Burgundy (primary) | `#702434` |
| Gold (accent) | `#BF984D` |
| Cream (background) | `#FAF3EE` |
| Heading font | Playfair Display |
| Body font | Inter / DM Sans |
| Logo | M✦S monogram (SVG circle) |

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS + brand tokens |
| Auth | NextAuth.js v5 (credentials — single owner account) |
| Database | Supabase (PostgreSQL) |
| File Storage | Supabase Storage (product photos) |
| PDF Export | jsPDF + html2canvas (images embedded as base64) |
| Deploy | Vercel |

---

## Database Schema

```sql
-- Clients
clients (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  phone        text,
  city         text,
  created_at   timestamp DEFAULT now()
)

-- Invoices
invoices (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number       text UNIQUE NOT NULL,         -- PF-2026-XXXX
  client_id    uuid REFERENCES clients(id),
  date         date NOT NULL,
  validity     date NOT NULL,                -- date + 15 days
  status       text DEFAULT 'En attente',   -- En attente | Partiel | Soldé
  total        numeric NOT NULL DEFAULT 0,
  created_at   timestamp DEFAULT now()
)

-- Invoice Line Items
invoice_items (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id   uuid REFERENCES invoices(id) ON DELETE CASCADE,
  photo_url    text,                          -- Supabase Storage URL
  photo_base64 text,                          -- embedded in PDF
  quantity     integer NOT NULL,
  unit_price   numeric NOT NULL
)

-- Payments
payments (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id   uuid REFERENCES invoices(id) ON DELETE CASCADE,
  amount       numeric NOT NULL,
  date         date NOT NULL,
  note         text,
  created_at   timestamp DEFAULT now()
)
```

---

## Features

### Section 1 — Auth
- Login page (owner only, single account)
- Protected routes — all pages behind auth
- Session persistence across browser sessions

### Section 2 — Client Management
- Client list with search
- Create / edit client (name, phone, city)
- Client detail page → full invoice + payment history

### Section 3 — Invoice Builder
- Select client from list
- Add line items: upload product photo → stored in Supabase → base64 embedded in PDF
- No product name / designation — photo + quantity + unit price only
- Auto-numbered (PF-2026-XXXX)
- Validity auto-set to date + 15 days
- Save to database

### Section 4 — Payment Tracker
- Per-invoice payment table
- Add payment button (amount + date + optional note)
- Remaining balance = total − sum of payments (always visible)
- Status auto-updates: En attente → Partiel → Soldé
- Full payment history displayed as a table

### Section 5 — Dashboard
- Recent invoices list
- Search by client name / invoice number / date
- Status badges with color: En attente (grey) / Partiel (gold) / Soldé (green)
- Quick stats: total invoiced, total collected, total pending

---

## UX Rules (non-negotiable)
- Every action max **2 clicks** away
- No raw IDs or technical labels visible to user
- Empty states with clear CTA ("Aucune facture — Créer une")
- Confirmation modal before any delete
- Mobile-friendly (owner may use on phone)
- French throughout — no English labels in UI
- Brand colors on every screen — feels like *his* tool

---

## Build Order

```
Step 1  — Init Next.js 14 project + Tailwind + brand tokens
Step 2  — Supabase project setup → create 4 tables
Step 3  — NextAuth setup → login page
Step 4  — Dashboard shell + sidebar navigation
Step 5  — Client management (list + create + edit)
Step 6  — Invoice builder (line items + photo upload)
Step 7  — Payment tracker (table + add payment)
Step 8  — PDF export (jsPDF + base64 images)
Step 9  — Deploy to Vercel
```

---

## Key Business Rules
- **Single owner account** — no multi-user, no roles
- **No online payment** — payments are always tracked manually (in person)
- **Photo replaces product name** — seller uploads photo per line item
- **Photos embedded in PDF** — no external links, works offline
- **15-day validity** — auto-calculated, configurable in code
- **Balance logic** — remaining = total − sum(payments), never negative

---

## What Was Built Before (HTML Prototype)
The original `mahara-invoice.html` was a standalone single-file tool with:
- jsPDF export with burgundy header + M✦S logo
- Auto-numbered invoices (PF-2026-XXXX)
- Validity date (date + 15 days)
- Invoice history in localStorage (not persistent across devices)
- No client tracking, no payment tracking

This new app replaces it entirely. The PDF style should match the original.

---

## Environment Variables Needed

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# NextAuth
NEXTAUTH_SECRET=
NEXTAUTH_URL=https://invoices.maharastyle.ma

# Owner credentials (stored as env vars, not in DB)
OWNER_USERNAME=
OWNER_PASSWORD_HASH=
```

---

## Deploy Target
- **Platform:** Vercel
- **Domain:** `invoices.maharastyle.ma` (or subdomain TBD by client)
- **Repo:** GitHub (auto-deploy on push to main)

---

## Portfolio Notes
This project demonstrates:
- Full-stack Next.js 14 with App Router + TypeScript
- Auth with NextAuth.js (credentials provider, protected routes)
- Relational DB design with Supabase / PostgreSQL
- File upload pipeline (browser → Supabase Storage → base64 PDF embed)
- PDF generation with embedded assets (jsPDF + html2canvas)
- Real client, real business problem, shipped in production
- Clean UX design for non-technical users