declare module "process" {
  global {
    namespace NodeJS {
      // oxlint-disable-next-line typescript/consistent-type-definitions -- interface required for global declaration merging
      interface ProcessEnv {
        DEV_BE_PORT?: string;
        PORT?: string;
      }
    }
  }
}
