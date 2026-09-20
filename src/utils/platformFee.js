// Mediator platform fee charged to the vendor per completed order.
//
// The fee is configurable from the admin Fees tab and stored at
// `/settings/platformFee` as { mode: 'flat' | 'percent', value, updatedAt }:
//   flat    → `value` rupees per completed order
//   percent → `value`% of that order's totalBill
//
// The rate in force is STAMPED onto each bill as `platformFeeBase` when the
// order completes, so changing the fee never re-prices past orders or shifts
// the figures on an invoice already issued. Bills written before this existed
// carry no stamp and fall back to the original flat ₹50.
//
// This file is duplicated in trade2cartAdmin-main/src/utils/platformFee.js
// (separate repos, no shared package) — keep the two in sync.

export const LEGACY_FLAT_FEE = 50;
export const DEFAULT_FEE = { mode: 'flat', value: LEGACY_FLAT_FEE };
export const GST_RATE = 0.18;

// Rupee fee (pre-GST) owed on one completed order, at the given setting.
export const feeBaseFor = (setting, totalBill) => {
  const value = Number(setting?.value);
  if (!Number.isFinite(value) || value < 0) return LEGACY_FLAT_FEE;
  if (setting?.mode !== 'percent') return value;
  const bill = Number(totalBill);
  if (!Number.isFinite(bill) || bill <= 0) return 0;
  return Math.round(bill * value) / 100; // 2dp
};

// Fee owed on an EXISTING bill: the stamp it was written with, else the legacy flat fee.
export const billFeeBase = (bill) => {
  const stamped = Number(bill?.platformFeeBase);
  return Number.isFinite(stamped) && stamped >= 0 ? stamped : LEGACY_FLAT_FEE;
};

// Total pre-GST fee across a set of bills.
export const sumFeeBase = (bills) => bills.reduce((sum, b) => sum + billFeeBase(b), 0);

// Human-readable description of a fee setting, for page copy and modals.
export const describeFee = (setting) =>
  setting?.mode === 'percent'
    ? `${Number(setting.value) || 0}% of order value`
    : `₹${Number(setting?.value ?? LEGACY_FLAT_FEE)} per completed order`;
