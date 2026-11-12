const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve, dirname } = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const XLSX = require('xlsx');
const photos = require('../src/utils/product-images.ts');
const { productPhotoPlacement, DEFAULT_PRODUCT_PHOTO_OPTIONS: defaults } = require('../src/utils/product-photo-format.ts');
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
const ordered = photos.moveProductImage(urls.join(', '), 4, 0);
assert.deepEqual(photos.productImages(ordered), [urls[4], ...urls.slice(0, 4)]);
assert.equal(photos.primaryProductImage(ordered), urls[4]);
assert.deepEqual(photos.productImages(photos.moveProductImage(ordered, 0, 4)), urls);
assert.equal(photos.moveProductImage(ordered, -1, 0), ordered);
assert.equal(photos.moveProductImage(ordered, 0, 5), ordered);
assert.equal(photos.moveProductImage(ordered, 0, 0), ordered);
// A landscape photo stays whole on the 1080 x 1350 white canvas.
assert.deepEqual(productPhotoPlacement(2000, 1000), { x: 0, y: 405, width: 1080, height: 540 });
assert.deepEqual(productPhotoPlacement(1000, 2000), { x: 202.5, y: 0, width: 675, height: 1350 });
assert.deepEqual(productPhotoPlacement(1080, 1350), { x: 0, y: 0, width: 1080, height: 1350 });
const crop = { ...defaults, fit: 'cover' };
assert.deepEqual(productPhotoPlacement(2000, 1000, crop), { x: -810, y: 0, width: 2700, height: 1350 });
assert.ok(productPhotoPlacement(2000, 1000, { ...crop, positionX: 0 }).x === 0);
assert.equal(productPhotoPlacement(2000, 1000, { ...crop, positionX: 100 }).x, -1620);
// Zoom can crop a photo that has already been fitted to 4:5.
assert.deepEqual(productPhotoPlacement(1080, 1350, { ...crop, zoom: 2 }), { x: -540, y: -675, width: 2160, height: 2700 });
assert.throws(() => productPhotoPlacement(0, 100), /dimensiones/);
console.log(JSON.stringify({ xlsxRoundTrip: true, photosPerProduct: 5, variantRows: rows.length,
    reorderAndCover: true, format4x5: true, cropPositionAndZoom: true }));
