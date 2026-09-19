import { expect } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as jestDom from '@testing-library/jest-dom';

// Register jest-dom matchers on Vitest's expect
expect.extend(jestDom);

// Clean up DOM between React tests
afterEach(() => {
  cleanup();
  localStorage.clear();
  sessionStorage.clear();
});
