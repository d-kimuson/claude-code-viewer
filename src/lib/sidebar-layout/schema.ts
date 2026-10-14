import { z } from "zod";
const keys = z.array(z.string().max(1024)).max(2000);
export const sidebarLayoutSchema = z.object({
  version: z.literal(1),
  order: keys,
  hidden: keys,
  expanded: keys,
});
export type SidebarLayout = z.infer<typeof sidebarLayoutSchema>;
export const defaultSidebarLayout = (): SidebarLayout => ({
  version: 1,
  order: [],
  hidden: [],
  expanded: [],
});
