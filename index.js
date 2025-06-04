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
const claudeApiUrl = 'https://api.anthropic.com/v1/messages'; // Updated endpoint

// Endpoint for frontend to call
app.post('/api/claude', async (req, res) => {
  if (!claudeApiKey) {
    return res.status(500).json({ error: 'Claude API key is missing' });
  }

  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const response = await axios.post(
      claudeApiUrl,
      {
        model: 'claude-4-sonnet-20250514', // Updated model name
        max_tokens: 100,
        messages: [
          { role: 'user', content: prompt }
        ]
      },
      {
        headers: {
          'x-api-key': claudeApiKey, // Anthropic requires x-api-key header
          'anthropic-version': '2023-06-01', // API version (as per documentation)
          'content-type': 'application/json'
        }
      }
    );

    // Adjust based on Messages API response structure
    const claudeResponse = response.data.content[0].text;
    res.json({ result: claudeResponse });
  } catch (error) {
    console.error('Error calling Claude API:', error.message);
    res.status(500).json({ error: 'Failed to process request', details: error.message });
  }
});

// Root route
app.get('/', (req, res) => {
  res.send('Backend is running! Use /api/claude to interact with Claude.');
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
