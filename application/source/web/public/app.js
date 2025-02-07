const { Logger, LogLevel } = require('../../classes/Logger.js');
const logger = new Logger({
  logLevel: LogLevel.INFO,
  maxFileSize: 5 * 1024 * 1024,
  maxFiles: 3,
  logFile: "slack-app-log.log",
});
if (typeof blocks === 'undefined') {
    blocks = [];
}
let isDirty = false;
let editingQueueFilename = null;

function addHeader() {
    blocks.push({
        type: "header",
        text: {
            type: "plain_text",
            text: "New Header",
            emoji: true
        }
    });
    updatePreview();
}

function addSection() {
    blocks.push({
        type: "section",
        text: {
            type: "mrkdwn",
            text: "New section text"
        }
    });
    updatePreview();
}

function addDivider() {
    blocks.push({
        type: "divider"
    });
    updatePreview();
}


function moveBlockUp(index) {
    if (index > 0) {
        [blocks[index], blocks[index - 1]] = [blocks[index - 1], blocks[index]];
        updatePreview();
    }
}

function moveBlockDown(index) {
    if (index < blocks.length - 1) {
        [blocks[index], blocks[index + 1]] = [blocks[index + 1], blocks[index]];
        updatePreview();
    }
}

function removeBlock(index) {
    blocks.splice(index, 1);
    updatePreview();
}

function renderBlockContent(block, index) {
    switch (block.type) {
        case 'header':
            return `<div class="block-content">Header: ${block.text.text}</div>`;
        case 'section':
            return `<div class="block-content">Section: ${block.text.text}</div>`;
        case 'divider':
            return `<div class="block-content">Divider</div>`;
        default:
            return `<div class="block-content">${block.type}</div>`;
    }
}


function updatePreview() {
    const preview = document.getElementById('preview');
    preview.innerText = JSON.stringify(blocks, null, 2);
    updateBlockList();
}

function updateBlockList() {
    const blockList = document.getElementById('blockList');
    blockList.innerHTML = blocks.map((block, index) => `
        <div class="block-item">
            <div class="block-header">
                <span>${block.type}</span>
                <div class="controls">
                    <button onclick="moveBlockUp(${index})">↑</button>
                    <button onclick="moveBlockDown(${index})">↓</button>
                    <button onclick="removeBlock(${index})">×</button>
                </div>
            </div>
            ${renderBlockContent(block, index)}
        </div>
    `).join('');
    isDirty = true;
}


window.clearEditor = function() {
    blocks = [];
    updatePreview();
};


async function saveBlocks() {
    try {
        const response = await fetch('/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ blocks })
        });
        const data = await response.json();
        if (data.success) {
            alert('Blocks saved successfully!');
            isDirty = false;
        } else {
            throw new Error(data.error);
        }
    } catch (error) {
        alert('Error saving blocks: ' + error.message);
    }
}

async function saveTemplate() {
    try {
        const response = await fetch('/save-template', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ blocks })
        });
        const data = await response.json();
        if (data.success) {
            alert('Template saved successfully!');
        } else {
            throw new Error(data.error);
        }
    } catch (error) {
        alert('Error saving template: ' + error.message);
    }
}

window.saveCurrentState = function() {
    saveCurrentState();
};
async function saveCurrentState() {
    try {
        const response = await fetch('/api/state/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ blocks })
        });
        const data = await response.json();
        if (data.success) {
            isDirty = false;
        }
    } catch (error) {
        console.error('Error saving state:', error);
    }
}


async function loadTemplate(filename) {
    try {
        const response = await fetch(`/load/${filename}`);
        if (response.ok) {
            const data = await response.json();
            blocks = data.blocks;
            updatePreview();
        } else {
            throw new Error('Failed to load template');
        }
    } catch (error) {
        alert('Error loading template: ' + error.message);
    }
}
async function loadMessage(filename) {
    try {
        const response = await fetch(`/load/${filename}`);
        if (response.ok) {
            const data = await response.json();
            blocks = data.blocks;
            updatePreview();
        } else {
            throw new Error('Failed to load message');
        }
    } catch (error) {
        alert('Error loading message: ' + error.message);
    }
}


