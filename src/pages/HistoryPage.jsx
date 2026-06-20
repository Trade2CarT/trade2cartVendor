import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { ref, query, orderByChild, equalTo, onValue } from 'firebase/database';
import { useVendor } from '../App';
import SEO from '../components/SEO';
import ProcessedOrders from '../components/ProcessedOrders';
import Loader from './Loader';
import { isCompleted, getOrderTime } from '../utils/orders';

const HistoryPage = () => {
    const { vendor } = useVendor();
    const [processedOrders, setProcessedOrders] = useState([]);
    const [usersMap, setUsersMap] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!vendor) return;

        const assignmentsQuery = query(ref(db, 'assignments'), orderByChild('vendorPhone'), equalTo(vendor.phone));
        const unsubscribeAssignments = onValue(assignmentsQuery, (snapshot) => {
            const data = snapshot.val();
            const allOrders = data ? Object.keys(data).map(key => ({ id: key, ...data[key] })) : [];
            const completed = allOrders.filter(isCompleted);
            completed.sort((a, b) => new Date(getOrderTime(b) || 0) - new Date(getOrderTime(a) || 0));
            setProcessedOrders(completed);
            setLoading(false);
        });

        const usersRef = ref(db, 'users');
        const unsubscribeUsers = onValue(usersRef, (snapshot) => {
            setUsersMap(snapshot.val() || {});
        });

        return () => {
            unsubscribeAssignments();
            unsubscribeUsers();
        };
    }, [vendor]);

    if (loading) return <Loader fullscreen />;

    return (
        <div className="p-4 md:p-6 bg-gray-50 min-h-screen max-w-3xl mx-auto">
            <SEO title="Order History" />
            <div className="mb-6">
                <h1 className="text-2xl font-black text-gray-900">Order History</h1>
                <p className="text-sm font-semibold text-gray-500 mt-0.5">
                    {processedOrders.length} completed {processedOrders.length === 1 ? 'order' : 'orders'}
                </p>
            </div>

            <ProcessedOrders processedOrders={processedOrders} usersMap={usersMap} />
        </div>
    );
};

export default HistoryPage;