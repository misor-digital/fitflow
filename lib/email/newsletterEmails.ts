/**
 * Newsletter Email Templates
 * Part of Phase 1: Minimal Safe Foundation
 */

import { sendEmail } from './emailService';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

/**
 * Send newsletter confirmation email (double opt-in)
 */
export async function sendNewsletterConfirmation(
  email: string,
  confirmationToken: string
): Promise<boolean> {
  const confirmUrl = `${BASE_URL}/newsletter/confirm?token=${confirmationToken}`;
  
  const subject = 'Потвърди абонамента си за FitFlow Newsletter';
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Потвърди абонамент</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px;">FitFlow</h1>
      </div>
      
      <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
        <h2 style="color: #333; margin-top: 0;">Добре дошъл/дошла!</h2>
        
        <p>Благодарим ти за интереса към FitFlow Newsletter! 🎉</p>
        
        <p>За да завършиш абонамента си и да започнеш да получаваш ексклузивни оферти, съвети за фитнес и новини за нови продукти, моля потвърди имейл адреса си:</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${confirmUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
            Потвърди абонамента
          </a>
        </div>
        
        <p style="color: #666; font-size: 14px;">
          <strong>Важно:</strong> Този линк е валиден за <strong>24 часа</strong>.
        </p>
        
        <p style="color: #666; font-size: 14px;">
          Ако не си се абонирал/а за нашия newsletter, можеш спокойно да игнорираш този имейл.
        </p>
        
        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
        
        <p style="color: #999; font-size: 12px; text-align: center;">
          Ако бутонът не работи, копирай и постави този линк в браузъра:<br>
          <a href="${confirmUrl}" style="color: #667eea; word-break: break-all;">${confirmUrl}</a>
        </p>
        
        <p style="color: #999; font-size: 12px; text-align: center; margin-top: 20px;">
          © ${new Date().getFullYear()} FitFlow. Всички права запазени.
        </p>
      </div>
    </body>
    </html>
  `;
  
  const text = `
Добре дошъл/дошла!

Благодарим ти за интереса към FitFlow Newsletter! 🎉

За да завършиш абонамента си и да започнеш да получаваш ексклузивни оферти, съвети за фитнес и новини за нови продукти, моля потвърди имейл адреса си:

${confirmUrl}

Важно: Този линк е валиден за 24 часа.

Ако не си се абонирал/а за нашия newsletter, можеш спокойно да игнорираш този имейл.

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
 * Send newsletter welcome email (after confirmation)
 */
export async function sendNewsletterWelcome(
  email: string,
  unsubscribeToken: string
): Promise<boolean> {
  const unsubscribeUrl = `${BASE_URL}/newsletter/unsubscribe?token=${unsubscribeToken}`;
  
  const subject = 'Добре дошъл/дошла в FitFlow Newsletter! 🎉';
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Добре дошъл/дошла</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px;">FitFlow</h1>
      </div>
      
      <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
        <h2 style="color: #333; margin-top: 0;">Благодарим ти! 🎉</h2>
        
        <p>Абонаментът ти за FitFlow Newsletter е потвърден успешно!</p>
        
        <p>От сега нататък ще получаваш:</p>
        
        <ul style="color: #666;">
          <li>Ексклузивни оферти и промоции</li>
          <li>Съвети за фитнес и здравословен начин на живот</li>
          <li>Новини за нови продукти и услуги</li>
          <li>Специални подаръци за абонати</li>
        </ul>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${BASE_URL}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
            Разгледай нашите продукти
          </a>
        </div>
        
        <p style="color: #666; font-size: 14px;">
          Очаквай скоро първия ни newsletter с ексклузивна оферта! 💪
        </p>
        
        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
        
        <p style="color: #999; font-size: 12px; text-align: center;">
          Ако искаш да се отпишеш от newsletter-а, можеш да го направиш по всяко време:<br>
          <a href="${unsubscribeUrl}" style="color: #667eea;">Отписване</a>
        </p>
        
        <p style="color: #999; font-size: 12px; text-align: center; margin-top: 20px;">
          © ${new Date().getFullYear()} FitFlow. Всички права запазени.
        </p>
      </div>
    </body>
    </html>
  `;
  
  const text = `
Благодарим ти! 🎉

Абонаментът ти за FitFlow Newsletter е потвърден успешно!

От сега нататък ще получаваш:
- Ексклузивни оферти и промоции
- Съвети за фитнес и здравословен начин на живот
- Новини за нови продукти и услуги
- Специални подаръци за абонати

Разгледай нашите продукти: ${BASE_URL}

Очаквай скоро първия ни newsletter с ексклузивна оферта! 💪

Ако искаш да се отпишеш от newsletter-а, можеш да го направиш по всяко време:
${unsubscribeUrl}

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
 * Send unsubscribe confirmation email
 */
export async function sendUnsubscribeConfirmation(
  email: string
): Promise<boolean> {
  const subject = 'Потвърждение за отписване от FitFlow Newsletter';
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Отписване</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px;">FitFlow</h1>
      </div>
      
      <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
        <h2 style="color: #333; margin-top: 0;">Съжаляваме, че си тръгваш 😢</h2>
        
        <p>Успешно се отписа от FitFlow Newsletter.</p>
        
        <p>Няма да получаваш повече имейли от нас.</p>
        
        <p style="color: #666; font-size: 14px;">
          Ако промениш решението си, винаги можеш да се абонираш отново на нашия сайт.
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${BASE_URL}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
            Посети нашия сайт
          </a>
        </div>
        
        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
        
        <p style="color: #999; font-size: 12px; text-align: center; margin-top: 20px;">
          © ${new Date().getFullYear()} FitFlow. Всички права запазени.
        </p>
      </div>
    </body>
    </html>
  `;
  
  const text = `
Съжаляваме, че си тръгваш 😢

Успешно се отписа от FitFlow Newsletter.

Няма да получаваш повече имейли от нас.

Ако промениш решението си, винаги можеш да се абонираш отново на нашия сайт: ${BASE_URL}

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
