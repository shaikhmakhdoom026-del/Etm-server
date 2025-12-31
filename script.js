// esp32-connector.js
class ESP32Connector {
    constructor() {
        this.port = null;
        this.reader = null;
        this.writer = null;
        this.isConnected = false;
        this.baudRate = 115200;
        this.commandQueue = [];
        this.isProcessing = false;
        this.nfcCallback = null;
    }

    async connect() {
        try {
            // Request serial port
            this.port = await navigator.serial.requestPort();
            
            // Configure port
            await this.port.open({ baudRate: this.baudRate });
            
            // Setup readers and writers
            const textDecoder = new TextDecoderStream();
            const textEncoder = new TextEncoderStream();
            
            this.readableStreamClosed = this.port.readable.pipeTo(textDecoder.writable);
            this.writableStreamClosed = textEncoder.readable.pipeTo(this.port.writable);
            
            this.reader = textDecoder.readable.getReader();
            this.writer = textEncoder.writable.getWriter();
            
            this.isConnected = true;
            
            // Start reading data
            this.readData();
            
            return { success: true, message: 'Connected successfully' };
            
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    async disconnect() {
        if (this.reader) {
            await this.reader.cancel();
            await this.readableStreamClosed.catch(() => {});
        }
        
        if (this.writer) {
            await this.writer.close();
            await this.writableStreamClosed;
        }
        
        if (this.port) {
            await this.port.close();
        }
        
        this.isConnected = false;
        this.port = null;
    }

    async sendCommand(command, data = '') {
        if (!this.isConnected || !this.writer) {
            throw new Error('Not connected to ESP32');
        }

        const fullCommand = `CMD:${command}|DATA:${data}|END\n`;
        
        try {
            await this.writer.write(fullCommand);
            console.log(`Sent: ${fullCommand}`);
            return true;
        } catch (error) {
            console.error('Send error:', error);
            return false;
        }
    }

    async readData() {
        try {
            while (true) {
                const { value, done } = await this.reader.read();
                if (done) {
                    this.reader.releaseLock();
                    break;
                }
                
                if (value) {
                    this.processIncomingData(value);
                }
            }
        } catch (error) {
            console.error('Read error:', error);
        }
    }

    processIncomingData(data) {
        const lines = data.split('\n');
        
        lines.forEach(line => {
            if (line.trim() === '') return;
            
            console.log('Received:', line);
            
            // Parse different message types
            if (line.startsWith('NFC:')) {
                this.handleNFCMessage(line);
            } else if (line.startsWith('STATUS:')) {
                this.handleStatusMessage(line);
            } else if (line.startsWith('TICKET:')) {
                this.handleTicketMessage(line);
            } else if (line.startsWith('ERROR:')) {
                this.handleErrorMessage(line);
            }
            
            // Update UI
            this.updateUI(line);
        });
    }

    handleNFCMessage(line) {
        const data = line.substring(4);
        if (this.nfcCallback) {
            this.nfcCallback(data);
        }
        
        // Parse UID from message
        if (data.startsWith('UID:')) {
            const uid = data.substring(4);
            this.lastCardUID = uid;
            this.triggerEvent('nfcDetected', { uid, timestamp: new Date() });
        }
    }

    handleStatusMessage(line) {
        const status = line.substring(7);
        this.triggerEvent('statusUpdate', { status });
    }

    triggerEvent(eventName, data) {
        const event = new CustomEvent(eventName, { detail: data });
        document.dispatchEvent(event);
    }

    // NFC specific commands
    async startNFCSearch() {
        return await this.sendCommand('NFC_START');
    }

    async stopNFCSearch() {
        return await this.sendCommand('NFC_STOP');
    }

    async readNFCCard() {
        return await this.sendCommand('NFC_READ');
    }

    // Ticket commands
    async issueTicket(type = 'single', quantity = 1) {
        return await this.sendCommand('TICKET_ISSUE', `${type},${quantity}`);
    }

    async reprintTicket(ticketId) {
        return await this.sendCommand('TICKET_REPRINT', ticketId);
    }

    async cancelTicket(ticketId) {
        return await this.sendCommand('TICKET_CANCEL', ticketId);
    }

    // System commands
    async openCashDrawer() {
        return await this.sendCommand('DRAWER_OPEN');
    }

    async printTestPage() {
        return await this.sendCommand('PRINT_TEST');
    }

    async rebootSystem() {
        return await this.sendCommand('SYSTEM_REBOOT');
    }

    async getSystemInfo() {
        return await this.sendCommand('GET_INFO');
    }
}

// Create global instance
window.esp32Connector = new ESP32Connector();