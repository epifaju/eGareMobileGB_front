export type LoginRequest = {
  phoneNumber: string;
  password: string;
};

export type RegisterRequest = {
  phoneNumber: string;
  password: string;
  otp: string;
  /** Si true : inscription en tant que conducteur (refusé si le serveur a désactivé cette option). */
  registerAsDriver?: boolean;
};

export type OtpRequest = {
  phoneNumber: string;
};

export type TokenResponse = {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresInSeconds: number;
};

export type RefreshRequest = {
  refreshToken: string;
};

export type OtpResponse = {
  message: string;
  expiresInSeconds: number;
  debugOtp: string | null;
};

export type ApiErrorBody = {
  code: string;
  message: string;
  fieldErrors?: Record<string, string>;
};
