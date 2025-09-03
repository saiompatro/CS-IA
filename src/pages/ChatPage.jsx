import { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, where, deleteDoc, doc, getDocs } from 'firebase/firestore';

const ChatPage = () => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [clearingChat, setClearingChat] = useState(false);
  const [userRole, setUserRole] = useState(localStorage.getItem('userRole') || 'employee');
  const [calendarNotifications, setCalendarNotifications] = useState(0);

  useEffect(() => {
    // Query messages from Firestore with the most recent first
    const q = query(
      collection(db, 'messages'),
      orderBy('createdAt')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messagesList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      
      setMessages(messagesList);
      
      // Count calendar notifications (system messages)
      const notificationCount = messagesList.filter(msg => msg.isSystemMessage).length;
      setCalendarNotifications(notificationCount);
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const clearChat = async () => {
    if (!window.confirm('Are you sure you want to clear all chat messages? This action cannot be undone.')) {
      return;
    }

    try {
      setClearingChat(true);

      // Get all messages
      const messagesRef = collection(db, 'messages');
      const messagesSnapshot = await getDocs(messagesRef);

      // Delete each message
      const deletePromises = messagesSnapshot.docs.map(doc => 
        deleteDoc(doc.ref)
      );

      await Promise.all(deletePromises);
      alert('All chat messages have been cleared successfully.');
    } catch (error) {
      console.error('Error clearing chat:', error);
      alert('Failed to clear chat messages. Please try again later.');
    } finally {
      setClearingChat(false);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    
    if (newMessage.trim() === '') return;
    
    const user = auth.currentUser;
    
    try {
      await addDoc(collection(db, 'messages'), {
        text: newMessage,
        createdAt: serverTimestamp(),
        uid: user.uid,
        email: user.email,
        photoURL: user.photoURL,
      });
      
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  return (
    <div className="container mx-auto">
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-4 bg-gray-800 text-white flex justify-between items-center">
          <div className="flex items-center">
            <h1 className="text-xl font-bold">Team Chat</h1>
            {/* Calendar notification indicator */}
            {calendarNotifications > 0 && (
              <div className="ml-3 flex items-center">
                <span className="text-yellow-300 mr-2">📅</span>
                <span className="bg-yellow-500 text-yellow-900 text-xs font-bold px-2 py-1 rounded-full">
                  {calendarNotifications} Calendar Event{calendarNotifications !== 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>
          {userRole === 'admin' && (
            <button
              onClick={clearChat}
              disabled={clearingChat}
              className="bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {clearingChat ? 'Clearing...' : 'Clear Chat'}
            </button>
          )}
        </div>
        
        {/* Messages container */}
        <div className="h-[calc(100vh-250px)] overflow-y-auto p-4">
          {loading ? (
            <div className="text-center py-4">Loading messages...</div>
          ) : messages.length === 0 ? (
            <div className="text-center py-4 text-gray-500">No messages yet. Start a conversation!</div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`mb-4 flex ${
                  msg.uid === auth.currentUser?.uid ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`rounded-lg max-w-xs md:max-w-md px-4 py-2 ${
                    msg.isSystemMessage
                      ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white border-l-4 border-yellow-400'
                      : msg.uid === auth.currentUser?.uid
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200'
                  }`}
                >
                  {/* System message header */}
                  {msg.isSystemMessage && (
                    <div className="flex items-center mb-2">
                      <span className="text-yellow-300 mr-2">🔔</span>
                      <p className="text-xs font-semibold text-yellow-300">{msg.email}</p>
                    </div>
                  )}
                  
                  {/* Regular user message header */}
                  {!msg.isSystemMessage && msg.uid !== auth.currentUser?.uid && (
                    <p className="text-xs font-semibold mb-1">{msg.email}</p>
                  )}
                  
                  {/* Message text with special formatting for system messages */}
                  <div className={msg.isSystemMessage ? 'whitespace-pre-line' : ''}>
                    {msg.isSystemMessage ? (
                      <div dangerouslySetInnerHTML={{ 
                        __html: msg.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') 
                      }} />
                    ) : (
                      <p>{msg.text}</p>
                    )}
                  </div>
                  
                  {/* Action buttons for system messages */}
                  {msg.isSystemMessage && msg.eventId && msg.eventId !== 'pending' && (
                    <div className="mt-2 flex space-x-2">
                      <button
                        onClick={() => window.open(`/calendar`, '_blank')}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-2 py-1 rounded transition-colors"
                      >
                        📅 View Calendar
                      </button>
                    </div>
                  )}
                  
                  {/* Timestamp */}
                  <p className={`text-xs mt-1 ${msg.isSystemMessage ? 'text-yellow-200' : 'opacity-75'}`}>
                    {msg.createdAt?.toDate ? msg.createdAt.toDate().toLocaleTimeString() : 
                     new Date(msg.createdAt).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
        
        {/* Message input form */}
        <div className="border-t p-4">
          <form onSubmit={sendMessage} className="flex">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 border rounded-l-lg py-2 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="bg-blue-500 text-white px-4 py-2 rounded-r-lg hover:bg-blue-600 transition-colors"
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChatPage; 