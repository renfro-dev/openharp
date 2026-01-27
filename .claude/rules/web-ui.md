# Frontend Web UI Conventions

## Project Structure

```
web/
├── src/
│   ├── components/         # Reusable UI components
│   │   ├── TaskCard.tsx    # Individual task display
│   │   ├── TaskCard.css
│   │   ├── TaskReviewPanel.tsx
│   │   └── TaskReviewPanel.css
│   ├── pages/              # Page components (route-level)
│   │   ├── LoginPage.tsx
│   │   ├── LoginPage.css
│   │   ├── DashboardPage.tsx
│   │   ├── DashboardPage.css
│   │   ├── ProcessingPage.tsx
│   │   └── ProcessingPage.css
│   ├── services/           # Utility services
│   │   └── api.ts          # Axios API client
│   ├── App.tsx             # Root app component with routing
│   ├── main.tsx            # Entry point
│   └── index.css           # Global styles
├── vite.config.ts
├── tsconfig.json
├── package.json
└── index.html
```

## TypeScript & React Patterns

### Import/Export

```typescript
// Correct - named exports
export default function LoginPage() { ... }

// Correct - type imports
import type { Task } from '../services/api'

// Correct - component imports
import TaskCard from '../components/TaskCard'
```

### Component Structure

```typescript
interface ComponentProps {
  title: string
  onAction: (id: string) => void
  isLoading?: boolean
}

export default function ComponentName({ title, onAction, isLoading = false }: ComponentProps) {
  // State
  const [state, setState] = useState('')

  // Effects
  useEffect(() => {
    // Setup
    return () => {
      // Cleanup
    }
  }, [])

  // Event handlers
  function handleClick() {}

  // Render
  return <div>{title}</div>
}
```

## Component Patterns

### Page Components
- Located in `src/pages/`
- One per route
- Handle route-level state
- Import layout and UI components
- Example: `DashboardPage.tsx`, `LoginPage.tsx`

### UI Components
- Located in `src/components/`
- Reusable across pages
- Props-driven (no side effects)
- Single responsibility
- Example: `TaskCard.tsx`, `TaskReviewPanel.tsx`

### Service/Utility Functions
- Located in `src/services/`
- Pure functions or class methods
- No component state
- Examples: API client, utility helpers

## Styling Guidelines

### CSS Organization

1. **Global styles**: `src/index.css`
2. **Component styles**: Co-located with component (e.g., `TaskCard.tsx` + `TaskCard.css`)
3. **Page styles**: Co-located with page (e.g., `DashboardPage.tsx` + `DashboardPage.css`)

### CSS Conventions

```css
/* Class naming: lowercase-with-hyphens */
.component-name { }
.component-name__element { }
.component-name--modifier { }

/* States: descriptive prefixes */
.component-name.is-active { }
.component-name.is-loading { }
.component-name.has-error { }

/* Responsive: mobile-first */
@media (min-width: 768px) {
  .component-name {
    /* tablet and up */
  }
}
```

### Color Palette

```css
/* Primary gradient */
linear-gradient(135deg, #667eea 0%, #764ba2 100%)

/* Semantic colors */
--color-success: #2ecc71
--color-warning: #f39c12
--color-error: #e74c3c
--color-info: #3498db

/* Neutrals */
--color-white: #ffffff
--color-dark: #333333
--color-gray: #999999
--color-light-gray: #e5e5e5
--color-bg-light: #f5f5f5
```

## State Management

### Local State (useState)
- Component-level state
- Data specific to one component
- Use for: form inputs, UI toggles, modal visibility

```typescript
const [isOpen, setIsOpen] = useState(false)
const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
```

### URL State (useParams, useSearchParams)
- Navigation state
- Shareable URLs
- Use for: filters, pagination, IDs

```typescript
const { sessionId } = useParams()
const [params] = useSearchParams()
const fromDate = params.get('from')
```

### API State
- Data from backend
- Use loading/error states
- Implement error handling

```typescript
const [tasks, setTasks] = useState<Task[]>([])
const [isLoading, setIsLoading] = useState(false)
const [error, setError] = useState<string | null>(null)
```

## API Integration

### Using the API Client

```typescript
import { listMeetings, processMeetings } from '../services/api'

// In component
async function fetchMeetings() {
  try {
    setIsLoading(true)
    const meetings = await listMeetings(fromDate, toDate)
    setMeetings(meetings)
  } catch (error) {
    setError('Failed to fetch meetings')
  } finally {
    setIsLoading(false)
  }
}
```

### Error Handling

```typescript
// Network errors
if (error.response?.status === 401) {
  // Unauthorized - redirect to login
  window.location.href = '/login'
}

// Display to user
if (error) {
  return <div className="error">{error}</div>
}
```

