# FitFlow - Next.js Application

A modern subscription box landing page for active women, built with Next.js 15, TypeScript, Tailwind CSS, and Zustand.

## 🚀 Features

- ✅ **Modern Tech Stack**: Next.js 15, TypeScript, Tailwind CSS
- ✅ **State Management**: Zustand with persistence
- ✅ **Responsive Design**: Mobile-first approach
- ✅ **Multi-step Form**: Personalization wizard with validation
- ✅ **Image Optimization**: Next.js Image component
- ✅ **API Routes**: Built-in backend for form submission
- ✅ **Type Safety**: Full TypeScript support
- ✅ **SEO Optimized**: Meta tags and Open Graph

## 📁 Project Structure

```
fitflow-nextjs/
├── app/
│   ├── api/
│   │   └── preorder/
│   │       └── route.ts          # API endpoint for form submission
│   ├── step-1/
│   │   └── page.tsx              # Box selection page
│   ├── step-2/
│   │   └── page.tsx              # Personalization wizard
│   ├── step-3/
│   │   └── page.tsx              # Contact form
│   ├── layout.tsx                # Root layout with metadata
│   ├── page.tsx                  # Home page
│   └── globals.css               # Global styles
├── store/
│   └── formStore.ts              # Zustand store for form state
├── public/
│   └── storage/                  # Images
└── package.json
```

## 🛠️ Getting Started

### Prerequisites

- Node.js 18+ installed
- pnpm package manager (install with `npm install -g pnpm`)

### Installation

1. Navigate to the project directory:
```bash
cd fitflow-nextjs
```

2. Install dependencies:
```bash
pnpm install
```

3. Run the development server:
```bash
pnpm dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## 🎨 Pages

### Home Page (`/`)
- Hero section with call-to-action
- How it works section
- Product showcase
- Inspirational quotes

### Step 1 (`/step-1`)
- Box type selection (One-time, Monthly, Seasonal)
- Pricing display

### Step 2 (`/step-2`)
- Personalization wizard with 8 steps:
  1. Personalization choice
  2. Sport preferences
  3. Color preferences
  4. Size selection
  6. Dietary restrictions
  7. Additional notes
  8. Summary and confirmation

### Step 3 (`/step-3`)
- Contact information form
- Form submission to API

## 🔧 State Management

The application uses Zustand for state management with localStorage persistence:

```typescript
// Access the store in any component
import { useFormStore } from '@/store/formStore';

function MyComponent() {
  const { boxType, setBoxType } = useFormStore();
  // ...
}
```

## 📡 API Routes

### POST `/api/preorder`

Handles form submission. Currently logs data to console.

**Request Body:**
```json
{
  "fullName": "string",
  "email": "string",
  "phone": "string (optional)",
  "boxType": "one-time | monthly | seasonal",
  "wantsPersonalization": "boolean",
  "preferences": {
    "sports": ["string"],
    "colors": ["string"],
    "dietary": ["string"],
    "additionalNotes": "string"
  },
  "sizes": {
    "upper": "XS | S | M | L | XL",
    "lower": "XS | S | M | L | XL"
  }
}
```

## 🚀 Deployment

### Deploy to Vercel (Recommended)

1. Push your code to GitHub
2. Import project in Vercel
3. Deploy automatically

```bash
# Or use Vercel CLI
npm install -g vercel
vercel
```

### Build for Production

```bash
pnpm build
pnpm start
```

## 🔮 Next Steps

### 1. Add Database (PostgreSQL)

Install dependencies:
```bash
pnpm add pg
```

Update `app/api/preorder/route.ts` to save data to database (example code is commented in the file).

### 2. Add Email Notifications (Resend)

Install Resend:
```bash
pnpm add resend
```

Add environment variable:
```env
RESEND_API_KEY=your_api_key_here
```

Uncomment email code in `app/api/preorder/route.ts`.

### 3. Environment Variables

Create `.env.local`:
```env
DATABASE_URL=postgresql://user:password@host:5432/database
RESEND_API_KEY=re_xxxxxxxxxxxxx
```

### 4. Add Analytics

Add Google Analytics to `app/layout.tsx`:
```tsx
<Script
  src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"
  strategy="afterInteractive"
/>
```

## 📊 Database Schema (Recommended)

```sql
-- Pre-orders table
CREATE TABLE preorders (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(50),
    box_type VARCHAR(50) NOT NULL,
    wants_personalization BOOLEAN NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'pending'
);

-- Preferences table
CREATE TABLE preferences (
    id SERIAL PRIMARY KEY,
    preorder_id INTEGER REFERENCES preorders(id) ON DELETE CASCADE,
    sports JSONB,
    sport_other TEXT,
    colors JSONB,
    size_upper VARCHAR(10),
    size_lower VARCHAR(10),
    dietary JSONB,
    dietary_other TEXT,
    additional_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 🎯 Features to Add

- [ ] Email confirmation after submission
- [ ] Admin dashboard to view pre-orders
- [ ] Payment integration (Stripe)
- [ ] User authentication
- [ ] Order tracking
- [ ] Subscription management
- [ ] Analytics dashboard

## 🐛 Troubleshooting

### Images not loading
- Ensure images are in `public/storage/` directory
- Check image file names match exactly (case-sensitive)

### State not persisting
- Check browser localStorage
- Clear localStorage if needed: `localStorage.clear()`

### Build errors
- Delete `.next` folder and `node_modules`
- Run `pnpm install` again
- Run `pnpm build`

## 📝 Scripts

```bash
pnpm dev             # Start development server
pnpm build           # Build for production
pnpm start           # Start production server
pnpm lint            # Run ESLint
```

## 🔗 Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Zustand](https://github.com/pmndrs/zustand)
- [Vercel Deployment](https://vercel.com/docs)

## 📄 License

This project is private and proprietary.

## 👥 Support

For questions or issues, contact the development team.

---

**Built with ❤️ for FitFlow**
