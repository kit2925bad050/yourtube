export function useUser(): {
  user: any;
  login: (userdata: any, token?: string) => void;
  logout: () => Promise<void>;
  handlegooglesignin: () => Promise<void>;
  authLoading: boolean;
  authError: string | null;
  googleSigningIn: boolean;
};

export function UserProvider(props: { children: React.ReactNode }): JSX.Element;
