import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { ref as dbRef, set, get } from 'firebase/database';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { signOut } from 'firebase/auth';
import { auth, db, storage } from '../firebase';
import { FaUser, FaMapMarkerAlt, FaIdCard, FaCamera, FaSignOutAlt } from 'react-icons/fa';
import SEO from '../components/SEO';
import logo from '../assets/images/logo.PNG';
import Loader from './Loader';
import PolicyModal from '../components/PolicyModal';
import { TermsAndConditions, PrivacyPolicy } from '../components/Agreement';

const FileInput = ({ label, icon, onChange, file, error, accept, capture }) => (
    <div className="flex flex-col mb-4">
        <label className="block text-sm font-extrabold text-gray-900 mb-2">{label}</label>
        <div className="flex items-center gap-4">
            <label className={`flex-1 flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl cursor-pointer bg-gray-50 active:bg-gray-200 transition-colors ${error ? 'border-red-400 bg-red-50' : 'border-gray-400'}`}>
                {icon}
                <span className="mt-2 text-sm text-gray-700 font-bold text-center">Tap to capture {label}</span>
                <input type="file" className="hidden" accept={accept} capture={capture} onChange={onChange} />
            </label>
            {file && (
                <div className="w-24 h-24 flex-shrink-0 rounded-xl overflow-hidden border-2 border-gray-300 shadow-sm">
                    <img src={URL.createObjectURL(file)} alt="Preview" className="w-full h-full object-cover" />
                </div>
            )}
        </div>
        {error && <p className="text-xs text-red-600 mt-1 font-bold">{error}</p>}
    </div>
);

