/**
 * Email templates for FitFlow transactional emails
 * These are inline HTML templates. For production, consider using Brevo's template editor.
 * 
 * NOTE: These label maps are fallbacks. In production, labels should be fetched from DB.
 * The maps here ensure emails work even if DB is unavailable.
 */

import type { PreorderEmailData } from './types';

// Fallback label maps - used when DB labels are not available
// These should match the seeded data in the options table

const BOX_TYPE_LABELS: Record<string, string> = {
  'monthly-standard': 'Месечен абонамент - Стандартна кутия',
  'monthly-premium': 'Месечен абонамент - Премиум кутия',
  'monthly-premium-monthly': 'Месечен абонамент - Премиум (месечно)',
  'monthly-premium-seasonal': 'Месечен абонамент - Премиум (сезонно)',
  'onetime-standard': 'Еднократна поръчка - Стандартна кутия',
  'onetime-premium': 'Еднократна поръчка - Премиум кутия',
};

const SPORT_LABELS: Record<string, string> = {
  'fitness': 'Фитнес',
  'dance': 'Танци',
  'yoga': 'Йога/пилатес',
  'running': 'Бягане',
  'swimming': 'Плуване',
  'team': 'Отборен спорт',
  'other': 'Други',
};

const FLAVOR_LABELS: Record<string, string> = {
  'chocolate': 'Шоколад',
  'strawberry': 'Ягода',
  'vanilla': 'Ванилия',
  'salted-caramel': 'Солен карамел',
  'biscuit': 'Бисквита',
  'other': 'Други',
};

const DIETARY_LABELS: Record<string, string> = {
  'none': 'Няма',
  'lactose': 'Без лактоза',
  'gluten': 'Без глутен',
  'vegan': 'Веган',
  'other': 'Други',
};

const COLOR_LABELS: Record<string, string> = {
  '#000000': 'Черно',
  '#FFFFFF': 'Бяло',
  '#8A8A8A': 'Сиво',
  '#0A1A33': 'Тъмно синьо',
  '#7EC8E3': 'Светло синьо',
  '#F4C2C2': 'Розово',
  '#8d010d': 'Бордо',
  '#B497D6': 'Лилаво',
  '#556B2F': 'Маслинено зелено',
  '#FB7D00': 'Оранжево',
};

const CONTENT_LABELS: Record<string, string> = {
  'clothes': 'Спортни дрехи',
  'accessories': 'Спортни аксесоари',
  'protein': 'Протеинови продукти',
  'supplements': 'Хранителни добавки',
  'challenges': 'Тренировъчни предизвикателства и оферти',
};

/**
 * Map box type to display name in Bulgarian
 */
export function getBoxTypeDisplayName(boxType: string): string {
  return BOX_TYPE_LABELS[boxType] || boxType;
}

/**
 * Map sport value to display name in Bulgarian
 */
export function getSportDisplayName(sport: string): string {
  return SPORT_LABELS[sport] || sport;
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
  return CONTENT_LABELS[content] || content;
}

/**
 * Map flavor value to display name in Bulgarian
 */
export function getFlavorDisplayName(flavor: string): string {
  return FLAVOR_LABELS[flavor] || flavor;
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
  return DIETARY_LABELS[dietary] || dietary;
}

/**
 * Map dietary array to display names
 */
export function getDietaryDisplayNames(dietary: string[]): string[] {
  return dietary.map(getDietaryDisplayName);
}

/**
 * Get color display name from hex code
 */
export function getColorDisplayName(color: string): string {
  return COLOR_LABELS[color] || color;
}

function printOtherOption(array: string[] | undefined, otherValue: string | undefined): string {
  if (array?.includes('other') && otherValue) {
    return ` (${otherValue})`;
  }

  return '';
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
 * Format price for display
 */
function formatPriceForEmail(price: number): string {
  return price.toFixed(2);
}

/**
 * EUR to BGN conversion rate
 */
const EUR_TO_BGN_RATE = 1.9558;

/**
 * Generate promo code section HTML for email
 */
function generatePromoCodeSection(data: PreorderEmailData): string {
  if (!data.promoCode || !data.discountPercent || data.discountPercent <= 0) {
    return '';
  }

  const originalPriceEur = data.originalPriceEur || 0;
  const finalPriceEur = data.finalPriceEur || 0;
  const discountAmountEur = originalPriceEur - finalPriceEur;
  const originalPriceBgn = originalPriceEur * EUR_TO_BGN_RATE;
  const finalPriceBgn = finalPriceEur * EUR_TO_BGN_RATE;
  const discountAmountBgn = discountAmountEur * EUR_TO_BGN_RATE;

  return `
    <div style="background-color: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 8px; margin: 15px 0;">
      <p style="margin: 0 0 10px 0; color: #155724; font-weight: bold;">
        ✅ Промо код ${data.promoCode} е приложен – ${data.discountPercent}% отстъпка
      </p>
      <p style="margin: 5px 0; color: #155724;">
        <span style="text-decoration: line-through; color: #6c757d;">${formatPriceForEmail(originalPriceBgn)} лв / ${formatPriceForEmail(originalPriceEur)} €</span>
        &nbsp;→&nbsp;
        <strong>${formatPriceForEmail(finalPriceBgn)} лв / ${formatPriceForEmail(finalPriceEur)} €</strong>
      </p>
      <p style="margin: 5px 0 0 0; color: #155724; font-size: 14px;">
        Спестяваш ${formatPriceForEmail(discountAmountBgn)} лв / ${formatPriceForEmail(discountAmountEur)} €
      </p>
    </div>
  `;
}

/**
 * Generate preorder confirmation email HTML
 */
export function generatePreorderConfirmationEmail(data: PreorderEmailData): string {
  // Convert raw values to display names
  const sportsDisplay = data.sports?.length ? getSportsDisplayNames(data.sports) : [];
  const flavorsDisplay = data.flavors?.length ? getFlavorsDisplayNames(data.flavors) : [];
  const dietaryDisplay = data.dietary?.length ? getDietaryDisplayNames(data.dietary) : [];

  const personalizationSection = data.wantsPersonalization
    ? `
      <div style="background-color: #fff4ec; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #363636; margin-top: 0;">Твоите предпочитания</h3>
        ${sportsDisplay.length ? `<p><strong>Спортове:</strong> ${sportsDisplay.join(', ')}  ${printOtherOption(data.sports, data.sportOther)}</p>` : ''}
        ${data.colors?.length ? generateColorSwatchesHtml(data.colors) : ''}
        ${flavorsDisplay.length ? `<p><strong>Вкусове:</strong> ${flavorsDisplay.join(', ')}  ${printOtherOption(data.flavors, data.flavorOther)}</p>` : ''}
        ${data.sizeUpper ? `<p><strong>Размер (горна част):</strong> ${data.sizeUpper}</p>` : ''}
        ${data.sizeLower ? `<p><strong>Размер (долна част):</strong> ${data.sizeLower}</p>` : ''}
        ${dietaryDisplay.length ? `<p><strong>Диетични предпочитания:</strong> ${dietaryDisplay.join(', ')}  ${printOtherOption(data.dietary, data.dietaryOther)}</p>` : ''}
        ${data.additionalNotes ? `<p><strong>Допълнителни бележки:</strong> ${data.additionalNotes}</p>` : ''}
      </div>
    `
    : '';

  // Generate promo code section if applicable
  const promoCodeSection = generatePromoCodeSection(data);

  return `
<table role="presentation" style="width: 100%; border-collapse: collapse; margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f6f3f0;">
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
            
            ${promoCodeSection}
            
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
  `.trim();
}
