import React, { useState, useEffect } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { getDatabase, ref, update, get } from "firebase/database";
import { toast } from "react-hot-toast";
import {
    FaArrowLeft,
    FaFileInvoiceDollar,
    FaUser,
    FaCheckCircle
} from "react-icons/fa";
import { useLanguage } from "../context/LanguageContext.jsx";
import { notifyAdmin } from "../utils/notify";
import { DEFAULT_FEE, feeBaseFor } from "../utils/platformFee";

const STR = {
    English: {
        toastDataLost: "Billing data lost. Please select the order again.",
        toastTradeSuccess: "Trade completed successfully! 🎉",
        toastTradeFail: "Failed to complete trade. Check connection.",
        order: "Order",
        finalInvoice: "Final Invoice",
        customer: "Customer",
        customerFallback: "Customer",
        scrapDetails: "Scrap Details",
        amountToPay: "Amount to Pay",
        collectNote: (amount) => `Collect ₹${amount} in cash from the customer before completing.`,
        payComplete: "Pay & Complete Order"
    },
    Tamil: {
        toastDataLost: "பில்லிங் தகவல் இழக்கப்பட்டது. ஆர்டரை மீண்டும் தேர்வு செய்யவும்.",
        toastTradeSuccess: "வர்த்தகம் வெற்றிகரமாக முடிந்தது! 🎉",
        toastTradeFail: "வர்த்தகத்தை முடிக்க முடியவில்லை. இணைய இணைப்பை சரிபார்க்கவும்.",
        order: "ஆர்டர்",
        finalInvoice: "இறுதி பில்",
        customer: "வாடிக்கையாளர்",
        customerFallback: "வாடிக்கையாளர்",
        scrapDetails: "பொருள் விவரங்கள்",
        amountToPay: "செலுத்த வேண்டிய தொகை",
        collectNote: (amount) => `ஆர்டரை முடிக்கும் முன் வாடிக்கையாளரிடம் ₹${amount} பணமாக பெற்றுக் கொள்ளுங்கள்.`,
        payComplete: "பணம் கொடுத்து ஆர்டரை முடிக்கவும்"
    }
};

