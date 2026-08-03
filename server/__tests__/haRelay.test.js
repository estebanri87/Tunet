// @vitest-environment node

import { describe, expect, it } from 'vitest';
import { computeEntityDiff } from '../haRelay.js';

describe('computeEntityDiff', () => {
  it('reports no changes when nothing differs', () => {
    const entities = { 'light.a': { state: 'on' } };
    const diff = computeEntityDiff(entities, entities);
    expect(diff).toEqual({ changed: {}, removed: [] });
  });

  it('reports only the entity whose reference actually changed', () => {
    const unchanged = { state: 'on' };
    const prev = { 'light.a': unchanged, 'light.b': { state: 'off' } };
    const nextB = { state: 'on' };
    const next = { 'light.a': unchanged, 'light.b': nextB };

    const diff = computeEntityDiff(prev, next);

    expect(diff.changed).toEqual({ 'light.b': nextB });
    expect(diff.removed).toEqual([]);
  });

  it('reports a newly added entity as changed', () => {
    const prev = { 'light.a': { state: 'on' } };
    const added = { state: 'on' };
    const next = { 'light.a': prev['light.a'], 'light.c': added };

    const diff = computeEntityDiff(prev, next);

    expect(diff.changed).toEqual({ 'light.c': added });
    expect(diff.removed).toEqual([]);
  });

  it('reports a removed entity in removed, not changed', () => {
    const prev = { 'light.a': { state: 'on' }, 'light.b': { state: 'off' } };
    const next = { 'light.a': prev['light.a'] };

    const diff = computeEntityDiff(prev, next);

    expect(diff.changed).toEqual({});
    expect(diff.removed).toEqual(['light.b']);
  });

  it('treats two deep-equal-but-distinct objects as changed (reference-based, not deep-equal)', () => {
    const prev = { 'light.a': { state: 'on' } };
    const nextValue = { state: 'on' }; // deep-equal to prev's value, different reference
    const next = { 'light.a': nextValue };

    const diff = computeEntityDiff(prev, next);

    expect(diff.changed).toEqual({ 'light.a': nextValue });
  });
});
