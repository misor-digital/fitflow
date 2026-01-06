/**
 * Email templates for FitFlow transactional emails
 * These are inline HTML templates. For production, consider using Brevo's template editor.
 * 
 * NOTE: Labels must be fetched from the database via lib/data/catalog.ts
 * and passed to email generation functions. No hardcoded fallbacks.
 */

import type { PreorderEmailData } from './types';
import {
  formatPriceDual,
  formatSavings,
} from '@/lib/preorder';

// ============================================================================
// Label Map Type
// ============================================================================

/**
 * A map of IDs to display labels
 */
export type LabelMap = Record<string, string>;

/**
 * All label maps needed for email generation
 */
export interface EmailLabelMaps {
  boxTypes: LabelMap;
  sports: LabelMap;
  flavors: LabelMap;
  dietary: LabelMap;
  colors: LabelMap;
  contents: LabelMap;
}

// ============================================================================
// Utility: Format options with "other" value
// ============================================================================

/**
 * Format a list of options with "other" value appended if present
 * @param options - Array of option IDs
 * @param otherValue - The custom "other" value
 * @param labelMap - Map of option IDs to labels
 * @returns Formatted string with labels and optional "other" value
 */
export function formatOptionsWithOther(
  options: string[],
  otherValue: string | undefined,
  labelMap: LabelMap
): string {
  const labels = options.map(opt => labelMap[opt] ?? opt);
  const result = labels.join(', ');
  
  if (options.includes('other') && otherValue?.trim()) {
    return `${result} (${otherValue})`;
  }
  
  return result;
}

// ============================================================================
// Label Lookup Functions
// These require label maps to be passed in - no hardcoded fallbacks
// ============================================================================

/**
 * Get display name from a label map, returning the key if not found
 */
function getLabelOrKey(labelMap: LabelMap, key: string): string {
  return labelMap[key] ?? key;
}

/**
 * Map an array of IDs to display names using a label map
 */
