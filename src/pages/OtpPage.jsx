import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { ref, get } from 'firebase/database';
import { db } from '/src/firebase';
import logo from '/src/assets/images/logo.PNG';
import SEO from '/src/components/SEO';
import Loader from './Loader';
import { FaEdit } from 'react-icons/fa';

const OtpPage = () => {
    const [otp, setOtp] = useState(new Array(6).fill(''));
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { state } = useLocation();
    const phone = state?.phone || '';
    const inputsRef = useRef([]);

    useEffect(() => { inputsRef.current[0]?.focus(); }, []);

    const handleChange = (e, index) => {
        const { value } = e.target;
        if (isNaN(value)) return;
        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);
        if (value && index < 5) inputsRef.current[index + 1]?.focus();
    };

    const handleKeyDown = (e, index) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            inputsRef.current[index - 1]?.focus();
        }
    };

    const handleSubmit = async () => {
        const enteredOtp = otp.join('');
        if (enteredOtp.length !== 6) return toast.error('Please enter the 6-digit OTP.');
        setLoading(true);

        try {
            const confirmationResult = window.confirmationResult;
            if (!confirmationResult) {
                toast.error("Session expired.");
                navigate('/');
                return;
            }
            const userCredential = await confirmationResult.confirm(enteredOtp);
            const vendorRef = ref(db, `vendors/${userCredential.user.uid}`);
            const snapshot = await get(vendorRef);

            if (snapshot.exists()) {
                const vendorData = snapshot.val();
                // If the vendor is approved, send them to dashboard to see active assignments
                if (vendorData.status === "approved") {
                    toast.success('Welcome back!');
                    navigate('/dashboard');
                } else {
                    navigate('/pending');
                }
            } else {
                toast.success('Please complete your registration.');
                navigate('/register');
            }
        } catch (error) {
            console.error("Verification error:", error);
            toast.error('Incorrect OTP. Try again.');
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <Loader fullscreen />;

    return (
        <>
            <SEO title="Verify OTP" />
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
                <div className="w-full max-w-sm mx-auto bg-white p-8 rounded-3xl shadow-xl text-center relative border border-gray-100">
                    <img src={logo} alt="Trade2Cart Logo" className="w-20 h-20 mx-auto mb-4" />
                    <h2 className="text-3xl font-extrabold text-gray-900">Verify OTP</h2>

                    <div className="flex items-center justify-center gap-2 mt-2 mb-8 text-gray-700 font-bold text-lg">
                        <span>+91 {phone}</span>
                        <button onClick={() => navigate('/')} className="p-2 text-blue-600 bg-blue-50 rounded-full">
                            <FaEdit size={16} />
                        </button>
                    </div>

                    <div className="flex justify-center gap-2 mb-8">
                        {otp.map((data, index) => (
                            <input
                                key={index}
                                ref={el => inputsRef.current[index] = el}
                                type="tel"
                                inputMode="numeric"
                                autoComplete="one-time-code"
                                maxLength="1"
                                className="w-12 h-16 text-center text-3xl font-extrabold border-2 border-gray-300 rounded-xl focus:ring-0 focus:border-blue-600 bg-gray-50 focus:bg-white transition-all text-gray-900"
                                value={data}
                                onChange={(e) => handleChange(e, index)}
                                onKeyDown={(e) => handleKeyDown(e, index)}
                            />
                        ))}
                    </div>

                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="w-full py-4 bg-blue-600 text-white font-extrabold text-xl rounded-xl shadow-lg active:scale-95 transition-transform"
                    >
                        Verify & Continue
                    </button>
                </div>
            </div>
        </>
    );
};

export default OtpPage;