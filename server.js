const WebSocket = require('ws');
const morgan = require('morgan');
const express = require('express');
const chalk = require('chalk').default;

class SessionManager {
  constructor() {
    this.sessions = {};
    this.sessionCount = 0;
    this.userCount = 0;
    this.availableUserIds = [];
    this.userResponses = {};
    this.userLimit = 0;
  }

  // Create a session with a given number of users
  createSession(numUsers, ws) {
    if (numUsers && !isNaN(numUsers)) {
      const sessionId = ++this.sessionCount;
      this.sessions[sessionId] = [];
      this.userLimit = numUsers;

      ws.send(JSON.stringify({
        type: 'session-created',
        sessionId: sessionId,
        message: `Session ${sessionId} created for ${numUsers} users.`,
      }));

      console.log(chalk.green(`Session ${sessionId} created for ${numUsers} users.`));
    } else {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Invalid number of users provided.',
      }));
      console.log(chalk.red('Invalid number of users provided by admin.'));
    }
  }

  // Broadcast message to all clients in a session
  broadcastToSession(sessionId, message) {
    if (this.sessions[sessionId]) {
      this.sessions[sessionId].forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(message));
        }
      });
    }
  }

  // Add user to session
  addUserToSession(ws) {
    let userId;

    // Reuse available user ID if there is a freed slot
    if (this.availableUserIds.length > 0) {
      userId = this.availableUserIds.pop();
      console.log(chalk.green(`Reusing user ID: ${userId}`));
    } else {
      userId = ++this.userCount;
      console.log(chalk.green(`New user ID assigned: ${userId}`));
    }

    // Send user ID to client
    ws.send(JSON.stringify({
      type: 'user-id',
      userId: userId,
      message: `You are user: ${userId}`,
    }));

    // Ensure session exists and add user to session
    if (!this.sessions[1]) {
      this.sessions[1] = [];
    }
    this.sessions[1].push(ws);

    return userId;
  }

  // Remove user from session
  removeUserFromSession(userId, ws) {
    const session = this.sessions[1];
    if (session) {
      const index = session.indexOf(ws);
      if (index !== -1) {
        session.splice(index, 1);
        console.log(chalk.green(`User ${userId} removed from session.`));
      }
    }

    // Reuse the userId slot by adding it back to availableUserIds
    this.availableUserIds.push(userId);
    console.log(chalk.green(`User ID ${userId} slot is now available for reuse.`));
  }

  // Track user responses
  trackUserResponse(data) {
    const { userId, sessionId, answer } = data;

    if (!this.userResponses[sessionId]) {
      this.userResponses[sessionId] = {};
    }

    this.userResponses[sessionId][userId] = {
      answer: answer,
      timestamp: new Date().toISOString(),
    };

    console.log(chalk.green(`User ${userId} responded to session ${sessionId}: ${answer}`));
  }
}

class WebSocketServer {
  constructor() {
    this.sessionManager = new SessionManager();
    this.wss = new WebSocket.Server({ port: 8080 });
    this.setupWebSocket();
  }

  // Set up WebSocket server
  setupWebSocket() {
    this.wss.on('connection', (ws, req) => {
      let userId;
      const isAdmin = req.url.includes('admin=true');  // Check if this is an admin connection

      if (isAdmin) {
        this.handleAdminConnection(ws);
      } else {
        userId = this.handleUserConnection(ws);
        this.handleUserMessages(ws, userId);
      }
    });
  }

  // Handle admin connection
  handleAdminConnection(ws) {
    console.log(chalk.blue(`Admin connected from ${ws._socket.remoteAddress}`));

    ws.on('message', (message) => {
      const data = JSON.parse(message);

      if (data.type === 'admin-start') {
        const numUsers = data.numUsers;
        this.sessionManager.createSession(numUsers, ws);
      } else if (data.type === 'start-questions') {
        const sessionId = data.sessionId;
        if (this.sessionManager.sessions[sessionId]) {
          this.startQuestionsForSession(sessionId);
        } else {
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Session does not exist.',
          }));
          console.log(chalk.red(`Session ${sessionId} does not exist.`));
        }
      }
    });
  }

  // Start the question sequence for a session
  startQuestionsForSession(sessionId) {
    const questions = [
      "What's your favorite color?",
      "What's your favorite food?",
      "What's your hobby?"
    ];

    questions.forEach((question, index) => {
      setTimeout(() => {
        this.sessionManager.broadcastToSession(sessionId, {
          type: 'question',
          question: question,
        });
      }, index * 5000);
    });
    console.log(chalk.green(`Questions started for session ${sessionId}.`));
  }

  // Handle user connection
  handleUserConnection(ws) {
    let userId;

    console.log(chalk.yellow(`User connected from ${ws._socket.remoteAddress}`));

    if (this.sessionManager.sessions[1] && this.sessionManager.sessions[1].length >= this.sessionManager.userLimit) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Session Full',
      }));
      ws.close();
      console.log(chalk.red('User rejected. Session is full.'));
      return;
    }

    userId = this.sessionManager.addUserToSession(ws);

    // Handle user disconnection
    ws.on('close', () => {
      console.log(chalk.yellow(`User ${userId} disconnected.`));
      this.sessionManager.removeUserFromSession(userId, ws);
    });

    return userId;
  }

  // Handle user messages
  handleUserMessages(ws, userId) {
    ws.on('message', (message) => {
      const data = JSON.parse(message);

      if (data.type === 'user-response') {
        this.sessionManager.trackUserResponse(data);
      }
    });
  }
}

class Server {
  constructor() {
    this.app = express();
    this.webSocketServer = new WebSocketServer();
    this.setupExpress();
  }

  // Set up Express server
  setupExpress() {
    this.app.use(morgan('dev'));
    this.app.use(express.static('public'));

    this.app.listen(3000, () => {
      console.log(chalk.green("Express server started on http://localhost:3000"));
    });
  }
}

// Start the server
new Server();
