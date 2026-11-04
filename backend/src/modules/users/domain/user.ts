import { Role } from './role.enum';

export interface User {
  id: string;
  name: string;
  role: Role;
  createdAt: Date;
  updatedAt: Date;
}

/** The identity carried through every use case ("who is acting"). */
export interface Actor {
  id: string;
  name: string;
  role: Role;
}

/** Compact user reference embedded in work order / sparepart responses. */
export type UserSummary = Actor;
