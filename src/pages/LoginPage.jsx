import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { auth } from '../firebase';
import logo from '../assets/images/logo.PNG';
import SEO from '../components/SEO';
import Loader from './Loader';

const LoaderOverlay = () => (
    <div className="absolute inset-0 bg-white bg-opacity-90 flex flex-col items-center justify-center rounded-3xl z-10 backdrop-blur-sm">
        <Loader />
        <p className="mt-4 font-extrabold text-xl text-gray-800">Please wait...</p>
    </div>
);

const LoginPage = () => {
    const [phone, setPhone] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        if (!window.recaptchaVerifier) {
            window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
                'size': 'invisible',
            });
        }
    }, []);

    const handleGetOtp = async () => {
        if (phone.length !== 10) return toast.error('Please enter a valid 10-digit mobile number.');
        setLoading(true);

        try {
            const verifier = window.recaptchaVerifier;
            const fullPhoneNumber = `+91${phone}`;
            const confirmationResult = await signInWithPhoneNumber(auth, fullPhoneNumber, verifier);
            window.confirmationResult = confirmationResult;
            toast.success('OTP sent successfully!');
            navigate('/otp', { state: { phone } });
        } catch (error) {
            toast.error('Failed to send OTP. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <SEO title="Trade2Cart Vendor Login" />
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
                <div id="recaptcha-container"></div>

                <div className="w-full max-w-sm mx-auto bg-white p-8 rounded-3xl shadow-xl text-center relative border border-gray-100">
                    {loading && <LoaderOverlay />}

                    <img src={logo} alt="Trade2Cart Logo" className="w-24 h-24 mx-auto mb-6" />
                    <h2 className="text-3xl font-extrabold text-gray-900">Partner Login</h2>
                    <p className="text-gray-600 font-medium mt-2 mb-8">Enter your mobile number to continue.</p>

                    <div className="relative group flex items-center mb-6">
                        <span className="absolute left-4 text-gray-800 font-extrabold text-xl">+91</span>
                        {/* --- ENHANCEMENT 3: Smart Keypad --- */}
                        <input
                            type="tel"
                            inputMode="numeric"
                            autoComplete="tel"
                            maxLength="10"
                            placeholder="Mobile Number"
                            className="w-full pl-16 pr-4 py-4 bg-gray-100 border-2 border-gray-200 rounded-xl focus:ring-0 focus:border-blue-600 focus:bg-white text-2xl font-extrabold text-gray-900 tracking-wider"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                        />
                    </div>

                    <button
                        onClick={handleGetOtp}
                        disabled={loading}
                        className="w-full py-4 bg-blue-600 text-white font-extrabold text-xl rounded-xl shadow-lg active:scale-95 transition-transform disabled:opacity-70"
                    >
                        Get OTP
                    </button>
                </div>
            </div>
        </>
    );
};

export default LoginPage;