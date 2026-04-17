import type { Config } from "prettier"

const config = {
  printWidth: 80,
  trailingComma: "es5",
  tabWidth: 2,
  useTabs: false,
  semi: false,
  singleQuote: false,
  plugins: [
    "@trivago/prettier-plugin-sort-imports",
    "prettier-plugin-tailwindcss",
  ],
  tailwindFunctions: ["clsx", "cn", "cva"],
  tailwindAttributes: ["className", "class"],
  importOrder: [
    "^(react/(.*)$)|^(react$)|^(react-native/(.*)$)|^(react-native$)",
    "^(tanstack/(.*)$)|^(tanstack$)",
    "^(next/(.*)$)|^(next$)",
    "^(expo/(.*)$)|^(expo$)",
    "<THIRD_PARTY_MODULES>",
    "^@/components/(.*)$",
    "^@/(.*)$",
    "^~/(.*)$",
    "^(\\.\\./|\\./).+",
  ],
  importOrderSeparation: true,
  importOrderSortSpecifiers: true,
} satisfies Config

export default config
