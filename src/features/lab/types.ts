/**
 * The lab, as the API sends it.
 *
 * A doctor signs a prescription with tests, and the samples appear here for
 * the technician: to collect, in the lab, sent out, and reported.
 */

/** Where a sample is in its journey. */
export type LabStatus = "ordered" | "to_collect" | "in_lab" | "sent_out" | "reported";

export type LabPatient = {
  id: string;
  name: string;
  age: number;
  sex: string;
  initials?: string;
  phone?: string;
};

export type LabDoctor = {
  id: string;
  name: string;
  speciality: string;
};

export type LabOrder = {
  id: string;
  visitId: string;
  patient: LabPatient;
  /** The test that was ordered. */
  test: string;
  status: LabStatus;
  /** The number printed on the sample tube. */
  sampleNo: string | null;
  /** The partner lab, when the sample went out. */
  partner: string | null;
  /** The doctor who ordered the test. */
  orderedBy: LabDoctor | null;
  /** When the sample was collected. */
  collectedAt: string | null;
  /** When the result came back. */
  reportedAt: string | null;
  /** The result, as the lab reports it. */
  value: string | null;
  /** The range the value is read against. */
  reference: string | null;
  /** Whether the value fell outside the range. */
  abnormal: boolean;
  /** Whether the value was critical. */
  critical: boolean;
  /** The note that goes back to the doctor. */
  note: string | null;
};

export type LabCounts = {
  /** Waiting for the sample to be collected. */
  toCollect: number;
  /** On the bench, being processed. */
  inLab: number;
  /** Sent to a partner lab. */
  sentOut: number;
  /** Reported today. */
  reportedToday: number;
  /** How many of today's reports were abnormal. */
  abnormalToday: number;
};

export type LabPayload = {
  counts: LabCounts;
  /** The work on the bench. */
  open: LabOrder[];
  /** What has been reported. */
  reported: LabOrder[];
  /** The partner labs the clinic sends samples to. */
  partners: string[];
  meta: string;
};

/** What the technician types into the result. */
export type LabResultPayload = {
  orderId: string;
  value: string;
  reference: string;
  abnormal: boolean;
  critical: boolean;
  note: string;
};

/** What the API answers with when a result is saved. */
export type LabResultResponse = {
  orderId: string;
  test: string;
  patient: string;
  value: string;
  reference: string;
  abnormal: boolean;
  critical: boolean;
  reportedAt: string;
};
