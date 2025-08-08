// src/pages/LoginPage.jsx
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth'
import { auth } from '../firebase'

const LoginPage = () => {
    const [phone, setPhone] = useState('')
    const navigate = useNavigate()

    const handleGetOtp = async () => {
        if (phone.length !== 10) {
            return toast.error('Please enter a valid 10-digit mobile number.')
        }
        try {
            window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', { size: 'invisible' });
            const phoneNumber = `+91${phone}`
            const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, window.recaptchaVerifier)

            toast.success('OTP Sent!')
            navigate('/otp', { state: { confirmationResult, phone } })
        } catch (error) {
            toast.error('Failed to send OTP. Please try again.')
            console.error(error)
        }
    }

    return (
        <div className="login-container">
            <div id="recaptcha-container"></div>
            <h2>Welcome Partner!</h2>
            <p>Enter your phone number to continue.</p>
            <input
                type="tel"
                maxLength="10"
                placeholder="10-digit mobile"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
            />
            <button onClick={handleGetOtp}>Get OTP</button>
        </div>
    )
}

export default LoginPage