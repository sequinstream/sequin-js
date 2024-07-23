const {Client} = require('../dist/index');

async function debug() {
  const client = Client.init();

  const testStreamName = 'debug';
  const testConsumerName = 'debug_consumer';
  const messages = Array.from({length: 10}, (_, i) => ({
    key: `test.${i + 30}`,
    data: `value_${i + 30}`,
  }));

  const result = await client.sendMessage(
    'non_existent_stream',
    'testKey',
    'testValue'
  );
  console.log(result);
}

debug();
