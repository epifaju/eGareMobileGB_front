import renderer, { act } from 'react-test-renderer';

import App from '@/app/App';

jest.mock('expo-status-bar', () => ({
  StatusBar: () => null,
}));

describe('App', () => {
  it('monte le composant racine', () => {
    let instance: renderer.ReactTestRenderer;
    act(() => {
      instance = renderer.create(<App testID="app-root" />);
    });
    expect(instance!.root).toBeDefined();
  });
});
