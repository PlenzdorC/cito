import { describe, expect, it, vi } from 'vitest';
import { createDefaultConfig } from '../../src/core/config.js';
import { priceBreakdown } from '../../src/core/pricing.js';
import { buildLeadPayload, emptyLeadForm, isLikelyBot, submitLead, validateLead } from '../../src/services/lead.js';

const validForm = {
  ...emptyLeadForm(),
  name: 'Markus Weber',
  phone: '+49 170 1234567',
  email: 'markus@beispiel.de',
  location: '80331 München',
  consent: true,
};

describe('validateLead', () => {
  it('accepts a complete form', () => {
    expect(validateLead(validForm)).toEqual({ valid: true, errors: {} });
  });

  it('reports every missing required field', () => {
    const { valid, errors } = validateLead(emptyLeadForm());
    expect(valid).toBe(false);
    expect(Object.keys(errors).sort()).toEqual(['consent', 'email', 'name', 'phone']);
  });

  it('rejects malformed values', () => {
    const { errors } = validateLead({
      ...validForm,
      name: 'x'.repeat(81),
      phone: 'ruf mich an',
      email: 'markus@',
      location: 'o'.repeat(61),
      message: 'm'.repeat(1001),
      plot: 'mond',
      consultation: 'brief',
    });
    expect(Object.keys(errors).sort()).toEqual(['consultation', 'email', 'location', 'message', 'name', 'phone', 'plot']);
    expect(validateLead({ ...validForm, phone: '12-3' }).errors.phone).toBeDefined();
  });

  it('detects bots via the honeypot field', () => {
    expect(isLikelyBot(validForm)).toBe(false);
    expect(isLikelyBot({ ...validForm, website: 'http://spam.example' })).toBe(true);
  });
});

describe('buildLeadPayload', () => {
  it('contains contact, configuration and price summary', () => {
    const config = createDefaultConfig();
    const payload = buildLeadPayload({
      form: { ...validForm, name: '  Markus Weber  ' },
      config,
      breakdown: priceBreakdown(config),
      configId: 'CTD-2026-ABCDE',
      partner: 'CITO-PARTNER-7729',
      monthlyRate: 1042,
      now: new Date('2026-09-25T12:00:00Z'),
    });
    expect(payload).toMatchObject({
      configId: 'CTD-2026-ABCDE',
      partner: 'CITO-PARTNER-7729',
      createdAt: '2026-09-25T12:00:00.000Z',
      contact: { name: 'Markus Weber', consultation: 'video', plot: 'suche' },
      price: { total: 284900, monthlyRate: 1042 },
    });
    expect(payload.price.items).toHaveLength(6);
    expect(payload.contact).not.toHaveProperty('website');
  });
});

describe('submitLead', () => {
  const payload = { configId: 'CTD-2026-ABCDE' };

  it('runs in demo mode without an endpoint', async () => {
    await expect(submitLead(payload, { endpoint: '', demoDelay: 0 })).resolves.toEqual({
      ok: true,
      demo: true,
      reference: 'CTD-2026-ABCDE',
    });
  });

  it('posts JSON to the configured endpoint', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ reference: 'LEAD-1' }) });
    const result = await submitLead(payload, { endpoint: 'https://api.example/leads', fetchImpl });
    expect(result).toEqual({ ok: true, demo: false, reference: 'LEAD-1' });
    const [url, options] = fetchImpl.mock.calls[0];
    expect(url).toBe('https://api.example/leads');
    expect(options.method).toBe('POST');
    expect(JSON.parse(options.body)).toEqual(payload);
  });

  it('falls back to the config id when the server returns no reference', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, json: async () => { throw new Error('no json'); } });
    await expect(submitLead(payload, { endpoint: 'https://api.example', fetchImpl })).resolves.toMatchObject({
      reference: 'CTD-2026-ABCDE',
    });
  });

  it('turns server and network errors into readable messages', async () => {
    const serverError = vi.fn().mockResolvedValue({ ok: false, status: 500 });
    await expect(submitLead(payload, { endpoint: 'https://api.example', fetchImpl: serverError })).rejects.toThrow('Status 500');
    const offline = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(submitLead(payload, { endpoint: 'https://api.example', fetchImpl: offline })).rejects.toThrow('Keine Verbindung');
    const aborted = vi.fn().mockRejectedValue(Object.assign(new Error('aborted'), { name: 'AbortError' }));
    await expect(submitLead(payload, { endpoint: 'https://api.example', fetchImpl: aborted })).rejects.toThrow('antwortet nicht');
  });
});
