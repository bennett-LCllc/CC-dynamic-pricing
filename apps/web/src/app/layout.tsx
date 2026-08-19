import { Sidebar } from '@/components/shared/Sidebar';
import { AuthProvider } from '@/lib/auth-context';
import * as Sentry from '@sentry/nextjs';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'CC Ops — Corpus Christi STR Portfolio',
  description: 'Operations platform for short-term rental, lawn care, and cleaning businesses',
};

/**
 * Global error boundary for catching render errors
 */
function ErrorBoundary({ children }: { children: React.ReactNode }) {
  // Sentry's ErrorBoundary is used in development to catch and report errors
  if (process.env.NODE_ENV === 'production') {
    return (
      <Sentry.ErrorBoundary
        fallback={
          <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900">Something went wrong</h1>
              <p className="mt-2 text-gray-600">We've been notified and are looking into it.</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-4 px-4 py-2 bg-ocean-600 text-white rounded-lg hover:bg-ocean-700 transition-colors"
              >
                Reload Page
              </button>
            </div>
          </div>
        }
        onError={(error, errorInfo) => {
          console.error('React error caught by boundary:', error, errorInfo);
        }}
      >
        {children}
      </Sentry.ErrorBoundary>
    );
  }
  return <>{children}</>;
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        {/* Sentry Spotlight for development debugging */}
        <AuthProvider>
          <ErrorBoundary>
            <div className="flex min-h-screen">
              <Sidebar />
              <main className="flex-1 overflow-auto">{children}</main>
            </div>
          </ErrorBoundary>
        </AuthProvider>
      </body>
    </html>
  );
}
