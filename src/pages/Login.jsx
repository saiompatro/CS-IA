import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { auth, db } from '../firebase'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'

// Component for user authentication
const Login = () => {
  // Navigation hook and form state management
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [userType, setUserType] = useState('employee');

  // Handle form submission and user authentication
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setError('');
      setLoading(true);
      
      // Authenticate user with email and password
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Check if user is authorized for the selected role
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        
        if (userType === 'admin' && userData.role !== 'admin') {
          await auth.signOut();
          setError('You are not authorized to log in as an admin.');
          setLoading(false);
          return;
        }
        
        // Store the user role in local storage for access across the app
        localStorage.setItem('userRole', userType);
      }
      
      // Redirect to dashboard on successful login
      navigate('/dashboard');
    } catch (error) {
      setError('Failed to log in. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  // Render login form with error handling
  return (
    <div className="min-h-screen flex items-center justify-center bg-red-900">
      <div className="bg-zinc-500 p-8 rounded-lg shadow-md w-full max-w-sm border-2 border-white">
        {/* Title */}
        <h2 className="text-3xl font-bold text-center mb-6">Login</h2>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-2 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {/* Login Type Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">
              Login As
            </label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="userType"
                  value="employee"
                  checked={userType === 'employee'}
                  onChange={() => setUserType('employee')}
                  className="mr-2"
                />
                Employee
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="userType"
                  value="admin"
                  checked={userType === 'admin'}
                  onChange={() => setUserType('admin')}
                  className="mr-2"
                />
                Admin
              </label>
            </div>
          </div>

          {/* Email Input */}
          <div className="mb-4">
            <label htmlFor="email" className="block text-sm font-medium mb-1">
              Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md bg-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500"
              required
            />
          </div>

          {/* Password Input */}
          <div className="mb-6">
            <label htmlFor="password" className="block text-sm font-medium mb-1">
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md bg-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500"
              required
            />
          </div>

          {/* Login Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-stone-600 text-white py-2 rounded-md hover:bg-stone-900 hover:text-white border-white transition duration-200 disabled:opacity-50"
          >
            {loading ? 'Logging in...' : 'Login now'}
          </button>
        </form>

        {/* Sign Up Link */}
        <p className="mt-4 text-center text-sm">
          Don't have an account?{' '}
          <Link to="/signup" className="text-blue-800 text-underline hover:text-blue-900 hover:underline">
            Sign up here
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;