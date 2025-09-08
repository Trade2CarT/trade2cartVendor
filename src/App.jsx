import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Toaster, toast } from 'react-hot-toast';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { ref, get } from 'firebase/database';
import { auth, db } from './firebase.js';

// --- Import Components ---
import Header from './components/Header.jsx';
import Footer from './components/Footer.jsx';
import Loader from './pages/Loader';

// --- Import Pages ---
import LoginPage from './pages/LoginPage.jsx';
import OtpPage from './pages/OtpPage.jsx';
import Dashboard from './pages/Dashboard.jsx';
import RegisterForm from './pages/RegisterForm.jsx';
import Process from './pages/Process.jsx';
import AccountPage from './pages/AccountPage.jsx';

// --- Auth State Checker ---
const AuthChecker = () => {
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);
    const [isRegistered, setIsRegistered] = useState(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                try {
                    const vendorRef = ref(db, `vendors/${currentUser.uid}`);
                    const snapshot = await get(vendorRef);
                    setIsRegistered(snapshot.exists());
                } catch (error) {
                    toast.error("Could not verify registration status.");
                }
            }
            setUser(currentUser);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    if (loading) {
        return <Loader fullscreen />;
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    return isRegistered ? <Navigate to="/dashboard" replace /> : <Navigate to="/register" replace />;
};


// --- Route Wrappers ---
const ProtectedRoute = ({ handleSignOut, hasLayout = true }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setIsAuthenticated(!!user);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    if (loading) {
        return <Loader fullscreen />;
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    // Conditionally render the layout
    return hasLayout ? (
        <div className="flex flex-col min-h-screen">
            <Header handleSignOut={handleSignOut} />
            <main className="flex-grow pb-20"> {/* <-- THIS LINE IS UPDATED */}
                <Outlet />
            </main>
            <Footer />
        </div>
    ) : (
        <Outlet />
    );
};

const PublicRoute = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setIsAuthenticated(!!user);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    if (loading) {
        return <Loader fullscreen />;
    }

    return isAuthenticated ? <Navigate to="/dashboard" replace /> : <Outlet />;
};


// --- Main App Component ---
function App() {
    const handleSignOut = () => {
        signOut(auth).catch(error => toast.error("Failed to sign out."));
    };

    return (
        <>
            <Toaster position="top-center" reverseOrder={false} />
            <Router>
                <Routes>
                    <Route path="/" element={<AuthChecker />} />

                    {/* Public Routes: Only accessible when logged out */}
                    <Route element={<PublicRoute />}>
                        <Route path="/login" element={<LoginPage />} />
                        <Route path="/otp" element={<OtpPage />} />
                    </Route>

                    {/* Protected Routes */}
                    <Route element={<ProtectedRoute handleSignOut={handleSignOut} />}>
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/process/:assignmentId" element={<Process />} />
                        <Route path="/account" element={<AccountPage />} />
                    </Route>

                    {/* Registration route without the main layout */}
                    <Route element={<ProtectedRoute hasLayout={false} />}>
                        <Route path="/register" element={<RegisterForm />} />
                    </Route>

                </Routes>
            </Router>
        </>
    );
}

export default App;