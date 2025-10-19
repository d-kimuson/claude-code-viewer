import { setI18n } from "@lingui/react/server";
import { getUserConfigOnServerComponent } from "../../server/lib/config/getUserConfigOnServerComponent";
import { getI18nInstance } from ".";

export const initializeI18n = async () => {
  const userConfig = await getUserConfigOnServerComponent();
  const i18n = getI18nInstance(userConfig.locale);
  setI18n(i18n);
};