async function addToQueue() {
    try {
        const response = await fetch('/api/queue/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ blocks })
        });
        const data = await response.json();
        if (data.success) {
            alert('Message added to queue!');
        } else {
            throw new Error(data.error);
        }
    } catch (error) {
        alert('Error adding to queue: ' + error.message);
    }
}


async function removeFromQueue(messageId) {
    try {
        const response = await fetch(`/api/queue/remove/${messageId}`, {
            method: 'DELETE'
        });
        if (response.ok) {
            alert('Queue message removed!');
            refreshQueue();
        } else {
            throw new Error('Failed to remove from queue');
        }
    } catch (error) {
        alert('Error removing from queue: ' + error.message);
    }
}



async function loadQueueMessageForEdit(filename) {
    try {
        const response = await fetch(`/load/${filename}`);
        if (response.ok) {
            const data = await response.json();
            blocks = data.blocks;
            updatePreview();
            editingQueueFilename = filename;
            alert(`Loaded queue message "${filename}" for editing. When done, click "Update Queue Message".`);
        } else {
            throw new Error('Failed to load queue message for edit');
        }
    } catch (error) {
        alert('Error loading queue message for edit: ' + error.message);
    }
}

async function editQueueMessage(filename) {
    try {
        const response = await fetch(`/api/queue/edit/${filename}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ blocks })
        });
        if (response.ok) {
            alert('Queue message updated successfully!');
            refreshQueue();
        } else {
            throw new Error('Failed to edit queue message');
        }
    } catch (error) {
        alert('Error editing queue message: ' + error.message);
    }
}


async function duplicateTemplate(filename) {
    try {
        const response = await fetch(`/api/templates/duplicate/${filename}`, {
            method: 'POST'
        });
        if (response.ok) {
            alert('Template duplicated successfully!');
            location.reload();
        } else {
            throw new Error('Failed to duplicate template');
        }
    } catch (error) {
        alert('Error duplicating template: ' + error.message);
    }
}
function updateQueueMessage() {
    if (!editingQueueFilename) {
        alert("No queue message loaded for editing.");
        return;
    }
    editQueueMessage(editingQueueFilename);
    editingQueueFilename = null;
}
function sortQueueAlphabetically() {
    const queueList = document.getElementById('queueList');
    let items = Array.from(queueList.getElementsByTagName('li'));
    if (items.length === 0) {
        return;
    }
    items.sort((a, b) => {
        const aText = a.textContent.toLowerCase();
        const bText = b.textContent.toLowerCase();
        return aText.localeCompare(bText);
    });
    queueList.innerHTML = '';
    items.forEach(item => queueList.appendChild(item));
}
function refreshQueue() {
    location.reload();
}
if (typeof loadedBlocks !== 'undefined') {
    blocks = loadedBlocks;
    updatePreview();
}


let autosaveTimeout;
const AUTOSAVE_DELAY = 5000;

function setupAutosave() {
    if (autosaveTimeout) {
        clearTimeout(autosaveTimeout);
    }
    autosaveTimeout = setTimeout(saveCurrentState, AUTOSAVE_DELAY);
}

window.addEventListener('beforeunload', (e) => {
    if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
    }
});

window.addHeader = function() {
    blocks.push({
        type: "header",
        text: {
            type: "plain_text",
            text: "New Header",
            emoji: true
        }
    });
    updatePreview();
};

window.addSection = function() {
    blocks.push({
        type: "section",
        text: {
            type: "mrkdwn",
            text: "New section text"
        }
    });
    updatePreview();
};

window.addDivider = function() {
    blocks.push({
        type: "divider"
    });
    updatePreview();
};

document.addEventListener('DOMContentLoaded', function() {
    if (blocks && blocks.length) {
        updatePreview();
    }
});