function mapToDisplayNames(items: string[], labelMap: LabelMap): string[] {
  return items.map(item => getLabelOrKey(labelMap, item));
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
function generateColorSwatchesHtml(colors: string[], colorLabels: LabelMap): string {
  if (!colors || colors.length === 0) return '';
  
  const swatches = colors.map(color => {
    const colorName = getLabelOrKey(colorLabels, color);
    const borderStyle = color === '#FFFFFF' ? 'border: 1px solid #e0e0e0;' : '';
    return `<span title="${colorName}" style="display: inline-block; width: 24px; height: 24px; background-color: ${color}; border-radius: 4px; margin-right: 6px; ${borderStyle}"></span>`;
  }).join('');
  
  return `<p style="margin: 5px 0;"><strong>Любими цветове:</strong></p><p style="margin: 5px 0;">${swatches}</p>`;
}

/**
 * Generate promo code section HTML for email
 */
function generatePromoCodeSection(data: PreorderEmailData): string {
  if (!data.hasPromoCode) return '';

  return `
    <div style="background-color: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 8px; margin: 15px 0;">
      <p style="margin: 0 0 10px 0; color: #155724; font-weight: bold;">
        ✅ Промо код ${data.promoCode} е приложен – ${data.discountPercent}% отстъпка
      </p>
      <p style="margin: 5px 0; color: #155724;">
        <span style="text-decoration: line-through; color: #6c757d;">${formatPriceDual(data.originalPriceEur ?? 0, data.originalPriceBgn ?? 0)}</span>
        &nbsp;→&nbsp;
        <strong>${formatPriceDual(data.finalPriceEur ?? 0, data.finalPriceBgn ?? 0)}</strong>
      </p>
      <p style="margin: 5px 0 0 0; color: #155724; font-size: 14px;">
        ${formatSavings(data.discountAmountEur ?? 0, data.discountAmountBgn ?? 0)}
      </p>
    </div>
  `;
}

/**
 * Generate preorder confirmation email HTML
 * 
 * @param data - Preorder email data
 * @param labels - Label maps fetched from database (optional for backward compatibility)
 */
export function generatePreorderConfirmationEmail(
  data: PreorderEmailData,
  labels?: Partial<EmailLabelMaps>
): string {
  // Use provided labels or empty maps (will fall back to raw IDs)
  const sportLabels = labels?.sports ?? {};
  const flavorLabels = labels?.flavors ?? {};
  const dietaryLabels = labels?.dietary ?? {};
  const colorLabels = labels?.colors ?? {};

  // Convert raw values to display names
  const sportsDisplay = data.sports?.length ? mapToDisplayNames(data.sports, sportLabels) : [];
  const flavorsDisplay = data.flavors?.length ? mapToDisplayNames(data.flavors, flavorLabels) : [];
  const dietaryDisplay = data.dietary?.length ? mapToDisplayNames(data.dietary, dietaryLabels) : [];

  const personalizationSection = data.wantsPersonalization
    ? `
      <div style="background-color: #fff4ec; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #363636; margin-top: 0;">Твоите предпочитания</h3>
        ${sportsDisplay.length ? `<p><strong>Спортове:</strong> ${sportsDisplay.join(', ')}  ${printOtherOption(data.sports, data.sportOther)}</p>` : ''}
        ${data.colors?.length ? generateColorSwatchesHtml(data.colors, colorLabels) : ''}
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
              Твоята предварителна поръчка беше успешно регистрирана! Благодарим ти, че избра FitFlow.
            </p>
            
            <!-- Free Delivery Banner -->
            <div style="background-color: #e8f5e9; border: 2px solid #4caf50; padding: 15px 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
              <p style="margin: 0; color: #2e7d32; font-size: 18px; font-weight: bold;">
                🚚 Безплатна доставка за твоята първа кутия!
              </p>
            </div>
            
            <!-- Order Details -->
            <div style="background-color: #fff4ec; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #363636; margin-top: 0;">📦 Детайли на поръчката</h3>
              <p style="margin: 5px 0;"><strong>Номер на поръчка:</strong> ${data.preorderId}</p>
              <p style="margin: 5px 0;"><strong>Избрана кутия:</strong> ${data.boxTypeDisplay}${!data.hasPromoCode ? ` (${formatPriceDual(data.originalPriceEur ?? 0, data.originalPriceBgn ?? 0)})` : ''}</p>
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
              <strong>Екипът на FitFlow</strong>
            </p>
            <p style="color: #7a4a2a; font-size: 14px; margin: 0 0 10px 0;">
              <a href="mailto:info@fitflow.bg" style="color: #9c3b00; text-decoration: none; font-weight: 600;">info@fitflow.bg</a>
              &nbsp;|&nbsp;
              <a href="tel:+359879447845" style="color: #9c3b00; text-decoration: none; font-weight: 600;">+359 879 447 845</a>
            </p>
            <p style="margin: 15px 0;">
              <a href="https://www.facebook.com/people/FitFlow/61584666749010/" style="display: inline-block; margin: 0 8px; text-decoration: none;">
                <img src="https://cdn-icons-png.flaticon.com/24/733/733547.png" alt="Facebook" width="24" height="24" style="vertical-align: middle;" />
              </a>
              <a href="https://www.instagram.com/fitflowbg" style="display: inline-block; margin: 0 8px; text-decoration: none;">
                <img src="https://cdn-icons-png.flaticon.com/24/2111/2111463.png" alt="Instagram" width="24" height="24" style="vertical-align: middle;" />
              </a>
              <a href="https://www.tiktok.com/@fitflow.bg" style="display: inline-block; margin: 0 8px; text-decoration: none;">
                <img src="https://cdn-icons-png.flaticon.com/24/3046/3046121.png" alt="TikTok" width="24" height="24" style="vertical-align: middle;" />
              </a>
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
