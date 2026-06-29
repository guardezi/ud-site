import "server-only";
import { WPPageSnapshot } from "./WPPageSnapshot";

export function WPHomeSnapshot() {
  return <WPPageSnapshot slug="home-main" />;
}

export { WPPageSnapshot } from "./WPPageSnapshot";
