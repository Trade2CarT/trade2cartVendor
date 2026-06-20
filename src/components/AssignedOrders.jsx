import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { ref, get } from 'firebase/database';
import { db } from '../firebase';
import { FaPhoneAlt, FaMapPin, FaRupeeSign, FaAngleDoubleRight, FaLocationArrow } from 'react-icons/fa';

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
        <div ref={sliderRef} className="relative w-full h-14 bg-gray-100 rounded-2xl overflow-hidden flex items-center shadow-inner">
            <div className="absolute left-0 top-0 h-full bg-brand-500 transition-all duration-75" style={{ width: `${sliderPos + 24}px` }} />
            <span className="absolute w-full text-center text-gray-500 font-extrabold text-xs uppercase tracking-widest pointer-events-none z-10">Swipe to Process</span>
            <div
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                className="absolute left-1 h-12 w-12 bg-white rounded-xl shadow-md flex items-center justify-center text-brand-600 z-20"
                style={{ transform: `translateX(${sliderPos}px)` }}
            >
                <FaAngleDoubleRight size={20} />
            </div>
        </div>
    );
};

const OtpModal = ({ onClose, onVerify, loading }) => {
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

    const handleKeyDown = (e, index) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            inputsRef.current[index - 1]?.focus();
        }
    };

    const handleVerifyClick = () => {
        const enteredOtp = otp.join('');
        if (enteredOtp.length === 4) onVerify(enteredOtp);
        else toast.error("Please enter the 4-digit OTP.");
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-50 p-4 pb-10">
            <div className="bg-white p-6 rounded-3xl shadow-2xl w-full max-w-md text-center animate-slide-up">
                <h3 className="text-2xl font-black text-gray-900">Order Verification</h3>
                <p className="text-gray-500 mt-2 font-medium">Enter the 4-digit OTP from the customer.</p>
                <div className="my-8 flex justify-center gap-3">
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
                            onKeyDown={e => handleKeyDown(e, i)}
                            className="w-16 h-20 text-center text-4xl font-black border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-brand-100 focus:border-brand-500 bg-gray-50 text-gray-900 outline-none transition-all"
                        />
                    ))}
                </div>
                <div className="flex flex-col gap-3">
                    <button onClick={handleVerifyClick} disabled={loading} className="w-full py-4 bg-gray-900 text-white font-black text-lg rounded-2xl hover:bg-gray-800 shadow-lg transition-all active:scale-[0.98] disabled:bg-gray-400">
                        {loading ? 'Verifying...' : 'Verify OTP'}
                    </button>
                    <button onClick={onClose} className="w-full py-3.5 bg-gray-100 text-gray-700 font-bold rounded-2xl hover:bg-gray-200 transition-colors">Cancel</button>
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

    if (assignedOrders.length === 0) {
        return <p className="text-center text-gray-500 py-8 font-bold">No new orders assigned.</p>;
    }

    return (
        <div className="flex flex-col gap-3">
            {assignedOrders.map(order => {
                const userProfile = usersMap[order.userId];
                const hasLocation = userProfile?.lastLat && userProfile?.lastLng;
                return (
                    <div key={order.id} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                        <div className="flex justify-between items-start gap-3 mb-3">
                            <div className="min-w-0">
                                <h3 className="font-black text-lg text-gray-900 truncate">{userProfile?.name || 'N/A'}</h3>
                                <p className="text-sm text-gray-500 mt-1 flex items-start gap-2 font-medium">
                                    <FaMapPin className="text-red-500 mt-0.5 flex-shrink-0" />
                                    <span className="line-clamp-2">{userProfile?.address || 'No address provided'}</span>
                                </p>
                            </div>
                            <div className="text-right flex-shrink-0">
                                <span className="block text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">Est.</span>
                                <span className="text-xl font-black text-green-600 flex items-center justify-end tabular-nums">
                                    <FaRupeeSign size={15} />{parseFloat(order.totalAmount || 0).toFixed(0)}
                                </span>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 mb-3">
                            <a href={`tel:${order.mobile}`} className="inline-flex items-center gap-2 px-3.5 py-2 bg-brand-50 text-brand-700 font-bold text-sm rounded-xl transition-colors hover:bg-brand-100">
                                <FaPhoneAlt size={13} /> Call
                            </a>
                            {hasLocation && (
                                <a
                                    href={`https://www.google.com/maps/dir/?api=1&destination=${userProfile.lastLat},${userProfile.lastLng}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 px-3.5 py-2 bg-green-50 text-green-700 font-bold text-sm rounded-xl transition-colors hover:bg-green-100"
                                >
                                    <FaLocationArrow size={13} /> Directions
                                </a>
                            )}
                        </div>

                        <SwipeButton onSwipeSuccess={() => setOtpModalOrder(order)} />
                    </div>
                );
            })}
            {otpModalOrder && <OtpModal onClose={() => setOtpModalOrder(null)} onVerify={handleProcessOrder} loading={verifyLoading} />}
        </div>
    );
};

export default AssignedOrders;
