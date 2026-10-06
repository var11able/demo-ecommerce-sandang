import "server-only";
import { hash, verify, type Algorithm } from "@node-rs/argon2";

const argon2id = 2 as Algorithm.Argon2id;

const argon2Options = {
  algorithm: argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
};

let placeholderHash: Promise<string> | undefined;

export function hashPassword(password: string): Promise<string> {
  return hash(password, argon2Options);
}

export async function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  try {
    return await verify(passwordHash, password);
  } catch {
    return false;
  }
}

export async function spendPasswordCheckTime(password: string): Promise<void> {
  placeholderHash ??= hashPassword("placeholder password for missing accounts");
  await verifyPassword(await placeholderHash, password);
}