## Routing

### App.tsx Setup

```typescript
<BrowserRouter>
  <Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route path="/" element={<DashboardPage />} />
    <Route path="/processing/:sessionId" element={<ProcessingPage />} />
  </Routes>
</BrowserRouter>
```

### Navigation

```typescript
import { useNavigate } from 'react-router-dom'

const navigate = useNavigate()
navigate('/', { replace: true })
```

### Protected Routes

```typescript
// In App.tsx
const [isAuth, setIsAuth] = useState(false)

<Route
  path="/"
  element={isAuth ? <DashboardPage /> : <Navigate to="/login" />}
/>
```

## Forms & Input

### Controlled Input

```typescript
const [email, setEmail] = useState('')

<input
  type="email"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
  onBlur={() => validateEmail(email)}
/>
```

### Form Submission

```typescript
async function handleSubmit(e: React.FormEvent) {
  e.preventDefault()

  try {
    await submitForm({ email, password })
    navigate('/')
  } catch (error) {
    setError('Login failed')
  }
}
```

## Accessibility

### Semantic HTML

```typescript
<button onClick={handleClick}>Action</button>
<label htmlFor="input-id">Label</label>
<input id="input-id" type="text" />
```

### ARIA Labels

```typescript
<button
  onClick={handleClick}
  aria-label="Close dialog"
  aria-pressed={isPressed}
>
  ✕
</button>
```

### Focus Management

```typescript
// When opening modal/dialog
const dialogRef = useRef<HTMLDivElement>(null)

useEffect(() => {
  dialogRef.current?.focus()
}, [])
```

## Performance Optimization

### Lazy Loading

```typescript
import { lazy, Suspense } from 'react'

const HeavyComponent = lazy(() => import('./HeavyComponent'))

<Suspense fallback={<Loading />}>
  <HeavyComponent />
</Suspense>
```

### Memoization

```typescript
import { memo, useCallback } from 'react'

const TaskCard = memo(function TaskCard({ task, onSelect }: Props) {
  return <div>{task.title}</div>
})

const handleSelect = useCallback((id: string) => {
  setSelectedTasks(new Set([...selectedTasks, id]))
}, [selectedTasks])
```

## Development Tips

### Hot Module Replacement
- Vite supports HMR out of the box
- Changes reflect immediately in browser
- State is preserved during development

### Browser DevTools
- React DevTools extension: inspect components, props, state
- Network tab: check API calls
- Console: check for errors and warnings

### Testing
- Components should be testable
- Keep components pure (same props = same output)
- Mock API calls in tests

## Build & Deployment

### Development

```bash
# Start dev server
npm run dev

# Watch mode for changes
# Accessible at http://localhost:5173
```

### Building

```bash
# Build for production
npm run build

# Preview build locally
npm run preview
```

### Vite Configuration

```typescript
// vite.config.ts
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  }
})
```

## Common Patterns

### Loading State

```typescript
const [isLoading, setIsLoading] = useState(false)

return (
  <button disabled={isLoading}>
    {isLoading ? 'Loading...' : 'Submit'}
  </button>
)
```

### Conditional Rendering

```typescript
// Option 1: ternary
{isError ? <Error message={error} /> : <Success />}

// Option 2: && operator
{isLoading && <Spinner />}

// Option 3: switch/case
{status === 'loading' ? <Spinner /> : status === 'error' ? <Error /> : <Content />}
```

### Lists

```typescript
// Always use key prop with unique values
{items.map((item) => (
  <ItemCard key={item.id} {...item} />
))}
```

## Naming Conventions

### Functions
- Event handlers: `handle<Event>` (e.g., `handleSubmit`, `handleClick`)
- Fetchers: `fetch<Data>` (e.g., `fetchMeetings`, `fetchTasks`)
- Checkers: `is<State>` or `has<Feature>` (e.g., `isLoading`, `hasError`)

### Variables
- State: descriptive name (e.g., `isOpen`, `selectedItems`)
- Refs: `<name>Ref` (e.g., `inputRef`, `dialogRef`)
- Callbacks: `<action>Handler` (e.g., `clickHandler`, `submitHandler`)

## Error Handling Best Practices

1. **Always catch errors in async operations**
   ```typescript
   try {
     await fetchData()
   } catch (error) {
     setError('Failed to load data')
   }
   ```

2. **Provide user-friendly error messages**
   ```typescript
   // Good
   'Failed to save. Please try again.'

   // Bad
   'TypeError: Cannot read property of undefined'
   ```

3. **Show loading states during operations**
   ```typescript
   {isLoading ? <Spinner /> : <Content />}
   ```

4. **Display errors to users**
   ```typescript
   {error && <ErrorBanner message={error} />}
   ```
