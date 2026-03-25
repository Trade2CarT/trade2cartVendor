import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { ref as dbRef, set, get } from 'firebase/database';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { signOut } from 'firebase/auth';
import { auth, db, storage } from '../firebase';
import { FaUser, FaMapMarkerAlt, FaIdCard, FaFileUpload, FaExclamationCircle, FaCamera, FaSignOutAlt, FaCrosshairs } from 'react-icons/fa';
import SEO from '../components/SEO';
import logo from '../assets/images/logo.PNG';
import Loader from './Loader';
import PolicyModal from '../components/PolicyModal';
import { TermsAndConditions, PrivacyPolicy } from '../components/Agreement';

// --- ENHANCEMENT: Visual Document Previews included in FileInput ---
const FileInput = ({ label, icon, onChange, file, error, accept }) => (
    <div className="flex flex-col mb-4">
        <label className="block text-sm font-semibold text-gray-700 mb-2">{label}</label>
        <div className="flex items-center gap-4">
            <label className={`flex-1 flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-xl cursor-pointer hover:bg-gray-50 transition-colors ${error ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}>
                {icon}
                <span className="mt-2 text-sm text-gray-500 text-center">Click to upload {label}</span>
                <input type="file" className="hidden" accept={accept} onChange={onChange} />
            </label>
            {file && (
                <div className="w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden border border-gray-200 shadow-sm">
                    <img src={URL.createObjectURL(file)} alt="Preview" className="w-full h-full object-cover" />
                </div>
            )}
        </div>
        {error && <p className="text-xs text-red-600 mt-1 flex items-center gap-1"><FaExclamationCircle /> {error}</p>}
    </div>
);

const TextInput = ({ name, placeholder, value, onChange, onBlur, error, icon, maxLength, type = "text" }) => (
    <div className="relative mb-4">
        {icon && <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">{icon}</div>}
        <input
            type={type} name={name} placeholder={placeholder} value={value}
            onChange={onChange} onBlur={onBlur} maxLength={maxLength}
            className={`w-full ${icon ? 'pl-11' : 'pl-4'} pr-4 py-3 border rounded-xl focus:ring-2 ${error ? 'border-red-400 focus:ring-red-200' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-100'} transition-shadow`}
        />
        {error && <p className="text-xs text-red-500 mt-1 ml-1">{error}</p>}
    </div>
);

const RegisterForm = () => {
    const navigate = useNavigate();
    // --- ENHANCEMENT: Step Wizard State ---
    const [step, setStep] = useState(1);

    const [formData, setFormData] = useState({ name: '', location: '', address: '', aadhaar: '', pan: '', license: '' });
    const [files, setFiles] = useState({ profilePhoto: null, aadhaarPhoto: null, panPhoto: null, licensePhoto: null });
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
            } catch  { toast.error("Error fetching locations."); }
            finally { setIsFetching(false); }
        };
        fetchLocations();
    }, []);

    const validateField = (name, value) => {
        if (!value) return "This field is required.";
        if (name === 'aadhaar' && !/^\d{12}$/.test(value)) return 'Aadhaar must be 12 digits.';
        if (name === 'pan' && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(value)) return 'Invalid PAN format.';
        return '';
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        const finalValue = name === 'pan' ? value.toUpperCase() : value;
        setFormData(prev => ({ ...prev, [name]: finalValue }));
        setFormErrors(prev => ({ ...prev, [name]: validateField(name, finalValue) }));
    };

    const handleFileChange = (e, key) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 250 * 1024) return toast.error(`File too large (max 250KB).`);
        setFiles(prev => ({ ...prev, [key]: file }));
        setFormErrors(prev => ({ ...prev, [key]: '' }));
    };

    // --- ENHANCEMENT: Step-by-Step Validation ---
    const nextStep = () => {
        let valid = true;
        let errors = {};
        if (step === 1) {
            if (!formData.name) { errors.name = "Name is required"; valid = false; }
            if (!files.profilePhoto) { errors.profilePhoto = "Profile photo required"; valid = false; }
        } else if (step === 2) {
            if (!formData.address) { errors.address = "Address is required"; valid = false; }
            if (!formData.location) { errors.location = "Location required"; valid = false; }
        }

        setFormErrors(errors);
        if (valid) setStep(step + 1);
        else toast.error("Please fill required fields before proceeding.");
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.aadhaar || !formData.pan || !files.aadhaarPhoto || !files.panPhoto || !agreedToTerms) {
            return toast.error("Please complete all document uploads and agree to terms.");
        }

        setLoading(true);
        const user = auth.currentUser;
        const uploadFile = async (file, path) => {
            const fileRef = storageRef(storage, path);
            await uploadBytes(fileRef, file);
            return await getDownloadURL(fileRef);
        };

        try {
            const filesToUpload = [
                { key: 'profilePhoto', file: files.profilePhoto },
                { key: 'aadhaarPhoto', file: files.aadhaarPhoto },
                { key: 'panPhoto', file: files.panPhoto },
                { key: 'licensePhoto', file: files.licensePhoto },
            ].filter(f => f.file);

            const uploadedUrls = {};
            for (let i = 0; i < filesToUpload.length; i++) {
                setLoaderText(`Uploading documents (${i + 1}/${filesToUpload.length})...`);
                const item = filesToUpload[i];
                uploadedUrls[item.key] = await uploadFile(item.file, `vendors/${user.uid}/${item.key}.${item.file.name.split('.').pop()}`);
            }

            setLoaderText("Finalizing...");
            await set(dbRef(db, `vendors/${user.uid}`), {
                ...formData, uid: user.uid, phone: user.phoneNumber, status: 'pending', createdAt: new Date().toISOString(),
                ...uploadedUrls
            });
            toast.success('Registration submitted!');
            navigate('/pending');
        } catch  { toast.error("Registration failed."); }
        finally { setLoading(false); setLoaderText(''); }
    };

    if (isFetching) return <Loader fullscreen />;

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center py-10 px-4">
            <div className="w-full max-w-xl mb-4 flex justify-between items-center">
                <img src={logo} alt="Trade2Cart" className="h-10" />
                <button onClick={() => signOut(auth)} className="text-sm font-semibold text-gray-500 hover:text-red-500 flex items-center gap-2"><FaSignOutAlt /> Sign Out</button>
            </div>

            <div className="w-full max-w-xl bg-white p-8 rounded-3xl shadow-xl border border-gray-100 relative">
                {loading && (
                    <div className="absolute inset-0 bg-white/90 z-20 flex flex-col items-center justify-center rounded-3xl backdrop-blur-sm">
                        <Loader />
                        <p className="mt-4 font-semibold text-gray-700">{loaderText}</p>
                    </div>
                )}

                {/* --- ENHANCEMENT: Wizard Progress Bar --- */}
                <div className="mb-8">
                    <h2 className="text-2xl font-bold text-gray-800">Become a Partner</h2>
                    <div className="flex items-center mt-4">
                        {[1, 2, 3].map(num => (
                            <React.Fragment key={num}>
                                <div className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold ${step >= num ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                                    {num}
                                </div>
                                {num < 3 && <div className={`flex-1 h-1 mx-2 rounded-full ${step > num ? 'bg-blue-600' : 'bg-gray-200'}`} />}
                            </React.Fragment>
                        ))}
                    </div>
                    <p className="text-gray-500 mt-2 text-sm text-center">
                        {step === 1 ? 'Personal Info' : step === 2 ? 'Business Address' : 'Document Uploads'}
                    </p>
                </div>

                <form className="space-y-4">
                    {/* STEP 1: Personal Info */}
                    {step === 1 && (
                        <div className="animate-fade-in">
                            <div className="flex flex-col items-center mb-6">
                                <label className="cursor-pointer relative group">
                                    <img src={files.profilePhoto ? URL.createObjectURL(files.profilePhoto) : `https://ui-avatars.com/api/?name=${formData.name || 'P'}&background=e2e8f0&color=64748b&size=120`} alt="Profile" className="w-28 h-28 rounded-full object-cover border-4 border-white shadow-lg group-hover:opacity-80 transition" />
                                    <div className="absolute bottom-0 right-0 bg-blue-600 p-2.5 rounded-full text-white shadow-md group-hover:bg-blue-700 transition">
                                        <FaCamera />
                                    </div>
                                </label>
                                <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'profilePhoto')} />
                                {formErrors.profilePhoto && <p className="text-xs text-red-600 mt-2">{formErrors.profilePhoto}</p>}
                            </div>
                            <TextInput name="name" placeholder="Full Name" value={formData.name} onChange={handleInputChange} error={formErrors.name} icon={<FaUser />} />
                        </div>
                    )}

                    {/* STEP 2: Address */}
                    {step === 2 && (
                        <div className="animate-fade-in">
                            {/* Smart Location dummy button ui */}
                            <div className="flex justify-end mb-2">
                                <button type="button" className="text-sm flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium bg-blue-50 px-3 py-1.5 rounded-lg"><FaCrosshairs /> Detect Location</button>
                            </div>
                            <div className="relative mb-4">
                                <FaMapMarkerAlt className="absolute left-4 top-4 text-gray-400" />
                                <textarea name="address" placeholder="Full Business Address" value={formData.address} onChange={handleInputChange} className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-500" rows="3" />
                                {formErrors.address && <p className="text-xs text-red-600 mt-1">{formErrors.address}</p>}
                            </div>
                            <select name="location" value={formData.location} onChange={handleInputChange} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white">
                                {locations.map((loc) => <option key={loc} value={loc}>{loc}</option>)}
                            </select>
                        </div>
                    )}

                    {/* STEP 3: Documents */}
                    {step === 3 && (
                        <div className="animate-fade-in">
                            <TextInput name="aadhaar" placeholder="Aadhaar Number" value={formData.aadhaar} onChange={handleInputChange} error={formErrors.aadhaar} icon={<FaIdCard />} maxLength={12} />
                            <FileInput label="Aadhaar Photo" icon={<FaFileUpload className="text-blue-500 text-2xl" />} onChange={(e) => handleFileChange(e, 'aadhaarPhoto')} file={files.aadhaarPhoto} />

                            <TextInput name="pan" placeholder="PAN Number" value={formData.pan} onChange={handleInputChange} error={formErrors.pan} icon={<FaIdCard />} maxLength={10} />
                            <FileInput label="PAN Photo" icon={<FaFileUpload className="text-green-500 text-2xl" />} onChange={(e) => handleFileChange(e, 'panPhoto')} file={files.panPhoto} />

                            <div className="pt-4 border-t border-gray-200">
                                <label className="flex items-start gap-3 cursor-pointer">
                                    <input type="checkbox" checked={agreedToTerms} onChange={(e) => setAgreedToTerms(e.target.checked)} className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-0.5" />
                                    <span className="text-sm text-gray-600">I agree to the <span onClick={(e) => { e.preventDefault(); setModalContent('terms') }} className="text-blue-600 font-semibold hover:underline">Terms</span> & <span onClick={(e) => { e.preventDefault(); setModalContent('privacy') }} className="text-blue-600 font-semibold hover:underline">Privacy Policy</span>.</span>
                                </label>
                            </div>
                        </div>
                    )}

                    {/* Navigation Buttons */}
                    <div className="flex gap-4 pt-6">
                        {step > 1 && (
                            <button type="button" onClick={() => setStep(step - 1)} className="flex-1 py-3.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition">Back</button>
                        )}
                        {step < 3 ? (
                            <button type="button" onClick={nextStep} className="flex-1 py-3.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition shadow-lg">Next Step</button>
                        ) : (
                            <button type="button" onClick={handleSubmit} className="flex-1 py-3.5 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition shadow-lg">Submit Form</button>
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