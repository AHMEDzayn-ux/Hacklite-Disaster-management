# 📋 Project Architecture & Guidelines

## 🏗️ Source Layout

The frontend is organised **by feature**, not by file type. A feature owns its
pages, its components, and the service that talks to Supabase on its behalf.
Anything used by two or more features moves up into `components/` or `lib/`.

```
Hacklite-Disaster-management/
├── docs/                          # All project documentation
│   ├── architecture/              # System design, schema, AI agents
│   ├── setup/                     # Supabase, Stripe, donations, deployment
│   ├── security/                  # Audit report, admin/delete hardening
│   ├── guides/                    # Quick start, visual + test-data guides
│   └── notes/                     # Historical reports and change summaries
│
├── public/                        # Static assets, service worker, _redirects
├── supabase/
│   ├── functions/                 # Deno edge functions (+ _shared helpers)
│   ├── migrations/                # Timestamped schema migrations
│   └── sql/                       # Ad-hoc / one-off SQL scripts
│
└── src/
    ├── main.jsx                   # Entry point: providers, router, auto-sync
    ├── index.css                  # Tailwind entry
    │
    ├── app/                       # Application shell
    │   ├── App.jsx                # Providers + Suspense boundary
    │   └── routes.jsx             # THE route table — every URL lives here
    │
    ├── components/                # Cross-feature UI (no domain logic)
    │   ├── icons/Icons.jsx        # Inline SVG icon set
    │   ├── layout/                # Navbar, RoleLayout (Navbar + <Outlet/>)
    │   ├── map/                   # LocationPicker, HeatmapLayer
    │   └── ui/                    # Charts, LazyImage, modals, banners…
    │
    ├── features/                  # One folder per domain
    │   ├── admin/                 # Command dashboard, records, AI agents
    │   │   ├── components/  pages/  services/  utils/
    │   ├── animal-rescue/         # components/  pages/
    │   ├── auth/                  # AuthContext + ProtectedRoute
    │   ├── camps/                 # components/  pages/  services/
    │   ├── disasters/             # components/  pages/
    │   ├── donations/             # components/  pages/  (Stripe)
    │   ├── inventory/             # pages/  services/  (camp stock)
    │   ├── missing-persons/       # components/  pages/
    │   └── volunteers/            # pages/  services/
    │
    ├── pages/                     # Cross-cutting pages owned by no feature
    │   ├── RoleSelection.jsx      # Landing / role picker
    │   ├── ReportDashboard.jsx    # Reporter hub
    │   ├── RespondDashboard.jsx   # Responder hub
    │   ├── Dashboard.jsx          # Shared responder list view
    │   ├── EmergencyContacts.jsx
    │   └── NotFound.jsx
    │
    ├── lib/                       # Framework-agnostic infrastructure
    │   ├── supabase.js            # Supabase client singleton
    │   ├── supabaseService.js     # Core CRUD + realtime subscriptions
    │   ├── cacheManager.js        # In-memory/localStorage cache
    │   ├── offlineManager.js      # Offline submission queue
    │   ├── syncHandler.js         # Replays the queue when back online
    │   ├── connectionQuality.js   # Lite-mode detection
    │   ├── leafletIconFix.js      # Leaflet marker icon setup
    │   └── mapConfig.js           # Default map view + district bounds
    │
    ├── store/                     # Zustand stores (index.js re-exports)
    ├── data/                      # Static reference data (Sri Lanka regions)
    └── assets/                    # Hero images
```

## 📥 Import Convention

`@/` is aliased to `src/` (see `vite.config.js` and `jsconfig.json`). **Always
import with the alias** — never with `../../..` chains:

```js
import Navbar from '@/components/layout/Navbar';
import { supabase } from '@/lib/supabase';
import { useCampStore } from '@/store';
```

This is what keeps files cheap to move: relocating a component never forces an
edit in the files that import it.

## 🧭 Routing

Every URL in the app is declared in **`src/app/routes.jsx`** and nowhere else.

- Pages are lazy-loaded via `React.lazy` so each route ships its own chunk.
  Only `RoleSelection` and `EmergencyContacts` are eager (first paint + offline
  emergency access).
- Pages that share the Navbar sit under a `<RoleLayout userType="…">` layout
  route, which renders `<Navbar>` plus an `<Outlet/>`. Chrome-less pages
  (landing, camp-admin field tools, admin screens) are declared outside it.
- Authenticated routes wrap their element in `<ProtectedRoute>`.

**Adding a page:** create it under `src/features/<domain>/pages/`, add one
`lazy()` line and one `<Route>` in `routes.jsx`. Nothing else needs to change.

## 📐 Where Does New Code Go?

