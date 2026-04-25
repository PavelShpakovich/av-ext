import '@testing-library/jest-dom';

const localState: Record<string, unknown> = {};

(globalThis as unknown as { browser: unknown }).browser = {
  storage: {
    local: {
      get: jest.fn(async (key: string) => ({ [key]: localState[key] })),
      set: jest.fn(async (items: Record<string, unknown>) => {
        Object.assign(localState, items);
      }),
      remove: jest.fn(async (key: string) => {
        delete localState[key];
      }),
    },
  },
};
