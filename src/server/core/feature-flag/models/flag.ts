export type Flag =
  | {
      name: "tool-approval";
      enabled: boolean;
    }
  | {
      name: "agent-sdk";
      enabled: boolean;
    }
  | {
      name: "sidechain-separation";
      enabled: boolean;
    };

export type FlagName = Flag["name"];
