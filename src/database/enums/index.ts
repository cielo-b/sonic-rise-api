// Central barrel — import all enums from here across the codebase.

export enum Role {
  /** Runs the platform itself; not tied to a studio. */
  PLATFORM_ADMIN = 'PLATFORM_ADMIN',
  OWNER = 'OWNER',
  MANAGER = 'MANAGER',
  ENGINEER = 'ENGINEER',
  FRONT_DESK = 'FRONT_DESK',
  CLIENT = 'CLIENT',
}

/** Roles that belong to a studio's team (everyone except clients). */
export const STAFF_ROLES: readonly Role[] = [
  Role.OWNER,
  Role.MANAGER,
  Role.ENGINEER,
  Role.FRONT_DESK,
];

export enum BookingStatus {
  /** Created, waiting for the deposit to be paid. */
  PENDING_DEPOSIT = 'PENDING_DEPOSIT',
  /** Waiting for the studio to confirm. */
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW',
}

export enum BookingSource {
  WEB = 'WEB',
  STAFF = 'STAFF',
}

export enum PricingType {
  /** One price for the whole package. */
  FIXED = 'FIXED',
  /** Price per hour of the booking. */
  HOURLY = 'HOURLY',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
}

export enum PaymentMethod {
  MOBILE_MONEY = 'MOBILE_MONEY',
  CASH = 'CASH',
  BANK_TRANSFER = 'BANK_TRANSFER',
  CARD = 'CARD',
}

export enum PaymentProvider {
  PAWAPAY = 'PAWAPAY',
  /** Recorded by staff (cash, bank transfer, card terminal). */
  MANUAL = 'MANUAL',
}

export enum PaymentPurpose {
  DEPOSIT = 'DEPOSIT',
  BOOKING_BALANCE = 'BOOKING_BALANCE',
  INVOICE = 'INVOICE',
  DELIVERABLE = 'DELIVERABLE',
}

export enum QuoteStatus {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  ACCEPTED = 'ACCEPTED',
  DECLINED = 'DECLINED',
  CONVERTED = 'CONVERTED',
}

export enum InvoiceStatus {
  DRAFT = 'DRAFT',
  ISSUED = 'ISSUED',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  PAID = 'PAID',
  VOID = 'VOID',
}

export enum ProjectStage {
  DEMO = 'DEMO',
  PRE_PRODUCTION = 'PRE_PRODUCTION',
  RECORDING = 'RECORDING',
  EDITING = 'EDITING',
  MIXING = 'MIXING',
  MASTERING = 'MASTERING',
  DELIVERED = 'DELIVERED',
  RELEASED = 'RELEASED',
}

export enum DeliverableStatus {
  IN_REVIEW = 'IN_REVIEW',
  CHANGES_REQUESTED = 'CHANGES_REQUESTED',
  APPROVED = 'APPROVED',
}
