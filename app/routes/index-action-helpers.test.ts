import test from "node:test";
import assert from "node:assert/strict";
import { getOptionalDescription, getPositiveNumber, getRedirectTo, getRequiredName } from "./index-action-helpers";

test("getRedirectTo falls back when missing", () => {
  const formData = new FormData();
  assert.equal(getRedirectTo(formData), "/");

  formData.set("redirectTo", "/?tab=collections");
  assert.equal(getRedirectTo(formData), "/?tab=collections");
});

test("getRequiredName trims whitespace", () => {
  const formData = new FormData();
  formData.set("name", "  Late Night  ");
  assert.equal(getRequiredName(formData), "Late Night");
});

test("getOptionalDescription returns trimmed string", () => {
  const formData = new FormData();
  formData.set("description", "  for headphones ");
  assert.equal(getOptionalDescription(formData), "for headphones");
  assert.equal(getOptionalDescription(new FormData()), "");
});

test("getPositiveNumber only accepts positive integers", () => {
  const formData = new FormData();
  formData.set("collectionId", "12");
  assert.equal(getPositiveNumber(formData, "collectionId"), 12);

  formData.set("collectionId", "0");
  assert.equal(getPositiveNumber(formData, "collectionId"), null);

  formData.set("collectionId", "abc");
  assert.equal(getPositiveNumber(formData, "collectionId"), null);
});
