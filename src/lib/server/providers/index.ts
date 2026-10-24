import type { Settings } from "../../core/types";
import { getSecrets } from "../store";
import { anthropicProvider } from "./anthropic";
import { mockProvider } from "./mock";
import { openaiProvider } from "./openai";
import { ProviderError, type Provider } from "./types";

export async function providerFor(
  settings: Settings,
  provider: Settings["provider"] = settings.provider,
): Promise<Provider> {
  const secrets = await getSecrets();
  switch (provider) {
    case "anthropic":
      if (!secrets.anthropic && !process.env.ANTHROPIC_AUTH_TOKEN) {
        throw new ProviderError(
          "Add your Anthropic API key in Settings — or switch to demo mode to try aula without one.",
          401,
        );
      }
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

export { ProviderError };
export type { Provider };
