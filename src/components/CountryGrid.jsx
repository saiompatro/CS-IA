// src/components/CountryGrid.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { db, auth } from '../firebase';
import { collection, addDoc, deleteDoc, doc, onSnapshot, getDocs, query, orderBy, where } from 'firebase/firestore';

// Component for displaying and managing countries
export const CountryGrid = () => {
  const [countries, setCountries] = useState([]);
  const [newCountry, setNewCountry] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userRole, setUserRole] = useState(localStorage.getItem('userRole') || 'employee');
  
  // Get the current user's ID for tracking entry creation
  const currentUser = auth.currentUser;

  useEffect(() => {
    console.log("Setting up Firestore listener for countries");
    
    // Create a query to get countries ordered by name
    const countriesRef = collection(db, 'countries');
    const q = query(countriesRef, orderBy('name'));

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        console.log("Received countries snapshot:", snapshot.docs.length, "documents");
        const countriesList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        console.log("Updated countries list:", countriesList);
        setCountries(countriesList);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error("Error in countries snapshot listener:", err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => {
      console.log("Cleaning up countries listener");
      unsubscribe();
    };
  }, []);

  // Filter countries based on search query
  const filteredCountries = countries.filter(country =>
    country.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddCountry = async () => {
    if (newCountry.trim() === '') return;
    
    try {
      console.log("Adding new country:", newCountry);
      const countriesRef = collection(db, 'countries');
      
      // Add the country document with creator information
      const docRef = await addDoc(countriesRef, {
        name: newCountry.trim(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: currentUser.uid,
        creatorEmail: currentUser.email
      });
      
      console.log("Successfully added country with ID:", docRef.id);
      setNewCountry('');
      setError(null);
    } catch (err) {
      console.error("Error adding country:", err);
      setError(err.message);
    }
  };

  const handleDeleteCountry = async (countryId, countryName, createdBy) => {
    if (!countryId) return;
    
    // Check if the user has permission to delete this country
    const isAdmin = userRole === 'admin';
    const isCreator = currentUser && currentUser.uid === createdBy;
    
    if (!isAdmin && !isCreator) {
      setError("You don't have permission to delete this country. Only admins or the creator can delete it.");
      return;
    }
    
    try {
      console.log("Deleting country:", countryName, "with ID:", countryId);
      
      // First, get all clients in this country
      const clientsRef = collection(db, 'clients');
      const clientsQuery = query(clientsRef, where('countryName', '==', countryName));
      const clientsSnapshot = await getDocs(clientsQuery);
      
      // Delete all client entries for each client
      for (const clientDoc of clientsSnapshot.docs) {
        const clientId = clientDoc.id;
        
        // Get all entries for this client
        const entriesRef = collection(db, 'clientEntries');
        const entriesQuery = query(entriesRef, where('clientId', '==', clientId));
        const entriesSnapshot = await getDocs(entriesQuery);
        
        // Delete all entries
        for (const entryDoc of entriesSnapshot.docs) {
          await deleteDoc(doc(db, 'clientEntries', entryDoc.id));
        }
        
        // Delete the client
        await deleteDoc(doc(db, 'clients', clientId));
      }
      
      // Finally, delete the country
      await deleteDoc(doc(db, 'countries', countryId));
      
      console.log("Successfully deleted country and all associated data");
      setError(null);
    } catch (err) {
      console.error("Error deleting country:", err);
      setError(err.message);
    }
  };

  // Check if current user can delete a country
  const canDeleteCountry = (createdBy) => {
    return userRole === 'admin' || (currentUser && currentUser.uid === createdBy);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-center mb-4">Clients by Country</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      )}
      
      <div className="flex justify-center gap-4 mb-6">
        {/* Add Country Input */}
        <div className="flex">
          <input
            type="text"
            value={newCountry}
            onChange={(e) => setNewCountry(e.target.value)}
            placeholder="Enter country name"
            className="border p-2 rounded-l-md w-64"
          />
          <button
            onClick={handleAddCountry}
            className="bg-gray-300 hover:bg-gray-400 text-black font-semibold py-2 px-4 rounded-r-md"
          >
            Add Country
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-64">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search countries..."
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
        <div className="text-center">Loading countries...</div>
      ) : filteredCountries.length === 0 ? (
        <div className="text-center text-gray-500">
          {countries.length === 0 ? "No countries added yet" : "No countries match your search"}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCountries.map((country) => (
            <div key={country.id} className="relative flex">
              <Link
                to={`/countries/${country.name}`}
                className="bg-stone-300 hover:bg-stone-700 hover:text-white text-center font-semibold py-4 rounded-l-md shadow flex-grow"
              >
                {country.name}
                {country.creatorEmail && (
                  <span className="block text-xs mt-1 italic">
                    Created by: {country.creatorEmail}
                  </span>
                )}
              </Link>
              <button
                onClick={() => handleDeleteCountry(country.id, country.name, country.createdBy)}
                className={`text-white font-bold py-4 px-4 rounded-r-md ${
                  canDeleteCountry(country.createdBy) 
                  ? 'bg-red-500 hover:bg-red-700' 
                  : 'bg-red-300'
                }`}
                aria-label={`Delete ${country.name}`}
                disabled={!canDeleteCountry(country.createdBy)}
                title={
                  canDeleteCountry(country.createdBy)
                    ? "Delete this country"
                    : "Only admins or the creator can delete this country"
                }
                style={{
                  cursor: canDeleteCountry(country.createdBy) ? 'pointer' : 'not-allowed'
                }}
              >
                ×
              </button>
              {userRole === 'admin' && country.createdBy !== currentUser?.uid && (
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

