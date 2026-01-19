import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * 数据库初始化端点
 * GET /api/db/init - 手动创建 SQLite 表结构
 */
export async function GET(request: NextRequest) {
    try {
        console.log('🔧 Starting database initialization...');

        // 创建 organizations 表
        await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS organizations (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

        // 创建 users 表
        await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        name TEXT,
        hashedPassword TEXT,
        role TEXT DEFAULT 'member',
        organizationId TEXT NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (organizationId) REFERENCES organizations(id)
      )
    `);

        // 创建 warehouses 表
        await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS warehouses (
        id TEXT PRIMARY KEY,
        code TEXT NOT NULL,
        name TEXT NOT NULL,
        address TEXT NOT NULL,
        lat REAL NOT NULL,
        lng REAL NOT NULL,
        timeWindowStart TEXT,
        timeWindowEnd TEXT,
        capacity INTEGER,
        notes TEXT,
        active INTEGER DEFAULT 1,
        organizationId TEXT NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (organizationId) REFERENCES organizations(id),
        UNIQUE (organizationId, code)
      )
    `);

        // 创建 drivers 表
        await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS drivers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        phone TEXT,
        licenseType TEXT,
        status TEXT DEFAULT 'active',
        organizationId TEXT NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (organizationId) REFERENCES organizations(id)
      )
    `);

        // 创建 vehicles 表
        await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS vehicles (
        id TEXT PRIMARY KEY,
        plateNumber TEXT NOT NULL,
        vehicleType TEXT,
        capacityWeight REAL,
        capacityVolume REAL,
        status TEXT DEFAULT 'idle',
        organizationId TEXT NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (organizationId) REFERENCES organizations(id),
        UNIQUE (organizationId, plateNumber)
      )
    `);

        // 创建 orders 表
        await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        orderNumber TEXT NOT NULL,
        customerName TEXT,
        address TEXT NOT NULL,
        latitude REAL,
        longitude REAL,
        weight REAL,
        volume REAL,
        quantity INTEGER,
        deliveryDate DATETIME,
        timeWindow TEXT,
        requirements TEXT,
        status TEXT DEFAULT 'pending',
        organizationId TEXT NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (organizationId) REFERENCES organizations(id),
        UNIQUE (organizationId, orderNumber)
      )
    `);

        // 创建 tasks 表
        await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        status TEXT NOT NULL,
        progress TEXT,
        result TEXT,
        error TEXT,
        meta TEXT,
        organizationId TEXT NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (organizationId) REFERENCES organizations(id)
      )
    `);

        // 创建 shipments 表
        await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS shipments (
        id TEXT PRIMARY KEY,
        shipmentNumber TEXT NOT NULL,
        driverId TEXT,
        vehicleId TEXT,
        departureTime DATETIME,
        estimatedArrival DATETIME,
        totalWeight REAL,
        totalDistance REAL,
        totalCost REAL,
        status TEXT DEFAULT 'draft',
        organizationId TEXT NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (organizationId) REFERENCES organizations(id),
        FOREIGN KEY (driverId) REFERENCES drivers(id),
        FOREIGN KEY (vehicleId) REFERENCES vehicles(id),
        UNIQUE (organizationId, shipmentNumber)
      )
    `);

        // 创建 shipment_orders 表
        await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS shipment_orders (
        shipmentId TEXT NOT NULL,
        orderId TEXT NOT NULL,
        sequenceNumber INTEGER NOT NULL,
        PRIMARY KEY (shipmentId, orderId),
        FOREIGN KEY (shipmentId) REFERENCES shipments(id),
        FOREIGN KEY (orderId) REFERENCES orders(id)
      )
    `);

        // 创建 geo_cache 表
        await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS geo_cache (
        id TEXT PRIMARY KEY,
        addressHash TEXT UNIQUE NOT NULL,
        originalAddress TEXT NOT NULL,
        normalizedAddress TEXT,
        formattedAddress TEXT,
        lng REAL NOT NULL,
        lat REAL NOT NULL,
        source TEXT NOT NULL,
        hitCount INTEGER DEFAULT 1,
        lastUsedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

        // 创建索引
        await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_geo_cache_hash ON geo_cache(addressHash)
    `);

        console.log('✅ All tables created successfully');

        return NextResponse.json({
            success: true,
            message: '数据库表结构初始化成功！请刷新仓库管理页面。',
            tables: ['organizations', 'users', 'warehouses', 'drivers', 'vehicles', 'orders', 'tasks', 'shipments', 'shipment_orders', 'geo_cache'],
        });
    } catch (error) {
        console.error('❌ Database initialization failed:', error);
        return NextResponse.json({
            success: false,
            error: (error as Error).message,
        }, { status: 500 });
    }
}
