/**
 * Preorder Edit Email Templates
 * Part of Phase 1: Minimal Safe Foundation
 */

import { sendEmail } from './emailService';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

/**
 * Send preorder edit link email
 */
export async function sendPreorderEditLink(
  email: string,
  fullName: string,
  orderId: string,
  token: string,
  expiresAt: Date
): Promise<boolean> {
  const editUrl = `${BASE_URL}/preorder/edit?token=${token}`;
  const expiryHours = Math.round((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60));
  
  const subject = `Редактирай твоята поръчка ${orderId} - FitFlow`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Редактирай поръчка</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px;">FitFlow</h1>
      </div>
      
      <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
        <h2 style="color: #333; margin-top: 0;">Здравей, ${fullName}!</h2>
        
        <p>Получихме твоята заявка за редактиране на поръчка <strong>${orderId}</strong>.</p>
        
        <p>Кликни на бутона по-долу, за да редактираш детайлите на твоята поръчка:</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${editUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
            Редактирай поръчка
          </a>
        </div>
        
        <p style="color: #666; font-size: 14px;">
          <strong>Важно:</strong> Този линк е валиден за <strong>${expiryHours} часа</strong> и може да бъде използван само веднъж.
        </p>
        
        <p style="color: #666; font-size: 14px;">
          Ако не си заявявал/а редакция на поръчката, можеш спокойно да игнорираш този имейл.
        </p>
        
        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
        
        <p style="color: #999; font-size: 12px; text-align: center;">
          Ако бутонът не работи, копирай и постави този линк в браузъра:<br>
          <a href="${editUrl}" style="color: #667eea; word-break: break-all;">${editUrl}</a>
        </p>
        
        <p style="color: #999; font-size: 12px; text-align: center; margin-top: 20px;">
          © ${new Date().getFullYear()} FitFlow. Всички права запазени.
        </p>
      </div>
    </body>
    </html>
  `;
  
  const text = `
Здравей, ${fullName}!

Получихме твоята заявка за редактиране на поръчка ${orderId}.

Кликни на този линк, за да редактираш детайлите на твоята поръчка:
${editUrl}

Важно: Този линк е валиден за ${expiryHours} часа и може да бъде използван само веднъж.

Ако не си заявявал/а редакция на поръчката, можеш спокойно да игнорираш този имейл.

© ${new Date().getFullYear()} FitFlow. Всички права запазени.
  `.trim();
  
  const result = await sendEmail({
    to: [{ email }],
    subject,
    htmlContent: html,
    textContent: text,
  });
  
  return result.success;
}

/**
 * Send preorder cancellation confirmation email
 */
export async function sendPreorderCancellationConfirmation(
  email: string,
  fullName: string,
  orderId: string
): Promise<boolean> {
  const subject = `Потвърждение за отказ на поръчка ${orderId} - FitFlow`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Отказ на поръчка</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px;">FitFlow</h1>
      </div>
      
      <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
        <h2 style="color: #333; margin-top: 0;">Здравей, ${fullName}!</h2>
        
        <p>Твоята поръчка <strong>${orderId}</strong> беше успешно отказана.</p>
        
        <p>Ако промениш решението си, винаги можеш да направиш нова поръчка на нашия сайт.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${BASE_URL}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
            Виж нашите продукти
          </a>
        </div>
        
        <p style="color: #666; font-size: 14px;">
          Ако имаш въпроси или нужда от помощ, не се колебай да се свържеш с нас.
        </p>
        
        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
        
        <p style="color: #999; font-size: 12px; text-align: center; margin-top: 20px;">
          © ${new Date().getFullYear()} FitFlow. Всички права запазени.
        </p>
      </div>
    </body>
    </html>
  `;
  
  const text = `
Здравей, ${fullName}!

Твоята поръчка ${orderId} беше успешно отказана.

Ако промениш решението си, винаги можеш да направиш нова поръчка на нашия сайт: ${BASE_URL}

Ако имаш въпроси или нужда от помощ, не се колебай да се свържеш с нас.

© ${new Date().getFullYear()} FitFlow. Всички права запазени.
  `.trim();
  
  const result = await sendEmail({
    to: [{ email }],
    subject,
    htmlContent: html,
    textContent: text,
  });
  
  return result.success;
}

/**
 * Send preorder update confirmation email
 */
export async function sendPreorderUpdateConfirmation(
  email: string,
  fullName: string,
  orderId: string
): Promise<boolean> {
  const subject = `Потвърждение за промяна на поръчка ${orderId} - FitFlow`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Промяна на поръчка</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px;">FitFlow</h1>
      </div>
      
      <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
        <h2 style="color: #333; margin-top: 0;">Здравей, ${fullName}!</h2>
        
        <p>Твоята поръчка <strong>${orderId}</strong> беше успешно актуализирана.</p>
        
        <p>Промените са запазени и ще бъдат взети предвид при обработката на поръчката.</p>
        
        <p style="color: #666; font-size: 14px;">
          Ако имаш въпроси или нужда от допълнителни промени, не се колебай да се свържеш с нас.
        </p>
        
        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
        
        <p style="color: #999; font-size: 12px; text-align: center; margin-top: 20px;">
          © ${new Date().getFullYear()} FitFlow. Всички права запазени.
        </p>
      </div>
    </body>
    </html>
  `;
  
  const text = `
Здравей, ${fullName}!

Твоята поръчка ${orderId} беше успешно актуализирана.

Промените са запазени и ще бъдат взети предвид при обработката на поръчката.

Ако имаш въпроси или нужда от допълнителни промени, не се колебай да се свържеш с нас.

© ${new Date().getFullYear()} FitFlow. Всички права запазени.
  `.trim();
  
  const result = await sendEmail({
    to: [{ email }],
    subject,
    htmlContent: html,
    textContent: text,
  });
  
  return result.success;
}
