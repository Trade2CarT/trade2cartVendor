import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getDatabase, ref, get, onValue, query, orderByChild, equalTo } from "firebase/database";
import { auth } from "../firebase";
import { toast } from "react-hot-toast";
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
    FaLocationArrow
} from "react-icons/fa";
import { useLanguage } from "../context/LanguageContext.jsx";
import { getPickup, directionsUrl } from "../utils/location";

// Items priced for the vendor's city; a vendor from a city that has no price
// list yet falls back to every item (one entry per name) so they can still bill.
const itemsForCity = (items, city) => {
    const key = (city || '').trim().toLowerCase();
    const cityItems = key ? items.filter(item => item.location?.trim().toLowerCase() === key) : [];
    if (cityItems.length) return cityItems;
    const seen = new Set();
    return items.filter(item => {
        const name = (item.name || '').trim().toLowerCase();
        if (seen.has(name)) return false;
        seen.add(name);
        return true;
    });
};

const STR = {
    English: {
        toastInvalidOrder: "Invalid order data. Please select the order from the Dashboard.",
        toastPricesFail: "Failed to load scrap prices.",
        toastEnterOtp: "Please enter the complete OTP.",
        toastOtpSuccess: "OTP Verified Successfully!",
        toastOtpWrong: "Incorrect OTP. Please try again.",
        toastVerifyFail: "Verification failed.",
        toastItemName: "Please enter an item name.",
        toastValidPrice: "Please enter a valid price greater than 0.",
        toastAddItem: "Please add at least one item.",
        rateError: (name, min, max) => `Error: ${name} price must be between ₹${min} and ₹${max}.`,
        weightError: (name) => `Please enter a valid weight for ${name}.`,
        customerFallback: "Customer",
        na: "N/A",
        noAddress: "Address not provided",
        directions: "Directions",
        order: "Order",
        processOrder: "Process Order",
        customer: "Customer",
        customerRequest: "Customer's Request",
        customerPhoto: "Photo from customer",
        verifyOtpTitle: "Verify Customer OTP",
        verifyOtpSub: "Ask the customer for the PIN shown on their app.",
        verifying: "Verifying...",
        verifyStart: "Verify & Start Weighing",
        verifiedUnlocked: "Verified & Unlocked",
        tapToAdd: "Tap an item to add it to the bill",
        scrapCategories: "Scrap Categories",
        noItems: "No predefined items found for your location.",
        custom: "Custom",
        currentBill: "Current Bill",
        rate: "Rate",
        weight: "Wt",
        total: "Total",
        continueBilling: "Continue to Billing",
        addCustomScrap: "Add Custom Scrap",
        itemName: "Item Name",
        itemNamePlaceholder: "e.g. Copper Wire",
        ratePrice: "Rate / Price (₹)",
        ratePlaceholder: "e.g. 50",
        addToBill: "Add to Bill"
    },
    Tamil: {
        toastInvalidOrder: "தவறான ஆர்டர் தகவல். டாஷ்போர்டில் இருந்து ஆர்டரை தேர்வு செய்யவும்.",
        toastPricesFail: "பொருட்களின் விலைகளை ஏற்ற முடியவில்லை.",
        toastEnterOtp: "முழு OTP-ஐ உள்ளிடவும்.",
        toastOtpSuccess: "OTP சரிபார்க்கப்பட்டது!",
        toastOtpWrong: "தவறான OTP. மீண்டும் முயற்சிக்கவும்.",
        toastVerifyFail: "சரிபார்ப்பு தோல்வியடைந்தது.",
        toastItemName: "பொருளின் பெயரை உள்ளிடவும்.",
        toastValidPrice: "0-க்கு மேல் சரியான விலையை உள்ளிடவும்.",
        toastAddItem: "குறைந்தது ஒரு பொருளை சேர்க்கவும்.",
        rateError: (name, min, max) => `${name} விலை ₹${min} - ₹${max} இடையில் இருக்க வேண்டும்.`,
        weightError: (name) => `${name}-க்கு சரியான எடையை உள்ளிடவும்.`,
        customerFallback: "வாடிக்கையாளர்",
        na: "N/A",
        noAddress: "முகவரி வழங்கப்படவில்லை",
        directions: "வழி காட்டு",
        order: "ஆர்டர்",
        processOrder: "ஆர்டர் செயலாக்கம்",
        customer: "வாடிக்கையாளர்",
        customerRequest: "வாடிக்கையாளர் கோரிக்கை",
        customerPhoto: "வாடிக்கையாளர் அனுப்பிய புகைப்படம்",
        verifyOtpTitle: "வாடிக்கையாளர் OTP-ஐ சரிபார்க்கவும்",
        verifyOtpSub: "வாடிக்கையாளரின் ஆப்பில் காட்டப்படும் OTP-ஐ கேட்கவும்.",
        verifying: "சரிபார்க்கிறது...",
        verifyStart: "சரிபார்த்து எடை போடத் தொடங்கவும்",
        verifiedUnlocked: "சரிபார்க்கப்பட்டது",
        tapToAdd: "பில்லில் சேர்க்க ஒரு பொருளை தட்டவும்",
        scrapCategories: "பழைய பொருள் வகைகள்",
        noItems: "உங்கள் இடத்திற்கான பொருட்கள் எதுவும் இல்லை.",
        custom: "புதிய பொருள்",
        currentBill: "தற்போதைய பில்",
        rate: "விலை",
        weight: "எடை",
        total: "மொத்தம்",
        continueBilling: "பில்லிங்கிற்கு செல்லவும்",
        addCustomScrap: "புதிய பொருளை சேர்க்கவும்",
        itemName: "பொருளின் பெயர்",
        itemNamePlaceholder: "உதா. செம்பு கம்பி",
        ratePrice: "விலை (₹)",
        ratePlaceholder: "உதா. 50",
        addToBill: "பில்லில் சேர்"
    }
};

