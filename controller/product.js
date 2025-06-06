import Product from '../model/productModel.js';
import axios from 'axios';
import { Op } from 'sequelize';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const syncStateFile = path.join(process.cwd(), 'sync_state.json');

// Global variables untuk tracking batch progress
let batchProgress = {
  isRunning: false,
  currentBatch: 0,
  totalBatches: 0,
  processedProducts: 0,
  syncedCount: 0,
  updatedCount: 0,
  skippedCount: 0,
  imageDownloadCount: 0,
  startTime: null,
  estimatedCompletion: null,
};

// Load last processed state
const loadSyncState = () => {
  try {
    if (fs.existsSync(syncStateFile)) {
      const data = fs.readFileSync(syncStateFile, 'utf-8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Failed to load sync state:', e);
  }
  return { processedCount: 0 };
};

// Save sync progress
const saveSyncState = (processedCount) => {
  try {
    fs.writeFileSync(syncStateFile, JSON.stringify({ processedCount }), 'utf-8');
  } catch (e) {
    console.error('Failed to save sync state:', e);
  }
};

// Helper function untuk download multiple images dan buat folder per produk
const downloadProductImages = async (catalogData, groupId) => {
  try {
    if (!catalogData.images || catalogData.images.length === 0) {
      return { thumbnail: null, images: [], imagesFolder: null };
    }

    // Buat folder per produk
    const productFolder = `product_${groupId}`;
    const productDir = path.join(__dirname, '../upload/products', productFolder);

    if (!fs.existsSync(productDir)) {
      fs.mkdirSync(productDir, { recursive: true });
    }

    const processedImages = [];
    let thumbnailPath = null;

    // Download dan convert semua gambar
    for (let i = 0; i < catalogData.images.length; i++) {
      const image = catalogData.images[i];

      try {
        console.log(`📸 Downloading image ${i + 1}/${catalogData.images.length} for product ${groupId}`);

        const response = await axios.get(image.url, {
          responseType: 'arraybuffer',
          timeout: 15000,
        });

        const webpFileName = `image_${i + 1}.webp`;
        const filePath = path.join(productDir, webpFileName);

        // Convert ke WebP
        await sharp(Buffer.from(response.data))
          .resize(800, 800, {
            fit: 'inside',
            withoutEnlargement: true,
          })
          .webp({
            quality: 85,
            effort: 6,
          })
          .toFile(filePath);

        const imageData = {
          group_image_id: image.group_image_id || `img_${i + 1}`,
          url: `upload/products/${productFolder}/${webpFileName}`,
          thumbnail: `upload/products/${productFolder}/${webpFileName}`,
          original_url: image.url,
          index: i + 1,
        };

        processedImages.push(imageData);

        // Set thumbnail sebagai gambar pertama
        if (i === 0) {
          thumbnailPath = imageData.url;
        }
      } catch (imageError) {
        console.warn(`Failed to download image ${i + 1} for product ${groupId}:`, imageError.message);
        continue;
      }
    }

    return {
      thumbnail: thumbnailPath,
      images: processedImages,
      imagesFolder: `upload/products/${productFolder}`,
    };
  } catch (error) {
    console.error(`Error processing images for product ${groupId}:`, error);
    return { thumbnail: null, images: [], imagesFolder: null };
  }
};

// Helper function untuk convert uploaded file ke WebP
const convertUploadedImageToWebP = async (filePath, outputFileName) => {
  try {
    const uploadDir = path.join(__dirname, '../upload/products');
    const webpPath = path.join(uploadDir, `${outputFileName}.webp`);

    await sharp(filePath)
      .resize(800, 800, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({
        quality: 85,
        effort: 6,
      })
      .toFile(webpPath);

    fs.unlinkSync(filePath);
    return `upload/products/${outputFileName}.webp`;
  } catch (error) {
    console.error('Error converting image to WebP:', error);
    return null;
  }
};

// 1. Login ke Jubelio dan dapatkan token
export const getJubelioToken = async () => {
  try {
    const response = await axios.post(`${process.env.VITE_LOGIN_JUBELIO}/loginjubelio`);

    if (response.status === 200) {
      return response.data.token;
    }
    throw new Error('Failed to get Jubelio token');
  } catch (error) {
    console.error('Error getting Jubelio token:', error);
    throw error;
  }
};

// 2. Fetch detail produk by group ID
export const fetchProductDetail = async (token, groupId) => {
  try {
    // 1. Fetch catalog data untuk gambar
    const catalogResponse = await axios.get(`${process.env.VITE_API_URL}/inventory/catalog/for-listing/${groupId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (catalogResponse.status !== 200 || catalogResponse.data.length === 0) {
      return null;
    }

    const catalogData = catalogResponse.data[0];

    // FILTER: Skip jika tidak ada gambar
    if (!catalogData.images || catalogData.images.length === 0) {
      console.log(`⚠️  Skipping product ${groupId}: No images found`);
      return null;
    }

    let firstItemId = null;

    // Dapatkan item_id untuk fetch detail
    if (catalogData.variations && catalogData.variations.length > 0) {
      firstItemId = catalogData.variations[0].item_id;
    }

    if (!firstItemId) {
      return null;
    }

    // 2. Fetch detail item untuk description dan SKU
    const itemResponse = await axios.get(`${process.env.VITE_API_URL}/inventory/items/${firstItemId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (itemResponse.status !== 200) {
      return null;
    }

    const itemData = itemResponse.data;

    // 3. Download dan process semua gambar
    const imageData = await downloadProductImages(catalogData, groupId);

    // FILTER: Skip jika gagal download gambar/thumbnail
    if (!imageData.thumbnail) {
      console.log(`⚠️  Skipping product ${groupId}: Failed to download images`);
      return null;
    }

    // Format description
    const formatDescription = (str) => {
      if (!str) return '';
      let formattedText = str.replace(/<br\s*\/?>/gi, '\n');
      formattedText = formattedText.replace(/<\/?p>/gi, '\n\n');
      formattedText = formattedText.replace(/<\/?[^>]+(>|$)/g, '');
      formattedText = formattedText.replace(/\n\s*\n\s*\n/g, '\n\n');
      return formattedText.trim();
    };

    return {
      item_group_id: groupId,
      item_group_name: itemData.item_group_name,
      description: formatDescription(itemData.description || ''),
      product_skus: itemData.product_skus || [],
      ...imageData,
    };
  } catch (error) {
    console.error(`Error fetching product detail for group ${groupId}:`, error);
    return null;
  }
};

// 3. Fetch products batch by batch (tanpa pagination parameters yang tidak didukung)
export const fetchJubelioProductsBatch = async (token, processedCount = 0) => {
  try {
    // Fetch products tanpa parameter pagination (ambil semua)
    const response = await axios.get(`${process.env.VITE_API_URL}/inventory/items/`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      // Hapus params yang tidak didukung
    });

    if (response.status !== 200) {
      return { products: [], hasMore: false };
    }

    const allProducts = response.data.data || [];
    console.log(`📦 Fetched ${allProducts.length} total products from Jubelio`);

    // Sort manual berdasarkan last_modified (terbaru dulu)
    const sortedProducts = allProducts.sort((a, b) => {
      const dateA = new Date(a.last_modified || 0);
      const dateB = new Date(b.last_modified || 0);
      return dateB - dateA; // Descending (terbaru dulu)
    });

    // Manual pagination - ambil 500 produk berdasarkan processedCount
    const batchSize = 500;
    const startIndex = processedCount;
    const endIndex = startIndex + batchSize;
    const batchProducts = sortedProducts.slice(startIndex, endIndex);

    const hasMore = endIndex < sortedProducts.length;

    console.log(`📦 Processing batch: ${batchProducts.length} products (${startIndex}-${endIndex} of ${sortedProducts.length})`);

    return {
      products: batchProducts,
      hasMore,
      totalAvailable: sortedProducts.length,
      currentIndex: endIndex,
    };
  } catch (error) {
    console.error('Error fetching Jubelio products batch:', error);
    return { products: [], hasMore: false, totalAvailable: 0, currentIndex: 0 };
  }
};

// 4. Process single batch dengan allocation 70/30
export const processSingleBatch = async (token, products, existingGroupIds, existingItemIds, categoryMapping) => {
  try {
    const processedProducts = [];
    const processedGroupIds = new Set();

    console.log(`🔍 Processing ${products.length} products without ratio limitation...`);

    for (const product of products) {
      const groupId = product.item_group_id;

      // Skip jika group ID sudah diproses
      if (processedGroupIds.has(groupId)) {
        continue;
      }

      // Skip jika group sudah ada di database
      if (existingGroupIds.has(groupId)) {
        continue;
      }

      // Validate product has variants
      if (!product.variants || product.variants.length === 0) {
        continue;
      }

      // Filter valid variants (dengan atau tanpa stock - ambil semua)
      const validVariants = product.variants.filter((variant) => variant.sell_price > 0 && variant.item_id && variant.item_name);

      if (validVariants.length === 0) {
        continue;
      }

      // Get category info
      const categoryInfo = categoryMapping.get(product.item_category_id) || {
        category_name: 'Unknown',
        parent_id: null,
      };

      // Process ALL valid variants (no ratio limitation)
      for (const variant of validVariants) {
        processedProducts.push({
          ...product,
          variant,
          categoryInfo,
        });
        console.log(`📦 Added variant: ${variant.item_name} (Stock: ${variant.available_qty}) - Category: ${categoryInfo.category_name}`);
      }

      processedGroupIds.add(groupId);
    }

    console.log(`✅ Processed ${processedProducts.length} total variants from ${processedGroupIds.size} product groups`);
    return processedProducts;
  } catch (error) {
    console.error('Error processing batch:', error);
    throw error;
  }
};

// 5. Progressive sync dengan batch processing
export const syncProductsProgressively = async (req, res) => {
  try {
    if (batchProgress.isRunning) {
      return res.status(409).json({
        success: false,
        message: 'Sync already in progress',
        progress: batchProgress,
      });
    }

    const state = loadSyncState();

    // Initialize progress tracking
    batchProgress = {
      isRunning: true,
      currentBatch: 0,
      totalBatches: 0,
      processedProducts: 0,
      syncedCount: 0,
      updatedCount: 0,
      skippedCount: 0,
      imageDownloadCount: 0,
      startTime: new Date(),
      estimatedCompletion: null,
    };

    console.log('🚀 Starting full sync process via API...');

    // Tunggu hingga semua proses selesai sebelum response
    await progressiveSyncWorker(state.processedCount);

    res.status(200).json({
      success: true,
      message: 'Full sync completed successfully',
      finalProgress: batchProgress,
    });
  } catch (error) {
    batchProgress.isRunning = false;
    console.error('❌ Sync failed:', error);
    res.status(500).json({
      success: false,
      message: 'Sync failed',
      error: error.message,
    });
  }
};

// 6. Background worker untuk progressive sync (fixed)
export const progressiveSyncWorker = async (startProcessedCount = 0) => {
  try {
    const token = await getJubelioToken();

    // Fetch category mapping once at the beginning
    const categoryMapping = await fetchCategoryMapping(token);

    let processedCount = startProcessedCount;
    const batchSize = 500; // Increased batch size since we're processing all
    let hasMore = true;
    let batchCount = 0;
    let totalAvailable = 0;

    const existingProducts = await Product.findAll({
      attributes: ['id_jubelio', 'item_group_id'],
      raw: true,
    });

    const existingGroupIds = new Set(existingProducts.map((p) => p.item_group_id));
    const existingItemIds = new Set(existingProducts.map((p) => p.id_jubelio));

    console.log(`📊 Existing data: ${existingGroupIds.size} groups, ${existingItemIds.size} items`);

    while (hasMore && batchCount < 100) {
      // Increased max batches
      console.log(`\n🔄 Processing batch ${batchCount + 1}...`);
      batchProgress.currentBatch = batchCount + 1;

      const batchResult = await fetchJubelioProductsBatch(token, processedCount);
      const { products, hasMore: moreAvailable, totalAvailable: total, currentIndex } = batchResult;

      hasMore = moreAvailable;
      totalAvailable = total || totalAvailable;
      processedCount = currentIndex || processedCount + batchSize;
      saveSyncState(processedCount);

      if (products.length === 0) {
        console.log('📭 No more products to process');
        break;
      }

      batchProgress.totalBatches = Math.ceil(totalAvailable / batchSize);

      // Process batch with category mapping and no ratio limitation
      const processedProducts = await processSingleBatch(token, products, existingGroupIds, existingItemIds, categoryMapping);

      console.log(`💾 Inserting ${processedProducts.length} variants into database...`);

      for (const productData of processedProducts) {
        try {
          const variant = productData.variant;
          const categoryInfo = productData.categoryInfo;

          // Fetch product detail for images
          const detail = await fetchProductDetail(token, productData.item_group_id);

          if (!detail) {
            batchProgress.skippedCount++;
            continue;
          }

          const existingProduct = await Product.findOne({
            where: { id_jubelio: variant.item_id.toString() },
          });

          const productPayload = {
            id_jubelio: variant.item_id.toString(),
            item_group_id: detail.item_group_id,
            nama_produk: variant.item_name,
            deskripsi: detail.description || '',
            harga: variant.sell_price || 0,
            stok: variant.available_qty || 0,
            thumbnail: detail.thumbnail,
            images: detail.images,
            images_folder: detail.imagesFolder,
            // NEW: Category fields
            category_id: productData.item_category_id,
            category_name: categoryInfo.category_name,
            category_parent_id: categoryInfo.parent_id,
          };

          if (existingProduct) {
            await existingProduct.update(productPayload);
            batchProgress.updatedCount++;
            console.log(`🔄 Updated: ${variant.item_name} - ${categoryInfo.category_name}`);
          } else {
            await Product.create(productPayload);
            batchProgress.syncedCount++;
            existingItemIds.add(variant.item_id.toString());
            existingGroupIds.add(detail.item_group_id);
            console.log(`🆕 Created: ${variant.item_name} - ${categoryInfo.category_name}`);
          }

          if (detail.images?.length > 0) {
            batchProgress.imageDownloadCount += detail.images.length;
          }

          batchProgress.processedProducts++;
        } catch (itemError) {
          console.error(`Error saving product ${productData?.variant?.item_name}:`, itemError);
          batchProgress.skippedCount++;
        }
      }

      batchCount++;

      // Update progress calculation
      const elapsedTime = new Date() - batchProgress.startTime;
      const avgTimePerBatch = elapsedTime / batchCount;
      const remainingBatches = Math.max(0, batchProgress.totalBatches - batchCount);
      batchProgress.estimatedCompletion = new Date(Date.now() + avgTimePerBatch * remainingBatches);

      console.log(`✅ Batch ${batchCount} completed`);
      console.log(`📊 Stats: ${batchProgress.syncedCount} created, ${batchProgress.updatedCount} updated, ${batchProgress.skippedCount} skipped`);

      if (!hasMore) {
        console.log('🎯 No more products available');
        break;
      }

      console.log('⏳ Waiting 1 minute before next batch...');
      await new Promise((resolve) => setTimeout(resolve, 1 * 60 * 1000));
    }

    batchProgress.isRunning = false;
    batchProgress.estimatedCompletion = new Date();
    console.log('\n🎉 Progressive sync completed!');
    console.log(`📊 Final stats: ${batchProgress.syncedCount} created, ${batchProgress.updatedCount} updated, ${batchProgress.skippedCount} skipped`);
    console.log(`🖼️ Images downloaded: ${batchProgress.imageDownloadCount}`);
    console.log(`⏱️ Total time: ${((new Date() - batchProgress.startTime) / 1000 / 60).toFixed(2)} minutes`);
  } catch (error) {
    batchProgress.isRunning = false;
    console.error('❌ Progressive sync failed:', error);
  }
};

// 7. Get sync progress
export const getSyncProgress = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      data: {
        ...batchProgress,
        elapsedTime: batchProgress.startTime ? new Date() - batchProgress.startTime : 0,
        status: batchProgress.isRunning ? 'running' : 'completed',
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get sync progress',
      error: error.message,
    });
  }
};

