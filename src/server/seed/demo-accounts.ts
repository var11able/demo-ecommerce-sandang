import "server-only";

export type DemoLogin = {
  role: "customer" | "demo_admin";
  email: string;
  password: string;
  name: string;
};

export const demoLogins: DemoLogin[] = [
  {
    role: "customer",
    email: "customer@demo.sandang.test",
    password: "sandang-demo-customer",
    name: "Dewi Demo",
  },
  {
    role: "demo_admin",
    email: "admin@demo.sandang.test",
    password: "sandang-demo-admin",
    name: "Demo Admin",
  },
];
