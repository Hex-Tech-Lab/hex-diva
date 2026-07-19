import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export const dynamic = 'force-dynamic';

/**
 * POST /api/cart
 * Initialize or retrieve a session-based shopping cart
 *
 * For authenticated users: links to user_id
 * For guests: uses session_id (stored in cookie)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase();

    // Get or create session ID (stored in cookie)
    const cookieHeader = request.headers.get('cookie') || '';
    let sessionId = extractSessionId(cookieHeader);

    if (!sessionId) {
      sessionId = uuidv4();
    }

    // Try to find existing cart for this session
    const { data: existingCart } = await (supabase
      .from('carts' as any)
      .select('*')
      .eq('session_id', sessionId)
      .maybeSingle() as any);

    let cart = existingCart;

    // Create new cart if none exists
    if (!cart) {
      const { data: newCart, error } = await (supabase
        .from('carts' as any)
        .insert({
          id: uuidv4(),
          session_id: sessionId,
          items: [],
          subtotal: 0,
          tax: 0,
          shipping: 0,
          total: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single() as any);

      if (error) {
        console.error('Error creating cart:', error);
        return NextResponse.json(
          { error: 'Failed to create cart' },
          { status: 500 }
        );
      }

      cart = newCart;
    }

    const response = NextResponse.json(cart);

    // Set session ID in cookie (1 year expiry)
    response.cookies.set('cart-session-id', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 365 * 24 * 60 * 60,
      path: '/',
    });

    return response;
  } catch (error: any) {
    console.error('Error in POST /api/cart:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/cart
 * Retrieve the current shopping cart by session ID
 */
export async function GET(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get('cookie') || '';
    const sessionId = extractSessionId(cookieHeader);

    if (!sessionId) {
      // Return empty cart for guests without a session
      return NextResponse.json({
        id: null,
        session_id: null,
        items: [],
        subtotal: 0,
        tax: 0,
        shipping: 0,
        total: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    const supabase = getSupabase();

    const { data: cart, error } = await (supabase
      .from('carts' as any)
      .select('*')
      .eq('session_id', sessionId)
      .single() as any);

    if (error) {
      console.error('Error fetching cart:', error);
      return NextResponse.json(
        { error: 'Failed to fetch cart' },
        { status: 500 }
      );
    }

    return NextResponse.json(cart || {
      id: null,
      session_id: sessionId,
      items: [],
      subtotal: 0,
      tax: 0,
      shipping: 0,
      total: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error in GET /api/cart:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Extract session ID from cookie header
 */
function extractSessionId(cookieHeader: string): string | null {
  const cookies = cookieHeader.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'cart-session-id' && value) {
      return decodeURIComponent(value);
    }
  }
  return null;
}
