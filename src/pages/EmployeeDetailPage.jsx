// Import React hooks for state management and side effects
import { useState, useEffect } from 'react';
// Import React Router hooks for URL parameters and navigation
import { useParams, useNavigate } from 'react-router-dom';
// Import Firebase services for database and authentication
import { db, auth } from '../firebase';
// Import Firestore functions for CRUD operations and batch writes
import { doc, getDoc, updateDoc, deleteDoc, collection, query, where, getDocs, writeBatch, addDoc } from 'firebase/firestore';

const EmployeeDetailPage = () => {
  const { employeeId } = useParams();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userRole, setUserRole] = useState('employee');
  const [editing, setEditing] = useState(false);
  const [editedEmployee, setEditedEmployee] = useState({});
  const [showOffboardModal, setShowOffboardModal] = useState(false);
  const [offboarding, setOffboarding] = useState(false);

  useEffect(() => {
    const role = localStorage.getItem('userRole') || 'employee';
    setUserRole(role);
    
    if (role !== 'admin') {
      navigate('/admin');
      return;
    }

    fetchEmployee();
  }, [employeeId, navigate]);

  const fetchEmployee = async () => {
    try {
      setLoading(true);
      const employeeDoc = await getDoc(doc(db, 'users', employeeId));
      
      if (!employeeDoc.exists()) {
        setError('Employee not found');
        return;
      }

      const employeeData = { id: employeeDoc.id, ...employeeDoc.data() };
      setEmployee(employeeData);
      setEditedEmployee(employeeData);
      setError(null);
    } catch (err) {
      console.error('Error fetching employee:', err);
      setError('Failed to load employee details');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      await updateDoc(doc(db, 'users', employeeId), editedEmployee);
      setEmployee(editedEmployee);
      setEditing(false);
      alert('Employee details updated successfully!');
    } catch (err) {
      console.error('Error updating employee:', err);
      alert('Failed to update employee details');
    }
  };

  // Handle salary payment for the employee
  const handlePaySalary = async (employee) => {
    if (!window.confirm(`Are you sure you want to pay ₹${employee.salary.toLocaleString()} to ${employee.email}?`)) {
      return;
    }

    try {
      // Record the salary payment in the finances collection
      await addDoc(collection(db, 'salaryPayments'), {
        employeeId: employee.id,
        employeeEmail: employee.email,
        amount: employee.salary,
        paidAt: new Date(),
        paidBy: auth.currentUser?.uid,
        paidByEmail: auth.currentUser?.email,
        month: new Date().getMonth() + 1, // Current month (1-12)
        year: new Date().getFullYear()
      });

      alert(`Salary of ₹${employee.salary.toLocaleString()} has been paid to ${employee.email}`);
    } catch (error) {
      console.error('Error recording salary payment:', error);
      alert('Failed to record salary payment. Please try again.');
    }
  };

  const handleOffboard = async () => {
    if (!window.confirm('Are you sure you want to offboard this employee? This action cannot be undone and will delete their account while preserving their entries.')) {
      return;
    }

    try {
      setOffboarding(true);
      
      // Get admin email
      const adminEmail = auth.currentUser?.email;
      const adminUid = auth.currentUser?.uid;
      
      if (!adminEmail || !adminUid) {
        throw new Error('Admin authentication required');
      }
      
      // Update all entries created by this employee to show admin email instead
      const batch = writeBatch(db);
      
      // Update countries
      const countriesRef = collection(db, 'countries');
      const countriesQuery = query(countriesRef, where('createdBy', '==', employeeId));
      const countriesSnapshot = await getDocs(countriesQuery);
      
      countriesSnapshot.docs.forEach(doc => {
        batch.update(doc.ref, { 
          createdBy: adminUid,
          createdByEmail: adminEmail 
        });
      });
      
      // Update clients
      const clientsRef = collection(db, 'clients');
      const clientsQuery = query(clientsRef, where('createdBy', '==', employeeId));
      const clientsSnapshot = await getDocs(clientsQuery);
      
      clientsSnapshot.docs.forEach(doc => {
        batch.update(doc.ref, { 
          createdBy: adminUid,
          createdByEmail: adminEmail 
        });
      });
      
      // Update calendar events
      const eventsRef = collection(db, 'calendarEvents');
      const eventsQuery = query(eventsRef, where('userId', '==', employeeId));
      const eventsSnapshot = await getDocs(eventsQuery);
      
      eventsSnapshot.docs.forEach(doc => {
        batch.update(doc.ref, { 
          userId: adminUid,
          userEmail: adminEmail 
        });
      });
      
      // Commit all updates
      await batch.commit();
      
      // Delete the employee's user account
      await deleteDoc(doc(db, 'users', employeeId));
      
      alert('Employee has been successfully offboarded. Their entries have been transferred to your account.');
      navigate('/admin');
    } catch (err) {
      console.error('Error offboarding employee:', err);
      alert('Failed to offboard employee. Please try again.');
    } finally {
      setOffboarding(false);
      setShowOffboardModal(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
        <button
          onClick={() => navigate('/admin')}
          className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
        >
          Back to Admin Panel
        </button>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="p-6">
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded relative" role="alert">
          <span className="block sm:inline">Employee not found</span>
        </div>
        <button
          onClick={() => navigate('/admin')}
          className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
        >
          Back to Admin Panel
        </button>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <button
          onClick={() => navigate('/admin')}
          className="flex items-center text-blue-600 hover:text-blue-800 mb-4"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Admin Panel
        </button>
        
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Employee Details</h1>
          <div className="flex space-x-3">
            {editing ? (
              <>
                <button
                  onClick={handleSave}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Save Changes
                </button>
                <button
                  onClick={() => {
                    setEditing(false);
                    setEditedEmployee(employee);
                  }}
                  className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                onClick={() => setEditing(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Edit Employee
              </button>
            )}
            <button
              onClick={() => setShowOffboardModal(true)}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Offboard Employee
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Information */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Basic Information</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              {editing ? (
                <input
                  type="email"
                  value={editedEmployee.email || ''}
                  onChange={(e) => setEditedEmployee({ ...editedEmployee, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <p className="text-gray-900">{employee.email}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
              {editing ? (
                <input
                  type="text"
                  value={editedEmployee.position || ''}
                  onChange={(e) => setEditedEmployee({ ...editedEmployee, position: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <p className="text-gray-900">{employee.position || 'Not specified'}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <p className="text-gray-900 capitalize">{employee.role || 'employee'}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Joined Date</label>
              <p className="text-gray-900">
                {employee.createdAt ? 
                  (employee.createdAt.toDate ? new Date(employee.createdAt.toDate()).toLocaleDateString() : 
                   new Date(employee.createdAt).toLocaleDateString()) : 'Unknown'}
              </p>
            </div>
          </div>
        </div>

        {/* Additional Information */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Additional Information</h2>
          
          <div className="space-y-4">
                          <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Salary (₹)</label>
                {editing ? (
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={editedEmployee.salary || ''}
                    onChange={(e) => setEditedEmployee({ ...editedEmployee, salary: parseInt(e.target.value) || 0 })}
                    placeholder="Enter salary amount in rupees"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <div className="flex items-center justify-between">
                    <p className="text-gray-900">
                      {employee.salary ? `₹${employee.salary.toLocaleString()}` : 'Not specified'}
                    </p>
                    {employee.salary && userRole === 'admin' && (
                      <button
                        onClick={() => handlePaySalary(employee)}
                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm transition-colors"
                      >
                        💰 Pay Salary
                      </button>
                    )}
                  </div>
                )}
              </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Admin Notes</label>
              {editing ? (
                <textarea
                  value={editedEmployee.adminNotes || ''}
                  onChange={(e) => setEditedEmployee({ ...editedEmployee, adminNotes: e.target.value })}
                  placeholder="Add notes about this employee"
                  rows="4"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <p className="text-gray-900 whitespace-pre-wrap">{employee.adminNotes || 'No notes added'}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Offboard Modal */}
      {showOffboardModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4 text-red-600">Offboard Employee</h3>
            
            <div className="mb-6">
              <p className="text-gray-700 mb-4">
                Are you sure you want to offboard <strong>{employee.email}</strong>?
              </p>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-semibold text-yellow-800 mb-2">What happens when you offboard:</h4>
                <ul className="text-sm text-yellow-700 space-y-1">
                  <li>• Employee's account will be deleted</li>
                  <li>• All their entries (countries, clients, calendar events) will be preserved</li>
                  <li>• Entry ownership will be transferred to your admin account</li>
                  <li>• This action cannot be undone</li>
                </ul>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={handleOffboard}
                disabled={offboarding}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {offboarding ? 'Offboarding...' : 'Yes, Offboard Employee'}
              </button>
              <button
                onClick={() => setShowOffboardModal(false)}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-md transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeDetailPage; 