const TextInput = ({ name, placeholder, value, onChange, error, icon, maxLength, type = "text", inputMode }) => (
    <div className="relative mb-4">
        {icon && <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-lg">{icon}</div>}
        <input
            type={type} name={name} placeholder={placeholder} value={value}
            onChange={onChange} maxLength={maxLength} inputMode={inputMode}
            className={`w-full ${icon ? 'pl-12' : 'pl-4'} pr-4 py-4 border-2 rounded-xl text-lg font-bold text-gray-900 focus:ring-0 ${error ? 'border-red-500 bg-red-50' : 'border-gray-300 focus:border-blue-600 bg-gray-50'}`}
        />
        {error && <p className="text-sm text-red-600 font-bold mt-1 ml-1">{error}</p>}
    </div>
);

const RegisterForm = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({ name: '', location: '', address: '', aadhaar: '', pan: '' });
    const [files, setFiles] = useState({ profilePhoto: null, aadhaarPhoto: null, panPhoto: null });
    const [formErrors, setFormErrors] = useState({});
    const [locations, setLocations] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isFetching, setIsFetching] = useState(true);
    const [loaderText, setLoaderText] = useState('');
    const [agreedToTerms, setAgreedToTerms] = useState(false);
    const [modalContent, setModalContent] = useState(null);

    useEffect(() => {
        const fetchLocations = async () => {
            try {
                const snapshot = await get(dbRef(db, 'locations'));
                if (snapshot.exists()) {
                    setLocations(snapshot.val());
                    if (snapshot.val().length > 0) setFormData(prev => ({ ...prev, location: snapshot.val()[0] }));
                }
            } catch { toast.error("Error fetching locations."); }
            finally { setIsFetching(false); }
        };
        fetchLocations();
    }, []);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        const finalValue = name === 'pan' ? value.toUpperCase() : value;
        setFormData(prev => ({ ...prev, [name]: finalValue }));
        setFormErrors(prev => ({ ...prev, [name]: '' })); // Clear error on typing
    };

    const handleFileChange = (e, key) => {
        const file = e.target.files[0];
        if (!file) return;
        setFiles(prev => ({ ...prev, [key]: file }));
        setFormErrors(prev => ({ ...prev, [key]: '' })); // Clear error on file select
    };

    // STRICT VALIDATION FOR NEXT STEP
    const nextStep = () => {
        let valid = true;
        let errors = {};

        if (step === 1) {
            if (!formData.name.trim()) { errors.name = "Full Name is mandatory"; valid = false; }
            if (!files.profilePhoto) { errors.profilePhoto = "Profile Photo is mandatory"; valid = false; }
        } else if (step === 2) {
            if (!formData.address.trim()) { errors.address = "Business Address is mandatory"; valid = false; }
            if (!formData.location) { errors.location = "Location selection is mandatory"; valid = false; }
        }

        setFormErrors(errors);

        if (valid) {
            setStep(step + 1);
        } else {
            toast.error("Please fill all mandatory fields to continue.");
        }
    };

    // STRICT VALIDATION FOR FINAL SUBMISSION
    const handleSubmit = async (e) => {
        e.preventDefault();
        let valid = true;
        let errors = {};

        if (!formData.aadhaar || formData.aadhaar.length !== 12) { errors.aadhaar = "Valid 12-digit Aadhaar is required"; valid = false; }
        if (!files.aadhaarPhoto) { errors.aadhaarPhoto = "Aadhaar Photo is mandatory"; valid = false; }
        if (!formData.pan || formData.pan.length !== 10) { errors.pan = "Valid 10-character PAN is required"; valid = false; }
        if (!files.panPhoto) { errors.panPhoto = "PAN Photo is mandatory"; valid = false; }

        setFormErrors(errors);

        if (!valid) {
            return toast.error("Please complete all mandatory document uploads.");
        }

        if (!agreedToTerms) {
            return toast.error("You must agree to the Terms & Privacy Policy.");
        }

        setLoading(true);
        const user = auth.currentUser;

        try {
            // Updated to use "URL" at the end of the keys so it maps correctly to the Header/Dashboard
            const filesToUpload = [
                { key: 'profilePhotoURL', file: files.profilePhoto },
                { key: 'aadhaarPhotoURL', file: files.aadhaarPhoto },
                { key: 'panPhotoURL', file: files.panPhoto },
            ];

            const uploadedUrls = {};
            for (let i = 0; i < filesToUpload.length; i++) {
                setLoaderText(`Uploading documents (${i + 1}/${filesToUpload.length})...`);
                const item = filesToUpload[i];
                const fileRef = storageRef(storage, `vendors/${user.uid}/${item.key}.${item.file.name.split('.').pop()}`);
                await uploadBytes(fileRef, item.file);
                uploadedUrls[item.key] = await getDownloadURL(fileRef);
            }

            setLoaderText("Finalizing...");
            await set(dbRef(db, `vendors/${user.uid}`), {
                ...formData, uid: user.uid, phone: user.phoneNumber, status: 'pending', createdAt: new Date().toISOString(),
                ...uploadedUrls
            });
            toast.success('Registration submitted!');
            navigate('/pending');
        } catch {
            toast.error("Registration failed. Please try again.");
        } finally {
            setLoading(false);
            setLoaderText('');
        }
    };

    if (isFetching) return <Loader fullscreen />;

    return (
        <div className="min-h-screen bg-white flex flex-col items-center py-6 px-4">
            <div className="w-full max-w-xl mb-6 flex justify-between items-center">
                <img src={logo} alt="Trade2Cart" className="h-8" />
                <button onClick={() => signOut(auth)} className="text-sm font-extrabold text-red-600 flex items-center gap-1 bg-red-50 px-3 py-2 rounded-lg"><FaSignOutAlt /> Logout</button>
            </div>

            <div className="w-full max-w-xl bg-white relative">
                {loading && (
                    <div className="absolute inset-0 bg-white/90 z-20 flex flex-col items-center justify-center rounded-3xl backdrop-blur-sm">
                        <Loader />
                        <p className="mt-4 font-extrabold text-xl text-gray-900">{loaderText}</p>
                    </div>
                )}

                <h2 className="text-3xl font-extrabold text-gray-900 mb-6">Partner Registration</h2>

                <form className="space-y-4">
                    {step === 1 && (
                        <div>
                            <div className="flex flex-col items-center mb-8">
                                <label className="cursor-pointer relative">
                                    <img src={files.profilePhoto ? URL.createObjectURL(files.profilePhoto) : `https://ui-avatars.com/api/?name=${formData.name || 'Vendor'}&background=e2e8f0&color=64748b&size=120`} alt="Profile" className="w-32 h-32 rounded-full object-cover border-4 border-gray-200 shadow-md" />
                                    <div className="absolute bottom-0 right-0 bg-blue-600 p-3 rounded-full text-white shadow-lg border-2 border-white">
                                        <FaCamera size={20} />
                                    </div>
                                    <input type="file" className="hidden" accept="image/*" capture="user" onChange={(e) => handleFileChange(e, 'profilePhoto')} />
                                </label>
                                <span className="mt-3 font-bold text-gray-600">Take a Selfie <span className="text-red-500">*</span></span>
                                {formErrors.profilePhoto && <p className="text-sm text-red-600 font-bold mt-1">{formErrors.profilePhoto}</p>}
                            </div>
                            <TextInput name="name" placeholder="Full Name *" value={formData.name} onChange={handleInputChange} error={formErrors.name} icon={<FaUser />} />
                        </div>
                    )}

                    {step === 2 && (
                        <div>
                            <div className="relative mb-4">
                                <FaMapMarkerAlt className="absolute left-4 top-5 text-gray-500 text-lg" />
                                <textarea name="address" placeholder="Full Business Address *" value={formData.address} onChange={handleInputChange} className={`w-full pl-12 pr-4 py-4 border-2 rounded-xl text-lg font-bold text-gray-900 focus:ring-0 ${formErrors.address ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-gray-50 focus:border-blue-600'}`} rows="3" />
                                {formErrors.address && <p className="text-sm text-red-600 font-bold mt-1">{formErrors.address}</p>}
                            </div>
                            <div className="relative mb-4">
                                <select name="location" value={formData.location} onChange={handleInputChange} className={`w-full px-4 py-4 border-2 rounded-xl text-lg font-bold text-gray-900 ${formErrors.location ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-gray-50 focus:border-blue-600'}`}>
                                    <option value="" disabled>Select Location *</option>
                                    {locations.map((loc) => <option key={loc} value={loc}>{loc}</option>)}
                                </select>
                                {formErrors.location && <p className="text-sm text-red-600 font-bold mt-1">{formErrors.location}</p>}
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div>
                            <TextInput name="aadhaar" type="tel" inputMode="numeric" placeholder="Aadhaar Number *" value={formData.aadhaar} onChange={handleInputChange} error={formErrors.aadhaar} icon={<FaIdCard />} maxLength={12} />
                            <FileInput label="Aadhaar Photo *" error={formErrors.aadhaarPhoto} capture="environment" icon={<FaCamera className="text-blue-500 text-3xl" />} onChange={(e) => handleFileChange(e, 'aadhaarPhoto')} file={files.aadhaarPhoto} />

                            <TextInput name="pan" inputMode="text" placeholder="PAN Number *" value={formData.pan} onChange={handleInputChange} error={formErrors.pan} icon={<FaIdCard />} maxLength={10} />
                            <FileInput label="PAN Photo *" error={formErrors.panPhoto} capture="environment" icon={<FaCamera className="text-green-500 text-3xl" />} onChange={(e) => handleFileChange(e, 'panPhoto')} file={files.panPhoto} />

                            <div className="pt-4 mt-6 border-t-2 border-gray-100">
                                <label className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl cursor-pointer">
                                    <input type="checkbox" checked={agreedToTerms} onChange={(e) => setAgreedToTerms(e.target.checked)} className="w-6 h-6 rounded border-gray-400 text-blue-600 focus:ring-blue-500" />
                                    <span className="text-md font-bold text-gray-700 leading-tight">I agree to the <span onClick={(e) => { e.preventDefault(); setModalContent('terms') }} className="text-blue-600 underline">Terms</span> & <span onClick={(e) => { e.preventDefault(); setModalContent('privacy') }} className="text-blue-600 underline">Privacy Policy</span>. <span className="text-red-500">*</span></span>
                                </label>
                            </div>
                        </div>
                    )}

                    <div className="flex gap-4 pt-6 mt-8">
                        {step > 1 && <button type="button" onClick={() => setStep(step - 1)} className="flex-1 py-4 bg-gray-200 text-gray-800 font-extrabold text-lg rounded-xl active:bg-gray-300 transition">Back</button>}
                        {step < 3 ? (
                            <button type="button" onClick={nextStep} className="flex-1 py-4 bg-blue-600 text-white font-extrabold text-lg rounded-xl active:bg-blue-700 transition shadow-lg">Next Step</button>
                        ) : (
                            <button type="button" onClick={handleSubmit} className="flex-1 py-4 bg-green-600 text-white font-extrabold text-lg rounded-xl active:bg-green-700 transition shadow-lg">Submit</button>
                        )}
                    </div>
                </form>
            </div>
            <PolicyModal isOpen={!!modalContent} onClose={() => setModalContent(null)}>
                {modalContent === 'terms' && <TermsAndConditions />}
                {modalContent === 'privacy' && <PrivacyPolicy />}
            </PolicyModal>
        </div>
    );
};

export default RegisterForm;