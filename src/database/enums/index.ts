// Central barrel — import all enums from here across the codebase.

export enum Role {
  SUPERADMIN = 'SUPERADMIN',
  CLIENT = 'CLIENT',
}

export enum ServiceType {
  AUDIO = 'AUDIO',
  VIDEO = 'VIDEO',
  PODCAST = 'PODCAST',
  LIVESTREAM = 'LIVESTREAM',
}

export enum BookingStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
}

export enum PaymentMethod {
  CARD = 'CARD',
  MOBILE_MONEY = 'MOBILE_MONEY',
}
