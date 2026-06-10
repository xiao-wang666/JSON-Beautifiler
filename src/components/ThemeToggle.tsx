/**
 * ThemeToggle — an antd Switch that toggles between "light" and "dark" themes.
 *
 * Dispatches `setTheme` to the app reducer. Persistence (themeStore.save) is
 * already handled in App.tsx's useEffect on `state.theme`.
 *
 * Requirements: 6.1, 6.2, 6.3
 */

import { Switch } from "antd";
import { MoonOutlined, SunOutlined } from "@ant-design/icons";
import { useAppContext } from "./appContext";

export function ThemeToggle() {
  const { state, dispatch } = useAppContext();

  return (
    <Switch
      checked={state.theme === "dark"}
      onChange={(checked) =>
        dispatch({ type: "setTheme", theme: checked ? "dark" : "light" })
      }
      checkedChildren={<MoonOutlined />}
      unCheckedChildren={<SunOutlined />}
      aria-label="切换主题"
    />
  );
}
