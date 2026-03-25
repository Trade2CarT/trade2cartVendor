import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { ref, get } from 'firebase/database';
import { auth, db } from '/src/firebase';
import logo from '/src/assets/images/logo.PNG';
import SEO from '/src/components/SEO';
import Loader from './Loader';
import { FaEdit } from 'react-icons/fa'; // Added icon

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
                toast.error("Session expired. Please try again.");
                navigate('/');
                return;
            }

            const userCredential = await confirmationResult.confirm(enteredOtp);
            const user = userCredential.user;
            toast.success('OTP Verified Successfully!');

            const vendorRef = ref(db, `vendors/${user.uid}`);
            const snapshot = await get(vendorRef);
            if (snapshot.exists()) navigate('/dashboard');
            else navigate('/register');
        } catch (error) {
            toast.error('Incorrect OTP. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <Loader fullscreen />;

    return (
        <>
            <SEO title="Verify OTP - Trade2Cart Vendor" />
            <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-green-50 via-blue-50 to-teal-100 p-4">
                <div className="w-full max-w-sm mx-auto bg-white/90 backdrop-blur-md p-8 rounded-3xl shadow-xl text-center relative border border-white">
                    <img src={logo} alt="Trade2Cart Logo" className="w-20 h-20 mx-auto mb-4 drop-shadow-sm" />
                    <h2 className="text-2xl font-bold text-gray-800">Verify Your Number</h2>

                    {/* --- ENHANCEMENT: Edit Phone Number UI --- */}
                    <div className="flex items-center justify-center gap-2 mt-2 mb-6 text-gray-600 font-medium">
                        <span>Sent to +91 {phone}</span>
                        <button
                            onClick={() => navigate('/')}
                            className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-full transition-colors"
                            title="Edit phone number"
                        >
                            <FaEdit />
                        </button>
                    </div>

                    <div className="flex justify-center gap-2 mb-8">
                        {otp.map((data, index) => (
                            <input
                                key={index}
                                ref={el => inputsRef.current[index] = el}
                                type="text"
                                maxLength="1"
                                className="w-12 h-14 text-center text-2xl font-bold border-2 border-gray-200 rounded-xl focus:ring-0 focus:border-green-500 bg-gray-50 focus:bg-white transition-all"
                                value={data}
                                onChange={(e) => handleChange(e, index)}
                                onKeyDown={(e) => handleKeyDown(e, index)}
                            />
                        ))}
                    </div>

                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="w-full py-3.5 bg-gradient-to-r from-green-500 to-teal-600 text-white font-bold text-lg rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all disabled:opacity-70 disabled:scale-100"
                    >
                        {loading ? 'Verifying...' : 'Verify & Continue'}
                    </button>
                </div>
            </div>
        </>
    );
};

export default OtpPage;