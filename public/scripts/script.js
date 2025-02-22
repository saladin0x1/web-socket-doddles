class UserHandler {
  constructor(serverUrl) {
      console.log("Initializing UserHandler");
      this.ws = new WebSocket(serverUrl); // Create a WebSocket connection
      this.userId = null;
      this.sessionId = null;
      this.questionNum = 0; // Keep track of the current question number
      this.responseButtonsContainer = document.getElementById('responseButtons'); // Get the container for buttons

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
          case 'message': // Handle generic messages, e.g., "All questions completed!"
              this.handleMessage(data);
              break;
          default:
              console.log('Unknown message type:', data.type);
      }
  }

  handleMessage(data) {
      document.getElementById('question').innerText = data.message;
      document.getElementById('responseSection').style.display = 'none'; // Hide response section
      document.title = `Buzzer Quiz - Game Over`;
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
      document.getElementById('responseButtons').innerHTML = ''; // Clear previous buttons

      // Update the page title
      document.title = `User ${this.userId} | Question ${this.questionNum}`;
      console.log(`Displaying Question ${this.questionNum} for User ${this.userId}`);

      const responses = data.responses || [];
      console.log('Responses:', responses);

      if (responses.length > 0) {
          responses.forEach((response, index) => {
              const button = document.createElement('button');
              button.classList.add('response-button');
              button.textContent = response;
              button.onclick = () => this.submitResponse(response); // Attach click handler
              this.responseButtonsContainer.appendChild(button);
          });
      } else {
          console.log('No responses available');
          const noResponsesMessage = document.createElement('p');
          noResponsesMessage.innerText = 'No responses available.';
          this.responseButtonsContainer.appendChild(noResponsesMessage);
      }
  }

  // Submit user response to the server
  submitResponse(answer) {
      if (this.ws.readyState === WebSocket.OPEN) {
          const responseData = {
              type: 'user-response',
              userId: this.userId,
              sessionId: 1, // Assuming session ID is always 1 for users
              answer: answer,
          };
          this.ws.send(JSON.stringify(responseData));
          console.log(`Response submitted: ${answer}`);
          document.getElementById('responseSection').style.display = 'none'; // Hide buttons after response
          document.getElementById('question').innerText = 'Answer submitted. Waiting for next question...'; // Feedback to user
      } else {
          console.error('WebSocket connection not open. Cannot send response.');
      }
  }


  // Handle WebSocket connection closure
  onClose() {
      console.log('WebSocket connection closed');
  }
}

// Initialize the UserHandler with the WebSocket server URL
const userHandler = new UserHandler('ws://localhost:8080');