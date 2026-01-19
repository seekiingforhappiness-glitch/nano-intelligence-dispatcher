import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * 数据库初始化端点
 * GET /api/db/init - 手动触发 prisma db push
 */
export async function GET(request: NextRequest) {
    try {
        console.log('🔧 Starting database initialization...');

        // 确保 data 目录存在
        await execAsync('mkdir -p /app/data', { timeout: 10000 });

        // 执行 prisma db push
        const { stdout, stderr } = await execAsync('npx prisma db push --accept-data-loss', {
            cwd: '/app',
            env: { ...process.env },
            timeout: 60000,
        });

        console.log('✅ Database initialized successfully');
        console.log('stdout:', stdout);
        if (stderr) console.log('stderr:', stderr);

        return NextResponse.json({
            success: true,
            message: '数据库表结构初始化成功',
            output: stdout,
        });
    } catch (error) {
        console.error('❌ Database initialization failed:', error);
        return NextResponse.json({
            success: false,
            error: (error as Error).message,
        }, { status: 500 });
    }
}
