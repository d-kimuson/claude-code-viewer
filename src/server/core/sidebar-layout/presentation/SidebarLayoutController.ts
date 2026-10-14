import { SidebarLayoutRepository } from "../infrastructure/SidebarLayoutRepository";
export const SidebarLayoutController = (baseDir: string) => {
  const repository = SidebarLayoutRepository(baseDir);
  return { read: repository.read, write: repository.write };
};
