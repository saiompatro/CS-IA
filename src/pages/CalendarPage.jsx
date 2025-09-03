// Import React hooks for state management and side effects
import { useState, useEffect } from 'react';
// Import react-big-calendar components for professional calendar interface
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
// Import date-fns utilities for date manipulation and formatting
import { format, parse, startOfWeek, getDay } from 'date-fns';
// Import English locale for date formatting
import { enUS } from 'date-fns/locale';
// Import Firebase services for database and authentication
import { db, auth } from '../firebase';
// Import Firestore functions for real-time database operations
import { collection, addDoc, query, where, getDocs, onSnapshot, deleteDoc, doc, updateDoc } from 'firebase/firestore';
// Import calendar component styles
import 'react-big-calendar/lib/css/react-big-calendar.css';

// Configure locales for internationalization support
const locales = {
  'en-US': enUS
};

// Create date-fns localizer for react-big-calendar integration
// This enables proper date formatting, parsing, and week calculations
const localizer = dateFnsLocalizer({
  format,        // Function to format dates for display
  parse,         // Function to parse date strings
  startOfWeek,   // Function to get the start of a week
  getDay,        // Function to get day of week (0-6)
  locales,       // Locale configuration for date formatting
});

const CalendarPage = () => {
  // State for managing calendar events (team and personal)
  const [events, setEvents] = useState([]);
  // State to toggle between team calendar (shared) and personal calendar (private)
  const [calendarType, setCalendarType] = useState('team'); // 'team' or 'personal'
  // State to control the visibility of the add event modal
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  // State to control the visibility of the edit event modal
  const [showEditEventModal, setShowEditEventModal] = useState(false);
  // State for the event being edited
  const [editingEvent, setEditingEvent] = useState(null);
  // State for the new event form data with default values
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    start: new Date(),  // Default to current date/time
    end: new Date(),    // Default to current date/time
  });
  // State to track loading status for async operations
  const [loading, setLoading] = useState(true);
  // State to store user role for permission-based features
  const [userRole, setUserRole] = useState('employee');
  // State to track Firebase-specific errors
  const [firebaseError, setFirebaseError] = useState(null);

  // Helper function to format date for datetime-local input (avoids timezone issues)
  // This prevents the timezone conversion problems that cause time input glitches
  const formatDateForInput = (date) => {
    const d = new Date(date);
    // Extract date components and ensure proper formatting
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');  // Month is 0-indexed, so add 1
    const day = String(d.getDate()).padStart(2, '0');          // Pad with leading zero if needed
    const hours = String(d.getHours()).padStart(2, '0');       // 24-hour format
    const minutes = String(d.getMinutes()).padStart(2, '0');   // Pad with leading zero if needed
    // Return in HTML datetime-local input format: YYYY-MM-DDTHH:MM
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // Effect hook to initialize calendar and set up real-time event listening
  // Runs when component mounts and when calendarType changes
  useEffect(() => {
    // Get user role from localStorage for permission-based features
    const role = localStorage.getItem('userRole') || 'employee';
    setUserRole(role);
    
    // Debug logging for development
    console.log('CalendarPage: User role set to:', role);
    console.log('CalendarPage: Auth current user:', auth.currentUser);
    
    // Safety check: Ensure Firebase database is properly initialized
    if (!db) {
      setFirebaseError('Firebase is not initialized');
      setLoading(false);
      return;
    }
    
    // Set up real-time listener for calendar events
    // This creates a subscription that automatically updates when data changes
    const unsubscribe = subscribeToEvents();
    
    // Cleanup function: Unsubscribe from Firebase listener when component unmounts
    // This prevents memory leaks and unnecessary database connections
    return () => unsubscribe();
  }, [calendarType]); // Dependency array: re-run effect when calendarType changes

  const subscribeToEvents = () => {
    try {
      const eventsRef = collection(db, 'calendarEvents');
      let q;
      
      if (calendarType === 'team') {
        // For team calendar, show all events
        q = query(eventsRef, where('type', '==', 'team'));
      } else {
        // For personal calendar, show only user's events
        if (!auth.currentUser?.uid) {
          setEvents([]);
          setLoading(false);
          return () => {};
        }
        q = query(eventsRef, where('type', '==', 'personal'), where('userId', '==', auth.currentUser.uid));
      }

      return onSnapshot(q, (snapshot) => {
        try {
          const eventsList = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
              start: data.start?.toDate ? data.start.toDate() : new Date(data.start),
              end: data.end?.toDate ? data.end.toDate() : new Date(data.end),
            };
          });
          setEvents(eventsList);
          setLoading(false);
          setFirebaseError(null);
        } catch (error) {
          console.error('Error processing events:', error);
          setEvents([]);
          setLoading(false);
          setFirebaseError('Error processing calendar events');
        }
      }, (error) => {
        console.error('Error listening to events:', error);
        setEvents([]);
        setLoading(false);
        setFirebaseError('Error connecting to calendar database');
      });
    } catch (error) {
      console.error('Error setting up event listener:', error);
      setEvents([]);
      setLoading(false);
      setFirebaseError('Error setting up calendar connection');
      return () => {};
    }
  };

  const sendTeamEventNotification = async (eventData) => {
    try {
      if (eventData.type === 'team') {
       
        const startTime = format(eventData.start, 'MMM dd, yyyy - h:mm a');
        const endTime = format(eventData.end, 'h:mm a');
        
        const notificationText = `📅 **New Team Event Added**\n\n**${eventData.title}**\n${eventData.description ? `📝 ${eventData.description}\n` : ''}🕐 **When:** ${startTime} to ${endTime}\n👤 **Added by:** ${eventData.userEmail}`;
        
        await addDoc(collection(db, 'messages'), {
          text: notificationText,
          createdAt: new Date(),
          uid: 'system', 
          email: 'Calendar Bot',
          photoURL: null,
          isSystemMessage: true, 
          eventId: eventData.id || 'pending', 
          eventTitle: eventData.title, 
          eventType: 'team_event_notification', 
        });
        
        console.log('Team event notification sent to chat');
      }
    } catch (error) {
      console.error('Error sending team event notification:', error);
      // Don't show error to user as this is a background notification
    }
  };

  const sendEventUpdateNotification = async (eventData, action) => {
    try {
      if (eventData.type === 'team') {
        const startTime = format(eventData.start, 'MMM dd, yyyy - h:mm a');
        const endTime = format(eventData.end, 'h:mm a');
        
        let notificationText = '';
        let eventType = '';
        
        if (action === 'updated') {
          notificationText = `🔄 **Team Event Updated**\n\n**${eventData.title}**\n${eventData.description ? `📝 ${eventData.description}\n` : ''}🕐 **When:** ${startTime} to ${endTime}\n👤 **Updated by:** ${auth.currentUser?.email}`;
          eventType = 'team_event_update_notification';
        } else if (action === 'deleted') {
          notificationText = `🗑️ **Team Event Cancelled**\n\n**${eventData.title}**\n🕐 **Was scheduled for:** ${startTime} to ${endTime}\n👤 **Cancelled by:** ${auth.currentUser?.email}`;
          eventType = 'team_event_delete_notification';
        }
        
        await addDoc(collection(db, 'messages'), {
          text: notificationText,
          createdAt: new Date(),
          uid: 'system', 
          email: 'Calendar Bot',
          photoURL: null,
          isSystemMessage: true, 
          eventId: eventData.id || 'pending', 
          eventTitle: eventData.title,
          eventType: eventType, 
        });
        
        console.log(`Team event ${action} notification sent to chat`);
      }
    } catch (error) {
      console.error(`Error sending team event ${action} notification:`, error);
      
    }
  };

  const handleAddEvent = async (e) => {
    e.preventDefault();
    
    if (!newEvent.title.trim()) {
      alert('Please enter an event title');
      return;
    }

    if (!auth.currentUser?.uid) {
      alert('Please log in to add events');
      return;
    }

    try {
      const eventData = {
        ...newEvent,
        type: calendarType,
        userId: auth.currentUser.uid,
        userEmail: auth.currentUser.email,
        createdAt: new Date(),
      };

      // Add the event to the calendar
      const eventRef = await addDoc(collection(db, 'calendarEvents'), eventData);
      
      // Update eventData with the generated ID for notification
      const eventWithId = { ...eventData, id: eventRef.id };
      
      // Send team event notification if it's a team event
      if (calendarType === 'team') {
        await sendTeamEventNotification(eventWithId);
      }
      
      // Reset form and close modal
      setNewEvent({
        title: '',
        description: '',
        start: new Date(),
        end: new Date(),
      });
      setShowAddEventModal(false);
      
      // Show success message with notification confirmation
      if (calendarType === 'team') {
        // Create a more user-friendly success notification
        const successDiv = document.createElement('div');
        successDiv.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
        successDiv.innerHTML = `
          <div class="flex items-center">
            <span class="mr-2">✅</span>
            <div>
              <div class="font-semibold">Team Event Added!</div>
              <div class="text-sm">Notification sent to team chat</div>
            </div>
          </div>
        `;
        document.body.appendChild(successDiv);
        
        // Remove the success message after 4 seconds
        setTimeout(() => {
          if (successDiv.parentNode) {
            successDiv.parentNode.removeChild(successDiv);
          }
        }, 4000);
      } else {
        alert('Personal event added successfully!');
      }
    } catch (error) {
      console.error('Error adding event:', error);
      alert('Failed to add event. Please try again.');
    }
  };

  // Function to handle event editing
  const handleEditEvent = (event) => {
    setEditingEvent({
      id: event.id,
      title: event.title,
      description: event.description || '',
      start: event.start,
      end: event.end,
      type: event.type,
      userId: event.userId,
      userEmail: event.userEmail
    });
    setShowEditEventModal(true);
  };

  // Function to save edited event
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    
    if (!editingEvent.title.trim()) {
      alert('Please enter an event title');
      return;
    }

    try {
      // Update the event in Firebase
      await updateDoc(doc(db, 'calendarEvents', editingEvent.id), {
        title: editingEvent.title,
        description: editingEvent.description,
        start: editingEvent.start,
        end: editingEvent.end,
        updatedAt: new Date(),
        updatedBy: auth.currentUser?.uid,
        updatedByEmail: auth.currentUser?.email
      });

      // Send update notification if it's a team event
      if (editingEvent.type === 'team') {
        await sendEventUpdateNotification(editingEvent, 'updated');
      }

      setShowEditEventModal(false);
      setEditingEvent(null);
      alert('Event updated successfully!');
    } catch (error) {
      console.error('Error updating event:', error);
      alert('Failed to update event. Please try again.');
    }
  };

  // Function to handle event deletion
  const handleDeleteEvent = async (eventId, eventData) => {
    if (!window.confirm('Are you sure you want to delete this event?')) {
      return;
    }

    try {
      // Send deletion notification if it's a team event
      if (eventData.type === 'team') {
        await sendEventUpdateNotification(eventData, 'deleted');
      }

      await deleteDoc(doc(db, 'calendarEvents', eventId));
      alert('Event deleted successfully!');
    } catch (error) {
      console.error('Error deleting event:', error);
      alert('Failed to delete event. Please try again.');
    }
  };

  const eventStyleGetter = (event) => {
    let style = {
      backgroundColor: '#3B82F6',
      borderRadius: '5px',
      opacity: 0.8,
      color: 'white',
      border: '0px',
      display: 'block'
    };

    if (event.type === 'personal') {
      style.backgroundColor = '#10B981';
    }

    return { style };
  };

  const CustomEvent = ({ event }) => (
    <div className="p-1">
      <div className="font-semibold text-sm">{event.title}</div>
      {event.description && (
        <div className="text-xs opacity-90">{event.description}</div>
      )}
      {event.userEmail && (
        <div className="text-xs opacity-75">by {event.userEmail}</div>
      )}
    </div>
  );

  // Show Firebase error if there's one
  if (firebaseError) {
    return (
      <div className="p-6">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <strong className="font-bold">Firebase Error: </strong>
          <span className="block sm:inline">{firebaseError}</span>
        </div>
        <div className="text-center">
          <p className="text-gray-600 mb-4">There was an issue connecting to the calendar database.</p>
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

  if (!auth.currentUser) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="text-xl font-semibold text-gray-700 mb-2">Please log in to access the calendar</div>
          <p className="text-gray-500">You need to be authenticated to view and manage calendar events.</p>
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
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Calendar</h1>
        
        {/* Calendar Type Toggle */}
        <div className="flex space-x-4 mb-6">
          <button
            onClick={() => setCalendarType('team')}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              calendarType === 'team'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Team Calendar
          </button>
          <button
            onClick={() => setCalendarType('personal')}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              calendarType === 'personal'
                ? 'bg-green-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Personal Calendar
          </button>
        </div>

        {/* Add Event Button */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800">
            {calendarType === 'team' ? 'Team Events' : 'Personal Events'}
          </h2>
          <button
            onClick={() => setShowAddEventModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Add Event
          </button>
        </div>
      </div>

      {/* Calendar */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: 600 }}
          eventPropGetter={eventStyleGetter}
          components={{
            event: CustomEvent
          }}
          onDoubleClickEvent={(event) => {
            if (event.userId === auth.currentUser?.uid || userRole === 'admin') {
              handleEditEvent(event);
            }
          }}
          selectable
          popup
          tooltipAccessor={(event) => `${event.title}${event.description ? ` - ${event.description}` : ''}`}
        />
      </div>

      {/* Add Event Modal */}
      {showAddEventModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              Add {calendarType === 'team' ? 'Team' : 'Personal'} Event
            </h3>
            
            <form onSubmit={handleAddEvent}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Event Title *
                </label>
                <input
                  type="text"
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={newEvent.description}
                  onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="3"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={formatDateForInput(newEvent.start)}
                  onChange={(e) => {
                    const date = new Date(e.target.value);
                    setNewEvent({ ...newEvent, start: date });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={formatDateForInput(newEvent.end)}
                  onChange={(e) => {
                    const date = new Date(e.target.value);
                    setNewEvent({ ...newEvent, end: date });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="flex space-x-3">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors"
                >
                  Add Event
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddEventModal(false)}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-md transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Event Modal */}
      {showEditEventModal && editingEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              Edit Team Event
            </h3>
            
            <form onSubmit={handleSaveEdit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Event Title *
                </label>
                <input
                  type="text"
                  value={editingEvent.title}
                  onChange={(e) => setEditingEvent({ ...editingEvent, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={editingEvent.description}
                  onChange={(e) => setEditingEvent({ ...editingEvent, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="3"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={formatDateForInput(editingEvent.start)}
                  onChange={(e) => setEditingEvent({ ...editingEvent, start: new Date(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={formatDateForInput(editingEvent.end)}
                  onChange={(e) => setEditingEvent({ ...editingEvent, end: new Date(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="flex space-x-3">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors"
                >
                  Update Event
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditEventModal(false);
                    setEditingEvent(null);
                  }}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteEvent(editingEvent.id, editingEvent)}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md transition-colors"
                >
                  Delete Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarPage; 