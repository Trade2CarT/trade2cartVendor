import React, { useState, useEffect, createContext, useContext, useMemo } from 'react';
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
import PendingPage from './pages/PendingPage';


// Context
const VendorContext = createContext(null);
// useVendor will now return an object: { vendor, installPrompt }
export const useVendor = () => useContext(VendorContext);


// ----------------------------------------------------
// AUTH CHECKER (initial page /)
// ----------------------------------------------------
const AuthChecker = () => {
    // We only need one state: where to go. null means "checking...".
    const [destination, setDestination] = useState(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (!currentUser) {
                // No user, send to login
                setDestination("/login");
                return;
            }

            // User is logged in, now check their registration status
            try {
                const vendorRef = ref(db, `vendors/${currentUser.uid}`);
                const snapshot = await get(vendorRef);

                if (snapshot.exists()) {
                    // Vendor is registered, check their status
                    const vendor = snapshot.val();
                    if (vendor.status === "approved") {
                        setDestination("/dashboard");
                    } else {
                        // Status is 'pending' or 'rejected'
                        setDestination("/pending");
                    }
                } else {
                    // User is logged in but has no vendor data
                    setDestination("/register");
                }
            } catch (error) {
                toast.error("Could not verify registration status.");
                setDestination("/login"); // On error, send back to login
            }
        });

        return () => unsubscribe();
    }, []); // The empty array [] ensures this runs only once on mount

    // While checking, show a loader
    if (!destination) {
        return <Loader fullscreen />;
    }

    // Once we have a destination, navigate there
    return <Navigate to={destination} replace />;
};


// ----------------------------------------------------
// PROTECTED ROUTE (MODIFIED)
// ----------------------------------------------------
const ProtectedRoute = ({ handleSignOut, hasLayout = true, installPrompt }) => { // <-- 1. Receive installPrompt
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
                        setVendor(snapshot.val());  // registered user
                    }
                } catch (error) {
                    console.error("Vendor fetch error:", error);
                }
            } else {
                setIsAuthenticated(false);
            }

            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // --- 2. Create a combined context value ---
    const contextValue = useMemo(() => ({
        vendor,
        installPrompt
    }), [vendor, installPrompt]);

    if (loading) return <Loader fullscreen />;
    if (!isAuthenticated) return <Navigate to="/login" replace />;

    // 🔥 NEW FIX: Unregistered users cannot access dashboard, process, account
    if (!vendor && hasLayout) return <Navigate to="/register" replace />;

    // 🔥 Already registered users should not access /register
    if (vendor && !hasLayout) return <Navigate to="/dashboard" replace />;

    return (
        // --- 3. Provide the new combined value ---
        <VendorContext.Provider value={contextValue}>
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



// ----------------------------------------------------
// PUBLIC ROUTE
// ----------------------------------------------------
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


// ----------------------------------------------------
// APP (MODIFIED)
// ----------------------------------------------------
function App() {
    // --- 1. Add installPrompt state here ---
    const [installPrompt, setInstallPrompt] = useState(null);

    // --- 2. Add listener effect here ---
    useEffect(() => {
        const handler = (e) => {
            // Prevent the mini-infobar from appearing on mobile
            e.preventDefault();
            // Save the event so it can be triggered later.
            console.log("Install prompt captured in App.jsx!"); // For debugging
            setInstallPrompt(e);
        };

        window.addEventListener('beforeinstallprompt', handler);

        // Cleanup
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleSignOut = () => {
        signOut(auth).catch(() => toast.error("Failed to sign out"));
    };

    return (
        <>
            <Toaster position="top-center" reverseOrder={false} />
            <Router>
                <Routes>
                    <Route path="/" element={<AuthChecker />} />

                    {/* Public Routes */}
                    <Route element={<PublicRoute />}>
                        <Route path="/login" element={<LoginPage />} />
                        <Route path="/otp" element={<OtpPage />} />
                    </Route>

                    {/* --- 3. Pass installPrompt as a prop --- */}
                    {/* Protected Routes - With header/footer */}
                    <Route element={<ProtectedRoute installPrompt={installPrompt} handleSignOut={handleSignOut} />}>
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/process/:assignmentId" element={<Process />} />
                        <Route path="/account" element={<AccountPage />} />
                    </Route>

                    {/* Protected Route for Register (no layout) */}
                    <Route element={<ProtectedRoute installPrompt={installPrompt} hasLayout={false} />}>
                        <Route path="/register" element={<RegisterForm />} />
                        <Route path="/pending" element={<PendingPage />} />
                    </Route>


                    {/* Fallback */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </Router>
        </>
    );
}

export default App;