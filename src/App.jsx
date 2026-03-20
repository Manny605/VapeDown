import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useProfile } from './store/idb.js';
import AppShell from './shell/AppShell.jsx';
import Onboarding from './views/Onboarding.jsx';
import Dashboard from './views/Dashboard.jsx';
import Stats from './views/Stats.jsx';
import Plan from './views/Plan.jsx';
import Journal from './views/Journal.jsx';

export default function App() {
  const { ready, hasProfile } = useProfile();
  if (!ready) return <div style={{ background: '#050508', minHeight: '100dvh' }} />;
  if (!hasProfile) return <BrowserRouter><Onboarding /></BrowserRouter>;

  return (
    <BrowserRouter>
      <AppShell>
        <Routes>
          <Route path="/"        element={<Dashboard />} />
          <Route path="/stats"   element={<Stats />} />
          <Route path="/plan"    element={<Plan />} />
          <Route path="/journal" element={<Journal />} />
          <Route path="*"        element={<Navigate to="/" replace />} />
        </Routes>
      </AppShell>
    </BrowserRouter>
  );
}
