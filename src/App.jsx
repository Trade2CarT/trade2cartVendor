import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Toaster, toast } from 'react-hot-toast';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, db } from './firebase';
import { ref, get, query, orderByChild, equalTo } from 'firebase/database';


// --- Import Components ---
import Header from './components/Header';
import Footer from './components/Footer';
import Loader from './components/Loader';

// --- Import Pages ---
import LoginPage from './pages/LoginPage';
import OtpPage from './pages/OtpPage';
import Dashboard from './pages/Dashboard';
import RegisterForm from './pages/RegisterForm';
import Process from './pages/Process';
import AccountPage from './pages/AccountPage';

// --- Protected Routes (For logged-in vendors) ---
const ProtectedRoute = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);
    const [vendor, setVendor] = useState(null);


    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                setIsAuthenticated(true);
                // Fetch vendor data to pass to header
                try {
                    const vendorQuery = query(ref(db, 'vendors'), orderByChild('phone'), equalTo(user.phoneNumber));
                    const snapshot = await get(vendorQuery);
                    if (snapshot.exists()) {
                        setVendor(Object.values(snapshot.val())[0]);
                    }
                } catch (e) {
                    console.error("Could not fetch vendor data for header");
                }
            } else {
                setIsAuthenticated(false);
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    if (loading) {
        return <Loader fullscreen />;
    }

    return isAuthenticated ? (
        <div className="flex flex-col min-h-screen bg-gray-50">
            <Header vendor={vendor} />
            <main className="flex-grow">
                <Outlet />
            </main>
            <Footer />
        </div>
    ) : (
        <Navigate to="/" replace />
    );
};


// --- Main App Component ---
function App() {
    return (
        <>
            <Toaster position="top-center" reverseOrder={false} />
            <Router>
                <Routes>
                    {/* Public Routes */}
                    <Route path="/" element={<LoginPage />} />
                    <Route path="/otp" element={<OtpPage />} />
                    <Route path="/register" element={<RegisterForm />} />


                    {/* Protected Routes */}
                    <Route element={<ProtectedRoute />}>
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/account" element={<AccountPage />} />
                        <Route path="/process/:assignmentId" element={<Process />} />
                    </Route>

                    {/* Fallback Redirect */}
                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
            </Router>
        </>
    );
}

export default App;