const Process = () => {
    const { state } = useLocation();
    const navigate = useNavigate();
    const db = getDatabase();
    const { language } = useLanguage();
    const t = STR[language] || STR.English;

    const initialAssignment = state?.assignment || (state?.id ? state : null);

    const [assignment] = useState(initialAssignment);
    const [vendor, setVendor] = useState(null);
    const [customerProfile, setCustomerProfile] = useState(null);
    const [customerEntries, setCustomerEntries] = useState([]); // items + photo the customer submitted
    const [showPhoto, setShowPhoto] = useState(false);

    const [loading, setLoading] = useState(true);
    const [isOtpVerified, setIsOtpVerified] = useState(() => state?.otpVerified || state?.bypassOtp || false);
    const [otpInput, setOtpInput] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);

    const [masterItems, setMasterItems] = useState([]);

    const targetAssignmentId = assignment?.id || assignment?.assignmentID || assignment?.orderId;
    const targetUserId = assignment?.userId || assignment?.userID || assignment?.customerId;

    // Persist the in-progress cart so the back button / refresh doesn't lose work.
    const [billItems, setBillItems] = useState(() => {
        const savedCart = sessionStorage.getItem(`cart_${targetAssignmentId}`);
        return savedCart ? JSON.parse(savedCart) : [];
    });

    const [showCustomModal, setShowCustomModal] = useState(false);
    const [customName, setCustomName] = useState('');
    const [customRate, setCustomRate] = useState('');

    useEffect(() => {
        if (!assignment || !targetUserId) {
            toast.error(t.toastInvalidOrder);
            navigate(-1);
            return;
        }
        fetchVendorProfile();
        fetchCustomerData();
        fetchCustomerEntries();
        fetchMasterItems();
    }, []);

    useEffect(() => {
        if (targetAssignmentId) {
            sessionStorage.setItem(`cart_${targetAssignmentId}`, JSON.stringify(billItems));
        }
    }, [billItems, targetAssignmentId]);

    const fetchVendorProfile = async () => {
        try {
            const user = auth.currentUser;
            if (user) {
                const vendorRef = ref(db, `vendors/${user.uid}`);
                const snap = await get(vendorRef);
                if (snap.exists()) setVendor(snap.val());
            }
        } catch {
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
        } catch {
            console.error("Could not fetch customer data");
        }
    };

    // Pull the items + photo the customer submitted at checkout (stored on wasteEntries).
    const fetchCustomerEntries = async () => {
        try {
            const ids = assignment?.entryIds || [];
            let entries = [];
            if (ids.length) {
                const snaps = await Promise.all(ids.map(id => get(ref(db, `wasteEntries/${id}`))));
                entries = snaps.filter(s => s.exists()).map(s => ({ id: s.key, ...s.val() }));
            } else {
                // Fallback for legacy assignments with no entryIds: query this
                // customer's entries only (never download the whole node).
                const snap = await get(query(ref(db, 'wasteEntries'), orderByChild('userID'), equalTo(targetUserId)));
                const all = snap.val() || {};
                entries = Object.keys(all).map(k => ({ id: k, ...all[k] }));
            }
            setCustomerEntries(entries);
        } catch {
            console.error("Could not fetch customer entries");
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
        }, () => {
            toast.error(t.toastPricesFail);
            setLoading(false);
        });
    };

    const handleVerifyOtp = async () => {
        if (!otpInput || otpInput.length < 4) {
            return toast.error(t.toastEnterOtp);
        }
        setIsProcessing(true);
        try {
            const userRef = ref(db, `users/${targetUserId}`);
            const userSnapshot = await get(userRef);

            if (userSnapshot.exists() && userSnapshot.val().otp == otpInput) {
                setIsOtpVerified(true);
                toast.success(t.toastOtpSuccess);
            } else {
                toast.error(t.toastOtpWrong);
            }
        } catch {
            toast.error(t.toastVerifyFail);
        } finally {
            setIsProcessing(false);
        }
    };

    const getRateDisplay = (item) => {
        const min = parseFloat(item.minRate || item.rate || 0);
        const max = parseFloat(item.maxRate || item.rate || 0);
        return min === max ? `₹${min}` : `₹${min} - ₹${max}`;
    };

    const handleItemClick = (item) => {
        if (navigator.vibrate) navigator.vibrate(20);

        const isAlreadyAdded = billItems.some(b => b.id === item.id);

        if (isAlreadyAdded) {
            setBillItems(prev => prev.filter(b => b.id !== item.id));
        } else {
            const defaultRate = parseFloat(item.minRate || item.rate) || 0;
            const newBillItem = {
                ...item,
                billItemId: `${item.id}-${Date.now()}`,
                rateInput: defaultRate.toString(),
                rate: defaultRate,
                weightInput: "",
                weight: 0,
                total: 0
            };
            setBillItems(prev => [...prev, newBillItem]);
        }
    };

    const handleUpdateRate = (billItemId, newRateInput) => {
        setBillItems(prev => prev.map(item => {
            if (item.billItemId === billItemId) {
                const parsedRate = parseFloat(newRateInput) || 0;
                return { ...item, rateInput: newRateInput, rate: parsedRate, total: parsedRate * item.weight };
            }
            return item;
        }));
    };

    const handleUpdateWeight = (billItemId, newWeightInput) => {
        setBillItems(prev => prev.map(item => {
            if (item.billItemId === billItemId) {
                const parsedWeight = parseFloat(newWeightInput) || 0;
                return { ...item, weightInput: newWeightInput, weight: parsedWeight, total: item.rate * parsedWeight };
            }
            return item;
        }));
    };

    const handleRemoveItem = (billItemId) => {
        setBillItems(prev => prev.filter(item => item.billItemId !== billItemId));
    };

    const handleAddCustom = () => {
        if (!customName.trim()) return toast.error(t.toastItemName);
        const rateVal = parseFloat(customRate);
        if (!Number.isFinite(rateVal) || rateVal <= 0) return toast.error(t.toastValidPrice);
        const uid = `custom-${Date.now()}`;
        const newItem = {
            id: uid,
            billItemId: uid,
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
        if (billItems.length === 0) return toast.error(t.toastAddItem);

        for (let item of billItems) {
            if (item.id.startsWith('custom-')) continue;
            const min = parseFloat(item.minRate || item.rate || 0);
            const max = parseFloat(item.maxRate || item.rate || Infinity);

            if (item.rate < min || item.rate > max) {
                return toast.error(t.rateError(item.name, min, max));
            }
            if (item.weight <= 0 || isNaN(item.weight)) {
                return toast.error(t.weightError(item.name));
            }
        }

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
            userAddress: getPickup(assignment, customerProfile, customerEntries[0]).address || assignment.userAddress || "Address not provided"
        };

        navigate(`/billing/${targetAssignmentId}`, {
            state: { assignment: enrichedAssignment, selectedItems: billItems, weights: weightsObj, prices: pricesObj }
        });
    };

    if (loading || !assignment || !vendor) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
                <div className="w-14 h-14 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    const availableItems = itemsForCity(masterItems, vendor?.location);

    const displayUserName = customerProfile?.name || assignment.userName || t.customerFallback;
    const displayUserPhone = customerProfile?.phone || customerProfile?.phoneNumber || assignment.mobile || assignment.userMobile || t.na;
    const pickup = getPickup(assignment, customerProfile, customerEntries[0]);
    const displayUserAddress = pickup.address || assignment.userAddress || t.noAddress;
    const navUrl = directionsUrl(pickup);
    const customerPhoto = customerEntries.find(e => e.image)?.image;
    const billTotal = billItems.reduce((sum, item) => sum + (item.total || 0), 0);

    return (
        <div className="min-h-screen bg-gray-50 font-sans pb-32">
            {/* Header */}
            <header className="bg-gray-900 text-white px-5 pt-6 pb-10">
                <div className="max-w-2xl mx-auto flex items-center gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2.5 bg-white/10 rounded-xl hover:bg-white/20 transition active:scale-95"
                        aria-label="Go back"
                    >
                        <FaArrowLeft />
                    </button>
                    <div>
                        <p className="text-white/50 text-[11px] uppercase tracking-[0.2em] font-bold">{t.order} #{(targetAssignmentId || '').substring(0, 8)}</p>
                        <h1 className="text-2xl font-black tracking-tight">{t.processOrder}</h1>
                    </div>
                </div>
            </header>

            <main className="px-4 -mt-5 relative max-w-2xl mx-auto space-y-4">
                {/* Customer + address */}
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                <FaUser size={10} /> {t.customer}
                            </p>
                            <p className="text-xl font-black text-gray-900 mt-1 truncate">{displayUserName}</p>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-gray-500 font-medium text-sm mt-1">
                                <span className="flex items-center gap-1.5"><FaPhoneAlt size={11} /> {displayUserPhone}</span>
                                <span className="flex items-center gap-1.5"><FaCalendarAlt size={11} /> {new Date(assignment.assignedAt || Date.now()).toLocaleDateString()}</span>
                            </div>
                        </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-100 flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2 text-gray-700 font-medium text-sm min-w-0">
                            <FaMapMarkerAlt className="text-green-600 mt-0.5 flex-shrink-0" />
                            <span>{displayUserAddress}</span>
                        </div>
                        {navUrl && (
                            <a
                                href={navUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-shrink-0 inline-flex items-center gap-2 px-3.5 py-2 bg-green-50 text-green-700 font-bold text-sm rounded-xl transition-colors hover:bg-green-100"
                            >
                                <FaLocationArrow size={13} /> {t.directions}
                            </a>
                        )}
                    </div>
                </div>

                {/* What the customer submitted: requested items + photo */}
                {(customerEntries.length > 0 || customerPhoto) && (
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                        <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-3">{t.customerRequest}</p>
                        {customerEntries.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {customerEntries.map(e => (
                                    <span key={e.id} className="bg-brand-50 text-brand-700 border border-brand-200 text-xs font-bold px-3 py-1.5 rounded-full capitalize">
                                        {e.name} · {e.quantity} {e.unit}
                                    </span>
                                ))}
                            </div>
                        )}
                        {customerPhoto && (
                            <div className="mt-4">
                                <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-2">{t.customerPhoto}</p>
                                <img
                                    src={customerPhoto}
                                    alt="Customer scrap"
                                    onClick={() => setShowPhoto(true)}
                                    className="w-full max-h-60 object-contain rounded-xl border border-gray-200 bg-gray-50 cursor-zoom-in"
                                />
                            </div>
                        )}
                    </div>
                )}

                {/* OTP gate or weighing */}
                {!isOtpVerified ? (
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-center">
                        <div className="w-14 h-14 bg-gray-900 text-white rounded-2xl flex items-center justify-center mx-auto mb-4"><FaLock size={20} /></div>
                        <h2 className="text-xl font-black text-gray-900 mb-1">{t.verifyOtpTitle}</h2>
                        <p className="text-sm text-gray-500 font-medium mb-6">{t.verifyOtpSub}</p>
                        <input
                            type="text" inputMode="numeric" maxLength={6} value={otpInput}
                            onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ""))}
                            className="w-full text-center text-4xl font-black tracking-[0.4em] py-4 bg-gray-50 border-2 border-gray-200 rounded-2xl mb-5 focus:border-brand-500 focus:ring-4 focus:ring-brand-100 outline-none" placeholder="0000"
                        />
                        <button onClick={handleVerifyOtp} disabled={isProcessing || otpInput.length < 4} className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black text-lg shadow-lg hover:bg-gray-800 disabled:bg-gray-300 transition-all active:scale-[0.98]">
                            {isProcessing ? t.verifying : t.verifyStart}
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="bg-green-50 p-4 rounded-2xl border border-green-100 flex items-center gap-3">
                            <FaCheckCircle className="text-green-600 text-2xl flex-shrink-0" />
                            <div>
                                <p className="font-black text-green-900">{t.verifiedUnlocked}</p>
                                <p className="text-xs font-bold text-green-700 mt-0.5">{t.tapToAdd}</p>
                            </div>
                        </div>

                        {/* Item grid */}
                        <div>
                            <h2 className="text-[11px] font-extrabold text-gray-400 uppercase tracking-widest mb-3 ml-1">{t.scrapCategories}</h2>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {availableItems.length > 0 ? availableItems.map(item => {
                                    const isSelected = billItems.some(b => b.id === item.id);
                                    return (
                                        <div
                                            key={item.id}
                                            onClick={() => handleItemClick(item)}
                                            className={`p-3 rounded-2xl border-2 flex flex-col items-center justify-center text-center cursor-pointer active:scale-95 transition-all h-24 relative
                                                ${isSelected ? 'border-brand-500 bg-brand-50 shadow-sm' : 'border-gray-100 bg-white hover:border-brand-200'}`}
                                        >
                                            {isSelected && <FaCheckCircle className="absolute top-2 right-2 text-brand-500" />}
                                            <span className="font-extrabold text-sm text-gray-800 leading-tight mb-2 line-clamp-2">{item.name}</span>
                                            <span className={`mt-auto text-[10px] font-bold px-2 py-1 rounded-md ${isSelected ? 'bg-brand-500 text-white' : 'bg-brand-50 text-brand-600'}`}>
                                                {getRateDisplay(item)}/{item.unit || 'kg'}
                                            </span>
                                        </div>
                                    );
                                }) : (
                                    <div className="col-span-2 sm:col-span-3 text-center p-4 bg-gray-100 rounded-2xl border border-gray-200 text-gray-500 font-bold text-sm">
                                        {t.noItems}
                                    </div>
                                )}
                                <div onClick={() => setShowCustomModal(true)} className="bg-brand-50 p-3 rounded-2xl border-2 border-dashed border-brand-300 flex flex-col items-center justify-center text-center cursor-pointer active:scale-95 transition-transform text-brand-700 h-24">
                                    <FaPlus className="text-xl mb-1" />
                                    <span className="font-extrabold text-sm">{t.custom}</span>
                                </div>
                            </div>
                        </div>

                        {/* Current bill */}
                        {billItems.length > 0 && (
                            <div className="pt-2">
                                <h2 className="text-[11px] font-extrabold text-gray-400 uppercase tracking-widest mb-3 ml-1 flex items-center gap-2"><FaWeightHanging /> {t.currentBill}</h2>
                                <div className="space-y-3">
                                    {billItems.map(item => (
                                        <div key={item.billItemId} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm relative">
                                            <button onClick={() => handleRemoveItem(item.billItemId)} className="absolute top-3 right-3 text-gray-300 hover:text-red-500 transition-colors" aria-label="Remove item"><FaTrash size={14} /></button>
                                            <h4 className="font-extrabold text-gray-900 pr-8">{item.name}</h4>

                                            <div className="flex gap-3 mt-3 items-end">
                                                <div className="flex-1">
                                                    <label className="block text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-1">{t.rate} (₹)</label>
                                                    <input type="number" value={item.rateInput} onChange={(e) => handleUpdateRate(item.billItemId, e.target.value)} className="w-full px-2 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-900 focus:border-brand-500 outline-none text-center" />
                                                    {!item.id.startsWith('custom-') && (item.minRate !== item.maxRate) && (
                                                        <p className="text-[9px] text-gray-400 mt-1 text-center font-bold">₹{item.minRate || item.rate} - ₹{item.maxRate || item.rate}</p>
                                                    )}
                                                </div>
                                                <div className="flex-1">
                                                    <label className="block text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-1">{t.weight} ({item.unit || 'kg'})</label>
                                                    <input type="number" autoFocus={item.weightInput === ""} value={item.weightInput} onChange={(e) => handleUpdateWeight(item.billItemId, e.target.value)} placeholder="0.0" className="w-full px-2 py-2.5 bg-brand-50 border border-brand-200 rounded-xl font-bold text-brand-900 focus:border-brand-500 outline-none text-center" />
                                                </div>
                                                <div className="flex-1 text-right pb-1.5">
                                                    <label className="block text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-1">{t.total}</label>
                                                    <div className="font-black text-lg text-green-600 tabular-nums">₹{item.total.toFixed(2)}</div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </main>

            {/* Sticky continue bar */}
            {isOtpVerified && (
                <div className="fixed bottom-0 inset-x-0 bg-white/90 backdrop-blur-md border-t border-gray-100 p-4 z-40">
                    <div className="max-w-2xl mx-auto flex items-center gap-4">
                        <div className="flex-shrink-0">
                            <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">{t.total}</p>
                            <p className="font-black text-xl text-gray-900 tabular-nums">₹{billTotal.toFixed(2)}</p>
                        </div>
                        <button onClick={generateBill} disabled={billItems.length === 0} className="flex-1 py-4 bg-green-600 text-white rounded-2xl font-black text-base shadow-lg hover:bg-green-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:bg-gray-300 disabled:shadow-none">
                            <FaFileInvoiceDollar /> {t.continueBilling}
                        </button>
                    </div>
                </div>
            )}

            {/* Custom item modal */}
            {showPhoto && customerPhoto && (
                <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4" onClick={() => setShowPhoto(false)}>
                    <img src={customerPhoto} alt="Customer scrap" className="max-w-full max-h-[90vh] rounded-xl" onClick={(e) => e.stopPropagation()} />
                    <button onClick={() => setShowPhoto(false)} className="absolute top-5 right-5 w-10 h-10 bg-white/90 rounded-full flex items-center justify-center text-gray-900"><FaTimes /></button>
                </div>
            )}

            {showCustomModal && (
                <div className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-50 p-4 pb-10">
                    <div className="bg-white p-6 rounded-3xl shadow-2xl w-full max-w-sm relative animate-slide-up">
                        <button onClick={() => setShowCustomModal(false)} className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-900 bg-gray-100 rounded-full" aria-label="Close"><FaTimes /></button>
                        <h3 className="text-2xl font-black text-gray-900 mb-6">{t.addCustomScrap}</h3>
                        <div className="space-y-4 mb-6">
                            <div>
                                <label className="text-xs font-extrabold text-gray-500 uppercase tracking-widest">{t.itemName}</label>
                                <input type="text" value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder={t.itemNamePlaceholder} className="w-full mt-1.5 p-3.5 bg-gray-50 border-2 border-gray-200 rounded-xl font-bold text-gray-900 focus:border-brand-500 outline-none" />
                            </div>
                            <div>
                                <label className="text-xs font-extrabold text-gray-500 uppercase tracking-widest">{t.ratePrice}</label>
                                <input type="number" value={customRate} onChange={(e) => setCustomRate(e.target.value)} placeholder={t.ratePlaceholder} className="w-full mt-1.5 p-3.5 bg-gray-50 border-2 border-gray-200 rounded-xl font-bold text-gray-900 focus:border-brand-500 outline-none" />
                            </div>
                        </div>
                        <button onClick={handleAddCustom} className="w-full py-4 bg-gray-900 text-white font-black text-lg rounded-2xl shadow-lg active:scale-[0.98] transition-transform">
                            {t.addToBill}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Process;
