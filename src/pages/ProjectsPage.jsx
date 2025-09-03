import { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, addDoc, query, orderBy, onSnapshot, where, deleteDoc, doc, updateDoc } from 'firebase/firestore';

const ProjectsPage = () => {
  // State for managing projects list
  const [projects, setProjects] = useState([]);
  // State to control the visibility of the add project modal
  const [showAddProjectModal, setShowAddProjectModal] = useState(false);
  // State to control the visibility of the edit project modal
  const [showEditProjectModal, setShowEditProjectModal] = useState(false);
  // State for the project being edited
  const [editingProject, setEditingProject] = useState(null);
  // State for the new project form data
  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
    client: '',
    cost: '',
    status: 'active',
    startDate: new Date().toISOString().split('T')[0],
    expectedEndDate: ''
  });
  // State to track loading status
  const [loading, setLoading] = useState(true);
  // State to store user role for permission-based features
  const [userRole, setUserRole] = useState('employee');
  // State to track Firebase-specific errors
  const [firebaseError, setFirebaseError] = useState(null);

  // Effect hook to initialize projects and set up real-time listening
  useEffect(() => {
    // Get user role from localStorage for permission-based features
    const role = localStorage.getItem('userRole') || 'employee';
    setUserRole(role);
    
    // Set up real-time listener for projects
    const unsubscribe = subscribeToProjects();
    
    // Cleanup function: Unsubscribe from Firebase listener when component unmounts
    return () => unsubscribe();
  }, []);

  // Function to subscribe to projects in real-time
  const subscribeToProjects = () => {
    try {
      const projectsRef = collection(db, 'projects');
      // Query all projects ordered by creation date (newest first)
      const q = query(projectsRef, orderBy('createdAt', 'desc'));

      return onSnapshot(q, (snapshot) => {
        try {
          const projectsList = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
              createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
              startDate: data.startDate || '',
              expectedEndDate: data.expectedEndDate || ''
            };
          });
          setProjects(projectsList);
          setLoading(false);
          setFirebaseError(null);
        } catch (error) {
          console.error('Error processing projects:', error);
          setProjects([]);
          setLoading(false);
          setFirebaseError('Error processing projects data');
        }
      }, (error) => {
        console.error('Error listening to projects:', error);
        setProjects([]);
        setLoading(false);
        setFirebaseError('Error connecting to projects database');
      });
    } catch (error) {
      console.error('Error setting up projects listener:', error);
      setProjects([]);
      setLoading(false);
      setFirebaseError('Error setting up projects connection');
      return () => {};
    }
  };

  // Function to handle adding a new project
  const handleAddProject = async (e) => {
    e.preventDefault();
    
    if (!newProject.name.trim() || !newProject.client.trim() || !newProject.cost) {
      alert('Please fill in all required fields (Name, Client, and Cost)');
      return;
    }

    if (parseInt(newProject.cost) <= 0) {
      alert('Project cost must be greater than 0');
      return;
    }

    try {
      const projectData = {
        ...newProject,
        cost: parseInt(newProject.cost), // Ensure cost is stored as integer
        createdAt: new Date(),
        createdBy: auth.currentUser?.uid,
        createdByEmail: auth.currentUser?.email,
        status: newProject.status || 'active'
      };

      // Add the project to Firebase
      await addDoc(collection(db, 'projects'), projectData);
      
      // Reset form and close modal
      setNewProject({
        name: '',
        description: '',
        client: '',
        cost: '',
        status: 'active',
        startDate: new Date().toISOString().split('T')[0],
        expectedEndDate: ''
      });
      setShowAddProjectModal(false);
      
      alert('Project added successfully!');
    } catch (error) {
      console.error('Error adding project:', error);
      alert('Failed to add project. Please try again.');
    }
  };

  // Function to handle editing a project
  const handleEditProject = (project) => {
    setEditingProject({
      id: project.id,
      name: project.name,
      description: project.description || '',
      client: project.client,
      cost: project.cost.toString(), // Convert back to string for input
      status: project.status,
      startDate: project.startDate || '',
      expectedEndDate: project.expectedEndDate || ''
    });
    setShowEditProjectModal(true);
  };

  // Function to save edited project
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    
    if (!editingProject.name.trim() || !editingProject.client.trim() || !editingProject.cost) {
      alert('Please fill in all required fields');
      return;
    }

    if (parseInt(editingProject.cost) <= 0) {
      alert('Project cost must be greater than 0');
      return;
    }

    try {
      // Update the project in Firebase
      await updateDoc(doc(db, 'projects', editingProject.id), {
        name: editingProject.name,
        description: editingProject.description,
        client: editingProject.client,
        cost: parseInt(editingProject.cost), // Ensure cost is stored as integer
        status: editingProject.status,
        startDate: editingProject.startDate,
        expectedEndDate: editingProject.expectedEndDate,
        updatedAt: new Date(),
        updatedBy: auth.currentUser?.uid,
        updatedByEmail: auth.currentUser?.email
      });

      setShowEditProjectModal(false);
      setEditingProject(null);
      alert('Project updated successfully!');
    } catch (error) {
      console.error('Error updating project:', error);
      alert('Failed to update project. Please try again.');
    }
  };

  // Function to handle project deletion
  const handleDeleteProject = async (projectId) => {
    if (!window.confirm('Are you sure you want to delete this project?')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'projects', projectId));
      alert('Project deleted successfully!');
    } catch (error) {
      console.error('Error deleting project:', error);
      alert('Failed to delete project. Please try again.');
    }
  };

  // Function to get status badge styling
  const getStatusBadgeStyle = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'on-hold':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Show Firebase error if there's one
  if (firebaseError) {
    return (
      <div className="p-6">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <strong className="font-bold">Firebase Error: </strong>
          <span className="block sm:inline">{firebaseError}</span>
        </div>
        <div className="text-center">
          <p className="text-gray-600 mb-4">There was an issue connecting to the projects database.</p>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

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
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Projects Management</h1>
        
        {/* Add Project Button */}
        <div className="flex justify-between items-center mb-4">
          <p className="text-gray-600">Manage and track all company projects with client information and costs.</p>
          <button
            onClick={() => setShowAddProjectModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            + Add New Project
          </button>
        </div>
      </div>

      {/* Projects Table */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Project</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cost</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timeline</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created By</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {projects.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-4 text-center text-gray-500">
                    No projects found. Start by adding your first project!
                  </td>
                </tr>
              ) : (
                projects.map(project => (
                  <tr key={project.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{project.name}</div>
                        {project.description && (
                          <div className="text-sm text-gray-500 truncate max-w-xs">{project.description}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{project.client}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">₹{project.cost.toLocaleString()}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeStyle(project.status)}`}>
                        {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div>
                        <div>Start: {project.startDate || 'Not set'}</div>
                        {project.expectedEndDate && (
                          <div>End: {project.expectedEndDate}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div>
                        <div>{project.createdByEmail}</div>
                        <div className="text-xs">
                          {project.createdAt ? project.createdAt.toLocaleDateString() : 'Unknown'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEditProject(project)}
                          className="text-blue-600 hover:text-blue-900 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteProject(project.id)}
                          className="text-red-600 hover:text-red-900 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Project Modal */}
      {showAddProjectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Add New Project</h3>
            
            <form onSubmit={handleAddProject}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Project Name *
                </label>
                <input
                  type="text"
                  value={newProject.name}
                  onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={newProject.description}
                  onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="3"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Client *
                </label>
                <input
                  type="text"
                  value={newProject.client}
                  onChange={(e) => setNewProject({ ...newProject, client: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Project Cost (₹) *
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={newProject.cost}
                  onChange={(e) => setNewProject({ ...newProject, cost: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter cost in rupees"
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={newProject.status}
                  onChange={(e) => setNewProject({ ...newProject, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="on-hold">On Hold</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={newProject.startDate}
                  onChange={(e) => setNewProject({ ...newProject, startDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Expected End Date
                </label>
                <input
                  type="date"
                  value={newProject.expectedEndDate}
                  onChange={(e) => setNewProject({ ...newProject, expectedEndDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex space-x-3">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors"
                >
                  Add Project
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddProjectModal(false)}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-md transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Project Modal */}
      {showEditProjectModal && editingProject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Edit Project</h3>
            
            <form onSubmit={handleSaveEdit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Project Name *
                </label>
                <input
                  type="text"
                  value={editingProject.name}
                  onChange={(e) => setEditingProject({ ...editingProject, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={editingProject.description}
                  onChange={(e) => setEditingProject({ ...editingProject, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="3"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Client *
                </label>
                <input
                  type="text"
                  value={editingProject.client}
                  onChange={(e) => setEditingProject({ ...editingProject, client: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Project Cost (₹) *
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={editingProject.cost}
                  onChange={(e) => setEditingProject({ ...editingProject, cost: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={editingProject.status}
                  onChange={(e) => setEditingProject({ ...editingProject, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="on-hold">On Hold</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={editingProject.startDate}
                  onChange={(e) => setEditingProject({ ...editingProject, startDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Expected End Date
                </label>
                <input
                  type="date"
                  value={editingProject.expectedEndDate}
                  onChange={(e) => setEditingProject({ ...editingProject, expectedEndDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex space-x-3">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors"
                >
                  Update Project
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditProjectModal(false);
                    setEditingProject(null);
                  }}
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

export default ProjectsPage; 