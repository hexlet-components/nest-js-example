import { hash, verify } from "argon2";
export const hashPassword = (password: string) => hash(password);
export const verifyPassword = (passwordHash: string, password: string) =>
  verify(passwordHash, password);
export const DUMMY_PASSWORD_HASH =
  "$argon2id$v=19$m=65536,t=3,p=4$GYOuncKHCkfkK74feZNhAw$H/NDQND09HwUbwuThwAAVcBlVmhA2RL9f0uQpdT/5Vg";
