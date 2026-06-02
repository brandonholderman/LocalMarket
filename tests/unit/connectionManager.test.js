import { describe, it, expect, beforeEach } from 'vitest';
import {
    addConnection,
    removeConnection,
    getSocketIds,
    isOnline,
} from '../../src/sockets/connectionManager.js';


const USER_A = 'user-aaa';
const USER_B = 'user-bbb';
const SOCKET_1 = 'socket-001';
const SOCKET_2 = 'socket-002';
const SOCKET_3 = 'socket-003';

beforeEach(() => {
    // Clean up any connections left from previous tests
    removeConnection(USER_A, SOCKET_1);
    removeConnection(USER_A, SOCKET_2);
    removeConnection(USER_B, SOCKET_3);
});

describe('addConnection', () => {
    it('marks a user as online after adding a connection', () => {
        addConnection(USER_A, SOCKET_1);
        expect(isOnline(USER_A)).toBe(true);
    });

    it('tracks multiple socket connections for the same user', () => {
        addConnection(USER_A, SOCKET_1);
        addConnection(USER_A, SOCKET_2);

        const ids = getSocketIds(USER_A);
        expect(ids.has(SOCKET_1)).toBe(true);
        expect(ids.has(SOCKET_2)).toBe(true);
        expect(ids.size).toBe(2);
    });

    it('does not mix socket IDs between different users', () => {
        addConnection(USER_A, SOCKET_1);
        addConnection(USER_B, SOCKET_3);

        expect(getSocketIds(USER_A).has(SOCKET_3)).toBe(false);
        expect(getSocketIds(USER_B).has(SOCKET_1)).toBe(false);
    });
});

describe('removeConnection', () => {
    it('user stays online if they have remaining connections', () => {
        addConnection(USER_A, SOCKET_1);
        addConnection(USER_A, SOCKET_2);

        removeConnection(USER_A, SOCKET_1);

        expect(isOnline(USER_A)).toBe(true);
        expect(getSocketIds(USER_A).has(SOCKET_2)).toBe(true);
    });

    it('marks user as offline when their last connection is removed', () => {
        addConnection(USER_A, SOCKET_1);
        removeConnection(USER_A, SOCKET_1);

        expect(isOnline(USER_A)).toBe(false);
    });

    it('does not throw when removing a connection that does not exist', () => {
        expect(() => removeConnection('ghost-user', 'ghost-socket')).not.toThrow();
    });
});

describe('getSocketIds', () => {
    it('returns an empty Set for a user with no connections', () => {
        const ids = getSocketIds('offline-user');
        expect(ids).toBeInstanceOf(Set);
        expect(ids.size).toBe(0);
    });

    it('returns all socket IDs for a connected user', () => {
        addConnection(USER_A, SOCKET_1);
        addConnection(USER_A, SOCKET_2);

        const ids = getSocketIds(USER_A);
        expect(ids.size).toBe(2);
    });
});

describe('isOnline', () => {
    it('returns false for a user who has never connected', () => {
        expect(isOnline('never-connected')).toBe(false);
    });

    it('returns true when user connects', () => {
        addConnection(USER_A, SOCKET_1);
        expect(isOnline(USER_A)).toBe(true);
    });

    it('returns false after all connections removed', () => {
        addConnection(USER_A, SOCKET_1);
        removeConnection(USER_A, SOCKET_1);
        expect(isOnline(USER_A)).toBe(false);
    });
});