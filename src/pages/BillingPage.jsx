import React, { useState, useEffect } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { getDatabase, ref, update } from "firebase/database";
import { toast, Toaster } from "react-hot-toast";
import {
    FaArrowLeft,
    FaFileInvoiceDollar,
    FaUser,
    FaBoxOpen,
    FaRupeeSign,
    FaCheckCircle
} from "react-icons/fa";

const BillingPage = () => {
    const { assignmentId } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const db = getDatabase();

    const { assignment, selectedItems, weights, prices } = location.state || {};

    const [isProcessing, setIsProcessing] = useState(false);
    const [totalAmount, setTotalAmount] = useState(0);

    useEffect(() => {
        if (!assignment || !selectedItems || selectedItems.length === 0) {
            toast.error("Billing data lost. Please select the order again.");
            navigate(-1);
        }
    }, [assignment, selectedItems, navigate]);

    useEffect(() => {
        if (selectedItems && weights && prices) {
            let total = 0;
            selectedItems.forEach((item) => {
                const finalWeight = weights[item.id] || 0;
                const itemName = item.name || item.text || "unknown";
                const itemRate = prices[itemName.toLowerCase()] || parseFloat(item.rate) || parseFloat(item.minRate) || 0;
                total += finalWeight * itemRate;
            });
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

            // ✅ FIX 1: Update Waste Entries safely! 
            // We push them one by one, adding the required userID and mobile fields to satisfy your security rules!
            selectedItems.forEach((item) => {
                const finalWeight = weights[item.id] || 0;
                const itemName = item.name || item.text || "unknown";
                const itemRate = prices[itemName.toLowerCase()] || parseFloat(item.rate) || parseFloat(item.minRate) || 0;
                const total = finalWeight * itemRate;

                promises.push(update(ref(db, `wasteEntries/${item.id}`), {
                    ...item,
                    status: "Processed",
                    finalWeight: finalWeight,
                    finalRate: itemRate,
                    finalTotal: total,
                    processedAt: timestamp,
                    assignmentID: targetAssignmentId,
                    userID: targetUserId, // Required by rules
                    mobile: assignment.userMobile || assignment.mobile || "", // Required by rules
                }));
            });

            // ✅ FIX 1 (cont): Update Assignment
            promises.push(update(ref(db, `assignments/${targetAssignmentId}`), {
                status: "Completed",
                completedAt: timestamp,
                totalAmount: totalAmount
            }));

            // ✅ FIX 1 (cont): Update User Profile
            promises.push(update(ref(db, `users/${targetUserId}`), {
                Status: "Active",
                otp: null,
                currentAssignmentId: null
            }));

            // ✅ FIX 1 (cont): Generate the Digital Bill
            const billId = `BILL_${Date.now()}`;
            promises.push(update(ref(db, `bills/${billId}`), {
                assignmentID: targetAssignmentId,
                userID: targetUserId,
                vendorID: vendorId,
                totalBill: totalAmount,
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
                })
            }));

            // Execute all updates simultaneously
            await Promise.all(promises);

            // ✅ Clear the session storage so the cart is empty for the next order
            sessionStorage.removeItem(`cart_${targetAssignmentId}`);

            toast.success("Trade Completed Successfully! 🎉");
            setTimeout(() => navigate("/dashboard", { replace: true }), 1500);

        } catch (error) {
            toast.error("Failed to complete trade. Check connection.");
            setIsProcessing(false);
        }
    };

    if (!assignment || !selectedItems) return null;

    return (
        <div className="min-h-screen bg-gray-50 font-sans pb-24">
            <Toaster position="top-center" />

            <header className="bg-gradient-to-r from-blue-700 to-blue-500 text-white pt-6 pb-8 px-5 rounded-b-[40px] shadow-lg relative z-20">
                <div className="flex items-center gap-4 relative z-10">
                    <button onClick={() => navigate(-1)} className="p-3 bg-white/10 rounded-full hover:bg-white/20 transition backdrop-blur-sm">
                        <FaArrowLeft />
                    </button>
                    <div>
                        <h1 className="text-2xl font-black tracking-tight">Final Invoice</h1>
                        <p className="text-blue-100 text-xs uppercase tracking-widest font-bold mt-1">Order #{assignmentId.substring(0, 8)}</p>
                    </div>
                </div>
            </header>

            <main className="px-4 -mt-4 relative z-30 max-w-2xl mx-auto space-y-4">

                <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-600">
                        <FaUser size={20} />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Customer</p>
                        <p className="font-black text-gray-900 text-lg">{assignment.userName}</p>
                    </div>
                </div>

                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-5 border-b border-gray-100 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center"><FaBoxOpen size={12} /></div>
                        <h2 className="text-[14px] font-black uppercase tracking-widest text-gray-800">Scrap Details</h2>
                    </div>

                    <div className="p-5 space-y-4">
                        {selectedItems.map((item) => {
                            const finalWeight = weights[item.id] || 0;
                            const itemName = item.name || item.text || "unknown";
                            const itemRate = prices[itemName.toLowerCase()] || parseFloat(item.rate) || parseFloat(item.minRate) || 0;
                            const totalCost = finalWeight * itemRate;

                            return (
                                <div key={item.id} className="flex justify-between items-center border-b border-gray-50 pb-4 last:border-0 last:pb-0">
                                    <div>
                                        <p className="font-black text-gray-900 capitalize text-lg">{itemName}</p>
                                        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-1">
                                            {finalWeight} {item.unit || 'kg'} × ₹{itemRate}
                                        </p>
                                    </div>
                                    <p className="font-black text-gray-900">₹{totalCost.toFixed(2)}</p>
                                </div>
                            );
                        })}
                    </div>

                    <div className="bg-green-50 p-6 flex justify-between items-center border-t border-green-100">
                        <div>
                            <p className="text-xs font-bold text-green-700 uppercase tracking-widest">Amount to Pay</p>
                            <p className="font-black text-3xl text-green-900 mt-1 flex items-center">
                                <FaRupeeSign className="text-xl mr-1" />
                                {totalAmount.toFixed(2)}
                            </p>
                        </div>
                        <FaCheckCircle className="text-green-500 text-4xl opacity-50" />
                    </div>
                </div>

                <button
                    onClick={handleFinalSubmit}
                    disabled={isProcessing}
                    className="w-full py-4 mt-6 bg-green-600 text-white rounded-2xl font-black text-lg shadow-lg hover:bg-green-700 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:bg-gray-400 disabled:shadow-none"
                >
                    {isProcessing ? (
                        <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                        <><FaFileInvoiceDollar /> Pay & Complete Order</>
                    )}
                </button>
            </main>
        </div>
    );
};

export default BillingPage;