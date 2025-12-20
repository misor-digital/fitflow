/**
 * Email templates for FitFlow transactional emails
 * These are inline HTML templates. For production, consider using Brevo's template editor.
 */

import type { PreorderEmailData } from './types';

/**
 * Map box type to display name in Bulgarian
 */
export function getBoxTypeDisplayName(boxType: string): string {
  const boxTypeMap: Record<string, string> = {
    'monthly-standard': 'Месечен абонамент - Стандартна кутия',
    'monthly-premium': 'Месечен абонамент - Премиум кутия',
    'monthly-premium-monthly': 'Месечен абонамент - Премиум (месечно)',
    'monthly-premium-seasonal': 'Месечен абонамент - Премиум (сезонно)',
    'onetime-standard': 'Еднократна поръчка - Стандартна кутия',
    'onetime-premium': 'Еднократна поръчка - Премиум кутия',
  };
  return boxTypeMap[boxType] || boxType;
}

/**
 * Map sport value to display name in Bulgarian
 */
export function getSportDisplayName(sport: string): string {
  const sportMap: Record<string, string> = {
    'fitness': 'Фитнес',
    'dance': 'Танци',
    'yoga': 'Йога/пилатес',
    'running': 'Бягане',
    'swimming': 'Плуване',
    'team': 'Отборен спорт',
    'other': 'Друго',
  };
  return sportMap[sport] || sport;
}

/**
 * Map sports array to display names
 */
export function getSportsDisplayNames(sports: string[]): string[] {
  return sports.map(getSportDisplayName);
}

/**
 * Map content value to display name in Bulgarian
 */
export function getContentDisplayName(content: string): string {
  const contentMap: Record<string, string> = {
    'clothes': 'Спортни дрехи',
    'accessories': 'Спортни аксесоари',
    'protein': 'Протеинови продукти',
    'supplements': 'Хранителни добавки',
    'challenges': 'Тренировъчни предизвикателства и оферти',
  };
  return contentMap[content] || content;
}

/**
 * Map contents array to display names
 */
export function getContentsDisplayNames(contents: string[]): string[] {
  return contents.map(getContentDisplayName);
}

/**
 * Map flavor value to display name in Bulgarian
 */
export function getFlavorDisplayName(flavor: string): string {
  const flavorMap: Record<string, string> = {
    'chocolate': 'Шоколад',
    'strawberry': 'Ягода',
    'vanilla': 'Ванилия',
    'salted-caramel': 'Солен карамел',
    'biscuit': 'Бисквита',
    'other': 'Друго',
  };
  return flavorMap[flavor] || flavor;
}

/**
 * Map flavors array to display names
 */
export function getFlavorsDisplayNames(flavors: string[]): string[] {
  return flavors.map(getFlavorDisplayName);
}

/**
 * Map dietary value to display name in Bulgarian
 */
export function getDietaryDisplayName(dietary: string): string {
  const dietaryMap: Record<string, string> = {
    'none': 'Няма',
    'lactose': 'Без лактоза',
    'gluten': 'Без глутен',
    'vegan': 'Веган',
    'other': 'Друго',
  };
  return dietaryMap[dietary] || dietary;
}

/**
 * Map dietary array to display names
 */
export function getDietaryDisplayNames(dietary: string[]): string[] {
  return dietary.map(getDietaryDisplayName);
}

/**
 * Color name map for hex colors
 */
const COLOR_NAMES: Record<string, string> = {
  '#000000': 'Черно',
  '#FFFFFF': 'Бяло',
  '#8A8A8A': 'Сиво',
  '#0A1A33': 'Тъмно синьо',
  '#7EC8E3': 'Светло синьо',
  '#F4C2C2': 'Розово',
  '#8d010d': 'Бордо',
  '#B497D6': 'Лилаво',
  '#556B2F': 'Маслинено зелено',
  '#FB7D00': 'Оранжево'
};

/**
 * Get color display name from hex code
 */
export function getColorDisplayName(color: string): string {
  return COLOR_NAMES[color] || color;
}

/**
 * Generate color swatches HTML for email
 */
function generateColorSwatchesHtml(colors: string[]): string {
  if (!colors || colors.length === 0) return '';
  
  const swatches = colors.map(color => {
    const colorName = getColorDisplayName(color);
    const borderStyle = color === '#FFFFFF' ? 'border: 1px solid #e0e0e0;' : '';
    return `<span title="${colorName}" style="display: inline-block; width: 24px; height: 24px; background-color: ${color}; border-radius: 4px; margin-right: 6px; ${borderStyle}"></span>`;
  }).join('');
  
  return `<p style="margin: 5px 0;"><strong>Любими цветове:</strong></p><p style="margin: 5px 0;">${swatches}</p>`;
}

