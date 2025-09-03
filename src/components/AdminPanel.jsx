// Import React hooks for state management and side effects
import { useState, useEffect } from 'react';
// Import React Router hook for programmatic navigation
import { useNavigate } from 'react-router-dom';
// Import Firebase database instance
import { db } from '../firebase';
// Import Firestore functions for database operations
import { collection, query, where, getDocs, deleteDoc, doc, addDoc } from 'firebase/firestore';

// Admin Panel component for admin users to manage employees and their data
const AdminPanel = () => {
  // Hook for programmatic navigation to other routes
  const navigate = useNavigate();
  
  // State for managing the list of all employees
  const [users, setUsers] = useState([]);
  // State to track loading status when fetching employee data
  const [loading, setLoading] = useState(true);
  // State to store and display error messages
  const [error, setError] = useState(null);
  // State to track which employee is currently selected for detailed view
  const [selectedUser, setSelectedUser] = useState(null);
  // State to store entries (countries, clients) created by the selected employee
  const [userEntries, setUserEntries] = useState([]);
  // State to track loading status when fetching employee entries
  const [loadingEntries, setLoadingEntries] = useState(false);
  // State to track the chat clearing operation progress
  const [clearingChat, setClearingChat] = useState(false);
  // State to store user role for permission-based features
  const [userRole, setUserRole] = useState(localStorage.getItem('userRole') || 'employee');

  // Fetch all employees (non-admin users)
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const usersRef = collection(db, 'users');
        const employeesQuery = query(usersRef, where('role', '==', 'employee'));
        const querySnapshot = await getDocs(employeesQuery);
        
        const usersList = querySnapshot.docs.map(doc => {
          try {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
              createdAt: data.createdAt || new Date(),
              position: data.position || 'Position not specified',
              salary: data.salary || null,
              adminNotes: data.adminNotes || null
            };
          } catch (error) {
            console.error('Error processing user data:', error, doc.id);
            return {
              id: doc.id,
              email: 'Error loading user data',
              position: 'Unknown',
              createdAt: new Date(),
              salary: null,
              adminNotes: null
            };
          }
        });
        
        setUsers(usersList);
      } catch (err) {
        console.error('Error fetching users:', err);
        setError('Failed to load employees. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchUsers();
  }, []);

  // Fetch entries created by a specific user
  const fetchUserEntries = async (userId) => {
    try {
      setLoadingEntries(true);
      setUserEntries([]);
      
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

  // Handle user selection
  const handleUserSelect = (user) => {
    setSelectedUser(user);
    fetchUserEntries(user.id);
  };

  // Handle user click to navigate to detail page
  const handleUserClick = (user) => {
    navigate(`/employee/${user.id}`);
  };

  // Handle salary payment for an employee
  const handlePaySalary = async (user) => {
    if (!window.confirm(`Are you sure you want to pay ₹${user.salary.toLocaleString()} to ${user.email}?`)) {
      return;
    }

    try {
      // Record the salary payment in the finances collection
      await addDoc(collection(db, 'salaryPayments'), {
        employeeId: user.id,
        employeeEmail: user.email,
        amount: user.salary,
        paidAt: new Date(),
        paidBy: auth.currentUser?.uid,
        paidByEmail: auth.currentUser?.email,
        month: new Date().getMonth() + 1, // Current month (1-12)
        year: new Date().getFullYear()
      });

      alert(`Salary of ₹${user.salary.toLocaleString()} has been paid to ${user.email}`);
    } catch (error) {
      console.error('Error recording salary payment:', error);
      alert('Failed to record salary payment. Please try again.');
    }
  };

  // Function to clear all chat messages
  const clearChat = async () => {
    if (!window.confirm('Are you sure you want to clear all chat messages? This action cannot be undone.')) {
      return;
    }

    try {
      setClearingChat(true);
      setError(null);

      // Get all messages
      const messagesRef = collection(db, 'messages');
      const messagesSnapshot = await getDocs(messagesRef);

      // Delete each message
      const deletePromises = messagesSnapshot.docs.map(doc => 
        deleteDoc(doc(db, 'messages', doc.id))
      );

      await Promise.all(deletePromises);
      alert('All chat messages have been cleared successfully.');
    } catch (err) {
      console.error('Error clearing chat:', err);
      setError('Failed to clear chat messages. Please try again later.');
    } finally {
      setClearingChat(false);
    }
  };

  return (
    <div className="mt-8 pt-6 padding-3 items-center">
      <div className="flex items-center mb-6 justify-center">
        <h2 className="text-2xl font-bold">Admin Dashboard</h2>
        <div className="ml-3 px-3 py-1 bg-blue-100 text-blue-800 rounded-lg text-sm font-medium justify-center">
          Admin Only Area
        </div>
      </div>
      
      <div className="flex justify-center mb-6">
        <button
          onClick={clearChat}
          disabled={clearingChat}
          className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {clearingChat ? 'Clearing Chat...' : 'Clear All Chat Messages'}
        </button>
      </div>
      
      <p className="text-gray-600 mb-6 flex justify-center items-center">
        Welcome to the Admin Dashboard. Here you can manage employees and view their activity.
      </p>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      )}
      
      <div className="grid grid-cols-1 gap-6 ml-6 justify-center">
        {/* Employee List - Full Width */}
        <div className="bg-gray-50 p-6 rounded-lg shadow-sm">
          <h3 className="font-semibold mb-4 flex items-center text-lg">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-3 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
              <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
            </svg>
            Employee Management
          </h3>
          
          {loading ? (
            <p className="text-center text-gray-500 py-4">Loading employees...</p>
          ) : users.length === 0 ? (
            <p className="text-center text-gray-500 py-4">No employees found</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {users.map(user => (
                <div 
                  key={user.id} 
                  className="bg-white p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
                  onClick={() => handleUserSelect(user)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                    <span className="text-xs text-gray-500 capitalize">{user.role || 'employee'}</span>
                  </div>
                  <div className="font-medium text-gray-900 mb-1">{user.email}</div>
                  <div className="text-sm text-gray-600 mb-2">{user.position || 'Position not specified'}</div>
                  <div className="text-xs text-gray-400">
                    Joined: {user.createdAt ? 
                      (user.createdAt.toDate ? new Date(user.createdAt.toDate()).toLocaleDateString() : 
                       new Date(user.createdAt).toLocaleDateString()) : 'Unknown'}
                  </div>
                  {user.salary && (
                    <div className="text-xs text-gray-500 mt-1">
                      Salary: ₹{user.salary.toLocaleString()}
                    </div>
                  )}
                  {user.adminNotes && (
                    <div className="text-xs text-gray-500 mt-1 truncate">
                      Notes: {user.adminNotes}
                    </div>
                  )}
                  <div className="mt-2 space-y-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUserClick(user);
                      }}
                      className="w-full bg-blue-100 hover:bg-blue-200 text-blue-700 text-xs py-1 px-2 rounded transition-colors"
                    >
                      View Full Details
                    </button>
                    {userRole === 'admin' && user.salary && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePaySalary(user);
                        }}
                        className="w-full bg-green-100 hover:bg-green-200 text-green-700 text-xs py-1 px-2 rounded transition-colors"
                      >
                        💰 Pay Salary
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Quick View Section */}
        {selectedUser && (
          <div className="bg-gray-50 p-6 rounded-lg shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-lg flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
                </svg>
                Quick View: {selectedUser.email}
              </h3>
              <button
                onClick={() => handleUserClick(selectedUser)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                View Full Details
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Employee Summary */}
              <div className="bg-white p-4 rounded-lg border">
                <h4 className="font-semibold mb-3 text-gray-800">Employee Summary</h4>
                <div className="space-y-2 text-sm">
                  <div><span className="font-medium">Email:</span> {selectedUser.email}</div>
                  <div><span className="font-medium">Position:</span> {selectedUser.position || 'Not specified'}</div>
                  <div><span className="font-medium">Role:</span> <span className="capitalize">{selectedUser.role || 'employee'}</span></div>
                  <div><span className="font-medium">Joined:</span> {selectedUser.createdAt ? 
                    (selectedUser.createdAt.toDate ? new Date(selectedUser.createdAt.toDate()).toLocaleDateString() : 
                     new Date(selectedUser.createdAt).toLocaleDateString()) : 'Unknown'}</div>
                  {selectedUser.salary && (
                    <div><span className="font-medium">Salary:</span> {selectedUser.salary}</div>
                  )}
                  {selectedUser.adminNotes && (
                    <div><span className="font-medium">Notes:</span> <span className="text-gray-600">{selectedUser.adminNotes}</span></div>
                  )}
                </div>
              </div>
              
              {/* Recent Entries */}
              <div className="bg-white p-4 rounded-lg border">
                <h4 className="font-semibold mb-3 text-gray-800">Recent Entries</h4>
                {loadingEntries ? (
                  <p className="text-center text-gray-500 py-4">Loading entries...</p>
                ) : userEntries.length === 0 ? (
                  <p className="text-center text-gray-500 py-4">No entries found</p>
                ) : (
                  <div className="space-y-2">
                    {userEntries.slice(0, 5).map(entry => (
                      <div key={entry.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                        <div>
                          <div className="font-medium text-sm">{entry.name}</div>
                          <div className="text-xs text-gray-500 capitalize">{entry.type}</div>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          entry.type === 'country' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {entry.type.charAt(0).toUpperCase() + entry.type.slice(1)}
                        </span>
                      </div>
                    ))}
                    {userEntries.length > 5 && (
                      <div className="text-center text-sm text-gray-500 mt-2">
                        +{userEntries.length - 5} more entries
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel; 