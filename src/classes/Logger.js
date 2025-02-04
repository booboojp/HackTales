const fs = require('fs').promises;
const path = require('path');

const LogLevel = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
    NONE: 4
};

class Logger {
    constructor(options = {}) {
        this.colors = {
            reset: "\x1b[0m",
            bright: "\x1b[1m",
            dim: "\x1b[2m",
            black: "\x1b[30m",
            red: "\x1b[31m",
            green: "\x1b[32m",
            yellow: "\x1b[33m",
            blue: "\x1b[34m",
            magenta: "\x1b[35m",
            cyan: "\x1b[36m",
            white: "\x1b[37m",
            bgBlack: "\x1b[40m",
            bgRed: "\x1b[41m",
            bgGreen: "\x1b[42m",
            bgYellow: "\x1b[43m",
            bgBlue: "\x1b[44m",
            bgMagenta: "\x1b[45m",
            bgCyan: "\x1b[46m",
            bgWhite: "\x1b[47m"
        };

        this.logLevel = options.logLevel || LogLevel.INFO;
        this.maxQueueSize = options.maxQueueSize || 100;
        this.maxFileSize = options.maxFileSize || 10 * 1024 * 1024; 
        this.maxFiles = options.maxFiles || 5;
        
        this.logsDir = path.join(process.cwd(), 'logs');
        this.logFile = path.join(this.logsDir, options.logFile || 'app.log');
        
        this.initializeLogger().catch(err => {
            console.error('Failed to initialize logger:', err);
            process.exit(1);
        });

        this.metrics = {
            totalLogs: 0,
            startTime: Date.now(),
            logsByLevel: {},
            averageProcessingTime: 0
        };

        this.queue = [];
        this.processing = false;
    }

    async initializeLogger() {
        await fs.mkdir(this.logsDir, { recursive: true });
        if (!await fs.access(this.logFile).catch(() => false)) {
            await fs.writeFile(this.logFile, '');
        }
    }
    parseColorTags(message) {
        const colorTags = {
            '<r>': this.colors.red,
            '<g>': this.colors.green, 
            '<b>': this.colors.blue,
            '<y>': this.colors.yellow,
            '<m>': this.colors.magenta,
            '<c>': this.colors.cyan,
            '<w>': this.colors.white,
            '<black>': this.colors.black,
            '<bold>': this.colors.bright,
            '<dim>': this.colors.dim,
            '<bgr>': this.colors.bgRed,
            '<bgg>': this.colors.bgGreen,
            '<bgb>': this.colors.bgBlue, 
            '<bgy>': this.colors.bgYellow,
            '<bgm>': this.colors.bgMagenta,
            '<bgc>': this.colors.bgCyan,
            '<bgw>': this.colors.bgWhite,
            '<bgblack>': this.colors.bgBlack,
            '</>' : this.colors.reset
        };

        Object.entries(colorTags).forEach(([tag, color]) => {
            message = message.replaceAll(tag, color);
        });
        
        return message;
    }

    async rotateLogFile() {
        const stats = await fs.stat(this.logFile);
        if (stats.size >= this.maxFileSize) {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const newPath = `${this.logFile}.${timestamp}`;
            await fs.rename(this.logFile, newPath);
            await fs.writeFile(this.logFile, '');

            const files = await fs.readdir(this.logsDir);
            const logFiles = files
                .filter(file => file.startsWith(path.basename(this.logFile)))
                .sort()
                .reverse();

            for (let i = this.maxFiles; i < logFiles.length; i++) {
                await fs.unlink(path.join(this.logsDir, logFiles[i]));
            }
        }
    }

    async processQueue() {
        if (this.processing || this.queue.length === 0) return;
        
        this.processing = true;
        try {
            await this.rotateLogFile();
            
            while (this.queue.length > 0) {
                const logEntry = this.queue.shift();
                const startProcess = Date.now();

                console.log(logEntry.consoleMessage);
                await fs.appendFile(this.logFile, logEntry.fileMessage + '\n');

                this.metrics.totalLogs++;
                this.metrics.logsByLevel[logEntry.level] = (this.metrics.logsByLevel[logEntry.level] || 0) + 1;
                this.metrics.averageProcessingTime = 
                    (this.metrics.averageProcessingTime * (this.metrics.totalLogs - 1) + (Date.now() - startProcess)) 
                    / this.metrics.totalLogs;
            }
        } catch (err) {
            console.error('Failed to process log queue:', err);
        } finally {
            this.processing = false;
        }
    }

    formatTime() {
        const date = new Date();
        return `[${date.getHours().toString().padStart(2, '0')}.${date.getMinutes().toString().padStart(2, '0')}.${date.getSeconds().toString().padStart(2, '0')}]`;
    }

    async log(level, message, color) {
        if (level < this.logLevel) return;

        const time = this.formatTime();
        const levelName = Object.keys(LogLevel).find(key => LogLevel[key] === level);
        message = this.parseColorTags(message);
        
        const consoleMessage = `${color}${time} ${levelName}:${this.colors.reset} ${message}`;
        const fileMessage = `${time} ${levelName}: ${message.replace(/\x1b\[[0-9;]*m/g, '')}`;

        this.queue.push({ level, consoleMessage, fileMessage });

        if (this.queue.length >= this.maxQueueSize) {
            await this.processQueue();
        } else {
            setImmediate(() => this.processQueue());
        }
    }

    debug(message) { this.log(LogLevel.DEBUG, message, `${this.colors.white}${this.colors.bright}`); }
    info(message) { this.log(LogLevel.INFO, message, `${this.colors.blue}${this.colors.bright}`); }
    warn(message) { this.log(LogLevel.WARN, message, `${this.colors.yellow}${this.colors.bright}`); }
    error(message) { this.log(LogLevel.ERROR, message, `${this.colors.red}${this.colors.bright}`); }
    success(message) { this.log(LogLevel.INFO, message, `${this.colors.green}${this.colors.bright}`); }

    getMetrics() {
        return {
            ...this.metrics,
            uptime: Date.now() - this.metrics.startTime,
            queueLength: this.queue.length
        };
    }
}

module.exports = { Logger, LogLevel };