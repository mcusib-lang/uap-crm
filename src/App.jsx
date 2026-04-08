import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import CRM from './pages/CRM'
import ContactDetail from './pages/ContactDetail'
import Proyectos from './pages/Proyectos'
import ProyectoDetail from './pages/ProyectoDetail'
import Materiales from './pages/Materiales'
import Layout from './components/Layout'

function ProtectedRoute({ children }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return children
}

function AppRoutes() {
  const { user } = useAuth()

  return (
    <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to="/dashboard" replace /> : <Login />}
      />
      <Route path="/" element={<Navigate to={user ? '/dashboard' : '/login'} replace />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Layout><Dashboard /></Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/crm"
        element={
          <ProtectedRoute>
            <Layout><CRM /></Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/contacto/:id"
        element={
          <ProtectedRoute>
            <Layout><ContactDetail /></Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/proyectos"
        element={
          <ProtectedRoute>
            <Layout><Proyectos /></Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/proyectos/:id"
        element={
          <ProtectedRoute>
            <Layout><ProyectoDetail /></Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/materiales"
        element={
          <ProtectedRoute>
            <Layout><Materiales /></Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
