import nextPlugin from "eslint-config-next";

const eslintConfig = [
  ...nextPlugin,
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "supabase/.temp/**",
      ".dev-emails/**",
    ],
  },
  {
    rules: {
      "react/no-danger": "error",
    },
  },
  {
    // Development fixtures, the demo seed source and operator scripts must
    // never be bundled into the app (docs/architecture.md).
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: ["@scripts/*", "**/scripts/**"], message: "Operator scripts must not be imported by the app." },
            { group: ["**/supabase/fixtures/**", "**/supabase/demo/**"], message: "Seed data must not be bundled into the app." },
            { group: ["@tests/*", "**/tests/**"], message: "Test helpers must not be imported by the app." },
          ],
        },
      ],
    },
  },
];

export default eslintConfig;
