import { NextRequest, NextResponse } from 'next/server';
import { parseExcelFile, getSheetData, detectFieldMapping, parseOrders } from '@/lib/parser/excel';
import { v4 as uuidv4 } from 'uuid';
import prisma from '@/lib/prisma';
import { getCurrentOrganizationId } from '@/lib/server/context';

export async function POST(req: NextRequest) {
    try {
        const orgId = await getCurrentOrganizationId();

        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        const buffer = await file.arrayBuffer();
        const { workbook, sheetNames } = parseExcelFile(buffer, file.name);
        const sheetName = sheetNames[0]; // Default to first sheet
        const { headers, rows } = getSheetData(workbook, sheetName);
        const { detectedMapping } = detectFieldMapping(headers);
        const rawOrders = parseOrders(rows, detectedMapping);

        // Prepare data for bulk insert
        const validOrders = rawOrders.filter(order => order.orderId || order.address).map(order => ({
            id: uuidv4(),
            organizationId: orgId,
            orderNumber: order.orderId || `AUTO-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            customerName: order.customerName,
            address: order.address,
            weight: order.weightKg ? parseFloat(String(order.weightKg)) : null,
            quantity: order.quantity || 1,
            deliveryDate: order.deliveryDate ? new Date(order.deliveryDate) : null,
            requirements: typeof order.requirementsRaw === 'object' ? JSON.stringify(order.requirementsRaw) : String(order.requirementsRaw || ''),
            status: 'pending'
        }));

        if (validOrders.length === 0) {
            return NextResponse.json({ success: true, count: 0, total: 0 });
        }

        // Use transaction for consistency, though createMany is also efficient
        // We use createMany which is supported in Postgres
        const result = await prisma.order.createMany({
            data: validOrders,
        });

        return NextResponse.json({
            success: true,
            count: result.count,
            total: rawOrders.length
        });

    } catch (error: any) {
        console.error('Import error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

