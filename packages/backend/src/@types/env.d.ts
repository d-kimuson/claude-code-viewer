declare module "process" {
  global {
    namespace NodeJS {
      interface ProcessEnv {
        NODE_ENV?: string;
        DEV_BE_PORT?: string;
        PORT?: string;
      }
    }
  }
}
