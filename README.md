# Neaty Beauty

> 你嘅化妝品護膚品管家 — 追蹤開封日、過期日同存貨。

**Phase 1 MVP** · by Neaty Beauty · 繁體中文（香港）

---

## 🎯 MVP Scope

**Phase 1（而家）— 核心追蹤loop**
- ✅ Magic link auth
- ✅ 手動加產品（名、品牌、分類、PAO、開封日、到期日）
- ✅ 產品list + filter + sort
- ✅ 自訂分類 + 色系
- ✅ 實際到期日自動計算（opened + PAO vs expiry date，取最早）
- ✅ Dashboard統計 + 就嚟過期提示
- ✅ 「今日開封」/「標記已用完」一click操作
- ✅ 使用量tracking（免費版100件）

**Phase 2（5-6月）— Input進化**
- ⏳ Barcode scan（`@zxing/library`）
- ⏳ Claude Vision OCR（影包裝自動讀PAO同批號）
- ⏳ Push notifications（Web Push API）
- ⏳ PWA install

**Phase 3（7-8月）— Engagement + monetization**
- ⏳ 消耗挑戰
- ⏳ 年度空瓶報告
- ⏳ Pro tier（Stripe）
- ⏳ 同 Neaty Beauty content venture 整合

---

## 🛠️ Tech Stack

| Layer | Tool |
|-------|------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS + custom design tokens |
| Auth + DB | Supabase (Postgres + RLS) |
| Icons | lucide-react |
| Date | date-fns (with zh-HK locale) |
| Hosting | Vercel (recommended) |

---

## 🚀 Setup

### 1. Clone + install

```bash
git clone <your-repo> soon-beauty
cd soon-beauty
npm install
```

### 2. Create Supabase project

1. Go to [supabase.com](https://supabase.com) → New Project
2. Region: 揀 `Northeast Asia (Tokyo)` 或 `Southeast Asia (Singapore)`
3. Save your project URL and anon key

### 3. Run database migration

Option A — Supabase CLI:
```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

Option B — Manual:
1. Open Supabase Dashboard → SQL Editor
2. Copy contents of `supabase/migrations/20260418000001_initial_schema.sql`
3. Run

### 4. Configure auth

In Supabase Dashboard → **Authentication → URL Configuration**:
- Site URL: `http://localhost:3000` (dev) / `https://your-domain.com` (prod)
- Redirect URLs: add `http://localhost:3000/auth/callback`

### 5. Environment variables

```bash
cp .env.example .env.local
```

Fill in:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

### 6. Generate types (optional but recommended)

Edit `package.json`, replace `YOUR_PROJECT_ID` in the `db:types` script, then:
```bash
npm run db:types
```

### 7. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## 📂 Project Structure

```
soon-beauty/
├── supabase/
│   └── migrations/
│       └── 20260418000001_initial_schema.sql   # DB schema
├── src/
│   ├── app/
│   │   ├── (app)/                    # Protected routes (auth required)
│   │   │   ├── layout.tsx            # App shell (nav)
│   │   │   ├── dashboard/            # Home
│   │   │   ├── products/             # List, new, [id], [id]/edit
│   │   │   ├── categories/           # Manage categories
│   │   │   └── settings/             # Account
│   │   ├── auth/callback/            # OAuth callback
│   │   ├── login/                    # Magic link form
│   │   ├── page.tsx                  # Landing
│   │   ├── layout.tsx                # Root
│   │   └── globals.css
│   ├── components/                   # Client components
│   │   ├── ProductForm.tsx
│   │   ├── ProductFilters.tsx
│   │   ├── ProductActions.tsx
│   │   ├── CategoryManager.tsx
│   │   └── SettingsActions.tsx
│   ├── lib/
│   │   ├── supabase/                 # Client, server, middleware
│   │   └── utils.ts                  # Expiry calc, cn, formatters
│   ├── types/
│   │   └── database.ts               # DB types
│   └── middleware.ts                 # Session refresh
├── tailwind.config.ts                # Design tokens
└── package.json
```

---

## 🎨 Design System

**Palette**
- Brand: warm coral `#F27A5E` (primary), cream `#FFF9F7` (tint)
- Ink: warm neutrals (not cold gray)
- Status: red (expired) / amber (<30d) / yellow (<90d) / green (ok)

**Typography**
- Display: Noto Serif TC（標題，增加氣質）
- Body: Noto Sans TC（正文，可讀性強）

**Components**
- `.card` · `.btn-primary` · `.btn-secondary` · `.input` — see `globals.css`
- Radius scale: `sm` (6px) → `xl` (28px)
- Shadow: `soft` → `card` → `float`

---

## 🧪 Testing checklist

喺你第一次跑起個app後，test以下flows：

1. **Signup**: `/login` → 輸入email → 收到magic link → click → landing喺 `/dashboard`
2. **Default categories**: `/categories` → 應該自動見到8個預設分類
3. **Add product**: `/products/new` → 填form → submit → redirect去detail page
4. **Expiry calc**: 加一件產品，set `opened_date = 今日` + `pao_months = 6` → detail page「實際到期日」應該係今日 + 6個月
5. **Mark opened**: 加一件unopened產品 → detail page撳「今日開封」→ 狀態轉in_use，opened_date set咗
6. **Filter**: `/products?filter=expiring` → 只見到30日內到期嘅

---

## 📝 Notes for development

**CSR vs SSR**:
- Read-only pages用Server Component（快、SEO好、auth check喺server）
- Interactive forms / actions用Client Component（`'use client'`）
- Mutations用Client Component調用Supabase client，之後`router.refresh()`

**RLS (Row Level Security)**:
- 所有tables已經enable RLS
- Policies限制用戶只見到/改到自己嘅data
- 冇必要喺app code再check `user_id`（但我依然有做double-check）

**Adding OCR (Phase 2 preview)**:
```ts
// src/app/api/ocr/route.ts (future)
const response = await anthropic.messages.create({
  model: 'claude-sonnet-4-5',
  max_tokens: 500,
  messages: [{
    role: 'user',
    content: [
      { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data }},
      { type: 'text', text: '抽取產品名、品牌、PAO月數、批號，return JSON' }
    ]
  }]
});
```

---

## 🔮 Roadmap

- [ ] Phase 2: OCR + barcode scan
- [ ] Phase 2: Web Push notifications
- [ ] Phase 2: PWA manifest + install prompt
- [ ] Phase 3: Consumption challenges
- [ ] Phase 3: Year-in-review stats
- [ ] Phase 3: Pro tier (Stripe)
- [ ] Phase 3: Content venture integration

---

Built by Tommy · Neaty Beauty · 2026
