export { Studio } from './studio.entity';
export type {
  StudioContent,
  StudioStat,
  StudioTestimonial,
  StudioFaq,
  StudioSocials,
  OpeningHours,
  OpeningWindow,
} from './studio.entity';
export { User } from './user.entity';
export { Room } from './room.entity';
export { Equipment } from './equipment.entity';
export { ServicePackage } from './service-package.entity';
export { Booking } from './booking.entity';
export { Payment } from './payment.entity';
export { Quote } from './quote.entity';
export type { LineItem } from './quote.entity';
export { Invoice } from './invoice.entity';
export { Project } from './project.entity';
export { SessionNote } from './session-note.entity';
export {
  Deliverable,
  DeliverableVersion,
  DeliverableComment,
} from './deliverable.entity';
export { Inquiry, Subscriber } from './inquiry.entity';
export { Portfolio } from './portfolio.entity';
export { Media } from './media.entity';
export { LoginLog } from './login-log.entity';
export { UserSession } from './user-session.entity';
export { Post } from '../../posts/post.entity';
export { Contract } from './contract.entity';
export type { SplitContributor } from './contract.entity';

import { Studio } from './studio.entity';
import { User } from './user.entity';
import { Room } from './room.entity';
import { Equipment } from './equipment.entity';
import { ServicePackage } from './service-package.entity';
import { Booking } from './booking.entity';
import { Payment } from './payment.entity';
import { Quote } from './quote.entity';
import { Invoice } from './invoice.entity';
import { Project } from './project.entity';
import { SessionNote } from './session-note.entity';
import {
  Deliverable,
  DeliverableVersion,
  DeliverableComment,
} from './deliverable.entity';
import { Inquiry, Subscriber } from './inquiry.entity';
import { Portfolio } from './portfolio.entity';
import { Media } from './media.entity';
import { LoginLog } from './login-log.entity';
import { UserSession } from './user-session.entity';
import { Post } from '../../posts/post.entity';
import { Contract } from './contract.entity';

/** Every entity, for TypeORM registration (app module, CLI data source). */
export const ALL_ENTITIES = [
  Studio,
  User,
  Room,
  Equipment,
  ServicePackage,
  Booking,
  Payment,
  Quote,
  Invoice,
  Project,
  SessionNote,
  Deliverable,
  DeliverableVersion,
  DeliverableComment,
  Inquiry,
  Subscriber,
  Portfolio,
  Media,
  LoginLog,
  UserSession,
  Post,
  Contract,
];
