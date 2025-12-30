import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
import pluginReact from "eslint-plugin-react";

/** @type {import('eslint').Linter.Config[]} */
export default [
	{ files: ["**/*.{js,mjs,cjs,ts,jsx,tsx}"] },
	{ ignores: [".react-router", "bin", "coverage", "data", "dist", "docs", "node_modules"] },
	{ languageOptions: { globals: { ...globals.browser, ...globals.node } } },
	pluginJs.configs.recommended,
	...tseslint.configs.recommended,
	pluginReact.configs.flat.recommended,
	{
		settings: {
			react: {
				version: "detect"
			}
		},
		rules: {
			"react/react-in-jsx-scope": "off"
		}
	}
];
