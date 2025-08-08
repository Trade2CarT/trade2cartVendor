// src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './index.css';

// Import your page components
import LoginPage from './pages/LoginPage';
import OtpPage from './pages/OtpPage';
import RegisterForm from './pages/RegisterForm';
import Dashboard from './pages/Dashboard';
import Process from './pages/Process';

const App = () => {
    return (
        <Router>
            <ToastContainer position="top-center" autoClose={3000} />
            <Routes>
                <Route path="/" element={<LoginPage />} />
                <Route path="/otp" element={<OtpPage />} />
                <Route path="/register" element={<RegisterForm />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/process" element={<Process />} />
            </Routes>
        </Router>
    );
};

export default App;