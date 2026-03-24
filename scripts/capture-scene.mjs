import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

const APP_ID = 'scrap-frontier';

const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.woff2': 'font/woff2'
};

const parseArgs = (argv) => {
  const args = {
    scene: 'BaseScene',
    tutorial: null,
    commerce: null,
    shopAction: null,
    raidDebug: null,
    actionsFile: 'playwright-actions/base-wait.json',
    outputDir: null,
    pauseMs: '400',
    iterations: '1',
    headless: 'true',
    expectOwnedOffers: null,
    expectAdsDisabled: null,
    expectCommercePurchases: null,
    expectCommerceRewardedAds: null
  };

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (!next) {
      continue;
    }

    if (arg === '--scene') {
      args.scene = next;
      index += 1;
    } else if (arg === '--tutorial') {
      args.tutorial = next;
      index += 1;
    } else if (arg === '--commerce') {
      args.commerce = next;
      index += 1;
    } else if (arg === '--shop-action') {
      args.shopAction = next;
      index += 1;
    } else if (arg === '--raid-debug') {
      args.raidDebug = next;
      index += 1;
    } else if (arg === '--actions-file') {
      args.actionsFile = next;
      index += 1;
    } else if (arg === '--output-dir') {
      args.outputDir = next;
      index += 1;
    } else if (arg === '--pause-ms') {
      args.pauseMs = next;
      index += 1;
    } else if (arg === '--iterations') {
      args.iterations = next;
      index += 1;
    } else if (arg === '--headless') {
      args.headless = next;
      index += 1;
    } else if (arg === '--expect-owned-offers') {
      args.expectOwnedOffers = next;
      index += 1;
    } else if (arg === '--expect-ads-disabled') {
      args.expectAdsDisabled = next;
      index += 1;
    } else if (arg === '--expect-commerce-purchases') {
      args.expectCommercePurchases = next;
      index += 1;
    } else if (arg === '--expect-commerce-rewarded-ads') {
      args.expectCommerceRewardedAds = next;
      index += 1;
    }
  }

  return args;
};

const resolveClientPath = () => {
  const codexHome = process.env.CODEX_HOME ?? path.join(os.homedir(), '.codex');
  return path.join(
    codexHome,
    'skills',
    'develop-web-game',
    'scripts',
    'web_game_playwright_client.js'
  );
};

const toSceneSlug = (scene) => scene.replace(/Scene$/, '').replace(/[A-Z]/g, (match, offset) => `${offset > 0 ? '-' : ''}${match.toLowerCase()}`);

const createStaticServer = (distDir) => {
  const sockets = new Set();
  const server = http.createServer((request, response) => {
    const requestUrl = new URL(request.url ?? '/', 'http://127.0.0.1');
    const pathname = decodeURIComponent(requestUrl.pathname === '/' ? '/index.html' : requestUrl.pathname);
    const requestedPath = path.normalize(path.join(distDir, pathname));

    if (!requestedPath.startsWith(distDir)) {
      response.writeHead(403);
      response.end('Forbidden');
      return;
    }

    const filePath = fs.existsSync(requestedPath) && fs.statSync(requestedPath).isFile()
      ? requestedPath
      : path.join(distDir, 'index.html');
    const extension = path.extname(filePath);
    const mimeType = MIME_TYPES[extension] ?? 'application/octet-stream';

    response.writeHead(200, { 'Content-Type': mimeType });
    fs.createReadStream(filePath).pipe(response);
  });

  server.on('connection', (socket) => {
    sockets.add(socket);
    socket.on('close', () => {
      sockets.delete(socket);
    });
  });

  return {
    server,
    destroyOpenConnections: () => {
      for (const socket of sockets) {
        socket.destroy();
      }
    }
  };
};

const terminateProcessTree = async (child) => {
  if (child.killed || child.exitCode !== null) {
    return;
  }

  if (process.platform === 'win32') {
    await new Promise((resolve) => {
      const killer = spawn('taskkill', ['/pid', String(child.pid), '/t', '/f'], {
        stdio: 'ignore'
      });
      killer.on('error', () => resolve());
      killer.on('exit', () => resolve());
    });
    return;
  }

  child.kill('SIGTERM');
};

