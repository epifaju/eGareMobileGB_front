const { device, element, by, expect } = require('detox');

describe('App smoke', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
  });

  it('affiche la racine', async () => {
    await expect(element(by.id('root-navigator'))).toBeVisible();
  });
});
