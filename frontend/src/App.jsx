import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProjectProvider } from './contexts/ProjectContext';
import { PublicRoute, PrivateRoute, AdminRoute } from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import RegisterUser from './pages/RegisterUser';
import Profile from './pages/Profile';
import ChangePassword from './pages/ChangePassword';
import MyProjects from './pages/MyProjects';
import UploadProject from './pages/UploadProject';
import ProjectDetail from './pages/ProjectDetail';
import GeomapDashboard from './pages/GeomapDashboard';
import Reports from './pages/Reports';
import KHSMaster from './pages/KHSMaster';
import AuditLogs from './pages/AuditLogs';

function App() {
  return (
    <AuthProvider>
      <ProjectProvider>
        <BrowserRouter>
        <Routes>
          <Route
            path="/login"
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            }
          />

          <Route
            path="/"
            element={
              <PrivateRoute>
                <Layout />
              </PrivateRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="profile" element={<Profile />} />
            <Route path="change-password" element={<ChangePassword />} />
            <Route path="my-projects" element={<MyProjects />} />
            <Route path="upload-project" element={<UploadProject />} />
            <Route path="projects/:id" element={<ProjectDetail />} />
            <Route path="geomap" element={<GeomapDashboard />} />
            <Route path="reports" element={<Reports />} />
            <Route path="khs-master" element={<KHSMaster />} />
          </Route>

            <Route
              path="/users"
              element={
                <AdminRoute>
                  <Layout />
                </AdminRoute>
              }
            >
              <Route index element={<Users />} />
              <Route path=":id" element={<RegisterUser />} />
            </Route>

            <Route
              path="/audit-logs"
              element={
                <AdminRoute>
                  <Layout />
                </AdminRoute>
              }
            >
              <Route index element={<AuditLogs />} />
            </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </ProjectProvider>
    </AuthProvider>
  );
}

export default App;
