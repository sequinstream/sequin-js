import axios from 'axios';

interface SequinConfig {
  baseUrl?: string;
}

interface Message {
  subject: string;
  data: any;
  ack_id?: string;
}

class Stream {
  constructor(private config: SequinConfig, private streamName: string) {}

  async sendMessage(message: Message): Promise<void> {
    await axios.post(
      `${this.config.baseUrl}/api/streams/${this.streamName}/messages`,
      { messages: [{ data: message.data, subject: message.subject }] }
    );
  }

  async createConsumer(consumerName: string, options: {
    filterSubjectPattern: string;
    ackWaitMs?: number;
    maxAckPending?: number;
    maxDeliver?: number;
    maxWaiting?: number;
    kind?: 'pull' | 'push';
    status?: 'active' | 'disabled';
    httpEndpointId?: string;
  }): Promise<Consumer> {
    const response = await axios.post(
      `${this.config.baseUrl}/api/streams/${this.streamName}/consumers`,
      {
        name: consumerName,
        filter_subject_pattern: options.filterSubjectPattern,
        ack_wait_ms: options.ackWaitMs,
        max_ack_pending: options.maxAckPending,
        max_deliver: options.maxDeliver,
        max_waiting: options.maxWaiting,
        kind: options.kind,
        status: options.status,
        http_endpoint_id: options.httpEndpointId
      }
    );
    return new Consumer(this.config, this.streamName, consumerName, options);
  }

  getConsumer(consumerName: string): Consumer {
    return new Consumer(this.config, this.streamName, consumerName, {
      filterSubjectPattern: '*' // Default pattern, adjust as needed
    });
  }
}

class Consumer {
  constructor(
    private config: SequinConfig,
    private streamName: string,
    private consumerName: string,
    private options: {
      ackWaitMs?: number;
      maxAckPending?: number;
      maxDeliver?: number;
      maxWaiting?: number;
      filterSubjectPattern: string;
      kind?: 'pull' | 'push';
      status?: 'active' | 'disabled';
      httpEndpointId?: string;
    }
  ) {}

  async receiveMessages(batchSize: number = 1): Promise<{ data: Array<{ message: Message, ack_id: string }> }> {
    const response = await axios.get(
      `${this.config.baseUrl}/api/streams/${this.streamName}/consumers/${this.consumerName}/receive`,
      {
        params: { batch_size: batchSize },
        headers: { 'Accept': 'application/json' }
      }
    );
    return response.data;
  }

  async ackMessage(ackId: string): Promise<void> {
    await axios.post(
      `${this.config.baseUrl}/api/streams/${this.streamName}/consumers/${this.consumerName}/ack`,
      { ack_ids: [ackId] }
    );
  }

  async nackMessage(ackId: string): Promise<void> {
    await axios.post(
      `${this.config.baseUrl}/api/streams/${this.streamName}/consumers/${this.consumerName}/nack`,
      { ack_ids: [ackId] }
    );
  }

  async delete(): Promise<void> {
    await axios.delete(
      `${this.config.baseUrl}/api/streams/${this.streamName}/consumers/${this.consumerName}`
    );
  }

  async onMessage(callback: (message: Message & { ack: () => Promise<void>; nack: () => Promise<void> }) => Promise<void>) {
    while (true) {
      try {
        const response = await this.receiveMessages();
        if (response.data && Array.isArray(response.data)) {
          for (const item of response.data) {
            if (item.message && item.ack_id) {
              await callback({
                ...item.message,
                ack: () => this.ackMessage(item.ack_id),
                nack: () => this.nackMessage(item.ack_id),
              });
            }
          }
        }
      } catch (error) {
        console.error('Error in onMessage:', error);
        // Optionally add a delay before retrying
        // await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }
}

export class Sequin {
  private config: SequinConfig;

  constructor(config: SequinConfig = {}) {
    this.config = {
      baseUrl: config.baseUrl || 'http://localhost:7376',
    };
  }

  async createStream(streamName: string): Promise<Stream> {
    await axios.post(
      `${this.config.baseUrl}/api/streams`,
      { name: streamName }
    );
    return new Stream(this.config, streamName);
  }

  getStream(streamName: string): Stream {
    return new Stream(this.config, streamName);
  }
}