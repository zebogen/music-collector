import test from "node:test";
import assert from "node:assert/strict";
import { buildHomeHref, getSelectedCollection, parseId, parsePage, parseTab } from "./index-helpers";

test("parsePage returns positive integers and falls back to 1", () => {
  assert.equal(parsePage("3"), 3);
  assert.equal(parsePage("0"), 1);
  assert.equal(parsePage("-2"), 1);
  assert.equal(parsePage("abc"), 1);
  assert.equal(parsePage(null), 1);
});

test("parseTab only allows supported tabs", () => {
  assert.equal(parseTab("albums"), "albums");
  assert.equal(parseTab("collections"), "collections");
  assert.equal(parseTab("bad"), "albums");
  assert.equal(parseTab(null), "albums");
});

test("parseId returns positive integer ids only", () => {
  assert.equal(parseId("42"), 42);
  assert.equal(parseId("0"), null);
  assert.equal(parseId(null), null);
});

test("buildHomeHref preserves filters and applies overrides", () => {
  const href = buildHomeHref(
    {
      genre: "rock",
      artist: "phoebe",
      tab: "albums",
      artistsPage: 2,
      albumsPage: 3,
      playlistsPage: 4,
      selectedAlbumId: 10,
      selectedCollectionId: 7,
      search: "punisher",
    },
    {
      artists: { page: 2 },
      albums: { page: 3 },
      playlists: { page: 4 },
    },
    {
      tab: "collections",
      selectedAlbumId: null,
      albumsPage: 1,
    }
  );

  assert.equal(
    href,
    "/?genre=rock&artist=phoebe&tab=collections&artistsPage=2&albumsPage=1&playlistsPage=4&collection=7&search=punisher"
  );
});

test("getSelectedCollection returns selected item or first fallback", () => {
  const collections = [
    { id: 1, name: "One", description: null, artists: [], albums: [] },
    { id: 2, name: "Two", description: null, artists: [], albums: [] },
  ];

  assert.equal(getSelectedCollection(collections, 2)?.name, "Two");
  assert.equal(getSelectedCollection(collections, 99)?.name, "One");
  assert.equal(getSelectedCollection([], 1), null);
});
