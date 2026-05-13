import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// All in-app URLs must carry the /apps/<slug> prefix when the app runs inside
// the Teambridge proxy. The wrappers in lib/teambridge handle this — these
// rules block raw fetch / useRouter / Link / redirect from sneaking past.
const tbProxyRules = {
  "no-restricted-syntax": [
    "error",
    {
      selector: "CallExpression[callee.type='Identifier'][callee.name='fetch']",
      message:
        "Use tbFetch from '@/lib/teambridge' instead of bare fetch — it prepends the /apps/<slug> proxy prefix.",
    },
  ],
  "no-restricted-imports": [
    "error",
    {
      paths: [
        {
          name: "next/link",
          message:
            "Use TBLink from '@/lib/teambridge' instead of next/link — it prepends the /apps/<slug> proxy prefix.",
        },
        {
          name: "next/navigation",
          importNames: ["useRouter", "redirect"],
          message:
            "Use useTBRouter / tbRedirect from '@/lib/teambridge' — they prepend the /apps/<slug> proxy prefix.",
        },
      ],
    },
  ],
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    rules: tbProxyRules,
  },
  {
    // The wrappers themselves call the originals, and lib/teambridge/client
    // talks to external Teambridge URLs with raw fetch. Both are intentional.
    files: ["lib/teambridge/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": "off",
      "no-restricted-imports": "off",
    },
  },
]);

export default eslintConfig;
