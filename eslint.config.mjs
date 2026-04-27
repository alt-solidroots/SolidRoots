import js from "@eslint/js";
import globals from "globals";

export default [
    js.configs.recommended,
    {
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: "module",
            globals: {
                ...globals.browser,
                ...globals.node,
                tailwind: "readonly",
            },
        },
        rules: {
            "no-unused-vars": "warn",
            "no-console": "off",
            "no-undef": "error",
        },
    },
    {
        // Multi-file browser bundle — each file is a plain <script>, not an ES module.
        // Cross-file symbols are declared via /* global */ comments inside each file.
        // Functions called from inline HTML onclick="..." look unused to ESLint — disable that rule.
        files: ["public/js/**/*.js"],
        languageOptions: {
            sourceType: "script",
            globals: {
                ...globals.browser,
                tailwind: "readonly",
            },
        },
        rules: {
            "no-unused-vars": "off",
        },
    },
];
