import { lazy, Suspense } from 'react';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { DashboardLayout } from '@/components/common/DashboardLayout';
import { ProtectedRoute } from '@/components/common/ProtectedRoute';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { Loader2 } from 'lucide-react';

// Retry wrapper for lazy imports (handles stale chunks after deploys)
function lazyRetry(importFn: () => Promise<any>) {
    return lazy(() =>
        importFn().catch(() => {
            const key = 'chunk-reload';
            if (!sessionStorage.getItem(key)) {
                sessionStorage.setItem(key, '1');
                window.location.reload();
            }
            sessionStorage.removeItem(key);
            return importFn();
        })
    );
}

// Lazy-loaded pages
const Login = lazyRetry(() => import('./pages/Login'));
const Signup = lazyRetry(() => import('./pages/Signup'));
const ResetPassword = lazyRetry(() => import('./pages/ResetPassword'));
const Dashboard = lazyRetry(() => import('./pages/Dashboard'));
const Branches = lazyRetry(() => import('./pages/Branches'));
const BranchDetail = lazyRetry(() => import('./pages/BranchDetail'));
const Alerts = lazyRetry(() => import('./pages/Alerts'));
const Reports = lazyRetry(() => import('./pages/Reports'));
const Settings = lazyRetry(() => import('./pages/Settings'));
const NotFound = lazyRetry(() => import('./pages/NotFound'));
const ServerError = lazyRetry(() => import('./pages/ServerError'));
const Kiosk = lazyRetry(() => import('./pages/Kiosk'));

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 5 * 60 * 1000,
            retry: 2,
            refetchOnWindowFocus: false,
        },
    },
});

function PageLoader() {
    return (
        <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );
}

const App = () => (
    <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
            <TooltipProvider>
                <Toaster />
                <Sonner />
                <BrowserRouter>
                    <Suspense fallback={<PageLoader />}>
                        <Routes>
                            <Route path="/login" element={<Login />} />
                            <Route path="/signup" element={<Signup />} />
                            <Route path="/reset-password" element={<ResetPassword />} />
                            <Route path="/500" element={<ServerError />} />
                            <Route path="/kiosk" element={<Kiosk />} />
                            <Route path="/kiosk/:branchId" element={<Kiosk />} />
                            <Route
                                element={
                                    <ProtectedRoute>
                                        <DashboardLayout />
                                    </ProtectedRoute>
                                }
                            >
                                <Route path="/" element={<ErrorBoundary><Dashboard /></ErrorBoundary>} />
                                <Route path="/branches" element={<ErrorBoundary><Branches /></ErrorBoundary>} />
                                <Route path="/branches/:id" element={<ErrorBoundary><BranchDetail /></ErrorBoundary>} />
                                <Route path="/alerts" element={<ErrorBoundary><Alerts /></ErrorBoundary>} />
                                <Route path="/reports" element={<ErrorBoundary><Reports /></ErrorBoundary>} />
                                <Route
                                    path="/settings"
                                    element={
                                        <ProtectedRoute allowedRoles={['admin', 'quality_director']}>
                                            <ErrorBoundary><Settings /></ErrorBoundary>
                                        </ProtectedRoute>
                                    }
                                />
                            </Route>
                            <Route path="*" element={<NotFound />} />
                        </Routes>
                    </Suspense>
                </BrowserRouter>
            </TooltipProvider>
        </QueryClientProvider>
    </ErrorBoundary>
);

export default App;
