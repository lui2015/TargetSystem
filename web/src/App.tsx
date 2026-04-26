import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './store/auth';
import Layout from './components/Layout';
import Login from './pages/Login';
import Today from './pages/Today';
import Objectives from './pages/Objectives';
import ObjectiveWizard from './pages/ObjectiveWizard';
import ObjectiveDetail from './pages/ObjectiveDetail';
import Habits from './pages/Habits';
import Review from './pages/Review';

function RequireAuth({ children }: { children: JSX.Element }) {
  const token = useAuth(s => s.token);
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  const hydrate = useAuth(s => s.hydrate);
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="/today" replace />} />
        <Route path="today" element={<Today />} />
        <Route path="objectives" element={<Objectives />} />
        <Route path="objectives/new" element={<ObjectiveWizard />} />
        <Route path="objectives/:id" element={<ObjectiveDetail />} />
        <Route path="habits" element={<Habits />} />
        <Route path="review" element={<Review />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
