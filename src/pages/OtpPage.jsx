import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { ref, get } from 'firebase/database';
import { auth, db } from '../firebase';
import logo from '../assets/images/logo.PNG';

const OtpPage = () => {
    const [otp, setOtp] = useState(new Array(6).fill(''));
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { state } = useLocation();
    const phone = state?.phone || '';
    const inputsRef = useRef([]);

    useEffect(() => {
        inputsRef.current[0]?.focus();
    }, []);

    const handleChange = (e, index) => {
        const { value } = e.target;
        if (isNaN(value)) return; // Only allow numbers

        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);

        // Move to next input if a digit is entered
        if (value && index < 5) {
            inputsRef.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (e, index) => {
        // Move to previous input on backspace if current input is empty
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            inputsRef.current[index - 1]?.focus();
        }
    };

    const handleSubmit = async () => {
        const enteredOtp = otp.join('');
        if (enteredOtp.length !== 6) {
            return toast.error('Please enter the 6-digit OTP.');
        }
        setLoading(true);

        try {
            const confirmationResult = window.confirmationResult;
            if (!confirmationResult) {
                toast.error("Session expired. Please try again.");
                navigate('/');
                return;
            }

            // 1. Verify the OTP with Firebase Auth
            const userCredential = await confirmationResult.confirm(enteredOtp);
            const user = userCredential.user;
            toast.success('OTP Verified Successfully!');

            // 2. Check if a vendor profile already exists in the database
            const vendorRef = ref(db, `vendors/${user.uid}`);
            const snapshot = await get(vendorRef);

            if (snapshot.exists()) {
                // If it exists, the user is old. Go to the dashboard.
                navigate('/dashboard');
            } else {
                // If it doesn't exist, the user is new. Go to the registration form.
                navigate('/register');
            }

        } catch (error) {
            setLoading(false); // Stop loading on error
            console.error('OTP Page Error:', error);

            // Provide more specific feedback based on the error type
            if (error.code === 'auth/invalid-verification-code') {
                toast.error('Incorrect OTP. Please try again.');
            } else if (error.code === 'permission-denied') {
                toast.error('You do not have permission to access records. Please contact support.');
            }
            else {
                toast.error('An unexpected error occurred. Please try again.');
            }
        }
        // No need for a finally block, setLoading(false) is handled in the catch
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
            <div className="w-full max-w-sm mx-auto bg-white p-8 rounded-2xl shadow-lg text-center">
                <img src={logo} alt="Trade2Cart Logo" className="w-20 h-20 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-800">Verify Your Number</h2>
                <p className="text-gray-500 mt-2 mb-6">Enter the 6-digit OTP sent to +91 {phone}.</p>

                <div className="flex justify-center gap-2 mb-6">
                    {otp.map((data, index) => (
                        <input
                            key={index}
                            ref={el => inputsRef.current[index] = el}
                            type="text"
                            maxLength="1"
                            className="w-12 h-14 text-center text-2xl font-semibold border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            value={data}
                            onChange={(e) => handleChange(e, index)}
                            onKeyDown={(e) => handleKeyDown(e, index)}
                        />
                    ))}
                </div>

                <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="w-full py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-transform transform hover:scale-105 disabled:bg-gray-400"
                >
                    {loading ? 'Verifying...' : 'Verify & Continue'}
                </button>

                <p className="text-sm text-gray-500 mt-4">
                    Didn't receive the code?{' '}
                    <span className="font-semibold text-blue-600 cursor-pointer" onClick={() => navigate('/')}>
                        Request again
                    </span>
                </p>
            </div>
        </div>
    );
};

export default OtpPage;