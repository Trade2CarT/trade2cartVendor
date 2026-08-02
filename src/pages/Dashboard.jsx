import React, { useEffect, useState, useRef } from 'react';
import { db } from '../firebase';
import { ref, query, orderByChild, equalTo, onValue } from 'firebase/database';
import { useVendor } from '../App';
import { FaBoxOpen, FaRupeeSign, FaCheckDouble, FaTag, FaBell, FaInbox, FaSyncAlt, FaTasks } from 'react-icons/fa';
import SEO from '../components/SEO';
import AssignedOrders from '../components/AssignedOrders';
import ProcessedOrders from '../components/ProcessedOrders';
import TradePriceModal from '../components/TradePriceModal';
import { isAssigned, isCompleted, getOrderTime, isToday } from '../utils/orders';
import { useLanguage } from '../context/LanguageContext.jsx';

const STR = {
    English: {
        refreshing: 'Refreshing...',
        welcomeBack: 'Welcome back,',
        partner: 'Partner',
        statPending: 'Pending',
        statDoneToday: 'Done Today',
        statEarned: 'Earned',
        checkPrices: "Check Today's Prices",
        tabAssigned: 'Assigned',
        tabCompleted: 'Completed',
        emptyAssignedTitle: 'All caught up!',
        emptyAssignedDesc: 'No new assigned orders right now.',
        emptyCompletedTitle: 'No completed orders',
        emptyCompletedDesc: 'Finish an order to see it here.',
        underReview: 'Profile Under Review',
        rejected: 'Profile Rejected',
        underReviewMsg: "We are verifying your documents. This usually takes 24-48 hours. We'll notify you once approved.",
        rejectedMsg: 'Your profile could not be approved. Please contact support.'
    },
    Tamil: {
        refreshing: 'புதுப்பிக்கிறது...',
        welcomeBack: 'மீண்டும் வரவேற்கிறோம்,',
        partner: 'நண்பரே',
        statPending: 'நிலுவையில்',
        statDoneToday: 'இன்று முடிந்தது',
        statEarned: 'சம்பாதித்தது',
        checkPrices: 'இன்றைய விலைகளை பார்க்கவும்',
        tabAssigned: 'ஒதுக்கப்பட்டவை',
        tabCompleted: 'முடிந்தவை',
        emptyAssignedTitle: 'எல்லாம் முடிந்தது!',
        emptyAssignedDesc: 'தற்போது புதிய ஆர்டர்கள் எதுவும் இல்லை.',
        emptyCompletedTitle: 'முடிந்த ஆர்டர்கள் இல்லை',
        emptyCompletedDesc: 'ஒரு ஆர்டரை முடித்தால் இங்கே காணலாம்.',
        underReview: 'சுயவிவரம் சரிபார்ப்பில் உள்ளது',
        rejected: 'சுயவிவரம் நிராகரிக்கப்பட்டது',
        underReviewMsg: 'உங்கள் ஆவணங்களை சரிபார்த்து வருகிறோம். இது பொதுவாக 24-48 மணி நேரம் ஆகும். ஒப்புதல் கிடைத்ததும் உங்களுக்கு தெரிவிப்போம்.',
        rejectedMsg: 'உங்கள் சுயவிவரத்தை ஒப்புதல் அளிக்க முடியவில்லை. ஆதரவு குழுவை தொடர்பு கொள்ளவும்.'
    }
};

const firebaseObjectToArray = (snapshot) => {
    const data = snapshot.val();
    return data ? Object.keys(data).map(key => ({ id: key, ...data[key] })) : [];
};

// Compact Indian money: ₹30k, ₹5L, ₹1.2Cr — keeps big amounts from overflowing.
const formatMoney = (n) => {
    const num = Number(n) || 0;
    if (num >= 1e7) return `₹${(num / 1e7).toFixed(num % 1e7 === 0 ? 0 : 1)}Cr`;
    if (num >= 1e5) return `₹${(num / 1e5).toFixed(num % 1e5 === 0 ? 0 : 1)}L`;
    if (num >= 1e3) return `₹${(num / 1e3).toFixed(num % 1e3 === 0 ? 0 : 1)}k`;
    return `₹${num.toFixed(0)}`;
};

