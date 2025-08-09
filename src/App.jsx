import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Toaster, toast } from 'react-hot-toast';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './firebase'; // Make sure this path is correct

// --- Import Pages ---
import LoginPage from './pages/LoginPage';
import OtpPage from './pages/OtpPage';
import Dashboard from './pages/Dashboard';
import RegisterForm from './pages/RegisterForm';
import Process from './pages/Process';


// --- Loading Spinner Component ---
const Spinner = () => (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-blue-600"></div>
        <p className="ml-4 text-lg text-gray-700">Loading...</p>
    </div>
);

// --- Protected Routes (For logged-in vendors) ---
const ProtectedRoute = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // onAuthStateChanged returns an unsubscribe function
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setIsAuthenticated(!!user);
            setLoading(false);
        });
        // Cleanup subscription on unmount
        return () => unsubscribe();
    }, []);

    if (loading) {
        return <Spinner />;
    }

    return isAuthenticated ? <Outlet /> : <Navigate to="/" replace />;
};


// --- Main App Component ---
function App() {

    const handleSignOut = () => {
        signOut(auth)
            .then(() => {
                toast.success("Signed out successfully!");
                // The onAuthStateChanged listener will handle navigation automatically
            })
            .catch((error) => {
                toast.error("Failed to sign out.");
                console.error("Sign Out Error:", error);
            });
    };

    return (
        <>
            <Toaster position="top-center" reverseOrder={false} />
            <Router>
                <Routes>
                    {/* Public Routes */}
                    <Route path="/" element={<LoginPage />} />
                    <Route path="/otp" element={<OtpPage />} />

                    {/* Protected Routes */}
                    <Route element={<ProtectedRoute />}>
                        <Route path="/dashboard" element={<Dashboard handleSignOut={handleSignOut} />} />
                        <Route path="/register" element={<RegisterForm />} />
                        <Route path="/process/:assignmentId" element={<Process />} />
                    </Route>

                    {/* Fallback Redirect */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </Router>
        </>
    );
}

export default App;
