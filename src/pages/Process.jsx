import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getDatabase, ref, update, get } from "firebase/database";
import { toast, Toaster } from "react-hot-toast";
import TradePriceModal from "../components/TradePriceModal";
import {
    FaArrowLeft,
    FaCheckCircle,
    FaUser,
    FaPhoneAlt,
    FaMapMarkerAlt,
    FaCalendarAlt,
    FaWeightHanging,
    FaFileInvoiceDollar,
    FaLock,
    FaLocationArrow,
    FaInfoCircle
} from "react-icons/fa";

const Process = () => {
    const { state } = useLocation();
    const navigate = useNavigate();
    const db = getDatabase();

    // ✅ FIX 1: Indestructible State Extraction
    // This catches the order data whether it was passed as { assignment: data } OR just directly as { data }
    const initialAssignment = state?.assignment || (state?.id ? state : null);

    const [assignment, setAssignment] = useState(initialAssignment);
    const [wasteEntries, setWasteEntries] = useState([]);
    const [loading, setLoading] = useState(true);

    // Instantly unlocks the screen if the Admin passes bypassOtp: true
    const [isOtpVerified, setIsOtpVerified] = useState(() => state?.otpVerified || state?.bypassOtp || false);

    const [otpInput, setOtpInput] = useState("");
    const [selectedItems, setSelectedItems] = useState([]);
    const [weights, setWeights] = useState({});
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [prices, setPrices] = useState({});
    const [customerGps, setCustomerGps] = useState(null);

    const targetUserId = assignment?.userId || assignment?.userID || assignment?.customerId;
    const targetAssignmentId = assignment?.id || assignment?.assignmentID || assignment?.orderId;

    useEffect(() => {
        if (!assignment || !targetUserId) {
            toast.error("Invalid order data. Please select the order from the Dashboard.");
            navigate(-1);
            return;
        }
        fetchCustomerData();
        fetchWasteEntries();
        fetchPrices();
    }, []);

    const fetchCustomerData = async () => {
        try {
            const userRef = ref(db, `users/${targetUserId}`);
            const snap = await get(userRef);
            if (snap.exists()) {
                const userData = snap.val();
                if (userData.lastLat && userData.lastLng) {
                    setCustomerGps({ lat: userData.lastLat, lng: userData.lastLng });
                }
            }
        } catch (error) {
            console.log("Could not fetch user GPS");
        }
    };

    const fetchWasteEntries = async () => {
        setLoading(true);
        try {
            const entriesRef = ref(db, "wasteEntries");
            const snapshot = await get(entriesRef);
            if (snapshot.exists()) {
                const allEntries = snapshot.val();
                const userEntries = Object.keys(allEntries)
                    .map((key) => ({ id: key, ...allEntries[key] }))
                    .filter(
                        (entry) =>
                            (entry.userID === targetUserId || entry.userId === targetUserId) &&
                            (!entry.assignmentID || entry.assignmentID === targetAssignmentId)
                    );
                setWasteEntries(userEntries);
            }
        } catch (error) {
            toast.error("Failed to load waste details.");
        } finally {
            setLoading(false);
        }
    };

    const fetchPrices = async () => {
        try {
            const pricesRef = ref(db, "items");
            const snapshot = await get(pricesRef);
            if (snapshot.exists()) {
                const pricesData = snapshot.val();
                const itemPrices = {};
                Object.keys(pricesData).forEach((key) => {
                    const item = pricesData[key];
                    if (item.name) {
                        itemPrices[item.name.toLowerCase()] = item.rate || item.minRate || 0;
                    }
                });
                setPrices(itemPrices);
            }
        } catch (error) {
            toast.error("Failed to fetch current scrap rates.");
        }
    };

    const handleVerifyOtp = async () => {
        if (!otpInput || otpInput.length < 4) {
            return toast.error("Please enter the complete OTP.");
        }
        setIsProcessing(true);
        try {
            const userRef = ref(db, `users/${targetUserId}`);
            const userSnapshot = await get(userRef);

            if (userSnapshot.exists() && userSnapshot.val().otp == otpInput) {
                setIsOtpVerified(true);
                toast.success("OTP Verified Successfully!");
            } else {
                toast.error("Incorrect OTP. Please try again.");
            }
        } catch (error) {
            toast.error("Verification failed. Check your connection.");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleItemToggle = (entry) => {
        if (navigator.vibrate) navigator.vibrate(20);
        if (selectedItems.find((item) => item.id === entry.id)) {
            setSelectedItems(selectedItems.filter((item) => item.id !== entry.id));
            const newWeights = { ...weights };
            delete newWeights[entry.id];
            setWeights(newWeights);
        } else {
            setSelectedItems([...selectedItems, entry]);
            setWeights({ ...weights, [entry.id]: entry.quantity || 1 });
        }
    };

    const handleWeightChange = (id, newWeight) => {
        const value = parseFloat(newWeight) || 0;
        setWeights({ ...weights, [id]: value });
    };

    const generateBill = () => {
        if (selectedItems.length === 0) {
            return toast.error("Please select at least one item to generate a bill.");
        }

        let isWeightValid = true;
        selectedItems.forEach((item) => {
            if (!weights[item.id] || weights[item.id] <= 0) {
                isWeightValid = false;
            }
        });

        if (!isWeightValid) {
            return toast.error("Please enter a valid weight for all selected items.");
        }
        setIsModalOpen(true);
    };

    const handleFinalSubmit = async () => {
        setIsProcessing(true);
        try {
            let totalBillAmount = 0;
            const updates = {};
            const timestamp = new Date().toISOString();

            selectedItems.forEach((item) => {
                const finalWeight = weights[item.id];
                // ✅ FIX 2: Safe string conversion prevents undefined `.toLowerCase()` crashes
                const itemName = item.name || item.text || "unknown";
                const itemRate = prices[itemName.toLowerCase()] || parseFloat(item.rate) || parseFloat(item.minRate) || 0;
                const total = finalWeight * itemRate;
                totalBillAmount += total;

                updates[`wasteEntries/${item.id}`] = {
                    ...item,
                    status: "Processed",
                    finalWeight: finalWeight,
                    finalRate: itemRate,
                    finalTotal: total,
                    processedAt: timestamp,
                    assignmentID: targetAssignmentId,
                };
            });

            updates[`assignments/${targetAssignmentId}/status`] = "Completed";
            updates[`assignments/${targetAssignmentId}/completedAt`] = timestamp;
            updates[`assignments/${targetAssignmentId}/totalAmount`] = totalBillAmount;

            const billId = `BILL_${Date.now()}`;
            updates[`users/${targetUserId}/Status`] = "Active";
            updates[`users/${targetUserId}/otp`] = null;
            updates[`users/${targetUserId}/currentAssignmentId`] = null;

            updates[`bills/${billId}`] = {
                assignmentID: targetAssignmentId,
                userID: targetUserId,
                vendorID: assignment.vendorId || assignment.vendorID || "ADMIN_PROCESSED",
                totalBill: totalBillAmount,
                createdAt: timestamp,
                billItems: selectedItems.map((item) => {
                    const itemName = item.name || item.text || "unknown";
                    const itemRate = prices[itemName.toLowerCase()] || parseFloat(item.rate) || parseFloat(item.minRate) || 0;
                    return {
                        name: itemName,
                        weight: weights[item.id],
                        rate: itemRate,
                        total: weights[item.id] * itemRate,
                        unit: item.unit || "kg"
                    };
                }),
            };

            await update(ref(db), updates);

            setIsModalOpen(false);
            toast.success("Trade Completed Successfully!");
            setTimeout(() => navigate(-1), 1500);

        } catch (error) {
            toast.error("Failed to complete trade.");
            setIsProcessing(false);
        }
    };

    if (loading || !assignment) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
                <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-4 text-gray-500 font-bold tracking-widest uppercase">Loading Details...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 font-sans pb-24">
            <Toaster position="top-center" />

            <header className="bg-gradient-to-r from-blue-700 to-blue-500 text-white pt-6 pb-8 px-5 rounded-b-[40px] shadow-lg relative z-20">
                <div className="flex items-center gap-4 relative z-10">
                    <button onClick={() => navigate(-1)} className="p-3 bg-white/10 rounded-full hover:bg-white/20 transition backdrop-blur-sm">
                        <FaArrowLeft />
                    </button>
                    <div>
                        <h1 className="text-2xl font-black tracking-tight">Process Order</h1>
                        <p className="text-blue-100 text-xs uppercase tracking-widest font-bold mt-1">ID: #{targetAssignmentId.substring(0, 8)}</p>
                    </div>
                </div>
            </header>

            <main className="px-4 -mt-4 relative z-30 max-w-2xl mx-auto space-y-4">

                <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-start mb-4">
                        <h2 className="text-[14px] font-black uppercase tracking-widest text-gray-800 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center"><FaUser size={12} /></div>
                            Customer Details
                        </h2>
                        <span className="bg-blue-100 text-blue-800 text-[10px] font-extrabold px-3 py-1.5 rounded-full uppercase tracking-wider">
                            {assignment.status}
                        </span>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                        <p className="text-xl font-black text-gray-900 mb-1">{assignment.userName}</p>
                        <div className="flex items-center gap-4 text-gray-600 font-medium">
                            <span className="flex items-center gap-1.5"><FaPhoneAlt size={12} /> {assignment.userMobile}</span>
                            <span className="flex items-center gap-1.5"><FaCalendarAlt size={12} /> {new Date(assignment.assignedAt).toLocaleDateString()}</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
                    <h2 className="text-[14px] font-black uppercase tracking-widest mb-4 text-gray-800 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-green-50 text-green-600 flex items-center justify-center">
                            <FaMapMarkerAlt size={12} />
                        </div>
                        Pickup Location
                    </h2>

                    <p className="text-gray-700 font-bold mb-4 leading-relaxed bg-gray-50 p-4 rounded-2xl border border-gray-100">
                        {assignment.userAddress || "Address not provided"}
                    </p>

                    {customerGps ? (
                        <a
                            href={`https://www.google.com/maps/dir/?api=1&destination=${customerGps.lat},${customerGps.lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full py-4 bg-green-600 text-white rounded-2xl font-black text-[15px] flex items-center justify-center gap-2 hover:bg-green-700 active:scale-95 transition-all shadow-md"
                        >
                            <FaLocationArrow size={18} /> Open in Google Maps
                        </a>
                    ) : (
                        <div className="p-4 bg-orange-50 text-orange-800 rounded-2xl border border-orange-100 text-sm font-bold flex items-center gap-3">
                            <FaInfoCircle size={20} className="flex-shrink-0 text-orange-500" />
                            No GPS Pin. Please call customer for directions.
                        </div>
                    )}
                </div>

                {!isOtpVerified ? (
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 text-center animate-fade-in-up">
                        <div className="w-16 h-16 bg-gray-900 text-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                            <FaLock size={24} />
                        </div>
                        <h2 className="text-xl font-black text-gray-900 mb-2">Verify Customer OTP</h2>
                        <p className="text-sm text-gray-500 font-medium mb-6">Ask the customer for the PIN shown on their app.</p>

                        <input
                            type="text"
                            inputMode="numeric"
                            maxLength={6}
                            value={otpInput}
                            onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ""))}
                            className="w-full text-center text-4xl font-black tracking-[0.5em] py-4 bg-gray-50 border-2 border-gray-200 rounded-2xl mb-6 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all"
                            placeholder="0000"
                        />

                        <button
                            onClick={handleVerifyOtp}
                            disabled={isProcessing || otpInput.length < 4}
                            className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black text-lg shadow-lg hover:bg-gray-800 disabled:bg-gray-300 disabled:text-gray-500 active:scale-95 transition-all"
                        >
                            {isProcessing ? "Verifying..." : "Verify & Start Weighing"}
                        </button>
                    </div>
                ) : (

                    <div className="space-y-4 animate-fade-in-up">
                        <div className="bg-green-50 p-4 rounded-3xl border border-green-200 flex items-center gap-3 shadow-sm">
                            <FaCheckCircle className="text-green-600 text-2xl flex-shrink-0" />
                            <div>
                                <p className="font-black text-green-900">Verified & Unlocked</p>
                                <p className="text-xs font-bold text-green-700 uppercase tracking-widest mt-0.5">Proceed to weigh items</p>
                            </div>
                        </div>

                        <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
                            <h2 className="text-[14px] font-black uppercase tracking-widest mb-4 text-gray-800 flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center"><FaWeightHanging size={12} /></div>
                                Select & Weigh Items
                            </h2>

                            <div className="space-y-3">
                                {wasteEntries.length > 0 ? (
                                    wasteEntries.map((entry) => {
                                        const isSelected = selectedItems.find((item) => item.id === entry.id);
                                        const itemName = entry.name || entry.text || "unknown";
                                        const currentRate = prices[itemName.toLowerCase()] || parseFloat(entry.rate) || parseFloat(entry.minRate) || 0;

                                        return (
                                            <div key={entry.id} className={`p-4 rounded-2xl border-2 transition-all ${isSelected ? 'border-blue-500 bg-blue-50/30' : 'border-gray-100 bg-gray-50 hover:border-gray-300'}`}>
                                                <div className="flex items-center justify-between mb-3 cursor-pointer" onClick={() => handleItemToggle(entry)}>
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-6 h-6 rounded flex items-center justify-center border-2 ${isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-300 bg-white'}`}>
                                                            {isSelected && <FaCheckCircle size={12} />}
                                                        </div>
                                                        <div>
                                                            <p className="font-black text-gray-900 text-lg capitalize">{itemName}</p>
                                                            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Rate: ₹{currentRate}/{entry.unit || 'kg'}</p>
                                                        </div>
                                                    </div>
                                                </div>

                                                {isSelected && (
                                                    <div className="mt-4 pt-4 border-t border-blue-100 animate-fade-in-down flex items-center gap-3">
                                                        <label className="text-xs font-black uppercase tracking-widest text-gray-500 flex-1">Final Weight ({entry.unit || 'kg'}):</label>
                                                        <input
                                                            type="number"
                                                            min="0.1"
                                                            step="0.1"
                                                            value={weights[entry.id] || ""}
                                                            onChange={(e) => handleWeightChange(entry.id, e.target.value)}
                                                            className="w-1/2 p-3 text-center bg-white border-2 border-blue-200 rounded-xl focus:border-blue-500 outline-none font-black text-blue-900 text-lg shadow-inner"
                                                            placeholder="0.0"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })
                                ) : (
                                    <p className="text-gray-500 text-center py-6 font-bold bg-gray-50 rounded-2xl border border-gray-100">No scrap items found for this order.</p>
                                )}
                            </div>
                        </div>

                        <button
                            onClick={generateBill}
                            disabled={selectedItems.length === 0}
                            className="w-full py-4 mt-6 bg-green-600 text-white rounded-2xl font-black text-lg shadow-lg hover:bg-green-700 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:bg-gray-300 disabled:shadow-none"
                        >
                            <FaFileInvoiceDollar /> Generate Final Bill
                        </button>
                    </div>
                )}
            </main>

            <TradePriceModal
                isOpen={isModalOpen}
                onClose={() => !isProcessing && setIsModalOpen(false)}
                selectedItems={selectedItems}
                weights={weights}
                prices={prices}
                onConfirm={handleFinalSubmit}
                isProcessing={isProcessing}
            />

        </div>
    );
};

export default Process;