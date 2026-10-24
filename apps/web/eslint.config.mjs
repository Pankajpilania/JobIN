import nextVitals from "eslint-config-next/core-web-vitals";

export default [
  ...nextVitals,
  {
    rules: {
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrors: "none",
        },
      ],
      "no-undef": "off",
      "no-empty": ["warn", { allowEmptyCatch: true }],
      "no-console": "off",
      "react/react-in-jsx-scope": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/purity": "off",
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "Property[key.name=/^(leadingRelaxed|leadingNone|leadingTight|leadingSnug|leadingNormal|leadingLoose|trackingTight|trackingWide|trackingWidest|justifyText|fontMedium|fontBold|fontSemibold|textSm|textBase|textLg|textXl|roundedFull|roundedLg|truncate)$/]",
          message:
            "Do not use Tailwind class names as inline style properties. Use valid CSS property names instead.",
        },
      ],
    },
  },
  {
    ignores: ["**/node_modules/**", "**/dist/**", "**/.next/**", "**/coverage/**"],
  },
];
