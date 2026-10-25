const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve, dirname } = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const XLSX = require('xlsx');
const photos = require('../src/utils/product-images.ts');
const file = resolve(__dirname, '../src/utils/exportInventoryToExcel.ts');
const compiled = new Module(file, module);
compiled.filename = file;
compiled.paths = Module._nodeModulePaths(dirname(file));
let workbookBuffer;
compiled.require = (name) => {
    if (name === '@/utils/product-images') return photos;
    if (name === 'xlsx') return { ...XLSX, writeFile: (workbook) => {
        workbookBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
    } };
    return require(name);
};
compiled._compile(ts.transpileModule(readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, file);
const urls = Array.from({ length: 5 }, (_, index) => `https://res.cloudinary.com/demo/image/upload/photo-${index}.jpg`);
compiled.exports.exportInventoryToExcel([{
    productID: 'product-1', name: 'Boot', image: urls.join(', '), description: 'ERP description',
    slug: 'boot', brand: 'Desi', genre: 'Unisex', categoryID: null,
    variations: ['38', '39'].map((size) => ({ sku: `BOOT-${size}`, variation: size,
        storeProducts: [{ stock: 10, priceCost: 2000, priceList: 5000 }] })),
}], []);
const workbook = XLSX.read(workbookBuffer, { type: 'buffer' });
const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { defval: '' });
assert.equal(rows.length, 2);
for (const row of rows) {
    assert.equal(row.Imagen, urls.join(', '));
    assert.equal(photos.isValidProductImageList(row.Imagen), true);
    assert.deepEqual(photos.productImages(row.Imagen), urls);
    assert.equal(photos.primaryProductImage(row.Imagen), urls[0]);
}
assert.equal(photos.isValidProductImageList([...urls, 'https://example.test/sixth.jpg'].join(',')), false);
assert.equal(photos.isValidProductImageList('javascript:alert(1)'), false);
console.log(JSON.stringify({ xlsxRoundTrip: true, photosPerProduct: 5, variantRows: rows.length }));
