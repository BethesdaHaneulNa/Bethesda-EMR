import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { LangProvider } from './i18n/index.jsx';
import { isLoggedIn, getUser } from './api/client.js';
import { MODULES, userPerms, homePath } from './modules.js';
import LoginPage from './pages/Login.jsx';
import RegistrationPage from './pages/Registration.jsx';
import ConsultationPage from './pages/Consultation.jsx';
import PaymentPage from './pages/Payment.jsx';
import PharmacyPage from './pages/Pharmacy.jsx';
import LabPage from './pages/Lab.jsx';
import SettingsPage from './pages/Settings.jsx';
import StatsPage from './pages/Stats.jsx';

function requiredPerm(path) {
  var m = MODULES.filter(function (x) { return x.path === path; })[0];
  return m ? m.perm : null;
}

function AuthGuard(props) {
  var location = useLocation();
  if (!isLoggedIn()) return <Navigate to="/login" state={{ from: location }} replace />;
  var user = getUser();
  var need = requiredPerm(location.pathname);
  if (need && userPerms(user).indexOf(need) < 0) {
    return <Navigate to={homePath(user)} replace />;
  }
  return props.children;
}

function HomeRedirect() {
  if (!isLoggedIn()) return <Navigate to="/login" replace />;
  return <Navigate to={homePath(getUser())} replace />;
}

export default function App() {
  return (
    <LangProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<HomeRedirect />} />
          <Route path="/registration" element={<AuthGuard><RegistrationPage /></AuthGuard>} />
          <Route path="/consultation" element={<AuthGuard><ConsultationPage /></AuthGuard>} />
          <Route path="/payment" element={<AuthGuard><PaymentPage /></AuthGuard>} />
          <Route path="/pharmacy" element={<AuthGuard><PharmacyPage /></AuthGuard>} />
          <Route path="/lab" element={<AuthGuard><LabPage /></AuthGuard>} />
          <Route path="/settings" element={<AuthGuard><SettingsPage /></AuthGuard>} />
          <Route path="/stats" element={<AuthGuard><StatsPage /></AuthGuard>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </LangProvider>
  );
}
