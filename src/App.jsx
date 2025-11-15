import React, { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Toaster, toast } from 'react-hot-toast';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { ref, get } from 'firebase/database';
import { auth, db } from './firebase.js';

import Header from './components/Header.jsx';
import Footer from './components/Footer.jsx';
import Loader from './pages/Loader';
import LoginPage from './pages/LoginPage.jsx';
import OtpPage from './pages/OtpPage.jsx';
import Dashboard from './pages/Dashboard.jsx';
import RegisterForm from './pages/RegisterForm.jsx';
import Process from './pages/Process.jsx';
import AccountPage from './pages/AccountPage.jsx';


// ---------------------------
// CONTEXT
// ---------------------------
const VendorContext = createContext(null);
export const useVendor = () => useContext(VendorContext);


// ---------------------------
// AUTH CHECKER (Main redirect on root /)
// ---------------------------
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

    if (loading) return <Loader fullscreen />;
    if (!user) return <Navigate to="/login" replace />;

    return isRegistered ? <Navigate to="/dashboard" replace /> : <Navigate to="/register" replace />;
};


// ---------------------------
// PROTECTED ROUTE (Final fixed version)
// ---------------------------
const ProtectedRoute = ({ handleSignOut, hasLayout = true }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [vendor, setVendor] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                setIsAuthenticated(true);

                try {
                    const vendorRef = ref(db, `vendors/${user.uid}`);
                    const snapshot = await get(vendorRef);

                    if (snapshot.exists()) {
                        setVendor(snapshot.val());
                    }
                } catch (error) {
                    console.error("Firebase fetch error:", error);
                }
            } else {
                setIsAuthenticated(false);
            }

            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    if (loading) return <Loader fullscreen />;

    // If not logged in → redirect to login
    if (!isAuthenticated) return <Navigate to="/login" replace />;

    // --------------------------
    // URL VALIDATION PROTECTION
    // --------------------------
    const path = window.location.pathname;

    const allowedPaths = [
        "/dashboard",
        "/account",
        "/register"
    ];

    const isProcessRoute = path.startsWith("/process/");

    const isAllowed = allowedPaths.includes(path) || isProcessRoute;

    // If logged in but tries wrong URL → redirect properly
    if (!isAllowed) {
        return vendor
            ? <Navigate to="/dashboard" replace />
            : <Navigate to="/register" replace />;
    }

    // ------------------------------
    // If everything good → show layout/pages
    // ------------------------------
    return (
        <VendorContext.Provider value={vendor}>
            {hasLayout ? (
                <div className="flex flex-col min-h-screen">
                    <Header handleSignOut={handleSignOut} />
                    <main className="flex-grow pb-20">
                        <Outlet />
                    </main>
                    <Footer />
                </div>
            ) : (
                <Outlet />
            )}
        </VendorContext.Provider>
    );
};


// ---------------------------
// PUBLIC ROUTE
// ---------------------------
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

    if (loading) return <Loader fullscreen />;

    return isAuthenticated ? <Navigate to="/dashboard" replace /> : <Outlet />;
};


// ---------------------------
// MAIN APP
// ---------------------------
function App() {
    const handleSignOut = () => {
        signOut(auth).catch(() => toast.error("Failed to sign out."));
    };

    return (
        <>
            <Toaster position="top-center" reverseOrder={false} />

            <Router>
                <Routes>
                    <Route path="/" element={<AuthChecker />} />

                    {/* Public: Login & OTP */}
                    <Route element={<PublicRoute />}>
                        <Route path="/login" element={<LoginPage />} />
                        <Route path="/otp" element={<OtpPage />} />
                    </Route>

                    {/* Protected Pages */}
                    <Route element={<ProtectedRoute handleSignOut={handleSignOut} />}>
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/process/:assignmentId" element={<Process />} />
                        <Route path="/account" element={<AccountPage />} />
                    </Route>

                    {/* Registration page (no layout) */}
                    <Route element={<ProtectedRoute hasLayout={false} />}>
                        <Route path="/register" element={<RegisterForm />} />
                    </Route>

                    {/* Catch all invalid routes */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </Router>
        </>
    );
}

export default App;
