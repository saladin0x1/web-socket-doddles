class UserHandler {
    constructor(serverUrl) {
        this.ws = new WebSocket(serverUrl); // Connect to the WebSocket server
        this.userId = null;
        this.sessionId = null;

        // Bind event listeners
        this.ws.onopen = this.onOpen.bind(this);
        this.ws.onmessage = this.onMessage.bind(this);
        this.ws.onclose = this.onClose.bind(this);

        // Bind button click listener dynamically
        this.submitResponse = this.submitResponse.bind(this);
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

        if (data.type === 'error') {
            this.handleError(data);
        }

        if (data.type === 'question') {
            this.handleQuestion(data);
        }
    }

    // Handle user ID response
    handleUserId(data) {
        this.userId = data.userId;
        this.sessionId = data.sessionId;

        // Display user ID
        document.getElementById('userMessage').innerText = `You are user: ${this.userId}`;
    }

    // Handle error message
    handleError(data) {
        if (data.message === 'Session Full') {
            document.getElementById('userMessage').innerText = 'Sorry, the session is full. Please try again later.';
            setTimeout(() => {
                window.location.reload();  // Reload to try again
            }, 3000);
        }
    }

    // Handle incoming question and display response buttons
    handleQuestion(data) {
        document.getElementById('question').innerText = data.question;
        document.getElementById('responseSection').style.display = 'block';

        // Display response buttons instead of text area
        const responseButtons = document.getElementById('responseButtons');
        responseButtons.innerHTML = ''; // Clear existing buttons

        const responses = [data.CORRECTRESPONSE, data.RESPONSE2, data.RESPONSE3, data.RESPONSE4];
        
        responses.forEach((response, index) => {
            const button = document.createElement('button');
            button.innerText = response;
            button.classList.add('response-button');
            button.onclick = () => this.submitResponse(response);
            responseButtons.appendChild(button);
        });
    }

    // Submit user response
    submitResponse(response) {
        if (this.userId && this.sessionId) {
            // Send user response
            this.ws.send(JSON.stringify({
                type: 'user-response',
                userId: this.userId,
                sessionId: this.sessionId,
                answer: response,
            }));

            // Disable response buttons after submission
            document.getElementById('responseSection').style.display = 'none';
            console.log('Answer submitted:', response);
        } else {
            console.log('Response or user/session info missing');
        }
    }

    // Handle WebSocket close event (if needed)
    onClose() {
        console.log('WebSocket connection closed');
    }
}

// Initialize the UserHandler with the WebSocket server URL
const userHandler = new UserHandler('ws://localhost:8080');
