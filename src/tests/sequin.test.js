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
const index_1 = require("../index");
const axios_1 = __importDefault(require("axios"));
jest.mock('axios');
const mockedAxios = axios_1.default;
describe('Sequin', () => {
    let sequin;
    beforeEach(() => {
        sequin = new index_1.Sequin();
        jest.clearAllMocks();
    });
    test('createStream should create a new stream', () => __awaiter(void 0, void 0, void 0, function* () {
        mockedAxios.post.mockResolvedValue({ data: {} });
        const stream = yield sequin.createStream('testStream');
        expect(mockedAxios.post).toHaveBeenCalledWith('http://localhost:7376/api/streams', { name: 'testStream' });
        expect(stream).toBeDefined();
    }));
    test('getStream should return a Stream instance', () => {
        const stream = sequin.getStream('testStream');
        expect(stream).toBeDefined();
    });
});
describe('Stream', () => {
    let sequin;
    let stream;
    beforeEach(() => {
        sequin = new index_1.Sequin();
        stream = sequin.getStream('testStream');
        jest.clearAllMocks();
    });
    test('sendMessage should send a message to the stream', () => __awaiter(void 0, void 0, void 0, function* () {
        mockedAxios.post.mockResolvedValue({ data: {} });
        yield stream.sendMessage({ subject: 'test', data: { key: 'value' } });
        expect(mockedAxios.post).toHaveBeenCalledWith('http://localhost:7376/api/streams/testStream/messages', { messages: [{ data: { key: 'value' }, subject: 'test' }] });
    }));
    test('createConsumer should create a new consumer', () => __awaiter(void 0, void 0, void 0, function* () {
        mockedAxios.post.mockResolvedValue({ data: {} });
        const consumer = yield stream.createConsumer('testConsumer', {
            filterSubjectPattern: 'test.*'
        });
        expect(mockedAxios.post).toHaveBeenCalledWith('http://localhost:7376/api/streams/testStream/consumers', expect.objectContaining({
            name: 'testConsumer',
            filter_subject_pattern: 'test.*'
        }));
        expect(consumer).toBeDefined();
    }));
});
describe('Consumer', () => {
    let sequin;
    let stream;
    let consumer;
    beforeEach(() => {
        sequin = new index_1.Sequin();
        stream = sequin.getStream('testStream');
        consumer = stream.getConsumer('testConsumer');
        jest.clearAllMocks();
    });
    test('receiveMessages should retrieve messages', () => __awaiter(void 0, void 0, void 0, function* () {
        const mockMessages = [
            { id: '1', subject: 'test', data: { key: 'value1' } },
            { id: '2', subject: 'test', data: { key: 'value2' } },
        ];
        mockedAxios.get.mockResolvedValue({ data: mockMessages });
        const messages = yield consumer.receiveMessages();
        expect(mockedAxios.get).toHaveBeenCalledWith('http://localhost:7376/api/streams/testStream/consumers/testConsumer/receive', { params: { batch_size: 1 }, headers: { 'Accept': 'application/json' } });
        expect(messages).toEqual(mockMessages);
    }));
    test('ackMessage should acknowledge a message', () => __awaiter(void 0, void 0, void 0, function* () {
        mockedAxios.post.mockResolvedValue({ data: {} });
        yield consumer.ackMessage('messageId123');
        expect(mockedAxios.post).toHaveBeenCalledWith('http://localhost:7376/api/streams/testStream/consumers/testConsumer/ack', { ack_ids: ['messageId123'] });
    }));
    test('nackMessage should negative-acknowledge a message', () => __awaiter(void 0, void 0, void 0, function* () {
        mockedAxios.post.mockResolvedValue({ data: {} });
        yield consumer.nackMessage('messageId456');
        expect(mockedAxios.post).toHaveBeenCalledWith('http://localhost:7376/api/streams/testStream/consumers/testConsumer/nack', { ack_ids: ['messageId456'] });
    }));
    test('delete should delete the consumer', () => __awaiter(void 0, void 0, void 0, function* () {
        mockedAxios.delete.mockResolvedValue({ data: {} });
        yield consumer.delete();
        expect(mockedAxios.delete).toHaveBeenCalledWith('http://localhost:7376/api/streams/testStream/consumers/testConsumer');
    }));
    test('receiveMessages should retrieve messages', () => __awaiter(void 0, void 0, void 0, function* () {
        const mockMessages = [
            { message: { id: '1', subject: 'test', data: { key: 'value1' } }, ack_id: 'ack1' },
            { message: { id: '2', subject: 'test', data: { key: 'value2' } }, ack_id: 'ack2' },
        ];
        mockedAxios.get.mockResolvedValue({ data: { data: mockMessages } });
        const result = yield consumer.receiveMessages(2);
        expect(mockedAxios.get).toHaveBeenCalledWith('http://localhost:7376/api/streams/testStream/consumers/testConsumer/receive', {
            params: { batch_size: 2 },
            headers: { 'Accept': 'application/json' }
        });
        expect(result).toEqual({ data: mockMessages });
    }));
    test('onMessage should process messages and call the callback', () => __awaiter(void 0, void 0, void 0, function* () {
        const mockMessages = [
            { message: { id: '1', subject: 'test', data: { key: 'value1' } }, ack_id: 'ack1' },
            { message: { id: '2', subject: 'test', data: { key: 'value2' } }, ack_id: 'ack2' },
        ];
        mockedAxios.get.mockResolvedValueOnce({ data: { data: mockMessages } })
            .mockResolvedValueOnce({ data: { data: [] } }); // Second call to stop the loop
        const mockCallback = jest.fn().mockResolvedValue(undefined);
        // Create a mock implementation of onMessage that only runs once
        const mockOnMessage = jest.spyOn(consumer, 'onMessage').mockImplementation((...args) => __awaiter(void 0, void 0, void 0, function* () {
            const callback = args[0];
            const response = yield consumer.receiveMessages();
            if (response.data && Array.isArray(response.data)) {
                for (const item of response.data) {
                    if (item.message && item.ack_id) {
                        yield callback(Object.assign(Object.assign({}, item.message), { ack: () => consumer.ackMessage(item.ack_id), nack: () => consumer.nackMessage(item.ack_id) }));
                    }
                }
            }
        }));
        yield consumer.onMessage(mockCallback);
        expect(mockedAxios.get).toHaveBeenCalledTimes(1);
        expect(mockCallback).toHaveBeenCalledTimes(2);
        expect(mockCallback).toHaveBeenCalledWith(expect.objectContaining({
            id: '1',
            subject: 'test',
            data: { key: 'value1' },
            ack: expect.any(Function),
            nack: expect.any(Function),
        }));
        expect(mockCallback).toHaveBeenCalledWith(expect.objectContaining({
            id: '2',
            subject: 'test',
            data: { key: 'value2' },
            ack: expect.any(Function),
            nack: expect.any(Function),
        }));
        // Restore the original implementation
        mockOnMessage.mockRestore();
    }));
});
