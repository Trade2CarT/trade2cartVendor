import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { auth } from '../firebase';
import logo from '../assets/images/logo.PNG';
import SEO from '../components/SEO';
import Loader from './Loader';

const LoaderOverlay = () => (
    <div className="absolute inset-0 bg-white bg-opacity-80 flex items-center justify-center rounded-2xl z-10 backdrop-blur-sm">
        <Loader />
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
                'callback': (response) => { }
            });
        }
    }, []);

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
            toast.error('Failed to send OTP. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <SEO title="Trade2Cart Vendor Login" description="Login to your Trade2Cart vendor account." />
            {/* --- ENHANCEMENT: Soft Branded Background Gradient --- */}
            <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-green-50 via-blue-50 to-teal-100 p-4">
                <div id="recaptcha-container"></div>

                <div className="w-full max-w-sm mx-auto bg-white/90 backdrop-blur-md p-8 rounded-3xl shadow-xl text-center relative border border-white">
                    {loading && <LoaderOverlay />}

                    <img src={logo} alt="Trade2Cart Logo" className="w-24 h-24 mx-auto mb-6 drop-shadow-sm" />
                    <h2 className="text-3xl font-extrabold text-gray-800">Welcome Back</h2>
                    <p className="text-gray-500 mt-2 mb-8">Enter your phone number to continue as a partner.</p>

                    <div className="relative group">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-gray-500 font-medium">+91</span>
                        <input
                            type="tel"
                            maxLength="10"
                            placeholder="Mobile number"
                            className="w-full pl-12 pr-4 py-3.5 bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 focus:bg-white transition-all text-lg font-medium tracking-wide"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                        />
                    </div>

                    <button
                        onClick={handleGetOtp}
                        disabled={loading}
                        className="w-full mt-8 py-3.5 bg-gradient-to-r from-green-500 to-teal-600 text-white font-bold text-lg rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all disabled:opacity-70 disabled:scale-100"
                    >
                        {loading ? 'Sending OTP...' : 'Get OTP'}
                    </button>
                </div>
            </div>
        </>
    );
};

export default LoginPage;