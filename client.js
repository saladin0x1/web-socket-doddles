const WebSocket = require('ws');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

const ws = new WebSocket('ws://localhost:8080');

// Handle messages from the server
ws.on('message', (message) => {
    const data = JSON.parse(message);
    console.log("Server:", data);

    if (data.type === 'question') {
        rl.question(`${data.question}\n`, (answer) => {
            ws.send(JSON.stringify({ type: 'answer', answer: answer }));
        });
    }
});

// Admin or User flow
rl.question("Are you an admin or user? (admin/user): ", (role) => {
    if (role === 'admin') {
        // Admin-specific flow
        rl.question("How many users? ", (numUsers) => {
            ws.send(JSON.stringify({ type: 'admin-start', numUsers: Number(numUsers) }));

            // Wait for session creation confirmation
            ws.on('message', (message) => {
                const data = JSON.parse(message);
                if (data.type === 'session-created') {
                    console.log(`Session created: ID = ${data.sessionId}`);
                    
                    // Give the admin the option to start questions
                    rl.question("Start sending questions to the session? (yes/no): ", (start) => {
                        if (start.toLowerCase() === 'yes') {
                            ws.send(JSON.stringify({ 
                                type: 'start-questions', 
                                sessionId: data.sessionId 
                            }));
                        } else {
                            console.log("You can start questions later by reconnecting as admin.");
                        }
                    });
                }
            });
        });
    } else {
        // User-specific flow
        rl.question("Enter session ID to join: ", (sessionId) => {
            ws.send(JSON.stringify({ type: 'join-session', sessionId: Number(sessionId) }));
        });
    }
});
