const WebSocket = require('ws');
const morgan = require('morgan');
const express = require('express');
const chalk = require('chalk').default;  // Ensure correct import for chalk in CommonJS

// Predefined questions
const questions = [
    "What's your favorite color?",
    "What's your favorite food?",
    "What's your hobby?",
];

// Store connected users, sessions, and responses
const sessions = {};
let sessionCount = 0;
let userCount = 0; // Track user IDs
let availableUserIds = []; // Track available user IDs (slots)
let userResponses = {}; // Track user responses with timestamps
let userLimit = 0; // Track user limit for sessions

// Create an Express server to serve static files and handle logging
const app = express();

// Use morgan for logging requests with colors and details
app.use(morgan('dev'));

// Serve static files (admin.html and index.html)
app.use(express.static('public'));

// Start the Express server on port 3000
app.listen(3000, () => {
    console.log(chalk.green("Express server started on http://localhost:3000"));
});

// Create WebSocket Server
const wss = new WebSocket.Server({ port: 8080 });

console.log(chalk.green("WebSocket server started on ws://localhost:8080"));

// Broadcast message to all users in a session
const broadcastToSession = (sessionId, message) => {
    if (sessions[sessionId]) {
        sessions[sessionId].forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(message));
            }
        });
    }
};

// Handle WebSocket connections
wss.on('connection', (ws, req) => {
    let userId;
    const isAdmin = req.url.includes('admin=true');  // Check if this is an admin connection

    if (isAdmin) {
        // Admin can start a session and define the user limit
        console.log(chalk.blue(`Admin connected from ${req.connection.remoteAddress}`));

        ws.on('message', (message) => {
            const data = JSON.parse(message);

            if (data.type === 'admin-start') {
                const numUsers = data.numUsers;  // Retrieve number of users sent by admin

                if (numUsers && !isNaN(numUsers)) {
                    userLimit = numUsers;  // Set the user limit
                    const sessionId = ++sessionCount;
                    sessions[sessionId] = [];

                    ws.send(JSON.stringify({
                        type: 'session-created',
                        sessionId: sessionId,
                        message: `Session ${sessionId} created for ${numUsers} users.`,
                    }));

                    console.log(chalk.green(`Session ${sessionId} created for ${numUsers} users.`));
                } else {
                    ws.send(JSON.stringify({
                        type: 'error',
                        message: 'Invalid number of users provided.'
                    }));
                    console.log(chalk.red('Invalid number of users provided by admin.'));
                }
            } else if (data.type === 'start-questions') {
                const sessionId = data.sessionId;
                if (sessions[sessionId]) {
                    questions.forEach((question, index) => {
                        setTimeout(() => {
                            broadcastToSession(sessionId, {
                                type: 'question',
                                question: question,
                            });
                        }, index * 5000);
                    });
                    console.log(chalk.green(`Questions started for session ${sessionId}.`));
                } else {
                    ws.send(JSON.stringify({
                        type: 'error',
                        message: 'Session does not exist.'
                    }));
                    console.log(chalk.red(`Session ${sessionId} does not exist.`));
                }
            }
        });
    } else {
        // Normal user connection (user ID generation)
        console.log(chalk.yellow(`User connected from ${req.connection.remoteAddress}`));

        if (sessions[1] && sessions[1].length >= userLimit) {
            // Reject the connection if the session is full
            ws.send(JSON.stringify({
                type: 'error',
                message: 'Session Full',
            }));
            ws.close(); // Close the connection
            console.log(chalk.red(`User rejected. Session is full.`));
            return;
        }

        // Reuse available user ID if there is a freed slot
        if (availableUserIds.length > 0) {
            userId = availableUserIds.pop();  // Reuse the available user ID
            console.log(chalk.green(`Reusing user ID: ${userId}`));
        } else {
            // If no available user slots, create a new user ID
            userId = ++userCount;
            console.log(chalk.green(`New user ID assigned: ${userId}`));
        }

        // Send user ID to client
        ws.send(JSON.stringify({
            type: 'user-id',
            userId: userId,
            message: `You are user: ${userId}`,
        }));

        // Add user to session
        if (!sessions[1]) {
            sessions[1] = []; // Create session if it doesn't exist
        }

        sessions[1].push(ws); // Add user to session 1

        // Handle user disconnection
        ws.on('close', () => {
            console.log(chalk.yellow(`User ${userId} disconnected.`));

            // Remove the user from the session
            const session = sessions[1];
            if (session) {
                const index = session.indexOf(ws);
                if (index !== -1) {
                    session.splice(index, 1); // Remove the user from the session
                    console.log(chalk.green(`User ${userId} removed from session.`));
                }
            }

            // Reuse the userId slot by adding it back to availableUserIds
            availableUserIds.push(userId);
            console.log(chalk.green(`User ID ${userId} slot is now available for reuse.`));
        });

        ws.on('message', (message) => {
            const data = JSON.parse(message);

            if (data.type === 'user-response') {
                // Track user responses
                const { userId, sessionId, answer } = data;

                if (!userResponses[sessionId]) {
                    userResponses[sessionId] = {};
                }

                userResponses[sessionId][userId] = {
                    answer: answer,
                    timestamp: new Date().toISOString(),
                };

                console.log(chalk.green(`User ${userId} responded to session ${sessionId}: ${answer}`));
            }
        });
    }
});
