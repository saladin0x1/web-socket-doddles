const WebSocket = require('ws');
const morgan = require('morgan');
const express = require('express');
const chalk = require('chalk').default;
const fs = require('fs');
const path = require('path');

// Define the WebSocket Server and Express Server URLs
const WEBSOCKET_PORT = 8080;
const EXPRESS_PORT = 3000;

// Question data storage
let questions = [];

// Store connected users, sessions, and responses
const sessions = {};
let sessionCount = 0;
let userCount = 0;
let availableUserIds = [];
let userResponses = {};
let userLimit = 0;
let adminWs = null;  // Store admin WebSocket connection

class WebSocketServer {
  constructor() {
    // Create Express server for static files and logging
    this.app = express();
    this.app.use(morgan('dev'));
    this.app.use(express.static('public'));
    this.app.listen(EXPRESS_PORT, () => {
      console.log(chalk.green(`Express server started on http://localhost:${EXPRESS_PORT}`));
    });

    // Create WebSocket server
    this.wss = new WebSocket.Server({ port: WEBSOCKET_PORT });
    console.log(chalk.green(`WebSocket server started on ws://localhost:${WEBSOCKET_PORT}`));

    // Initialize event handlers
    this.wss.on('connection', this.onConnection.bind(this));
  }

  onConnection(ws, req) {
    const isAdmin = req.url.includes('admin=true');
    let userId;

    if (isAdmin) {
      console.log(chalk.blue(`Admin connected from ${req.connection.remoteAddress}`));
      this.handleAdminConnection(ws, req);
    } else {
      console.log(chalk.yellow(`User connected from ${req.connection.remoteAddress}`));
      this.handleUserConnection(ws);
    }
  }

  handleAdminConnection(ws, req) {
    adminWs = ws;  // Save the admin WebSocket connection

    ws.on('message', (message) => {
      const data = JSON.parse(message);
      if (data.type === 'admin-start') {
        const numUsers = data.numUsers;
        if (numUsers && !isNaN(numUsers)) {
          userLimit = numUsers;
          const sessionId = ++sessionCount;
          sessions[sessionId] = { users: [], responses: {}, questionIndex: 0 };
          ws.send(JSON.stringify({
            type: 'session-created',
            sessionId,
            message: `Session ${sessionId} created for ${numUsers} users.`,
          }));
          console.log(chalk.green(`Session ${sessionId} created for ${numUsers} users.`));
        } else {
          ws.send(JSON.stringify({ type: 'error', message: 'Invalid number of users provided.' }));
          console.log(chalk.red('Invalid number of users provided by admin.'));
        }
      } else if (data.type === 'start-questions') {
        const sessionId = data.sessionId;
        if (sessions[sessionId]) {
          if (sessions[sessionId].users.length === userLimit) {
            this.startQuestionsForSession(sessionId);
          } else {
            ws.send(JSON.stringify({ type: 'error', message: 'Not enough users connected to start the session.' }));
            console.log(chalk.red(`Not enough users in session ${sessionId} to start the quiz.`));
          }
        } else {
          ws.send(JSON.stringify({ type: 'error', message: 'Session does not exist.' }));
          console.log(chalk.red(`Session ${sessionId} does not exist.`));
        }
      }
    });
  }

