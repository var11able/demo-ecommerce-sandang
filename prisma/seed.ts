import { seedDemoData } from "@/server/seed";

const result = await seedDemoData();
console.log("Seeded the catalogue.");
console.log(
  result.admin === "skipped"
    ? "No Admin created: set ADMIN_EMAIL and ADMIN_PASSWORD in .env and run the seed again."
    : `Admin account ${result.admin}.`,
);
if (result.demoAccounts > 0) {
  console.log(`Created or refreshed ${result.demoAccounts} demo accounts.`);
}
