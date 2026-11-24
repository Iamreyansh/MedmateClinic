import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import boundaries from "eslint-plugin-boundaries";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", "node_modules", "backend/target", ".next"] },
  {
    files: ["**/*.{ts,tsx}"],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
      boundaries,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],

      // The atomic structure: a feature is a unit. Nothing reaches into a
      // feature except through its index, a feature may not import another
      // feature, and shared code may not import features.
      "boundaries/element-types": [
        "error",
        {
          default: "disallow",
          rules: [
            { from: "app", allow: ["app", "shell", "feature", "shared", "infra", "store"] },
            { from: "shell", allow: ["shell", "app", "feature", "shared", "infra", "store"] },
            { from: "feature", allow: ["feature", "shell", "shared", "infra", "store"] },
            { from: "shared", allow: ["shared", "infra"] },
            { from: "infra", allow: ["infra", "shared"] },
            { from: "store", allow: ["store", "feature", "shared", "infra"] },
          ],
        },
      ],
      "boundaries/entry-point": [
        "error",
        { default: "allow", rules: [{ target: "feature", allow: "index.ts" }] },
      ],
    },
    settings: {
      // the boundary rules follow the imports, so the resolver must understand
      // the "@/" alias as well as the file extensions
      "import/resolver": {
        typescript: { alwaysTryTypes: true, project: "./tsconfig.json" },
      },
      "boundaries/elements": [
        { type: "app", pattern: "src/app/**" },
        { type: "shell", pattern: "src/components/layout/**" },
        { type: "feature", pattern: "src/features/*", mode: "folder", capture: ["feature"] },
        { type: "shared", pattern: "src/components/ui/**" },
        { type: "shared", pattern: "src/{hooks,utils,constants,types,lib,styles,assets,config}/**" },
        { type: "infra", pattern: "src/services/**" },
        { type: "store", pattern: "src/store/**" },
      ],
      "boundaries/include": ["src/**/*"],
    },
  },
);
