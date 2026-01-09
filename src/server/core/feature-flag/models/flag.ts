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
    }
  | {
      name: "uuid-on-sdk-message";
      enabled: boolean;
    }
  | {
      name: "run-skills-directly";
      enabled: boolean;
    };

export type FlagName = Flag["name"];
