// ============================================================
// Solid Roots — Shared Tailwind CSS Configuration
// Imported by each HTML page via a <script> tag AFTER
// the Tailwind CDN script.
// ============================================================

tailwind.config = {
    darkMode: "class",
    theme: {
        extend: {
            colors: {
                "secondary-fixed": "#d1e4ff",
                "surface-container": "#f0eded",
                "surface-container-low": "#f6f3f2",
                "surface-bright": "#fcf9f8",
                "on-secondary-container": "#4d637d",
                "on-tertiary": "#ffffff",
                "on-primary-fixed": "#101b30",
                "outline-variant": "#c4c6cc",
                "on-tertiary-fixed-variant": "#5d4201",
                "background": "#fcf9f8",
                "tertiary": "#000000",
                "secondary-fixed-dim": "#b2c8e7",
                "on-primary": "#ffffff",
                "surface": "#fcf9f8",
                "surface-container-high": "#eae7e7",
                "primary-fixed": "#d7e2ff",
                "surface-dim": "#dcd9d9",
                "secondary": "#4a607a",
                "on-primary-fixed-variant": "#3c475d",
                "tertiary-fixed": "#ffdea5",
                "on-secondary-fixed-variant": "#334861",
                "error-container": "#ffdad6",
                "on-tertiary-fixed": "#261900",
                "on-background": "#1b1b1b",
                "inverse-primary": "#bbc6e2",
                "on-surface-variant": "#44474c",
                "error": "#ba1a1a",
                "on-surface": "#1b1b1b",
                "on-error-container": "#93000a",
                "tertiary-fixed-dim": "#e9c176",
                "tertiary-container": "#261900",
                "secondary-container": "#c8dffe",
                "on-tertiary-container": "#a17f3b",
                "primary": "#000000",
                "primary-container": "#101b30",
                "on-primary-container": "#79849d",
                "on-error": "#ffffff",
                "surface-tint": "#545e76",
                "outline": "#74777d",
                "primary-fixed-dim": "#bbc6e2",
                "surface-container-lowest": "#ffffff",
                "surface-container-highest": "#e5e2e1",
                "on-secondary": "#ffffff",
                "inverse-surface": "#313030",
                "on-secondary-fixed": "#031d34",
                "surface-variant": "#e5e2e1",
                "inverse-on-surface": "#f3f0ef"
            },
            borderRadius: {
                DEFAULT: "0.125rem",
                lg: "0.25rem",
                xl: "0.5rem",
                full: "0.75rem"
            },
            fontFamily: {
                headline: ["Manrope"],
                body: ["Work Sans"],
                label: ["Work Sans"]
            }
        }
    }
};
