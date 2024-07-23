"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Sequin = void 0;
const axios_1 = __importDefault(require("axios"));
class Stream {
    constructor(config, streamName) {
        this.config = config;
        this.streamName = streamName;
    }
    sendMessage(message) {
        return __awaiter(this, void 0, void 0, function* () {
            yield axios_1.default.post(`${this.config.baseUrl}/api/streams/${this.streamName}/messages`, { messages: [{ data: message.data, subject: message.subject }] });
        });
    }
    createConsumer(consumerName, options) {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield axios_1.default.post(`${this.config.baseUrl}/api/streams/${this.streamName}/consumers`, {
                name: consumerName,
                filter_subject_pattern: options.filterSubjectPattern,
                ack_wait_ms: options.ackWaitMs,
                max_ack_pending: options.maxAckPending,
                max_deliver: options.maxDeliver,
                max_waiting: options.maxWaiting,
                kind: options.kind,
                status: options.status,
                http_endpoint_id: options.httpEndpointId
            });
            return new Consumer(this.config, this.streamName, consumerName, options);
        });
    }
    getConsumer(consumerName) {
        return new Consumer(this.config, this.streamName, consumerName, {
            filterSubjectPattern: '*' // Default pattern, adjust as needed
        });
    }
}
class Consumer {
    constructor(config, streamName, consumerName, options) {
        this.config = config;
        this.streamName = streamName;
        this.consumerName = consumerName;
        this.options = options;
    }
    receiveMessages() {
        return __awaiter(this, arguments, void 0, function* (batchSize = 1) {
            const response = yield axios_1.default.get(`${this.config.baseUrl}/api/streams/${this.streamName}/consumers/${this.consumerName}/receive`, {
                params: { batch_size: batchSize },
                headers: { 'Accept': 'application/json' }
            });
            return response.data;
        });
    }
    ackMessage(ackId) {
        return __awaiter(this, void 0, void 0, function* () {
            yield axios_1.default.post(`${this.config.baseUrl}/api/streams/${this.streamName}/consumers/${this.consumerName}/ack`, { ack_ids: [ackId] });
        });
    }
    nackMessage(ackId) {
        return __awaiter(this, void 0, void 0, function* () {
            yield axios_1.default.post(`${this.config.baseUrl}/api/streams/${this.streamName}/consumers/${this.consumerName}/nack`, { ack_ids: [ackId] });
        });
    }
    delete() {
        return __awaiter(this, void 0, void 0, function* () {
            yield axios_1.default.delete(`${this.config.baseUrl}/api/streams/${this.streamName}/consumers/${this.consumerName}`);
        });
    }
    onMessage(callback) {
        return __awaiter(this, void 0, void 0, function* () {
            while (true) {
                try {
                    const response = yield this.receiveMessages();
                    if (response.data && Array.isArray(response.data)) {
                        for (const item of response.data) {
                            if (item.message && item.ack_id) {
                                yield callback(Object.assign(Object.assign({}, item.message), { ack: () => this.ackMessage(item.ack_id), nack: () => this.nackMessage(item.ack_id) }));
                            }
                        }
                    }
                }
                catch (error) {
                    console.error('Error in onMessage:', error);
                    // Optionally add a delay before retrying
                    // await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
        });
    }
}
class Sequin {
    constructor(config = {}) {
        this.config = {
            baseUrl: config.baseUrl || 'http://localhost:7376',
        };
    }
    createStream(streamName) {
        return __awaiter(this, void 0, void 0, function* () {
            yield axios_1.default.post(`${this.config.baseUrl}/api/streams`, { name: streamName });
            return new Stream(this.config, streamName);
        });
    }
    getStream(streamName) {
        return new Stream(this.config, streamName);
    }
}
exports.Sequin = Sequin;
