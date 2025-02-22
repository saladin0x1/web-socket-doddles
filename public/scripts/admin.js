class AdminHandler {
    constructor(serverUrl) {
        this.ws = new WebSocket(serverUrl); // Connect as admin
        this.ws.onopen = this.onOpen.bind(this);
        this.ws.onmessage = this.onMessage.bind(this);
        this.ws.onclose = this.onClose.bind(this);
        this.ws.onerror = this.onError.bind(this);

        // Bind event listeners for start session and dispatch questions buttons
        document.getElementById('startSessionButton').addEventListener('click', this.startSession.bind(this));
        document.getElementById('dispatchQuestionsButton').addEventListener('click', this.dispatchQuestions.bind(this));

        this.dispatchButton = document.getElementById('dispatchQuestionsButton'); // Store dispatch button
    }

    // Handle WebSocket connection opening
    onOpen() {
        console.log('Connected to WebSocket server');
    }

    // Handle WebSocket connection closing
    onClose() {
        console.log('WebSocket connection closed');
        this.dispatchButton.disabled = true; // Disable dispatch button on disconnect
    }

    // Handle WebSocket errors
    onError(error) {
        console.error('WebSocket error:', error);
        this.dispatchButton.disabled = true; // Disable dispatch button on error
    }

    // Handle incoming messages from WebSocket
    onMessage(event) {
        const data = JSON.parse(event.data);
        console.log('Received data from server:', data);  // Log the incoming data from WebSocket

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
            case 'user-response': // No longer directly used in admin, responses are batched now
                this.handleUserResponse(data);
                break;
            case 'question':
                this.handleQuestion(data);
                break;
            case 'user-responses':
                this.handleUserResponses(data);
                break;
            case 'error':
                this.handleError(data);
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
        console.log('Session created:', data);
        document.getElementById('sessionMessage').innerText = data.message;
        this.dispatchButton.disabled = false; // Enable the dispatch button
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

    // Handle user responses (legacy - individual responses, not used as batch is preferred now)
    handleUserResponse(data) {
        const tableBody = document.getElementById('responsesTable').getElementsByTagName('tbody')[0];

        // Create a new row for the response
        const row = tableBody.insertRow();

        // Insert cells for each piece of data
        row.insertCell(0).innerText = data.userId;       // User ID
        row.insertCell(1).innerText = data.answer;        // User's answer
        row.insertCell(2).innerText = data.timestamp;     // Timestamp of the response
    }

    // Handle incoming question data
    handleQuestion(data) {
        console.log('New question received:', data);
        // Here you can update the UI to show the question and available responses (Admin UI doesn't need to show questions)
    }

    // Handle incoming user responses data (BATCH of responses for a question)
    handleUserResponses(data) {
        console.log('User responses received for question:', data.questionIndex + 1, data.responses);
        const tableBody = document.getElementById('responsesTable').getElementsByTagName('tbody')[0];
        // Clear only if you want to refresh table for each question, otherwise append
        // tableBody.innerHTML = ''; // Clear previous responses - Let's keep appending for session history

        data.responses.forEach(response => {
            const row = tableBody.insertRow();
            row.insertCell(0).innerText = response.userId;
            row.insertCell(1).innerText = response.response;
            row.insertCell(2).innerText = response.timestamp;
            row.insertCell(3).innerText = data.questionIndex + 1; // Display question number
        });
    }

    // Handle errors
    handleError(data) {
        console.error('Error from server:', data.message);
        document.getElementById('sessionMessage').innerText = `Error: ${data.message}`; // Display error message
        this.dispatchButton.disabled = true; // Disable dispatch button on error
    }

    // Handle start session click event
    startSession() {
        const numUsers = document.getElementById('numUsers').value;
        const numQuestions = document.getElementById('numQuestions').value; // Get number of questions

        if (numUsers && !isNaN(numUsers) && numQuestions && !isNaN(numQuestions)) {
            this.ws.send(JSON.stringify({
                type: 'admin-start',
                numUsers: parseInt(numUsers),
                numQuestions: parseInt(numQuestions) // Send number of questions to server
            }));
            document.getElementById('sessionMessage').innerText = 'Starting session...'; // Feedback message
            this.dispatchButton.disabled = true; // Disable until session is created
        } else {
            alert('Please enter valid numbers for users and questions.');
        }
    }

    // Handle dispatch questions click event
    dispatchQuestions() {
        const sessionId = 1; // Assuming the session ID is 1, or you could get it dynamically
        this.ws.send(JSON.stringify({
            type: 'start-questions',
            sessionId: sessionId,
        }));
        this.dispatchButton.disabled = true; // Disable after dispatch to prevent re-dispatch
        this.dispatchButton.innerText = 'Questions Dispatched'; // Update button text
        setTimeout(() => { // Re-enable and reset text after some time (e.g., after questions are likely answered)
            this.dispatchButton.disabled = false;
            this.dispatchButton.innerText = 'Dispatch Questions';
        }, 15000); // 15 seconds - adjust as needed
    }
}

// Initialize the AdminHandler with the WebSocket server URL
const adminHandler = new AdminHandler('ws://localhost:8080?admin=true');