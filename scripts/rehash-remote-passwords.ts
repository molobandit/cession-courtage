/**
 * Regenere les empreintes de mot de passe de la base distante au format PBKDF2.
 * A executer une seule fois, apres le passage de bcrypt a Web Crypto.
 * Emet du SQL sur la sortie standard : aucun acces reseau depuis ce script.
 */
import { readFileSync } from "node:fs";
import { hashPassword } from "../lib/auth/password";

const SEED_PASSWORD = process.env.SEED_PASSWORD;
if (!SEED_PASSWORD) {
  console.error("SEED_PASSWORD manquant. Un mot de passe ne s'ecrit pas dans un depot public.");
  process.exit(1);
}
const DEMO_PASSWORD: string = SEED_PASSWORD;

const listPath = process.argv[2];
if (!listPath) {
  console.error("Usage: tsx scripts/rehash-remote-passwords.ts <fichier-emails>");
  process.exit(1);
}
const EMAILS = readFileSync(listPath, "utf8")
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter(Boolean);

async function main(): Promise<void> {
  const statements = await Promise.all(
    EMAILS.map(async (email) => {
      const hash = await hashPassword(DEMO_PASSWORD);
      const safeEmail = email.replace(/'/g, "''");
      return `UPDATE User SET passwordHash = '${hash}' WHERE email = '${safeEmail}';`;
    }),
  );
  console.log(statements.join("\n"));
}

void main();
