import { apiGet, apiPut } from "@/services/api";

/**
 * Who is signed in.
 *
 * The account is the person, not the clinic: their name, how they are
 * reached, and what they sign with.
 */
export type Account = {
  id: string;
  name: string;
  initials: string;
  mobile: string;
  email: string;
  speciality: string;
  registration: string;
  room: string;
  /** The role they hold. */
  role: string;
  /** Whether they have set a PIN for this screen. */
  pinSet: boolean;
};

export type AccountPayload = {
  items: Account[];
  meta: { total: number };
};

/** What the person is changing about themselves. */
export type AccountDraft = {
  name: string;
  email: string;
  speciality: string;
  registration: string;
};

export const fetchAccount = () => apiGet<AccountPayload>("/clinic/admin/account");

export const saveAccount = (account: AccountDraft) =>
  apiPut<AccountPayload>("/clinic/admin/account", account);
