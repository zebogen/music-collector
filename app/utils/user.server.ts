import { db } from "~/utils/db.server";
import type { DbUser } from "~/types";

function mapUser(row: any): DbUser {
  return {
    id: row.id,
    spotifyUserId: row.spotify_user_id,
    displayName: row.display_name,
    accessToken: row.access_token,
    refreshToken: row.refresh_token,
    tokenExpiresAt: new Date(row.token_expires_at)
  };
}

export async function upsertSpotifyUser(input: {
  spotifyUserId: string;
  displayName: string | null;
  accessToken: string;
  refreshToken: string;
  tokenExpiresAt: Date;
}) {
  const result = await db.query(
    `
      INSERT INTO users (spotify_user_id, display_name, access_token, refresh_token, token_expires_at)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (spotify_user_id)
      DO UPDATE SET
        display_name = EXCLUDED.display_name,
        access_token = EXCLUDED.access_token,
        refresh_token = EXCLUDED.refresh_token,
        token_expires_at = EXCLUDED.token_expires_at,
        updated_at = NOW()
      RETURNING *
    `,
    [
      input.spotifyUserId,
      input.displayName,
      input.accessToken,
      input.refreshToken,
      input.tokenExpiresAt.toISOString()
    ]
  );

  return mapUser(result.rows[0]);
}

export async function getUserById(userId: number) {
  const result = await db.query("SELECT * FROM users WHERE id = $1", [userId]);
  return result.rowCount ? mapUser(result.rows[0]) : null;
}

export async function getUserBySpotifyUserId(spotifyUserId: string) {
  const result = await db.query("SELECT * FROM users WHERE spotify_user_id = $1", [spotifyUserId]);
  return result.rowCount ? mapUser(result.rows[0]) : null;
}

export async function listUsers() {
  const result = await db.query("SELECT * FROM users ORDER BY updated_at DESC, id DESC");
  return result.rows.map(mapUser);
}

export async function getUserIdByAuth0Sub(auth0Sub: string) {
  const result = await db.query("SELECT user_id FROM auth_identities WHERE auth0_sub = $1", [auth0Sub]);
  return result.rowCount ? (result.rows[0].user_id as number) : null;
}

export async function linkAuth0Identity(auth0Sub: string, userId: number) {
  await db.query(
    `
      INSERT INTO auth_identities (auth0_sub, user_id)
      VALUES ($1, $2)
      ON CONFLICT (auth0_sub)
      DO UPDATE SET user_id = EXCLUDED.user_id
    `,
    [auth0Sub, userId]
  );
}

export async function updateUserTokens(userId: number, input: { accessToken: string; refreshToken: string; tokenExpiresAt: Date }) {
  await db.query(
    `
      UPDATE users
      SET access_token = $2,
          refresh_token = $3,
          token_expires_at = $4,
          updated_at = NOW()
      WHERE id = $1
    `,
    [userId, input.accessToken, input.refreshToken, input.tokenExpiresAt.toISOString()]
  );
}