| You're adding…                              | Put it in                                     |
| ------------------------------------------- | --------------------------------------------- |
| A screen for one domain                     | `features/<domain>/pages/`                    |
| A component only that domain uses           | `features/<domain>/components/`               |
| Supabase calls for one domain               | `features/<domain>/services/`                 |
| A component two+ features use               | `components/ui/` (or `layout/` / `map/`)      |
| Generic infrastructure, no domain knowledge | `lib/`                                        |
| Static lookup data                          | `data/`                                       |
| A new URL                                   | `app/routes.jsx`                              |

**Rule of thumb:** features may import from `components/`, `lib/`, `store/`,
and `data/`. Features should not reach into each other — if two need the same
thing, promote it upward.

---

## 📜 Historical: original hackathon plan

> The section below is the original planning document from the initial build.
> It is kept for context and no longer reflects the current codebase.


## 🎯 Module Implementation Priority

### Phase 1: Core Features (Week 1-2)

**Person 1:**

- ✅ Missing Person Form (EXAMPLE COMPLETE)
- 📝 Disaster Report Form (follow same pattern)
- 📝 Add image upload capability

**Person 2:**

- 📝 Animal Rescue Form
- 📝 Volunteer Registration Form
- 📝 Emergency Contacts enhancement

**Person 3:**

- 📝 Choose backend (Firebase vs Node.js)
- 📝 Set up database schema
- 📝 Create basic API endpoints
- 📝 Camp Management Form

### Phase 2: Integration (Week 3-4)

- Connect forms to backend APIs
- Add authentication system
- Implement file uploads (images)
- Add map integration for locations

### Phase 3: Advanced Features (Week 5-6)

- SMS gateway integration
- AI processing for SMS
- Real-time notifications
- Admin dashboard for approvals

### Phase 4: Polish & Launch (Week 7-8)

- Payment gateway for donations
- Performance optimization
- Mobile responsiveness testing
- Deployment

## 🎨 Component Design Patterns

### 1. Form Components (Example: MissingPersonForm.jsx)

**Pattern:**

```jsx
import { useForm } from "react-hook-form";
import { useYourStore } from "../store";

function YourForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm();
  const { addItem } = useYourStore();

  const onSubmit = async (data) => {
    try {
      // Process and save data
      addItem(data);
      reset();
    } catch (error) {
      console.error(error);
    }
  };

  return <form onSubmit={handleSubmit(onSubmit)}>{/* Form fields */}</form>;
}
```

### 2. Page Components

**Pattern:**

```jsx
import YourForm from "../components/YourForm";
import { useYourStore } from "../store";

function YourPage() {
  const { items } = useYourStore();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1>Page Title</h1>
      <YourForm />
      <ItemList items={items} />
    </div>
  );
}
```

### 3. Reusable Components

Create these as needed:

**LoadingSpinner.jsx:**

```jsx
function LoadingSpinner() {
  return (
    <div className="flex justify-center items-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
    </div>
  );
}
```

**ErrorMessage.jsx:**

```jsx
function ErrorMessage({ message }) {
  return (
    <div className="bg-danger-100 border border-danger-500 text-danger-700 px-4 py-3 rounded">
      ⚠️ {message}
    </div>
  );
}
```

## 🗄️ Database Schema (Recommended)

### Missing Persons

```javascript
{
  id: string,
  name: string,
  age: number,
  gender: string,
  height: number,
  description: string,
  lastSeenLocation: string,
  lastSeenDate: datetime,
  reporterName: string,
  contactNumber: string,
  email: string,
  additionalInfo: string,
  status: 'Active' | 'Found' | 'Closed',
  photos: [url],
  createdAt: datetime,
  updatedAt: datetime
}
```

### Disaster Reports

```javascript
{
  id: string,
  type: 'Flood' | 'Landslide' | 'Fire' | 'Earthquake' | 'Other',
  severity: 'Low' | 'Medium' | 'High' | 'Critical',
  location: string,
  coordinates: { lat: number, lng: number },
  description: string,
  affectedPeople: number,
  reporterName: string,
  contactNumber: string,
  photos: [url],
  status: 'Reported' | 'Responding' | 'Resolved',
  createdAt: datetime
}
```

### Volunteers

```javascript
{
  id: string,
  name: string,
  email: string,
  phone: string,
  address: string,
  skills: [string],
  availability: string,
  experience: string,
  emergencyContact: string,
  status: 'Available' | 'Deployed' | 'Inactive',
  registeredAt: datetime
}
```

### Camps

