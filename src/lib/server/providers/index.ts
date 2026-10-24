import type { Settings } from "../../core/types";
import { getSecrets } from "../store";
import { anthropicProvider } from "./anthropic";
import { mockProvider } from "./mock";
import { openaiProvider } from "./openai";
import type { Provider } from "./types";

export async function providerFor(
  settings: Settings,
  provider: Settings["provider"] = settings.provider,
): Promise<Provider> {
  const secrets = await getSecrets();
  switch (provider) {
    case "anthropic":
      return anthropicProvider({
        apiKey: secrets.anthropic,
        model: settings.anthropic.model,
        effort: settings.anthropic.effort,
        webSearch: settings.anthropic.webSearch,
      });
    case "openai":
      return openaiProvider({
        apiKey: secrets.openai,
        model: settings.openai.model,
        baseURL: settings.openai.baseURL,
      });
    case "mock":
      return mockProvider();
  }
}

export { ProviderError } from "./types";
export type { Provider } from "./types";
