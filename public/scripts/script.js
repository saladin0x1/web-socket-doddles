class UserHandler {
    constructor(serverUrl) {
        console.log("Initializing UserHandler");
        this.ws = new WebSocket(serverUrl); // Create a WebSocket connection
        this.userId = null;
        this.sessionId = null;
        this.questionNum = 0; // Keep track of the current question number

        // Bind WebSocket event listeners
        this.ws.onopen = this.onOpen.bind(this);
        this.ws.onmessage = this.onMessage.bind(this);
        this.ws.onclose = this.onClose.bind(this);
    }

    // WebSocket connection established
    onOpen() {
        console.log('Connected to WebSocket server');
    }

    // Handle incoming messages from the server
    onMessage(event) {
        const data = JSON.parse(event.data);
        console.log('Message received from WebSocket:', data);
        
        switch (data.type) {
            case 'user-id':
                this.handleUserId(data);
                break;
            case 'error':
                this.handleError(data);
                break;
            case 'question':
                this.handleQuestion(data);
                break;
            default:
                console.log('Unknown message type:', data.type);
        }
    }

    // Handle user ID assignment
    handleUserId(data) {
        this.userId = data.userId;
        this.sessionId = data.sessionId;
        
        document.getElementById('userMessage').innerText = `You are user: ${this.userId}`;
        console.log(`Assigned User ID: ${this.userId}, Session ID: ${this.sessionId}`);
        
        document.title = `User ${this.userId} | Waiting for Question`;
    }

    // Handle error messages from the server
    handleError(data) {
        if (data.message === 'Session Full') {
            document.getElementById('userMessage').innerText = 'Sorry, the session is full. Please try again later.';
            console.log('Error: Session is full');
            setTimeout(() => {
                window.location.reload(); // Reload after delay
            }, 3000);
        } else {
            console.log('Error:', data.message);
        }
    }

    // Handle incoming question
    handleQuestion(data) {
        this.questionNum += 1; // Increment question number
        
        console.log('Handling new question:', data);

        // Update the question text on the page
        document.getElementById('question').innerText = data.question || "No question provided";
        document.getElementById('responseSection').style.display = 'block';

        // Update the page title
        document.title = `User ${this.userId} | Question ${this.questionNum}`;
        console.log(`Displaying Question ${this.questionNum} for User ${this.userId}`);

        const responseRadioButtons = document.getElementById('responseRadioButtons');
        if (!responseRadioButtons) {
            console.error('responseRadioButtons element not found');
            return;
        }

        responseRadioButtons.innerHTML = ''; // Clear previous radio buttons if any

        // Ensure responses are received properly
        const responses = data.responses || [];
        console.log('Responses:', responses);

        if (responses.length > 0) {
            // Render radio buttons for each response
            responses.forEach((response, index) => {
                const radioContainer = document.createElement('div');
                const radioButton = document.createElement('input');
                radioButton.type = 'radio';
                radioButton.id = `response_${index}`;
                radioButton.name = 'responses'; // Group radio buttons together
                radioButton.value = response;

                const label = document.createElement('label');
                label.setAttribute('for', `response_${index}`);
                label.innerText = response;

                radioContainer.appendChild(radioButton);
                radioContainer.appendChild(label);

                // Append to the responseRadioButtons container
                responseRadioButtons.appendChild(radioContainer);
            });
        } else {
            console.log('No responses available');
            const noResponsesMessage = document.createElement('p');
            noResponsesMessage.innerText = 'No responses available.';
            responseRadioButtons.appendChild(noResponsesMessage);
        }
    }

    // Handle WebSocket connection closure
    onClose() {
        console.log('WebSocket connection closed');
    }
}

// Initialize the UserHandler with the WebSocket server URL
const userHandler = new UserHandler('ws://localhost:8080');
