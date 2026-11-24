export type Resource =
  | "kiosk"
  | "nurse"
  | "console"
  | "inbox"
  | "desk"
  | "billing"
  | "lab"
  | "tele"
  | "appointment"
  | "report"
  | "patient"
  | "template"
  | "doctor"
  | "staff"
  | "message"
  | "location"
  | "subscription"
  | "settings";

export type Level = "view" | "use";

export type Session = {
  clinic: {
    id: string;
    name: string;
    initials: string;
    locations: number;
    doctors: number;
  };
  user: {
    id: string;
    name: string;
    initials: string;
    detail: string;
    tone: "doctor";
  };
  location: string;
  /** What the signed-in person may open, and how far. */
  capabilities: Partial<Record<Resource, Level>>;
  /** How many people are waiting on each station. */
  navCounts: Record<string, number>;
};
