import React from 'react';
import { FaCheckCircle, FaRegCalendarAlt, FaReceipt } from 'react-icons/fa';
import { getOrderTime } from '../utils/orders';

const formatDate = (value) => {
    const time = value ? new Date(value) : null;
    if (!time || isNaN(time)) return 'Date unavailable';
    return time.toLocaleDateString('en-IN', {
        day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
};

const ProcessedOrders = ({ processedOrders, usersMap }) => {
    // Newest first, tolerant of whichever timestamp field the order was written with.
    const sortedOrders = [...processedOrders].sort(
        (a, b) => new Date(getOrderTime(b) || 0) - new Date(getOrderTime(a) || 0)
    );

    if (sortedOrders.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                    <FaReceipt className="text-2xl text-gray-400" />
                </div>
                <p className="text-gray-900 font-bold">No completed orders yet</p>
                <p className="text-gray-500 text-sm font-medium mt-1">Finished trades will appear here.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-3">
            {sortedOrders.map(order => (
                <div
                    key={order.id}
                    className="group flex items-center gap-4 bg-white border border-gray-100 rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-gray-200 transition-all"
                >
                    <div className="w-11 h-11 flex-shrink-0 rounded-xl bg-green-50 text-green-600 flex items-center justify-center">
                        <FaCheckCircle className="text-xl" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <h3 className="font-extrabold text-gray-900 truncate">
                            {usersMap[order.userId]?.name || 'Unknown Customer'}
                        </h3>
                        <p className="text-xs text-gray-500 font-semibold flex items-center gap-1.5 mt-0.5">
                            <FaRegCalendarAlt className="flex-shrink-0" />
                            {formatDate(getOrderTime(order))}
                        </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                        <span className="block text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">Total</span>
                        <span className="text-lg font-black text-gray-900">
                            ₹{parseFloat(order.totalAmount || 0).toFixed(2)}
                        </span>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default ProcessedOrders;
