import { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, addDoc, query, orderBy, onSnapshot, where, getDocs, serverTimestamp } from 'firebase/firestore';

const FinancesPage = () => {
  // State for managing the current active tab
  const [activeTab, setActiveTab] = useState('budget');
  // State for budget data
  const [budget, setBudget] = useState(null);
  // State for salary payments
  const [salaryPayments, setSalaryPayments] = useState([]);
  // State for project costs
  const [projectCosts, setProjectCosts] = useState([]);
  // State for earnings
  const [earnings, setEarnings] = useState([]);
  // State to control the visibility of the add budget modal
  const [showAddBudgetModal, setShowAddBudgetModal] = useState(false);
  // State to control the visibility of the add earnings modal
  const [showAddEarningsModal, setShowAddEarningsModal] = useState(false);
  // State for the new budget form data
  const [newBudget, setNewBudget] = useState({
    amount: '',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear()
  });
  // State for the new earnings form data
  const [newEarnings, setNewEarnings] = useState({
    amount: '',
    description: '',
    source: '',
    date: new Date().toISOString().split('T')[0]
  });
  // State to track loading status
  const [loading, setLoading] = useState(true);
  // State to store user role for permission-based features
  const [userRole, setUserRole] = useState('employee');

  // Effect hook to initialize finances data and set up real-time listening
  useEffect(() => {
    // Get user role from localStorage for permission-based features
    const role = localStorage.getItem('userRole') || 'employee';
    setUserRole(role);
    
    // Set up real-time listeners for finances data
    const unsubscribeBudget = subscribeToBudget();
    const unsubscribeSalaryPayments = subscribeToSalaryPayments();
    const unsubscribeProjectCosts = subscribeToProjectCosts();
    const unsubscribeEarnings = subscribeToEarnings();
    
    // Cleanup function: Unsubscribe from Firebase listeners when component unmounts
    return () => {
      unsubscribeBudget();
      unsubscribeSalaryPayments();
      unsubscribeProjectCosts();
      unsubscribeEarnings();
    };
  }, []);

  // Function to subscribe to budget data in real-time
  const subscribeToBudget = () => {
    try {
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();
      
      const budgetRef = collection(db, 'budget');
      const q = query(
        budgetRef, 
        where('month', '==', currentMonth),
        where('year', '==', currentYear)
      );

      return onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          const budgetData = snapshot.docs[0].data();
          setBudget({
            id: snapshot.docs[0].id,
            ...budgetData,
            createdAt: budgetData.createdAt?.toDate ? budgetData.createdAt.toDate() : new Date(budgetData.createdAt)
          });
        } else {
          setBudget(null);
        }
        setLoading(false);
      });
    } catch (error) {
      console.error('Error setting up budget listener:', error);
      return () => {};
    }
  };

  // Function to subscribe to salary payments in real-time
  const subscribeToSalaryPayments = () => {
    try {
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();
      
      const salaryPaymentsRef = collection(db, 'salaryPayments');
      const q = query(
        salaryPaymentsRef,
        where('month', '==', currentMonth),
        where('year', '==', currentYear),
        orderBy('paidAt', 'desc')
      );

      return onSnapshot(q, (snapshot) => {
        const paymentsList = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            paidAt: data.paidAt?.toDate ? data.paidAt.toDate() : new Date(data.paidAt)
          };
        });
        setSalaryPayments(paymentsList);
      });
    } catch (error) {
      console.error('Error setting up salary payments listener:', error);
      return () => {};
    }
  };

  // Function to subscribe to project costs in real-time
  const subscribeToProjectCosts = () => {
    try {
      const projectsRef = collection(db, 'projects');
      const q = query(projectsRef, orderBy('createdAt', 'desc'));

      return onSnapshot(q, (snapshot) => {
        const projectsList = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt)
          };
        });
        setProjectCosts(projectsList);
      });
    } catch (error) {
      console.error('Error setting up project costs listener:', error);
      return () => {};
    }
  };

  // Function to subscribe to earnings in real-time
  const subscribeToEarnings = () => {
    try {
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();
      
      const earningsRef = collection(db, 'earnings');
      const q = query(
        earningsRef,
        where('month', '==', currentMonth),
        where('year', '==', currentYear),
        orderBy('date', 'desc')
      );

      return onSnapshot(q, (snapshot) => {
        const earningsList = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            date: data.date ? new Date(data.date) : new Date(),
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt)
          };
        });
        setEarnings(earningsList);
      });
    } catch (error) {
      console.error('Error setting up earnings listener:', error);
      return () => {};
    }
  };

  // Function to handle adding a new budget
  const handleAddBudget = async (e) => {
    e.preventDefault();
    
    if (!newBudget.amount || parseInt(newBudget.amount) <= 0) {
      alert('Please enter a valid budget amount');
      return;
    }

    try {
      const budgetData = {
        amount: parseInt(newBudget.amount),
        month: parseInt(newBudget.month),
        year: parseInt(newBudget.year),
        createdAt: new Date(),
        createdBy: auth.currentUser?.uid,
        createdByEmail: auth.currentUser?.email
      };

      // Add the budget to Firebase
      await addDoc(collection(db, 'budget'), budgetData);
      
      // Reset form and close modal
      setNewBudget({
        amount: '',
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear()
      });
      setShowAddBudgetModal(false);
      
      alert('Budget added successfully!');
    } catch (error) {
      console.error('Error adding budget:', error);
      alert('Failed to add budget. Please try again.');
    }
  };

  // Function to handle adding new earnings
  const handleAddEarnings = async (e) => {
    e.preventDefault();
    
    if (!newEarnings.amount || !newEarnings.description || !newEarnings.source) {
      alert('Please fill in all required fields');
      return;
    }

    if (parseInt(newEarnings.amount) <= 0) {
      alert('Earnings amount must be greater than 0');
      return;
    }

    try {
      const earningsData = {
        ...newEarnings,
        amount: parseInt(newEarnings.amount),
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        createdAt: new Date(),
        createdBy: auth.currentUser?.uid,
        createdByEmail: auth.currentUser?.email
      };

      // Add the earnings to Firebase
      await addDoc(collection(db, 'earnings'), earningsData);
      
      // Reset form and close modal
      setNewEarnings({
        amount: '',
        description: '',
        source: '',
        date: new Date().toISOString().split('T')[0]
      });
      setShowAddEarningsModal(false);
      
      alert('Earnings recorded successfully!');
    } catch (error) {
      console.error('Error adding earnings:', error);
      alert('Failed to record earnings. Please try again.');
    }
  };

  // Function to calculate total expenses
  const calculateTotalExpenses = () => {
    const totalSalary = salaryPayments.reduce((sum, payment) => sum + payment.amount, 0);
    const totalProjectCosts = projectCosts.reduce((sum, project) => sum + project.cost, 0);
    return totalSalary + totalProjectCosts;
  };

  // Function to calculate budget usage percentage
  const calculateBudgetUsage = () => {
    if (!budget) return 0;
    const totalExpenses = calculateTotalExpenses();
    const totalEarnings = earnings.reduce((sum, earning) => sum + earning.amount, 0);
    const netExpenses = Math.max(totalExpenses - totalEarnings, 0);
    return Math.min((netExpenses / budget.amount) * 100, 100);
  };

  // Function to get month name
  const getMonthName = (month) => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[month - 1] || month;
  };

  // Function to get current month name
  const getCurrentMonthName = () => {
    return getMonthName(new Date().getMonth() + 1);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Financial Management</h1>
        <p className="text-gray-600">Track budget, expenses, and earnings for better financial planning.</p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('budget')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'budget'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Budget
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'transactions'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Transactions
          </button>
          <button
            onClick={() => setActiveTab('earnings')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'earnings'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Earnings
          </button>
        </nav>
      </div>

      {/* Budget Tab */}
      {activeTab === 'budget' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                Budget for {getCurrentMonthName()} {new Date().getFullYear()}
              </h2>
              {!budget && (
                <button
                  onClick={() => setShowAddBudgetModal(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  + Add Budget
                </button>
              )}
            </div>

            {budget ? (
              <>
                {/* Budget Overview */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h3 className="text-lg font-semibold text-blue-900 mb-2">Monthly Budget</h3>
                      <p className="text-3xl font-bold text-blue-600">₹{budget.amount.toLocaleString()}</p>
                      <p className="text-sm text-blue-600">Set on {budget.createdAt.toLocaleDateString()}</p>
                    </div>

                    <div className="bg-green-50 p-4 rounded-lg">
                      <h3 className="text-lg font-semibold text-green-900 mb-2">Total Expenses</h3>
                      <p className="text-3xl font-bold text-green-600">₹{calculateTotalExpenses().toLocaleString()}</p>
                      <p className="text-sm text-green-600">
                        {(() => {
                          const totalEarnings = earnings.reduce((sum, earning) => sum + earning.amount, 0);
                          const netExpenses = Math.max(calculateTotalExpenses() - totalEarnings, 0);
                          return budget.amount > 0 ? `${((netExpenses / budget.amount) * 100).toFixed(1)}%` : '0%';
                        })()} of budget used
                      </p>
                    </div>

                    <div className="bg-yellow-50 p-4 rounded-lg">
                      <h3 className="text-lg font-semibold text-yellow-900 mb-2">Remaining Budget</h3>
                      <p className="text-3xl font-bold text-yellow-600">
                        {(() => {
                          const totalEarnings = earnings.reduce((sum, earning) => sum + earning.amount, 0);
                          const netExpenses = Math.max(calculateTotalExpenses() - totalEarnings, 0);
                          return `₹${Math.max(budget.amount - netExpenses, 0).toLocaleString()}`;
                        })()}
                      </p>
                    </div>
                  </div>

                  {/* Budget Usage Chart */}
                  <div className="flex items-center justify-center">
                    <div className="relative w-48 h-48">
                      <svg className="w-48 h-48 transform -rotate-90">
                        {/* Background circle */}
                        <circle
                          cx="96"
                          cy="96"
                          r="80"
                          stroke="currentColor"
                          strokeWidth="16"
                          fill="transparent"
                          className="text-gray-200"
                        />
                        {/* Progress circle */}
                        <circle
                          cx="96"
                          cy="96"
                          r="80"
                          stroke="currentColor"
                          strokeWidth="16"
                          fill="transparent"
                          strokeDasharray={`${2 * Math.PI * 80}`}
                          strokeDashoffset={`${2 * Math.PI * 80 * (1 - calculateBudgetUsage() / 100)}`}
                          className="text-blue-600"
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-gray-900">
                            {calculateBudgetUsage().toFixed(1)}%
                          </div>
                          <div className="text-sm text-gray-600">Used</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expense Breakdown */}
                <div className="mt-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Expense Breakdown</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-red-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-red-900 mb-2">Salary Payments</h4>
                      <p className="text-2xl font-bold text-red-600">
                        ₹{salaryPayments.reduce((sum, payment) => sum + payment.amount, 0).toLocaleString()}
                      </p>
                      <p className="text-sm text-red-600">
                        {budget.amount > 0 ? `${((salaryPayments.reduce((sum, payment) => sum + payment.amount, 0) / budget.amount) * 100).toFixed(1)}%` : '0%'} of budget
                      </p>
                    </div>
                    <div className="bg-orange-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-orange-900 mb-2">Project Costs</h4>
                      <p className="text-2xl font-bold text-orange-600">
                        ₹{projectCosts.reduce((sum, project) => sum + project.cost, 0).toLocaleString()}
                      </p>
                      <p className="text-sm text-orange-600">
                        {budget.amount > 0 ? `${((projectCosts.reduce((sum, project) => sum + project.cost, 0) / budget.amount) * 100).toFixed(1)}%` : '0%'} of budget
                      </p>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-4">
                  <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No budget set for this month</h3>
                <p className="text-gray-500 mb-4">Set a monthly budget to start tracking your expenses.</p>
                <button
                  onClick={() => setShowAddBudgetModal(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Set Budget
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Transactions Tab */}
      {activeTab === 'transactions' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Transaction History</h2>
            
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-red-50 p-4 rounded-lg">
                <h3 className="font-semibold text-red-900 mb-2">Total Salary Paid</h3>
                <p className="text-2xl font-bold text-red-600">
                  ₹{salaryPayments.reduce((sum, payment) => sum + payment.amount, 0).toLocaleString()}
                </p>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg">
                <h3 className="font-semibold text-orange-900 mb-2">Total Project Costs</h3>
                <p className="text-2xl font-bold text-orange-600">
                  ₹{projectCosts.reduce((sum, project) => sum + project.cost, 0).toLocaleString()}
                </p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="font-semibold text-green-900 mb-2">Total Expenses</h3>
                <p className="text-2xl font-bold text-green-600">
                  ₹{calculateTotalExpenses().toLocaleString()}
                </p>
              </div>
            </div>

            {/* Transactions Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {/* Salary Payments */}
                  {salaryPayments.map(payment => (
                    <tr key={`salary-${payment.id}`} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                          Salary Payment
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        Salary paid to {payment.employeeEmail}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-red-600">
                        -₹{payment.amount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {payment.paidAt.toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        Paid by {payment.paidByEmail}
                      </td>
                    </tr>
                  ))}
                  
                  {/* Project Costs */}
                  {projectCosts.map(project => (
                    <tr key={`project-${project.id}`} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-orange-100 text-orange-800">
                          Project Cost
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {project.name} - {project.client}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-orange-600">
                        -₹{project.cost.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {project.createdAt.toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        Status: {project.status}
                      </td>
                    </tr>
                  ))}
                  
                  {salaryPayments.length === 0 && projectCosts.length === 0 && (
                    <tr>
                      <td colSpan="5" className="px-6 py-4 text-center text-gray-500">
                        No transactions found for this month.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Earnings Tab */}
      {activeTab === 'earnings' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Earnings</h2>
              <button
                onClick={() => setShowAddEarningsModal(true)}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                + Report Earnings
              </button>
            </div>

            {/* Summary Card */}
            <div className="bg-green-50 p-4 rounded-lg mb-6">
              <h3 className="font-semibold text-green-900 mb-2">Total Earnings This Month</h3>
              <p className="text-3xl font-bold text-green-600">
                ₹{earnings.reduce((sum, earning) => sum + earning.amount, 0).toLocaleString()}
              </p>
            </div>

            {/* Earnings Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Recorded By</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {earnings.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-6 py-4 text-center text-gray-500">
                        No earnings recorded for this month.
                      </td>
                    </tr>
                  ) : (
                    earnings.map(earning => (
                      <tr key={earning.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                          +₹{earning.amount.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {earning.description}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {earning.source}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {earning.date.toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {earning.createdByEmail}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Add Budget Modal */}
      {showAddBudgetModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Set Monthly Budget</h3>
            
            <form onSubmit={handleAddBudget}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Budget Amount (₹) *
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={newBudget.amount}
                  onChange={(e) => setNewBudget({ ...newBudget, amount: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter budget amount in rupees"
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Month
                </label>
                <select
                  value={newBudget.month}
                  onChange={(e) => setNewBudget({ ...newBudget, month: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                    <option key={month} value={month}>
                      {getMonthName(month)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Year
                </label>
                <input
                  type="number"
                  min="2020"
                  max="2030"
                  value={newBudget.year}
                  onChange={(e) => setNewBudget({ ...newBudget, year: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="flex space-x-3">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors"
                >
                  Set Budget
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddBudgetModal(false)}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-md transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Earnings Modal */}
      {showAddEarningsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Report Earnings</h3>
            
            <form onSubmit={handleAddEarnings}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount (₹) *
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={newEarnings.amount}
                  onChange={(e) => setNewEarnings({ ...newEarnings, amount: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter earnings amount in rupees"
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description *
                </label>
                <input
                  type="text"
                  value={newEarnings.description}
                  onChange={(e) => setNewEarnings({ ...newEarnings, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Client payment, Service fee"
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Source *
                </label>
                <input
                  type="text"
                  value={newEarnings.source}
                  onChange={(e) => setNewEarnings({ ...newEarnings, source: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Client name, Service type"
                  required
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date
                </label>
                <input
                  type="date"
                  value={newEarnings.date}
                  onChange={(e) => setNewEarnings({ ...newEarnings, date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex space-x-3">
                <button
                  type="submit"
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md transition-colors"
                >
                  Record Earnings
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddEarningsModal(false)}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-md transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinancesPage; 