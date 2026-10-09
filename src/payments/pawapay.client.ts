import { BadGatewayException, BadRequestException } from '@nestjs/common';

/** pawaPay Merchant API v2 — https://docs.pawapay.io/v2 */
export type PawapayDepositStatus =
  | 'ACCEPTED'
  | 'PROCESSING'
  | 'IN_RECONCILIATION'
  | 'COMPLETED'
  | 'FAILED';

export interface PawapayDeposit {
  depositId: string;
  status: PawapayDepositStatus;
  amount: string;
  currency: string;
  providerTransactionId?: string;
  failureReason?: { failureCode: string; failureMessage?: string };
}

const BASE = {
  sandbox: 'https://api.sandbox.pawapay.io',
  production: 'https://api.pawapay.io',
};

export class PawapayClient {
  private readonly base: string;

  constructor(
    private readonly token: string,
    sandbox: boolean,
  ) {
    this.base = sandbox ? BASE.sandbox : BASE.production;
  }

  private async call<T>(
    method: 'GET' | 'POST',
    path: string,
    body?: unknown,
  ): Promise<T> {
    let res: Response;
    try {
      res = await fetch(`${this.base}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(20_000),
      });
    } catch {
      throw new BadGatewayException(
        'Could not reach the payment provider. Please try again.',
      );
    }
    const json = (await res.json().catch(() => ({}))) as T & {
      failureReason?: { failureMessage?: string; failureCode?: string };
    };
    if (res.status === 401 || res.status === 403) {
      throw new BadGatewayException(
        'The studio’s payment account is not set up correctly',
      );
    }
    if (res.status === 400) {
      throw new BadRequestException(
        json.failureReason?.failureMessage ??
          'The payment request was rejected',
      );
    }
    if (!res.ok)
      throw new BadGatewayException(
        'The payment provider is unavailable. Please try again.',
      );
    return json;
  }

  /** Which operator a number belongs to, and the number in pawaPay's format. */
  predictProvider(phoneNumber: string) {
    return this.call<{
      country: string;
      provider: string;
      phoneNumber: string;
    }>('POST', '/v2/predict-provider', { phoneNumber });
  }

  initiateDeposit(input: {
    depositId: string;
    phoneNumber: string;
    provider: string;
    amount: string;
    currency: string;
    customerMessage: string;
    clientReferenceId: string;
  }) {
    return this.call<{
      depositId: string;
      status: 'ACCEPTED' | 'REJECTED' | 'DUPLICATE_IGNORED';
      failureReason?: { failureCode: string; failureMessage?: string };
    }>('POST', '/v2/deposits', {
      depositId: input.depositId,
      payer: {
        type: 'MMO',
        accountDetails: {
          phoneNumber: input.phoneNumber,
          provider: input.provider,
        },
      },
      amount: input.amount,
      currency: input.currency,
      customerMessage: input.customerMessage,
      clientReferenceId: input.clientReferenceId,
    });
  }

  async getDeposit(depositId: string): Promise<PawapayDeposit | null> {
    const res = await this.call<{
      status: 'FOUND' | 'NOT_FOUND';
      data?: PawapayDeposit;
    }>('GET', `/v2/deposits/${depositId}`);
    return res.status === 'FOUND' && res.data ? res.data : null;
  }
}

/** pawaPay's customerMessage: 4–22 letters, digits and spaces. */
export function customerMessage(studioName: string): string {
  const cleaned = studioName
    .replace(/[^A-Za-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  const msg = cleaned.slice(0, 22).trim();
  return msg.length >= 4 ? msg : `${msg} Pay`.trim().padEnd(4, 'x');
}
