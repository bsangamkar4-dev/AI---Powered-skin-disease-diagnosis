import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense, useEffect } from "react";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { SimpleAuthProvider } from "./contexts/SimpleAuthContext";
import PageLoader from "./components/ui/PageLoader";
import { PRODUCT_NAME } from "@/config/branding";

// Toggle between Firebase and Simple auth for testing
const USE_FIREBASE_AUTH = import.meta.env.VITE_USE_FIREBASE_AUTH !== "false";
const AuthProviderComponent = USE_FIREBASE_AUTH
  ? AuthProvider
  : SimpleAuthProvider;

// Log which auth provider is being used
console.log(
  `🔐 Using ${
    USE_FIREBASE_AUTH ? "Firebase" : "Simple"
  } authentication provider`
);

const Index = lazy(() => import("./pages/Index"));
const Diagnose = lazy(() => import("./pages/Diagnose"));
const Reports = lazy(() => import("./pages/Reports"));
const ClinicalInsights = lazy(() => import("./pages/ClinicalInsights"));
const DocumentInsights = lazy(() => import("./pages/DocumentInsights"));
const QAAssistant = lazy(() => import("./pages/QAAssistant"));
const UserProfile = lazy(() => import("./pages/UserProfile"));
const UserProfileEdit = lazy(() => import("./pages/UserProfileEdit"));
const About = lazy(() => import("./pages/About"));
const Features = lazy(() => import("./pages/Features"));
const Mission = lazy(() => import("./pages/Mission"));
const HowItWorks = lazy(() => import("./pages/HowItWorks"));
const SocialLoginTest = lazy(() => import("./components/SocialLoginTest"));
const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));
const NotFound = lazy(() => import("./pages/NotFound"));
const AuthTestPage = lazy(() => import("./pages/AuthTestPage"));
import Layout from "./components/Layout";
import MuiStyleLayout from "./components/MuiStyleLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import PublicRoute from "./components/PublicRoute";
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Activity = lazy(() => import("./pages/Activity"));
const DoctorConnect = lazy(() => import("./pages/DoctorConnect"));
const SkinTimeline = lazy(() => import("./pages/SkinTimeline"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// App content wrapper that can access auth context
const AppContent = () => {
  const firebaseAuth = useAuth();
  const loading = USE_FIREBASE_AUTH ? firebaseAuth.loading : false;

  // Wake the hosted API in the background so the first real action does not
  // pay the cold-start cost. This never blocks rendering.
  useEffect(() => {
    const apiBase = import.meta.env.VITE_API_URL;
    if (!apiBase) return;
    fetch(`${apiBase}/health`, { cache: "no-store" }).catch(() => {});
  }, []);

  if (loading) {
    return <PageLoader message={`Initializing ${PRODUCT_NAME}...`} />;
  }

  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader message={`Loading ${PRODUCT_NAME}...`} />}>
        <Routes>
            <Route
              path="/"
              element={
                <PublicRoute>
                  <Layout>
                    <Index />
                  </Layout>
                </PublicRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <MuiStyleLayout>
                    <Dashboard />
                  </MuiStyleLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/diagnose"
              element={
                <ProtectedRoute>
                  <MuiStyleLayout>
                    <Diagnose />
                  </MuiStyleLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/activity"
              element={
                <ProtectedRoute>
                  <MuiStyleLayout>
                    <Activity />
                  </MuiStyleLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/doctor-connect"
              element={
                <ProtectedRoute>
                  <MuiStyleLayout>
                    <DoctorConnect />
                  </MuiStyleLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/skin-timeline"
              element={
                <ProtectedRoute>
                  <MuiStyleLayout>
                    <SkinTimeline />
                  </MuiStyleLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports"
              element={
                <ProtectedRoute>
                  <MuiStyleLayout>
                    <Reports />
                  </MuiStyleLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/insights"
              element={
                <ProtectedRoute>
                  <MuiStyleLayout>
                    <ClinicalInsights />
                  </MuiStyleLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/documents"
              element={
                <ProtectedRoute>
                  <MuiStyleLayout>
                    <DocumentInsights />
                  </MuiStyleLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/qa"
              element={
                <ProtectedRoute>
                  <MuiStyleLayout>
                    <QAAssistant />
                  </MuiStyleLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <MuiStyleLayout>
                    <UserProfile />
                  </MuiStyleLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile/edit"
              element={
                <ProtectedRoute>
                  <MuiStyleLayout>
                    <UserProfileEdit />
                  </MuiStyleLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/about"
              element={
                <PublicRoute>
                  <Layout>
                    <About />
                  </Layout>
                </PublicRoute>
              }
            />
            <Route
              path="/features"
              element={
                <PublicRoute>
                  <Layout>
                    <Features />
                  </Layout>
                </PublicRoute>
              }
            />
            <Route
              path="/mission"
              element={
                <PublicRoute>
                  <Layout>
                    <Mission />
                  </Layout>
                </PublicRoute>
              }
            />
            <Route
              path="/how-it-works"
              element={
                <PublicRoute>
                  <Layout>
                    <HowItWorks />
                  </Layout>
                </PublicRoute>
              }
            />
            <Route
              path="/test-social-login"
              element={
                <PublicRoute>
                  <SocialLoginTest />
                </PublicRoute>
              }
            />
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <Login />
                </PublicRoute>
              }
            />
            <Route
              path="/signup"
              element={
                <PublicRoute>
                  <Signup />
                </PublicRoute>
              }
            />
            <Route path="/auth-test" element={<AuthTestPage />} />
            <Route
              path="*"
              element={
                <PublicRoute>
                  <Layout>
                    <NotFound />
                  </Layout>
                </PublicRoute>
              }
            />
          </Routes>
      </Suspense>
        </BrowserRouter>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProviderComponent>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AppContent />
      </TooltipProvider>
    </AuthProviderComponent>
  </QueryClientProvider>
);

// // Add to Tailwind config
// colors= {
//   dark: {
//     900: '#0f172a', // bg
//     800: '#1e293b', // cards
//     700: '#334155', // borders
//     100: '#f8fafc', // text
//   }
// }

export default App;
