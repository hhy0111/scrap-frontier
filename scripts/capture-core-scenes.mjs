import { spawn } from 'node:child_process';
import path from 'node:path';

const parseArgs = (argv) => {
  const args = {
    only: null,
    from: null
  };

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (!next) {
      continue;
    }

    if (arg === '--only') {
      args.only = next;
      index += 1;
    } else if (arg === '--from') {
      args.from = next;
      index += 1;
    }
  }

  return args;
};

const scenarios = [
  {
    scene: 'BaseScene',
    tutorial: 'off',
    outputDir: path.join('output', 'web-game', 'base-clean-latest')
  },
  {
    scene: 'ScoutScene',
    tutorial: 'off',
    outputDir: path.join('output', 'web-game', 'scout-clean-latest')
  },
  {
    scene: 'RaidPrepScene',
    tutorial: 'off',
    outputDir: path.join('output', 'web-game', 'raidprep-clean-latest')
  },
  {
    scene: 'RaidScene',
    tutorial: 'off',
    raidDebug: 'hold',
    actionsFile: path.join('playwright-actions', 'raid-preview.json'),
    pauseMs: '1200',
    outputDir: path.join('output', 'web-game', 'raid-clean-latest')
  },
  {
    scene: 'ShopScene',
    tutorial: 'off',
    outputDir: path.join('output', 'web-game', 'shop-clean-latest')
  },
  {
    scene: 'ShopScene',
    tutorial: 'off',
    commerce: 'native-mock',
    outputDir: path.join('output', 'web-game', 'shop-native-mock-latest')
  },
  {
    scene: 'ShopScene',
    tutorial: 'off',
    commerce: 'native-no-purchases',
    outputDir: path.join('output', 'web-game', 'shop-native-no-purchases-latest'),
    expectCommercePurchases: 'false',
    expectCommerceRewardedAds: 'true'
  },
  {
    scene: 'ShopScene',
    tutorial: 'off',
    commerce: 'native-no-rewarded',
    outputDir: path.join('output', 'web-game', 'shop-native-no-rewarded-latest'),
    expectCommercePurchases: 'true',
    expectCommerceRewardedAds: 'false'
  },
  {
    scene: 'ShopScene',
    tutorial: 'off',
    commerce: 'native-restore-owned',
    shopAction: 'restore',
    outputDir: path.join('output', 'web-game', 'shop-restore-owned-latest'),
    expectOwnedOffers: 'starter_pack,commander_pack,monthly_pass',
    expectAdsDisabled: 'true'
  }
];

const runScenario = async (scenario) => {
  const args = [
    'scripts/capture-scene.mjs',
    '--scene',
    scenario.scene,
    '--tutorial',
    scenario.tutorial,
    '--output-dir',
    scenario.outputDir
  ];

  if (scenario.actionsFile) {
    args.push('--actions-file', scenario.actionsFile);
  }

  if (scenario.pauseMs) {
    args.push('--pause-ms', scenario.pauseMs);
  }

  if (scenario.commerce) {
    args.push('--commerce', scenario.commerce);
  }

  if (scenario.shopAction) {
    args.push('--shop-action', scenario.shopAction);
  }

  if (scenario.raidDebug) {
    args.push('--raid-debug', scenario.raidDebug);
  }

  if (scenario.expectOwnedOffers) {
    args.push('--expect-owned-offers', scenario.expectOwnedOffers);
  }

  if (scenario.expectAdsDisabled) {
    args.push('--expect-ads-disabled', scenario.expectAdsDisabled);
  }

  if (scenario.expectCommercePurchases) {
    args.push('--expect-commerce-purchases', scenario.expectCommercePurchases);
  }

  if (scenario.expectCommerceRewardedAds) {
    args.push('--expect-commerce-rewarded-ads', scenario.expectCommerceRewardedAds);
  }

  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, {
      cwd: process.cwd(),
      stdio: 'inherit'
    });

    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`Capture failed for ${scenario.scene} (${scenario.outputDir}) with code ${code}`));
    });
  });
};

const main = async () => {
  const args = parseArgs(process.argv);
  const filteredScenarios = args.only
    ? scenarios.filter((scenario) => scenario.scene === args.only)
    : args.from
      ? scenarios.slice(Math.max(0, scenarios.findIndex((scenario) => scenario.scene === args.from)))
      : scenarios;

  for (const scenario of filteredScenarios) {
    console.log(`\n[Capture] ${scenario.scene} -> ${scenario.outputDir}`);
    await runScenario(scenario);
  }
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
