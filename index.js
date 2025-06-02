{\rtf1\ansi\ansicpg1252\cocoartf2822
\cocoatextscaling0\cocoaplatform0{\fonttbl\f0\fnil\fcharset0 Menlo-Regular;}
{\colortbl;\red255\green255\blue255;\red0\green0\blue0;\red255\green255\blue255;}
{\*\expandedcolortbl;;\cssrgb\c0\c0\c0;\cssrgb\c100000\c100000\c100000;}
\paperw11900\paperh16840\margl1440\margr1440\vieww11520\viewh8400\viewkind0
\deftab720
\pard\pardeftab720\partightenfactor0

\f0\fs26\fsmilli13333 \cf2 \cb3 \expnd0\expndtw0\kerning0
const express = require('express');\
const AWS = require('aws-sdk');\
const Anthropic = require('@anthropic-ai/sdk');\
const crypto = require('crypto');\
const app = express();\
app.use(express.json());\
\
// Configurer Backblaze B2 (S3-compatible)\
const s3 = new AWS.S3(\{\
    endpoint: 'https://s3.us-west-001.backblazeb2.com',\
    accessKeyId: '001...', // Remplace par ton Key ID\
    secretAccessKey: 'K00...', // Remplace par ton Application Key\
    signatureVersion: 'v4'\
\});\
\
// Configurer Anthropic (Claude)\
const anthropic = new Anthropic(\{\
    apiKey: 'sk-ant-...', // Remplace par ta cl\'e9 API Claude\
\});\
\
// Fonction pour chiffrer les donn\'e9es\
function encrypt(text) \{\
    const algorithm = 'aes-256-ctr';\
    const secretKey = 'vOVH6sdmpNWjRRIqCc7rdxs01lwHzfr3'; // Cl\'e9 secr\'e8te (change-la !)\
    const iv = crypto.randomBytes(16);\
    const cipher = crypto.createCipheriv(algorithm, secretKey, iv);\
    const encrypted = Buffer.concat([cipher.update(text), cipher.final()]);\
    return `$\{iv.toString('hex')\}:$\{encrypted.toString('hex')\}`;\
\}\
\
app.post('/api/chat', async (req, res) => \{\
    const \{ category, message \} = req.body;\
\
    try \{\
        // Appeler Claude 4 Sonnet (on utilise Claude 3.5 Sonnet car Claude 4 n\'92est pas disponible)\
        const response = await anthropic.messages.create(\{\
            model: 'claude-3.5-sonnet-20241022',\
            max_tokens: 1024,\
            messages: [\{ role: 'user', content: message \}]\
        \});\
        const reply = response.content[0].text;\
\
        // Chiffrer la conversation\
        const conversation = encrypt(JSON.stringify(\{ message, reply \}));\
        \
        // Sauvegarder dans Backblaze B2\
        const params = \{\
            Bucket: 'MysticX-QG',\
            Key: `$\{category\}/conversation-$\{Date.now()\}.json`,\
            Body: conversation\
        \};\
        await s3.upload(params).promise();\
\
        res.json(\{ response: reply \});\
    \} catch (error) \{\
        console.error(error);\
        res.status(500).json(\{ error: 'Erreur lors de l\'92appel \'e0 Claude ou Backblaze' \});\
    \}\
\});\
\
const PORT = process.env.PORT || 3000;\
app.listen(PORT, () => console.log(`Serveur d\'e9marr\'e9 sur le port $\{PORT\}`));}