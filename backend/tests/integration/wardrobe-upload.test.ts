import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';

const uploadImageMock = vi.hoisted(() => vi.fn());

vi.mock('../../src/services/cloudinaryService', () => ({
  uploadImage: uploadImageMock,
  deleteImage: vi.fn(),
}));

import { createApp } from '../../src/app';
import { authHeader, createTestUser } from '../helpers';

describe('POST /api/wardrobe/upload-image', () => {
  const app = createApp();

  it('returns 400 when no file is attached', async () => {
    const user = await createTestUser();
    const res = await request(app)
      .post('/api/wardrobe/upload-image')
      .set(authHeader(user));
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/no image/i);
  });

  it('uploads to Cloudinary and returns the secure URL + publicId', async () => {
    uploadImageMock.mockResolvedValueOnce({
      url: 'https://res.cloudinary.com/demo/image/upload/v1/idrip-wardrobe/xyz.jpg',
      publicId: 'idrip-wardrobe/xyz',
    });

    const user = await createTestUser();
    // 1x1 transparent PNG
    const png = Buffer.from(
      '89504E470D0A1A0A0000000D49484452000000010000000108060000001F15C4890000000D49444154789C636060600000000500016A2790550000000049454E44AE426082',
      'hex'
    );

    const res = await request(app)
      .post('/api/wardrobe/upload-image')
      .set(authHeader(user))
      .attach('image', png, { filename: 'shirt.png', contentType: 'image/png' });

    expect(res.status).toBe(200);
    expect(res.body.imageUrl).toContain('cloudinary');
    expect(res.body.publicId).toBe('idrip-wardrobe/xyz');
    expect(uploadImageMock).toHaveBeenCalledOnce();
  });

  it('returns 500 when Cloudinary errors', async () => {
    uploadImageMock.mockRejectedValueOnce(new Error('Cloudinary down'));

    const user = await createTestUser();
    const png = Buffer.from(
      '89504E470D0A1A0A0000000D49484452000000010000000108060000001F15C4890000000D49444154789C636060600000000500016A2790550000000049454E44AE426082',
      'hex'
    );

    const res = await request(app)
      .post('/api/wardrobe/upload-image')
      .set(authHeader(user))
      .attach('image', png, { filename: 'shirt.png', contentType: 'image/png' });

    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/upload failed/i);
  });
});
