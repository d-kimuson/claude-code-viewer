import { cookies } from "next/headers";
import { parseUserConfig } from "./parseUserConfig";

export const getUserConfigOnServerComponent = async () => {
  const cookie = await cookies();
  const userConfigJson = cookie.get("ccv-config")?.value;
  return parseUserConfig(userConfigJson);
};
