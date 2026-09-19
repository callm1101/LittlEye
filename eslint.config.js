import tseslint from "@typescript-eslint/eslint-plugin";
import parser from "@typescript-eslint/parser";

export default [{ ignores: ["dist/**", "src-tauri/target/**", "src-tauri/gen/**"] }, {
  files: ["src/**/*.{ts,tsx}"],
  languageOptions: { parser, parserOptions: { ecmaVersion: "latest", sourceType: "module" } },
  plugins: { "@typescript-eslint": tseslint },
  rules: { ...tseslint.configs.recommended.rules }
}];
