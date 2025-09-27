import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { db } from '../firebase';
import { ref, query, orderByChild, equalTo, onValue } from 'firebase/database';
import { useVendor } from '../App';
import { FaBoxOpen, FaRupeeSign, FaTasks, FaTag } from 'react-icons/fa';
import SEO from '../components/SEO';
import Loader from './Loader';
import AssignedOrders from '../components/AssignedOrders';
import ProcessedOrders from '../components/ProcessedOrders';
import TradePriceModal from '../components/TradePriceModal';

const firebaseObjectToArray = (snapshot) => {
    const data = snapshot.val();
    return data ? Object.keys(data).map(key => ({ id: key, ...data[key] })) : [];
};

const StatCard = ({ icon, title, value, color }) => (
    <div className="bg-white p-4 rounded-xl shadow-md flex items-center gap-4">
        <div className={`p-3 rounded-full ${color}`}>
            {icon}
        </div>
        <div>
            <p className="text-sm text-gray-500">{title}</p>
            <p className="text-2xl font-bold text-gray-800">{value}</p>
        </div>
    </div>
);

const Dashboard = () => {
    const navigate = useNavigate();
    const vendor = useVendor();
    const [assignedOrders, setAssignedOrders] = useState([]);
    const [processedOrders, setProcessedOrders] = useState([]);
    const [usersMap, setUsersMap] = useState({});
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('assigned');
    const [showPriceModal, setShowPriceModal] = useState(false);

    useEffect(() => {
        if (!vendor) return;

        // Fetch assignments for this vendor
        const assignmentsQuery = query(ref(db, 'assignments'), orderByChild('vendorPhone'), equalTo(vendor.phone));
        const unsubscribeAssignments = onValue(assignmentsQuery, (snapshot) => {
            const allOrders = firebaseObjectToArray(snapshot);
            setAssignedOrders(allOrders.filter(o => o.status === 'assigned'));
            setProcessedOrders(allOrders.filter(o => o.status === 'completed'));
            setLoading(false);
        }, () => setLoading(false));

        // Fetch all users to map user IDs to names/addresses
        const usersRef = ref(db, 'users');
        const unsubscribeUsers = onValue(usersRef, (snapshot) => {
            setUsersMap(snapshot.val() || {});
        });

        return () => {
            unsubscribeAssignments();
            unsubscribeUsers();
        };
    }, [vendor]);

    if (loading) {
        return <Loader fullscreen />;
    }

    if (vendor?.status === 'pending' || vendor?.status === 'rejected') {
        const isPending = vendor.status === 'pending';
        return (
            <div className={`min-h-[80vh] flex flex-col items-center justify-center text-center p-4 ${isPending ? 'bg-yellow-50' : 'bg-red-50'}`}>
                <FaTasks className={`text-6xl mb-4 ${isPending ? 'text-yellow-500' : 'text-red-500'}`} />
                <h1 className={`text-3xl font-bold ${isPending ? 'text-yellow-800' : 'text-red-800'}`}>
                    {isPending ? 'Verification Pending' : 'Profile Rejected'}
                </h1>
                <p className={`mt-2 max-w-md ${isPending ? 'text-yellow-700' : 'text-red-700'}`}>
                    {isPending
                        ? "Your profile is under review. We'll notify you once verification is complete."
                        : "Your profile could not be approved. Please contact support for more information."}
                </p>
            </div>
        );
    }

    const totalEarningsToday = processedOrders
        .filter(o => o.timestamp && new Date(o.timestamp).toDateString() === new Date().toDateString())
        .reduce((sum, order) => sum + (order.totalAmount || 0), 0);

    const completedTodayCount = processedOrders.filter(o => o.timestamp && new Date(o.timestamp).toDateString() === new Date().toDateString()).length;

    return (
        <>
            <SEO
                title="Vendor Dashboard – Trade2Cart"
                description="Manage your assigned scrap pickup orders, view customer details, and process payments."
            />
            <main className="p-4 md:p-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                    <StatCard icon={<FaBoxOpen size={24} className="text-white" />} title="Pending Orders" value={assignedOrders.length} color="bg-blue-500" />
                    <StatCard icon={<FaTasks size={24} className="text-white" />} title="Completed Today" value={completedTodayCount} color="bg-green-500" />
                    <StatCard icon={<FaRupeeSign size={24} className="text-white" />} title="Earnings Today" value={`₹${totalEarningsToday.toFixed(2)}`} color="bg-purple-500" />
                </div>

                <div className="mb-6">
                    <button
                        onClick={() => setShowPriceModal(true)}
                        className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-green-500 to-teal-500 text-white font-bold rounded-lg shadow-lg hover:from-green-600 hover:to-teal-600 transition-all transform hover:scale-105"
                    >
                        <FaTag /> Today's Trade Price
                    </button>
                </div>


                <div className="bg-white p-4 rounded-xl shadow-md">
                    <div className="flex border-b border-gray-200 mb-4">
                        <button
                            onClick={() => setActiveTab('assigned')}
                            className={`px-4 py-2 font-semibold text-sm transition-colors ${activeTab === 'assigned' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-blue-600'}`}
                        >
                            Assigned Orders ({assignedOrders.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('processed')}
                            className={`px-4 py-2 font-semibold text-sm transition-colors ${activeTab === 'processed' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-blue-600'}`}
                        >
                            Processed Orders ({processedOrders.length})
                        </button>
                    </div>

                    {activeTab === 'assigned' ? (
                        <AssignedOrders assignedOrders={assignedOrders} usersMap={usersMap} />
                    ) : (
                        <ProcessedOrders processedOrders={processedOrders} usersMap={usersMap} />
                    )}
                </div>
            </main>

            {showPriceModal && <TradePriceModal onClose={() => setShowPriceModal(false)} vendorLocation={vendor?.location} />}
        </>
    );
};

export default Dashboard;