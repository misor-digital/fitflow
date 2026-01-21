/**
 * Staff Email Templates
 * Part of Phase 2: Customer Accounts + Staff Foundation
 */

import { sendEmail } from './emailService';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

/**
 * Send staff onboarding email with password setup link
 */
export async function sendStaffOnboardingEmail(
  email: string,
  fullName: string,
  onboardingUrl: string,
  roles: string[]
): Promise<boolean> {
  const subject = 'Добре дошъл/дошла в екипа на FitFlow! 🎉';
  
  const rolesList = roles.map(role => `<li>${role}</li>`).join('');
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Добре дошъл/дошла в екипа</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px;">FitFlow</h1>
        <p style="color: white; margin: 10px 0 0 0;">Вътрешна система</p>
      </div>
      
      <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
        <h2 style="color: #333; margin-top: 0;">Здравей, ${fullName}!</h2>
        
        <p>Добре дошъл/дошла в екипа на FitFlow! 🎉</p>
        
        <p>Създаден е твой служебен акаунт с следните роли:</p>
        
        <ul style="color: #666;">
          ${rolesList}
        </ul>
        
        <p>За да завършиш настройката на акаунта си, моля задай парола:</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${onboardingUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
            Задай парола
          </a>
        </div>
        
        <p style="color: #666; font-size: 14px;">
          <strong>Важно:</strong> Този линк е валиден за <strong>7 дни</strong>. След като зададеш парола, ще можеш да влезеш в системата.
        </p>
        
        <p style="color: #666; font-size: 14px;">
          Ако имаш въпроси, свържи се с администратора.
        </p>
        
        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
        
        <p style="color: #999; font-size: 12px; text-align: center;">
          Ако бутонът не работи, копирай и постави този линк в браузъра:<br>
          <a href="${onboardingUrl}" style="color: #667eea; word-break: break-all;">${onboardingUrl}</a>
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

Добре дошъл/дошла в екипа на FitFlow! 🎉

Създаден е твой служебен акаунт с следните роли:
${roles.map(role => `- ${role}`).join('\n')}

За да завършиш настройката на акаунта си, моля задай парола:
${onboardingUrl}

Важно: Този линк е валиден за 7 дни. След като зададеш парола, ще можеш да влезеш в системата.

Ако имаш въпроси, свържи се с администратора.

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
 * Send staff password reset email
 */
export async function sendStaffPasswordReset(
  email: string,
  fullName: string,
  resetUrl: string
): Promise<boolean> {
  const subject = 'Нулиране на парола - FitFlow';
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Нулиране на парола</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px;">FitFlow</h1>
        <p style="color: white; margin: 10px 0 0 0;">Вътрешна система</p>
      </div>
      
      <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
        <h2 style="color: #333; margin-top: 0;">Здравей, ${fullName}!</h2>
        
        <p>Получихме заявка за нулиране на паролата за твоя служебен акаунт.</p>
        
        <p>Кликни на бутона по-долу, за да зададеш нова парола:</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
            Нулирай парола
          </a>
        </div>
        
        <p style="color: #666; font-size: 14px;">
          <strong>Важно:</strong> Този линк е валиден за <strong>1 час</strong>.
        </p>
        
        <p style="color: #666; font-size: 14px;">
          Ако не си заявявал/а нулиране на парола, можеш спокойно да игнорираш този имейл.
        </p>
        
        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
        
        <p style="color: #999; font-size: 12px; text-align: center;">
          Ако бутонът не работи, копирай и постави този линк в браузъра:<br>
          <a href="${resetUrl}" style="color: #667eea; word-break: break-all;">${resetUrl}</a>
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

Получихме заявка за нулиране на паролата за твоя служебен акаунт.

Кликни на този линк, за да зададеш нова парола:
${resetUrl}

Важно: Този линк е валиден за 1 час.

Ако не си заявявал/а нулиране на парола, можеш спокойно да игнорираш този имейл.

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
 * Send staff account disabled notification
 */
export async function sendStaffAccountDisabled(
  email: string,
  fullName: string
): Promise<boolean> {
  const subject = 'Акаунтът ти е деактивиран - FitFlow';
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Акаунт деактивиран</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px;">FitFlow</h1>
        <p style="color: white; margin: 10px 0 0 0;">Вътрешна система</p>
      </div>
      
      <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
        <h2 style="color: #333; margin-top: 0;">Здравей, ${fullName}!</h2>
        
        <p>Твоят служебен акаунт в системата на FitFlow е деактивиран.</p>
        
        <p>Няма да можеш да влезеш в системата до повторна активация.</p>
        
        <p style="color: #666; font-size: 14px;">
          Ако смяташ, че това е грешка, моля свържи се с администратора.
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

Твоят служебен акаунт в системата на FitFlow е деактивиран.

Няма да можеш да влезеш в системата до повторна активация.

Ако смяташ, че това е грешка, моля свържи се с администратора.

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
 * Send staff role assignment notification
 */
export async function sendStaffRoleAssigned(
  email: string,
  fullName: string,
  roleName: string,
  roleDescription: string
): Promise<boolean> {
  const subject = `Нова роля: ${roleName} - FitFlow`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Нова роля</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px;">FitFlow</h1>
        <p style="color: white; margin: 10px 0 0 0;">Вътрешна система</p>
      </div>
      
      <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
        <h2 style="color: #333; margin-top: 0;">Здравей, ${fullName}!</h2>
        
        <p>Добавена е нова роля към твоя служебен акаунт:</p>
        
        <div style="background: white; padding: 20px; border-left: 4px solid #667eea; margin: 20px 0;">
          <h3 style="margin: 0 0 10px 0; color: #667eea;">${roleName}</h3>
          <p style="margin: 0; color: #666;">${roleDescription}</p>
        </div>
        
        <p style="color: #666; font-size: 14px;">
          Промените влизат в сила веднага. При следващото влизане ще имаш достъп до новите функции.
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${BASE_URL}/staff/login" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
            Влез в системата
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
Здравей, ${fullName}!

Добавена е нова роля към твоя служебен акаунт:

${roleName}
${roleDescription}

Промените влизат в сила веднага. При следващото влизане ще имаш достъп до новите функции.

Влез в системата: ${BASE_URL}/staff/login

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