  handleUserConnection(ws) {
    let userId;

    // Reject if the session is full or hasn't started yet
    if (!sessions[1] || sessions[1].users.length >= userLimit) {
      ws.send(JSON.stringify({ type: 'error', message: 'Session Full or Not Started' }));
      ws.close();
      console.log(chalk.red('User rejected. Session is full or not started.'));
      return;
    }

    // Reuse available user ID or generate a new one
    if (availableUserIds.length > 0) {
      userId = availableUserIds.pop();
      console.log(chalk.green(`Reusing user ID: ${userId}`));
    } else {
      userId = ++userCount;
      console.log(chalk.green(`New user ID assigned: ${userId}`));
    }

    // Send user ID to the client
    ws.send(JSON.stringify({
      type: 'user-id',
      userId,
      message: `You are user: ${userId}`,
    }));

    // Register the user for session 1
    sessions[1].users.push({ userId, ws });

    // Handle user disconnection
    ws.on('close', () => {
      console.log(chalk.yellow(`User ${userId} disconnected.`));
      const session = sessions[1];
      if (session) {
        const index = session.users.findIndex(u => u.userId === userId);
        if (index !== -1) {
          session.users.splice(index, 1);
          console.log(chalk.green(`User ${userId} removed from session.`));
        }
      }
      availableUserIds.push(userId);
      console.log(chalk.green(`User ID ${userId} slot is now available for reuse.`));
    });

    ws.on('message', (message) => {
      const data = JSON.parse(message);
      if (data.type === 'user-response') {
        const { userId, sessionId, answer } = data;
        if (!userResponses[sessionId]) {
          userResponses[sessionId] = {};
        }
        userResponses[sessionId][userId] = { answer, timestamp: new Date().toISOString() };
        console.log(chalk.green(`User ${userId} responded to session ${sessionId}: ${answer}`));
        
        // Check if all users have responded
        this.checkAllResponses(sessionId);
      }
    });
  }

  checkAllResponses(sessionId) {
    const session = sessions[sessionId];
    const totalUsers = session.users.length;
    const responses = Object.keys(userResponses[sessionId] || {}).length;

    if (responses === totalUsers) {
      // All users have responded
      this.sendNextQuestion(sessionId);
    }
  }

  sendNextQuestion(sessionId) {
    const session = sessions[sessionId];
    const questionIndex = session.questionIndex;

    if (questionIndex < questions.length) {
      const question = questions[questionIndex];
      this.broadcastToSession(sessionId, {
        type: 'question',
        question: question.question,
        level: question.level,
        responses: question.responses,
      });

      // Send the responses to the admin after the question is answered
      this.sendResponsesToAdmin(sessionId);

      // Increment question index
      session.questionIndex++;
      session.responses = {}; // Clear previous responses for the next question
    } else {
      this.broadcastToSession(sessionId, {
        type: 'message',
        message: 'All questions completed!',
      });
    }
  }

  sendResponsesToAdmin(sessionId) {
    if (adminWs) {
      const session = sessions[sessionId];
      const responses = userResponses[sessionId] || {};

      const responseData = Object.keys(responses).map(userId => ({
        userId,
        response: responses[userId].answer,
        timestamp: responses[userId].timestamp,
      }));

      adminWs.send(JSON.stringify({
        type: 'user-responses',
        sessionId,
        responses: responseData,
      }));
      console.log(chalk.green(`Sent responses to admin for session ${sessionId}`));
    }
  }

  startQuestionsForSession(sessionId) {
    sessions[sessionId].questionIndex = 0;  // Start from the first question
    this.sendNextQuestion(sessionId);  // Send the first question
  }

  broadcastToSession(sessionId, message) {
    if (sessions[sessionId]) {
      sessions[sessionId].users.forEach(client => {
        if (client.ws.readyState === WebSocket.OPEN) {
          client.ws.send(JSON.stringify(message));
        }
      });
    }
  }
}

class QuestionLoader {
  static loadQuestionsFromFile(filePath) {
    if (!fs.existsSync(filePath)) {
      console.error("File not found:", filePath);
      return [];
    }
    try {
      const data = fs.readFileSync(filePath, 'utf8');
      const jsonData = JSON.parse(data);

      // Ensure this matches the format you're expecting
      return jsonData.Sheet1.map(item => ({
        question: item.QUESTION,
        level: item.LEVEL,
        correctResponse: item.CORRECTRESPONSE,
        responses: [
          item.RESPONSE2,
          item.RESPONSE3,
          item.RESPONSE4
        ]
      }));
    } catch (error) {
      console.error("Error reading or parsing the file:", error);
      return [];
    }
  }
}

// Load questions from a JSON file
const questionsFilePath = path.join(__dirname, 'questions_sample_smarter.json'); // Adjust the path
questions = QuestionLoader.loadQuestionsFromFile(questionsFilePath);

// Create and start the WebSocket server
new WebSocketServer();
