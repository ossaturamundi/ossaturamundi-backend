const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors()); // Allow frontend to connect
app.use(express.json()); // Parse JSON requests

// Get Claude API Key from environment variable
const claudeApiKey = process.env.CLAUDE_API_KEY;
const claudeApiUrl = 'https://api.anthropic.com/v1/completions'; // Replace with the correct Claude API endpoint from Anthropic's docs

// Endpoint for frontend to call
app.post('/api/claude', async (req, res) => {
  if (!claudeApiKey) {
    return res.status(500).json({ error: 'Claude API key is missing' });
  }

  try {
    const { prompt } = req.body; // Get prompt from frontend
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    // Make request to Claude API
    const response = await axios.post(
      claudeApiUrl,
      {
        model: 'claude-4-sonnet', // Specify the model
        prompt: prompt,
        max_tokens: 100, // Adjust as needed
      },
      {
        headers: {
          'Authorization': `Bearer ${claudeApiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    // Send Claude's response back to frontend
    res.json({ result: response.data.choices[0].text });
  } catch (error) {
    console.error('Error calling Claude API:', error.message);
    res.status(500).json({ error: 'Failed to process request', details: error.message });
  }
});

// Optional: Add a root route to avoid "Cannot GET /"
app.get('/', (req, res) => {
  res.send('Backend is running! Use /api/claude to interact with Claude.');
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
