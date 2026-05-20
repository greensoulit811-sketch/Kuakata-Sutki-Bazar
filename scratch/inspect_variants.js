import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://keccdkszsyyeuczfjuxp.supabase.co";
const supabaseKey = "sb_publishable_PF2muBDOIu3qsdZ7rhhHzw_SgHvAmUm"; // This is the anon key, but wait, does it have RLS bypassed or do we have it? Let's check.
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Fetching products...");
  const { data: products, error: pError } = await supabase
    .from('products')
    .select('id, name, price, sale_price, is_variable');
  
  if (pError) {
    console.error("Error fetching products:", pError);
    return;
  }

  console.log(`Found ${products.length} products:`);
  products.forEach(p => {
    console.log(`- [${p.id}] ${p.name} | Price: ${p.price} | Sale Price: ${p.sale_price} | Is Variable: ${p.is_variable}`);
  });

  console.log("\nFetching product_variants...");
  const { data: variants, error: vError } = await supabase
    .from('product_variants')
    .select('*');

  if (vError) {
    console.error("Error fetching variants:", vError);
    return;
  }

  console.log(`Found ${variants.length} variants:`);
  variants.forEach(v => {
    console.log(`- Variant ID: ${v.id} | Product ID: ${v.product_id} | Size: ${v.size} | Color: ${v.color} | SKU: ${v.sku} | Price Adj: ${v.price_adjustment} | Price: ${v.variant_price} | Sale Price: ${v.variant_sale_price} | Stock: ${v.stock}`);
  });
}

run();
