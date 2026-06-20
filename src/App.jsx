import React, { useState, useEffect, createContext, useContext, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet, Link, useLocation } from 'react-router-dom';
import { Toaster, toast } from 'react-hot-toast';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { ref, get } from 'firebase/database';
import { auth, db } from './firebase.js';
import BillingPage from './pages/BillingPage.jsx';
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
import HistoryPage from './pages/HistoryPage.jsx';
import { FaHome, FaUser, FaHistory } from 'react-icons/fa';

const VendorContext = createContext(null);
export const useVendor = () => useContext(VendorContext);

const AuthChecker = () => {
    const [destination, setDestination] = useState(null);
    const location = useLocation();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (!currentUser) {
                setDestination("/login");
                return;
            }
            try {
                const vendorRef = ref(db, `vendors/${currentUser.uid}`);
                const snapshot = await get(vendorRef);
                if (snapshot.exists()) {
                    const vendor = snapshot.val();
                    if (vendor.status === "approved") {
                        // Allow them to stay on their current path if it's a valid protected route
                        if (location.pathname.startsWith('/process/')) {
                            setDestination(location.pathname);
                        } else {
                            setDestination("/dashboard");
                        }
                    } else {
                        setDestination("/pending");
                    }
                } else {
                    setDestination("/register");
                }
            } catch (error) {
                toast.error("Could not verify registration status.");
                setDestination("/login");
            }
        });
        return () => unsubscribe();
    }, [location.pathname]);

    if (!destination) return <Loader fullscreen />;
    if (destination === location.pathname) return <Outlet />;
    return <Navigate to={destination} replace />;
};

const BottomNav = () => {
    const location = useLocation();
    const navItems = [
        { path: '/dashboard', icon: <FaHome size={24} />, label: 'Home' },
        { path: '/history', icon: <FaHistory size={24} />, label: 'History' },
        { path: '/account', icon: <FaUser size={24} />, label: 'Profile' },
        
    ];

    return (
        <nav className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-50 md:hidden pb-safe">
            <div className="flex justify-around items-center h-16">
                {navItems.map((item) => {
                    const isActive = location.pathname.startsWith(item.path);
                    return (
                        <Link key={item.path} to={item.path} className={`flex flex-col items-center justify-center w-full h-full transition-colors ${isActive ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}>
                            {item.icon}
                            <span className="text-[10px] font-bold mt-1">{item.label}</span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
};

const ProtectedRoute = ({ handleSignOut, hasLayout = true, installPrompt }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [vendor, setVendor] = useState(null);
    const [loading, setLoading] = useState(true);
    const location = useLocation();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                setIsAuthenticated(true);
                try {
                    const vendorRef = ref(db, `vendors/${user.uid}`);
                    const snapshot = await get(vendorRef);
                    if (snapshot.exists()) setVendor(snapshot.val());
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

    const contextValue = useMemo(() => ({ vendor, installPrompt }), [vendor, installPrompt]);

    if (loading) return <Loader fullscreen />;
    if (!isAuthenticated) return <Navigate to="/login" replace />;

    if (!vendor) {
        if (location.pathname !== '/register') return <Navigate to="/register" replace />;
    } else {
        if (vendor.status !== 'approved') {
            if (location.pathname !== '/pending') return <Navigate to="/pending" replace />;
        }
    }

    return (
        <VendorContext.Provider value={contextValue}>
            {hasLayout ? (
                <div className="flex flex-col min-h-screen">
                    <Header handleSignOut={handleSignOut} />
                    <main className="flex-grow pb-24 md:pb-8">
                        <Outlet />
                    </main>
                    <BottomNav />
                </div>
            ) : (
                <Outlet />
            )}
        </VendorContext.Provider>
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

    if (loading) return <Loader fullscreen />;
    return isAuthenticated ? <Navigate to="/dashboard" replace /> : <Outlet />;
};

function App() {
    const [installPrompt, setInstallPrompt] = useState(null);

    useEffect(() => {
        const handler = (e) => {
            e.preventDefault();
            setInstallPrompt(e);
        };
        window.addEventListener('beforeinstallprompt', handler);
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

                    <Route element={<PublicRoute />}>
                        <Route path="/login" element={<LoginPage />} />
                        <Route path="/otp" element={<OtpPage />} />
                    </Route>

                    <Route element={<ProtectedRoute installPrompt={installPrompt} handleSignOut={handleSignOut} />}>
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/process/:assignmentId" element={<Process />} />
                        <Route path="/history" element={<HistoryPage />} />
                        <Route path="/account" element={<AccountPage />} />
                        <Route path="/billing/:assignmentId" element={<BillingPage />} />
                    </Route>

                    <Route element={<ProtectedRoute installPrompt={installPrompt} hasLayout={false} />}>
                        <Route path="/register" element={<RegisterForm />} />
                        <Route path="/pending" element={<PendingPage />} />
                    </Route>

                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </Router>
        </>
    );
}

export default App;