const StatCard = ({ icon, title, value, accent }) => (
    <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 min-w-0 overflow-hidden">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${accent}`}>
            {icon}
        </div>
        <p className="text-xl sm:text-2xl font-black text-gray-900 leading-none tabular-nums truncate">{value}</p>
        <p className="text-[11px] text-gray-500 font-bold uppercase tracking-wider mt-1.5 truncate">{title}</p>
    </div>
);

const EmptyState = ({ title, description }) => (
    <div className="flex flex-col items-center justify-center py-14 px-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
            <FaInbox className="text-2xl text-gray-400" />
        </div>
        <h3 className="text-lg font-extrabold text-gray-900">{title}</h3>
        <p className="text-gray-500 mt-1 max-w-sm font-medium text-sm">{description}</p>
    </div>
);

const DashboardSkeleton = () => (
    <div className="p-4 md:p-6 animate-pulse space-y-6">
        <div className="h-9 bg-gray-200 rounded-lg w-1/2" />
        <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3].map(i => <div key={i} className="h-28 bg-gray-200 rounded-2xl" />)}
        </div>
        <div className="h-16 bg-gray-200 rounded-2xl" />
        <div className="h-40 bg-gray-200 rounded-2xl" />
    </div>
);

const Dashboard = () => {
    const { vendor } = useVendor();
    const { language } = useLanguage();
    const t = STR[language] || STR.English;
    const [assignedOrders, setAssignedOrders] = useState([]);
    const [processedOrders, setProcessedOrders] = useState([]);
    const [usersMap, setUsersMap] = useState({});
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('assigned');
    const [showPriceModal, setShowPriceModal] = useState(false);

    const [isRefreshing, setIsRefreshing] = useState(false);
    const startY = useRef(0);

    const handleTouchStart = (e) => {
        if (window.scrollY === 0) startY.current = e.touches[0].clientY;
    };

    const handleTouchMove = (e) => {
        if (window.scrollY === 0 && startY.current > 0) {
            const y = e.touches[0].clientY;
            if (y - startY.current > 150) {
                setIsRefreshing(true);
                setTimeout(() => window.location.reload(), 1000);
            }
        }
    };

    const handleTouchEnd = () => { startY.current = 0; };

    useEffect(() => {
        if (!vendor) return;

        const assignmentsQuery = query(ref(db, 'assignments'), orderByChild('vendorPhone'), equalTo(vendor.phone));
        const unsubscribeAssignments = onValue(assignmentsQuery, (snapshot) => {
            const allOrders = firebaseObjectToArray(snapshot);
            setAssignedOrders(allOrders.filter(isAssigned));
            setProcessedOrders(allOrders.filter(isCompleted));
            setLoading(false);
        }, () => setLoading(false));

        const usersRef = ref(db, 'users');
        const unsubscribeUsers = onValue(usersRef, (snapshot) => {
            setUsersMap(snapshot.val() || {});
        });

        return () => {
            unsubscribeAssignments();
            unsubscribeUsers();
        };
    }, [vendor]);

    if (loading) return <DashboardSkeleton />;

    // Profile review / rejection lock
    if (vendor?.status === 'pending' || vendor?.status === 'rejected') {
        const isPending = vendor.status === 'pending';
        return (
            <div className="min-h-[80vh] flex flex-col items-center justify-center text-center p-4 bg-gray-50">
                <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full border border-gray-100">
                    <FaTasks className={`text-6xl mx-auto mb-6 ${isPending ? 'text-yellow-500' : 'text-red-500'}`} />
                    <h1 className={`text-2xl font-extrabold ${isPending ? 'text-gray-900' : 'text-red-800'}`}>
                        {isPending ? t.underReview : t.rejected}
                    </h1>
                    <p className={`mt-3 font-medium ${isPending ? 'text-gray-600' : 'text-red-600'}`}>
                        {isPending ? t.underReviewMsg : t.rejectedMsg}
                    </p>
                </div>
            </div>
        );
    }

    const completedToday = processedOrders.filter(o => isToday(getOrderTime(o)));
    const totalEarningsToday = completedToday.reduce((sum, order) => sum + (parseFloat(order.totalAmount) || 0), 0);
    const completedTodayCount = completedToday.length;
    const firstName = (vendor?.name || t.partner).split(' ')[0];

    return (
        <div onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd} className="min-h-screen bg-gray-50">
            <SEO title="Dashboard – Trade2Cart" />
            {isRefreshing && (
                <div className="flex justify-center items-center p-3 text-brand-600 font-bold bg-brand-50 text-sm">
                    <FaSyncAlt className="animate-spin mr-2" /> {t.refreshing}
                </div>
            )}

            <main className="p-4 md:p-6 max-w-3xl mx-auto">
                {/* Greeting */}
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <p className="text-sm font-semibold text-gray-500">{t.welcomeBack}</p>
                        <h1 className="text-2xl font-black text-gray-900">{firstName} 👋</h1>
                    </div>
                    <button className="relative p-3 bg-white rounded-2xl shadow-sm border border-gray-100" aria-label="Notifications">
                        <FaBell className="text-xl text-gray-700" />
                        <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
                    </button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3 mb-5">
                    <StatCard icon={<FaBoxOpen size={18} />} title={t.statPending} value={assignedOrders.length} accent="bg-brand-50 text-brand-600" />
                    <StatCard icon={<FaCheckDouble size={18} />} title={t.statDoneToday} value={completedTodayCount} accent="bg-green-50 text-green-600" />
                    <StatCard icon={<FaRupeeSign size={18} />} title={t.statEarned} value={formatMoney(totalEarningsToday)} accent="bg-purple-50 text-purple-600" />
                </div>

                {/* Price CTA */}
                <button
                    onClick={() => setShowPriceModal(true)}
                    className="w-full flex items-center justify-center gap-2.5 py-4 mb-6 bg-gradient-to-r from-brand-500 to-brand-600 text-white font-extrabold text-base rounded-2xl shadow-md hover:shadow-lg transition-all active:scale-[0.98]"
                >
                    <FaTag /> {t.checkPrices}
                </button>

                {/* Orders */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="flex p-1.5 gap-1.5 bg-gray-50 border-b border-gray-100">
                        <button
                            onClick={() => setActiveTab('assigned')}
                            className={`flex-1 py-2.5 rounded-xl font-extrabold text-sm transition-all ${activeTab === 'assigned' ? 'bg-white text-brand-700 shadow-sm' : 'text-gray-500'}`}
                        >
                            {t.tabAssigned} ({assignedOrders.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('processed')}
                            className={`flex-1 py-2.5 rounded-xl font-extrabold text-sm transition-all ${activeTab === 'processed' ? 'bg-white text-green-700 shadow-sm' : 'text-gray-500'}`}
                        >
                            {t.tabCompleted} ({processedOrders.length})
                        </button>
                    </div>

                    <div className="p-3">
                        {activeTab === 'assigned' ? (
                            assignedOrders.length > 0
                                ? <AssignedOrders assignedOrders={assignedOrders} usersMap={usersMap} />
                                : <EmptyState title={t.emptyAssignedTitle} description={t.emptyAssignedDesc} />
                        ) : (
                            processedOrders.length > 0
                                ? <ProcessedOrders processedOrders={processedOrders} usersMap={usersMap} />
                                : <EmptyState title={t.emptyCompletedTitle} description={t.emptyCompletedDesc} />
                        )}
                    </div>
                </div>
            </main>

            {showPriceModal && <TradePriceModal onClose={() => setShowPriceModal(false)} vendorLocation={vendor?.location} />}
        </div>
    );
};

export default Dashboard;
