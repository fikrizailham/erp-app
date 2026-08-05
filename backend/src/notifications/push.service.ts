import { Injectable, Logger } from '@nestjs/common';

export interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

// Thin adapter over Expo Push / Firebase Cloud Messaging. Swap the body of
// `send()` for a real HTTP call once EXPO_ACCESS_TOKEN / FCM_SERVER_KEY are
// configured — every caller in the app already goes through this interface.
@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);

  async send(deviceTokens: string[], payload: PushPayload): Promise<void> {
    if (deviceTokens.length === 0) return;
    if (!process.env.EXPO_ACCESS_TOKEN && !process.env.FCM_SERVER_KEY) {
      this.logger.debug(`[push:noop] ${payload.title} -> ${deviceTokens.length} device(s)`);
      return;
    }
    // TODO: wire to Expo Push API / FCM once credentials are provisioned.
    this.logger.log(`Sending push "${payload.title}" to ${deviceTokens.length} device(s)`);
  }
}
