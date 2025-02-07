const express = require('express');
const path = require('path');
const { Logger, LogLevel } = require('../classes/Logger.js');
const logger = new Logger({
  logLevel: LogLevel.INFO,
  maxFileSize: 5 * 1024 * 1024,
  maxFiles: 3,
  logFile: "slack-app-log.log",
});
const fs = require('fs').promises;
const fetch = global.fetch || require("fetch");
const { WebClient } = require('@slack/web-api');
const app = express();
require("dotenv").config();

const DATA_DIR = path.join(__dirname, '../../data/blocks');
const TEMPLATES_DIR = path.join(__dirname, '../../data/templates');
const SENT_DIR = path.join(__dirname, '../../data/sent');
const LAST_MESSAGE_FILE = path.join(__dirname, '../../data/lastMessage.json');
const PORT = process.env.WEB_SERVER_PORT || 6969;
const slackClient = new WebClient(process.env.SLACK_BOT_TOKEN);
const QUEUE_DIR = path.join(__dirname, '../../data/queue');

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());


async function listSavedFiles() {
  try {
    const files = await fs.readdir(DATA_DIR);
    logger.info(`Successfully listed files in ${DATA_DIR}`);
    return files.filter(file => file.endsWith('.json'));
  } catch (error) {
    logger.error(`Error listing files in ${DATA_DIR}: ${error.message}`);
    return [];
  } finally {
    logger.info('listSavedFiles function execution completed.');
  }
}


async function listTemplates() {
  try {
    const files = await fs.readdir(TEMPLATES_DIR);
    logger.info(`Successfully listed files in ${TEMPLATES_DIR}`);
    return files.filter(file => file.endsWith('.json'));
  } catch (error) {
    logger.error(`Error listing files in ${TEMPLATES_DIR}: ${error.message}`);
    return [];
  } finally {
    logger.info('listTemplates function execution completed.');
  }
}

async function listSent() {
  try {
    const files = await fs.readdir(SENT_DIR);
    logger.info(`Successfully listed files in ${SENT_DIR}`);
    return files.filter(file => file.endsWith('.json'));
  } catch (error) {
    logger.error(`Error listing files in ${SENT_DIR}: ${error.message}`);
    return [];
  } finally {
    logger.info('listSent function execution completed.');
  }
}


async function listQueued() {
  try {
    await fs.mkdir(QUEUE_DIR, { recursive: true });
    const files = await fs.readdir(QUEUE_DIR);
    logger.info(`Successfully listed files in ${QUEUE_DIR}`);
    return files.filter(file => file.startsWith('queued-') && file.endsWith('.json'));
  } catch (error) {
    logger.error(`Error listing files in ${QUEUE_DIR}: ${error.message}`);
    return [];
  } finally {
    logger.info('listQueued function execution completed.');
  }
}


app.get('/', async (req, res) => {
  try {
    logger.info('Received request for main editor page.');
    const savedFiles = await listSavedFiles();
    const templates = await listTemplates();
    const sentMessages = await listSent(); 
    const queuedMessages = await listQueued(); 
    let currentBlocks = [];
    let lastSavedState = null;


    try {
      const lastData = await fs.readFile(LAST_MESSAGE_FILE, 'utf8');
      const parsed = JSON.parse(lastData);
      currentBlocks = parsed.blocks || [];
      lastSavedState = parsed;
      logger.info('Successfully loaded last saved state.');
    } catch (e) {
      logger.warn('No last saved state found, using empty blocks.');
    }

    res.render('index', {
      savedFiles,
      templates,
      sentMessages,
      queuedMessages,
      currentBlocks,
      lastSavedState
    });
    logger.info('Successfully rendered main editor page.');
  } catch (error) {
    logger.error('Error loading page:', error);
    res.status(500).send('Error loading editor');
  } finally {
    logger.info('GET / request processing completed.');
  }
});


