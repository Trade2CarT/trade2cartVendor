import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { ref, get } from 'firebase/database';
import { db } from '../firebase';
import { FaPhoneAlt, FaMapPin, FaRupeeSign, FaAngleDoubleRight, FaLocationArrow } from 'react-icons/fa'; // Added FaLocationArrow

// --- Swipe to Process Action ---
const SwipeButton = ({ onSwipeSuccess }) => {
    const [sliderPos, setSliderPos] = useState(0);
    const sliderRef = useRef(null);

    const handleTouchMove = (e) => {
        if (!sliderRef.current) return;
        const rect = sliderRef.current.getBoundingClientRect();
        const touch = e.touches[0];
        let newPos = touch.clientX - rect.left - 24;
        newPos = Math.max(0, Math.min(newPos, rect.width - 48));
        setSliderPos(newPos);

        if (newPos >= rect.width - 55) {
            onSwipeSuccess();
            setSliderPos(0);
        }
    };

    const handleTouchEnd = () => setSliderPos(0);

    return (
        <div ref={sliderRef} className="relative w-full h-14 bg-gray-200 rounded-full overflow-hidden flex items-center shadow-inner mt-4">
            <div className="absolute left-0 top-0 h-full bg-blue-500 transition-all duration-75" style={{ width: `${sliderPos + 24}px` }} />
            <span className="absolute w-full text-center text-gray-600 font-extrabold text-sm pointer-events-none z-10">SWIPE TO PROCESS</span>
            <div
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                className="absolute left-1 h-12 w-12 bg-white rounded-full shadow-md flex items-center justify-center text-blue-600 z-20"
                style={{ transform: `translateX(${sliderPos}px)` }}
            >
                <FaAngleDoubleRight size={20} />
            </div>
        </div>
    );
};

const OtpModal = ({ order, onClose, onVerify, loading }) => {
    const [otp, setOtp] = useState(new Array(4).fill(''));
    const inputsRef = useRef([]);

    useEffect(() => { inputsRef.current[0]?.focus(); }, []);

    const handleChange = (e, index) => {
        const { value } = e.target;
        if (isNaN(value)) return;
        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);
        if (value && index < 3) inputsRef.current[index + 1]?.focus();
    };

    const handleVerifyClick = () => {
        const enteredOtp = otp.join('');
        if (enteredOtp.length === 4) onVerify(enteredOtp);
        else toast.error("Please enter the 4-digit OTP.");
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-end sm:items-center justify-center z-50 p-4 pb-10">
            <div className="bg-white p-6 rounded-3xl shadow-2xl w-full max-w-md text-center animate-slide-up">
                <h3 className="text-2xl font-extrabold text-gray-900">Order Verification</h3>
                <p className="text-gray-700 mt-2 font-medium">Enter the 4-digit OTP from the customer.</p>
                <div className="my-8 flex justify-center gap-4">
                    {otp.map((digit, i) => (
                        <input
                            key={i}
                            ref={el => inputsRef.current[i] = el}
                            type="tel"
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            maxLength="1"
                            value={digit}
                            onChange={e => handleChange(e, i)}
                            className="w-16 h-20 text-center text-4xl font-extrabold border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-500 focus:border-blue-600 bg-gray-50 text-gray-900"
                        />
                    ))}
                </div>
                <div className="flex flex-col gap-3">
                    <button onClick={handleVerifyClick} disabled={loading} className="w-full py-4 bg-green-600 text-white font-extrabold text-xl rounded-xl hover:bg-green-700 shadow-lg transition-transform active:scale-95">
                        {loading ? 'Verifying...' : 'Verify OTP'}
                    </button>
                    <button onClick={onClose} className="w-full py-4 bg-gray-200 text-gray-800 font-bold text-lg rounded-xl hover:bg-gray-300 transition-colors">Cancel</button>
                </div>
            </div>
        </div>
    );
};

const AssignedOrders = ({ assignedOrders, usersMap }) => {
    const navigate = useNavigate();
    const [otpModalOrder, setOtpModalOrder] = useState(null);
    const [verifyLoading, setVerifyLoading] = useState(false);

    const handleProcessOrder = async (enteredOtp) => {
        setVerifyLoading(true);
        try {
            const userRef = ref(db, `users/${otpModalOrder.userId}`);
            const userSnapshot = await get(userRef);
            if (!userSnapshot.exists()) throw new Error("Customer data not found!");

            const userData = userSnapshot.val();

            if (userData.otp == enteredOtp) {
                toast.success("OTP Verified! Opening order...");
                navigate(`/process/${otpModalOrder.id}`, {
                    state: { assignment: otpModalOrder, bypassOtp: true }
                });
                setTimeout(() => setOtpModalOrder(null), 100);
            } else {
                toast.error("Invalid OTP.");
            }
        } catch (error) {
            toast.error(error.message);
        } finally {
            setVerifyLoading(false);
        }
    };

    return (
        <div className="flex flex-col gap-4">
            {assignedOrders.length === 0 ? (
                <p className="text-center text-gray-500 py-8 font-bold">No new orders assigned.</p>
            ) : (
                assignedOrders.map(order => {
                    const userProfile = usersMap[order.userId];
                    return (
                        <div key={order.id} className="bg-white border-2 border-gray-200 rounded-2xl p-4 shadow-sm relative">
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <h3 className="font-extrabold text-xl text-gray-900">{userProfile?.name || 'N/A'}</h3>
                                    <p className="text-sm text-gray-700 mt-1 flex items-start gap-2 font-medium">
                                        <FaMapPin className="text-red-500 mt-0.5 flex-shrink-0" />
                                        <span>{userProfile?.address || 'No address provided'}</span>
                                    </p>
                                </div>
                                <div className="text-right">
                                    <span className="block text-sm font-bold text-gray-500 uppercase tracking-wide">Est. Total</span>
                                    <span className="text-2xl font-extrabold text-green-600 flex items-center justify-end">
                                        <FaRupeeSign size={20} />{parseFloat(order.totalAmount || 0).toFixed(0)}
                                    </span>
                                </div>
                            </div>

                            {/* ACTION BUTTONS (Call & Maps) */}
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                                <a href={`tel:${order.mobile}`} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 font-bold rounded-lg transition-colors hover:bg-blue-100">
                                    <FaPhoneAlt /> Call Customer
                                </a>

                                {/* ✅ MOVED GOOGLE MAPS BUTTON HERE */}
                                {/* ✅ NEW OFFICIAL GOOGLE MAPS LINK */}
                                {userProfile?.lastLat && userProfile?.lastLng && (
                                    <a
                                        href={`https://www.google.com/maps/dir/?api=1&destination=${userProfile.lastLat},${userProfile.lastLng}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 font-bold rounded-lg transition-colors hover:bg-green-100 shadow-sm"
                                    >
                                        <FaLocationArrow /> Get Directions
                                    </a>
                                )}
                            </div>

                            <div className="mt-2 w-full">
                                <SwipeButton onSwipeSuccess={() => setOtpModalOrder(order)} />
                            </div>
                        </div>
                    );
                })
            )}
            {otpModalOrder && <OtpModal order={otpModalOrder} onClose={() => setOtpModalOrder(null)} onVerify={handleProcessOrder} loading={verifyLoading} />}
        </div>
    );
};

export default AssignedOrders;