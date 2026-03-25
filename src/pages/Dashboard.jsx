import React, { useEffect, useState, useRef } from 'react';
import { db } from '../firebase';
import { ref, query, orderByChild, equalTo, onValue } from 'firebase/database';
import { useVendor } from '../App';
import { FaBoxOpen, FaRupeeSign, FaTasks, FaTag, FaBell, FaInbox, FaSyncAlt } from 'react-icons/fa';
import SEO from '../components/SEO';
import AssignedOrders from '../components/AssignedOrders';
import ProcessedOrders from '../components/ProcessedOrders';
import TradePriceModal from '../components/TradePriceModal';

const firebaseObjectToArray = (snapshot) => {
    const data = snapshot.val();
    return data ? Object.keys(data).map(key => ({ id: key, ...data[key] })) : [];
};

const StatCard = ({ icon, title, value, color }) => (
    <div className="bg-white p-5 rounded-2xl shadow-md border-2 border-gray-100 flex items-center gap-4">
        <div className={`p-4 rounded-xl text-white shadow-inner ${color}`}>
            {icon}
        </div>
        <div>
            <p className="text-sm text-gray-700 font-bold uppercase tracking-wide">{title}</p>
            <p className="text-3xl font-extrabold text-gray-900">{value}</p>
        </div>
    </div>
);

const EmptyState = ({ title, description }) => (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-gray-100 rounded-xl border-2 border-dashed border-gray-300 mt-4">
        <div className="bg-white p-4 rounded-full shadow-sm mb-4">
            <FaInbox className="text-4xl text-gray-400" />
        </div>
        <h3 className="text-xl font-extrabold text-gray-900">{title}</h3>
        <p className="text-gray-700 mt-1 max-w-sm font-medium">{description}</p>
    </div>
);

const DashboardSkeleton = () => (
    <div className="p-6 animate-pulse space-y-6">
        <div className="h-10 bg-gray-300 rounded w-1/4 mb-6"></div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => <div key={i} className="h-24 bg-gray-300 rounded-2xl"></div>)}
        </div>
    </div>
);

const Dashboard = () => {
    const { vendor } = useVendor();
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
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
            }
        }
    };

    const handleTouchEnd = () => { startY.current = 0; };

    useEffect(() => {
        if (!vendor) return;

        const assignmentsQuery = query(ref(db, 'assignments'), orderByChild('vendorPhone'), equalTo(vendor.phone));
        const unsubscribeAssignments = onValue(assignmentsQuery, (snapshot) => {
            const allOrders = firebaseObjectToArray(snapshot);
            setAssignedOrders(allOrders.filter(o => o.status === 'assigned'));
            setProcessedOrders(allOrders.filter(o => o.status === 'completed'));
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

    // --- RESTORED: Profile Under Review Lock ---
    if (vendor?.status === 'pending' || vendor?.status === 'rejected') {
        const isPending = vendor.status === 'pending';
        return (
            <div className="min-h-[80vh] flex flex-col items-center justify-center text-center p-4 bg-gray-50">
                <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full border border-gray-100">
                    <FaTasks className={`text-6xl mx-auto mb-6 ${isPending ? 'text-yellow-500' : 'text-red-500'}`} />
                    <h1 className={`text-2xl font-extrabold ${isPending ? 'text-gray-900' : 'text-red-800'}`}>
                        {isPending ? 'Profile Under Review' : 'Profile Rejected'}
                    </h1>
                    <p className={`mt-3 font-medium ${isPending ? 'text-gray-600' : 'text-red-600'}`}>
                        {isPending
                            ? "We are verifying your documents. This usually takes 24-48 hours. We'll notify you once approved."
                            : "Your profile could not be approved. Please contact support."}
                    </p>
                </div>
            </div>
        );
    }

    const totalEarningsToday = processedOrders
        .filter(o => o.timestamp && new Date(o.timestamp).toDateString() === new Date().toDateString())
        .reduce((sum, order) => sum + (order.totalAmount || 0), 0);
    const completedTodayCount = processedOrders.filter(o => o.timestamp && new Date(o.timestamp).toDateString() === new Date().toDateString()).length;

    return (
        <div onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd} className="min-h-screen">
            {isRefreshing && (
                <div className="flex justify-center items-center p-4 text-blue-600 font-bold bg-blue-50">
                    <FaSyncAlt className="animate-spin mr-2" /> Refreshing...
                </div>
            )}
            <SEO title="Dashboard – Trade2Cart" />
            <main className="p-4 md:p-6 bg-gray-50 min-h-screen">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-extrabold text-gray-900">Welcome, {vendor.name.split(' ')[0]} 👋</h1>
                        <p className="text-sm font-semibold text-gray-600">Here's your business summary for today.</p>
                    </div>
                    <button className="relative p-3 bg-white rounded-full shadow-md border border-gray-200">
                        <FaBell className="text-2xl text-gray-900" />
                        <span className="absolute top-0 right-0 w-4 h-4 bg-red-600 rounded-full border-2 border-white"></span>
                    </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
                    <StatCard icon={<FaBoxOpen size={28} />} title="Pending" value={assignedOrders.length} color="bg-blue-600" />
                    <StatCard icon={<FaTasks size={28} />} title="Completed" value={completedTodayCount} color="bg-green-600" />
                    <StatCard icon={<FaRupeeSign size={28} />} title="Earnings" value={`₹${totalEarningsToday.toFixed(0)}`} color="bg-purple-600" />
                </div>

                <div className="mb-6">
                    <button onClick={() => setShowPriceModal(true)} className="w-full flex items-center justify-center gap-2 py-5 bg-teal-600 text-white font-extrabold text-xl rounded-xl shadow-xl hover:bg-teal-700 transition-all active:scale-95">
                        <FaTag /> Check Today's Price
                    </button>
                </div>

                <div className="bg-white p-2 rounded-2xl shadow-md border-2 border-gray-100">
                    <div className="flex border-b-2 border-gray-200">
                        <button onClick={() => setActiveTab('assigned')} className={`flex-1 py-4 font-extrabold text-lg transition-colors ${activeTab === 'assigned' ? 'border-b-4 border-blue-600 text-blue-700' : 'text-gray-500'}`}>
                            Assigned ({assignedOrders.length})
                        </button>
                        {/* <button onClick={() => setActiveTab('processed')} className={`flex-1 py-4 font-extrabold text-lg transition-colors ${activeTab === 'processed' ? 'border-b-4 border-green-600 text-green-700' : 'text-gray-500'}`}>
                            Completed ({processedOrders.length})
                        </button> */}
                    </div>

                    <div className="p-4">
                        {activeTab === 'assigned' ? (
                            assignedOrders.length > 0 ? <AssignedOrders assignedOrders={assignedOrders} usersMap={usersMap} /> : <EmptyState title="All caught up!" description="No new assigned orders right now." />
                        ) : (
                            processedOrders.length > 0 ? <ProcessedOrders processedOrders={processedOrders} usersMap={usersMap} /> : <EmptyState title="No orders completed" description="Complete an order to see it here." />
                        )}
                    </div>
                </div>
            </main>
            {showPriceModal && <TradePriceModal onClose={() => setShowPriceModal(false)} vendorLocation={vendor?.location} />}
        </div>
    );
};

export default Dashboard;