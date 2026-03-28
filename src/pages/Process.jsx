import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getDatabase, ref, get, onValue } from "firebase/database";
import { auth } from "../firebase";
import { toast, Toaster } from "react-hot-toast";
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
    FaPlus,
    FaTrash,
    FaTimes,
    FaEdit
} from "react-icons/fa";

const Process = () => {
    const { state } = useLocation();
    const navigate = useNavigate();
    const db = getDatabase();

    const initialAssignment = state?.assignment || (state?.id ? state : null);

    const [assignment, setAssignment] = useState(initialAssignment);
    const [vendor, setVendor] = useState(null);
    const [customerProfile, setCustomerProfile] = useState(null);

    const [loading, setLoading] = useState(true);
    const [isOtpVerified, setIsOtpVerified] = useState(() => state?.otpVerified || state?.bypassOtp || false);
    const [otpInput, setOtpInput] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);

    const [masterItems, setMasterItems] = useState([]);
    const [billItems, setBillItems] = useState([]);

    // ✅ NEW UX: Smart Add/Edit Modal State
    const [activeItem, setActiveItem] = useState(null);
    const [showCustomModal, setShowCustomModal] = useState(false);
    const [customName, setCustomName] = useState('');
    const [customRate, setCustomRate] = useState('');

    const targetUserId = assignment?.userId || assignment?.userID || assignment?.customerId;
    const targetAssignmentId = assignment?.id || assignment?.assignmentID || assignment?.orderId;

    useEffect(() => {
        if (!assignment || !targetUserId) {
            toast.error("Invalid order data. Please select the order from the Dashboard.");
            navigate(-1);
            return;
        }
        fetchVendorProfile();
        fetchCustomerData();
        fetchMasterItems();
    }, []);

    const fetchVendorProfile = async () => {
        try {
            const user = auth.currentUser;
            if (user) {
                const vendorRef = ref(db, `vendors/${user.uid}`);
                const snap = await get(vendorRef);
                if (snap.exists()) setVendor(snap.val());
            }
        } catch (error) {
            console.error("Could not fetch vendor profile");
        }
    };

    const fetchCustomerData = async () => {
        try {
            const userRef = ref(db, `users/${targetUserId}`);
            const snap = await get(userRef);
            if (snap.exists()) {
                setCustomerProfile(snap.val());
            }
        } catch (error) {
            console.error("Could not fetch customer data");
        }
    };

    const fetchMasterItems = () => {
        setLoading(true);
        const itemsRef = ref(db, 'items');
        onValue(itemsRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const itemsArray = Object.keys(data).map(key => ({ id: key, ...data[key] }));
                setMasterItems(itemsArray);
            }
            setLoading(false);
        }, (error) => {
            toast.error("Failed to load scrap prices.");
            setLoading(false);
        });
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
            toast.error("Verification failed.");
        } finally {
            setIsProcessing(false);
        }
    };

    const getRateDisplay = (item) => {
        const min = parseFloat(item.minRate || item.rate || 0);
        const max = parseFloat(item.maxRate || item.rate || 0);
        return min === max ? `₹${min}` : `₹${min} - ₹${max}`;
    };

    // ✅ THE NEW UX: Opens the Modal instead of instantly adding
    const handleItemClick = (item) => {
        if (navigator.vibrate) navigator.vibrate(20);

        const existingItem = billItems.find(b => b.id === item.id);

        if (existingItem) {
            // Open in Edit Mode
            setActiveItem({ ...existingItem, isEditing: true });
        } else {
            // Open in Add Mode
            const defaultRate = parseFloat(item.minRate || item.rate) || 0;
            setActiveItem({
                ...item,
                rateInput: defaultRate.toString(),
                weightInput: "", // Blank so they MUST type a weight
                isEditing: false
            });
        }
    };

    // ✅ THE NEW UX: Saves the data from the popup to the bill
    const handleSaveActiveItem = () => {
        const parsedRate = parseFloat(activeItem.rateInput) || 0;
        const parsedWeight = parseFloat(activeItem.weightInput) || 0;

        const min = parseFloat(activeItem.minRate || activeItem.rate || 0);
        const max = parseFloat(activeItem.maxRate || activeItem.rate || Infinity);

        if (parsedRate < min || parsedRate > max) {
            return toast.error(`Price must be between ₹${min} and ₹${max}.`);
        }
        if (parsedWeight <= 0 || isNaN(parsedWeight)) {
            return toast.error("Please enter a valid weight.");
        }

        const updatedItem = {
            ...activeItem,
            rate: parsedRate,
            weight: parsedWeight,
            total: parsedRate * parsedWeight,
            billItemId: activeItem.billItemId || `${activeItem.id}-${Date.now()}`
        };

        if (activeItem.isEditing) {
            setBillItems(prev => prev.map(b => b.id === updatedItem.id ? updatedItem : b));
            toast.success("Item updated!");
        } else {
            setBillItems(prev => [...prev, updatedItem]);
            toast.success("Item added to bill!");
        }

        setActiveItem(null); // Close modal
    };

    const handleRemoveItem = (billItemId) => {
        setBillItems(prev => prev.filter(item => item.billItemId !== billItemId));
    };

    const handleAddCustom = () => {
        if (!customName.trim() || !customRate.trim()) return toast.error("Please enter a name and price.");
        const rateVal = parseFloat(customRate) || 0;
        const newItem = {
            id: `custom-${Date.now()}`,
            billItemId: `custom-${Date.now()}`,
            name: customName,
            rateInput: customRate,
            rate: rateVal,
            weightInput: "1",
            weight: 1,
            unit: 'kg',
            total: rateVal * 1,
        };
        setBillItems(prev => [...prev, newItem]);
        setShowCustomModal(false);
        setCustomName('');
        setCustomRate('');
    };

    const generateBill = () => {
        if (billItems.length === 0) return toast.error("Please add at least one item.");

        const weightsObj = {};
        const pricesObj = {};
        billItems.forEach(item => {
            weightsObj[item.id] = item.weight;
            pricesObj[item.name.toLowerCase()] = item.rate;
        });

        const enrichedAssignment = {
            ...assignment,
            userName: customerProfile?.name || assignment.userName || "Customer",
            userMobile: customerProfile?.phone || assignment.userMobile || "N/A",
            userAddress: customerProfile?.address || assignment.userAddress || "Address not provided"
        };

        navigate(`/billing/${targetAssignmentId}`, {
            state: { assignment: enrichedAssignment, selectedItems: billItems, weights: weightsObj, prices: pricesObj }
        });
    };

    if (loading || !assignment || !vendor) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
                <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    const availableItems = vendor?.location
        ? masterItems.filter(item => item.location?.toLowerCase() === vendor.location?.toLowerCase())
        : masterItems;

    const displayUserName = customerProfile?.name || assignment.userName || "Customer";
    const displayUserPhone = customerProfile?.phone || assignment.userMobile || "N/A";
    const displayUserAddress = customerProfile?.address || assignment.userAddress || "Address not provided";

    return (
        <div className="min-h-screen bg-gray-50 font-sans pb-24 relative">
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

                {/* CUSTOMER CARD */}
                <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-start mb-4">
                        <h2 className="text-[14px] font-black uppercase tracking-widest text-gray-800 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center"><FaUser size={12} /></div>
                            Customer Details
                        </h2>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                        <p className="text-xl font-black text-gray-900 mb-1">{displayUserName}</p>
                        <div className="flex items-center gap-4 text-gray-600 font-medium">
                            <span className="flex items-center gap-1.5"><FaPhoneAlt size={12} /> {displayUserPhone}</span>
                            <span className="flex items-center gap-1.5"><FaCalendarAlt size={12} /> {new Date(assignment.assignedAt || Date.now()).toLocaleDateString()}</span>
                        </div>
                    </div>
                </div>

                {/* ADDRESS CARD */}
                <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
                    <h2 className="text-[14px] font-black uppercase tracking-widest mb-4 text-gray-800 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-green-50 text-green-600 flex items-center justify-center"><FaMapMarkerAlt size={12} /></div>
                        Pickup Location
                    </h2>
                    <p className="text-gray-700 font-bold leading-relaxed bg-gray-50 p-4 rounded-2xl border border-gray-100">
                        {displayUserAddress}
                    </p>
                </div>

                {/* OTP OR WEIGHING */}
                {!isOtpVerified ? (
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 text-center animate-fade-in-up">
                        <div className="w-16 h-16 bg-gray-900 text-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg"><FaLock size={24} /></div>
                        <h2 className="text-xl font-black text-gray-900 mb-2">Verify Customer OTP</h2>
                        <p className="text-sm text-gray-500 font-medium mb-6">Ask the customer for the PIN shown on their app.</p>
                        <input
                            type="text" inputMode="numeric" maxLength={6} value={otpInput}
                            onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ""))}
                            className="w-full text-center text-4xl font-black tracking-[0.5em] py-4 bg-gray-50 border-2 border-gray-200 rounded-2xl mb-6 focus:border-blue-500 focus:ring-4 outline-none" placeholder="0000"
                        />
                        <button onClick={handleVerifyOtp} disabled={isProcessing || otpInput.length < 4} className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black text-lg shadow-lg hover:bg-gray-800 disabled:bg-gray-300 transition-all">
                            {isProcessing ? "Verifying..." : "Verify & Start Weighing"}
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4 animate-fade-in-up">
                        <div className="bg-green-50 p-4 rounded-3xl border border-green-200 flex items-center gap-3 shadow-sm">
                            <FaCheckCircle className="text-green-600 text-2xl flex-shrink-0" />
                            <div>
                                <p className="font-black text-green-900">Verified & Unlocked</p>
                                <p className="text-xs font-bold text-green-700 uppercase tracking-widest mt-0.5">Tap an item to add it to the bill</p>
                            </div>
                        </div>

                        {/* ITEM GRID */}
                        <div>
                            <h2 className="text-xs font-extrabold text-gray-400 uppercase tracking-widest mb-3 ml-1">Scrap Categories</h2>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {availableItems.length > 0 ? availableItems.map(item => {
                                    const isSelected = billItems.some(b => b.id === item.id);
                                    return (
                                        <div
                                            key={item.id}
                                            onClick={() => handleItemClick(item)}
                                            className={`p-3 rounded-2xl border-2 shadow-sm flex flex-col items-center justify-center text-center cursor-pointer active:scale-95 transition-all h-24 relative 
                                ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-100 bg-white hover:border-blue-300'}`}
                                        >
                                            {isSelected && <FaCheckCircle className="absolute top-2 right-2 text-blue-500" />}
                                            <span className="font-extrabold text-sm text-gray-800 leading-tight mb-2 line-clamp-2">{item.name}</span>
                                            <span className={`mt-auto text-[10px] font-bold px-2 py-1 rounded-md ${isSelected ? 'bg-blue-500 text-white' : 'bg-blue-50 text-blue-600'}`}>
                                                {getRateDisplay(item)}/{item.unit || 'kg'}
                                            </span>
                                        </div>
                                    );
                                }) : (
                                    <div className="col-span-2 sm:col-span-3 text-center p-4 bg-gray-100 rounded-2xl border border-gray-200 text-gray-500 font-bold text-sm">
                                        No predefined items found for your location.
                                    </div>
                                )}
                                <div onClick={() => setShowCustomModal(true)} className="bg-blue-50 p-3 rounded-2xl border-2 border-dashed border-blue-400 shadow-sm flex flex-col items-center justify-center text-center cursor-pointer active:scale-95 transition-transform text-blue-700 h-24">
                                    <FaPlus className="text-xl mb-1" />
                                    <span className="font-extrabold text-sm">Custom</span>
                                </div>
                            </div>
                        </div>

                        {/* ✅ NEW UX: CLEAN BILL LIST */}
                        {billItems.length > 0 && (
                            <div className="mt-6">
                                <h2 className="text-[14px] font-black uppercase tracking-widest mb-3 text-gray-800 flex items-center gap-2"><FaWeightHanging className="text-blue-500" /> Current Bill</h2>
                                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                                    {billItems.map((item, index) => (
                                        <div key={item.billItemId} className={`p-4 flex justify-between items-center ${index !== billItems.length - 1 ? 'border-b border-gray-100' : ''}`}>
                                            <div>
                                                <h4 className="font-black text-gray-900 text-lg capitalize">{item.name}</h4>
                                                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-1">
                                                    {item.weight} {item.unit || 'kg'} × ₹{item.rate}
                                                </p>
                                            </div>
                                            <div className="text-right flex items-center gap-4">
                                                <div className="font-black text-xl text-green-600">₹{item.total.toFixed(2)}</div>

                                                {/* Action Buttons */}
                                                <div className="flex flex-col gap-2 border-l border-gray-200 pl-4">
                                                    <button onClick={() => handleItemClick(item)} className="text-blue-500 hover:text-blue-700"><FaEdit size={16} /></button>
                                                    <button onClick={() => handleRemoveItem(item.billItemId)} className="text-red-400 hover:text-red-600"><FaTrash size={16} /></button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <button onClick={generateBill} disabled={billItems.length === 0} className="w-full py-4 mt-6 bg-green-600 text-white rounded-2xl font-black text-lg shadow-lg hover:bg-green-700 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:bg-gray-300 disabled:shadow-none">
                            <FaFileInvoiceDollar /> Continue to Billing
                        </button>
                    </div>
                )}
            </main>

            {/* ✅ NEW UX: SMART ADD/EDIT MODAL */}
            {activeItem && !activeItem.id.startsWith('custom-') && (
                <div className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-50 p-4 pb-10">
                    <div className="bg-white p-6 rounded-3xl shadow-2xl w-full max-w-sm relative animate-slide-up">
                        <button onClick={() => setActiveItem(null)} className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-900 bg-gray-100 rounded-full"><FaTimes /></button>

                        <h3 className="text-2xl font-black text-gray-900 mb-1">{activeItem.isEditing ? 'Edit Item' : 'Add Item'}</h3>
                        <p className="text-gray-500 font-bold mb-6 capitalize">{activeItem.name}</p>

                        <div className="space-y-4 mb-8">
                            <div>
                                <label className="text-xs font-extrabold text-gray-500 uppercase tracking-widest flex justify-between">
                                    <span>Weight ({activeItem.unit || 'kg'})</span>
                                </label>
                                <input type="number" autoFocus value={activeItem.weightInput} onChange={(e) => setActiveItem({ ...activeItem, weightInput: e.target.value })} placeholder="0.0" className="w-full mt-1 p-4 bg-gray-50 border-2 border-blue-200 rounded-xl font-black text-blue-900 text-xl focus:border-blue-500 outline-none text-center" />
                            </div>
                            <div>
                                <label className="text-xs font-extrabold text-gray-500 uppercase tracking-widest flex justify-between">
                                    <span>Rate (₹)</span>
                                    {activeItem.minRate !== activeItem.maxRate && (
                                        <span className="text-blue-500">Limit: ₹{activeItem.minRate} - ₹{activeItem.maxRate}</span>
                                    )}
                                </label>
                                <input type="number" value={activeItem.rateInput} onChange={(e) => setActiveItem({ ...activeItem, rateInput: e.target.value })} className="w-full mt-1 p-4 bg-gray-50 border-2 border-gray-200 rounded-xl font-bold text-gray-900 focus:border-blue-500 outline-none text-center" />
                            </div>
                        </div>

                        <div className="flex gap-3">
                            {activeItem.isEditing && (
                                <button onClick={() => { handleRemoveItem(activeItem.billItemId); setActiveItem(null); }} className="py-4 px-6 bg-red-50 text-red-600 font-black text-lg rounded-xl active:bg-red-100 transition-colors">
                                    <FaTrash />
                                </button>
                            )}
                            <button onClick={handleSaveActiveItem} className="flex-1 py-4 bg-blue-600 text-white font-black text-xl rounded-xl shadow-lg active:scale-95 transition-transform">
                                {activeItem.isEditing ? 'Update Bill' : 'Save to Bill'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* CUSTOM ITEM MODAL */}
            {showCustomModal && (
                <div className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-50 p-4 pb-10">
                    <div className="bg-white p-6 rounded-3xl shadow-2xl w-full max-w-sm relative animate-slide-up">
                        <button onClick={() => setShowCustomModal(false)} className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-900 bg-gray-100 rounded-full"><FaTimes /></button>
                        <h3 className="text-2xl font-black text-gray-900 mb-6">Add Custom Scrap</h3>
                        <div className="space-y-4 mb-8">
                            <div>
                                <label className="text-xs font-extrabold text-gray-500 uppercase tracking-widest">Item Name</label>
                                <input type="text" value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder="e.g. Copper Wire" className="w-full mt-1 p-4 bg-gray-50 border-2 border-gray-200 rounded-xl font-bold text-gray-900 focus:border-blue-500 outline-none" />
                            </div>
                            <div>
                                <label className="text-xs font-extrabold text-gray-500 uppercase tracking-widest">Rate / Price (₹)</label>
                                <input type="number" value={customRate} onChange={(e) => setCustomRate(e.target.value)} placeholder="e.g. 50" className="w-full mt-1 p-4 bg-gray-50 border-2 border-gray-200 rounded-xl font-bold text-gray-900 focus:border-blue-500 outline-none" />
                            </div>
                        </div>
                        <button onClick={handleAddCustom} className="w-full py-4 bg-blue-600 text-white font-black text-xl rounded-xl shadow-lg active:scale-95 transition-transform">
                            Add to Bill
                        </button>
                    </div>
                </div>
            )}

        </div>
    );
};

export default Process;