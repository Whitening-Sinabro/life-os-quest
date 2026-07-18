// Layer 1 — stylelint (CSS). Hand-CSS gradient/glow/blur/raw-color bans (value-based [adv f1]).
// JSX className arbitrary values are NOT visible here → Layer 2 (eslint) covers those.
// Token file holds the raw values → exempted via overrides.

// Color-bearing props listed individually so the palette ban is VALUE-based, not just hex-syntax [adv f1].
const COLOR_PROPS = [
  "color", "background-color", "border-color", "border-top-color", "border-right-color",
  "border-bottom-color", "border-left-color", "outline-color", "fill", "stroke",
  "caret-color", "text-decoration-color", "box-shadow", "--tw-ring-color"
];

// Raw color VALUES: hex (all lengths) + functional notations. Forces var(--color-*) / transparent / currentColor.
const RAW_COLOR = [
  "/#[0-9a-fA-F]{3,8}/",
  "/\\b(rgb|rgba|hsl|hsla|hwb|oklch|oklab|lab|lch|color)\\(/"
];

// glow = `0 0 <non-zero-blur>` — allows solid rings like `0 0 0 4px` / `inset 0 0 0 1px` [adv f13].
const GLOW = "/(^|,)\\s*(?:inset\\s+)?0\\s+0\\s+(?!0)[.0-9]/";

// Build color-prop value bans, then merge box-shadow so it keeps BOTH the glow ban AND the raw-color ban
// (a plain spread would let the COLOR_PROPS entry clobber the explicit glow rule — spec config ordering bug).
const colorPropRules = Object.fromEntries(COLOR_PROPS.map((p) => [p, [...RAW_COLOR]]));
colorPropRules["box-shadow"] = [GLOW, ...RAW_COLOR];

export default {
  extends: ["stylelint-config-standard", "@dreamsicle.io/stylelint-config-tailwindcss"],
  rules: {
    "declaration-property-value-disallowed-list": {
      "/^background/": ["/(linear|radial|conic)-gradient\\(/"],
      "filter": ["/blur\\(/"], // content blur; backdrop-filter intentionally NOT listed (allowed)
      ...colorPropRules
    },
    "color-no-hex": true, // syntax backstop; RAW_COLOR + color-named cover the rest
    "color-named": "never"
  },
  overrides: [
    // tokens hold the raw values; exempt the token file from hex/value bans + dense-block formatting nags
    {
      files: ["**/design-tokens.css"],
      rules: {
        "color-no-hex": null,
        "color-named": null,
        "declaration-property-value-disallowed-list": null,
        "custom-property-empty-line-before": null,
        "declaration-empty-line-before": null
      }
    }
  ],
  ignoreFiles: ["node_modules/**", "dist/**", "build/**", "src/styles.css"] // legacy grandfathered
};
