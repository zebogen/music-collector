import { extendTheme } from "@chakra-ui/react";

const config = {
  initialColorMode: "system",
  useSystemColorMode: false
};

const styles = {
  global: {
    ":root": {
      colorScheme: "light"
    },
    body: {
      bg: "linear-gradient(180deg, rgba(217,245,212,0.5) 0%, rgba(244,245,247,1) 100%)",
      color: "gray.800",
      fontFamily: 'Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial'
    },
    "*": {
      boxSizing: "border-box"
    }
  }
};

const components = {
  Button: {
    baseStyle: {
      borderRadius: "8px"
    },
    variants: {
      solid: {
        bg: "green.600",
        color: "white",
        _hover: { bg: "green.700" }
      },
      outline: {
        borderColor: "gray.300"
      }
    }
  },
  Container: {
    baseStyle: {
      maxW: "7xl",
      px: 4
    }
  }
};

const theme = extendTheme({ config, styles, components });

export default theme;