const BillingPage = () => {
    const { assignmentId } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const db = getDatabase();
    const { language } = useLanguage();
    const t = STR[language] || STR.English;

    const { assignment, selectedItems, weights, prices } = location.state || {};

    const [isProcessing, setIsProcessing] = useState(false);
    const [totalAmount, setTotalAmount] = useState(0);

    // Resolve the effective rate for a line item, tolerant of the various shapes
    // an item can arrive in (edited price map, raw rate, or min rate fallback).
    const resolveRate = (item) => {
        const itemName = item.name || item.text || "unknown";
        // parseFloat returns NaN (not null/undefined) for missing values, so `??`
        // never falls through. Pick the first finite candidate explicitly.
        const candidates = [prices?.[itemName.toLowerCase()], parseFloat(item.rate), parseFloat(item.minRate)];
        return candidates.find((n) => Number.isFinite(Number(n))) ?? 0;
    };
    const resolveWeight = (item) => weights?.[item.id] ?? item.weight ?? 0;

    useEffect(() => {
        if (!assignment || !selectedItems || selectedItems.length === 0) {
            toast.error(t.toastDataLost);
            navigate(-1);
        }
    }, [assignment, selectedItems, navigate]);

    useEffect(() => {
        if (selectedItems && weights && prices) {
            const total = selectedItems.reduce(
                (sum, item) => sum + resolveWeight(item) * resolveRate(item),
                0
            );
            setTotalAmount(total);
        }
    }, [selectedItems, weights, prices]);

    const handleFinalSubmit = async () => {
        setIsProcessing(true);
        const targetUserId = assignment?.userId || assignment?.userID || assignment?.customerId;
        const targetAssignmentId = assignmentId || assignment?.id || assignment?.assignmentID;
        const vendorId = assignment.vendorId || assignment.vendorID || "ADMIN_PROCESSED";

        try {
            const timestamp = new Date().toISOString();
            const promises = [];

            // Platform fee in force at completion, stamped onto the bill below so
            // a later rate change never re-prices this order. See
            // utils/platformFee.js. Falls back to the flat default if unreadable.
            const feeSnap = await get(ref(db, 'settings/platformFee')).catch(() => null);
            const feeSetting = feeSnap?.val() || DEFAULT_FEE;

            // Waste entries: keyed per assignment + item so concurrent orders for the
            // same scrap category no longer overwrite each other's records.
            selectedItems.forEach((item) => {
                const finalWeight = resolveWeight(item);
                const itemRate = resolveRate(item);
                const entryKey = `${targetAssignmentId}_${item.id}`;

                promises.push(update(ref(db, `wasteEntries/${entryKey}`), {
                    ...item,
                    status: "Processed",
                    isAssigned: true, // keep completed records out of the admin's re-assign pool
                    finalWeight,
                    finalRate: itemRate,
                    finalTotal: finalWeight * itemRate,
                    processedAt: timestamp,
                    assignmentID: targetAssignmentId,
                    userID: targetUserId,
                    mobile: assignment.userMobile || assignment.mobile || "",
                }));
            });

            promises.push(update(ref(db, `assignments/${targetAssignmentId}`), {
                status: "Completed",
                completedAt: timestamp,
                timestamp,
                totalAmount: totalAmount
            }));

            // Reset the customer for their next pickup. The whole user app reads
            // the capital-S `Status` field (TaskPage, TradePage scheduling guard,
            // admin). Writing lowercase `status` here left Status stuck on
            // "On-Schedule" → customer could not book again. Clear the stray
            // lowercase field too.
            promises.push(update(ref(db, `users/${targetUserId}`), {
                Status: "Active",
                status: null,
                otp: null,
                currentAssignmentId: null
            }));

            const billId = `BILL_${timestamp.replace(/[:.]/g, "-")}`;
            promises.push(update(ref(db, `bills/${billId}`), {
                assignmentID: targetAssignmentId,
                userID: targetUserId,
                vendorID: vendorId,
                mobile: assignment.userMobile || assignment.mobile || "",
                totalBill: totalAmount,
                createdAt: timestamp,
                platformFeeBase: feeBaseFor(feeSetting, totalAmount),
                billItems: selectedItems.map((item) => {
                    const itemName = item.name || item.text || "unknown";
                    const itemRate = resolveRate(item);
                    const finalWeight = resolveWeight(item);
                    return {
                        name: itemName,
                        weight: finalWeight,
                        rate: itemRate,
                        total: finalWeight * itemRate,
                        unit: item.unit || "kg"
                    };
                })
            }));

            await Promise.all(promises);

            // 🚨 Email the admin that the order was completed (fire-and-forget).
            notifyAdmin('completed', {
                customerName: assignment?.userName || assignment?.mobile || 'Customer',
                customerPhone: assignment?.userMobile || assignment?.mobile || 'N/A',
                vendorName: assignment?.vendorName || 'N/A',
                total: Number(totalAmount).toFixed(2),
                items: selectedItems.map((i) => i.name || i.text).join(', '),
            });

            sessionStorage.removeItem(`cart_${targetAssignmentId}`);

            toast.success(t.toastTradeSuccess);
            setTimeout(() => navigate("/dashboard", { replace: true }), 1200);
        } catch {
            toast.error(t.toastTradeFail);
            setIsProcessing(false);
        }
    };

    if (!assignment || !selectedItems) return null;

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
                        <p className="text-white/50 text-[11px] uppercase tracking-[0.2em] font-bold">{t.order} #{assignmentId.substring(0, 8)}</p>
                        <h1 className="text-2xl font-black tracking-tight">{t.finalInvoice}</h1>
                    </div>
                </div>
            </header>

            <main className="px-4 -mt-5 relative max-w-2xl mx-auto space-y-4">
                {/* Customer */}
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-3">
                    <div className="w-11 h-11 bg-brand-50 rounded-xl flex items-center justify-center text-brand-600 flex-shrink-0">
                        <FaUser size={18} />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">{t.customer}</p>
                        <p className="font-black text-gray-900 text-lg truncate">{assignment.userName || t.customerFallback}</p>
                    </div>
                </div>

                {/* Itemized bill */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100">
                        <h2 className="text-[12px] font-black uppercase tracking-widest text-gray-500">{t.scrapDetails}</h2>
                    </div>

                    <div className="divide-y divide-gray-50">
                        {selectedItems.map((item) => {
                            const finalWeight = resolveWeight(item);
                            const itemName = item.name || item.text || "unknown";
                            const itemRate = resolveRate(item);
                            const totalCost = finalWeight * itemRate;

                            return (
                                <div key={item.billItemId || item.id} className="flex justify-between items-center px-5 py-4">
                                    <div>
                                        <p className="font-bold text-gray-900 capitalize">{itemName}</p>
                                        <p className="text-xs font-semibold text-gray-400 mt-0.5">
                                            {finalWeight} {item.unit || 'kg'} × ₹{itemRate}
                                        </p>
                                    </div>
                                    <p className="font-black text-gray-900 tabular-nums">₹{totalCost.toFixed(2)}</p>
                                </div>
                            );
                        })}
                    </div>

                    <div className="bg-gradient-to-br from-green-500 to-brand-600 px-6 py-6 flex justify-between items-center">
                        <div>
                            <p className="text-[11px] font-bold text-white/80 uppercase tracking-widest">{t.amountToPay}</p>
                            <p className="font-black text-4xl text-white mt-1 tabular-nums">₹{totalAmount.toFixed(2)}</p>
                        </div>
                        <FaCheckCircle className="text-white/40 text-5xl" />
                    </div>
                </div>

                <p className="text-center text-xs text-gray-400 font-medium px-6 pt-1">
                    {t.collectNote(totalAmount.toFixed(2))}
                </p>
            </main>

            {/* Sticky action bar */}
            <div className="fixed bottom-0 inset-x-0 bg-white/90 backdrop-blur-md border-t border-gray-100 p-4 z-40">
                <div className="max-w-2xl mx-auto">
                    <button
                        onClick={handleFinalSubmit}
                        disabled={isProcessing}
                        className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black text-lg shadow-lg hover:bg-gray-800 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:bg-gray-400 disabled:shadow-none"
                    >
                        {isProcessing ? (
                            <div className="w-6 h-6 border-[3px] border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                            <><FaFileInvoiceDollar /> {t.payComplete}</>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BillingPage;
