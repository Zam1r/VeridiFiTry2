/**
 * Test helper functions
 */

import { expect } from "chai";

export async function expectRevert(
  promise: Promise<any>,
  expectedError?: string
) {
  try {
    await promise;
    expect.fail("Expected transaction to revert");
  } catch (error: any) {
    if (expectedError) {
      expect(error.message).to.include(expectedError);
    }
  }
}


