
import { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom';
import './App.css';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import NotFound from './pages/NotFound';
import Index from './pages/Index';
import Loading from './components/Loading';
import { Toaster } from './components/ui/toaster';
import { LanguageProvider } from './context/LanguageContext';

// Lazy load components
const Dashboard = lazy(() => import('./pages/Index'));
const Projects = lazy(() => import('./pages/Projects'));
const ProjectDetails = lazy(() => import('./pages/ProjectDetails'));
const Orders = lazy(() => import('./pages/Orders'));
const ProjectOrders = lazy(() => import('./pages/ProjectOrders'));
const Settings = lazy(() => import('./pages/Settings'));
const Workstations = lazy(() => import('./pages/Workstations'));
const Planning = lazy(() => import('./pages/Planning'));
const PersonalTasks = lazy(() => import('./pages/PersonalTasks'));
const DailyTasks = lazy(() => import('./pages/DailyTasks'));
const InstallCalendar = lazy(() => import('./pages/InstallCalendar'));

function App() {
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    // Any initialization logic here
    setInitialized(true);
  }, []);

  if (!initialized) {
    return <Loading />;
  }

  return (
    <LanguageProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
            <Route path="/projects" element={
              <ProtectedRoute>
                <Suspense fallback={<Loading />}>
                  <Projects />
                </Suspense>
              </ProtectedRoute>
            } />
            <Route path="/projects/:id" element={
              <ProtectedRoute>
                <Suspense fallback={<Loading />}>
                  <ProjectDetails />
                </Suspense>
              </ProtectedRoute>
            } />
            <Route path="/orders" element={
              <ProtectedRoute>
                <Suspense fallback={<Loading />}>
                  <Orders />
                </Suspense>
              </ProtectedRoute>
            } />
            <Route path="/projects/:id/orders" element={
              <ProtectedRoute>
                <Suspense fallback={<Loading />}>
                  <ProjectOrders />
                </Suspense>
              </ProtectedRoute>
            } />
            <Route path="/settings" element={
              <ProtectedRoute>
                <Suspense fallback={<Loading />}>
                  <Settings />
                </Suspense>
              </ProtectedRoute>
            } />
            <Route path="/workstations" element={
              <ProtectedRoute>
                <Suspense fallback={<Loading />}>
                  <Workstations />
                </Suspense>
              </ProtectedRoute>
            } />
            <Route path="/planning" element={
              <ProtectedRoute>
                <Suspense fallback={<Loading />}>
                  <Planning />
                </Suspense>
              </ProtectedRoute>
            } />
            <Route path="/personal-tasks" element={
              <ProtectedRoute>
                <Suspense fallback={<Loading />}>
                  <PersonalTasks />
                </Suspense>
              </ProtectedRoute>
            } />
            <Route path="/daily-tasks" element={
              <ProtectedRoute>
                <Suspense fallback={<Loading />}>
                  <DailyTasks />
                </Suspense>
              </ProtectedRoute>
            } />
            <Route path="/install-calendar" element={
              <ProtectedRoute>
                <Suspense fallback={<Loading />}>
                  <InstallCalendar />
                </Suspense>
              </ProtectedRoute>
            } />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
        <Toaster />
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;
