/**
 * Type Guard Utilities
 * Reusable type guards for runtime type checking
 */

import { CheckinRegistration, SponsorRegistration } from '../types/api';

/**
 * Type guard to check if a registration is a CheckinRegistration
 * @param reg - The registration to check
 * @returns True if the registration is a CheckinRegistration
 */
export function isCheckinRegistration(
  reg: CheckinRegistration | SponsorRegistration
): reg is CheckinRegistration {
  return 'type' in reg;
}

/**
 * Type guard to check if a registration is a SponsorRegistration
 * @param reg - The registration to check
 * @returns True if the registration is a SponsorRegistration
 */
export function isSponsorRegistration(
  reg: CheckinRegistration | SponsorRegistration
): reg is SponsorRegistration {
  return !('type' in reg);
}
