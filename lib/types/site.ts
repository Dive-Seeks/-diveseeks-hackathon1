import { DaySlot, Holiday, HolidayException } from "../setup-business-store";

export type SiteSalesChannel = "POS" | "WEB" | "APP";

export interface PrimarySiteConfig {
  siteName: string;
  type: SiteSalesChannel;
  isActive: boolean;
  operatingHours?: DaySlot[];
  holidays?: Holiday[];
  holidayExceptions?: HolidayException[];
}
