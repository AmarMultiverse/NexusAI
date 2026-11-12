import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { User, Mail, Lock, Loader2, ArrowRight, ShieldCheck, KeyRound } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'https://nexusai-backend-966g.onrender.com';

const Register = () => {
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState(1); // 1 = Registration Form, 2 = 6-Digit OTP Verification
  const [demoOtpHint, setDemoOtpHint] = useState(null);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const loginSuccess = useAuthStore((state) => state.loginSuccess);

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/register`, formData);
      toast.success(response.data.message);
      if (response.data.demoOtp) {
        setDemoOtpHint(response.data.demoOtp);
      }
      setStep(2);
    } catch (error) {
      toast.error(error.response?.data?.message || "Registration failed!");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/verify-otp`, {
        email: formData.email,
        otp
      });
      toast.success(response.data.message);
      loginSuccess(response.data.user, response.data.token);
      navigate('/');
    } catch (error) {
      toast.error(error.response?.data?.message || "Invalid OTP code!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4">
      <div className="max-w-md w-full bg-gray-900 border border-gray-800 p-8 rounded-2xl shadow-xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">NexusAI</h1>
          <p className="text-gray-400">
            {step === 1 ? "Create an account to save your chat history" : "Verify your email address"}
          </p>
        </div>

        {step === 1 ? (
          <form onSubmit={handleRegister} className="space-y-5">
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-5 h-5" />
              <input
                type="text"
                placeholder="Full Name"
                required
                className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg py-3 pl-10 pr-4 focus:outline-none focus:border-blue-500 transition-colors"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-5 h-5" />
              <input
                type="email"
                placeholder="Valid Email Address"
                required
                className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg py-3 pl-10 pr-4 focus:outline-none focus:border-blue-500 transition-colors"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-5 h-5" />
              <input
                type="password"
                placeholder="Password (Min. 6 characters)"
                required
                minLength={6}
                className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg py-3 pl-10 pr-4 focus:outline-none focus:border-blue-500 transition-colors"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg flex items-center justify-center transition-colors"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Send Verification OTP"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-5">
            <div className="bg-blue-950/40 border border-blue-800/60 rounded-lg p-3 text-xs text-blue-200 space-y-1">
              <div className="flex items-center gap-2 font-semibold text-blue-400">
                <ShieldCheck className="w-4 h-4" /> 6-Digit OTP Verification
              </div>
              <p>Enter the 6-digit code sent to <strong>{formData.email}</strong>.</p>
              {demoOtpHint && (
                <p className="text-amber-300 font-mono mt-1">
                  Instant Verification Code: <strong>{demoOtpHint}</strong>
                </p>
              )}
            </div>

            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-5 h-5" />
              <input
                type="text"
                placeholder="Enter 6-digit OTP"
                required
                maxLength={6}
                className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg py-3 pl-10 pr-4 tracking-widest font-mono text-lg focus:outline-none focus:border-blue-500 transition-colors"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              />
            </div>

            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-700 text-white font-medium py-3 rounded-lg flex items-center justify-center transition-colors"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verify & Sign In"}
            </button>

            <button
              type="button"
              onClick={() => setStep(1)}
              className="w-full text-xs text-gray-400 hover:text-white text-center"
            >
              Change email address
            </button>
          </form>
        )}

        <div className="mt-4 pt-4 border-t border-gray-800">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="w-full bg-gray-800 hover:bg-gray-700 text-gray-200 font-medium py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors text-sm"
          >
            Back to Guest Chat (Your Chat is Saved) <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <p className="text-gray-400 text-center mt-6 text-sm">
          Already have an account?{' '}
          <Link to="/login" className="text-blue-500 hover:text-blue-400 font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;