import { Sequin } from '../index';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Sequin', () => {
  let sequin: Sequin;

  beforeEach(() => {
    sequin = new Sequin();
    jest.clearAllMocks();
  });

  test('createStream should create a new stream', async () => {
    mockedAxios.post.mockResolvedValue({ data: {} });

    const stream = await sequin.createStream('testStream');

    expect(mockedAxios.post).toHaveBeenCalledWith(
      'http://localhost:7376/api/streams',
      { name: 'testStream' }
    );
    expect(stream).toBeDefined();
  });

  test('getStream should return a Stream instance', () => {
    const stream = sequin.getStream('testStream');
    expect(stream).toBeDefined();
  });
});

describe('Stream', () => {
  let sequin: Sequin;
  let stream: any;

  beforeEach(() => {
    sequin = new Sequin();
    stream = sequin.getStream('testStream');
    jest.clearAllMocks();
  });

  test('sendMessage should send a message to the stream', async () => {
    mockedAxios.post.mockResolvedValue({ data: {} });

    await stream.sendMessage({ subject: 'test', data: { key: 'value' } });

    expect(mockedAxios.post).toHaveBeenCalledWith(
      'http://localhost:7376/api/streams/testStream/messages',
      { messages: [{ data: { key: 'value' }, subject: 'test' }] }
    );
  });

  test('createConsumer should create a new consumer', async () => {
    mockedAxios.post.mockResolvedValue({ data: {} });

    const consumer = await stream.createConsumer('testConsumer', {
      filterSubjectPattern: 'test.*'
    });

    expect(mockedAxios.post).toHaveBeenCalledWith(
      'http://localhost:7376/api/streams/testStream/consumers',
      expect.objectContaining({
        name: 'testConsumer',
        filter_subject_pattern: 'test.*'
      })
    );
    expect(consumer).toBeDefined();
  });
});

describe('Consumer', () => {
  let sequin: Sequin;
  let stream: any;
  let consumer: any;

  beforeEach(() => {
    sequin = new Sequin();
    stream = sequin.getStream('testStream');
    consumer = stream.getConsumer('testConsumer');
    jest.clearAllMocks();
  });

  test('receiveMessages should retrieve messages', async () => {
    const mockMessages = [
      { id: '1', subject: 'test', data: { key: 'value1' } },
      { id: '2', subject: 'test', data: { key: 'value2' } },
    ];
    mockedAxios.get.mockResolvedValue({ data: mockMessages });

    const messages = await consumer.receiveMessages();

    expect(mockedAxios.get).toHaveBeenCalledWith(
      'http://localhost:7376/api/streams/testStream/consumers/testConsumer/receive',
      { params: { batch_size: 1 }, headers: { 'Accept': 'application/json' } }
    );
    expect(messages).toEqual(mockMessages);
  });

  test('ackMessage should acknowledge a message', async () => {
    mockedAxios.post.mockResolvedValue({ data: {} });

    await consumer.ackMessage('messageId123');

    expect(mockedAxios.post).toHaveBeenCalledWith(
      'http://localhost:7376/api/streams/testStream/consumers/testConsumer/ack',
      { ack_ids: ['messageId123'] }
    );
  });

  test('nackMessage should negative-acknowledge a message', async () => {
    mockedAxios.post.mockResolvedValue({ data: {} });

    await consumer.nackMessage('messageId456');

    expect(mockedAxios.post).toHaveBeenCalledWith(
      'http://localhost:7376/api/streams/testStream/consumers/testConsumer/nack',
      { ack_ids: ['messageId456'] }
    );
  });

  test('delete should delete the consumer', async () => {
    mockedAxios.delete.mockResolvedValue({ data: {} });

    await consumer.delete();

    expect(mockedAxios.delete).toHaveBeenCalledWith(
      'http://localhost:7376/api/streams/testStream/consumers/testConsumer'
    );
  });

  test('receiveMessages should retrieve messages', async () => {
    const mockMessages = [
      { message: { id: '1', subject: 'test', data: { key: 'value1' } }, ack_id: 'ack1' },
      { message: { id: '2', subject: 'test', data: { key: 'value2' } }, ack_id: 'ack2' },
    ];
    mockedAxios.get.mockResolvedValue({ data: { data: mockMessages } });

    const result = await consumer.receiveMessages(2);

    expect(mockedAxios.get).toHaveBeenCalledWith(
      'http://localhost:7376/api/streams/testStream/consumers/testConsumer/receive',
      {
        params: { batch_size: 2 },
        headers: { 'Accept': 'application/json' }
      }
    );
    expect(result).toEqual({ data: mockMessages });
  });

  test('onMessage should process messages and call the callback', async () => {
    const mockMessages = [
      { message: { id: '1', subject: 'test', data: { key: 'value1' } }, ack_id: 'ack1' },
      { message: { id: '2', subject: 'test', data: { key: 'value2' } }, ack_id: 'ack2' },
    ];
    mockedAxios.get.mockResolvedValueOnce({ data: { data: mockMessages } })
      .mockResolvedValueOnce({ data: { data: [] } }); // Second call to stop the loop

    const mockCallback = jest.fn().mockResolvedValue(undefined);

    // Create a mock implementation of onMessage that only runs once
    const mockOnMessage = jest.spyOn(consumer, 'onMessage').mockImplementation(async (...args: unknown[]) => {
      const callback = args[0] as (message: any) => Promise<void>;
      const response = await consumer.receiveMessages();
      if (response.data && Array.isArray(response.data)) {
        for (const item of response.data) {
          if (item.message && item.ack_id) {
            await callback({
              ...item.message,
              ack: () => consumer.ackMessage(item.ack_id),
              nack: () => consumer.nackMessage(item.ack_id),
            });
          }
        }
      }
    });

    await consumer.onMessage(mockCallback);

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
  });
});