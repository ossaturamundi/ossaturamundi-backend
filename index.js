const express = require('express');
const axios = require('axios');
const cors = require('cors');
const AWS = require('aws-sdk');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors({ origin: ['https://ossaturamundi.com', '*'] })); // Allow Postman for testing
app.use(express.json());

// Log environment variables for debugging
console.log('B2_KEY_ID:', process.env.B2_KEY_ID ? 'Set' : 'Not set');
console.log('B2_APPLICATION_KEY:', process.env.B2_APPLICATION_KEY ? 'Set' : 'Not set');
console.log('CLAUDE_API_KEY:', process.env.CLAUDE_API_KEY ? 'Set' : 'Not set');

// Backblaze B2 Configuration
const s3 = new AWS.S3({
  endpoint: 'https://s3.us-west-001.backblazeb2.com',
  accessKeyId: process.env.B2_KEY_ID,
  secretAccessKey: process.env.B2_APPLICATION_KEY,
  s3ForcePathStyle: true
});

// Claude API Configuration
const claudeApiKey = process.env.CLAUDE_API_KEY;
const claudeApiUrl = 'https://api.anthropic.com/v1/messages';

// Save Data to Backblaze B2
app.post('/api/save-data', async (req, res) => {
  try {
    const { userId, data } = req.body;
    if (!userId || !data) {
      console.error('Missing userId or data in /api/save-data');
      return res.status(400).json({ error: 'userId and data are required' });
    }

    const params = {
      Bucket: 'MysticX-QG',
      Key: `user-data/${userId}.json`,
      Body: data,
      ContentType: 'application/json',
      ServerSideEncryption: 'AES256'
    };

    console.log('Saving to Backblaze B2:', { userId, dataLength: data.length });
    await s3.putObject(params).promise();
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving to Backblaze B2:', error.message, error.stack);
    res.status(500).json({ error: 'Failed to save data', details: error.message });
  }
});

// Get Data from Backblaze B2
app.get('/api/get-data', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      console.error('Missing userId in /api/get-data');
      return res.status(400).json({ error: 'userId is required' });
    }

    const params = {
      Bucket: 'MysticX-QG',
      Key: `user-data/${userId}.json`
    };

    console.log('Retrieving from Backblaze B2:', { userId });
    const response = await s3.getObject(params).promise();
    const encryptedData = response.Body.toString();
    res.json({ data: encryptedData });
  } catch (error) {
    if (error.code === 'NoSuchKey') {
      console.log(`No data found for userId: ${req.query.userId}`);
      res.json({ data: null });
    } else {
      console.error('Error retrieving from Backblaze B2:', error.message, error.stack);
      res.status(500).json({ error: 'Failed to retrieve data', details: error.message });
    }
  }
});

// Claude Endpoint
app.post('/api/claude', async (req, res) => {
  if (!claudeApiKey) {
    console.error('Claude API key is missing');
    return res.status(500).json({ error: 'Claude API key is missing' });
  }

  try {
    const { prompt } = req.body;
    if (!prompt) {
      console.error('Missing prompt in /api/claude');
      return res.status(400).json({ error: 'Prompt is required' });
    }

    console.log('Sending Claude prompt:', prompt.substring(0, 100) + (prompt.length > 100 ? '...' : ''));

    const response = await axios.post(
      claudeApiUrl,
      {
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }]
      },
      {
        headers: {
          'x-api-key': claudeApiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json'
        }
      }
    );

    const claudeResponse = response.data.content[0].text;
    console.log('Claude response received:', claudeResponse.substring(0, 100) + (claudeResponse.length > 100 ? '...' : ''));
    res.json({ result: claudeResponse });
  } catch (error) {
    console.error('Error calling Claude API:', error.message, error.response?.data || error.stack);
    res.status(500).json({ error: 'Failed to process Claude request', details: error.message });
  }
});

// Root Route
app.get('/', (req, res) => {
  res.send('Backend is running! Use /api/claude to interact with Claude.');
});

// Start the Server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
