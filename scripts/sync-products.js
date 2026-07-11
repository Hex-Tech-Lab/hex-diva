#!/usr/bin/env node

/**
 * Product Import & Sync Script for Hex-Diva
 * Imports 100 SKU product database into Supabase
 * Usage: pnpm sync-products
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

function generateProductData() {
  const categories = {
    eyelashes: { count: 40, priceRange: [35, 60], costRange: [8, 12], type: 'Eyelashes', collection: 'Sculpted Lashes' },
    nails: { count: 35, priceRange: [48, 80], costRange: [12, 20], type: 'Nails', collection: 'Artisan Nails' },
    sponges: { count: 15, priceRange: [12, 25], costRange: [2, 5], type: 'Makeup Sponges', collection: 'Makeup Essentials' },
    packaging: { count: 10, priceRange: [20, 45], costRange: [3, 8], type: 'Premium Packaging', collection: 'Premium Packaging' },
  };

  const products = [];
  for (const [catKey, cat] of Object.entries(categories)) {
    for (let i = 0; i < cat.count; i++) {
      const supplier_cost = Math.random() * (cat.costRange[1] - cat.costRange[0]) + cat.costRange[0];
      const retail_price = Math.random() * (cat.priceRange[1] - cat.priceRange[0]) + cat.priceRange[0];
      const gross_margin = ((retail_price - supplier_cost) / retail_price) * 100;

      products.push({
        sku: `${catKey.toUpperCase().substring(0, 2)}-${String(i + 1).padStart(3, '0')}`,
        name: `${cat.type} Product ${i + 1}`,
        description: `Premium ${cat.type.toLowerCase()} product`,
        category: cat.type,
        collection: cat.collection,
        price: parseFloat(retail_price.toFixed(2)),
        supplier_cost: parseFloat(supplier_cost.toFixed(2)),
        gross_margin_percent: parseFloat(gross_margin.toFixed(2)),
        supplier_name: 'Premium Supplier',
        b2b_bronze_price: parseFloat((retail_price * 0.75).toFixed(2)),
        b2b_silver_price: parseFloat((retail_price * 0.65).toFixed(2)),
        b2b_gold_price: parseFloat((retail_price * 0.50).toFixed(2)),
        inventory: Math.floor(Math.random() * 500) + 50,
        image_url: 'https://images.unsplash.com/photo-1579465005712-4ee4688041ee?w=500&h=500&fit=crop',
        tags: [cat.type.toLowerCase(), 'luxury'],
        trending_on_tiktok: Math.random() > 0.5,
        trending_on_instagram: Math.random() > 0.5,
        viral_score: parseFloat((Math.random() * 10).toFixed(1)),
      });
    }
  }
  return products;
}

async function importProducts(products) {
  console.log(`Starting import of ${products.length} products...`);

  const collections = {};
  const uniqueCollections = [...new Set(products.map(p => p.collection))];

  console.log(`\nSetting up ${uniqueCollections.length} collections...`);
  for (const collectionName of uniqueCollections) {
    const { data } = await supabase.from('collections').select('id').eq('title', collectionName).single();
    if (!data) {
      const { data: newCollection } = await supabase.from('collections').insert({
        title: collectionName,
        handle: collectionName.toLowerCase().replace(/\s+/g, '-'),
        description: `${collectionName} collection from Hex-Diva`,
      }).select('id').single();
      if (newCollection) {
        collections[collectionName] = newCollection.id;
        console.log(`✓ Created collection: ${collectionName}`);
      }
    } else {
      collections[collectionName] = data.id;
    }
  }

  const batchSize = 50;
  let importedCount = 0;

  for (let i = 0; i < products.length; i += batchSize) {
    const batch = products.slice(i, i + batchSize);
    const { data } = await supabase.from('products').insert(batch.map(p => ({
      name: p.name,
      description: p.description,
      sku: p.sku,
      price: p.price,
      category: p.category,
      image_url: p.image_url,
      inventory: p.inventory,
      in_stock: p.inventory > 0,
      supplier_cost: p.supplier_cost,
      gross_margin_percent: p.gross_margin_percent,
      supplier_name: p.supplier_name,
      b2b_bronze_price: p.b2b_bronze_price,
      b2b_silver_price: p.b2b_silver_price,
      b2b_gold_price: p.b2b_gold_price,
      tags: p.tags,
      trending_on_tiktok: p.trending_on_tiktok,
      trending_on_instagram: p.trending_on_instagram,
      viral_score: p.viral_score,
    }))).select('id');

    if (data) {
      for (let j = 0; j < batch.length; j++) {
        const collectionId = collections[batch[j].collection];
        if (collectionId) {
          await supabase.from('product_collections').insert({
            product_id: data[j].id,
            collection_id: collectionId,
          });
        }
      }
    }

    importedCount += batch.length;
    console.log(`✓ Imported ${importedCount}/${products.length} products`);
  }

  console.log(`\n✅ Successfully imported ${importedCount} products`);
}

async function main() {
  try {
    console.log('🚀 Hex-Diva Product Import & Sync Script\n');
    const products = generateProductData();
    console.log(`✓ Generated ${products.length} SKUs\n`);
    await importProducts(products);
    console.log('\n✅ Import completed successfully!');
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

main();
