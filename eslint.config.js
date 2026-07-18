// Layer 2 — eslint (JSX className). Stylelint can't see className strings → this layer is mandatory [adv f9].
// Bans arbitrary COLOR/gradient values in className (bg-[#fff], text-[oklch(...)], bg-[linear-gradient(...)]).
// Color/gradient-context-anchored so layout arbitraries (max-w-[96rem]) and arbitrary variants
// (max-[480px]:hidden, data-[state=open]:) are NOT blocked — SP2 mobile-first needs those [adv f4].
import betterTailwind from "eslint-plugin-better-tailwindcss";

// Prefix `(?:(?:word[brackets]|word):)*` consumes BOTH plain variants (hover:, md:) AND bracketed
// arbitrary variants (max-[480px]:, data-[state=open]:, group-[...]:) so a color gated behind a
// responsive/state arbitrary variant is still caught (SP2 mobile-first relies on these) [adv f4].
const COLOR_ARBITRARY =
  "^(?:(?:[\\w-]+\\[[^\\]]*\\]|[\\w-]+):)*(?:bg|text|border|from|via|to|fill|stroke|ring|shadow|caret|decoration|divide|outline|accent)-\\[(?:#|rgb|rgba|hsl|hsla|hwb|oklch|oklab|lab|lch|color\\(|linear-gradient|radial-gradient|conic-gradient|image:)";

export default [
  {
    files: ["src/**/*.{js,jsx}"],
    // legacy grandfathered (그대로) — enforce only on new/edited files [adv f5]
    ignores: ["src/App.jsx", "src/Auth.jsx", "src/Onboarding.jsx", "src/main.jsx"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: { ecmaFeatures: { jsx: true } }
    },
    plugins: { "better-tailwindcss": betterTailwind },
    settings: {
      "better-tailwindcss": { entryPoint: "src/styles.css" }
    },
    rules: {
      // start at "warn"; validate against a corpus incl. arbitrary variants before promoting to "error" [adv f4]
      "better-tailwindcss/no-restricted-classes": ["warn", {
        restrict: [
          {
            pattern: COLOR_ARBITRARY,
            message: "arbitrary color/gradient value 금지 — design-tokens.css의 var(--color-*)/토큰 유틸 사용 [adv f4]"
          }
        ]
      }]
    }
  }
];
