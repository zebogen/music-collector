const theme = {
  globalCss: {
    html: {
      colorScheme: "light dark",
    },
    body: {
      bg: "app.bg",
      color: "app.text",
      fontFamily: '"Avenir Next", "Segoe UI", "Helvetica Neue", sans-serif',
      backgroundImage: {
        base:
          "radial-gradient(circle at top left, rgba(111, 211, 188, 0.18), transparent 30%), radial-gradient(circle at top right, rgba(245, 158, 11, 0.16), transparent 24%), linear-gradient(180deg, var(--chakra-colors-app-bg) 0%, var(--chakra-colors-app-bg-subtle) 100%)",
        _osDark:
          "radial-gradient(circle at top left, rgba(20, 184, 166, 0.18), transparent 28%), radial-gradient(circle at top right, rgba(249, 115, 22, 0.18), transparent 22%), linear-gradient(180deg, var(--chakra-colors-app-bg) 0%, var(--chakra-colors-app-bg-subtle) 100%)",
      },
    },
    "*": {
      boxSizing: "border-box",
    },
    "::selection": {
      bg: "app.accentSoft",
      color: "app.text",
    },
  },
  theme: {
    tokens: {
      colors: {
        brand: {
          50: { value: "#eefcf8" },
          100: { value: "#d0f5ea" },
          200: { value: "#a8ead8" },
          300: { value: "#75d9c0" },
          400: { value: "#43c1a2" },
          500: { value: "#21917a" },
          600: { value: "#166b5b" },
          700: { value: "#0f5146" },
          800: { value: "#0d4038" },
          900: { value: "#0b342f" },
        },
        sand: {
          50: { value: "#fcfaf4" },
          100: { value: "#f5efdf" },
          200: { value: "#eadfbf" },
          300: { value: "#ddc891" },
          400: { value: "#cfa75f" },
          500: { value: "#b9832a" },
          600: { value: "#94631f" },
          700: { value: "#724a1a" },
          800: { value: "#5b3a18" },
          900: { value: "#4b3116" },
        },
        ink: {
          50: { value: "#f4f7fb" },
          100: { value: "#e8edf5" },
          200: { value: "#c8d4e4" },
          300: { value: "#a2b6d0" },
          400: { value: "#7894bb" },
          500: { value: "#55749e" },
          600: { value: "#3f587d" },
          700: { value: "#31445f" },
          800: { value: "#26364b" },
          900: { value: "#1b2638" },
          950: { value: "#101724" },
        },
      },
    },
    semanticTokens: {
      colors: {
        app: {
          bg: {
            value: { base: "{colors.sand.50}", _osDark: "{colors.ink.950}" },
          },
          bgSubtle: {
            value: { base: "#f4f6ef", _osDark: "#172233" },
          },
          panel: {
            value: { base: "rgba(255,255,255,0.84)", _osDark: "rgba(16,23,36,0.78)" },
          },
          panelSolid: {
            value: { base: "#fffdf8", _osDark: "#162132" },
          },
          card: {
            value: { base: "#fffaf0", _osDark: "#1b283d" },
          },
          cardAlt: {
            value: { base: "#f4efe2", _osDark: "#22324a" },
          },
          border: {
            value: { base: "rgba(84, 95, 114, 0.12)", _osDark: "rgba(185, 204, 230, 0.14)" },
          },
          text: {
            value: { base: "{colors.ink.900}", _osDark: "#eef4ff" },
          },
          muted: {
            value: { base: "{colors.ink.600}", _osDark: "#a9bad2" },
          },
          accent: {
            value: { base: "{colors.brand.500}", _osDark: "#56d0b2" },
          },
          accentSoft: {
            value: { base: "{colors.brand.100}", _osDark: "rgba(86, 208, 178, 0.18)" },
          },
          accentContrast: {
            value: { base: "white", _osDark: "{colors.ink.950}" },
          },
          overlay: {
            value: { base: "rgba(255,255,255,0.65)", _osDark: "rgba(9,14,24,0.6)" },
          },
          success: {
            value: { base: "#146c58", _osDark: "#63e6be" },
          },
          danger: {
            value: { base: "#b93838", _osDark: "#ff8a8a" },
          },
        },
      },
      shadows: {
        xs: {
          value: {
            base: "0 8px 24px rgba(32, 39, 55, 0.06)",
            _osDark: "0 12px 32px rgba(0, 0, 0, 0.24)",
          },
        },
        md: {
          value: {
            base: "0 18px 48px rgba(32, 39, 55, 0.12)",
            _osDark: "0 22px 56px rgba(0, 0, 0, 0.34)",
          },
        },
      },
    },
    recipes: {
      Button: {
        base: {
          borderRadius: "12px",
          fontWeight: "600",
        },
        variants: {
          solid: {
            bg: "app.accent",
            color: "app.accentContrast",
            _hover: { opacity: 0.92 },
          },
          outline: {
            bg: "transparent",
            color: "app.text",
            borderColor: "app.border",
            _hover: { bg: "app.accentSoft" },
          },
          ghost: {
            color: "app.text",
            _hover: { bg: "app.accentSoft" },
          },
        },
      },
      Input: {
        base: {
          borderRadius: "12px",
        },
      },
    },
  },
};

export default theme;
