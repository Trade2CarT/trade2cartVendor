import React from 'react';
import { FaCheckCircle, FaCalendarAlt } from 'react-icons/fa';

const ProcessedOrders = ({ processedOrders, usersMap }) => {
    // Ungrouped: Sort strictly by newest first so you see every individual order
    const sortedOrders = [...processedOrders].sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));

    return (
        <div className="flex flex-col gap-4">
            {sortedOrders.length === 0 ? (
                <div className="text-center py-10">
                    <FaCheckCircle className="text-4xl text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 font-bold">You have no completed orders yet.</p>
                </div>
            ) : (
                sortedOrders.map(order => (
                    <div key={order.id} className="bg-white border-2 border-gray-100 rounded-2xl p-4 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1.5 h-full bg-green-500"></div>
                        <div className="flex justify-between items-start mb-2 pl-2">
                            <div>
                                <h3 className="font-extrabold text-lg text-gray-900">{usersMap[order.userId]?.name || 'Unknown Customer'}</h3>
                                <p className="text-xs text-gray-500 font-semibold flex items-center gap-1 mt-1">
                                    <FaCalendarAlt />
                                    {order.timestamp ? new Date(order.timestamp).toLocaleDateString('en-IN', {
                                        day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                                    }) : 'N/A'}
                                </p>
                            </div>
                            <div className="text-right">
                                <span className="block text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">Total Bill</span>
                                <span className="text-xl font-extrabold text-green-600">₹{parseFloat(order.totalAmount || 0).toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                ))
            )}
        </div>
    );
};

export default ProcessedOrders;