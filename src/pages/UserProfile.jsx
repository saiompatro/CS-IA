import { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';

// UserProfile component for employees to view their own data
const UserProfile = () => {
  const [userData, setUserData] = useState(null);
  const [userEntries, setUserEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingEntries, setLoadingEntries] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          return;
        }
        
        // Fetch user data
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          setUserData(userDoc.data());
        }
        
        // Fetch user entries
        await fetchUserEntries(user.uid);
      } catch (err) {
        console.error('Error fetching user data:', err);
        setError('Failed to load user profile. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserData();
  }, []);
  
  // Fetch entries created by the current user
  const fetchUserEntries = async (userId) => {
    try {
      setLoadingEntries(true);
      
      // Fetch countries created by the user
      const countriesRef = collection(db, 'countries');
      const countriesQuery = query(countriesRef, where('createdBy', '==', userId));
      const countriesSnapshot = await getDocs(countriesQuery);
      
      const countries = countriesSnapshot.docs.map(doc => ({
        id: doc.id,
        type: 'country',
        ...doc.data()
      }));
      
      // Fetch clients created by the user
      const clientsRef = collection(db, 'clients');
      const clientsQuery = query(clientsRef, where('createdBy', '==', userId));
      const clientsSnapshot = await getDocs(clientsQuery);
      
      const clients = clientsSnapshot.docs.map(doc => ({
        id: doc.id,
        type: 'client',
        ...doc.data()
      }));
      
      // Combine and sort by creation date
      const allEntries = [...countries, ...clients].sort((a, b) => 
        new Date(b.createdAt) - new Date(a.createdAt)
      );
      
      setUserEntries(allEntries);
    } catch (err) {
      console.error('Error fetching user entries:', err);
      setError('Failed to load user entries. Please try again later.');
    } finally {
      setLoadingEntries(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-xl">Loading profile...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto">
      <h1 className="text-2xl font-bold mb-6">My Profile</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      )}
      
      {/* User Info Card */}
      {userData && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">User Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-gray-600 mb-1">Email</div>
              <div className="font-medium">{userData.email}</div>
            </div>
            <div>
              <div className="text-gray-600 mb-1">Position</div>
              <div className="font-medium">{userData.position}</div>
            </div>
            <div>
              <div className="text-gray-600 mb-1">Role</div>
              <div className="font-medium capitalize">{userData.role || 'employee'}</div>
            </div>
            <div>
              <div className="text-gray-600 mb-1">Member Since</div>
              <div className="font-medium">{new Date(userData.createdAt).toLocaleDateString()}</div>
            </div>
          </div>
        </div>
      )}
      
      {/* User Entries Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">My Entries</h2>
        
        {loadingEntries ? (
          <p className="text-center text-gray-500 py-4">Loading entries...</p>
        ) : userEntries.length === 0 ? (
          <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-6 text-center text-yellow-700">
            <p>You haven't created any entries yet.</p>
            <p className="mt-2">Go to the Dashboard to add countries and clients.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created At</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {userEntries.map(entry => (
                  <tr key={entry.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{entry.name}</div>
                      {entry.type === 'client' && (
                        <div className="text-sm text-gray-500">Country: {entry.countryName}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${entry.type === 'country' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                        {entry.type.charAt(0).toUpperCase() + entry.type.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(entry.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserProfile; 