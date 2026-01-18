
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// 1. Configuration
const COUNT = 1200; // Generate 1200 orders for stress testing
const OUTPUT_FILE = path.join(process.cwd(), 'stress_test_data.xlsx');

// 2. Helper functions for random data
function randomInRange(min, max) {
    return Math.random() * (max - min) + min;
}

function randomInt(min, max) {
    return Math.floor(randomInRange(min, max));
}

function randomElement(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

// Shanghai / Suzhou approximate bounds
// Lat: 30.8 - 31.5, Lng: 120.5 - 121.9
function randomCoord() {
    // Center around Shanghai to simulate density
    const latBase = 31.2304;
    const lngBase = 121.4737;
    // Spread roughly 50km
    const latOffset = randomInRange(-0.4, 0.4);
    const lngOffset = randomInRange(-0.4, 0.4);

    // Note: In real scenarios, these would be valid addresses.
    // For this test, our system might try to geocode these.
    // If we input coordinates directly (if supported) that's better,
    // but the CSV importer usually takes Address strings.
    // To stress test geocoding, we should generate realistic-looking address strings
    // OR inject already geocoded data if the parser supports "lat/lng" columns.
    // Let's assume we provide lat/lng in columns to bypass geocoding limit if needed,
    // or just realistic fake addresses.

    return { lat: latBase + latOffset, lng: lngBase + lngOffset };
}

// 3. Generate Data
const data = [];
// Headers
data.push(["订单号", "客户名称", "地址", "重量(kg)", "体积(m3)", "件数", "期望送达时间", "备注", "纬度", "经度"]);

for (let i = 0; i < COUNT; i++) {
    const id = `ORD-${String(i + 1).padStart(5, '0')}`;
    const customers = ["联华超市", "全家便利", "罗森", "7-11", "农工商", "大润发", "沃尔玛", "盒马鲜生"];
    const customer = randomElement(customers) + "-" + randomInt(1, 999) + "号店";

    // Simulate data distribution
    // 80% small orders (10-200kg), 15% medium (200-1000kg), 5% large (1000kg+)
    let weight;
    const r = Math.random();
    if (r < 0.8) weight = randomInt(10, 200);
    else if (r < 0.95) weight = randomInt(200, 1000);
    else weight = randomInt(1000, 3000);

    const volume = parseFloat((weight / 333).toFixed(2)); // Rough density estimate
    const qty = Math.ceil(weight / 10);

    const coord = randomCoord();

    const row = [
        id,                     // Order No
        customer,               // Customer Name
        `测试地址_上海市_${randomInt(1, 1000)}号`, // Address (Dummy)
        weight,                 // Weight
        volume,                 // Volume
        qty,                    // Qty
        "2024-05-20 18:00",     // Deadline
        i % 20 === 0 ? "需要飞翼车" : "", // Random Constraints
        coord.lat.toFixed(6),   // Latitude (Optimization: Direct coords)
        coord.lng.toFixed(6)    // Longitude
    ];
    data.push(row);
}

// 4. Write Excel
const wb = XLSX.utils.book_new();
const ws = XLSX.utils.aoa_to_sheet(data);
XLSX.utils.book_append_sheet(wb, ws, "Orders");
XLSX.writeFile(wb, OUTPUT_FILE);

console.log(`Successfully generated ${COUNT} orders to ${OUTPUT_FILE}`);
