import type { ReactNode } from "react";
import { ChakraProvider, createSystem, defaultConfig } from "@chakra-ui/react";
import theme from "~/theme";

export function Chakra({ children }: { children: ReactNode }) {
  // Merge Chakra's default preset/config with the app theme so preflight
  // (CSS reset) and base component tokens/recipes are available.
  const sys = createSystem(defaultConfig, { theme: theme as any });
  return <ChakraProvider value={sys}>{children}</ChakraProvider>;
}

export default Chakra;
