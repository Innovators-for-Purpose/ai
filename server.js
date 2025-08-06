const http = require('http');
const fs = require('fs');
const path = require('path');
const { GoogleGenAI } = require('@google/genai'); 
const conversationHistory = [];  // <--- ADD THIS LINE HERE

// Initialize Gemini
const ai = new GoogleGenAI({
  apiKey: "AIzaSyCW1WPklRP1GJP9YCHBi0NlyH7LtEv2eEg"
});

// Server
const server = http.createServer(async (req, res) => {
  if (req.method === 'GET') {
    // Serve HTML and static files
    let filePath = path.join(__dirname, 'public', req.url === '/' ? 'index.html' : req.url);
    let extname = path.extname(filePath);
    let contentType = 'text/html';

    switch (extname) {
      case '.js':
        contentType = 'text/javascript';
        break;
      case '.css':
        contentType = 'text/css';
        break;
      case '.png':
        contentType = 'image/png';
        break;
    }

    fs.readFile(filePath, (err, content) => {
      if (err) {
        res.writeHead(404);
        res.end('File not found');
      } else {
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
      }
    });

  } else if (req.method === 'POST' && req.url === '/api/ask') {
    let body = '';
    req.on('data', chunk => (body += chunk));
    req.on('end', async () => {
      try {
        const { message } = JSON.parse(body);

        // Add user message to conversation history
        conversationHistory.push({ role: 'user', content: message });

        // Build conversation text for AI prompt
        const conversationText = conversationHistory.map(entry =>
          `${entry.role === 'user' ? 'User' : 'Assistant'}: ${entry.content}`
        ).join('\n');

        // Send full conversation to Gemini
        const result = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: `The following is a conversation between a user and an assistant:\n${conversationText}\nAssistant:`
        });

        const text = result.candidates[0].content.parts[0].text.trim();

        // Add AI response to conversation history
        conversationHistory.push({ role: 'assistant', content: text });

        // Respond to client
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ reply: text }));
      } catch (err) {
        console.error(err);
        res.writeHead(500);
        res.end(JSON.stringify({ error: 'AI failed to respond.' }));
      }
    });
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

// Start server
const port = 3005;
server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});