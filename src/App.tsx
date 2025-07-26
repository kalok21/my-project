import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import './App.css'

// 頁面元件
import LoginPage from './pages/LoginPage.tsx'
import Dashboard from './pages/Dashboard.tsx'
import AccountingApp from './pages/AccountingApp.tsx'
import Calendar from './pages/Calendar.tsx'
import DocumentEditor from './pages/DocumentEditor.tsx'
import DiaryEditor from './pages/DiaryEditor.tsx'
import TestPage from './pages/TestPage.tsx'
import UserProfilePage from './pages/UserProfilePage.tsx'

// 認證 Context
import { AuthProvider, useAuth } from './contexts/AuthContext.tsx'

// 受保護的路由元件
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen starry-bg">
        <div className="relative">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-white/20 border-t-white/80"></div>
          <div className="absolute inset-0 animate-pulse">
            <div className="h-16 w-16 rounded-full bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 opacity-30 blur-sm"></div>
          </div>
        </div>
      </div>
    )
  }
  
  return user ? <>{children}</> : <Navigate to="/login" />
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-50 scrollbar-custom transform-gpu">
          <Routes>
            {/* 登入頁 */}
            <Route path="/login" element={<LoginPage />} />
            
            {/* 測試頁面 */}
            <Route path="/test" element={
              <ProtectedRoute>
                <TestPage />
              </ProtectedRoute>
            } />
            
            {/* 受保護的路由 */}
            <Route path="/" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            
            <Route path="/accounting" element={
              <ProtectedRoute>
                <AccountingApp />
              </ProtectedRoute>
            } />
            
            <Route path="/calendar" element={
              <ProtectedRoute>
                <Calendar />
              </ProtectedRoute>
            } />
            
            <Route path="/documents" element={
              <ProtectedRoute>
                <DocumentEditor />
              </ProtectedRoute>
            } />
            
            <Route path="/diary" element={
              <ProtectedRoute>
                <DiaryEditor />
              </ProtectedRoute>
            } />
            
            <Route path="/profile" element={
              <ProtectedRoute>
                <UserProfilePage />
              </ProtectedRoute>
            } />
            
            {/* 快速代碼跳轉 */}
            <Route path="/quick/:code" element={
              <ProtectedRoute>
                <DocumentEditor />
              </ProtectedRoute>
            } />
            
            {/* 預設重定向 */}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  )
}

export default App