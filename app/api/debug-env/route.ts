import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    if (process.env.NODE_ENV !== 'development') {
        return new NextResponse('Forbidden', { status: 403 });
    }

    const amapKey = process.env.AMAP_KEY;
    const amapJsKey = process.env.NEXT_PUBLIC_AMAP_JS_KEY;

    return NextResponse.json({
        amapKeyLoaded: !!amapKey,
        amapKeyPreview: amapKey ? `${amapKey.slice(0, 4)}***${amapKey.slice(-4)}` : null,
        amapJsKeyLoaded: !!amapJsKey,
        nodeEnv: process.env.NODE_ENV,
        cwd: process.cwd(),
    });
}
