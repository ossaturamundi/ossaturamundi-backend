const express = require('express');
const axios = require('axios');
const cors = require('cors');
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors({ origin: 'https://ossaturamundi.com' })); // Restrict to your domain
app.use(express.json());

// Backblaze B2 Configuration
const s3Client = new S3Client({
  endpoint: 'https://s3.us-west-001.backblazeb2.com',
  credentials: {
    accessKeyId: process.env.B2_KEY_ID,
    secretAccessKey: process.env.B2_APPLICATION_KEY
  },
  forcePathStyle: true, // Required for Backblaze B2 S3 compatibility
  signatureVersion: 'v4',
  // Disable checksum middleware to avoid unsupported headers
  useAccelerateEndpoint: false,
  checksumAlgorithm: undefined // Explicitly disable checksum validation
});

// Claude API Key
const claudeApiKey = process.env.CLAUDE_API_KEY;
const claudeApiUrl = 'https://api.anthropic.com/v1/messages';

// Save Data to Backblaze B2
app.post('/api/save-data', async (req, res) => {
  try {
    const { userId, data } = req.body;
    if (!userId || !data) {
      return res.status(400).json({ error: 'userId and data are required' });
    }

    const params = {
      Bucket: 'MysticX-QG',
      Key: `user-data/${userId}.json`,
      Body: data,
      ContentType: 'application/json',
      ServerSideEncryption: 'AES256'
    };

    const command = new PutObjectCommand(params);
    await s3Client.send(command);
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving to Backblaze B2:', error);
    res.status(500).json({ error: 'Failed to save data' });
  }
});

// Get Data from Backblaze B2
app.get('/api/get-data', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const params = {
      Bucket: 'MysticX-QG',
      Key: `user-data/${userId}.json`
    };

    const command = new GetObjectCommand(params);
    const response = await s3Client.send(command);

    const chunks = [];
    for await (const chunk of response.Body) {
      chunks.push(chunk);
    }
    const encryptedData = Buffer.concat(chunks).toString();

    res.json({ data: encryptedData });
  } catch (error) {
    if (error.name === 'NoSuchKey') {
      res.json({ data: null }); // No data yet for this user
    } else {
      console.error('Error retrieving from Backblaze B2:', error);
      res.status(500).json({ error: 'Failed to retrieve data' });
    }
  }
});

// Existing Claude Endpoint
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
        model: 'claude-4-sonnet-20250514',
        max_tokens: 100,
        messages: [
          { role: 'user', content: prompt }
        ]
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
    res.json({ result: claudeResponse });
  } catch (error) {
    console.error('Error calling Claude API:', error.message);
    res.status(500).json({ error: 'Failed to process request', details: error.message });
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
