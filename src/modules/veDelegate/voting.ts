import type { VotePreference } from './types';

export interface VotingApp {
    id: string;
    name: string;
    eligible: boolean;
}

export function readVotePreference(value: unknown): VotePreference {
    if (!Array.isArray(value) || value.length !== 2 || !Array.isArray(value[0]) || !Array.isArray(value[1]) || value[0].length !== value[1].length) {
        throw new Error('Unable to read voting preferences. Please retry.');
    }
    const appIds = value[0].map((id: unknown) => {
        if (typeof id !== 'string' || !/^0x[0-9a-f]{64}$/i.test(id)) throw new Error('Invalid voting app returned by the chain. Please retry.');
        return id.toLowerCase();
    });
    const percentages = value[1].map((value: unknown) => {
        if (typeof value !== 'number' && typeof value !== 'bigint') throw new Error('Invalid voting percentage returned by the chain. Please retry.');
        const percentage = Number(value);
        if (!Number.isInteger(percentage) || percentage < 0 || percentage > 100) throw new Error('Invalid voting percentage returned by the chain. Please retry.');
        return percentage;
    });
    if (new Set(appIds).size !== appIds.length) throw new Error('Duplicate voting apps returned by the chain. Please retry.');
    return { appIds, percentages };
}

export function validateVotes(preference: VotePreference, eligible?: Set<string>): VotePreference {
    if (preference.appIds.length !== preference.percentages.length || preference.appIds.some(id => !/^0x[0-9a-f]{64}$/i.test(id))) {
        throw new Error('You need a valid app ID for every percentage.');
    }
    if (preference.percentages.some(value => !Number.isInteger(value) || value < 0 || value > 100)) {
        throw new Error('You need whole percentages between 0 and 100.');
    }
    const appIds = preference.appIds.map(id => id.toLowerCase());
    if (new Set(appIds).size !== appIds.length) throw new Error('You need to list each app only once.');
    const parsed = { appIds, percentages: preference.percentages };
    const total = parsed.percentages.reduce((sum, value) => sum + value, 0);
    if (total < 100) throw new Error(`Allocate ${100 - total}% more to reach 100%.`);
    if (total > 100) throw new Error(`Remove ${total - 100}% to reach 100%.`);
    const result: VotePreference = { appIds: [], percentages: [] };
    parsed.appIds.forEach((id, index) => {
        const percentage = parsed.percentages[index];
        if (!percentage) return;
        if (eligible && !eligible.has(id)) throw new Error('You need to move votes from apps that are no longer eligible.');
        result.appIds.push(id);
        result.percentages.push(percentage);
    });
    return result;
}

export function voteKey(preference: VotePreference): string {
    return preference.appIds.map((id, index) => [id.toLowerCase(), preference.percentages[index]] as const)
        .filter(([, value]) => value !== 0).sort(([a], [b]) => a.localeCompare(b)).map(([id, value]) => `${id}:${value}`).join('|');
}
