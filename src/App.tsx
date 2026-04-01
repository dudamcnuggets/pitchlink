import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import ApplicationsPage from './pages/ApplicationsPage'
import CompleteProfilePage from './pages/CompleteProfilePage'
import ForYouPage from './pages/ForYouPage'
import HomePage from './pages/HomePage'
import ListingsPage from './pages/ListingsPage'
import LoginPage from './pages/LoginPage'
import ProfilePage from './pages/ProfilePage'
import SignupPage from './pages/SignupPage'
import TeamsPage from './pages/TeamsPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/complete-profile" element={<CompleteProfilePage />} />
        <Route path="/teams" element={<TeamsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/listings" element={<ListingsPage />} />
        <Route path="/for-you" element={<ForYouPage />} />
        <Route path="/applications" element={<ApplicationsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
