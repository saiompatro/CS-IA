import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './AuthContext.jsx'
import PrivateRoute from './components/PrivateRoute'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import AdminPage from './pages/AdminPage'
import ChatPage from './pages/ChatPage'
import UserProfile from './pages/UserProfile'
import CountryPage from './pages/CountryPage'
import ClientPage from './pages/ClientPage'
import CalendarPage from './pages/CalendarPage'
import EmployeeDetailPage from './pages/EmployeeDetailPage'
import ProjectsPage from './pages/ProjectsPage'
import FinancesPage from './pages/FinancesPage'
import Login from './pages/Login'
import Signup from './pages/Signup'

// Main application component that handles routing and authentication state
function App() {
  console.log('App component rendering...');
  
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route
            path="/"
            element={
              <PrivateRoute>
                <Layout />
              </PrivateRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="admin" element={<AdminPage />} />
            <Route path="chat" element={<ChatPage />} />
            <Route path="profile" element={<UserProfile />} />
            <Route path="calendar" element={<CalendarPage />} />
            <Route path="employee/:employeeId" element={<EmployeeDetailPage />} />
            <Route path="projects" element={<ProjectsPage />} />
            <Route path="finances" element={<FinancesPage />} />
            <Route path="countries/:countryName" element={<CountryPage />} />
            <Route path="clients/:clientId" element={<ClientPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
