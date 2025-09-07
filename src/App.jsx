import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Toaster, toast } from 'react-hot-toast';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { ref, get } from 'firebase/database';
import { auth, db } from './firebase';

// --- Import Components ---
import Header from './components/Header';
import Footer from './components/Footer';
// import Loader from './components/Loader';


// --- Import Pages ---
import LoginPage from './pages/LoginPage';
import OtpPage from './pages/OtpPage';
import Dashboard from './pages/Dashboard';
import RegisterForm from './pages/RegisterForm';
import Process from './pages/Process';
import AccountPage from './pages/AccountPage';
import Loader from './pages/Loader';

// --- Auth State Checker ---
// This component determines where to send the user based on their login and registration status.
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
const ProtectedRoute = ({ handleSignOut }) => {
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

    return isAuthenticated ? (
        <div className="flex flex-col min-h-screen">
            <Header handleSignOut={handleSignOut} />
            <main className="flex-grow">
                <Outlet />
            </main>
            <Footer />
        </div>
    ) : (
        <Navigate to="/login" replace />
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

                    {/* Protected Routes: Only accessible when logged in */}
                    <Route element={<ProtectedRoute handleSignOut={handleSignOut} />}>
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/register" element={<RegisterForm />} />
                        <Route path="/process/:assignmentId" element={<Process />} />
                        <Route path="/account" element={<AccountPage />} />
                    </Route>
                </Routes>
            </Router>
        </>
    );
}

export default App;

