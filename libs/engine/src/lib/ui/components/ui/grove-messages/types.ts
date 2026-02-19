export interface GroveMessage {
  id: string;
  title: string;
  body: string;
  message_type: "info" | "warning" | "celebration" | "update";
  pinned: boolean;
  created_at: string;
}

export type GroveMessageType = GroveMessage["message_type"];

export type GroveMessageChannel =
  | "landing"
  | "arbor"
  | "plant"
  | "meadow"
  | "clearing";
