import React, { useEffect, useState } from 'react';
// import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { ref, query, orderByChild, equalTo, onValue } from 'firebase/database';
import { useVendor } from '../App';
import { FaBoxOpen, FaRupeeSign, FaTasks, FaTag, FaBell, FaInbox } from 'react-icons/fa';
import SEO from '../components/SEO';
import AssignedOrders from '../components/AssignedOrders';
import ProcessedOrders from '../components/ProcessedOrders';
import TradePriceModal from '../components/TradePriceModal';

const firebaseObjectToArray = (snapshot) => {
    const data = snapshot.val();
    return data ? Object.keys(data).map(key => ({ id: key, ...data[key] })) : [];
};

const StatCard = ({ icon, title, value, color }) => (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition">
        <div className={`p-4 rounded-xl text-white shadow-inner ${color}`}>
            {icon}
        </div>
        <div>
            <p className="text-sm text-gray-500 font-medium">{title}</p>
            <p className="text-2xl font-bold text-gray-800">{value}</p>
        </div>
    </div>
);

// --- ENHANCEMENT: Empty State Component ---
const EmptyState = ({ title, description }) => (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-gray-50/50 rounded-xl border-2 border-dashed border-gray-200 mt-4">
        <div className="bg-white p-4 rounded-full shadow-sm mb-4">
            <FaInbox className="text-4xl text-gray-300" />
        </div>
        <h3 className="text-lg font-bold text-gray-700">{title}</h3>
        <p className="text-gray-500 mt-1 max-w-sm">{description}</p>
    </div>
);

// --- ENHANCEMENT: Skeleton Loading UI ---
const DashboardSkeleton = () => (
    <div className="p-6 animate-pulse space-y-6">
        <div className="h-10 bg-gray-200 rounded w-1/4 mb-6"></div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => <div key={i} className="h-24 bg-gray-200 rounded-2xl"></div>)}
        </div>
        <div className="h-14 bg-gray-200 rounded-xl mt-6"></div>
        <div className="h-64 bg-gray-200 rounded-xl mt-6"></div>
    </div>
);

const Dashboard = () => {
    // const navigate = useNavigate();
    const { vendor } = useVendor();
    const [assignedOrders, setAssignedOrders] = useState([]);
    const [processedOrders, setProcessedOrders] = useState([]);
    const [usersMap, setUsersMap] = useState({});
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('assigned');
    const [showPriceModal, setShowPriceModal] = useState(false);

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

    if (vendor?.status === 'pending' || vendor?.status === 'rejected') {
        const isPending = vendor.status === 'pending';
        return (
            <div className="min-h-[80vh] flex flex-col items-center justify-center text-center p-4 bg-gray-50">
                <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full border border-gray-100">
                    <FaTasks className={`text-6xl mx-auto mb-6 ${isPending ? 'text-yellow-500' : 'text-red-500'}`} />
                    <h1 className={`text-2xl font-bold ${isPending ? 'text-gray-800' : 'text-red-800'}`}>
                        {isPending ? 'Profile Under Review' : 'Profile Rejected'}
                    </h1>
                    <p className={`mt-3 ${isPending ? 'text-gray-500' : 'text-red-600'}`}>
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
        <>
            <SEO title="Dashboard – Trade2Cart" />
            <main className="p-4 md:p-6 bg-gray-50 min-h-screen">

                {/* --- ENHANCEMENT: Header with Notification Center --- */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">Welcome, {vendor.name.split(' ')[0]} 👋</h1>
                        <p className="text-sm text-gray-500">Here's your business summary for today.</p>
                    </div>
                    <button className="relative p-2 bg-white rounded-full shadow-sm hover:bg-gray-50 transition border border-gray-100">
                        <FaBell className="text-xl text-gray-600" />
                        <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>
                    </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
                    <StatCard icon={<FaBoxOpen size={24} />} title="Pending Orders" value={assignedOrders.length} color="bg-gradient-to-br from-blue-500 to-blue-600" />
                    <StatCard icon={<FaTasks size={24} />} title="Completed Today" value={completedTodayCount} color="bg-gradient-to-br from-green-500 to-green-600" />
                    <StatCard icon={<FaRupeeSign size={24} />} title="Earnings Today" value={`₹${totalEarningsToday.toFixed(0)}`} color="bg-gradient-to-br from-purple-500 to-purple-600" />
                </div>

                {/* --- ENHANCEMENT: Visual Trend Placeholder --- */}
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 mb-6 flex justify-between items-center">
                    <div>
                        <h3 className="font-bold text-gray-800">Weekly Performance</h3>
                        <p className="text-sm text-gray-500">You're doing great! Keep up the pace.</p>
                    </div>
                    <div className="flex items-end gap-1.5 h-12">
                        {/* Fake mini bar chart purely for visual polish */}
                        {[40, 70, 45, 90, 60, 30, 80].map((h, i) => (
                            <div key={i} className="w-3 bg-green-100 rounded-t-sm" style={{ height: '100%' }}>
                                <div className="bg-green-500 w-full rounded-t-sm transition-all" style={{ height: `${h}%`, marginTop: `${100 - h}%` }}></div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="mb-6">
                    <button onClick={() => setShowPriceModal(true)} className="w-full flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-bold text-lg rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.01] transition-all">
                        <FaTag /> Check Today's Trade Price
                    </button>
                </div>

                <div className="bg-white p-2 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex border-b border-gray-100">
                        <button onClick={() => setActiveTab('assigned')} className={`flex-1 py-4 font-bold text-sm transition-colors ${activeTab === 'assigned' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-blue-600'}`}>
                            Assigned ({assignedOrders.length})
                        </button>
                        <button onClick={() => setActiveTab('processed')} className={`flex-1 py-4 font-bold text-sm transition-colors ${activeTab === 'processed' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-blue-600'}`}>
                            Completed ({processedOrders.length})
                        </button>
                    </div>

                    <div className="p-4">
                        {activeTab === 'assigned' ? (
                            assignedOrders.length > 0 ? <AssignedOrders assignedOrders={assignedOrders} usersMap={usersMap} /> : <EmptyState title="All caught up!" description="You currently have no new assigned orders. We'll notify you when a new pickup arrives." />
                        ) : (
                            processedOrders.length > 0 ? <ProcessedOrders processedOrders={processedOrders} usersMap={usersMap} /> : <EmptyState title="No orders completed yet" description="Your processed pickups will appear here. Complete an order to get started!" />
                        )}
                    </div>
                </div>
            </main>
            {showPriceModal && <TradePriceModal onClose={() => setShowPriceModal(false)} vendorLocation={vendor?.location} />}
        </>
    );
};

export default Dashboard;