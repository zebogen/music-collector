function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

export const env = {
  DATABASE_URL: requiredEnv("DATABASE_URL"),
  DATABASE_URL_UNPOOLED: process.env.DATABASE_URL_UNPOOLED,
  SESSION_SECRET: requiredEnv("SESSION_SECRET"),
  AUTH0_DOMAIN: requiredEnv("AUTH0_DOMAIN"),
  AUTH0_CLIENT_ID: requiredEnv("AUTH0_CLIENT_ID"),
  AUTH0_CLIENT_SECRET: requiredEnv("AUTH0_CLIENT_SECRET"),
  AUTH0_REDIRECT_URI: requiredEnv("AUTH0_REDIRECT_URI"),
  AUTH0_LOGOUT_RETURN_TO: requiredEnv("AUTH0_LOGOUT_RETURN_TO"),
  SPOTIFY_CLIENT_ID: requiredEnv("SPOTIFY_CLIENT_ID"),
  SPOTIFY_CLIENT_SECRET: requiredEnv("SPOTIFY_CLIENT_SECRET"),
  SPOTIFY_REDIRECT_URI: requiredEnv("SPOTIFY_REDIRECT_URI"),
  BASIC_AUTH_USERNAME: process.env.BASIC_AUTH_USERNAME,
  BASIC_AUTH_PASSWORD: process.env.BASIC_AUTH_PASSWORD,
  NODE_ENV: process.env.NODE_ENV
};
