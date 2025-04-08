import { nextMonday, nextSunday } from 'date-fns';

export function cn(...classes: (string | undefined)[]) {
    return classes.filter(Boolean).join(' ')
}

export const getNextMonday = () => nextMonday(new Date());
export const getNextMondayAfterNextMonday = () => nextMonday(getNextMonday());
export const getNextSunday = (date?: Date) => nextSunday(date ?? new Date());

export function b3trUsdValue(token: bigint, usdPrice: number): bigint {
    return token * BigInt(Math.floor(usdPrice * 1e12)) / BigInt(1e12)
}

/**
 * Fetches all events using pagination to overcome the 256 event limit
 * @param filter The event filter from connex
 * @param pageSize The number of events to fetch per page (max 256)
 * @returns All events found
 */
export const fetchAllEvents = async (filter: { apply: (offset: number, limit: number) => Promise<any[]> }, pageSize: number = 256) => {
    if (pageSize > 256) {
        throw new Error('Page size cannot exceed 256')
    }

    const allEvents = []
    let offset = 0
    let hasMore = true

    while (hasMore) {
        const events = await filter.apply(offset, pageSize)
        allEvents.push(...events)

        // If we got less events than the page size, we've reached the end
        hasMore = events.length === pageSize
        offset += pageSize
    }

    return allEvents
} 