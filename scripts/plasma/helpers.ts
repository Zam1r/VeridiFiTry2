/**
 * Helper functions for Plasma scripts
 */

export function validateAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

export function formatAmount(amount: string): string {
  return amount;
}


