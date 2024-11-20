class AdminHandler {
    constructor(serverUrl) {
      this.ws = new WebSocket(serverUrl); // Connect as admin
      this.ws.onopen = this.onOpen.bind(this);
      this.ws.onmessage = this.onMessage.bind(this);
      this.ws.onclose = this.onClose.bind(this);
  
      // Bind event listeners
      document.getElementById('startSessionButton').addEventListener('click', this.startSession.bind(this));
    }
  
    // Handle WebSocket connection opening
    onOpen() {
      console.log('Connected to WebSocket server');
    }
  
    // Handle incoming messages from WebSocket
    onMessage(event) {
      const data = JSON.parse(event.data);
      console.log('Received data:', data);
  
      if (data.type === 'user-id') {
        this.handleUserId(data);
      }
  
      if (data.type === 'session-created') {
        this.handleSessionCreated(data);
      }
  
      if (data.type === 'connected-users') {
        this.handleConnectedUsers(data);
      }
  
      if (data.type === 'user-response') {
        this.handleUserResponse(data);
      }
    }
  
    // Handle user ID response (if needed)
    handleUserId(data) {
      console.log(`User ID: ${data.userId}`);
    }
  
    // Handle session creation response
    handleSessionCreated(data) {
      document.getElementById('sessionMessage').innerText = data.message;
  
      // Enable the dispatch questions button
      document.getElementById('dispatchQuestionsButton').disabled = false;
    }
  
    // Handle the list of connected users
    handleConnectedUsers(data) {
      const usersList = document.getElementById('connectedUsersList');
      usersList.innerHTML = ''; // Clear the list
  
      data.users.forEach(user => {
        const li = document.createElement('li');
        li.innerText = `User ${user.userId}`;
        usersList.appendChild(li);
      });
    }
  
    // Handle user responses
    handleUserResponse(data) {
      const tableBody = document.getElementById('responsesTable').getElementsByTagName('tbody')[0];
      const row = tableBody.insertRow();
      row.insertCell(0).innerText = data.userId;
      row.insertCell(1).innerText = data.answer;
      row.insertCell(2).innerText = data.timestamp;
    }
  
    // Handle start session click event
    startSession() {
      const numUsers = document.getElementById('numUsers').value;
  
      if (numUsers && !isNaN(numUsers)) {
        this.ws.send(JSON.stringify({
          type: 'admin-start',
          numUsers: parseInt(numUsers),  // Send number of users to WebSocket server
        }));
      } else {
        alert("Please enter a valid number of users.");
      }
    }
  
    // Handle WebSocket close event (if needed)
    onClose() {
      console.log('WebSocket connection closed');
    }
  }
  
  // Initialize the AdminHandler with the WebSocket server URL
  const adminHandler = new AdminHandler('ws://localhost:8080?admin=true');
  