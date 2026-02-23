import { extendTheme } from "@chakra-ui/react";

const config = {
  initialColorMode: "system",
  useSystemColorMode: false
};

const styles = {
  global: {
    body: {
      bg: "gray.50",
      color: "gray.800"
    }
  }
};

const theme = extendTheme({ config, styles });

export default theme;
