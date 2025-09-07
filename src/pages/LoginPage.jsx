import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { auth } from '../firebase';
import logo from '../assets/images/logo.PNG';
import SEO from '../components/SEO';
import Loader from './Loader';
// import Loader from '../components/Loader';

// A new component to display the loader as an overlay
const LoaderOverlay = () => (
    <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-2xl z-10">
        <Loader />
    </div>
);


const LoginPage = () => {
    const [phone, setPhone] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    // This useEffect now runs only once when the component mounts
    useEffect(() => {
        if (!window.recaptchaVerifier) {
            window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
                'size': 'invisible',
                'callback': (response) => {
                    // reCAPTCHA solved.
                }
            });
        }
    }, []); // Empty dependency array ensures this runs only once

    const handleGetOtp = async () => {
        if (phone.length !== 10) {
            return toast.error('Please enter a valid 10-digit mobile number.');
        }
        setLoading(true);

        try {
            const verifier = window.recaptchaVerifier;
            const fullPhoneNumber = `+91${phone}`;
            const confirmationResult = await signInWithPhoneNumber(auth, fullPhoneNumber, verifier);

            window.confirmationResult = confirmationResult;
            toast.success('OTP sent successfully!');
            navigate('/otp', { state: { phone } });

        } catch (error) {
            console.error('Error sending OTP:', error);
            toast.error('Failed to send OTP. Please refresh the page and try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <SEO
                title="Trade2Cart Vendor Login"
                description="Login to your Trade2Cart vendor account to manage scrap pickup leads and connect with customers."
            />
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
                {/* This container MUST remain in the DOM at all times for reCAPTCHA */}
                <div id="recaptcha-container"></div>

                <div className="w-full max-w-sm mx-auto bg-white p-8 rounded-2xl shadow-lg text-center relative">
                    {/* The loader is now an overlay and does not remove the form */}
                    {loading && <LoaderOverlay />}

                    <img src={logo} alt="Trade2Cart Logo" className="w-20 h-20 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-gray-800">Partner Login</h2>
                    <p className="text-gray-500 mt-2 mb-6">Enter your phone number to continue.</p>

                    <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">+91</span>
                        <input
                            type="tel"
                            maxLength="10"
                            placeholder="10-digit mobile number"
                            className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                        />
                    </div>

                    <button
                        onClick={handleGetOtp}
                        disabled={loading}
                        className="w-full mt-6 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-transform transform hover:scale-105 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Sending OTP...' : 'Get OTP'}
                    </button>
                </div>
            </div>
        </>
    );
};

export default LoginPage;

