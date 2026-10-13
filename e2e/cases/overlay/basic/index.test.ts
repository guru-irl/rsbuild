import { join } from 'node:path';
import {
  expect,
  HMR_CONNECTED_LOG,
  MODULE_BUILD_FAILED_LOG,
  OVERLAY_ID,
  OVERLAY_TITLE_BUILD_FAILED,
  test,
} from '@e2e/helper';

test('should show overlay correctly', async ({
  page,
  dev,
  editFile,
  logHelper,
  copySrcDir,
}) => {
  const tempSrc = await copySrcDir();

  const { expectLog, addLog } = logHelper;

  page.on('console', (consoleMessage) => {
    addLog(consoleMessage.text());
  });

  await dev({
    config: {
      source: {
        entry: {
          index: join(tempSrc, 'index.tsx'),
        },
      },
    },
  });

  await expectLog(HMR_CONNECTED_LOG);

  const errorOverlay = page.locator(OVERLAY_ID);
  await expect(errorOverlay.locator('.title')).not.toBeAttached();

  await editFile(join(tempSrc, 'App.tsx'), (code) =>
    code.replace('</div>', '</a>'),
  );

  await expectLog(MODULE_BUILD_FAILED_LOG);
  await expect(errorOverlay.locator('.title')).toHaveText(
    OVERLAY_TITLE_BUILD_FAILED,
  );
});

test('should clear the build error overlay when a fixed build has the page hash', async ({
  page,
  dev,
  editFile,
  logHelper,
  copySrcDir,
}) => {
  const tempSrc = await copySrcDir();

  const { expectLog, addLog } = logHelper;

  page.on('console', (consoleMessage) => {
    addLog(consoleMessage.text());
  });

  const { server } = await dev({
    config: {
      dev: {
        hmr: false,
      },
      source: {
        entry: {
          index: join(tempSrc, 'index.tsx'),
        },
      },
    },
  });

  await expectLog(HMR_CONNECTED_LOG);

  const pageHash = (await server!.environments.web.getStats()).hash;
  expect(pageHash).toMatch(/.+/);

  await editFile(join(tempSrc, 'App.tsx'), (code) =>
    code.replace('</div>', '</a>'),
  );

  const errorOverlay = page.locator(OVERLAY_ID);
  await expect(errorOverlay.locator('.title')).toHaveText(
    OVERLAY_TITLE_BUILD_FAILED,
  );

  // Rspack currently changes the hash on every rebuild, so simulate a fixed
  // build that has the page's hash.
  server!.sockWrite('hash', pageHash!);
  server!.sockWrite('ok');

  await expect(errorOverlay.locator('.title')).not.toBeAttached();
});
