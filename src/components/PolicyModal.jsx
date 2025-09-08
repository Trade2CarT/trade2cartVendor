import React, { useEffect, useState } from 'react';
import { FaTimes } from 'react-icons/fa';

const PolicyModal = ({ children, onClose, isOpen }) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            const timer = setTimeout(() => setIsVisible(true), 10); // Short delay for transition
            return () => clearTimeout(timer);
        } else {
            // Only set overflow back when the component is not open
            document.body.style.overflow = 'unset';
            setIsVisible(false);
        }
    }, [isOpen]);

    // Render nothing if the modal is not open
    if (!isOpen) return null;

    return (
        <div
            // Overlay with fade-in animation
            className={`fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 transition-opacity duration-300 ease-out ${isVisible ? 'opacity-100' : 'opacity-0'}`}
            onClick={onClose}
        >
            <div
                // Modal content with slide-up and scale animation
                className={`bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col transition-all duration-300 ease-out ${isVisible ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-8 opacity-0 scale-95'}`}
                onClick={e => e.stopPropagation()} // Prevents closing modal on content click
            >
                <div className="flex-shrink-0 p-4 border-b flex justify-end items-center">
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-colors"
                        aria-label="Close modal"
                    >
                        <FaTimes size={20} />
                    </button>
                </div>
                <div className="overflow-y-auto p-6 md:p-8">
                    {children}
                </div>
            </div>
        </div>
    );
};

export default PolicyModal;