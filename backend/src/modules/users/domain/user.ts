import { Role } from './role.enum';

export interface User {
  id: string;
  name: string;
  role: Role;
  createdAt: Date;
  updatedAt: Date;
}

/** The minimal identity carried through every use case ("who is acting"). */
export interface Actor {
  id: string;
  name: string;
  role: Role;
}
