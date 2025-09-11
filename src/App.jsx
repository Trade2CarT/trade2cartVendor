import React, { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Toaster, toast } from 'react-hot-toast';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { ref, get, query, orderByChild, equalTo } from 'firebase/database';
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

// --- Context to centrally manage vendor data ---
const VendorContext = createContext(null);
export const useVendor = () => useContext(VendorContext);

// --- Auth State Checker (Your original code) ---
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

// --- Updated ProtectedRoute to fetch data ---
const ProtectedRoute = ({ handleSignOut, hasLayout = true }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [vendor, setVendor] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                setIsAuthenticated(true);
                // Fetch vendor data here to make it available globally
                try {
                    const vendorQuery = query(ref(db, 'vendors'), orderByChild('phone'), equalTo(user.phoneNumber));
                    const snapshot = await get(vendorQuery);
                    if (snapshot.exists()) {
                        setVendor(Object.values(snapshot.val())[0]);
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
    if (!isAuthenticated) return <Navigate to="/login" replace />;

    // Provide vendor data to all child components (Header, Footer, Outlet)
    return (
        <VendorContext.Provider value={vendor}>
            {hasLayout ? (
                <div className="flex flex-col min-h-screen">
                    <Header handleSignOut={handleSignOut} />
                    <main className="flex-grow pb-20"> {/* Padding for fixed footer */}
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

// --- PublicRoute (Your original code) ---
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

// --- Main App Component (Your original code) ---
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

                    <Route element={<PublicRoute />}>
                        <Route path="/login" element={<LoginPage />} />
                        <Route path="/otp" element={<OtpPage />} />
                    </Route>

                    <Route element={<ProtectedRoute handleSignOut={handleSignOut} />}>
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/process/:assignmentId" element={<Process />} />
                        <Route path="/account" element={<AccountPage />} />
                    </Route>

                    <Route element={<ProtectedRoute hasLayout={false} />}>
                        <Route path="/register" element={<RegisterForm />} />
                    </Route>

                    {/* --- ADD THIS CATCH-ALL ROUTE --- */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </Router>
        </>
    );
}

export default App;