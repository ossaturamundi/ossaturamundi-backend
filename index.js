const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors()); // Allow frontend to connect
app.use(express.json()); // Parse JSON requests

// Claude API Key (replace with your key)
const claudeApiKey = 'sk-ant-...';
const claudeApiUrl = 'https://api.anthropic.com/v1/completions'; // Example endpoint, check Anthropic's API docs for the exact URL

// Endpoint for frontend to call
app.post('/api/claude', async (req, res) => {
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
    console.error('Error calling Claude API:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