const runCapture = async (projectRoot, args, port) => {
  const clientPath = resolveClientPath();

  if (!fs.existsSync(clientPath)) {
    throw new Error(`Playwright client not found: ${clientPath}`);
  }

  const outputDir =
    args.outputDir ?? path.join('output', 'web-game', `${toSceneSlug(args.scene)}-capture`);
  const absoluteOutputDir = path.resolve(projectRoot, outputDir);
  fs.mkdirSync(absoluteOutputDir, { recursive: true });
  for (const entry of fs.readdirSync(absoluteOutputDir)) {
    if (/^(shot|state|errors)-\d+\.(png|json)$/.test(entry)) {
      fs.rmSync(path.join(absoluteOutputDir, entry), { force: true });
    }
  }
  const statePath = path.join(absoluteOutputDir, 'state-0.json');
  const shotPath = path.join(absoluteOutputDir, 'shot-0.png');
  const errorsPath = path.join(absoluteOutputDir, 'errors-0.json');

  const query = new URLSearchParams({ scene: args.scene });
  if (args.tutorial) {
    query.set('tutorial', args.tutorial);
  }
  if (args.commerce) {
    query.set('commerce', args.commerce);
  }
  if (args.shopAction) {
    query.set('shopAction', args.shopAction);
  }
  if (args.raidDebug) {
    query.set('raidDebug', args.raidDebug);
  }

  const childArgs = [
    '--experimental-default-type=module',
    clientPath,
    '--url',
    `http://127.0.0.1:${port}/?${query.toString()}`,
    '--actions-file',
    path.resolve(projectRoot, args.actionsFile),
    '--iterations',
    args.iterations,
    '--pause-ms',
    args.pauseMs,
    '--headless',
    args.headless,
    '--screenshot-dir',
    absoluteOutputDir
  ];

  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, childArgs, {
      cwd: projectRoot,
      stdio: 'inherit'
    });
    let settled = false;
    let artifactsReady = false;
    let artifactKillTimer = null;
    const artifactPoll = setInterval(() => {
      const hasShot = fs.existsSync(shotPath) && fs.statSync(shotPath).size > 0;
      const hasState = fs.existsSync(statePath) && fs.statSync(statePath).size > 0;

      if (!hasShot || !hasState || artifactKillTimer) {
        return;
      }

      artifactsReady = true;
      artifactKillTimer = setTimeout(() => {
        void terminateProcessTree(child);
      }, 1200);
    }, 250);

    const settle = (callback) => {
      if (settled) {
        return;
      }

      settled = true;
      clearInterval(artifactPoll);
      if (artifactKillTimer) {
        clearTimeout(artifactKillTimer);
      }
      callback();
    };

    child.on('error', (error) => {
      settle(() => reject(error));
    });
    child.on('exit', (code) => {
      if (code === 0 || artifactsReady) {
        settle(resolve);
        return;
      }

      settle(() => reject(new Error(`Capture command exited with code ${code}`)));
    });
  });

  if (!fs.existsSync(statePath)) {
    throw new Error(`Missing state artifact: ${statePath}`);
  }

  if (fs.existsSync(errorsPath)) {
    throw new Error(`Playwright client reported console/page errors: ${errorsPath}`);
  }

  const payload = JSON.parse(fs.readFileSync(statePath, 'utf8'));

  if (payload.app?.id !== APP_ID) {
    throw new Error(`Unexpected app id in state artifact: ${JSON.stringify(payload.app)}`);
  }

  if (payload.scene !== args.scene) {
    throw new Error(`Scene mismatch. Expected ${args.scene}, received ${payload.scene}`);
  }

  if (args.expectOwnedOffers) {
    const expectedOffers = args.expectOwnedOffers
      .split(',')
      .map((offer) => offer.trim())
      .filter(Boolean);

    for (const offerId of expectedOffers) {
      if (!payload.store?.purchases?.[offerId]) {
        throw new Error(`Expected restored offer missing from state artifact: ${offerId}`);
      }
    }
  }

  if (args.expectAdsDisabled !== null) {
    const expectedAdsDisabled = args.expectAdsDisabled === 'true';

    if (payload.store?.adsDisabled !== expectedAdsDisabled) {
      throw new Error(
        `adsDisabled mismatch. Expected ${expectedAdsDisabled}, received ${payload.store?.adsDisabled}`
      );
    }
  }

  if (args.expectCommercePurchases !== null) {
    const expectedPurchases = args.expectCommercePurchases === 'true';

    if (payload.commerce?.purchases !== expectedPurchases) {
      throw new Error(
        `commerce.purchases mismatch. Expected ${expectedPurchases}, received ${payload.commerce?.purchases}`
      );
    }
  }

  if (args.expectCommerceRewardedAds !== null) {
    const expectedRewardedAds = args.expectCommerceRewardedAds === 'true';

    if (payload.commerce?.rewardedAds !== expectedRewardedAds) {
      throw new Error(
        `commerce.rewardedAds mismatch. Expected ${expectedRewardedAds}, received ${payload.commerce?.rewardedAds}`
      );
    }
  }

  console.log(`Capture complete: ${absoluteOutputDir}`);
};

const main = async () => {
  const args = parseArgs(process.argv);
  const projectRoot = process.cwd();
  const distDir = path.join(projectRoot, 'dist');

  if (!fs.existsSync(distDir)) {
    throw new Error(`dist directory not found: ${distDir}`);
  }

  const { server, destroyOpenConnections } = createStaticServer(distDir);

  await new Promise((resolve) => {
    server.listen(0, '127.0.0.1', resolve);
  });

  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 0;

  try {
    await runCapture(projectRoot, args, port);
  } finally {
    destroyOpenConnections();
    await new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  }
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
