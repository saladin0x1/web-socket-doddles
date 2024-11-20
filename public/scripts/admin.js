const ws = new WebSocket('ws://localhost:8080?admin=true');  // Connect as admin

ws.onopen = () => {
    console.log('Connected to WebSocket server');
};

ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    console.log('Received data:', data);

    if (data.type === 'user-id') {
        // Log the user ID if needed
        console.log(`User ID: ${data.userId}`);
    }

    if (data.type === 'session-created') {
        // Show session creation message
        document.getElementById('sessionMessage').innerText = data.message;

        // Enable the dispatch questions button
        document.getElementById('dispatchQuestionsButton').disabled = false;
    }

    if (data.type === 'connected-users') {
        // Display connected users
        const usersList = document.getElementById('connectedUsersList');
        usersList.innerHTML = ''; // Clear the list

        data.users.forEach(user => {
            const li = document.createElement('li');
            li.innerText = `User ${user.userId}`;
            usersList.appendChild(li);
        });
    }

    if (data.type === 'user-response') {
        // Display user responses in the table
        const tableBody = document.getElementById('responsesTable').getElementsByTagName('tbody')[0];
        const row = tableBody.insertRow();
        row.insertCell(0).innerText = data.userId;
        row.insertCell(1).innerText = data.answer;
        row.insertCell(2).innerText = data.timestamp;
    }
};

// Handle start session click event
document.getElementById('startSessionButton').addEventListener('click', () => {
    const numUsers = document.getElementById('numUsers').value;

    if (numUsers && !isNaN(numUsers)) {
        ws.send(JSON.stringify({
            type: 'admin-start',
            numUsers: parseInt(numUsers)  // Send number of users to WebSocket server
        }));
    } else {
        alert("Please enter a valid number of users.");
    }
});
