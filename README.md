# `sequin-js`

A lightweight JavaScript SDK for sending, receiving, and acknowledging messages in [Sequin streams](https://github.com/sequinstream/sequin). For easy development and testing, it also comes with helpful methods for managing the lifecycle of streams and consumers.

## Installing

Install the library:

```shell
npm i @sequinstream/sequin-js --save
```

## Initializing

You'll typically initialize a Sequin `Client` once in your application. Create a new file to initialize the `Client` in, and export it for use in other parts of your app:

```js
// sequin.js

import { Client } from `@sequinstream/sequin-js`

const baseUrl = process.env.SEQUIN_URL || 'http://localhost:7673'

const sequin = Client.init({ baseUrl })

export default sequin
```

By default, the Client is initialized using Sequin's default host and port in local development: `http://localhost:7673`

## Usage

You'll predominately use `sequin-js` to send, receive, and acknowledge [messages](https://github.com/sequinstream/sequin?tab=readme-ov-file#messages) in Sequin streams:

```js
// Import the Sequin client from sequin.js
import sequin from './sequin.js';

// Define your stream and consumer
const stream = 'your-stream-name';
const consumer = 'your-consumer-name';

// Send a message
const { res, error } = await sequin.sendMessage(
  stream,
  'test.1',
  'Hello, Sequin!'
)
if (error) {
  console.error('Error sending messages:', error.summary);
  // Handle the error appropriately
} else {
  console.log('Messages sent successfully', res);
}

// Receive a message
const { res: message, error: receiveError } = await sequin.receiveMessage(stream, consumer);
if (receiveError) {
  console.error('Error receiving message:', error.summary);
} else {
  console.log('Received message:', message);
  // Don't forget to acknowledge the message
  const { res: ack, error: ackError } = await sequin.ackMessage(stream, consumer, [message.ack_id]);
  if (ackError) {
    console.log('Error acking message:' ackError.summary)
  }
  else {
    console.log('Message acked');
  }
}
```

### `sendMessage()`

[Send](https://github.com/sequinstream/sequin?tab=readme-ov-file#sending-messages) a message to a stream:

```js
const { res, error } = sequin.sendMessage(stream_id_or_name, key, data)
```

#### Parameters

`sendMessage()` accepts three arguments:

- `stream_id_or_name` (_string_): Either the name or id of the stream.
- `key` (_string_): The key for the message.
- `data` (_string_): The data payload for the message. Can be either an object or a string (objects will be JSON encoded).

#### Returns

`sendMessage()` will return an object with two keys, `res` and `error`:

**Success**

```json
{
  "res": {
    "published": 1
  },
  "error": null
}
```

**Error**

```json
{
  "res": null,
  "error": {
    "status": 404,
    "summary": "stream not found"
  },
}
```

#### Example

```js
const { res, error } = await sequin.sendMessage(
  'my_stream',
  'greeting.1',
  'Hello, Sequin!'
)
if (error) {
  console.error('Error sending messages:', error.summary);
  // Handle the error appropriately
} else {
  console.log('Messages sent successfully', res.published );
}
```

### `sendMessages()`

Send a batch of messages (max 1,000):

```js
const { res, error } = sequin.sendMessages(stream_id_or_name, messages)
```

#### Parameters

`sendMessages()` accepts two arguments:

- `stream_id_or_name` (_string_): Either the name or id of the stream.
- `messages` (_array_): An array of message objects:

```json
[
  {
    key: "message_key_1",
    data: "data_payload_1"
  },
  {
    key: "message_key_2",
    data: "data_payload_2"
  },
  { ... }
]
```

#### Returns

`sendMessages()` will return an object with a two keys, `res` and `error`:

> [!IMPORTANT]
> `sendMessages()` is all or nothing. Either all the messages are successfully published, or none of the messages are published.

**Success**

```json
{
  "res": {
    "published": 42
  },
  "error": null
}
```

**Error**

```json
{
  "res": null,
  "error": {
    "status": 404,
    "summary": "Stream not found"
  },
}
```

#### Example

```js
let messages = [
  {
    key: 'test.1',
    data: 'Hello, Sequin!'
  },
  {
    key: 'test.2',
    data: 'Greetings from Sequin!'
  }
];


const { res, error } = await sequin.sendMessages('my_stream', messages);
if (error) {
  console.error('Error sending messages:', error.summary);
  // Handle the error appropriately
} else {
  console.log('Messages sent successfully', res.published );
}
```

### `receiveMessage()`

To pull a single messages off the stream using a Sequin consumer, you'll use the `receiveMessage()` function:

```js
const { res, error } = sequin.receiveMessage(stream_id_or_name, consumer_id_or_name)
```

#### Parameters

`receiveMessage()` accepts two arguments:

- `stream_id_or_name` (_string_): Either the name or id of the stream.
- `consumer_id_or_name` (_string_): Either the name or id of the stream.

#### Returns

`receiveMessage()` will return an object with two keys, `res` and `error`:

**No messages available**

```json
{
  "res": null,
  "error": null
}
```

**Message**

```json
{
  "res": {
    "message": {
        "key": "test.1",
        "stream_id": "def45b2d-ae3f-46a4-b57b-54cdc1cecc6d",
        "data": "Hello, Sequin!",
        "seq": 1,
        "inserted_at": "2024-07-23T00:31:55.668060Z",
        "updated_at": "2024-07-23T00:31:55.668060Z"
    },
    "ack_id": "07240856-96cb-4305-9b2f-620f4b1528a4"
  },
  "error": null
}
```

**Error**

```json
{
  "res": null,
  "error": {
    "status": 404,
    "summary": "Consumer not found."
  }
}
```

#### Example

```js
const { res, error } = await sequin.receiveMessage('my_stream', 'my_consumer');
if (error) {
  console.error('Error receiving messages:', error.summary);
  // Handle the error appropriately
}else if (res === null) {
  console.log('No messages available');
} else {
  console.log('Messages received successfully', res );
}
```

### `receiveMessages()`

You can pull a batch of messages for your consumer using `recieveMesages()`. `receiveMessages()` pulls a batch of `10` messages by default:

```js
const { res, error} = sequin.receiveMessages(stream_id_or_name, consumer_id_or_name, options?)
```

#### Parameters

`receiveMessage()` accepts three arguments:

- `stream_id_or_name` (_string_): Either the name or id of the stream.
- `consumer_id_or_name` (_string_): Either the name or id of the consumer.
- `options` (_object_, optional): An object that defines optional parameters:
  - `batch_size` (_integer_): The number of messages to request. Default is 10, max of 1,000.

#### Returns

`receiveMessage()` will return an object with a two keys, `res` and `error`:

**No messages available**

```json
{
  "res": [], //empty array
  "error": null
}
```

**Messages**

```json
{
  "res": [
    {
      message: {
          "key": "test.1",
          "stream_id": "def45b2d-ae3f-46a4-b57b-54cdc1cecc6d",
          "data": "Hello, Sequin!",
          "seq": 1,
          "inserted_at": "2024-07-23T00:31:55.668060Z",
          "updated_at": "2024-07-23T00:31:55.668060Z"
      },
      ack_id: "07240856-96cb-4305-9b2f-620f4b1528a4"
    },
    { ... },
    { ... }
  ],
  "error": null
}
```

**Error**

```json
{
  "res": null,
  "error": {
    "status": 404,
    "summary": "Consumer not found."
  }
}
```

#### Example

```js
const { res, error } = await sequin.receiveMessage('my_stream', 'my_consumer', { batch_size: 100 });
if (error) {
  console.error('Error receiving messages:', error.summary);
  // Handle the error appropriately
} else if (res === []) {
  console.log('No messages available');
} else {
  console.log('Messages received successfully', res );
}
```
### `ackMessage()`

After processing a message, you can [acknowledge](https://github.com/sequinstream/sequin?tab=readme-ov-file#acking-messages) it using `ackMessage()`:

```js
const { res, error } = sequin.ackMessage(stream_id_or_name, consumer_id_or_name, ack_id)
```

#### Parameters

`ackMessage()` accepts three arguments:

- `stream_id_or_name` (_string_): Either the name or id of the stream.
- `consumer_id_or_name` (_string_): Either the name or id of the stream.
- `ack_id` (_string_): The `ack_id` for the messages you want to ack.

#### Returns

`ackMessage()` will return an object with a two keys, `res` and `error`:

**Success**

```json
{
  "res": {
    "success": true
  },
  "error": null
}
```

**Error**

```json
{
  "res": null,
  "error": {
    "status": 400,
    "summary": "Invalid ack_id."
  },
}
```

#### Example

```js
const { res, error } = await sequin.ackMessage('my_stream', 'my_consumer', '07240856-96cb-4305-9b2f-620f4b1528a4');

if (error) {
  console.error('Error acknowledging message:', error.summary);
  // Handle the error appropriately
} else {
  console.log('Message acknowledged successfully', res);
}
```

### `ackMessages()`

You can also [acknowledge](https://github.com/sequinstream/sequin?tab=readme-ov-file#acking-messages) a batch of messages using `ackMessages()`:

```js
const { res, error } = sequin.ackMessages(stream_id_or_name, consumer_id_or_name, ack_ids)
```

#### Parameters

`ackMessages()` accepts three arguments:

- `stream_id_or_name` (_string_): Either the name or id of the stream.
- `consumer_id_or_name` (_string_): Either the name or id of the stream.
- `ack_ids` (_array_): An array of `ack_id` _strings_ for the messages you want to ack.

#### Returns

`ackMessages()` will return an object with a two keys, `res` and `error`:

> [!IMPORTANT]
> `ackMessages()` is all or nothing. Either all the messages are successfully acknowledged, or none of the messages are acknowledged.

**Success**

```json
{
  "res": {
    "success": true
  },
  "error": null
}
```

**Error**

```json
{
  "res": null,
  "error": {
    "status": 400,
    "summary": "Invalid ack_id."
  },
}
```

#### Example

```js
const { res, error } = await sequin.ackMessages('my_stream', 'my_consumer', ['07240856-96cb-4305-9b2f-620f4b1528a4', '522c69a1-0bbe-49ec-9d0d-e39b40d483f8']);

if (error) {
  console.error('Error acknowledging message:', error.summary);
  // Handle the error appropriately
} else {
  console.log('Message acknowledged successfully', res);
}
```

### `nackMessage()`

Or, you can [`nack`](https://github.com/sequinstream/sequin?tab=readme-ov-file#nacking-messages) a message using `nackMessage()`:

```js
const { res, error } = sequin.nackMessage(stream_id_or_name, consumer_id_or_name, ack_id)
```

#### Parameters

`nackMessage()` accepts three arguments:

- `stream_id_or_name` (_string_): Either the name or id of the stream.
- `consumer_id_or_name` (_string_): Either the name or id of the stream.
- `ack_id` (_string_): The `ack_id` for the message to **not** acknowledge.

#### Returns

`nackMessage()` will return an object with a two keys, `res` and `error`:

**Success**

```json
{
  "res": {
    "success": true
  },
  "error": null
}
```

**Error**

```json
{
  "res": null,
  "error": {
    "status": 400,
    "summary": "Invalid ack_id"
  },
}
```

#### Example

```js
const { res, error } = await sequin.nackMessage('my_stream', 'my_consumer', '07240856-96cb-4305-9b2f-620f4b1528a4');

if (error) {
  console.error('Error acknowledging message:', error.summary);
  // Handle the error appropriately
} else {
  console.log('Message acknowledged successfully', res);
}
```

### `nackMessages()`

Or, you can [`nack`](https://github.com/sequinstream/sequin?tab=readme-ov-file#nacking-messages) a batch of messages using `nackMessages()`:

```js
const { res, error } = sequin.nackMessages(stream_id_or_name, consumer_id_or_name, ack_ids)
```

#### Parameters

`nackMessages()` accepts three arguments:

- `stream_id_or_name` (_string_): Either the name or id of the stream.
- `consumer_id_or_name` (_string_): Either the name or id of the stream.
- `ack_ids` (_array_): An array of `ack_id` _strings_ for the messages to **not** acknowledge.

#### Returns

`nackMessages()` will return an object with a two keys, `res` and `error`:

> [!IMPORTANT]
> `nackMessages()` is all or nothing. Either all the messages are successfully nacked, or none of the messages are nacked.

**Success**

```json
{
  "res": {
    "success": true
  },
  "error": null
}
```

**Error**

```json
{
  "res": null,
  "error": {
    "status": 400,
    "summary": "Invalid ack_id"
  },
}
```

#### Example

```js
const { res, error } = await sequin.nackMessages('my_stream', 'my_consumer', ['07240856-96cb-4305-9b2f-620f4b1528a4', '522c69a1-0bbe-49ec-9d0d-e39b40d483f8']);

if (error) {
  console.error('Error acknowledging message:', error.summary);
  // Handle the error appropriately
} else {
  console.log('Message acknowledged successfully', res);
}
```

### `createStream()`

Creating streams can be helpful in automated testing. You can create a new stream using `createStream()`:

```js
const { res, error } = sequin.createStream(stream_name, options?)
```

#### Parameters

`createStream()` accepts two parameters:

- `name` (_string_): The name of the stream you want to create.
- `options` (_object_, optional): An object of key:value pairs that define optional parameters:
  - `one_message_per_key` (_bool_)
  - `process_unmodified` (_bool_)
  - `max_storage_gb` (_integer_)
  - `retain_up_to` (_integer_)
  - `retain_at_least` (_integer_)

#### Returns

`createStream()` will return an object with a two keys, `res` and `error`:

**Success**

```json
{
  "res": {
    "id": "197a3ee8-8ddd-4ddd-8456-5d0b78a72784",
    "name": "my_stream",
    "account_id": "8b930c30-2334-4339-b7ba-f250b7be223e",
    "stats": {
      "message_count": 0,
      "consumer_count": 0,
      "storage_size": 163840
    },
    "inserted_at": "2024-07-24T20:02:46Z",
    "updated_at": "2024-07-24T20:02:46Z"
  },
  "error": null
}
```

**Error**

```json
{
  "res": null,
  "error": {
    "status": 422,
    "summary": "Validation failed: duplicate name"
  },
}
```

#### Example

```js
const { res, error } = await sequin.createStream('my_stream')
if (error) {
  console.error('Error creating stream:', error.summary);
  // Handle the error appropriately
} else {
  console.log('Stream created successfully', res );
}
```

### `deleteStream()`

Deleting streams can be helpful in automated testing. You can delete a stream using `deleteStream()`:

```js
const { res, error } = sequin.deleteStream(stream_id_or_name)
```

#### Parameters

`deleteStream()` accepts one parameter:

- `stream_id_or_name` (_string_): The id or name of the stream you want to delete.

#### Returns

`deleteStream()` will return an object with a two keys, `res` and `error`:

**Successful delete**

```json
{
  "res": {
    "id": "197a3ee8-8ddd-4ddd-8456-5d0b78a72784",
    "deleted": true
  },
  "error": null
}
```

**Error**

```json
{
  "res": null,
  "error": {
    "status": 404,
    "summary": "Not found: No `stream` found matching the provided ID or name"
  },
}
```

#### Example

```js
const { res, error } = await sequin.deleteStream('my_stream')
if (error) {
  console.error('Error deleting stream:', error.summary);
  // Handle the error appropriately
} else {
  console.log('Stream deleted successfully', res );
}
```

### `createConsumer()`

Creating [consumers](https://github.com/sequinstream/sequin?tab=readme-ov-file#consumers-1) can be helpful in automated testing. You can create a new consumer using `createConsumer()`:

```js
const { res, error } = sequin.createConsumer(stream_id_or_name, consumer_name, consumer_filter, options?)
```

#### Parameters

`createConsumer()` accepts two parameters:

- `stream_id_or_name` (_string_): The id or name of the stream you want to attach the consumer to.
- `name` (_string_): The name of the consumer you want to create.
- `filter` (_string_): The filter pattern the consumer will use to pull messages off the stream.
- `options` (_object_, optional): An object of key:value pairs that define optional parameters:
  - `ack_wait_ms` (_integer_): Acknowledgement wait time in milliseconds
  - `max_ack_pending` (_integer_): Maximum number of pending acknowledgements
  - `max_deliver` (_integer_): Maximum number of delivery attempts

#### Returns

`createConsumer()` will return an object with a two keys, `res` and `error`:

**Success**

```json
{
  "res": {
    "ack_wait_ms": 30000,
    "filter_key_pattern": "test.>",
    "id": "67df6362-ba21-4ddc-8601-55d404bacaeb",
    "inserted_at": "2024-07-24T20:12:20Z",
    "kind": "pull",
    "max_ack_pending": 10000,
    "max_deliver": null,
    "max_waiting": 20,
    "name": "my_consumer",
    "stream_id": "15b1f003-3a47-4371-8331-6437cb48477e",
    "updated_at": "2024-07-24T20:12:20Z",
    "http_endpoint_id": null,
    "status": "active"
  },
  "error": null
}
```

**Error**

```json
{
  "res": null,
  "error": {
    "status": 422,
    "summary": "Validation failed: duplicate name"
  },
}
```

#### Example

```js
const { res, error } = await sequin.createConsumer('my_stream', 'my_consumer', 'test.>')
if (error) {
  console.error('Error creating consumer:', error.summary);
  // Handle the error appropriately
} else {
  console.log('Consumer created successfully', res );
}
```

### `deleteConsumer()`

Deleting consumers can be helpful in automated testing. You can delete a consumer using `deleteConsumer()`:

```js
const { res, error } = sequin.deleteConsumer(stream_id_or_name, consumer_id_or_name)
```

#### Parameters

`deleteConsumer()` accepts two parameters:

- `stream_id_or_name` (_string_): The id or name of the stream associated to the consumer you want to delete.
- `consumer_id_or_name` (_string_): The id or name of the consumer you want to delete.

#### Returns

`deleteConsumer()` will return an object with a two keys, `res` and `error`:

**Successful delete**

```json
{
  "res": {
    "id": "197a3ee8-8ddd-4ddd-8456-5d0b78a72784",
    "deleted": true
  },
  "error": null
}
```

**Error**

```json
{
  "res": null,
  "error": {
    "status": 404,
    "summary": "Not found: No `consumer` found matching the provided ID or name"
  },
}
```

#### Example

```js
const { res, error } = await sequin.deleteConsumer('my_stream', 'my_consumer')
if (error) {
  console.error('Error deleting consumer:', error.summary);
  // Handle the error appropriately
} else {
  console.log('Consumer deleted successfully', res );
}
```

## Testing

To adequately test Sequin, we recommend creating temporary streams and consumers in addition to testing sending and receiving messages. Here's an example using jest:

```js
import sequin from './sequin.js';

describe('Sequin Stream and Consumer Test', () => {
  const streamName = `test-stream-${Date.now()}`;
  const consumerName = `test-consumer-${Date.now()}`;

  test('Stream and Consumer Lifecycle', async () => {
    // Create a new stream
    const { res: stream, error: streamError } = await client.createStream(streamName);
    expect(stream.name).toBe(streamName);

    // Create a consumer
    const { res: consumer, error: consumerError } = await client.createConsumer(streamName, consumerName, 'test.>');
    expect(consumer.name).toBe(consumerName);

    // Send a message
    await sequin.sendMessage(streamName, 'test.1', 'Hello, Sequin!');
    expect(sendRes).toHaveProperty('published', 1);

    // Receive and ack a message
    const { res: receiveRes } = await sequin.receiveMessage(streamName, consumerName);
    // Add tests for your business logic
    await sequin.ackMessages(streamName, consumerName, [receiveRes.ack_id]);

    // Delete the consumer
    const { res: deleteConsumerRes, error: deleteConsumerError } = await client.deleteConsumer(streamName, consumerName);
    expect(deleteConsumerRes).toHaveProperty('deleted', true);

    // Delete the stream
    const { res: deleteStreamRes, error: deleteStreamError } = await client.deleteStream(streamName);
    expect(deleteStreamRes).toHaveProperty('deleted', true);
  });
});
```
