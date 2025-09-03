import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, addDoc, query, where, getDocs, doc, deleteDoc } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import jsPDF from 'jspdf';

const ClientEntries = ({ clientId }) => {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    file: null
  });
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchEntries();
  }, [clientId]);

  const fetchEntries = async () => {
    try {
      const entriesRef = collection(db, 'clientEntries');
      const q = query(entriesRef, where('clientId', '==', clientId));
      const querySnapshot = await getDocs(q);
      
      const entriesData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setEntries(entriesData);
    } catch (error) {
      console.error('Error fetching entries:', error);
      setError('Failed to fetch entries');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData(prev => ({ ...prev, file }));
      setError(null);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      file: null
    });
    setError(null);
    setShowAddForm(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    
    try {
      let fileData = null;
      
      if (formData.file) {
        try {
          // Convert file to base64
          const reader = new FileReader();
          const base64Promise = new Promise((resolve, reject) => {
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
          });
          reader.readAsDataURL(formData.file);
          
          fileData = await base64Promise;
        } catch (fileError) {
          console.error('Error processing file:', fileError);
          setError('Failed to process file. Please try again.');
          return;
        }
      }

      const entryData = {
        clientId,
        title: formData.title,
        description: formData.description,
        fileData,
        fileName: formData.file?.name || null,
        fileType: formData.file?.type || null,
        createdAt: new Date().toISOString()
      };

      // Add the entry to Firestore
      await addDoc(collection(db, 'clientEntries'), entryData);
      
      // Reset form and close dialog
      resetForm();
      fetchEntries(); // Refresh the entries list
    } catch (error) {
      console.error('Error adding entry:', error);
      setError('Failed to add entry. Please try again.');
    }
  };

  const handleDeleteEntry = async (entryId) => {
    try {
      // Delete the entry from Firestore
      await deleteDoc(doc(db, 'clientEntries', entryId));
      
      // Refresh the entries list
      await fetchEntries();
      
      // If this was the selected entry, clear it
      if (selectedEntry && selectedEntry.id === entryId) {
        setSelectedEntry(null);
      }
    } catch (error) {
      console.error('Error deleting entry:', error);
      setError('Failed to delete entry. Please try again.');
    }
  };

  const generatePDF = async (entry) => {
    try {
      const doc = new jsPDF();
      
      doc.setFontSize(16);
      doc.text('Entry Details', 20, 20);
      
      doc.setFontSize(12);
      doc.text(`Title: ${entry.title}`, 20, 30);
      doc.text(`Description: ${entry.description}`, 20, 40);
      doc.text(`Created At: ${new Date(entry.createdAt).toLocaleString()}`, 20, 50);
      
      if (entry.fileData) {
        doc.text(`Attached File: ${entry.fileName}`, 20, 60);
        // Add a note about the file
        doc.text('File data is stored in the database', 20, 70);
      }

      doc.save(`entry_${entry.id}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      setError('Failed to generate PDF');
    }
  };

  const handleViewEntry = (entry) => {
    setSelectedEntry(entry);
  };

  const handleDownload = async (entry) => {
    await generatePDF(entry);
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Client Entries</h2>
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Add Entry
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}

      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Add New Entry</h3>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  rows="3"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">File (Optional)</label>
                <input
                  type="file"
                  onChange={handleFileChange}
                  accept=".pdf,.xlsx,.jpg,.jpeg,.png"
                  className="mt-1 block w-full"
                />
                {formData.file && (
                  <p className="mt-2 text-sm text-gray-500">
                    Selected file: {formData.file.name}
                  </p>
                )}
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={resetForm}
                  className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                >
                  Add Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {entries.map((entry) => (
              <tr key={entry.id}>
                <td className="px-6 py-4 whitespace-nowrap">{entry.title}</td>
                <td className="px-6 py-4">{entry.description}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() => handleViewEntry(entry)}
                    className="text-blue-600 hover:text-blue-900 mr-2"
                  >
                    View
                  </button>
                  <button
                    onClick={() => handleDownload(entry)}
                    className="text-green-600 hover:text-green-900 mr-2"
                  >
                    Download PDF
                  </button>
                  <button
                    onClick={() => handleDeleteEntry(entry.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedEntry && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg w-full max-w-2xl">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-semibold">{selectedEntry.title}</h3>
              <button
                onClick={() => setSelectedEntry(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <p className="mb-4">{selectedEntry.description}</p>
            {selectedEntry.fileName && (
              <div className="mt-4">
                <p className="text-sm text-gray-500">Attached file: {selectedEntry.fileName}</p>
                <button
                  onClick={() => handleDownload(selectedEntry)}
                  className="mt-2 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                >
                  Download PDF
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientEntries; 