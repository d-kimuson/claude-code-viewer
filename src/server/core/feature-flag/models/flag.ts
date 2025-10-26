export type Flag =
  | {
      name: "tool-approval";
      enabled: boolean;
    }
  | {
      name: "agent-sdk";
      enabled: boolean;
    };

export type FlagName = Flag["name"];