/**
 * Generate preorder confirmation email HTML
 */
export function generatePreorderConfirmationEmail(data: PreorderEmailData): string {
  // Convert raw values to display names
  const sportsDisplay = data.sports?.length ? getSportsDisplayNames(data.sports) : [];
  const contentsDisplay = data.contents?.length ? getContentsDisplayNames(data.contents) : [];
  const flavorsDisplay = data.flavors?.length ? getFlavorsDisplayNames(data.flavors) : [];
  const dietaryDisplay = data.dietary?.length ? getDietaryDisplayNames(data.dietary) : [];

  const personalizationSection = data.wantsPersonalization
    ? `
      <div style="background-color: #fff4ec; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #363636; margin-top: 0;">Твоите предпочитания</h3>
        ${sportsDisplay.length ? `<p><strong>Спортове:</strong> ${sportsDisplay.join(', ')}</p>` : ''}
        ${data.colors?.length ? generateColorSwatchesHtml(data.colors) : ''}
        ${contentsDisplay.length ? `<p><strong>Предпочитано съдържание:</strong> ${contentsDisplay.join(', ')}</p>` : ''}
        ${flavorsDisplay.length ? `<p><strong>Вкусове:</strong> ${flavorsDisplay.join(', ')}</p>` : ''}
        ${data.sizeUpper ? `<p><strong>Размер (горна част):</strong> ${data.sizeUpper}</p>` : ''}
        ${data.sizeLower ? `<p><strong>Размер (долна част):</strong> ${data.sizeLower}</p>` : ''}
        ${dietaryDisplay.length ? `<p><strong>Диетични предпочитания:</strong> ${dietaryDisplay.join(', ')}</p>` : ''}
        ${data.additionalNotes ? `<p><strong>Допълнителни бележки:</strong> ${data.additionalNotes}</p>` : ''}
      </div>
    `
    : '';

  return `
<!DOCTYPE html>
<html lang="bg">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Потвърждение на предварителна поръчка - FitFlow</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f6f3f0;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #9c3b00 0%, #ff6a00 100%); padding: 40px 30px; text-align: center; border-radius: 12px 12px 0px 0px;">
              <h1 style="color: #ffffff; margin: 0; font-size: 36px; font-weight: 700;">FitFlow</h1>
              <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 14px; opacity: 0.9;">
                Защото можем
              </p>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="color: #363636; margin-top: 0; font-size: 24px;">
                Благодарим ти, ${data.fullName}!
              </h2>
              
              <p style="color: #4a5568; font-size: 16px; line-height: 1.6;">
                Твоята предварителна поръчка беше успешно регистрирана! Радваме се, че избра FitFlow.
              </p>
              
              <!-- Order Details -->
              <div style="background-color: #fff4ec; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #363636; margin-top: 0;">📦 Детайли на поръчката</h3>
                <p style="margin: 5px 0;"><strong>Номер на поръчка:</strong> ${data.preorderId}</p>
                <p style="margin: 5px 0;"><strong>Избрана кутия:</strong> ${data.boxTypeDisplay}</p>
                <p style="margin: 5px 0;"><strong>Персонализация:</strong> ${data.wantsPersonalization ? 'Да' : 'Не'}</p>
              </div>
              
              ${personalizationSection}
              
              <!-- What's Next -->
              <div style="border-left: 4px solid #ff6a00; padding-left: 20px; margin: 30px 0;">
                <h3 style="color: #363636; margin-top: 0;">Какво следва?</h3>
                <ol style="color: #4a5568; padding-left: 20px;">
                  <li style="margin-bottom: 10px;">Ще прегледаме твоята поръчка и предпочитания.</li>
                  <li style="margin-bottom: 10px;">Ще се свържем с теб за потвърждение на детайлите в близко бъдеще.</li>
                  <li style="margin-bottom: 10px;">Ще подготвим твоята персонализирана FitFlow кутия.</li>
                  <li>Ще получиш известие, когато кутията е на път към теб!</li>
                </ol>
              </div>
              
              <p style="color: #4a5568; font-size: 16px; line-height: 1.6;">
                Ако имаш въпроси, не се колебай да се свържеш с нас на 
                <a href="mailto:info@fitflow.bg" style="color: #ff6a00; font-weight: 600;">
                  info@fitflow.bg
                </a>
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #fdf6f1; padding: 30px; text-align: center; border-radius: 0 0 12px 12px;">
              <p style="color: #7a4a2a; font-size: 14px; margin: 0 0 10px 0;">
                С любов към спорта,<br>
                <strong>Екипът на FitFlow</strong> 💪
              </p>
              <p style="color: #b08968; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} FitFlow. Всички права запазени.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}
