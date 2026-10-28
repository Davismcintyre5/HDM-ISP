'use strict';

const config = require('../config/env');
const { client, vouchersFolder, logosFolder } = require('../config/cloudinary');
const ApiError = require('../utils/apiError');

function uploadBuffer(buffer, { folder, publicId, resourceType = 'image' }) {
  return new Promise((resolve, reject) => {
    const stream = client.uploader.upload_stream(
      {
        folder,
        public_id: publicId,
        resource_type: resourceType,
        overwrite: true,
        invalidate: true,
      },
      (err, result) => {
        if (err) {
          return reject(
            ApiError.badGateway('Cloudinary upload failed', { error: err.message })
          );
        }
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          format: result.format,
          bytes: result.bytes,
        });
      }
    );
    stream.end(buffer);
  });
}

async function uploadLogo(buffer, providerId) {
  if (!buffer || !Buffer.isBuffer(buffer)) {
    throw ApiError.badRequest('Logo buffer required');
  }
  if (!providerId) {
    throw ApiError.badRequest('providerId required for logo upload');
  }
  return uploadBuffer(buffer, {
    folder: logosFolder,
    publicId: `provider_${providerId}_logo`,
  });
}

async function uploadVoucherImage(buffer, providerId) {
  if (!buffer || !Buffer.isBuffer(buffer)) {
    throw ApiError.badRequest('Voucher image buffer required');
  }
  if (!providerId) {
    throw ApiError.badRequest('providerId required for voucher upload');
  }
  return uploadBuffer(buffer, {
    folder: vouchersFolder,
    publicId: `provider_${providerId}_voucher_${Date.now()}`,
  });
}

async function deleteAsset(publicId) {
  if (!publicId) throw ApiError.badRequest('publicId required');
  try {
    return await client.uploader.destroy(publicId, { invalidate: true });
  } catch (err) {
    throw ApiError.badGateway('Cloudinary delete failed', { error: err.message });
  }
}

module.exports = {
  uploadBuffer,
  uploadLogo,
  uploadVoucherImage,
  deleteAsset,
};