app.post('/save', async (req, res) => {
  try {
    logger.info('Received request to save blocks.');
    const { blocks } = req.body;
    const timestamp = Date.now();
    const filename = `blocks-${timestamp}.json`;
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(path.join(DATA_DIR, filename), JSON.stringify({ blocks }, null, 2));
    logger.info(`Successfully saved blocks to ${filename}`);
    res.json({ success: true, filename });
  } catch (error) {
    logger.error('Error saving blocks:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    logger.info('POST /save request processing completed.');
  }
});

app.post('/save-template', async (req, res) => {
  try {
    logger.info('Received request to save template.');
    const { blocks } = req.body;
    const timestamp = Date.now();
    const filename = `template-${timestamp}.json`;
    await fs.mkdir(TEMPLATES_DIR, { recursive: true });
    await fs.writeFile(path.join(TEMPLATES_DIR, filename), JSON.stringify({ blocks }, null, 2));
    logger.info(`Successfully saved template to ${filename}`);
    res.json({ success: true, filename });
  } catch (error) {
    logger.error('Error saving template:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    logger.info('POST /save-template request processing completed.');
  }
});
app.post('/api/templates/save', async (req, res) => {
  try {
    logger.info('Received request to save template.');
    const { name, blocks } = req.body;
    const filename = `template-${Date.now()}.json`;
    await fs.writeFile(
      path.join(TEMPLATES_DIR, filename),
      JSON.stringify({ name, blocks, created: new Date().toISOString() })
    );
    logger.info(`Successfully saved template to ${filename}`);
    res.json({ success: true });
  } catch (error) {
    logger.error('Error saving template:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    logger.info('POST /api/templates/save request processing completed.');
  }
});

app.post('/api/queue/add', async (req, res) => {
  try {
    logger.info('Received request to add message to queue.');
    const { blocks } = req.body;
    const filename = `queued-${Date.now()}.json`;
    const filePath = path.join(QUEUE_DIR, filename); 

    try {
      await fs.mkdir(QUEUE_DIR, { recursive: true });
      logger.info(`Queue directory ensured: ${QUEUE_DIR}`);
    } catch (dirError) {
      logger.error(`Error creating queue directory: ${dirError.message}`);
      return res.status(500).json({ success: false, error: `Failed to create queue directory: ${dirError.message}` });
    }

    try {
      await logger.info('Attempting to write file:', filePath);
      await fs.writeFile(
        filePath,
        JSON.stringify({
          blocks,
          queued: new Date().toISOString(),
          status: 'pending'
        })
      );
      logger.info(`File created successfully: ${filePath}`);
    } catch (writeError) {
      logger.error(`Failed to write file: ${filePath}`, writeError);
      return res.status(500).json({ success: false, error: `Failed to write file: ${writeError.message}` });
    }

    try {
      await fs.access(filePath);
      logger.info(`File verified successfully: ${filePath}`);
    } catch (accessError) {
      logger.error(`Failed to verify file creation: ${filePath}`, accessError);
      return res.status(500).json({ success: false, error: `Failed to verify file creation: ${accessError.message}` });
    }

    res.json({ success: true });
  } catch (error) {
    logger.error("Error adding to queue:", error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    logger.info('POST /api/queue/add request processing completed.');
  }
});



app.post('/api/state/save', async (req, res) => {
  try {
    logger.info('Received request to save state.');
    const { blocks } = req.body;
    await fs.writeFile(
      path.join(DATA_DIR, 'last-state.json'),
      JSON.stringify({ blocks, saved: new Date().toISOString() })
    );
    logger.info('Successfully saved state.');
    res.json({ success: true });
  } catch (error) {
    logger.error('Error saving state:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    logger.info('POST /api/state/save request processing completed.');
  }
});

app.post("/send", async (req, res) => {
  try {
  logger.info('Received request to send message.');
  const { blocks } = req.body;
  const slackBotPort = process.env.SLACK_BOT_PORT || 3001;
  const response = await fetch(
    `http://localhost:${slackBotPort}/api/send-message`,
    {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ blocks }),
    }
  );
  const data = await response.json();
  if (data.success) {
    const timestamp = Date.now();
    const sentFilename = `sent-${timestamp}.json`;
    await fs.mkdir(SENT_DIR, { recursive: true });
    await fs.writeFile(
    path.join(SENT_DIR, sentFilename),
    JSON.stringify({ blocks, ts: data.ts }, null, 2)
    );
    logger.info(`Successfully sent message and saved record to ${sentFilename}`);
  }
  res.json(data);
  } catch (error) {
  logger.error('Error sending message:', error);
  res.status(500).json({ success: false, error: error.message });
  } finally {
  logger.info('POST /send request processing completed.');
  }
});

app.get('/load/:filename', async (req, res) => {
  try {
    logger.info('Received request to load file.');
    const { filename } = req.params;
    let filePath;
    if (filename.startsWith('template-')) {
      filePath = path.join(TEMPLATES_DIR, filename);
    } else {
      filePath = path.join(DATA_DIR, filename);
    }
    logger.info(`Attempting to load file from: ${filePath}`);

    const fileData = await fs.readFile(filePath, 'utf-8');
    const savedData = JSON.parse(fileData);

    await fs.writeFile(LAST_MESSAGE_FILE, JSON.stringify({ blocks: savedData.blocks }, null, 2));
    
    res.json({ success: true, blocks: savedData.blocks });
    logger.info('Successfully loaded and returned file data.');
  } catch (error) {
    logger.error('Error loading file:', error);
    res.status(500).send('Error loading file: ' + error.message);
  } finally {
    logger.info('GET /load/:filename request processing completed.');
  }
});


app.post("/queue-message", async (req, res) => {
  try {
    logger.info('Received request to queue message.');
    const { filename } = req.body;
    if (!filename) {
      throw new Error("Filename is required.");
    }
    const filePath = path.join(DATA_DIR, filename);
    const fileData = await fs.readFile(filePath, 'utf8');
    const { blocks } = JSON.parse(fileData);

    const queueDir = path.join(__dirname, '../data/queue');
    const queueFilename = `queued-${Date.now()}.json`;
    await fs.writeFile(
      path.join(queueDir, queueFilename),
      JSON.stringify({ 
        blocks, 
        queued: new Date().toISOString(),
        status: 'pending'
      })
    );
    res.json({ success: true, message: "Message enqueued successfully." });
    logger.info('Successfully enqueued message.');
  } catch (error) {
    logger.error('Error queuing message:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    logger.info('POST /queue-message request processing completed.');
  }
});


app.delete('/api/queue/remove/:filename', async (req, res) => {
  try {
    logger.info('Received request to delete queued message.');
    const { filename } = req.params;
    const filePath = path.join(QUEUE_DIR, filename);
    await fs.unlink(filePath);
    res.json({ success: true });
    logger.info('Successfully deleted queued message.');
  } catch (error) {
    logger.error('Error deleting queued message:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    logger.info('DELETE /api/queue/remove/:filename request processing completed.');
  }
});


app.post('/api/queue/edit/:filename', async (req, res) => {
  try {
    logger.info('Received request to edit queued message.');
    const { filename } = req.params;
    const { blocks } = req.body;
    const filePath = path.join(QUEUE_DIR, filename);
    await fs.writeFile(filePath, JSON.stringify({ blocks, queued: new Date().toISOString(), status: 'pending' }, null, 2));
    res.json({ success: true });
    logger.info('Successfully edited queued message.');
  } catch (error) {
    logger.error('Error editing queued message:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    logger.info('POST /api/queue/edit/:filename request processing completed.');
  }
});


app.post('/api/templates/duplicate/:filename', async (req, res) => {
  try {
    logger.info('Received request to duplicate template.');
    const { filename } = req.params;
    const filePath = path.join(TEMPLATES_DIR, filename);
    const fileData = await fs.readFile(filePath, 'utf8');
    const templateData = JSON.parse(fileData);
    const newFilename = `template-${Date.now()}.json`;
    await fs.writeFile(path.join(TEMPLATES_DIR, newFilename), JSON.stringify(templateData, null, 2));
    res.json({ success: true });
    logger.info('Successfully duplicated template.');
  } catch (error) {
    logger.error('Error duplicating template:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    logger.info('POST /api/templates/duplicate/:filename request processing completed.');
  }
});


app.listen(PORT, () => {
  console.log(`Express EJS server running on port ${PORT}`);
  logger.info(`Express EJS server running on port ${PORT}`);
});