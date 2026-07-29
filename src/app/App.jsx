import { Suspense } from 'react';
import { AuthProvider } from '@/features/auth/AuthProvider';
import PageLoader from '@/components/ui/PageLoader';
import AppRoutes from '@/app/routes';

/**
 * Application shell: global providers + the lazy-route boundary.
 * The route table itself lives in `@/app/routes`.
 */
function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <Suspense fallback={<PageLoader />}>
          <AppRoutes />
        </Suspense>
      </div>
    </AuthProvider>
  );
}

export default App;
