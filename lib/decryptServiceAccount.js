import { readFileSync } from "fs";
import path from "path";
import crypto from "crypto";

export function loadDecryptedServiceAccount() {
  const pwd = process.env.SA_ENCRYPTION_PASSWORD;
  if (!pwd) throw new Error("Missing SA_ENCRYPTION_PASSWORD env var");

  const encPath = path.join(process.cwd(), "service-account.enc.json");
  const envJson = JSON.parse(readFileSync(encPath, "utf8"));

  const salt = Buffer.from(envJson.s, "base64");
  const iv = Buffer.from(envJson.iv, "base64");
  const ct = Buffer.from(envJson.ct, "base64");
  const tag = Buffer.from(envJson.tag, "base64");

  const key = crypto.scryptSync(pwd, salt, 32);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);

  const plaintext = Buffer.concat([decipher.update(ct), decipher.final()]);
  return JSON.parse(plaintext.toString("utf8"));
}