// 8. Stop progressive sync
export const stopProgressiveSync = async (req, res) => {
  try {
    if (!batchProgress.isRunning) {
      return res.status(400).json({
        success: false,
        message: 'No sync is currently running',
      });
    }

    batchProgress.isRunning = false;

    res.status(200).json({
      success: true,
      message: 'Progressive sync stopped successfully',
      finalProgress: batchProgress,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to stop sync',
      error: error.message,
    });
  }
};

// 9. Get produk by item_group_id dengan real-time sizes dari Jubelio
export const getProductByGroupId = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { database_id } = req.query; // Add query parameter untuk database_id

    // 1. Get basic product info from database
    let product;

    if (database_id) {
      // Jika ada database_id query, cari berdasarkan database_id tapi tetap validate group
      product = await Product.findOne({
        where: {
          id: database_id,
          item_group_id: groupId, // Tetap validate groupId untuk security
        },
      });

      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found with specified database_id in this group',
        });
      }
    } else {
      // Default behavior - cari berdasarkan group_id
      product = await Product.findOne({
        where: {
          item_group_id: groupId,
        },
      });

      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found',
        });
      }
    }

    // 2. Get ALL variants dari database berdasarkan item_group_id yang sama
    const allVariants = await Product.findAll({
      where: {
        item_group_id: groupId,
      },
      order: [['nama_produk', 'ASC']],
    });

    // 3. Get real-time size info dari Jubelio
    let productSkus = [];
    let availableQuantities = {};
    let availableSizes = [];

    try {
      // Get token untuk fetch real-time data
      const token = await getJubelioToken();

      // Get first item_id dari group
      const catalogResponse = await axios.get(`${process.env.VITE_API_URL}/inventory/catalog/for-listing/${groupId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (catalogResponse.status === 200 && catalogResponse.data.length > 0) {
        const catalogData = catalogResponse.data[0];

        if (catalogData.variations && catalogData.variations.length > 0) {
          const firstItemId = catalogData.variations[0].item_id;

          // Fetch real-time SKU data
          const itemResponse = await axios.get(`${process.env.VITE_API_URL}/inventory/items/${firstItemId}`, {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });

          if (itemResponse.status === 200) {
            const itemData = itemResponse.data;

            // Set SKUs dan quantities
            if (itemData.product_skus && itemData.product_skus.length > 0) {
              productSkus = itemData.product_skus;

              // Set available quantities
              itemData.product_skus.forEach((sku) => {
                if (sku.variation_values && sku.variation_values[0]) {
                  const sizeValue = sku.variation_values[0].value;
                  availableQuantities[sizeValue] = sku.end_qty;

                  // Collect available sizes
                  if (!availableSizes.includes(sizeValue)) {
                    availableSizes.push(sizeValue);
                  }
                }
              });

              // Sort sizes logically
              availableSizes.sort((a, b) => {
                const sizeOrder = {
                  XS: 1,
                  S: 2,
                  M: 3,
                  L: 4,
                  XL: 5,
                  XXL: 6,
                  XXXL: 7,
                  28: 10,
                  29: 11,
                  30: 12,
                  31: 13,
                  32: 14,
                  33: 15,
                  34: 16,
                  35: 17,
                  36: 18,
                  37: 19,
                  38: 20,
                  39: 21,
                  40: 22,
                  41: 23,
                  42: 24,
                  43: 25,
                  44: 26,
                  45: 27,
                  46: 28,
                };

                const orderA = sizeOrder[a.toUpperCase()] || 999;
                const orderB = sizeOrder[b.toUpperCase()] || 999;

                if (orderA !== 999 && orderB !== 999) {
                  return orderA - orderB;
                }

                return a.localeCompare(b);
              });
            }
          }
        }
      }
    } catch (jubelioError) {
      console.error('Error fetching real-time data from Jubelio:', jubelioError);
      // Continue with database data only
    }

    // 4. Create variations array dengan database ID dan Jubelio data
    const variations = productSkus.map((sku) => {
      // Find matching product in database berdasarkan id_jubelio
      const matchingProduct = allVariants.find((variant) => variant.id_jubelio === sku.item_id.toString());

      return {
        // Database fields
        id: matchingProduct?.id || null, // Database primary key ID
        database_id: matchingProduct?.id || null, // Explicit database ID

        // Jubelio fields
        item_id: sku.item_id,
        item_name: `${product.nama_produk} - ${sku.variation_values?.[0]?.value || ''}`,
        sell_price: sku.sell_price,
        available_qty: sku.end_qty,
        variation_1_value: sku.variation_values?.[0]?.value || '',

        // Additional fields
        id_jubelio: sku.item_id.toString(),
        stok_database: matchingProduct?.stok || 0, // Stock dari database
        harga_database: matchingProduct?.harga || 0, // Harga dari database
      };
    });

    // 5. Format response seperti yang diharapkan frontend + database IDs
    const response = {
      // Basic product info
      item_group_name: product.nama_produk,
      description: product.deskripsi,
      images: product.images || [],
      category_id: product.category_id,
      category_name: product.category_name,

      // Real-time dari Jubelio
      product_skus: productSkus,
      available_quantities: availableQuantities,
      available_sizes: availableSizes,

      // Enhanced variations dengan database IDs
      variations: variations,

      // Database variants info
      database_variants: allVariants.map((variant) => ({
        id: variant.id, // Database primary key
        id_jubelio: variant.id_jubelio,
        nama_produk: variant.nama_produk,
        harga: variant.harga,
        stok: variant.stok,
        category_name: variant.category_name,
        created_at: variant.created_at,
        updated_at: variant.updated_at,
      })),

      // Summary info
      total_variants_in_database: allVariants.length,
      total_variants_in_jubelio: productSkus.length,

      // Add search context for debugging
      search_context: {
        searched_by: database_id ? 'database_id' : 'group_id',
        database_id: database_id || null,
        group_id: groupId,
        found_product_id: product.id,
      },
    };

    res.status(200).json({
      success: true,
      data: response,
    });
  } catch (error) {
    console.error('Error getting product by group ID:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get product',
      error: error.message,
    });
  }
};

// 10. Get semua produk dari database lokal (prioritas yang ada stok)
export const getAllProducts = async (req, res) => {
  try {
    const { page, limit, search, stock_filter, category } = req.query;

    // Jika tidak ada query parameters, return semua products
    if (!page && !limit && !search && !stock_filter && !category) {
      const allProducts = await Product.findAll({
        order: [['created_at', 'DESC']],
      });

      return res.status(200).json({
        success: true,
        data: allProducts,
        total: allProducts.length,
      });
    }

    // Jika ada query parameters, gunakan pagination dan filtering
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 20;
    const offset = (pageNum - 1) * limitNum;

    let whereClause = {};
    let orderClause = [];

    if (search) {
      whereClause.nama_produk = {
        [Op.iLike]: `%${search}%`,
      };
    }

    // Category filter
    if (category) {
      whereClause.category_name = {
        [Op.iLike]: `%${category}%`,
      };
    }

    // Stock filtering options
    if (stock_filter === 'with_stock') {
      whereClause.stok = { [Op.gt]: 0 };
    } else if (stock_filter === 'without_stock') {
      whereClause.stok = { [Op.eq]: 0 };
    }

    if (stock_filter === 'priority') {
      orderClause = [
        ['stok', 'DESC'],
        ['created_at', 'DESC'],
      ];
    } else {
      orderClause = [['created_at', 'DESC']];
    }

    const products = await Product.findAndCountAll({
      where: whereClause,
      limit: limitNum,
      offset: offset,
      order: orderClause,
    });

    res.status(200).json({
      success: true,
      data: products.rows,
      pagination: {
        total: products.count,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(products.count / limitNum),
      },
    });
  } catch (error) {
    console.error('Error getting products:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get products',
      error: error.message,
    });
  }
};

// 11. Get produk by ID
export const getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findByPk(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error) {
    console.error('Error getting product:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get product',
      error: error.message,
    });
  }
};

// 12. Update produk (kecuali nama dan stok) dengan file upload
export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { deskripsi, harga, imagesToDelete } = req.body;

    const product = await Product.findByPk(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    const updateData = {};
    if (deskripsi !== undefined) updateData.deskripsi = deskripsi;
    if (harga !== undefined) updateData.harga = harga;

    // Handle existing images
    let currentImages = [];
    try {
      currentImages = product.images ? JSON.parse(JSON.stringify(product.images)) : [];
    } catch (e) {
      currentImages = [];
    }

    // Handle images to delete
    if (imagesToDelete) {
      try {
        const toDelete = JSON.parse(imagesToDelete);
        toDelete.forEach((imageToDelete) => {
          // Remove from file system
          if (imageToDelete.url && imageToDelete.url.startsWith('upload/products/')) {
            const oldImagePath = path.join(__dirname, '../', imageToDelete.url);
            if (fs.existsSync(oldImagePath)) {
              fs.unlinkSync(oldImagePath);
            }
          }
          // Remove from currentImages array
          currentImages = currentImages.filter((img) => img.url !== imageToDelete.url);
        });
      } catch (e) {
        console.error('Error parsing imagesToDelete:', e);
      }
    }

    // Handle new images upload
    if (req.files && req.files.length > 0) {
      try {
        // Process each uploaded file
        for (let i = 0; i < req.files.length; i++) {
          const file = req.files[i];
          const outputFileName = `product_${id}_${Date.now()}_${i + 1}`;
          const webpPath = await convertUploadedImageToWebP(file.path, outputFileName);

          if (webpPath) {
            // Find next index for new image
            const nextIndex = currentImages.length + 1;

            const newImageData = {
              url: webpPath,
              index: nextIndex,
              thumbnail: webpPath,
              original_url: null,
              group_image_id: `new_${Date.now()}_${i}`,
            };

            currentImages.push(newImageData);
          }
        }
      } catch (imageError) {
        console.error('Error processing uploaded images:', imageError);
      }
    }

    // Handle single file upload (backward compatibility)
    if (req.file) {
      try {
        const outputFileName = `product_${id}_${Date.now()}`;
        const webpPath = await convertUploadedImageToWebP(req.file.path, outputFileName);

        if (webpPath) {
          // Update thumbnail
          updateData.thumbnail = webpPath;

          // If it's the first image or replacing first image, update thumbnail
          if (currentImages.length === 0) {
            const newImageData = {
              url: webpPath,
              index: 1,
              thumbnail: webpPath,
              original_url: null,
              group_image_id: `new_${Date.now()}`,
            };
            currentImages.push(newImageData);
          } else {
            // Replace first image
            currentImages[0] = {
              ...currentImages[0],
              url: webpPath,
              thumbnail: webpPath,
            };
          }

          // Delete old thumbnail if exists
          if (product.thumbnail && product.thumbnail.startsWith('upload/products/') && product.thumbnail !== webpPath) {
            const oldImagePath = path.join(__dirname, '../', product.thumbnail);
            if (fs.existsSync(oldImagePath)) {
              fs.unlinkSync(oldImagePath);
            }
          }
        }
      } catch (imageError) {
        console.error('Error processing uploaded image:', imageError);
      }
    }

    // Update images data
    if (currentImages.length > 0) {
      updateData.images = currentImages;
      // Set thumbnail to first image if not already set
      if (!updateData.thumbnail || currentImages[0]) {
        updateData.thumbnail = currentImages[0]?.url || updateData.thumbnail;
      }
    }

    const updatedProduct = await product.update(updateData);

    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      data: updatedProduct,
    });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update product',
      error: error.message,
    });
  }
};

// 13. Delete produk
export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findByPk(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    // Hapus folder gambar jika ada
    if (product.images_folder) {
      const folderPath = path.join(__dirname, '../', product.images_folder);
      if (fs.existsSync(folderPath)) {
        fs.rmSync(folderPath, { recursive: true, force: true });
      }
    }

    await product.destroy();

    res.status(200).json({
      success: true,
      message: 'Product deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete product',
      error: error.message,
    });
  }
};

// 14. Get produk by kategori (prioritas yang ada stok)
export const getProductsByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const { limit = 8 } = req.query;

    const categoryMapping = {
      apparel: ['T-Shirt', 'Shirt', 'Hoodie', 'Tee', 'Top'],
      footwear: ['Sneakers', 'Shoes', 'Boot', 'Sandal'],
      accessories: ['Cap', 'Bag', 'Watch', 'Hat', 'Belt'],
    };

    let products;
    if (categoryMapping[category]) {
      const keywords = categoryMapping[category];
      const whereConditions = keywords.map((keyword) => ({
        nama_produk: {
          [Op.iLike]: `%${keyword}%`,
        },
      }));

      products = await Product.findAll({
        where: {
          [Op.or]: whereConditions,
        },
        limit: parseInt(limit),
        order: [
          ['stok', 'DESC'],
          ['updated_at', 'DESC'],
        ], // Prioritas stok > 0
      });
    } else {
      products = await Product.findAll({
        limit: parseInt(limit),
        order: [
          ['stok', 'DESC'],
          ['updated_at', 'DESC'],
        ],
      });
    }

    res.status(200).json({
      success: true,
      data: products,
    });
  } catch (error) {
    console.error('Error getting products by category:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get products by category',
      error: error.message,
    });
  }
};

// Legacy function untuk backward compatibility
export const syncProductsFromJubelio = async (req, res) => {
  return syncProductsProgressively(req, res);
};

// Auto sync menggunakan progressive method
export const autoSyncProducts = async () => {
  try {
    if (batchProgress.isRunning) {
      console.log('⚠️  Progressive sync already running, skipping auto sync');
      return { message: 'Sync already in progress' };
    }

    console.log('🔄 Starting auto sync with progressive method...');
    progressiveSyncWorker();

    return { message: 'Auto sync started successfully' };
  } catch (error) {
    console.error('❌ Auto sync failed:', error);
    throw error;
  }
};

export const fetchCategoryMapping = async (token) => {
  try {
    console.log('📂 Fetching category mapping from Jubelio...');

    const response = await axios.get(`${process.env.VITE_API_URL}/inventory/categories/item-categories/`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.status !== 200) {
      console.warn('⚠️ Failed to fetch categories, using empty mapping');
      return new Map();
    }

    const categories = response.data || [];
    const categoryMap = new Map();

    // Create mapping: category_id -> {category_name, parent_id}
    categories.forEach((category) => {
      categoryMap.set(category.category_id, {
        category_name: category.category_name,
        parent_id: category.parent_id,
      });
    });

    console.log(`📂 Loaded ${categoryMap.size} categories into mapping`);
    return categoryMap;
  } catch (error) {
    console.error('Error fetching category mapping:', error);
    return new Map(); // Return empty map as fallback
  }
};

export const getCategories = async (req, res) => {
  try {
    // Get unique categories from products
    const categories = await Product.findAll({
      attributes: ['category_id', 'category_name', 'category_parent_id', [Product.sequelize.fn('COUNT', '*'), 'product_count']],
      where: {
        category_name: {
          [Op.not]: null,
        },
      },
      group: ['category_id', 'category_name', 'category_parent_id'],
      order: [['category_name', 'ASC']],
      raw: true,
    });

    res.status(200).json({
      success: true,
      data: categories,
    });
  } catch (error) {
    console.error('Error getting categories:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get categories',
      error: error.message,
    });
  }
};
