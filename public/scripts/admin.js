class AdminHandler {
    constructor(serverUrl) {
        this.ws = new WebSocket(serverUrl); // Connect as admin
        this.ws.onopen = this.onOpen.bind(this);
        this.ws.onmessage = this.onMessage.bind(this);
        this.ws.onclose = this.onClose.bind(this);
        this.ws.onerror = this.onError.bind(this);

        // Bind event listeners
        document.getElementById('startSessionButton').addEventListener('click', this.startSession.bind(this));
        document.getElementById('dispatchQuestionsButton').addEventListener('click', this.dispatchQuestions.bind(this));
    }

    // Handle WebSocket connection opening
    onOpen() {
        console.log('Connected to WebSocket server');
    }

    // Handle WebSocket connection closing
    onClose() {
        console.log('WebSocket connection closed');
    }

    // Handle WebSocket errors
    onError(error) {
        console.error('WebSocket error:', error);
    }

    // Handle incoming messages from WebSocket
    onMessage(event) {
        const data = JSON.parse(event.data);
        console.log('Received data:', data);

        switch (data.type) {
            case 'user-id':
                this.handleUserId(data);
                break;
            case 'session-created':
                this.handleSessionCreated(data);
                break;
            case 'connected-users':
                this.handleConnectedUsers(data);
                break;
            case 'user-response':
                this.handleUserResponse(data);
                break;
            default:
                console.log('Unknown message type:', data.type);
        }
    }

    // Handle user ID response (if needed)
    handleUserId(data) {
        console.log(`User ID: ${data.userId}`);
    }

    // Handle session creation response
    handleSessionCreated(data) {
        document.getElementById('sessionMessage').innerText = data.message;
        document.getElementById('dispatchQuestionsButton').disabled = false; // Enable the dispatch button
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
                numUsers: parseInt(numUsers), // Send the number of users to WebSocket server
            }));
        } else {
            alert('Please enter a valid number of users.');
        }
    }

    // Handle dispatch questions click event
    dispatchQuestions() {
        const sessionId = 1; // Assuming the session ID is 1, or you could get it dynamically
        this.ws.send(JSON.stringify({
            type: 'start-questions',
            sessionId: sessionId,
        }));
    }
}

// Initialize the AdminHandler with the WebSocket server URL
const adminHandler = new AdminHandler('ws://localhost:8080?admin=true');
