import type { ReactNode } from "react";
import { ChakraProvider, ColorModeScript } from "@chakra-ui/react";
import theme from "~/theme";

export function Chakra({ children }: { children: ReactNode }) {
  return (
    <ChakraProvider theme={theme}>
      <ColorModeScript initialColorMode={(theme as any).config?.initialColorMode} />
      {children}
    </ChakraProvider>
  );
}

export default Chakra;
