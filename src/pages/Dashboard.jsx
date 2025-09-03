import { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { CountryGrid } from '../components/CountryGrid.jsx';

// Main dashboard component for authenticated users
const Dashboard = () => {
  // User data state management
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch user data from Firestore on component mount
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const user = auth.currentUser;
        if (user) {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            setUserData(userDoc.data());
          }
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  // Show loading state while fetching user data
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  // Render dashboard with user info and country grid
  return (
    <div className="container mx-auto">
      <h1 className="text-2xl font-bold mb-6">Client Dashboard</h1>
      
      <div className="bg-white rounded-lg shadow-md p-6">
        {/* Country grid section */}
        <CountryGrid />
      </div>
    </div>
  );
};

export default Dashboard; 