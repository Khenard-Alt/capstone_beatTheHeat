const { incidentsController } = require('../controllers/incidentsController');

jest.mock('../config/supabase', () => ({
  getSupabaseAdminClient: jest.fn(),
}));

const { getSupabaseAdminClient } = require('../config/supabase');

describe('incidentsController.create', () => {
  let req, res, next;

  beforeEach(() => {
    req = { body: {} };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    next = jest.fn();
    jest.resetAllMocks();
  });

  test('returns 400 when missing fields', async () => {
    req.body = { type: '', description: '' };
    await incidentsController.create(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
  });

  test('inserts into supabase when configured', async () => {
    const mockSingle = jest.fn().mockResolvedValue({ data: { id: 'i1' }, error: null });
    const mockInsert = jest.fn(() => ({ select: jest.fn(() => ({ single: mockSingle })) }));
    const mockFrom = jest.fn(() => ({ insert: mockInsert }));
    getSupabaseAdminClient.mockReturnValue({ from: mockFrom });

    req.body = { type: 'heat_exhaustion', description: 'desc' };
    await incidentsController.create(req, res, next);

    expect(getSupabaseAdminClient).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  test('falls back to local file when supabase not configured', async () => {
    getSupabaseAdminClient.mockReturnValue(null);
    jest.spyOn(require('fs/promises'), 'appendFile').mockResolvedValue();

    req.body = { type: 'heat_exhaustion', description: 'desc' };
    await incidentsController.create(req, res, next);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });
});
