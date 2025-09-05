// Example: Simple Statsig to LaunchDarkly migration test case

// ============= BEFORE (Statsig) =============
import statsig from 'statsig-js';

const user = {
  userID: "user-123",
  email: "test@example.com",
  custom: {
    plan: "premium",
    role: "admin"
  }
};

await statsig.initialize('client-sdk-key', user);

// Feature gate check
if (statsig.checkGate("new_dashboard")) {
  console.log("New dashboard enabled");
}

// Dynamic config
const config = statsig.getConfig("homepage_settings");
const title = config.get("title", "Default Title");
const showBanner = config.get("show_banner", false);

// ============= AFTER (LaunchDarkly) =============
import LDClient from 'launchdarkly-js-client-sdk';

const context = {
  kind: "user",
  key: "user-123",
  email: "test@example.com",
  plan: "premium",  // custom properties flattened
  role: "admin"
};

const client = LDClient.initialize('client-side-id', context);

try {
  await client.waitForInitialization(5);
  
  // Feature gate check
  if (client.variation("new-dashboard", false)) {
    console.log("New dashboard enabled");
  }
  
  // Dynamic config
  const config = client.jsonVariation("homepage-settings", {
    title: "Default Title",
    show_banner: false
  });
  const title = config.title;
  const showBanner = config.show_banner;
  
} catch (err) {
  console.error("Failed to initialize LaunchDarkly");
}