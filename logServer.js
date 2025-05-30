const express = require('express');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 4040;

app.use(express.json());

// In-memory store for demo (use DB in prod)
let logBuffer = [];

app.post('/log', (req, res) => {
  const log = req.body;
  if (!log || !log.message) {
    return res.status(400).send({ error: 'Invalid log format' });
  }

  console.log(`[${log.type || 'info'}] ${log.timestamp || new Date().toISOString()}: ${log.message}`);

  logBuffer.push(log);
  if (logBuffer.length >= 100) {
    fs.appendFileSync('logs.json', JSON.stringify(logBuffer, null, 2) + ',\n');
    logBuffer = [];
  }

  res.send({ success: true });
});

app.get('/logs', (req, res) => {
  res.json(logBuffer);
});

app.listen(PORT, () => {
  console.log(`📡 Log server listening on http://localhost:${PORT}`);
});
