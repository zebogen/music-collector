import type { ReactNode } from "react";
import { ChakraProvider, createSystem, defaultConfig } from "@chakra-ui/react";
import theme from "~/theme";

export function Chakra({ children }: { children: ReactNode }) {
  const sys = createSystem(defaultConfig, theme as any);
  return <ChakraProvider value={sys}>{children}</ChakraProvider>;
}

export default Chakra;
