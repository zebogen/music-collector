function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

export const env = {
  DATABASE_URL: requiredEnv("DATABASE_URL"),
  SESSION_SECRET: requiredEnv("SESSION_SECRET"),
  SPOTIFY_CLIENT_ID: requiredEnv("SPOTIFY_CLIENT_ID"),
  SPOTIFY_CLIENT_SECRET: requiredEnv("SPOTIFY_CLIENT_SECRET"),
  SPOTIFY_REDIRECT_URI: requiredEnv("SPOTIFY_REDIRECT_URI"),
  BASIC_AUTH_USERNAME: process.env.BASIC_AUTH_USERNAME,
  BASIC_AUTH_PASSWORD: process.env.BASIC_AUTH_PASSWORD,
  NODE_ENV: process.env.NODE_ENV
};
