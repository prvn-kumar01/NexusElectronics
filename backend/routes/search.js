const express = require('express');
const router = express.Router();
const Product = require('../models/product');
const { embedText } = require('../services/embeddingService');
const { queryByVector } = require('../pineconeClient');

/**
 * @swagger
 * /api/search:
 *   get:
 *     summary: Search for products
 *     description: Retrieve a list of products that match the provided search query. Uses Semantic Vector Search via Pinecone, falling back to basic text match.
 *     tags:
 *       - Search
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         required: false
 *         description: The search query.
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         required: false
 *         description: The page number for pagination.
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         required: false
 *         description: The number of items per page.
 *     responses:
 *       200:
 *         description: A paginated list of products matching the search query.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 products:
 *                   type: array
 *                   items:
 *                     type: object
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     pages:
 *                       type: integer
 *       500:
 *         description: An internal server error occurred.
 */
router.get('/', async (req, res) => {
  try {
    const query = req.query.q;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Fast path: no query
    if (!query || query.trim().length === 0) {
      const [products, total] = await Promise.all([
        Product.find().skip(skip).limit(limit).lean(),
        Product.countDocuments()
      ]);
      return res.json({
        products,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) }
      });
    }

    try {
      // 1. Generate embedding for search query
      const vector = await embedText(query);

      // 2. Query Pinecone (fetch enough to cover pagination)
      const topK = Math.max(limit * page, 50); 
      const { matches } = await queryByVector(vector, topK);

      // 3. Load products from MongoDB
      const mongoIds = matches.map(m => m.metadata.mongoId).filter(Boolean);
      const total = mongoIds.length;
      const paginatedIds = mongoIds.slice(skip, skip + limit);
      
      const products = await Product.find({ _id: { $in: paginatedIds } }).lean();

      // 4. Return products in relevance order
      const idToProduct = new Map(products.map(p => [p._id.toString(), p]));
      const sortedProducts = paginatedIds
        .map(id => idToProduct.get(id))
        .filter(Boolean);

      return res.json({
        products: sortedProducts,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) }
      });
    } catch (error) {
      console.error('Vector search failed, falling back to regex:', error);

      // Fallback to regex search
      const queryRegex = new RegExp(query, 'i');
      const [products, total] = await Promise.all([
        Product.find({
          $or: [{ name: queryRegex }, { description: queryRegex }]
        }).skip(skip).limit(limit).lean(),
        Product.countDocuments({
          $or: [{ name: queryRegex }, { description: queryRegex }]
        })
      ]);
      
      return res.json({
        products,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) }
      });
    }
  } catch (error) {
    console.error('Error searching products:', error);
    res.status(500).json({ error: 'An error occurred during the search.' });
  }
});

module.exports = router;
