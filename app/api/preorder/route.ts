import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const data = await request.json();

    // Validate required fields
    if (!data.fullName || !data.email || !data.boxType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Log the data (in production, you would save to database)
    console.log('Pre-order received:', {
      fullName: data.fullName,
      email: data.email,
      phone: data.phone,
      boxType: data.boxType,
      wantsPersonalization: data.wantsPersonalization,
      preferences: data.preferences,
      sizes: data.sizes,
      timestamp: new Date().toISOString(),
    });

    // TODO: In production, you would:
    // 1. Save to PostgreSQL database
    // 2. Send confirmation email via Resend/SendGrid
    // 3. Add to email marketing list
    
    // Example database save (uncomment when you set up database):
    /*
    const { Pool } = require('pg');
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    await pool.query(
      `INSERT INTO preorders (full_name, email, phone, box_type, wants_personalization, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [data.fullName, data.email, data.phone, data.boxType, data.wantsPersonalization]
    );

    if (data.preferences) {
      await pool.query(
        `INSERT INTO preferences (preorder_id, sports, colors, contents, size_upper, size_lower, dietary, additional_notes)
         VALUES (lastval(), $1, $2, $3, $4, $5, $6, $7)`,
        [
          JSON.stringify(data.preferences.sports),
          JSON.stringify(data.preferences.colors),
          JSON.stringify(data.preferences.contents),
          data.sizes.upper,
          data.sizes.lower,
          JSON.stringify(data.preferences.dietary),
          data.preferences.additionalNotes
        ]
      );
    }
    */

    // Example email sending (uncomment when you set up Resend):
    /*
    const { Resend } = require('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);

    await resend.emails.send({
      from: 'FitFlow <onboarding@fitflow.bg>',
      to: data.email,
      subject: 'Благодарим за предварителната поръчка! 💪',
      html: `
        <h1>Здравей, ${data.fullName}!</h1>
        <p>Благодарим ти, че се присъедини към списъка с предварителни поръчки на FitFlow!</p>
        <p>Избрана кутия: ${data.boxType}</p>
        <p>Скоро ще се свържем с теб с повече информация.</p>
        <p>Поздрави,<br/>Екипът на FitFlow</p>
      `
    });
    */

    return NextResponse.json(
      { 
        success: true,
        message: 'Pre-order submitted successfully'
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error processing pre-order:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