```javascript
{
  id: string,
  name: string,
  location: string,
  coordinates: { lat: number, lng: number },
  capacity: number,
  currentOccupancy: number,
  facilitiesAvailable: [string],
  resourcesNeeded: [
    { item: string, quantity: number, priority: string }
  ],
  managerName: string,
  contactNumber: string,
  status: 'Active' | 'Full' | 'Closed',
  createdAt: datetime
}
```

### Donations

```javascript
{
  id: string,
  donorName: string,
  email: string,
  phone: string,
  type: 'Money' | 'Items',
  amount: number, // For money
  items: [
    { name: string, quantity: number }
  ],
  paymentMethod: string,
  transactionId: string,
  status: 'Pending' | 'Completed' | 'Failed',
  createdAt: datetime
}
```

## 🔐 Authentication Strategy

### Option 1: Firebase Auth (Recommended for beginners)

- Email/Password
- Google Sign-in
- Phone number OTP

### Option 2: JWT with Node.js

- Custom user database
- More control, more complexity

### User Roles

```javascript
{
  id: string,
  email: string,
  name: string,
  role: 'admin' | 'volunteer' | 'reporter',
  phone: string,
  createdAt: datetime
}
```

## 🗺️ Map Integration

### Option 1: Leaflet (Free, Open Source)

```bash
npm install react-leaflet leaflet
```

### Option 2: Google Maps

- Needs API key ($200 free monthly credit)
- Better geocoding features

## 💳 Payment Integration (for Donations)

### For Sri Lanka:

1. **PayHere** - Local payment gateway

   - Credit/Debit cards
   - Mobile payments

2. **Stripe** - International
   - More features
   - Better documentation

## 📱 SMS Integration

### Gateway Options:

1. **Twilio** - International, easy to use
2. **Dialog/Mobitel API** - Local Sri Lankan providers
3. **TextLocal** - Alternative

### AI Processing:

```javascript
// Example SMS input:
"Missing person: Kasun Silva, age 35, last seen Colombo Fort, wearing blue shirt"

// AI parses to:
{
  type: "missing_person",
  name: "Kasun Silva",
  age: 35,
  location: "Colombo Fort",
  description: "wearing blue shirt"
}
```

## 🚀 Deployment Guide

### Frontend (Choose one):

**1. Vercel (Recommended)**

```bash
npm install -g vercel
vercel login
vercel
```

**2. Netlify**

- Drag and drop `dist` folder after `npm run build`
- Or connect GitHub repo for auto-deployment

**3. GitHub Pages**

```bash
npm run build
# Push dist folder to gh-pages branch
```

### Backend (Choose one):

**1. Firebase**

- Free tier generous
- No server management

**2. Railway**

```bash
npm install -g railway
railway login
railway init
railway up
```

**3. Render**

- Free tier available
- Easy deployment from GitHub

## 📊 Performance Optimization

1. **Code Splitting**

```jsx
import { lazy, Suspense } from "react";

const MissingPersons = lazy(() => import("./pages/MissingPersons"));

<Suspense fallback={<LoadingSpinner />}>
  <MissingPersons />
</Suspense>;
```

2. **Image Optimization**

- Compress before upload
- Use WebP format
- Lazy load images

3. **Caching**

- Use React Query for API caching
- Service Workers for offline support

## 🧪 Testing (Optional, Later Phase)

```bash
npm install -D @testing-library/react vitest
```

## 📝 Git Workflow

```bash
# Pull latest
git pull origin main

# Create feature branch
git checkout -b feature/disaster-form

# Make changes, then:
git add .
git commit -m "feat: add disaster report form"

# Push
git push origin feature/disaster-form

# Create PR on GitHub
```

### Commit Message Convention:

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation
- `style:` Formatting
- `refactor:` Code restructuring

## 🆘 Common Errors & Solutions

### 1. Module not found

```bash
npm install
```

### 2. Tailwind not working

- Check if dev server is running
- Verify tailwind.config.js includes src files

### 3. Form not submitting

- Check browser console (F12)
- Verify all required fields have values

### 4. State not updating

- Make sure you're using the store correctly
- Check Zustand devtools

## 📚 Recommended VS Code Extensions

1. **ES7+ React/Redux/React-Native snippets**
2. **Tailwind CSS IntelliSense**
3. **Prettier - Code formatter**
4. **ESLint**
5. **Auto Rename Tag**

## ✨ Next Steps for Team

1. **Review the example form** (`src/components/MissingPersonForm.jsx`)
2. **Pick your module** from the division of work
3. **Copy the pattern** from MissingPersonForm
4. **Build one feature at a time**
5. **Test frequently** in the browser
6. **Commit often** to save progress

---

**Questions?** Check QUICK_START.md or ask your teammates!
