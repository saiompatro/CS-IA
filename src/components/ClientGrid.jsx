import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { db, auth } from '../firebase';
import { collection, addDoc, deleteDoc, doc, query, where, onSnapshot } from 'firebase/firestore';

// Component for displaying and managing clients within a country
export const ClientGrid = ({ countryName }) => {
  const [clients, setClients] = useState([]);
  const [newClient, setNewClient] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userRole, setUserRole] = useState(localStorage.getItem('userRole') || 'employee');
  
  // Get the current user's ID for tracking entry creation
  const currentUser = auth.currentUser;

  useEffect(() => {
    if (!countryName) {
      setLoading(false);
      return;
    }

    console.log("Setting up Firestore listener for clients in country:", countryName);
    
    // Create a query for clients in this country
    const clientsRef = collection(db, 'clients');
    const q = query(
      clientsRef,
      where("countryName", "==", countryName)
    );

    const unsubscribe = onSnapshot(q,
      (snapshot) => {
        console.log("Received clients snapshot:", snapshot.docs.length, "documents");
        // Sort the clients by name in the client-side
        const clientsList = snapshot.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data()
          }))
          .sort((a, b) => a.name.localeCompare(b.name));

        console.log("Updated clients list:", clientsList);
        setClients(clientsList);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error("Error in clients snapshot listener:", err);
        // If there's an index error, provide a more helpful message
        if (err.code === 'failed-precondition') {
          setError("Database setup required. Please contact the administrator.");
        } else {
          setError(err.message);
        }
        setLoading(false);
      }
    );

    return () => {
      console.log("Cleaning up clients listener");
      unsubscribe();
    };
  }, [countryName]);

  // Filter clients based on search query
  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddClient = async () => {
    if (newClient.trim() === '') return;
    
    try {
      console.log("Adding new client:", newClient, "to country:", countryName);
      const clientsRef = collection(db, 'clients');
      
      // Add the client document with creator information
      const docRef = await addDoc(clientsRef, {
        name: newClient.trim(),
        countryName: countryName,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: currentUser.uid,
        creatorEmail: currentUser.email
      });
      
      console.log("Successfully added client with ID:", docRef.id);
      setNewClient('');
      setError(null);
    } catch (err) {
      console.error("Error adding client:", err);
      setError(err.message);
    }
  };

  const handleDeleteClient = async (clientId, clientName, createdBy) => {
    if (!clientId) return;
    
    // Check if the user has permission to delete this client
    const isAdmin = userRole === 'admin';
    const isCreator = currentUser && currentUser.uid === createdBy;
    
    if (!isAdmin && !isCreator) {
      setError("You don't have permission to delete this client. Only admins or the creator can delete it.");
      return;
    }
    
    try {
      console.log("Deleting client:", clientName, "with ID:", clientId);
      
      // Delete the client document
      await deleteDoc(doc(db, 'clients', clientId));
      
      console.log("Successfully deleted client");
      setError(null);
    } catch (err) {
      console.error("Error deleting client:", err);
      setError(err.message);
    }
  };

  // Check if current user can delete a client
  const canDeleteClient = (createdBy) => {
    return userRole === 'admin' || (currentUser && currentUser.uid === createdBy);
  };

  return (
    <div className="p-6">
      
      <h1 className="text-2xl font-bold text-center mb-4">Clients in {countryName}</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      )}
      
      <div className="flex justify-center gap-4 mb-6">
        {/* Add Client Input */}
        <div className="flex">
          <input
            type="text"
            value={newClient}
            onChange={(e) => setNewClient(e.target.value)}
            placeholder="Enter client name"
            className="border p-2 rounded-l-md w-64"
          />
          <button
            onClick={handleAddClient}
            className="bg-gray-300 hover:bg-gray-400 text-black font-semibold py-2 px-4 rounded-r-md"
          >
            Add Client
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-64">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search clients..."
            className="border p-2 border-black rounded-md w-full pl-8"
          />
          <svg
            className="absolute left-2 top-2.5 h-5 w-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
      </div>

      {loading ? (
        <div className="text-center">Loading clients...</div>
      ) : filteredClients.length === 0 ? (
        <div className="text-center text-gray-500">
          {clients.length === 0 ? `No clients added yet for ${countryName}` : "No clients match your search"}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClients.map((client) => (
            <div key={client.id} className="relative flex">
              <Link
                to={`/clients/${client.id}`}
                className="bg-stone-300 hover:bg-stone-700 hover:text-white text-center font-semibold py-4 rounded-l-md shadow flex-grow"
              >
                {client.name}
                {client.creatorEmail && (
                  <span className="block text-xs mt-1 italic">
                    Created by: {client.creatorEmail}
                  </span>
                )}
              </Link>
              <button
                onClick={() => handleDeleteClient(client.id, client.name, client.createdBy)}
                className={`text-white font-bold py-4 px-4 rounded-r-md ${
                  canDeleteClient(client.createdBy) 
                  ? 'bg-red-500 hover:bg-red-700' 
                  : 'bg-red-300'
                }`}
                aria-label={`Delete ${client.name}`}
                disabled={!canDeleteClient(client.createdBy)}
                title={
                  canDeleteClient(client.createdBy)
                    ? "Delete this client"
                    : "Only admins or the creator can delete this client"
                }
                style={{
                  cursor: canDeleteClient(client.createdBy) ? 'pointer' : 'not-allowed'
                }}
              >
                ×
              </button>
              {userRole === 'admin' && client.createdBy !== currentUser?.uid && (
                <span className="absolute top-0 right-0 transform translate-x-1/2 -translate-y-1/2 bg-blue-500 text-white text-xs px-1 py-0.5 rounded-full">
                  Admin
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}; 