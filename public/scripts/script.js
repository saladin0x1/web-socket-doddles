const ws = new WebSocket('ws://localhost:8080'); // Connect to the WebSocket server

ws.onopen = () => {
    console.log('Connected to WebSocket server');
};

ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    console.log('Received data:', data);

    if (data.type === 'user-id') {
        // Display user ID
        document.getElementById('userMessage').innerText = `You are user: ${data.userId}`;
    }

    if (data.type === 'error') {
        // Display error message if session is full
        if (data.message === 'Session Full') {
            document.getElementById('userMessage').innerText = 'Sorry, the session is full. Please try again later.';
            setTimeout(() => {
                window.location.reload();  // Reload to try again
            }, 3000);
        }
    }

    if (data.type === 'question') {
        // Display question and show response section
        document.getElementById('question').innerText = data.question;
        document.getElementById('responseSection').style.display = 'block';
    }
};

// Submit user response
document.getElementById('submitResponse').addEventListener('click', () => {
    const response = document.getElementById('userResponse').value;

    if (response) {
        ws.send(JSON.stringify({
            type: 'user-response',
            userId: 1,  // Set the appropriate user ID here
            sessionId: 1, // Session ID
            answer: response,
        }));
        document.getElementById('userResponse').value = '';  // Clear the input
    }
});
