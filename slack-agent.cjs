const express = require('express');
const { GoogleGenAI } = require('@google/generative-ai');

const app = express();
app.use(express.json());

// Initialize the Gemini API using your AI Studio environment key
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });

// 1. Handle the initial Slack verification handshake
app.post('/slack/events', async (req, res) => {
  if (req.body.type === 'url_verification') {
    return res.status(200).send({ challenge: req.body.challenge });
  }

  // 2. Process active mentions directed at your Slack Agent
  if (req.body.event && req.body.event.type === 'app_mention') {
    const { text, channel, ts } = req.body.event;
    
    try {
      // Clean up the input string by stripping out the raw user tag text
      const cleanPrompt = text.replace(/<@.*?>/g, '').trim();

      // Forward the user's inquiry straight to Gemini's thinking framework
      const aiResponse = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: cleanPrompt }] }]
      });
      const replyText = aiResponse.response.text;

      // Stream the generated solution right back into the active Slack thread
      await fetch('https://slack.com/api/chat.postMessage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SLACK_BOT_TOKEN}`
        },
        body: JSON.stringify({
          channel: channel,
          text: replyText,
          thread_ts: ts // Contextual threading alignment
        })
      });
    } catch (error) {
      console.error("Agent matching error loop:", error);
    }
  }

  return res.status(200).send({ status: 'success' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Slack Agent server listening on port ${PORT}`));
