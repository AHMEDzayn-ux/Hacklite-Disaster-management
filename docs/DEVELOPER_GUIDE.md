# 👨‍💻 Developer Guide - Disaster Management Platform

**Technical Guide for Contributors**  
**Version:** 1.0.0 | **Last Updated:** January 2, 2026

---

## Table of Contents

1. [Development Environment Setup](#development-environment-setup)
2. [Project Structure](#project-structure)
3. [Architecture Overview](#architecture-overview)
4. [Coding Standards](#coding-standards)
5. [Component Development](#component-development)
6. [State Management](#state-management)
7. [Database Operations](#database-operations)
8. [Testing](#testing)
9. [Deployment](#deployment)
10. [Contributing](#contributing)

---

## Development Environment Setup

### Prerequisites

| Requirement | Version | Purpose            |
| ----------- | ------- | ------------------ |
| Node.js     | 18.x+   | JavaScript runtime |
| npm         | 9.x+    | Package manager    |
| Git         | 2.x+    | Version control    |
| VS Code     | Latest  | Recommended IDE    |

### Initial Setup

```bash
# Clone the repository
git clone https://github.com/your-org/Disaster-management.git
cd Disaster-management

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Start development server
npm run dev
```

### Environment Configuration

Create `.env` in the project root:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here

# Stripe Configuration (for donations)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_key

# Optional: API endpoints
VITE_API_URL=http://localhost:3000
```

> ⚠️ **Never commit `.env` file.** It's already in `.gitignore`.

### Recommended VS Code Extensions

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "dsznajder.es7-react-js-snippets",
    "formulahendry.auto-rename-tag"
  ]
}
```

---

## Project Structure

```
Disaster-management/
├── public/                     # Static assets
│   ├── _redirects             # Netlify redirects
│   └── sw.js                  # Service worker
│
├── src/
│   ├── components/            # Reusable UI components
│   │   ├── shared/           # Shared/common components
│   │   ├── Navbar.jsx        # Navigation component
│   │   ├── ProtectedRoute.jsx # Auth guard
│   │   ├── LocationPicker.jsx # Map location selector
│   │   ├── ErrorBoundary.jsx  # Error handling
│   │   └── [Feature]Form.jsx  # Form components
│   │
│   ├── pages/                 # Route-level components
│   │   ├── Dashboard.jsx      # Main dashboard
│   │   ├── RoleSelection.jsx  # Landing page
│   │   ├── Admin*.jsx         # Admin pages
│   │   └── [Feature].jsx      # Feature pages
│   │
│   ├── services/              # API/service layer
│   │   ├── supabaseService.js # Database operations
│   │   ├── adminService.js    # Admin operations
│   │   └── api.js            # HTTP client config
│   │
│   ├── store/                 # State management
│   │   ├── index.js          # Store exports
│   │   └── supabaseStore.js  # Zustand stores
│   │
│   ├── contexts/              # React contexts
│   │   └── AuthContext.jsx   # Authentication
│   │
│   ├── config/                # Configuration files
│   │   ├── supabase.js       # Supabase client
│   │   └── donations-schema.sql
│   │
│   ├── utils/                 # Utility functions
│   │   └── cacheManager.js   # Data caching
│   │
│   ├── data/                  # Static/mock data
│   │   └── mock*.js          # Mock data files
│   │
│   ├── App.jsx               # Root component
│   ├── App.css               # Global styles
│   ├── main.jsx              # Entry point
│   └── index.css             # Tailwind imports
│
├── supabase/                  # Supabase config
│   ├── functions/            # Edge functions
│   └── migrations/           # Database migrations
│
├── docs/                      # Documentation
│   ├── DOCUMENTATION.md      # Main docs
│   ├── API_REFERENCE.md      # API reference
│   ├── USER_GUIDE.md         # User guide
│   └── DEVELOPER_GUIDE.md    # This file
│
├── package.json              # Dependencies
├── vite.config.js            # Vite configuration
├── tailwind.config.js        # Tailwind CSS config
├── eslint.config.js          # ESLint rules
└── amplify.yml               # AWS Amplify config
```

### Key Files

| File                              | Purpose                             |
| --------------------------------- | ----------------------------------- |
| `src/App.jsx`                     | Route definitions and app structure |
| `src/config/supabase.js`          | Supabase client initialization      |
| `src/services/supabaseService.js` | Database CRUD operations            |
| `src/store/supabaseStore.js`      | Zustand state stores                |
| `src/contexts/AuthContext.jsx`    | Authentication provider             |

---

## Architecture Overview

### Layer Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                        │
│  React Components (Pages, Components, Forms)                 │
│  - JSX with Tailwind CSS                                    │
│  - React Hook Form for forms                                │
│  - Framer Motion for animations                             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    STATE MANAGEMENT LAYER                    │
│  Zustand Stores                                             │
│  - useMissingPersonStore                                    │
│  - useDisasterStore                                         │
│  - useAnimalRescueStore                                     │
│  - useCampStore                                             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    SERVICE LAYER                             │
│  Business Logic & Data Operations                           │
│  - supabaseService.js                                       │
│  - adminService.js                                          │
│  - campManagementService.js                                 │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    DATA LAYER                                │
│  Supabase (PostgreSQL + Realtime + Auth + Storage)          │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

```
User Action → Component → Store Action → Service → Supabase
                 ↑                                    │
                 └────────── Real-time Update ────────┘
```

---

## Coding Standards

### JavaScript/React Style Guide

```javascript
// ✅ Use functional components with hooks
function MyComponent({ prop1, prop2 }) {
    const [state, setState] = useState(null);

    useEffect(() => {
        // Side effects here
    }, []);

    return <div>...</div>;
}

// ✅ Use destructuring for props
function Card({ title, description, onClick }) { ... }

// ✅ Use async/await for async operations
const fetchData = async () => {
    try {
        const data = await apiCall();
        return data;
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
};

// ✅ Use optional chaining
const name = user?.profile?.name;

// ✅ Use nullish coalescing
const value = data ?? defaultValue;
```

### File Naming Conventions

| Type       | Convention | Example                 |
| ---------- | ---------- | ----------------------- |
| Components | PascalCase | `MissingPersonForm.jsx` |
| Pages      | PascalCase | `Dashboard.jsx`         |
| Services   | camelCase  | `supabaseService.js`    |
| Stores     | camelCase  | `supabaseStore.js`      |
| Utils      | camelCase  | `cacheManager.js`       |
| Styles     | kebab-case | `index.css`             |

### Component Structure

```jsx
// Standard component structure
import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useSomeStore } from "../store";

// Constants at top
const STATUS_OPTIONS = ["Active", "Pending", "Closed"];

/**
 * Component description
 * @param {Object} props - Component props
 */
function MyComponent({ prop1, prop2 }) {
  // Hooks first
  const [loading, setLoading] = useState(false);
  const { data, fetchData } = useSomeStore();
  const { register, handleSubmit } = useForm();

  // Effects
  useEffect(() => {
    fetchData();
  }, []);

  // Event handlers
  const handleAction = async (formData) => {
    setLoading(true);
    try {
      await doSomething(formData);
    } finally {
      setLoading(false);
    }
  };

  // Render helpers (if needed)
  const renderList = () => (
    <ul>
      {data.map((item) => (
        <li key={item.id}>{item.name}</li>
      ))}
    </ul>
  );

  // Main render
  if (loading) return <LoadingSpinner />;

  return <div className="container mx-auto p-4">{renderList()}</div>;
}

export default MyComponent;
```

### Tailwind CSS Guidelines

```jsx
// ✅ Use utility classes
<div className="flex items-center justify-between p-4 bg-white rounded-lg shadow">

// ✅ Use responsive prefixes
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

// ✅ Use state variants
<button className="bg-blue-500 hover:bg-blue-600 active:bg-blue-700">

// ✅ Group related classes
<input className="
    w-full px-4 py-2
    border border-gray-300 rounded-lg
    focus:ring-2 focus:ring-blue-500 focus:border-transparent
    placeholder-gray-400
"/>

// ❌ Avoid inline styles
<div style={{ padding: '16px' }}>  // Bad
<div className="p-4">              // Good
```

---

## Component Development

### Creating a New Feature

1. **Create the Form Component**

```jsx
// src/components/NewFeatureForm.jsx
import { useForm } from "react-hook-form";
import LocationPicker from "./LocationPicker";

function NewFeatureForm({ onSubmit }) {
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm();

  const handleFormSubmit = async (data) => {
    await onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Field Name *</label>
        <input
          {...register("fieldName", { required: "Field is required" })}
          className="w-full px-4 py-2 border rounded-lg"
        />
        {errors.fieldName && (
          <span className="text-red-500 text-sm">
            {errors.fieldName.message}
          </span>
        )}
      </div>

      <button type="submit" className="btn-primary">
        Submit
      </button>
    </form>
  );
}

export default NewFeatureForm;
```

2. **Create the List Component**

```jsx
// src/components/NewFeatureList.jsx
function NewFeatureList({ items, onItemClick }) {
  if (!items || items.length === 0) {
    return <div className="text-center text-gray-500 py-8">No items found</div>;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <div
          key={item.id}
          onClick={() => onItemClick(item)}
          className="p-4 bg-white rounded-lg shadow hover:shadow-md cursor-pointer"
        >
          <h3 className="font-semibold">{item.title}</h3>
          <p className="text-gray-600">{item.description}</p>
        </div>
      ))}
    </div>
  );
}

export default NewFeatureList;
```

3. **Create the Page Component**

```jsx
// src/pages/NewFeature.jsx
import { useEffect } from "react";
import { useNewFeatureStore } from "../store";
import NewFeatureForm from "../components/NewFeatureForm";
import NewFeatureList from "../components/NewFeatureList";

function NewFeature() {
  const { items, loading, subscribeToItems, unsubscribeFromItems, addItem } =
    useNewFeatureStore();

  useEffect(() => {
    subscribeToItems();
    return () => unsubscribeFromItems();
  }, []);

  const handleSubmit = async (data) => {
    await addItem(data);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">New Feature</h1>

      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          <h2 className="text-xl font-semibold mb-4">Submit</h2>
          <NewFeatureForm onSubmit={handleSubmit} />
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">All Items</h2>
          {loading ? <div>Loading...</div> : <NewFeatureList items={items} />}
        </div>
      </div>
    </div>
  );
}

export default NewFeature;
```

4. **Add Store**

```javascript
// Add to src/store/supabaseStore.js
export const useNewFeatureStore = create((set, get) => ({
  items: [],
  loading: false,
  error: null,
  unsubscribe: null,

  subscribeToItems: async () => {
    set({ loading: true });
    const unsubscribeFn = await subscribeToTable("new_feature_table", (items) =>
      set({ items, loading: false })
    );
    set({ unsubscribe: unsubscribeFn });
  },

  unsubscribeFromItems: () => {
    const { unsubscribe } = get();
    if (unsubscribe) unsubscribe();
    set({ unsubscribe: null });
  },

  addItem: async (item) => {
    set({ loading: true });
    const newItem = await createDocument("new_feature_table", item);
    set((state) => ({
      items: [newItem, ...state.items],
      loading: false,
    }));
    return newItem;
  },
}));
```

5. **Add Route**

```jsx
// In src/App.jsx
const NewFeature = lazy(() => import("./pages/NewFeature"));

// Add route
<Route
  path="/new-feature"
  element={
    <>
      <Navbar />
      <NewFeature />
    </>
  }
/>;
```

---

## State Management

### Zustand Store Pattern

```javascript
import { create } from "zustand";
import {
  subscribeToTable,
  createDocument,
  updateDocument,
} from "../services/supabaseService";

export const useExampleStore = create((set, get) => ({
  // State
  items: [],
  loading: false,
  error: null,
  unsubscribe: null,
  isInitialized: false,

  // Subscribe to real-time updates
  subscribe: async () => {
    const { isInitialized, unsubscribe } = get();
    if (isInitialized && unsubscribe) return;

    set({ loading: true });
    const unsubscribeFn = await subscribeToTable(
      "table_name",
      (data, appendMode) => {
        if (appendMode) {
          set((state) => ({ items: [...state.items, ...data] }));
        } else {
          set({ items: data, loading: false, isInitialized: true });
        }
      }
    );
    set({ unsubscribe: unsubscribeFn });
  },

  // Unsubscribe
  unsubscribe: () => {
    const { unsubscribe } = get();
    if (unsubscribe) {
      unsubscribe();
      set({ unsubscribe: null });
    }
  },

  // Add item
  addItem: async (item) => {
    try {
      set({ loading: true, error: null });
      const newItem = await createDocument("table_name", item);
      set((state) => ({
        items: [newItem, ...state.items],
        loading: false,
      }));
      return newItem;
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  // Update item
  updateItem: async (id, updates) => {
    try {
      set({ loading: true, error: null });
      await updateDocument("table_name", id, updates);
      set((state) => ({
        items: state.items.map((item) =>
          item.id === id ? { ...item, ...updates } : item
        ),
        loading: false,
      }));
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },
}));
```

### Using Stores in Components

```jsx
import { useEffect } from "react";
import { useExampleStore } from "../store";

function MyComponent() {
  // Select only what you need
  const items = useExampleStore((state) => state.items);
  const loading = useExampleStore((state) => state.loading);
  const { subscribe, unsubscribe, addItem } = useExampleStore();

  // Subscribe on mount
  useEffect(() => {
    subscribe();
    return () => unsubscribe();
  }, []);

  // Use the data
  return loading ? <Spinner /> : <List items={items} />;
}
```

---

## Database Operations

### Creating Tables (Supabase SQL Editor)

```sql
-- Create new table
CREATE TABLE new_feature (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'Active',
    location JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE new_feature ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view" ON new_feature
    FOR SELECT USING (true);

CREATE POLICY "Anyone can insert" ON new_feature
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Authenticated can update" ON new_feature
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE new_feature;
```

### Service Layer Operations

```javascript
// src/services/supabaseService.js

// Query with filters
export const getFilteredDocuments = async (table, filters) => {
  let query = supabase.from(table).select("*");

  // Apply filters
  if (filters.status) {
    query = query.eq("status", filters.status);
  }
  if (filters.district) {
    query = query.eq("district", filters.district);
  }
  if (filters.search) {
    query = query.ilike("name", `%${filters.search}%`);
  }

  // Order and limit
  query = query.order("created_at", { ascending: false }).limit(100);

  const { data, error } = await query;
  if (error) throw error;
  return data;
};

// Upsert (insert or update)
export const upsertDocument = async (table, data, conflictColumn = "id") => {
  const { data: result, error } = await supabase
    .from(table)
    .upsert(data, { onConflict: conflictColumn })
    .select()
    .single();

  if (error) throw error;
  return result;
};

// Batch insert
export const batchInsert = async (table, items) => {
  const { data, error } = await supabase.from(table).insert(items).select();

  if (error) throw error;
  return data;
};
```

---

## Testing

### Unit Testing (Recommended Setup)

```bash
# Install testing dependencies
npm install -D vitest @testing-library/react @testing-library/jest-dom
```

```javascript
// vite.config.js
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/test/setup.js",
  },
});
```

```javascript
// src/test/setup.js
import "@testing-library/jest-dom";
```

### Component Test Example

```javascript
// src/components/__tests__/MyComponent.test.jsx
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import MyComponent from "../MyComponent";

describe("MyComponent", () => {
  it("renders correctly", () => {
    render(<MyComponent title="Test" />);
    expect(screen.getByText("Test")).toBeInTheDocument();
  });

  it("calls onClick when clicked", () => {
    const handleClick = vi.fn();
    render(<MyComponent onClick={handleClick} />);

    fireEvent.click(screen.getByRole("button"));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

### Running Tests

```bash
# Run all tests
npm run test

# Run with coverage
npm run test -- --coverage

# Watch mode
npm run test -- --watch
```

---

## Deployment

### AWS Amplify Deployment

1. **Prepare for Deployment**

```bash
# Build locally first to check for errors
npm run build

# Commit all changes
git add .
git commit -m "Ready for deployment"
git push origin main
```

2. **Amplify Configuration** (`amplify.yml`)

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: dist
    files:
      - "**/*"
  cache:
    paths:
      - node_modules/**/*
```

3. **Environment Variables**
   Set in Amplify Console:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_STRIPE_PUBLISHABLE_KEY`

### Manual Deployment

```bash
# Build for production
npm run build

# Preview locally
npm run preview

# The dist/ folder contains deployable files
```

---

## Contributing

### Git Workflow

```bash
# Create feature branch
git checkout -b feature/your-feature-name

# Make changes and commit
git add .
git commit -m "feat: add new feature"

# Push branch
git push origin feature/your-feature-name

# Create Pull Request on GitHub
```

### Commit Message Format

```
type(scope): description

[optional body]

[optional footer]
```

**Types:**

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Formatting
- `refactor`: Code restructuring
- `test`: Adding tests
- `chore`: Maintenance

**Examples:**

```
feat(camps): add filtering by district
fix(forms): resolve validation error on empty fields
docs(readme): update installation instructions
```

### Pull Request Guidelines

1. **Title**: Clear, descriptive title
2. **Description**: What and why
3. **Testing**: How to test
4. **Screenshots**: For UI changes
5. **Checklist**:
   - [ ] Code follows style guide
   - [ ] Tests pass
   - [ ] Documentation updated
   - [ ] No console errors

### Code Review Checklist

- ✅ Follows coding standards
- ✅ No console.log statements
- ✅ Error handling implemented
- ✅ Loading states handled
- ✅ Responsive design
- ✅ Accessibility considered
- ✅ Performance optimized

---

## Troubleshooting

### Common Issues

**Supabase Connection Error**

```
Error: Supabase configuration is missing
```

Solution: Check `.env` file has correct `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`

**Build Errors**

```
Module not found: Can't resolve '...'
```

Solution: Run `npm install` and check import paths

**Real-time Not Working**

- Verify RLS policies allow SELECT
- Check table is added to realtime publication
- Verify WebSocket connection in browser DevTools

**Tailwind Classes Not Working**

- Restart dev server
- Check `tailwind.config.js` content paths
- Verify class names are correct

### Debug Tools

```javascript
// Enable Supabase logging
import { createClient } from "@supabase/supabase-js";
const supabase = createClient(url, key, {
  db: { schema: "public" },
  auth: { persistSession: true },
  global: { headers: {} },
});

// Log all Supabase queries (dev only)
if (import.meta.env.DEV) {
  supabase.channel("*").subscribe(console.log);
}
```

---

## Resources

### Documentation

- [React Docs](https://react.dev)
- [Supabase Docs](https://supabase.com/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Zustand](https://github.com/pmndrs/zustand)
- [React Hook Form](https://react-hook-form.com)
- [Vite](https://vitejs.dev)

### Community

- GitHub Issues for bug reports
- Discussions for questions
- Pull Requests for contributions

---

**Happy Coding! 🚀**
