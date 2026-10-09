import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import axiosInstance from "./axiosinstance";
import { runThemeAudit } from "./themeAudit";
import { useUser } from "./AuthContext";

type Theme = "light" | "dark";

const ThemeContext = createContext<{ theme: Theme; otpMethod: string | null }>({
  theme: "light",
  otpMethod: null,
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { user } = useUser();
  const [theme, setTheme] = useState<Theme>("light");
  const [otpMethod, setOtpMethod] = useState<string | null>(null);

  useEffect(() => {
    const applyTheme = async () => {
      try {
        const url = user?._id
          ? `/user/location/${user._id}`
          : "/user/location";
        const res = await axiosInstance.get(url);
        setTheme(res.data.theme === "dark" ? "dark" : "light");
        setOtpMethod(res.data.otpMethod);
      } catch {
        setTheme("light");
      }
    };
    applyTheme();
  }, [user?._id]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    if (process.env.NODE_ENV === "development") {
      runThemeAudit();
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, otpMethod }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useThemeEngine = () => useContext(ThemeContext);
