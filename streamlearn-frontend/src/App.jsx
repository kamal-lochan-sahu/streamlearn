import React, { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import Loader from './components/common/Loader'

// ── Lazy load all pages ───────────────────────────────
// Auth
const Login            = lazy(() => import('./pages/auth/Login'))
const Register         = lazy(() => import('./pages/auth/Register'))
const Onboarding       = lazy(() => import('./pages/auth/Onboarding'))
const ProfileSelect    = lazy(() => import('./pages/auth/ProfileSelect'))
// Viewer
const Home             = lazy(() => import('./pages/viewer/Home'))
const Browse           = lazy(() => import('./pages/viewer/Browse'))
const Search           = lazy(() => import('./pages/viewer/Search'))
const ContentDetail    = lazy(() => import('./pages/viewer/ContentDetail'))
const Watch            = lazy(() => import('./pages/viewer/Watch'))
const LiveList         = lazy(() => import('./pages/viewer/Live'))
const LiveWatch        = lazy(() => import('./pages/viewer/LiveWatch'))
const Watchlist        = lazy(() => import('./pages/viewer/Watchlist'))
const Profile          = lazy(() => import('./pages/viewer/Profile'))
const Subscription     = lazy(() => import('./pages/viewer/Subscription'))
const Notifications    = lazy(() => import('./pages/viewer/Notifications'))
const WatchParty       = lazy(() => import('./pages/viewer/WatchParty'))
const Downloads        = lazy(() => import('./pages/viewer/Downloads'))
const PaymentHistory   = lazy(() => import('./pages/viewer/PaymentHistory'))
// Education
const MyCourses        = lazy(() => import('./pages/education/MyCourses'))
const CourseLearn      = lazy(() => import('./pages/education/CourseLearn'))
const Doubts           = lazy(() => import('./pages/education/Doubts'))
const Assignments      = lazy(() => import('./pages/education/Assignments'))
const Performance      = lazy(() => import('./pages/education/Performance'))
const Certificates     = lazy(() => import('./pages/education/Certificates'))
// Admin
const AdminDashboard   = lazy(() => import('./pages/admin/Dashboard'))
const AdminContents    = lazy(() => import('./pages/admin/Contents'))
const AdminUsers       = lazy(() => import('./pages/admin/Users'))
const AdminAnalytics   = lazy(() => import('./pages/admin/Analytics'))
const AdminSettings    = lazy(() => import('./pages/admin/Settings'))
const AdminPlans       = lazy(() => import('./pages/admin/Plans'))
const AdminTransactions= lazy(() => import('./pages/admin/Transactions'))

// ── Route guards ──────────────────────────────────────
const PrivateRoute = ({ children }) => {
  const { isAuthenticated } = useAuthStore()
  return isAuthenticated ? children : <Navigate to="/login" replace/>
}

const AdminRoute = ({ children }) => {
  const { user } = useAuthStore()
  return ['owner','admin'].includes(user?.role) ? children : <Navigate to="/" replace/>
}

const PublicRoute = ({ children }) => {
  const { isAuthenticated } = useAuthStore()
  return !isAuthenticated ? children : <Navigate to="/" replace/>
}

export default function App() {
  return (
    <Suspense fallback={<Loader fullScreen/>}>
      <Routes>
        {/* ── Public auth ─── */}
        <Route path="/login"    element={<PublicRoute><Login/></PublicRoute>}/>
        <Route path="/register" element={<PublicRoute><Register/></PublicRoute>}/>

        {/* ── Onboarding (after register) ─── */}
        <Route path="/onboarding" element={<PrivateRoute><Onboarding/></PrivateRoute>}/>
        <Route path="/profiles"   element={<PrivateRoute><ProfileSelect/></PrivateRoute>}/>

        {/* ── Viewer ─── */}
        <Route path="/"                    element={<PrivateRoute><Home/></PrivateRoute>}/>
        <Route path="/browse"              element={<PrivateRoute><Browse/></PrivateRoute>}/>
        <Route path="/search"              element={<PrivateRoute><Search/></PrivateRoute>}/>
        <Route path="/watch/:slug"         element={<PrivateRoute><ContentDetail/></PrivateRoute>}/>
        <Route path="/player/:id"          element={<PrivateRoute><Watch/></PrivateRoute>}/>
        <Route path="/live"                element={<PrivateRoute><LiveList/></PrivateRoute>}/>
        <Route path="/live/:id"            element={<PrivateRoute><LiveWatch/></PrivateRoute>}/>
        <Route path="/watchlist"           element={<PrivateRoute><Watchlist/></PrivateRoute>}/>
        <Route path="/profile"             element={<PrivateRoute><Profile/></PrivateRoute>}/>
        <Route path="/subscription"        element={<PrivateRoute><Subscription/></PrivateRoute>}/>
        <Route path="/notifications"       element={<PrivateRoute><Notifications/></PrivateRoute>}/>
        <Route path="/watch-party/:id"     element={<PrivateRoute><WatchParty/></PrivateRoute>}/>
        <Route path="/downloads"           element={<PrivateRoute><Downloads/></PrivateRoute>}/>
        <Route path="/payment-history"     element={<PrivateRoute><PaymentHistory/></PrivateRoute>}/>

        {/* ── Education ─── */}
        <Route path="/my-courses"           element={<PrivateRoute><MyCourses/></PrivateRoute>}/>
        <Route path="/learn/:courseId/:lectureId?" element={<PrivateRoute><CourseLearn/></PrivateRoute>}/>
        <Route path="/doubts"               element={<PrivateRoute><Doubts/></PrivateRoute>}/>
        <Route path="/assignments"          element={<PrivateRoute><Assignments/></PrivateRoute>}/>
        <Route path="/performance"          element={<PrivateRoute><Performance/></PrivateRoute>}/>
        <Route path="/certificates"         element={<PrivateRoute><Certificates/></PrivateRoute>}/>

        {/* ── Admin ─── */}
        <Route path="/admin"                element={<AdminRoute><AdminDashboard/></AdminRoute>}/>
        <Route path="/admin/content"        element={<AdminRoute><AdminContents/></AdminRoute>}/>
        <Route path="/admin/users"          element={<AdminRoute><AdminUsers/></AdminRoute>}/>
        <Route path="/admin/analytics"      element={<AdminRoute><AdminAnalytics/></AdminRoute>}/>
        <Route path="/admin/settings"       element={<AdminRoute><AdminSettings/></AdminRoute>}/>
        <Route path="/admin/plans"          element={<AdminRoute><AdminPlans/></AdminRoute>}/>
        <Route path="/admin/transactions"   element={<AdminRoute><AdminTransactions/></AdminRoute>}/>

        {/* ── 404 ─── */}
        <Route path="*" element={<Navigate to="/" replace/>}/>
      </Routes>
    </Suspense>
  )
}
