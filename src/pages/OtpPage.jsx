// src/pages/OtpPage.jsx
import React, { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { db } from '../firebase'
import { ref, get, query, orderByChild, equalTo } from 'firebase/database'

const OtpPage = () => {
    const [otp, setOtp] = useState('')
    const navigate = useNavigate()
    const { state } = useLocation()
    const { confirmationResult, phone } = state || {}

    const handleVerifyOtp = async () => {
        if (!confirmationResult) {
            return toast.error("Session expired. Please try again.");
        }
        try {
            const result = await confirmationResult.confirm(otp)
            const user = result.user
            toast.success('🎉 OTP Verified Successfully!')

            // --- YOUR EXISTING LOGIC, NOW WITH FIREBASE ---
            const vendorsRef = ref(db, 'vendors')
            const q = query(vendorsRef, orderByChild('phone'), equalTo(phone))
            const snapshot = await get(q)

            if (snapshot.exists()) {
                const vendorData = snapshot.val()
                const vendorId = Object.keys(vendorData)[0]
                const fullVendorProfile = vendorData[vendorId]
                toast.info('Welcome back! Redirecting to dashboard...')
                navigate('/dashboard', { state: { user: fullVendorProfile } })
            } else {
                toast.info('New user! Please complete registration.')
                navigate('/register', { state: { uid: user.uid, phone: phone } })
            }
            // --- END OF YOUR LOGIC MIGRATION ---

        } catch (error) {
            toast.error('❌ Incorrect OTP. Please try again.')
            console.error(error)
        }
    }

    return (
        <div className="login-container">
            <h2>Verify Your Number</h2>
            <p>Enter the 6-digit OTP sent to +91 {phone}.</p>
            <input
                type="text"
                maxLength="6"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
            />
            <button onClick={handleVerifyOtp}>Verify & Continue</button>
        </div>
    )
}

export default OtpPage