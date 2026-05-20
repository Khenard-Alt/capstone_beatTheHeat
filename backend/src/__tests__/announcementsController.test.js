const { announcementsController } = require('../controllers/announcementsController');

jest.mock('../config/supabase', () => ({
  getSupabaseAdminClient: jest.fn(),
}));

const { getSupabaseAdminClient } = require('../config/supabase');

describe('announcementsController.createAnnouncement', () => {
  let req, res, next;

  beforeEach(() => {
    req = { body: {} };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    next = jest.fn();
    jest.resetAllMocks();
  });

  test('returns 400 when missing fields', async () => {
    req.body = { title: '', body: '' };
    await announcementsController.createAnnouncement(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
  });

  test('writes to supabase when configured', async () => {
    const mockInsert = jest.fn().mockResolvedValue({ data: { id: 'a1', title: 'T', body: 'B' }, error: null });
    const mockFrom = jest.fn(() => ({ insert: jest.fn(() => ({ select: jest.fn(() => ({ single: mockInsert })) })) }));
    getSupabaseAdminClient.mockReturnValue({ from: mockFrom });

    req.body = { title: 'T', body: 'B', priority: 'info' };
    await announcementsController.createAnnouncement(req, res, next);

    expect(getSupabaseAdminClient).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  test('falls back to local file when supabase not configured', async () => {
    getSupabaseAdminClient.mockReturnValue(null);
    // mock appendFile to avoid disk IO
    jest.spyOn(require('fs/promises'), 'appendFile').mockResolvedValue();

    req.body = { title: 'Local', body: 'Offline' };
    await announcementsController.createAnnouncement(req, res, next);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });
});
