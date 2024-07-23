import { Client } from '../src/index';

interface ReceivedMessage {
  message: any;
  ack_id: string;
}

describe('Client', () => {
  let client: Client;
  const testStreamName = 'test_stream_' + Date.now();
  const testConsumerName = 'test_consumer_' + Date.now();

  beforeAll(async () => {
    client = Client.init({ baseUrl: 'http://localhost:7376' });
  });

  afterAll(async () => {
    await client.deleteStream(testStreamName);
  });

  test('init should create a new Client instance', () => {
    expect(client).toBeInstanceOf(Client);
  });

  test('createStream should create a new stream', async () => {
    const {res, error } = await client.createStream(testStreamName);
    expect(res).toHaveProperty('id');
    expect(res.name).toBe(testStreamName);
  });

  test.skip('createStream should create a new stream with all properties', async () => {
    const streamName = 'test_stream_full_' + Date.now();
    const result = await client.createStream(streamName, {
      max_storage_gb: 2,
      one_message_per_key: true,
      process_unmodified: false,
      retain_up_to: 1000,
      retain_at_least: 100
    });
    expect(result.res).toHaveProperty('id');
    expect(result.res.name).toBe(streamName);
    expect(result.res).toHaveProperty('account_id');
    expect(result.res).toHaveProperty('stats');
    expect(result.res).toHaveProperty('inserted_at');
    expect(result.res).toHaveProperty('updated_at');
    // Clean up
    await client.deleteStream(streamName);
  });

  test('sendMessage should send a single message to the stream', async () => {
    const { res, error } = await client.sendMessage(testStreamName, 'test.1', 'value1');
    expect(res).toHaveProperty('published', 1);
  });

  test('sendMessages should send multiple messages to the stream', async () => {
    const messages = [
      { key: 'test.2', data: 'value2'},
      { key: 'test.3', data: 'value3' }
    ];
    const {res, error} = await client.sendMessages(testStreamName, messages);
    expect(res).toHaveProperty('published', 2);
  });

  test('createConsumer should create a new consumer', async () => {
    const result = await client.createConsumer(testStreamName, testConsumerName, 'test.>');
    expect(result.res).toHaveProperty('id');
    expect(result.res.name).toBe(testConsumerName);
  });

  test('createConsumer should create a new consumer with additional options', async () => {
    const consumerName = 'test_consumer_full_' + Date.now();
    const result = await client.createConsumer(testStreamName, consumerName, 'test.>', {
      ack_wait_ms: 60000,
      max_ack_pending: 5000,
      max_deliver: 3
    });
    expect(result.res).toHaveProperty('id');
    expect(result.res.name).toBe(consumerName);
    expect(result.res.ack_wait_ms).toBe(60000);
    expect(result.res.max_ack_pending).toBe(5000);
    expect(result.res.max_deliver).toBe(3);
    // Clean up
    await client.deleteConsumer(testStreamName, consumerName);
  });

  test('receiveMessage should retrieve a single message', async () => {
    const {res, error} = await client.receiveMessage(testStreamName, testConsumerName);
    expect(res).toHaveProperty('message');
    expect(res).toHaveProperty('ack_id');
  });

  test('receiveMessages should retrieve multiple messages', async () => {
    const result = await client.receiveMessages(testStreamName, testConsumerName, { batch_size: 2 });
    expect(result.res.length).toBe(2);
  });

  test('receiveMessage should return null when no messages are available', async () => {
    // Ensure the stream is empty first
    await client.receiveMessages(testStreamName, testConsumerName, { batch_size: 1000 });
    const result = await client.receiveMessage(testStreamName, testConsumerName);
    expect(result.res).toBeNull();
  });

  test('receiveMessages should respect custom batch_size', async () => {
    // Send 5 messages first
    const messages = Array.from({ length: 10 }, (_, i) => ({ key: `test.${i}`, data: `value_${i}` }));
    await client.sendMessages(testStreamName, messages);

    const result = await client.receiveMessages(testStreamName, testConsumerName, { batch_size: 3 });
    expect(result.res).toHaveLength(3);
  });

  test('ackMessages should acknowledge multiple messages', async () => {
    const receiveResult = await client.receiveMessages(testStreamName, testConsumerName, { batch_size: 2 });
    const ackIds = receiveResult.res.map((item: ReceivedMessage) => item.ack_id);
    const result = await client.ackMessages(testStreamName, testConsumerName, ackIds);
    expect(result.res).toEqual({ success: true });
    expect(result.error).toBeNull();
  });

  test('nackMessages should negative-acknowledge multiple messages', async () => {
    const receiveResult = await client.receiveMessages(testStreamName, testConsumerName, { batch_size: 2 });
    const ackIds = receiveResult.res.map((item: ReceivedMessage) => item.ack_id);
    const result = await client.nackMessages(testStreamName, testConsumerName, ackIds);
    expect(result.res).toEqual({ success: true });
    expect(result.error).toBeNull();
  });

  test('ackMessage should acknowledge a single message', async () => {
    // Send a message first
    await client.sendMessage(testStreamName, 'test.ack', 'ack_value');

    // Receive the message
    const receiveResult = await client.receiveMessage(testStreamName, testConsumerName);
    expect(receiveResult.res).not.toBeNull();

    // Acknowledge the message
    const result = await client.ackMessage(testStreamName, testConsumerName, receiveResult.res.ack_id);
    expect(result.res).toEqual({ success: true });
    expect(result.error).toBeNull();
  });

  test('nackMessage should negative-acknowledge a single message', async () => {
    // Send a message first
    await client.sendMessage(testStreamName, 'test.nack', 'nack_value');

    // Receive the message
    const receiveResult = await client.receiveMessage(testStreamName, testConsumerName);
    expect(receiveResult.res).not.toBeNull();

    // Negative-acknowledge the message
    const result = await client.nackMessage(testStreamName, testConsumerName, receiveResult.res.ack_id);
    expect(result.res).toEqual({ success: true });
    expect(result.error).toBeNull();
  });

  test('deleteConsumer should delete a consumer', async () => {
    const result = await client.deleteConsumer(testStreamName, testConsumerName);
    expect(result.res).toHaveProperty('deleted', true);
  });

  test('deleteStream should delete a stream', async () => {
    const tempStreamName = 'temp_stream_' + Date.now();
    await client.createStream(tempStreamName);
    const result = await client.deleteStream(tempStreamName);
    expect(result.res).toHaveProperty('deleted', true);
  });

  test('should handle API request errors', async () => {
    const result = await client.sendMessage('non_existent_stream', 'testKey', { value: 'testValue' });
    expect(result).toHaveProperty('error');
    expect(result.error).toHaveProperty('status');
    expect(result.error).toHaveProperty('summary');
  });

  test('misconfigured client should return friendly error', async () => {
    const badClient = Client.init({ baseUrl: 'http://localhost:0000' });
    const result = await badClient.createStream('test_stream');

    expect(result.error.status).toBe(500);
  });
});