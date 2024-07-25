export interface SequinConfig {
  baseUrl?: string;
}

export interface Message {
  key: string;
  data: string;
}

export interface StreamOptions {
  one_message_per_key?: boolean;
  process_unmodified?: boolean;
  max_storage_gb?: number;
  retain_up_to?: number;
  retain_at_least?: number;
}

export interface ConsumerOptions {
  ack_wait_ms?: number;
  max_ack_pending?: number;
  max_deliver?: number;
}

export class Client {
  private config: SequinConfig;

  private constructor(config: SequinConfig = {}) {
    this.config = {
      baseUrl: config.baseUrl || 'http://localhost:7376',
    };
  }

  static init(config: SequinConfig = {}): Client {
    return new Client(config);
  }

  private async request(endpoint: string, method: string, body?: any): Promise<any> {
    try {
      const response = await fetch(`${this.config.baseUrl}${endpoint}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
      });


      if (!response.ok) {
        const errorData = await response.json();
        return { res: null, error: { status: response.status, summary: errorData.summary } };
      } else if (response.status === 204) {
        return { res: { success: true }, error: null };
      }

      const data = await response.json();
      return { res: data.data || data, error: null };
    } catch (error) {
      if (error instanceof Error && error.message === 'fetch failed') {
        return {
          res: null,
          error: {
            status: 500,
            summary: `We can't reach Sequin on ${this.config.baseUrl}. Double check that Sequin is running and confirm your JS client is configured properly`
          }
        };
      }
      return { res: null, error: { status: 500, summary: (error as Error).message } };
    }
  }

  async sendMessage(stream: string, key: string, data: any): Promise<any> {
    return this.sendMessages(stream, [{ key, data }]);
  }

  async sendMessages(stream: string, messages: Message[]): Promise<any> {
    return this.request(`/api/streams/${stream}/messages`, 'POST', { messages });
  }

  async receiveMessage(stream: string, consumer: string): Promise<any> {
    const result = await this.receiveMessages(stream, consumer, { batch_size: 1 });
    if (result.error) return result;
    return result.res && result.res.length > 0
      ? { res: result.res[0], error: null }
      : { res: null, error: null };
  }

  async receiveMessages(stream: string, consumer: string, options: { batch_size?: number } = { batch_size: 10 }): Promise<any> {
    const batch_size = options.batch_size || 10;
    return this.request(`/api/streams/${stream}/consumers/${consumer}/receive?batch_size=${batch_size}`, 'GET');
  }

  async ackMessages(stream: string, consumer: string, ack_ids: string[]): Promise<any> {
    return await this.request(`/api/streams/${stream}/consumers/${consumer}/ack`, 'POST', { ack_ids: ack_ids });
  }

  async ackMessage(stream: string, consumer: string, ack_id: string): Promise<any> {
    return this.ackMessages(stream, consumer, [ack_id]);
  }

  async nackMessages(stream: string, consumer: string, ack_ids: string[]): Promise<any> {
    return await this.request(`/api/streams/${stream}/consumers/${consumer}/nack`, 'POST', { ack_ids: ack_ids });
  }

  async nackMessage(stream: string, consumer: string, ack_id: string): Promise<any> {
    return this.nackMessages(stream, consumer, [ack_id]);
  }

  async createStream(stream_name: string, options: StreamOptions = {}): Promise<any> {
    return this.request('/api/streams', 'POST', { name: stream_name, ...options });
  }

  async deleteStream(stream_id_or_name: string): Promise<any> {
    const result = await this.request(`/api/streams/${stream_id_or_name}`, 'DELETE');
    if (result.error) return result;
    return {
      res: result.res,
      error: null
    };
  }

  async createConsumer(stream_id_or_name: string, consumer_name: string, consumer_filter: string, options: ConsumerOptions = {}): Promise<any> {
    return this.request(`/api/streams/${stream_id_or_name}/consumers`, 'POST', {
      name: consumer_name,
      filter_key_pattern: consumer_filter,
      kind: 'pull',
      ...options
    });
  }

  async deleteConsumer(stream_id_or_name: string, consumer_id_or_name: string): Promise<any> {
    const result = await this.request(`/api/streams/${stream_id_or_name}/consumers/${consumer_id_or_name}`, 'DELETE');
    if (result.error) return result;
    return {
      res: result.res,
      error: null
    };
  }
}