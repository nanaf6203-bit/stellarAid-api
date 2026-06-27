import type { Response } from 'express';
import { sendError, sendSuccess } from './response.util';

type MockRes = Response & {
  statusCode: number;
  status: jest.Mock;
  json: jest.Mock;
  _unusedBody?: Record<string, unknown>;
};

const buildMockRes = (): MockRes => {
  const res = {
    statusCode: 200,
  } as unknown as MockRes;
  res.status = jest.fn().mockImplementation((code: number) => {
    res.statusCode = code;
    return res;
  });
  res.json = jest.fn().mockImplementation((_body: Record<string, unknown>) => {
    return res;
  });
  return res;
};

const getBody = (res: MockRes): Record<string, unknown> => {
  const jsonMock = res.json as jest.Mock;
  return jsonMock.mock.calls[0][0] as Record<string, unknown>;
};

describe('sendSuccess', () => {
  it('emits the standard envelope with default 200', () => {
    const res = buildMockRes();
    sendSuccess(res, { id: 1 }, 'Created');

    expect(res.status).toHaveBeenCalledWith(200);
    const body = getBody(res);
    expect(body.success).toBe(true);
    expect(body.statusCode).toBe(200);
    expect(body.message).toBe('Created');
    expect(body.data).toEqual({ id: 1 });
    expect(body.timestamp).toEqual(expect.any(String));
  });

  it('respects a custom statusCode', () => {
    const res = buildMockRes();
    sendSuccess(res, { id: 2 }, 'Created', 201);

    expect(res.status).toHaveBeenCalledWith(201);
    const body = getBody(res);
    expect(body.statusCode).toBe(201);
    expect(body.success).toBe(true);
    expect(body.message).toBe('Created');
  });

  it('uses default message "OK" when none provided', () => {
    const res = buildMockRes();
    sendSuccess(res, { ok: true });

    expect(getBody(res).message).toBe('OK');
  });
});

describe('sendError', () => {
  it('emits the standard error envelope with 500 by default', () => {
    const res = buildMockRes();
    sendError(res, 'boom');

    expect(res.status).toHaveBeenCalledWith(500);
    const body = getBody(res);
    expect(body.success).toBe(false);
    expect(body.statusCode).toBe(500);
    expect(body.message).toBe('boom');
    expect(body.timestamp).toEqual(expect.any(String));
  });

  it('omits errors field when not provided', () => {
    const res = buildMockRes();
    sendError(res, 'err', 400);

    expect(getBody(res)).not.toHaveProperty('errors');
  });

  it('includes errors array when provided and non-empty', () => {
    const res = buildMockRes();
    sendError(res, 'validation failed', 422, ['email is invalid', 'name too short']);

    expect(res.status).toHaveBeenCalledWith(422);
    expect(getBody(res).errors).toEqual(['email is invalid', 'name too short']);
  });

  it('drops an empty errors array', () => {
    const res = buildMockRes();
    sendError(res, 'err', 400, []);

    expect(getBody(res)).not.toHaveProperty('errors');
  });
});
