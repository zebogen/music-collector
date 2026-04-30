const theme = {
  globalCss: {
    html: {
      colorScheme: "light dark",
    },
    body: {
      bg: "app.bg",
      color: "app.text",
      fontFamily: '"Circular Std", "Spotify Mix", "Avenir Next", "Segoe UI", sans-serif',
      backgroundImage: {
        base:
          "radial-gradient(circle at top left, rgba(29, 185, 84, 0.12), transparent 34%), linear-gradient(180deg, var(--chakra-colors-app-bg) 0%, var(--chakra-colors-app-bg-subtle) 100%)",
        _dark:
          "radial-gradient(circle at top left, rgba(29, 185, 84, 0.16), transparent 36%), linear-gradient(180deg, var(--chakra-colors-app-bg) 0%, var(--chakra-colors-app-bg-subtle) 100%)",
      },
    },
    main: {
      paddingBottom: { base: "calc(84px + env(safe-area-inset-bottom))", md: "0" },
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
        latte: {
          base: { value: "#eff1f5" },
          mantle: { value: "#e6e9ef" },
          crust: { value: "#dce0e8" },
          text: { value: "#4c4f69" },
          subtext: { value: "#6c6f85" },
          overlay: { value: "#9ca0b0" },
          surface0: { value: "#ccd0da" },
          surface1: { value: "#bcc0cc" },
          blue: { value: "#1db954" },
          mauve: { value: "#8839ef" },
          green: { value: "#40a02b" },
          red: { value: "#d20f39" },
        },
        mocha: {
          base: { value: "#121212" },
          mantle: { value: "#181818" },
          crust: { value: "#0b0b0b" },
          text: { value: "#ffffff" },
          subtext: { value: "#b3b3b3" },
          overlay: { value: "#727272" },
          surface0: { value: "#202020" },
          surface1: { value: "#2b2b2b" },
          blue: { value: "#1db954" },
          mauve: { value: "#1ed760" },
          green: { value: "#1ed760" },
          red: { value: "#f15e6c" },
        },
      },
    },
    semanticTokens: {
      colors: {
        app: {
          bg: {
            value: { base: "{colors.latte.base}", _dark: "{colors.mocha.base}" },
          },
          bgSubtle: {
            value: { base: "#f5f6f8", _dark: "#101010" },
          },
          panel: {
            value: { base: "rgba(255, 255, 255, 0.9)", _dark: "rgba(24, 24, 24, 0.96)" },
          },
          panelSolid: {
            value: { base: "{colors.latte.mantle}", _dark: "{colors.mocha.mantle}" },
          },
          card: {
            value: { base: "#ffffff", _dark: "{colors.mocha.surface0}" },
          },
          cardAlt: {
            value: { base: "{colors.latte.crust}", _dark: "{colors.mocha.surface1}" },
          },
          border: {
            value: { base: "rgba(108, 111, 133, 0.28)", _dark: "rgba(255, 255, 255, 0.12)" },
          },
          text: {
            value: { base: "#16181d", _dark: "#ffffff" },
          },
          muted: {
            value: { base: "#5e6470", _dark: "#b3b3b3" },
          },
          accent: {
            value: { base: "{colors.latte.blue}", _dark: "{colors.mocha.blue}" },
          },
          accentSoft: {
            value: { base: "rgba(29, 185, 84, 0.16)", _dark: "rgba(29, 185, 84, 0.22)" },
          },
          accentContrast: {
            value: { base: "white", _dark: "#000000" },
          },
          overlay: {
            value: { base: "rgba(220, 224, 232, 0.72)", _dark: "rgba(0, 0, 0, 0.72)" },
          },
          success: {
            value: { base: "{colors.latte.green}", _dark: "{colors.mocha.green}" },
          },
          danger: {
            value: { base: "{colors.latte.red}", _dark: "{colors.mocha.red}" },
          },
        },
      },
      shadows: {
        xs: {
          value: {
            base: "0 8px 24px rgba(32, 39, 55, 0.06)",
            _dark: "0 12px 32px rgba(0, 0, 0, 0.24)",
          },
        },
        md: {
          value: {
            base: "0 18px 48px rgba(32, 39, 55, 0.12)",
            _dark: "0 22px 56px rgba(0, 0, 0, 0.34)",
          },
        },
      },
    },
    recipes: {
      button: {
        base: {
          borderRadius: "9999px",
          fontWeight: "700",
          letterSpacing: "0.01em",
        },
        defaultVariants: {
          variant: "solid",
        },
        variants: {
          variant: {
            solid: {
              bg: "app.accent",
              color: "app.accentContrast",
              borderColor: "transparent",
              _hover: { bg: "app.accent", opacity: 0.9, transform: "translateY(-1px)" },
            },
            outline: {
              bg: "transparent",
              color: "app.text",
              borderColor: "app.border",
              _hover: { bg: "app.accentSoft", borderColor: "app.accent" },
            },
            ghost: {
              color: "app.text",
              _hover: { bg: "app.accentSoft" },
            },
          },
        },
      },
      input: {
        base: {
          borderRadius: "12px",
        },
      },
    },
  },
};

export default theme;
