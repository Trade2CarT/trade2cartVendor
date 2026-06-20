import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ref, onValue } from "firebase/database";
import { getAuth, signOut, onAuthStateChanged } from "firebase/auth";
import { db } from "../firebase";
import { FaHourglassHalf, FaTimesCircle, FaBan, FaSignOutAlt, FaCheckCircle, FaRegClock } from "react-icons/fa";
import logo from "../assets/images/logo.PNG";
import Loader from "./Loader";

const PendingPage = () => {
    const navigate = useNavigate();
    const auth = getAuth();
    const [status, setStatus] = useState("pending");
    const [loading, setLoading] = useState(true);

    // Listen to the vendor's status in real time so that the moment an admin
    // approves them, they are sent straight to the dashboard (no re-login).
    useEffect(() => {
        const unsubAuth = onAuthStateChanged(auth, (user) => {
            if (!user) { navigate("/login", { replace: true }); return; }
            const vendorRef = ref(db, `vendors/${user.uid}`);
            const unsubDb = onValue(vendorRef, (snap) => {
                const s = (snap.val()?.status || "pending").toLowerCase();
                setStatus(s);
                setLoading(false);
                if (s === "approved") navigate("/dashboard", { replace: true });
            });
            return () => unsubDb();
        });
        return () => unsubAuth();
    }, [auth, navigate]);

    const handleLogout = () => signOut(auth).then(() => navigate("/login", { replace: true }));

    if (loading) return <Loader fullscreen />;

    const VIEWS = {
        pending: {
            icon: FaHourglassHalf,
            ring: "bg-accent-50 border-accent-100 text-accent-500",
            title: "Waiting for Approval",
            message: "Your documents have been submitted successfully. Our team is verifying your account — you'll be notified as soon as you're approved.",
            note: "Verification usually completes within 24–48 hours.",
            animate: true,
        },
        rejected: {
            icon: FaTimesCircle,
            ring: "bg-red-50 border-red-100 text-red-500",
            title: "Application Not Approved",
            message: "Unfortunately your registration could not be verified. This is usually due to unclear or mismatched documents.",
            note: "Need help? Contact support@trade2cart.in to re-apply.",
            animate: false,
        },
        blocked: {
            icon: FaBan,
            ring: "bg-red-50 border-red-100 text-red-500",
            title: "Account Blocked",
            message: "Your partner account has been blocked. If you believe this is a mistake, please reach out to our support team.",
            note: "Contact support@trade2cart.in for assistance.",
            animate: false,
        },
    };

    const view = VIEWS[status] || VIEWS.pending;
    const Icon = view.icon;

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6">
            <div className="w-full max-w-md mx-auto bg-white rounded-3xl shadow-xl border border-gray-100 p-8 text-center">
                <img src={logo} alt="Trade2Cart" className="w-16 h-16 mx-auto rounded-2xl border border-gray-100 shadow-sm" />
                <p className="mt-3 text-lg font-black tracking-tight text-gray-900">
                    Trade<span className="text-accent-500">2</span>Cart
                </p>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 mt-1 mb-6">Partner Console</p>

                <div className={`w-24 h-24 mx-auto rounded-full border-4 flex items-center justify-center ${view.ring} ${view.animate ? "animate-pulse" : ""}`}>
                    <Icon className="text-4xl" />
                </div>

                <h2 className="text-2xl font-black text-gray-900 mt-6">{view.title}</h2>
                <p className="text-gray-600 font-medium mt-3 leading-relaxed">{view.message}</p>

                {status === "pending" && (
                    <div className="mt-6 flex items-center justify-between gap-2 bg-gray-50 border border-gray-100 rounded-2xl p-4">
                        <Step icon={FaCheckCircle} label="Submitted" done />
                        <span className="flex-1 h-0.5 bg-accent-200" />
                        <Step icon={FaHourglassHalf} label="In Review" active />
                        <span className="flex-1 h-0.5 bg-gray-200" />
                        <Step icon={FaCheckCircle} label="Approved" />
                    </div>
                )}

                <div className="mt-5 flex items-center justify-center gap-2 text-xs font-bold text-gray-400">
                    <FaRegClock size={12} /> {view.note}
                </div>

                <button onClick={handleLogout} className="mt-7 w-full flex items-center justify-center gap-2 py-3.5 bg-gray-100 text-gray-700 font-black rounded-2xl hover:bg-gray-200 active:scale-[0.98] transition-all">
                    <FaSignOutAlt /> Log out
                </button>
            </div>
        </div>
    );
};

const Step = ({ icon: Icon, label, done, active }) => (
    <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${done ? "bg-brand-600 text-white" : active ? "bg-accent-500 text-white" : "bg-gray-200 text-gray-400"}`}>
            <Icon size={13} />
        </div>
        <span className={`text-[9px] font-black uppercase tracking-wider ${done || active ? "text-gray-700" : "text-gray-400"}`}>{label}</span>
    </div>
);

export default PendingPage;
